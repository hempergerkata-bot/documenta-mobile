/**
 * File-system independent boundary for local backup exports.  A UI or native
 * adapter may write/read `bytes`, but this module never accepts archive paths
 * as a source of authority.
 */
import {
  BACKUP_ENVELOPE_VERSION,
  MAX_BACKUP_ENVELOPE_BYTES,
  BackupCryptoError,
  type BackupCryptoProvider,
  type BackupEnvelope,
  type BackupKeyInput,
  decryptBackup,
  encryptBackup,
} from './backupCrypto';
import { excludeSecrets, stripRestoreNotificationMetadata, type BackupFileEntry, type BackupManifest } from './backupDomain';

export const LOCAL_BACKUP_FILENAME = 'documenta-backup.dcbak';
export const LOCAL_BACKUP_MIME_TYPE = 'application/vnd.documenta.encrypted-backup+json';

export type EncryptedExport = Readonly<{
  bytes: Uint8Array;
  /** Deliberately contains neither user content, dates, nor identifiers. */
  filename: typeof LOCAL_BACKUP_FILENAME;
  mimeType: typeof LOCAL_BACKUP_MIME_TYPE;
}>;

export type LocalBackupParseFailureCode =
  | 'MALFORMED'
  | 'UNSUPPORTED_VERSION'
  | 'AUTH_FAILED'
  | 'SIZE_LIMIT'
  | 'INVALID_PAYLOAD';

export type LocalBackupParseResult<T = unknown> =
  | Readonly<{ ok: true; payload: T; envelope: BackupEnvelope }>
  | Readonly<{ ok: false; code: LocalBackupParseFailureCode; message: string }>;

const MAX_EXPORT_BYTES = MAX_BACKUP_ENVELOPE_BYTES;
const MAX_FILENAME_LENGTH = 255;
const SAFE_HASH = /^[a-z0-9_-]+$/i;

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function parseUtf8Json(bytes: Uint8Array): unknown {
  if (!(bytes instanceof Uint8Array)) throw new Error('The local backup must be UTF-8 bytes.');
  if (bytes.byteLength > MAX_EXPORT_BYTES) throw new BackupCryptoError('SIZE_LIMIT', 'Backup export exceeds the allowed size.');
  try {
    // Fatal decoding rejects malformed byte sequences rather than replacing them.
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof BackupCryptoError) throw error;
    throw new BackupCryptoError('INVALID_INPUT', 'Backup export is not valid UTF-8 JSON.');
  }
}

/**
 * Removes credentials and platform scheduling identifiers before encryption.
 * This is intentionally performed here as well as in encryptBackup so callers
 * cannot accidentally reintroduce restore-only device state.
 */
export function localBackupSafePayload<T>(payload: T): T {
  return stripRestoreNotificationMetadata(excludeSecrets(payload));
}

/**
 * Produces bytes suitable for a save/share adapter.  The filename is a fixed
 * neutral label; adapters must not derive a name from archived metadata.
 */
export async function createEncryptedExport(
  payload: unknown,
  key: BackupKeyInput,
  provider?: BackupCryptoProvider,
): Promise<EncryptedExport> {
  const envelope = await encryptBackup(localBackupSafePayload(payload), key, provider);
  const bytes = utf8(JSON.stringify(envelope));
  if (bytes.byteLength > MAX_EXPORT_BYTES) {
    throw new BackupCryptoError('SIZE_LIMIT', 'Backup export exceeds the allowed size.');
  }
  return { bytes, filename: LOCAL_BACKUP_FILENAME, mimeType: LOCAL_BACKUP_MIME_TYPE };
}

function failure(error: unknown): LocalBackupParseResult<never> {
  if (error instanceof BackupCryptoError) {
    const code: LocalBackupParseFailureCode = error.code === 'UNSUPPORTED_VERSION' ? 'UNSUPPORTED_VERSION'
      : error.code === 'AUTH_FAILED' ? 'AUTH_FAILED'
        : error.code === 'SIZE_LIMIT' ? 'SIZE_LIMIT' : 'MALFORMED';
    return { ok: false, code, message: error.message };
  }
  return { ok: false, code: 'MALFORMED', message: 'Backup export could not be parsed.' };
}

