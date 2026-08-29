import type { BackupManifest, CloudAccount, CloudObject, CloudObjectMetadata, CloudProviderAdapter } from './backupDomain';
import { isLatestPointerEligible } from './backupDomain';
import { loadProviderCredential, removeProviderCredential, type StoredProviderCredential } from './secureCredentials';

/** This is deliberately the only Drive scope accepted by this adapter. */
export const GOOGLE_DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'data';
const POINTER_NAME = 'current.json';
const MAX_SIMPLE_UPLOAD_BYTES = 5 * 1024 * 1024;

export type GoogleDriveFailureCode = 'reconnect_required' | 'requires_configuration' | 'auth' | 'network' | 'quota' | 'wrong_account' | 'invalid_object' | 'integrity' | 'provider';
export class GoogleDriveAdapterError extends Error {
  readonly code: GoogleDriveFailureCode;
  constructor(code: GoogleDriveFailureCode, message: string) {
    super(message);
    this.name = 'GoogleDriveAdapterError';
    this.code = code;
  }
}

export type GoogleDriveConnectionResult =
  | Readonly<{ ok: true; status: 'connected'; account: CloudAccount }>
  | Readonly<{ ok: false; status: 'permission_required' | 'expired'; error: 'reconnect_required'; message: string }>
  | Readonly<{ ok: false; status: 'error'; error: 'requires_configuration'; message: string }>;

export type GoogleDriveAdapterOptions = Readonly<{
  /** OAuth setup facts only; tokens are always read from Secure Store. */
  clientId?: string;
  redirectUri?: string;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  loadCredential?: (accountId: string) => Promise<StoredProviderCredential | undefined>;
  removeCredential?: (accountId: string) => Promise<void>;
  hash?: (bytes: Uint8Array) => Promise<string>;
  /** Prevent a token saved for one app account from being used under another ID. */
  accountIdForCredential?: (credential: StoredProviderCredential) => string | undefined;
  maxAttempts?: number;
}>;

type DriveFile = { id?: string; name?: string; size?: string; modifiedTime?: string; appProperties?: Record<string, string> };
type DriveList = { files?: DriveFile[]; nextPageToken?: string };

const textEncoder = new TextEncoder();
const neutralName = (key: string) => `o-${encodeURIComponent(key).replace(/%/g, '_')}`;
const isScopeGranted = (scope: string) => scope.split(/\s+/).includes(GOOGLE_DRIVE_APPDATA_SCOPE);
const safeKey = (key: string) => !!key && key.length <= 512 && !key.startsWith('/') && !key.includes('..') && !/[\0\r\n]/.test(key);

async function sha256(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new GoogleDriveAdapterError('integrity', 'SHA-256 verification is unavailable on this device.');
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('');
}

/**
 * Drive appDataFolder is private to the OAuth principal. The additional child folder
 * keeps this application's objects separate without requesting any broader Drive access.
 */
export class GoogleDriveBackupAdapter implements CloudProviderAdapter {
  readonly providerType = 'google_drive' as const;
  readonly capabilities = { connect: true, incrementalUpload: true, remoteRestore: true, deleteRemoteSnapshots: true, localExport: false } as const;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly loadCredential: NonNullable<GoogleDriveAdapterOptions['loadCredential']>;
  private readonly removeCredential: NonNullable<GoogleDriveAdapterOptions['removeCredential']>;
  private readonly hash: NonNullable<GoogleDriveAdapterOptions['hash']>;
  private readonly maxAttempts: number;
  private readonly options: GoogleDriveAdapterOptions;

  constructor(options: GoogleDriveAdapterOptions = {}) {
    if (!options.fetch && typeof fetch === 'undefined') throw new GoogleDriveAdapterError('requires_configuration', 'No network implementation is available.');
    this.options = options;
    this.fetcher = options.fetch ?? fetch;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
    this.loadCredential = options.loadCredential ?? loadProviderCredential;
    this.removeCredential = options.removeCredential ?? removeProviderCredential;
    this.hash = options.hash ?? sha256;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  }

