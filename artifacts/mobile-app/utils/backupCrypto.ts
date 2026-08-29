/**
 * Small, platform-neutral primitives for encrypted backup files.  This module
 * deliberately does not persist keys or credentials: callers must supply a
 * passphrase or a 256-bit key for every operation.
 */
export const BACKUP_ENVELOPE_VERSION = 1;
export const MAX_BACKUP_PLAINTEXT_BYTES = 25 * 1024 * 1024;
export const MAX_BACKUP_ENVELOPE_BYTES = 35 * 1024 * 1024;
export const MAX_HASH_INPUT_BYTES = 100 * 1024 * 1024;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const PBKDF2_ITERATIONS = 210_000;

export type BackupKeyInput = { passphrase: string } | { key: Uint8Array };
export type BackupEnvelope = {
  format: 'documenta-backup';
  version: typeof BACKUP_ENVELOPE_VERSION;
  kdf: 'PBKDF2-SHA-256' | 'raw-aes-256-gcm';
  iterations?: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

export class BackupCryptoError extends Error {
  constructor(
    public readonly code: 'INVALID_INPUT' | 'SIZE_LIMIT' | 'UNSUPPORTED_VERSION' | 'AUTH_FAILED' | 'PREPARED',
    message: string,
  ) {
    super(message);
    this.name = 'BackupCryptoError';
  }
}

/** Narrow provider boundary so native runtimes never silently get weak crypto. */
export interface BackupCryptoProvider {
  randomBytes(length: number): Promise<Uint8Array>;
  sha256(data: Uint8Array): Promise<Uint8Array>;
  pbkdf2Sha256(passphrase: Uint8Array, salt: Uint8Array, iterations: number, length: number): Promise<Uint8Array>;
  aesGcmEncrypt(key: Uint8Array, nonce: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): Promise<Uint8Array>;
  aesGcmDecrypt(key: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array, aad: Uint8Array): Promise<Uint8Array>;
}

export type WebCryptoLike = {
  getRandomValues?: (array: Uint8Array) => Uint8Array;
  subtle?: {
    digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
    importKey(format: 'raw', keyData: Uint8Array, algorithm: unknown, extractable: boolean, usages: string[]): Promise<unknown>;
    deriveBits(algorithm: unknown, baseKey: unknown, length: number): Promise<ArrayBuffer>;
    encrypt(algorithm: unknown, key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
    decrypt(algorithm: unknown, key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
  };
};

/** Uses standards-based WebCrypto (including Node's WebCrypto in tests). */
export function webCryptoProvider(webCrypto: WebCryptoLike | undefined = (globalThis as { crypto?: WebCryptoLike }).crypto): BackupCryptoProvider {
  if (!webCrypto?.subtle || !webCrypto.getRandomValues) {
    throw new BackupCryptoError('PREPARED', 'AES-GCM backup encryption is unavailable on this runtime. Prepare a native crypto provider.');
  }
  const subtle = webCrypto.subtle;
  return {
    async randomBytes(length) {
      const result = new Uint8Array(length);
      webCrypto.getRandomValues!(result);
      return result;
    },
    async sha256(data) { return new Uint8Array(await subtle.digest('SHA-256', data)); },
    async pbkdf2Sha256(passphrase, salt, iterations, length) {
      const material = await subtle.importKey('raw', passphrase, 'PBKDF2', false, ['deriveBits']);
      return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, length * 8));
    },
    async aesGcmEncrypt(key, nonce, plaintext, aad) {
      const cryptoKey = await subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
      return new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 }, cryptoKey, plaintext));
    },
    async aesGcmDecrypt(key, nonce, ciphertext, aad) {
      try {
        const cryptoKey = await subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
        return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 }, cryptoKey, ciphertext));
      } catch {
        throw new BackupCryptoError('AUTH_FAILED', 'Backup authentication failed: the key is wrong or the file was modified.');
      }
    },
  };
}

function assertSize(bytes: Uint8Array, limit: number, label: string): void {
  if (bytes.byteLength > limit) throw new BackupCryptoError('SIZE_LIMIT', `${label} exceeds the ${limit}-byte limit.`);
}

function utf8(value: string): Uint8Array { return new TextEncoder().encode(value); }

function base64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const word = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    output += alphabet[(word >>> 18) & 63] + alphabet[(word >>> 12) & 63]
      + (i + 1 < bytes.length ? alphabet[(word >>> 6) & 63] : '=') + (i + 2 < bytes.length ? alphabet[word & 63] : '=');
  }
  return output;
}