/** Parses and authenticates a local export without performing any I/O. */
export async function parseEncryptedExport<T = unknown>(
  bytes: Uint8Array,
  key: BackupKeyInput,
  provider?: BackupCryptoProvider,
): Promise<LocalBackupParseResult<T>> {
  try {
    const candidate = parseUtf8Json(bytes);
    if (!candidate || typeof candidate !== 'object') {
      throw new BackupCryptoError('INVALID_INPUT', 'Backup export must contain an encryption envelope.');
    }
    const envelope = candidate as BackupEnvelope;
    // Preserve a clear future-version result before doing expensive KDF work.
    if (Number.isInteger(envelope.version) && envelope.version !== BACKUP_ENVELOPE_VERSION) {
      throw new BackupCryptoError('UNSUPPORTED_VERSION', `Backup version ${envelope.version} is not supported.`);
    }
    const payload = await decryptBackup(envelope, key, provider);
    return { ok: true, payload: payload as T, envelope };
  } catch (error) {
    return failure(error);
  }
}

/** A basename-only check for labels supplied to a platform save/share dialog. */
export function isSafeBackupFilename(filename: string): boolean {
  return typeof filename === 'string'
    && filename.length > 0
    && filename.length <= MAX_FILENAME_LENGTH
    && filename === filename.trim()
    && filename !== '.'
    && filename !== '..'
    && !/[\/\\\0-\x1f<>:"|?*]/.test(filename);
}

export function assertSafeBackupFilename(filename: string): void {
  if (!isSafeBackupFilename(filename)) throw new Error('Backup filename must be a safe basename.');
}

export type RelinkedBackupAsset = Readonly<{
  id: string;
  contentHash: string;
  localUri?: string;
}>;

export type LocalAssetUriIndex = ReadonlyMap<string, string> | Readonly<Record<string, string | undefined>>;

function uriForHash(index: LocalAssetUriIndex, hash: string): string | undefined {
  return index instanceof Map ? index.get(hash) : (index as Readonly<Record<string, string | undefined>>)[hash];
}

/**
 * Relinks by content hash only. `storageKey` and `sourcePath` from an archive
 * are intentionally never read, so a malicious archive cannot direct local
 * file access through path traversal.
 */
export function relinkBackupFileAssets(
  manifest: Pick<BackupManifest, 'files'>,
  localUrisByContentHash: LocalAssetUriIndex,
): readonly RelinkedBackupAsset[] {
  return manifest.files.map((file: BackupFileEntry) => {
    const hash = file.contentHash.trim().toLowerCase();
    if (!SAFE_HASH.test(hash)) throw new Error('Backup file content hash is not a safe identifier.');
    const localUri = uriForHash(localUrisByContentHash, hash);
    if (localUri !== undefined && (typeof localUri !== 'string' || !localUri.trim())) {
      throw new Error('Local document URI must be a non-empty string.');
    }
    return localUri ? { id: file.id, contentHash: hash, localUri } : { id: file.id, contentHash: hash };
  });
}

export type LocalImportTransactionPhase = 'staging' | 'ready_to_commit' | 'committing' | 'committed' | 'discarded';
export type LocalImportTransaction = Readonly<{
  id: string;
  phase: LocalImportTransactionPhase;
  manifestValidated: boolean;
  expectedContentHashes: readonly string[];
  stagedContentHashes: readonly string[];
  /** Persisted only after the metadata/data swap completed. */
  commitMarker?: true;
}>;
export type LocalImportRecovery = Readonly<{
  action: 'none' | 'resume_commit' | 'discard_temporary';
  reason: string;
}>;

function sameHashes(expected: readonly string[], staged: readonly string[]): boolean {
  const normalized = (values: readonly string[]) => [...new Set(values.map(value => value.trim().toLowerCase()))].sort();
  const left = normalized(expected), right = normalized(staged);
  return left.length === right.length && left.every((value, index) => value === right[index] && SAFE_HASH.test(value));
}

/** True only when every validated asset is staged and a single atomic swap is safe. */
export function canAtomicallyCommitImport(transaction: LocalImportTransaction): boolean {
  return transaction.phase === 'ready_to_commit'
    && transaction.manifestValidated
    && !transaction.commitMarker
    && sameHashes(transaction.expectedContentHashes, transaction.stagedContentHashes);
}

/** Decision model for a startup recovery adapter; it performs no cleanup itself. */
export function recoverInterruptedImport(transaction: LocalImportTransaction): LocalImportRecovery {
  if (transaction.phase === 'committed' || transaction.commitMarker) return { action: 'none', reason: 'The import was already committed.' };
  if (canAtomicallyCommitImport(transaction)) return { action: 'resume_commit', reason: 'All validated assets are staged for an atomic commit.' };
  if (transaction.phase === 'staging' || transaction.phase === 'ready_to_commit' || transaction.phase === 'committing') {
    return { action: 'discard_temporary', reason: 'The interrupted import has no safe atomic commit decision.' };
  }
  return { action: 'none', reason: 'The temporary import was already discarded.' };
}