  /** A UI can call this before enabling backup; it never exposes a token. */
  async connectionStatus(account: CloudAccount): Promise<GoogleDriveConnectionResult> {
    if (!this.isConfigured()) return { ok: false, status: 'error', error: 'requires_configuration', message: 'Google OAuth client ID and redirect URI are required.' };
    const credential = await this.loadCredential(account.id);
    if (!credential || !isScopeGranted(credential.scope)) return { ok: false, status: 'permission_required', error: 'reconnect_required', message: 'Reconnect Google Drive with the app-data permission.' };
    if (credential.expiresAt <= this.now() + 60_000) return { ok: false, status: 'expired', error: 'reconnect_required', message: 'Google Drive authorization has expired.' };
    if (this.options.accountIdForCredential?.(credential) !== undefined && this.options.accountIdForCredential(credential) !== account.id) {
      return { ok: false, status: 'permission_required', error: 'reconnect_required', message: 'The saved authorization belongs to a different account.' };
    }
    return { ok: true, status: 'connected', account: { ...account, providerType: 'google_drive', status: 'connected', grantedScopes: [GOOGLE_DRIVE_APPDATA_SCOPE], updatedAt: new Date(this.now()).toISOString() } };
  }

  async connect(): Promise<CloudAccount> {
    throw new GoogleDriveAdapterError(
      this.isConfigured() ? 'reconnect_required' : 'requires_configuration',
      this.isConfigured()
        ? 'OAuth connection must be completed by the native OAuth flow; use connectionStatus after its credential is saved.'
        : 'Google OAuth client ID and redirect URI are required.',
    );
  }

  async disconnect(accountId: string): Promise<void> {
    await this.removeCredential(accountId);
  }

  async list(accountId: string, prefix: string): Promise<readonly CloudObjectMetadata[]> {
    const folderId = await this.folder(accountId);
    const files = await this.allFiles(accountId, folderId);
    return files.flatMap(file => {
      const key = file.appProperties?.key;
      if (!file.id || !key || !key.startsWith(prefix)) return [];
      return [{ key, byteSize: Number(file.size ?? 0), contentHash: file.appProperties?.hash, updatedAt: file.modifiedTime }];
    });
  }

  async upload(accountId: string, object: CloudObject): Promise<CloudObjectMetadata> {
    if (!safeKey(object.key)) throw new GoogleDriveAdapterError('invalid_object', 'The remote object key is invalid.');
    if (object.bytes.byteLength > MAX_SIMPLE_UPLOAD_BYTES) throw new GoogleDriveAdapterError('invalid_object', 'Object exceeds the bounded mobile upload size.');
    if (object.contentHash && (await this.hash(object.bytes)).toLowerCase() !== object.contentHash.toLowerCase()) {
      throw new GoogleDriveAdapterError('integrity', 'Object content does not match its supplied hash.');
    }
    const folderId = await this.folder(accountId);
    const existing = (await this.allFiles(accountId, folderId)).find(file => file.appProperties?.key === object.key);
    const metadata = { name: neutralName(object.key), parents: [folderId], appProperties: { key: object.key, ...(object.contentHash ? { hash: object.contentHash } : {}) } };
    const path = existing?.id ? `/files/${encodeURIComponent(existing.id)}` : '/files';
    const method = existing?.id ? 'PATCH' : 'POST';
    const response = await this.request(accountId, `${UPLOAD_API}${path}?uploadType=multipart`, {
      method,
      headers: { 'Content-Type': 'multipart/related; boundary=documenta' },
      body: this.multipart(metadata, object.bytes).buffer as ArrayBuffer,
    });
    const file = await response.json() as DriveFile;
    if (!file.id) throw new GoogleDriveAdapterError('provider', 'Drive did not return an uploaded file ID.');
    // A bounded multipart upload is used here so a retry never leaves a partially
    // published object; callers can split larger immutable content-addressed blobs.
    return { key: object.key, byteSize: object.bytes.byteLength, contentHash: object.contentHash, updatedAt: file.modifiedTime };
  }

