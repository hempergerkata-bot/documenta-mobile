import { BackupCryptoError, type BackupCryptoProvider } from './backupCrypto';
import { createBackup, prepareRestore, BackupServiceError, type BackupServiceIO } from './backupService';
import type { CloudObject, CloudObjectMetadata, CloudProviderAdapter } from './backupDomain';

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function equal(actual: unknown, expected: unknown, message: string): void { assert(actual === expected, `${message}: expected ${String(expected)}, received ${String(actual)}`); }
async function expectError(work: () => Promise<unknown>, code: string): Promise<void> {
  try { await work(); } catch (error) {
    assert((error instanceof BackupServiceError || error instanceof BackupCryptoError) && error.code === code, `Expected ${code}, received ${String((error as { code?: string }).code)}`);
    return;
  }
  throw new Error(`Expected ${code} failure`);
}

const bytes = (value: string) => new TextEncoder().encode(value);
const text = (value: Uint8Array) => new TextDecoder().decode(value);
/* A deterministic authenticated test provider: deliberately injected, never native crypto. */
const crypto: BackupCryptoProvider = {
  async randomBytes(length) { return new Uint8Array(Array.from({ length }, (_, i) => (i * 29 + length) & 255)); },
  async sha256(input) {
    let h = 2166136261; for (const value of input) h = Math.imul(h ^ value, 16777619);
    return new Uint8Array(Array.from({ length: 32 }, (_, i) => (h >>> ((i % 4) * 8)) ^ i));
  },
  async pbkdf2Sha256(passphrase, salt) { return this.sha256(new Uint8Array([...passphrase, ...salt])); },
  async aesGcmEncrypt(key, nonce, plain, aad) {
    const tag = await this.sha256(new Uint8Array([...key, ...nonce, ...aad, ...plain]));
    return new Uint8Array([...plain.map((v, i) => v ^ key[i % key.length] ^ nonce[i % nonce.length]), ...tag.slice(0, 8)]);
  },
  async aesGcmDecrypt(key, nonce, sealed, aad) {
    const cipher = sealed.slice(0, -8), plain = new Uint8Array(cipher.map((v, i) => v ^ key[i % key.length] ^ nonce[i % nonce.length]));
    const tag = await this.sha256(new Uint8Array([...key, ...nonce, ...aad, ...plain]));
    if (sealed.length < 8 || !tag.slice(0, 8).every((v, i) => v === sealed[sealed.length - 8 + i])) throw new BackupCryptoError('AUTH_FAILED', 'test authentication failure');
    return plain;
  },
};

class MemoryAdapter implements CloudProviderAdapter {
  readonly providerType = 'google_drive' as const;
  readonly capabilities = { connect: true, incrementalUpload: true, remoteRestore: true, deleteRemoteSnapshots: true, localExport: false } as const;
  readonly objects = new Map<string, CloudObject>();
  readonly uploads: CloudObject[] = [];
  failUpload = false;
  async connect() { return { id: 'owner', providerType: 'google_drive' as const, displayName: 'Owner', status: 'connected' as const, grantedScopes: [], createdAt: '', updatedAt: '' }; }
  async disconnect() { /* no-op */ }
  async list(_account: string, prefix: string): Promise<readonly CloudObjectMetadata[]> {
    return [...this.objects.values()].filter(item => item.key.startsWith(prefix)).map(item => ({ key: item.key, byteSize: item.bytes.length, contentHash: item.contentHash }));
  }
  async upload(_account: string, object: CloudObject): Promise<CloudObjectMetadata> {
    if (this.failUpload) throw new Error('interrupted transport');
    this.uploads.push(object); this.objects.set(object.key, { ...object, bytes: object.bytes.slice() });
    return { key: object.key, byteSize: object.bytes.length, contentHash: object.contentHash };
  }
  async download(_account: string, key: string): Promise<CloudObject> {
    const object = this.objects.get(key); if (!object) throw new Error(`missing ${key}`); return { ...object, bytes: object.bytes.slice() };
  }
}

