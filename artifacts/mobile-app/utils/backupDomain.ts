/** Pure, provider-agnostic backup domain. Provider credentials never belong here. */
export type CloudProviderType = 'google_drive' | 'future_onedrive' | 'future_dropbox' | 'local_export';
export type CloudConnectionStatus = 'disconnected' | 'permission_required' | 'connected' | 'expired' | 'error';
export type BackupIndexStatus = 'idle' | 'running' | 'complete' | 'partial' | 'failed' | 'needs_attention';
export type RestoreSessionStatus = 'prepared' | 'downloading' | 'validating' | 'awaiting_confirmation' | 'restoring' | 'complete' | 'failed' | 'cancelled';
export type BackupConflictType = 'local_only' | 'remote_only' | 'identical' | 'manual_correction_required' | 'deleted_locally' | 'deleted_remotely';

export type CloudAccount = Readonly<{
  id: string;
  providerType: CloudProviderType;
  displayName: string;
  accountEmail?: string;
  status: CloudConnectionStatus;
  grantedScopes: readonly string[];
  createdAt: string;
  updatedAt: string;
  lastErrorCode?: 'permission' | 'expired' | 'network' | 'quota' | 'unsupported';
}>;

export type BackupFileEntry = Readonly<{
  id: string;
  contentHash: string;
  storageKey: string;
  byteSize: number;
  mimeType?: string;
  sourcePath?: string;
  createdAt: string;
}>;

export type BackupManifest = Readonly<{
  schemaVersion: 1;
  id: string;
  accountId?: string;
  createdAt: string;
  appVersion?: string;
  parentManifestId?: string;
  files: readonly BackupFileEntry[];
  state: unknown;
  stateHash: string;
  manifestHash?: string;
  completedAt?: string;
}>;

export type BackupIndex = Readonly<{
  accountId: string;
  providerType: CloudProviderType;
  status: BackupIndexStatus;
  manifests: readonly BackupManifest[];
  latestManifestId?: string;
  updatedAt: string;
  lastError?: string;
}>;

export type RestoreSession = Readonly<{
  id: string;
  accountId?: string;
  manifestId: string;
  status: RestoreSessionStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  requiresUserConfirmation: boolean;
}>;

export type SyncMetadata = Readonly<{
  accountId: string;
  lastSuccessfulBackupAt?: string;
  lastSuccessfulRestoreAt?: string;
  lastManifestId?: string;
  cursor?: string;
  revision?: string;
}>;

export type BackupConflict = Readonly<{
  entityId: string;
  entityType: string;
  type: BackupConflictType;
  baseHash?: string;
  localHash?: string;
  remoteHash?: string;
  resolution: 'none' | 'use_local' | 'use_remote' | 'manual_correction_required';
  reason: string;
}>;

export type CloudProviderCapabilities = Readonly<{
  connect: boolean;
  incrementalUpload: boolean;
  remoteRestore: boolean;
  deleteRemoteSnapshots: boolean;
  localExport: boolean;
}>;
export type CloudProviderCapabilityMatrix = Readonly<Record<CloudProviderType, CloudProviderCapabilities>>;
export const CLOUD_PROVIDER_CAPABILITIES: CloudProviderCapabilityMatrix = Object.freeze({
  google_drive: { connect: true, incrementalUpload: true, remoteRestore: true, deleteRemoteSnapshots: true, localExport: false },
  future_onedrive: { connect: false, incrementalUpload: false, remoteRestore: false, deleteRemoteSnapshots: false, localExport: false },
  future_dropbox: { connect: false, incrementalUpload: false, remoteRestore: false, deleteRemoteSnapshots: false, localExport: false },
  local_export: { connect: false, incrementalUpload: false, remoteRestore: false, deleteRemoteSnapshots: false, localExport: true },
});

export type CloudObject = Readonly<{ key: string; bytes: Uint8Array; contentHash?: string; updatedAt?: string }>;
export type CloudObjectMetadata = Readonly<{ key: string; byteSize: number; contentHash?: string; updatedAt?: string }>;
/** I/O boundary only: implementations own OAuth, networking and platform file APIs. */
export interface CloudProviderAdapter {
  readonly providerType: CloudProviderType;
  readonly capabilities: CloudProviderCapabilities;
  connect(): Promise<CloudAccount>;
  disconnect(accountId: string): Promise<void>;
  list(accountId: string, prefix: string): Promise<readonly CloudObjectMetadata[]>;
  upload(accountId: string, object: CloudObject): Promise<CloudObjectMetadata>;
  download(accountId: string, key: string): Promise<CloudObject>;
  remove?(accountId: string, key: string): Promise<void>;
}

const SECRET_KEY = /(?:token|password|secret|credential|private[_-]?key|apikey|api[_-]?key|authorization|auth[_-]?key)/i;
const RESTORE_NOTIFICATION_METADATA = /^(?:notification(?:instances|schedules|token|nativeid)?|lastnativerecoveryat|native(?:notification|schedule|id)?|platformnotificationid|schedulednotificationid)$/i;

/** JSON-compatible clone which removes credential-shaped keys at every depth. */
export function excludeSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => excludeSecrets(item)) as T;
  if (!value || typeof value !== 'object') return value;
  const safe: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (!SECRET_KEY.test(key)) safe[key] = excludeSecrets(child);
  }
  return safe as T;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => canonicalValue(item === undefined ? null : item));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
    const child = (value as Record<string, unknown>)[key];
    if (child !== undefined) result[key] = canonicalValue(child);
    return result;
  }, {});
}