function fromBase64(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new BackupCryptoError('INVALID_INPUT', 'Invalid base64 backup field.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 4) {
    const a = alphabet.indexOf(value[i]), b = alphabet.indexOf(value[i + 1]);
    const c = value[i + 2] === '=' ? 0 : alphabet.indexOf(value[i + 2]), d = value[i + 3] === '=' ? 0 : alphabet.indexOf(value[i + 3]);
    bytes.push((a << 2) | (b >> 4));
    if (value[i + 2] !== '=') bytes.push(((b & 15) << 4) | (c >> 2));
    if (value[i + 3] !== '=') bytes.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(bytes);
}

/** Stable JSON prevents object insertion order from changing backup bytes. */
export function canonicalJson(value: unknown): string {
  const visit = (input: unknown, seen: Set<object>): string => {
    if (input === null) return 'null';
    if (typeof input === 'string' || typeof input === 'boolean') return JSON.stringify(input);
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) throw new BackupCryptoError('INVALID_INPUT', 'Canonical JSON does not allow non-finite numbers.');
      return JSON.stringify(input);
    }
    if (Array.isArray(input)) return `[${input.map((entry) => visit(entry, seen)).join(',')}]`;
    if (typeof input !== 'object') throw new BackupCryptoError('INVALID_INPUT', 'Canonical JSON only accepts JSON values.');
    if (seen.has(input as object)) throw new BackupCryptoError('INVALID_INPUT', 'Canonical JSON does not allow cycles.');
    seen.add(input as object);
    const result = `{${Object.keys(input as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${visit((input as Record<string, unknown>)[key], seen)}`).join(',')}}`;
    seen.delete(input as object);
    return result;
  };
  return visit(value, new Set<object>());
}

export type SecretFieldPredicate = (fieldName: string, value: unknown) => boolean;
const defaultSecretField: SecretFieldPredicate = (name) => /(?:access[_-]?token|refresh[_-]?token|password|secret|credential|authorization|api[_-]?key)/i.test(name);

/** Integration hook: recursively removes credentials before any backup serialization. */
export function excludeBackupSecrets(value: unknown, isSecret: SecretFieldPredicate = defaultSecretField): unknown {
  if (Array.isArray(value)) return value.map((entry) => excludeBackupSecrets(entry, isSecret));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([name, entry]) => !isSecret(name, entry))
    .map(([name, entry]) => [name, excludeBackupSecrets(entry, isSecret)]));
}

function header(envelope: Omit<BackupEnvelope, 'ciphertext'>): string {
  return canonicalJson(envelope);
}

async function derivedKey(input: BackupKeyInput, salt: Uint8Array, provider: BackupCryptoProvider): Promise<{ key: Uint8Array; kdf: BackupEnvelope['kdf']; iterations?: number }> {
  if ('key' in input) {
    if (input.key.length !== 32) throw new BackupCryptoError('INVALID_INPUT', 'A raw backup key must be exactly 32 bytes.');
    return { key: input.key, kdf: 'raw-aes-256-gcm' };
  }
  if (!input.passphrase || input.passphrase.length > 1024) throw new BackupCryptoError('INVALID_INPUT', 'A non-empty passphrase of at most 1024 characters is required.');
  return { key: await provider.pbkdf2Sha256(utf8(input.passphrase), salt, PBKDF2_ITERATIONS, 32), kdf: 'PBKDF2-SHA-256', iterations: PBKDF2_ITERATIONS };
}

export async function encryptBackup(payload: unknown, keyInput: BackupKeyInput, provider: BackupCryptoProvider = webCryptoProvider(), isSecret: SecretFieldPredicate = defaultSecretField): Promise<BackupEnvelope> {
  const plaintext = utf8(canonicalJson(excludeBackupSecrets(payload, isSecret)));
  assertSize(plaintext, MAX_BACKUP_PLAINTEXT_BYTES, 'Backup plaintext');
  const salt = await provider.randomBytes(SALT_BYTES), nonce = await provider.randomBytes(NONCE_BYTES);
  if (salt.length !== SALT_BYTES || nonce.length !== NONCE_BYTES) throw new BackupCryptoError('INVALID_INPUT', 'Crypto provider returned an invalid salt or nonce.');
  const derived = await derivedKey(keyInput, salt, provider);
  const metadata = { format: 'documenta-backup' as const, version: BACKUP_ENVELOPE_VERSION as typeof BACKUP_ENVELOPE_VERSION, kdf: derived.kdf, ...(derived.iterations ? { iterations: derived.iterations } : {}), salt: base64(salt), nonce: base64(nonce) };
  const ciphertext = await provider.aesGcmEncrypt(derived.key, nonce, plaintext, utf8(header(metadata)));
  const envelope = { ...metadata, ciphertext: base64(ciphertext) };
  assertSize(utf8(canonicalJson(envelope)), MAX_BACKUP_ENVELOPE_BYTES, 'Backup envelope');
  return envelope;
}

export async function decryptBackup(envelope: unknown, keyInput: BackupKeyInput, provider: BackupCryptoProvider = webCryptoProvider()): Promise<unknown> {
  if (!envelope || typeof envelope !== 'object') throw new BackupCryptoError('INVALID_INPUT', 'Backup envelope must be an object.');
  const item = envelope as Partial<BackupEnvelope>;
  if (item.format !== 'documenta-backup' || !Number.isInteger(item.version)) throw new BackupCryptoError('INVALID_INPUT', 'Invalid backup envelope.');
  if (item.version !== BACKUP_ENVELOPE_VERSION) throw new BackupCryptoError('UNSUPPORTED_VERSION', `Backup version ${item.version} is not supported.`);
  if ((item.kdf !== 'PBKDF2-SHA-256' && item.kdf !== 'raw-aes-256-gcm') || typeof item.salt !== 'string' || typeof item.nonce !== 'string' || typeof item.ciphertext !== 'string') throw new BackupCryptoError('INVALID_INPUT', 'Invalid backup envelope fields.');
  if ((item.kdf === 'PBKDF2-SHA-256' && item.iterations !== PBKDF2_ITERATIONS) || (item.kdf === 'raw-aes-256-gcm' && item.iterations !== undefined)) throw new BackupCryptoError('INVALID_INPUT', 'Unsupported backup key derivation settings.');
  if (('passphrase' in keyInput) !== (item.kdf === 'PBKDF2-SHA-256')) throw new BackupCryptoError('INVALID_INPUT', 'Backup key type does not match this envelope.');
  const salt = fromBase64(item.salt), nonce = fromBase64(item.nonce), ciphertext = fromBase64(item.ciphertext);
  if (salt.length !== SALT_BYTES || nonce.length !== NONCE_BYTES) throw new BackupCryptoError('INVALID_INPUT', 'Invalid backup salt or nonce.');
  assertSize(ciphertext, MAX_BACKUP_ENVELOPE_BYTES, 'Backup ciphertext');
  const derived = await derivedKey(keyInput, salt, provider);
  const metadata = { format: item.format, version: item.version, kdf: item.kdf, ...(item.iterations ? { iterations: item.iterations } : {}), salt: item.salt, nonce: item.nonce };
  const decoded = await provider.aesGcmDecrypt(derived.key, nonce, ciphertext, utf8(header(metadata)));
  assertSize(decoded, MAX_BACKUP_PLAINTEXT_BYTES, 'Backup plaintext');
  try { return JSON.parse(new TextDecoder().decode(decoded)); } catch { throw new BackupCryptoError('AUTH_FAILED', 'Backup plaintext is not valid JSON.'); }
}

export async function sha256Hex(data: Uint8Array, provider: BackupCryptoProvider = webCryptoProvider()): Promise<string> {
  assertSize(data, MAX_HASH_INPUT_BYTES, 'Hash input');
  return Array.from(await provider.sha256(data)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Hash chunks independently; callers can upload/hash files without loading their contents as one buffer. */
export async function hashChunks(chunks: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, provider: BackupCryptoProvider = webCryptoProvider()): Promise<{ byteLength: number; chunkHashes: string[]; rootHash: string }> {
  let byteLength = 0;
  const digests: Uint8Array[] = [];
  for await (const chunk of chunks) {
    if (!(chunk instanceof Uint8Array)) throw new BackupCryptoError('INVALID_INPUT', 'Hash chunks must be Uint8Array values.');
    byteLength += chunk.length;
    if (byteLength > MAX_HASH_INPUT_BYTES) throw new BackupCryptoError('SIZE_LIMIT', 'Hash input exceeds the allowed limit.');
    digests.push(await provider.sha256(chunk));
  }
  const joined = new Uint8Array(digests.reduce((sum, digest) => sum + digest.length, 0));
  let offset = 0; digests.forEach((digest) => { joined.set(digest, offset); offset += digest.length; });
  const root = await provider.sha256(joined);
  const toHex = (bytes: Uint8Array) => Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { byteLength, chunkHashes: digests.map(toHex), rootHash: toHex(root) };
}