const key = { passphrase: 'correct' };
const seedManifest = { schemaVersion: 1 as const, id: 'seed', accountId: 'owner', createdAt: '2026-01-01T00:00:00.000Z', appVersion: '1', files: [], state: {}, stateHash: 'seed', completedAt: '2026-01-01T00:00:00.000Z' };
const state = {
  title: 'Top secret receipt title', accessToken: 'never transport this', notificationToken: 'native-token',
  documents: [{ id: 'a', title: 'remote', uri: 'file:///one.pdf', pageUris: ['file:///one.pdf', 'file:///two.jpg'], originalPageUris: ['file:///two.jpg'] }],
};
const assets: Record<string, Uint8Array> = { 'file:///one.pdf': bytes('PDF-one'), 'file:///two.jpg': bytes('JPEG-two') };
const io = (more: Partial<BackupServiceIO> = {}): BackupServiceIO => ({
  readAsset: async uri => assets[uri], now: () => '2026-01-02T03:04:05.000Z', ...more,
});

async function run(): Promise<void> {
  const adapter = new MemoryAdapter();
  const made = await createBackup({ state, accountId: 'owner', key, adapter, crypto, manifestId: 'm1', appVersion: '1', priorManifest: seedManifest }, io());
  const rawManifest = text(made.encryptedManifest);
  assert(!rawManifest.includes('Top secret receipt title') && !rawManifest.includes('never transport this'), 'encrypted manifest exposes plaintext title or secret');
  assert(!JSON.stringify(made.manifest.state).includes('accessToken') && !JSON.stringify(made.manifest.state).includes('notificationToken'), 'backup state did not exclude secrets/device metadata');
  for (const upload of adapter.uploads) {
    const digest = Array.from(await crypto.sha256(upload.bytes)).map(v => v.toString(16).padStart(2, '0')).join('');
    equal(upload.contentHash, digest, 'transport metadata hashes ciphertext bytes');
  }
  const incremental = await createBackup({ state, accountId: 'owner', key, adapter, crypto, manifestId: 'm2', appVersion: '1', priorManifest: made.manifest }, io());
  equal(incremental.uploadedAssetHashes.length, 0, 'prior immutable assets are skipped remotely');
  const rotatedKey = { passphrase: 'rotated-passphrase' };
  const rotated = await createBackup({ state, accountId: 'owner', key: rotatedKey, adapter, crypto, manifestId: 'm3', appVersion: '1', priorManifest: incremental.manifest }, io());
  equal(rotated.uploadedAssetHashes.length, 2, 'passphrase rotation must re-encrypt assets instead of reusing incompatible ciphertext');
  assert(rotated.manifest.files.every(file => !made.manifest.files.some(previousFile => previousFile.storageKey === file.storageKey)), 'rotated asset keys must not overwrite snapshots encrypted with the old passphrase');
  const rotatedRestore = await prepareRestore({
    accountId: 'owner', manifestKey: 'manifests/m3.dcbak', key: rotatedKey, adapter, crypto,
  }, io({ writeAssets: async content => Object.fromEntries(Object.keys(content).map(hash => [hash, `app://${hash}`])) }));
  equal(rotatedRestore.manifest.id, 'm3', 'snapshot created after passphrase rotation must restore with the new passphrase');

  const writes: Record<string, Uint8Array> = {};
  const restored = await prepareRestore({
    accountId: 'owner', manifestKey: 'manifests/m1.dcbak', key, adapter, crypto,
    localState: { documents: [{ id: 'a', title: 'local' }, { id: 'gone-local', title: 'x' }, { id: 'fresh-local', title: 'Keep me' }] },
    baseState: { documents: [{ id: 'a', title: 'base' }, { id: 'gone-local', title: 'x' }, { id: 'remote-only', title: 'base' }] },
  }, io({ writeAssets: async content => { Object.assign(writes, content); return Object.fromEntries(Object.keys(content).map(hash => [hash, `app://${hash}`])); } }));
  const document = (restored.state.documents as Array<Record<string, unknown>>)[0];
  assert(String(document.uri).startsWith('app://') && (document.pageUris as string[]).every(uri => uri.startsWith('app://')), 'URI arrays were not relinked');
  equal((restored.state as Record<string, unknown>).searchIndexVersion, 0, 'restore invalidates search index version');
  equal((restored.state as Record<string, unknown>).searchIndexRevision, 1, 'restore increments search index revision');
  assert((restored.state.documents as Array<{ id: string }>).some(item => item.id === 'fresh-local'), 'restore must materialize use_local documents instead of silently dropping them');
  assert(restored.conflicts.some(c => c.type === 'manual_correction_required') && restored.conflicts.some(c => c.type === 'deleted_remotely'), 'document conflicts are not classified conservatively');
  equal(Object.keys(writes).length, 2, 'restore writes every content-addressed asset');

  await expectError(() => prepareRestore({ accountId: 'owner', manifestKey: 'manifests/m1.dcbak', key: { passphrase: 'wrong' }, adapter, crypto }, io()), 'AUTH_FAILED');
  const tampered = adapter.objects.get('manifests/m1.dcbak')!;
  const tamperedEnvelope = JSON.parse(text(tampered.bytes)) as { ciphertext: string };
  tamperedEnvelope.ciphertext = `${tamperedEnvelope.ciphertext[0] === 'A' ? 'B' : 'A'}${tamperedEnvelope.ciphertext.slice(1)}`;
  adapter.objects.set(tampered.key, { ...tampered, bytes: bytes(JSON.stringify(tamperedEnvelope)) });
  await expectError(() => prepareRestore({ accountId: 'owner', manifestKey: tampered.key, key, adapter, crypto }, io()), 'AUTH_FAILED');
  adapter.objects.set('manifests/m1.dcbak', { ...tampered, bytes: made.encryptedManifest });
  const futureEnvelope = JSON.parse(text(made.encryptedManifest)) as Record<string, unknown>;
  futureEnvelope.version = 99; adapter.objects.set('manifests/future.dcbak', { key: 'manifests/future.dcbak', bytes: bytes(JSON.stringify(futureEnvelope)) });
  await expectError(() => prepareRestore({ accountId: 'owner', manifestKey: 'manifests/future.dcbak', key, adapter, crypto }, io()), 'UNSUPPORTED_VERSION');
  await expectError(() => prepareRestore({ accountId: 'other', manifestKey: 'manifests/m1.dcbak', key, adapter, crypto }, io()), 'ENTITLEMENT');
  await prepareRestore({ accountId: 'other', manifestKey: 'manifests/m1.dcbak', key, adapter, crypto, entitled: true }, io());

  let cancelled = false; const journal: string[] = [];
  await expectError(() => createBackup({ state, accountId: 'owner', key, adapter: new MemoryAdapter(), crypto, manifestId: 'cancel', appVersion: '1', priorManifest: seedManifest }, io({
    readAsset: async uri => { cancelled = true; return assets[uri]; }, isCancelled: () => cancelled, saveJournal: entry => { journal.push(entry.stage); },
  })), 'CANCELLED');
  assert(journal.includes('started') && journal.includes('cancelled'), 'cancellation does not preserve interruption journal');

  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  const slow = createBackup({ state, accountId: 'owner', key, adapter: new MemoryAdapter(), crypto, manifestId: 'slow', appVersion: '1', priorManifest: seedManifest }, io({ readAsset: async uri => { await gate; return assets[uri]; } }));
  await expectError(() => createBackup({ state, accountId: 'owner', key, adapter: new MemoryAdapter(), crypto, manifestId: 'busy', appVersion: '1', priorManifest: seedManifest }, io()), 'BUSY');
  release(); await slow;
  const interrupted: string[] = []; const broken = new MemoryAdapter(); broken.failUpload = true;
  try { await createBackup({ state, accountId: 'owner', key, adapter: broken, crypto, manifestId: 'interrupted', appVersion: '1', priorManifest: seedManifest }, io({ saveJournal: entry => { interrupted.push(entry.stage); } })); } catch { /* expected transport interruption */ }
  equal(interrupted[0], 'started', 'interruption journal must be written before transport');
}
void run();