import type { BackupManifest, CloudObject } from './backupDomain';
declare const require: (name: string) => any;

/* Load the adapter behind a tiny credential boundary so this Node-only core test
   never initializes the React Native secure-store implementation. */
const moduleLoader = require('module');
const originalLoad = moduleLoader._load;
moduleLoader._load = (request: string, parent: unknown, isMain: boolean) => request === './secureCredentials'
  ? { loadProviderCredential: async () => undefined, removeProviderCredential: async () => {} }
  : originalLoad(request, parent, isMain);
const drive = require('./googleDriveAdapter') as typeof import('./googleDriveAdapter');
moduleLoader._load = originalLoad;
const { GOOGLE_DRIVE_APPDATA_SCOPE, GoogleDriveAdapterError, GoogleDriveBackupAdapter, publishGoogleDriveSnapshot } = drive;

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function expectCode(work: () => Promise<unknown>, code: string): Promise<void> {
  try { await work(); } catch (error) { assert(error instanceof GoogleDriveAdapterError && error.code === code, `Expected ${code}`); return; } throw new Error(`Expected ${code}`);
}
const credential = { accessToken: 'token', scope: GOOGLE_DRIVE_APPDATA_SCOPE, expiresAt: 2_000_000 };
const response = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const options = (fetcher: typeof fetch, extra: Record<string, unknown> = {}) => ({
  clientId: 'client', redirectUri: 'app://return', fetch: fetcher, now: () => 1, sleep: async () => {}, loadCredential: async () => credential,
  hash: async (data: Uint8Array) => `h${data.length}`, ...extra,
});
const manifest: BackupManifest = { schemaVersion: 1, id: 'm', createdAt: '2026-01-01', completedAt: '2026-01-01', stateHash: 'state', files: [], state: {} };
const envelope = new TextEncoder().encode(JSON.stringify({ format: 'documenta-backup', version: 1, kdf: 'raw-aes-256-gcm', salt: 'AAAAAAAAAAAAAAAAAAAAAA==', nonce: 'AAAAAAAAAAAAAAAA', ciphertext: 'AA==' }));

async function run(): Promise<void> {
  const urls: string[] = [];
  let injectedHashCalls = 0;
  const adapter = new GoogleDriveBackupAdapter(options(
    async url => { urls.push(String(url)); return response(200, { files: [{ id: 'folder', name: 'data' }] }); },
    { hash: async (data: Uint8Array) => { injectedHashCalls += 1; return `native-h${data.length}`; } },
  ));
  const adapterInternals = adapter as unknown as { contentHash: (data: Uint8Array) => Promise<string> };
  assert(await adapterInternals.contentHash(new Uint8Array([1, 2])) === 'native-h2' && injectedHashCalls === 1, 'Drive integrity must use the injected platform hash instead of global WebCrypto');
  const status = await adapter.connectionStatus({ id: 'a', providerType: 'google_drive', displayName: 'A', status: 'connected', grantedScopes: [], createdAt: '', updatedAt: '' });
  assert(status.ok && status.account.grantedScopes.length === 1 && status.account.grantedScopes[0] === GOOGLE_DRIVE_APPDATA_SCOPE, 'connection must expose appData-only scope');
  await adapter.list('a', 'files/');
  assert(urls.every(url => url.includes('spaces=appDataFolder') || url.includes('upload/drive')), 'Drive requests escaped appDataFolder');
  const wrong = new GoogleDriveBackupAdapter(options(async () => response(200), { accountIdForCredential: () => 'other' }));
  await expectCode(() => wrong.list('a', 'x'), 'wrong_account');
  let calls = 0; const quota = new GoogleDriveBackupAdapter(options(async () => { calls += 1; return response(429); }, { maxAttempts: 2 }));
  await expectCode(() => quota.list('a', 'x'), 'quota'); assert(calls === 2, 'quota failures must retry deterministically');
  const auth = new GoogleDriveBackupAdapter(options(async () => response(401)));
  await expectCode(() => auth.list('a', 'x'), 'auth');

  const published: CloudObject[] = [];
  const atomic = new GoogleDriveBackupAdapter(options(async () => response(200)));
  const fake = atomic as unknown as { upload: (account: string, item: CloudObject) => Promise<{ key: string; byteSize: number; contentHash?: string }>; download: (account: string, key: string) => Promise<CloudObject>; contentHash: (data: Uint8Array) => Promise<string> };
  fake.contentHash = async data => `h${data.length}`;
  fake.upload = async (_account, item) => { published.push(item); return { key: item.key, byteSize: item.bytes.length, contentHash: item.contentHash }; };
  fake.download = async (_account, key) => ({ key, bytes: envelope, contentHash: `h${envelope.length}` });
  await publishGoogleDriveSnapshot(atomic, 'a', manifest, { bytes: envelope }, [{ key: 'files/a/a.bin', bytes: new Uint8Array([1]), contentHash: 'h1' }]);
  assert(published[published.length - 1].key === 'current.json' && published.some(item => item.key === 'manifests/m.dcbak'), 'pointer must publish last after encrypted manifest');
  assert(!new TextDecoder().decode(published.find(item => item.key === 'current.json')!.bytes).includes('state'), 'pointer leaks manifest data');
  published.length = 0; fake.download = async (_account, key) => ({ key, bytes: new Uint8Array([9]), contentHash: 'bad' });
  await expectCode(() => publishGoogleDriveSnapshot(atomic, 'a', manifest, { bytes: envelope }, []), 'integrity');
  assert(!published.some(item => item.key === 'current.json'), 'failed manifest verification must not publish pointer');
}
void run();