  async download(accountId: string, key: string): Promise<CloudObject> {
    const file = await this.fileForKey(accountId, key);
    const response = await this.request(accountId, `${DRIVE_API}/files/${encodeURIComponent(file.id!)}?alt=media`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const expectedHash = file.appProperties?.hash;
    if (expectedHash && (await this.hash(bytes)).toLowerCase() !== expectedHash.toLowerCase()) throw new GoogleDriveAdapterError('integrity', 'Downloaded object failed its content hash check.');
    return { key, bytes, contentHash: expectedHash, updatedAt: file.modifiedTime };
  }

  async remove(accountId: string, key: string): Promise<void> {
    const file = await this.fileForKey(accountId, key);
    await this.request(accountId, `${DRIVE_API}/files/${encodeURIComponent(file.id!)}`, { method: 'DELETE' });
  }

  /** Hashes bytes with the same verifier used for upload/download metadata. */
  async contentHash(bytes: Uint8Array): Promise<string> {
    return this.hash(bytes);
  }

  private isConfigured(): boolean {
    return Boolean(this.options.clientId?.trim() && this.options.redirectUri?.trim());
  }

  private async credential(accountId: string): Promise<StoredProviderCredential> {
    if (!this.isConfigured()) throw new GoogleDriveAdapterError('requires_configuration', 'Google OAuth client ID and redirect URI are required.');
    const credential = await this.loadCredential(accountId);
    if (!credential || !isScopeGranted(credential.scope) || credential.expiresAt <= this.now() + 60_000) throw new GoogleDriveAdapterError('reconnect_required', 'Google Drive must be reconnected.');
    const boundId = this.options.accountIdForCredential?.(credential);
    if (boundId !== undefined && boundId !== accountId) throw new GoogleDriveAdapterError('wrong_account', 'The authorization belongs to another account.');
    return credential;
  }

  private async request(accountId: string, url: string, init: RequestInit = {}): Promise<Response> {
    const credential = await this.credential(accountId);
    let lastError: unknown;
    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      try {
        const response = await this.fetcher(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${credential.accessToken}` } });
        if (response.ok) return response;
        if (response.status === 401 || response.status === 403) throw new GoogleDriveAdapterError('auth', 'Google Drive authorization was rejected.');
        if (response.status === 429 || response.status >= 500) {
          lastError = new GoogleDriveAdapterError(response.status === 429 ? 'quota' : 'network', `Google Drive temporarily failed (${response.status}).`);
        } else throw new GoogleDriveAdapterError('provider', `Google Drive request failed (${response.status}).`);
      } catch (error) {
        if (error instanceof GoogleDriveAdapterError && !['quota', 'network'].includes(error.code)) throw error;
        lastError = error instanceof GoogleDriveAdapterError ? error : new GoogleDriveAdapterError('network', 'Unable to reach Google Drive.');
      }
      if (attempt + 1 < this.maxAttempts) await this.sleep(Math.min(4000, 250 * 2 ** attempt));
    }
    throw lastError instanceof GoogleDriveAdapterError ? lastError : new GoogleDriveAdapterError('network', 'Unable to reach Google Drive.');
  }

  private async folder(accountId: string): Promise<string> {
    const q = encodeURIComponent(`'appDataFolder' in parents and name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const listed = await this.request(accountId, `${DRIVE_API}/files?q=${q}&spaces=appDataFolder&fields=files(id,name)`);
    const found = (await listed.json() as DriveList).files?.find(file => file.id)?.id;
    if (found) return found;
    const created = await this.request(accountId, `${DRIVE_API}/files`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', parents: ['appDataFolder'] }) });
    const file = await created.json() as DriveFile;
    if (!file.id) throw new GoogleDriveAdapterError('provider', 'Drive did not create the app data folder.');
    return file.id;
  }

  private async allFiles(accountId: string, folderId: string): Promise<DriveFile[]> {
    const files: DriveFile[] = []; let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ q: `'${folderId}' in parents and trashed = false`, spaces: 'appDataFolder', fields: 'nextPageToken,files(id,name,size,modifiedTime,appProperties)' });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await this.request(accountId, `${DRIVE_API}/files?${params.toString()}`);
      const page = await response.json() as DriveList; files.push(...(page.files ?? [])); pageToken = page.nextPageToken;
    } while (pageToken);
    return files;
  }

  private async fileForKey(accountId: string, key: string): Promise<DriveFile> {
    const folderId = await this.folder(accountId);
    const file = (await this.allFiles(accountId, folderId)).find(item => item.appProperties?.key === key && item.id);
    if (!file) throw new GoogleDriveAdapterError('provider', 'The requested Drive object does not exist.');
    return file;
  }

  private multipart(metadata: object, bytes: Uint8Array): Uint8Array {
    const preamble = textEncoder.encode(`--documenta\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--documenta\r\nContent-Type: application/octet-stream\r\n\r\n`);
    const suffix = textEncoder.encode('\r\n--documenta--');
    const body = new Uint8Array(preamble.length + bytes.length + suffix.length);
    body.set(preamble); body.set(bytes, preamble.length); body.set(suffix, preamble.length + bytes.length);
    return body;
  }
}

type EncryptedManifestUpload = Readonly<{ bytes: Uint8Array }>;

function assertEncryptedManifest(bytes: Uint8Array): void {
  let candidate: unknown;
  try {
    candidate = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new GoogleDriveAdapterError('invalid_object', 'The manifest must be an encrypted backup envelope.');
  }
  const envelope = candidate as Record<string, unknown>;
  if (!envelope || envelope.format !== 'documenta-backup' || envelope.version !== 1
    || typeof envelope.kdf !== 'string' || typeof envelope.salt !== 'string'
    || typeof envelope.nonce !== 'string' || typeof envelope.ciphertext !== 'string'
    || Object.keys(envelope).some(key => !['format', 'version', 'kdf', 'iterations', 'salt', 'nonce', 'ciphertext'].includes(key))) {
    throw new GoogleDriveAdapterError('invalid_object', 'The manifest must be an encrypted backup envelope.');
  }
}

/**
 * Upload immutable encrypted data and an encrypted manifest, then publish the
 * neutral pointer last. This boundary intentionally never accepts plaintext
 * manifest state, preventing an accidental Drive publication of user data.
 */
export async function publishGoogleDriveSnapshot(
  adapter: GoogleDriveBackupAdapter,
  accountId: string,
  manifest: BackupManifest,
  encryptedManifest: EncryptedManifestUpload,
  files: readonly CloudObject[],
): Promise<CloudObjectMetadata> {
  if (!isLatestPointerEligible(manifest)) throw new GoogleDriveAdapterError('invalid_object', 'Only complete, content-addressed manifests can be published.');
  assertEncryptedManifest(encryptedManifest.bytes);
  for (const file of files) await adapter.upload(accountId, file);
  const manifestKey = `manifests/${manifest.id}.dcbak`;
  const encryptedHash = await adapter.contentHash(encryptedManifest.bytes);
  await adapter.upload(accountId, { key: manifestKey, bytes: encryptedManifest.bytes, contentHash: encryptedHash });
  const downloaded = await adapter.download(accountId, manifestKey);
  if (downloaded.bytes.length !== encryptedManifest.bytes.length
    || downloaded.bytes.some((value, index) => value !== encryptedManifest.bytes[index])
    || downloaded.contentHash?.toLowerCase() !== encryptedHash.toLowerCase()) {
    throw new GoogleDriveAdapterError('integrity', 'Manifest verification failed before publishing the pointer.');
  }
  // The pointer reveals only an opaque object key and ciphertext hash.
  return adapter.upload(accountId, { key: POINTER_NAME, bytes: textEncoder.encode(JSON.stringify({ key: manifestKey, hash: encryptedHash })) });
}