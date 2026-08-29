/**
 * Provider-neutral backup orchestration.  Platform code supplies all file and
 * network I/O; this module deliberately has no Expo or native dependencies.
 */
import {
  canonicalizeManifest, classifyBackupMerge, contentAddressedFileKey, deterministicHash,
  excludeSecrets, manifestHashInput, retainSnapshots, stripRestoreNotificationMetadata,
  type BackupConflict, type BackupFileEntry, type BackupManifest, type CloudProviderAdapter,
} from './backupDomain';
import {
  BackupCryptoError, decryptBackup, encryptBackup, sha256Hex, type BackupCryptoProvider, type BackupKeyInput,
} from './backupCrypto';
import { relinkBackupFileAssets } from './localBackup';

export const BACKUP_SERVICE_SCHEMA_VERSION = 1 as const;
export const DEFAULT_BACKUP_POLICY: BackupPolicy = Object.freeze({
  maxFileBytes: 25 * 1024 * 1024, maxTotalBytes: 100 * 1024 * 1024,
  retention: 3, debounceMs: 30_000, foregroundOnly: true,
});

export type BackupRuntimeState = 'idle' | 'preparing' | 'uploading' | 'complete' | 'failed' | 'cancelled' | 'restoring';
export type BackupProgress = Readonly<{ state: BackupRuntimeState; stage: string; completedFiles: number; totalFiles: number; completedBytes: number; totalBytes: number }>;
export type BackupPolicy = Readonly<{ maxFileBytes: number; maxTotalBytes: number; retention: number; debounceMs: number; foregroundOnly: boolean }>;
export type BackupAuditEvent = Readonly<{ type: 'started' | 'asset_uploaded' | 'asset_skipped' | 'manifest_uploaded' | 'completed' | 'cancelled' | 'restore_prepared' | 'failed'; at: string; manifestId?: string; detail?: string }>;
export type BackupPreview = Readonly<{ manifestId: string; createdAt: string; documentCount: number; assetCount: number; byteSize: number; owned: boolean; requiresEntitlement: boolean }>;
export type RestorePlan<T = unknown> = Readonly<{ manifest: BackupManifest; state: T; assetsByContentHash: Readonly<Record<string, Uint8Array>>; relinkedState: T; conflicts: readonly BackupConflict[]; readyToCommit: true }>;
export type BackupJournalStage = 'started' | 'assets_uploaded' | 'manifest_uploaded' | 'complete' | 'cancelled' | 'restore_downloading' | 'restore_validated';
export type BackupJournal = Readonly<{ operation: 'backup' | 'restore'; manifestId: string; stage: BackupJournalStage; at: string }>;

export class BackupServiceError extends Error {
  constructor(public readonly code: 'CANCELLED' | 'BUSY' | 'SIZE_LIMIT' | 'INVALID_MANIFEST' | 'OWNERSHIP' | 'ENTITLEMENT' | 'INTEGRITY' | 'UNSUPPORTED_SCHEMA' | 'IO', message: string) {
    super(message); this.name = 'BackupServiceError';
  }
}

export interface BackupServiceIO {
  readAsset(uri: string): Promise<Uint8Array>;
  writeAssets?(assets: Readonly<Record<string, Uint8Array>>): Promise<Readonly<Record<string, string>>>;
  now?(): string;
  isCancelled?(): boolean;
  onProgress?(progress: BackupProgress): void;
  onAudit?(event: BackupAuditEvent): void;
  saveJournal?(journal: BackupJournal): Promise<void> | void;
}
export type BackupRequest<T extends Record<string, unknown>> = Readonly<{
  state: T; accountId: string; key: BackupKeyInput; adapter: CloudProviderAdapter; crypto: BackupCryptoProvider;
  manifestId: string; appVersion?: string; priorManifest?: BackupManifest; policy?: Partial<BackupPolicy>;
}>;
export type RestoreRequest<T extends Record<string, unknown>> = Readonly<{
  accountId: string; manifestKey: string; key: BackupKeyInput; adapter: CloudProviderAdapter; crypto: BackupCryptoProvider;
  localState?: T; baseState?: T; entitled?: boolean; migrate?(state: unknown, schemaVersion: number): T;
}>;

