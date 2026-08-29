import { BackupCryptoError, canonicalJson, decryptBackup, encryptBackup, excludeBackupSecrets, webCryptoProvider } from './backupCrypto';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectCode(work: () => Promise<unknown>, code: string): Promise<void> {
  try { await work(); } catch (error) { assert(error instanceof BackupCryptoError && error.code === code, `Expected ${code}`); return; }
  throw new Error(`Expected ${code} failure`);
}

async function run(): Promise<void> {
  const provider = webCryptoProvider();
  const first = await encryptBackup({ z: 1, a: { title: 'receipt' } }, { passphrase: 'correct horse battery staple' }, provider);
  const second = await encryptBackup({ z: 1, a: { title: 'receipt' } }, { passphrase: 'correct horse battery staple' }, provider);
  assert(first.salt !== second.salt && first.nonce !== second.nonce, 'Every backup needs a distinct salt and nonce');
  assert(canonicalJson(await decryptBackup(first, { passphrase: 'correct horse battery staple' }, provider)) === '{"a":{"title":"receipt"},"z":1}', 'Round trip failed');
  await expectCode(() => decryptBackup(first, { passphrase: 'wrong' }, provider), 'AUTH_FAILED');
  await expectCode(() => decryptBackup({ ...first, ciphertext: `${first.ciphertext.slice(0, -2)}AA` }, { passphrase: 'correct horse battery staple' }, provider), 'AUTH_FAILED');
  await expectCode(() => decryptBackup({ ...first, version: 99 }, { passphrase: 'correct horse battery staple' }, provider), 'UNSUPPORTED_VERSION');
  const clean = excludeBackupSecrets({ title: 'safe', accessToken: 'must-not-back-up', nested: { refresh_token: 'no', value: 1 } });
  assert(canonicalJson(clean) === '{"nested":{"value":1},"title":"safe"}', 'Secret exclusion hook is not deterministic');
  const secured = await encryptBackup({ accessToken: 'must-not-appear', title: 'safe' }, { passphrase: 'correct horse battery staple' }, provider);
  assert(!JSON.stringify(secured).includes('must-not-appear'), 'Envelope leaked plaintext secret');
}

void run();