/** Stable serialization for hashes and equality checks; it intentionally excludes secrets. */
export function canonicalizeManifest(value: unknown): string {
  return JSON.stringify(canonicalValue(excludeSecrets(value)));
}

/** The immutable fields that identify a manifest, excluding its self-referential hash. */
export function manifestHashInput(manifest: BackupManifest): string {
  const { manifestHash: _manifestHash, ...input } = manifest;
  return canonicalizeManifest(input);
}

/** Small deterministic non-cryptographic fingerprint for keys/equality. Crypto hashing belongs to an adapter. */
export function deterministicHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function contentAddressedFileKey(contentHash: string, extension = 'bin'): string {
  const safeHash = contentHash.trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/i.test(safeHash)) throw new Error('Content hash must be a safe identifier.');
  const safeExtension = extension.replace(/^\./, '').toLowerCase();
  if (!/^[a-z0-9]+$/.test(safeExtension)) throw new Error('File extension must be alphanumeric.');
  return `files/${safeHash.slice(0, 2)}/${safeHash}.${safeExtension}`;
}

export type ChangedItems<T> = Readonly<{ added: readonly T[]; changed: readonly T[]; unchanged: readonly T[]; removedIds: readonly string[] }>;
export function detectChangedItems<T extends { id: string }>(current: readonly T[], previous: readonly T[]): ChangedItems<T> {
  const prior = new Map(previous.map(item => [item.id, canonicalizeManifest(item)]));
  const currentIds = new Set(current.map(item => item.id));
  const result: { added: T[]; changed: T[]; unchanged: T[] } = { added: [], changed: [], unchanged: [] };
  current.forEach(item => !prior.has(item.id) ? result.added.push(item) : prior.get(item.id) === canonicalizeManifest(item) ? result.unchanged.push(item) : result.changed.push(item));
  return { ...result, removedIds: previous.filter(item => !currentIds.has(item.id)).map(item => item.id).sort() };
}

export const DEFAULT_SNAPSHOT_RETENTION = 3;
export function retainSnapshots(manifests: readonly BackupManifest[], retention = DEFAULT_SNAPSHOT_RETENTION): readonly BackupManifest[] {
  if (!Number.isInteger(retention) || retention < 1) throw new Error('Snapshot retention must be a positive integer.');
  return [...manifests].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).slice(0, retention);
}

export function isLatestPointerEligible(manifest: BackupManifest): boolean {
  return Boolean(manifest.id && manifest.completedAt && manifest.stateHash && manifest.files.every(file => Boolean(file.contentHash && file.storageKey)));
}

export function classifyBackupMerge(input: Readonly<{ entityId: string; entityType: string; base?: unknown; local?: unknown; remote?: unknown }>): BackupConflict {
  const baseHash = input.base === undefined ? undefined : deterministicHash(canonicalizeManifest(input.base));
  const localHash = input.local === undefined ? undefined : deterministicHash(canonicalizeManifest(input.local));
  const remoteHash = input.remote === undefined ? undefined : deterministicHash(canonicalizeManifest(input.remote));
  const absentLocal = input.local === undefined; const absentRemote = input.remote === undefined;
  if (localHash === remoteHash) return { ...input, baseHash, localHash, remoteHash, type: 'identical', resolution: 'none', reason: 'Both sides have the same canonical content.' };
  if (input.base === undefined && absentLocal && !absentRemote) return { ...input, baseHash, localHash, remoteHash, type: 'remote_only', resolution: 'use_remote', reason: 'Remote content can be restored because no common base or local copy exists.' };
  if (input.base === undefined && !absentLocal && absentRemote) return { ...input, baseHash, localHash, remoteHash, type: 'local_only', resolution: 'use_local', reason: 'Local content is retained because no common base or remote copy exists.' };
  if (absentLocal) return { ...input, baseHash, localHash, remoteHash, type: 'deleted_locally', resolution: 'manual_correction_required', reason: 'Local deletion must be confirmed; it is not overwritten automatically.' };
  if (absentRemote) return { ...input, baseHash, localHash, remoteHash, type: 'deleted_remotely', resolution: 'manual_correction_required', reason: 'Remote deletion must be confirmed; it is not overwritten automatically.' };
  if (baseHash === localHash) return { ...input, baseHash, localHash, remoteHash, type: 'remote_only', resolution: 'use_remote', reason: 'Only the remote side changed since the common base.' };
  if (baseHash === remoteHash) return { ...input, baseHash, localHash, remoteHash, type: 'local_only', resolution: 'use_local', reason: 'Only the local side changed since the common base.' };
  return { ...input, baseHash, localHash, remoteHash, type: 'manual_correction_required', resolution: 'manual_correction_required', reason: 'Both sides changed; no last-write-wins merge is applied.' };
}

/** Removes device scheduling state so a restore cannot silently recreate native notifications. */
export function stripRestoreNotificationMetadata<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => stripRestoreNotificationMetadata(item)) as T;
  if (!value || typeof value !== 'object') return value;
  const safe: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (!RESTORE_NOTIFICATION_METADATA.test(key)) safe[key] = stripRestoreNotificationMetadata(child);
  }
  return safe as T;
}