const encoder = new TextEncoder();
const assetFields = new Set(['uri', 'pdfUri', 'pageUris', 'originalPageUris', 'cleanPageUris', 'blackWhitePageUris']);
const safe = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const now = (io: BackupServiceIO) => io.now?.() ?? new Date().toISOString();
const manifestKey = (id: string) => `manifests/${id}.dcbak`;
const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const bytesToBase64 = (bytes: Uint8Array) => {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const word = (bytes[index] << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
    result += base64Alphabet[(word >>> 18) & 63] + base64Alphabet[(word >>> 12) & 63]
      + (index + 1 < bytes.length ? base64Alphabet[(word >>> 6) & 63] : '=') + (index + 2 < bytes.length ? base64Alphabet[word & 63] : '=');
  }
  return result;
};
const base64ToBytes = (value: string) => {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new BackupServiceError('INTEGRITY', 'Backup asset has invalid base64 bytes.');
  const result: number[] = [];
  for (let index = 0; index < value.length; index += 4) {
    const a = base64Alphabet.indexOf(value[index]), b = base64Alphabet.indexOf(value[index + 1]);
    const c = value[index + 2] === '=' ? 0 : base64Alphabet.indexOf(value[index + 2]), d = value[index + 3] === '=' ? 0 : base64Alphabet.indexOf(value[index + 3]);
    result.push((a << 2) | (b >> 4));
    if (value[index + 2] !== '=') result.push(((b & 15) << 4) | (c >> 2));
    if (value[index + 3] !== '=') result.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(result);
};

/** Removes credentials and OS notification handles before canonical serialization. */
export function sanitizeBackupState<T>(state: T): T {
  return stripRestoreNotificationMetadata(excludeSecrets(state));
}
export function inventoryDocumentAssetUris(state: unknown): readonly string[] {
  const found = new Set<string>();
  const visit = (value: unknown, key?: string): void => {
    if (typeof value === 'string') { if (key && assetFields.has(key) && value.trim()) found.add(value); return; }
    if (Array.isArray(value)) { value.forEach(item => visit(item, key)); return; }
    if (value && typeof value === 'object') Object.entries(value as Record<string, unknown>).forEach(([name, item]) => visit(item, name));
  };
  visit(state); return [...found].sort();
}
export function isBackupAllowedInForeground(policy: BackupPolicy, isForeground: boolean): boolean {
  return !policy.foregroundOnly || isForeground;
}
export function isBackupDebounced(lastStartedAt: string | undefined, policy: BackupPolicy, currentTime = Date.now()): boolean {
  return !!lastStartedAt && currentTime - Date.parse(lastStartedAt) < policy.debounceMs;
}
export function shouldRequireRestoreEntitlement(manifestAccountId: string | undefined, accountId: string): boolean {
  return Boolean(manifestAccountId && manifestAccountId !== accountId);
}
export function canRestoreBackup(manifestAccountId: string | undefined, accountId: string, entitled = false): boolean {
  return !shouldRequireRestoreEntitlement(manifestAccountId, accountId) || entitled;
}

let active = false;
function checkCancelled(io: BackupServiceIO): void { if (io.isCancelled?.()) throw new BackupServiceError('CANCELLED', 'Backup operation was cancelled.'); }
function emit(io: BackupServiceIO, state: BackupRuntimeState, stage: string, done: number, total: number, bytes: number, totalBytes: number): void {
  io.onProgress?.({ state, stage, completedFiles: done, totalFiles: total, completedBytes: bytes, totalBytes });
}
async function journal(io: BackupServiceIO, operation: BackupJournal['operation'], manifestId: string, stage: BackupJournalStage): Promise<void> {
  await io.saveJournal?.({ operation, manifestId, stage, at: now(io) });
}
function extension(uri: string): string { const match = /\.([a-z0-9]{1,8})(?:[?#]|$)/i.exec(uri); return match?.[1]?.toLowerCase() ?? 'bin'; }
function snapshotStorageKey(storageKey: string, manifestId: string): string {
  const suffix = deterministicHash(manifestId).slice(0, 12);
  return storageKey.replace(/(\.[^./]+)$/, `-${suffix}$1`);
}
async function canReuseEncryptedAsset<T extends Record<string, unknown>>(request: BackupRequest<T>, storageKey: string, contentHash: string): Promise<boolean> {
  const remote = await request.adapter.download(request.accountId, storageKey);
  try {
    const payload = safe(await decryptBackup(JSON.parse(new TextDecoder().decode(remote.bytes)), request.key, request.crypto));
    if (payload.contentHash !== contentHash || typeof payload.bytes !== 'string') return false;
    return await sha256Hex(base64ToBytes(payload.bytes), request.crypto) === contentHash;
  } catch (error) {
    if (error instanceof BackupCryptoError && (error.code === 'AUTH_FAILED' || error.code === 'INVALID_INPUT')) return false;
    if (error instanceof SyntaxError) return false;
    throw error;
  }
}

export async function createBackup<T extends Record<string, unknown>>(request: BackupRequest<T>, io: BackupServiceIO): Promise<{ manifest: BackupManifest; encryptedManifest: Uint8Array; uploadedAssetHashes: readonly string[]; retainedManifests: readonly BackupManifest[] }> {
  if (active) throw new BackupServiceError('BUSY', 'Another backup or restore is already running.');
  active = true;
  const policy = { ...DEFAULT_BACKUP_POLICY, ...request.policy };
  try {
    if (!request.adapter.capabilities.incrementalUpload && request.adapter.providerType !== 'local_export') throw new BackupServiceError('IO', 'This provider cannot upload backups.');
    await journal(io, 'backup', request.manifestId, 'started'); io.onAudit?.({ type: 'started', at: now(io), manifestId: request.manifestId });
    const state = sanitizeBackupState(request.state), uris = inventoryDocumentAssetUris(state), files: BackupFileEntry[] = [];
    const existingRemoteKeys = request.adapter.providerType === 'local_export'
      ? new Set<string>()
      : new Set((await request.adapter.list(request.accountId, 'files/')).map(item => item.key));
    let total = 0, complete = 0; const uploaded: string[] = [];
    const previous = new Map(request.priorManifest?.files.map(file => [file.contentHash.toLowerCase(), file.storageKey]) ?? []);
    for (const uri of uris) {
      checkCancelled(io); const bytes = await io.readAsset(uri);
      if (!(bytes instanceof Uint8Array)) throw new BackupServiceError('IO', `Asset reader did not return bytes for ${uri}.`);
      if (bytes.byteLength > policy.maxFileBytes) throw new BackupServiceError('SIZE_LIMIT', `Asset exceeds per-file backup limit: ${uri}`);
      total += bytes.byteLength; if (total > policy.maxTotalBytes) throw new BackupServiceError('SIZE_LIMIT', 'Backup exceeds total asset size limit.');
      const contentHash = await sha256Hex(bytes, request.crypto);
      const canonicalStorageKey = contentAddressedFileKey(contentHash, extension(uri));
      const reusableKey = previous.get(contentHash.toLowerCase()) ?? (existingRemoteKeys.has(canonicalStorageKey) ? canonicalStorageKey : undefined);
      const canReuse = reusableKey ? await canReuseEncryptedAsset(request, reusableKey, contentHash) : false;
      const storageKey = canReuse ? reusableKey! : (existingRemoteKeys.has(canonicalStorageKey) ? snapshotStorageKey(canonicalStorageKey, request.manifestId) : canonicalStorageKey);
      files.push({ id: deterministicHash(uri), contentHash, storageKey, byteSize: bytes.byteLength, sourcePath: uri, createdAt: now(io) });
      if (!canReuse) {
        const encrypted = encoder.encode(JSON.stringify(await encryptBackup({ contentHash, bytes: bytesToBase64(bytes) }, request.key, request.crypto)));
        const encryptedHash = await sha256Hex(encrypted, request.crypto);
        await request.adapter.upload(request.accountId, { key: storageKey, bytes: encrypted, contentHash: encryptedHash }); uploaded.push(contentHash);
        io.onAudit?.({ type: 'asset_uploaded', at: now(io), manifestId: request.manifestId, detail: contentHash });
      } else io.onAudit?.({ type: 'asset_skipped', at: now(io), manifestId: request.manifestId, detail: contentHash });
      complete += 1; emit(io, 'uploading', 'assets', complete, uris.length, total, total);
    }
    await journal(io, 'backup', request.manifestId, 'assets_uploaded'); checkCancelled(io);
    const stateHash = await sha256Hex(encoder.encode(canonicalizeManifest(state)), request.crypto);
    const bare: BackupManifest = { schemaVersion: 1, id: request.manifestId, accountId: request.accountId, createdAt: now(io), appVersion: request.appVersion, parentManifestId: request.priorManifest?.id, files, state, stateHash, completedAt: now(io) };
    const manifest: BackupManifest = { ...bare, manifestHash: await sha256Hex(encoder.encode(manifestHashInput(bare)), request.crypto) };
    const encryptedManifest = encoder.encode(JSON.stringify(await encryptBackup(manifest, request.key, request.crypto)));
    await request.adapter.upload(request.accountId, { key: manifestKey(manifest.id), bytes: encryptedManifest, contentHash: await sha256Hex(encryptedManifest, request.crypto) });
    await journal(io, 'backup', request.manifestId, 'manifest_uploaded'); await journal(io, 'backup', request.manifestId, 'complete');
    io.onAudit?.({ type: 'manifest_uploaded', at: now(io), manifestId: manifest.id }); io.onAudit?.({ type: 'completed', at: now(io), manifestId: manifest.id });
    return { manifest, encryptedManifest, uploadedAssetHashes: uploaded, retainedManifests: retainSnapshots([manifest, ...(request.priorManifest ? [request.priorManifest] : [])], policy.retention) };
  } catch (error) {
    if (error instanceof BackupServiceError && error.code === 'CANCELLED') { await journal(io, 'backup', request.manifestId, 'cancelled'); io.onAudit?.({ type: 'cancelled', at: now(io), manifestId: request.manifestId }); }
    else io.onAudit?.({ type: 'failed', at: now(io), manifestId: request.manifestId, detail: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  } finally { active = false; }
}

function replaceUris(value: unknown, map: Readonly<Record<string, string>>, assetField = false): unknown {
  if (typeof value === 'string') return assetField ? (map[value] ?? value) : value;
  if (Array.isArray(value)) return value.map(item => replaceUris(item, map, assetField));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key, replaceUris(item, map, assetFields.has(key)),
  ]));
}
function entities(state: unknown): Map<string, unknown> {
  const records = safe(state).documents; return new Map((Array.isArray(records) ? records : []).map(item => [String(safe(item).id), item]));
}
/** Downloads and validates everything, but never commits state or files itself. */
export async function prepareRestore<T extends Record<string, unknown>>(request: RestoreRequest<T>, io: BackupServiceIO): Promise<RestorePlan<T>> {
  if (active) throw new BackupServiceError('BUSY', 'Another backup or restore is already running.');
  active = true;
  try {
    await journal(io, 'restore', request.manifestKey, 'restore_downloading'); checkCancelled(io);
    const encrypted = await request.adapter.download(request.accountId, request.manifestKey);
    let decoded: unknown; try { decoded = await decryptBackup(JSON.parse(new TextDecoder().decode(encrypted.bytes)), request.key, request.crypto); } catch (error) { throw error; }
    const manifest = decoded as BackupManifest;
    if (!manifest || manifest.schemaVersion !== BACKUP_SERVICE_SCHEMA_VERSION) throw new BackupServiceError('UNSUPPORTED_SCHEMA', 'Backup manifest schema is not supported.');
    if (!canRestoreBackup(manifest.accountId, request.accountId, request.entitled)) throw new BackupServiceError('ENTITLEMENT', 'Restoring a backup from another account requires entitlement.');
    if (manifest.manifestHash !== await sha256Hex(encoder.encode(manifestHashInput(manifest)), request.crypto)) throw new BackupServiceError('INTEGRITY', 'Backup manifest integrity validation failed.');
    const migrated = request.migrate ? request.migrate(manifest.state, manifest.schemaVersion) : manifest.state as T;
    const clean = sanitizeBackupState(migrated);
    if (await sha256Hex(encoder.encode(canonicalizeManifest(clean)), request.crypto) !== manifest.stateHash) throw new BackupServiceError('INTEGRITY', 'Backup state integrity validation failed.');
    const bytesByHash: Record<string, Uint8Array> = {};
    for (const file of manifest.files) {
      checkCancelled(io); const item = await request.adapter.download(request.accountId, file.storageKey);
      const payload = await decryptBackup(JSON.parse(new TextDecoder().decode(item.bytes)), request.key, request.crypto) as { contentHash?: unknown; bytes?: unknown };
      if (payload.contentHash !== file.contentHash || typeof payload.bytes !== 'string') throw new BackupServiceError('INTEGRITY', 'Backup asset metadata validation failed.');
      const bytes = base64ToBytes(payload.bytes);
      if (bytes.byteLength !== file.byteSize || await sha256Hex(bytes, request.crypto) !== file.contentHash) throw new BackupServiceError('INTEGRITY', 'Backup asset integrity validation failed.');
      bytesByHash[file.contentHash] = bytes;
    }
    const uriMap = io.writeAssets ? await io.writeAssets(bytesByHash) : {};
    relinkBackupFileAssets(manifest, uriMap);
    const uriByOriginal: Record<string, string> = {}; manifest.files.forEach(file => { if (file.sourcePath && uriMap[file.contentHash]) uriByOriginal[file.sourcePath] = uriMap[file.contentHash]; });
    const restored = sanitizeBackupState(replaceUris(clean, uriByOriginal)) as T;
    const rebuilt = { ...restored, searchIndexVersion: 0, searchIndexRevision: Number(safe(restored).searchIndexRevision ?? 0) + 1 } as T;
    const local = entities(request.localState), base = entities(request.baseState), remote = entities(rebuilt);
    const ids = [...new Set([...local.keys(), ...remote.keys(), ...base.keys()])].sort();
    const conflicts = ids.map(entityId => classifyBackupMerge({ entityId, entityType: 'document', base: base.get(entityId), local: local.get(entityId), remote: remote.get(entityId) }));
    const mergedDocuments = new Map(remote);
    conflicts.forEach(conflict => {
      if (conflict.resolution === 'use_local') {
        const localDocument = local.get(conflict.entityId);
        if (localDocument !== undefined) mergedDocuments.set(conflict.entityId, localDocument);
      }
    });
    const mergedState = {
      ...rebuilt,
      documents: [...mergedDocuments.values()],
    } as T;
    await journal(io, 'restore', manifest.id, 'restore_validated'); io.onAudit?.({ type: 'restore_prepared', at: now(io), manifestId: manifest.id });
    return { manifest, state: mergedState, assetsByContentHash: bytesByHash, relinkedState: mergedState, conflicts, readyToCommit: true };
  } finally { active = false; }
}

export async function discoverBackupPreviews(accountId: string, adapter: CloudProviderAdapter, key: BackupKeyInput, crypto: BackupCryptoProvider, entitled = false): Promise<readonly BackupPreview[]> {
  const objects = await adapter.list(accountId, 'manifests/');
  const previews = await Promise.all(objects.filter(item => item.key.endsWith('.dcbak')).map(async item => {
    const manifest = await decryptBackup(JSON.parse(new TextDecoder().decode((await adapter.download(accountId, item.key)).bytes)), key, crypto) as BackupManifest;
    const documents = safe(manifest.state).documents;
    return { manifestId: manifest.id, createdAt: manifest.createdAt, documentCount: Array.isArray(documents) ? documents.length : 0, assetCount: manifest.files.length, byteSize: manifest.files.reduce((sum, file) => sum + file.byteSize, 0), owned: !shouldRequireRestoreEntitlement(manifest.accountId, accountId), requiresEntitlement: shouldRequireRestoreEntitlement(manifest.accountId, accountId) && !entitled };
  }));
  return previews.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.manifestId.localeCompare(b.manifestId));
}