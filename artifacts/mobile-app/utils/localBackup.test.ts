import {
  LOCAL_BACKUP_FILENAME,
  canAtomicallyCommitImport,
  createEncryptedExport,
  isSafeBackupFilename,
  parseEncryptedExport,
  recoverInterruptedImport,
  relinkBackupFileAssets,
} from './localBackup';
import { webCryptoProvider } from './backupCrypto';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function run(): Promise<void> {
  const provider = webCryptoProvider();
  const exported = await createEncryptedExport(
    { state: { accessToken: 'never exported', notificationToken: 'device only', title: 'safe' } },
    { passphrase: 'correct horse battery staple' },
    provider,
  );
  assert(exported.filename === LOCAL_BACKUP_FILENAME, 'Export name must be neutral');
  const parsed = await parseEncryptedExport<{ state: Record<string, unknown> }>(exported.bytes, { passphrase: 'correct horse battery staple' }, provider);
  assert(parsed.ok && parsed.payload.state.title === 'safe' && !('accessToken' in parsed.payload.state) && !('notificationToken' in parsed.payload.state), 'Export must remove sensitive state');
  const wrongKey = await parseEncryptedExport(exported.bytes, { passphrase: 'wrong key' }, provider);
  if (!('code' in wrongKey) || wrongKey.code !== 'AUTH_FAILED') throw new Error('Wrong key must be a typed failure');
  assert(isSafeBackupFilename('backup.dcbak') && !isSafeBackupFilename('../backup.dcbak'), 'Filename traversal check failed');
  const linked = relinkBackupFileAssets({ files: [{ id: 'a', contentHash: 'abc123', storageKey: '../../bad', sourcePath: '../../bad', byteSize: 1, createdAt: 'x' }] }, { abc123: 'file:///safe/a.pdf' });
  assert(linked[0].localUri === 'file:///safe/a.pdf' && !('sourcePath' in linked[0]), 'Assets must relink only by hash');
  const transaction = { id: 'x', phase: 'ready_to_commit' as const, manifestValidated: true, expectedContentHashes: ['abc'], stagedContentHashes: ['abc'] };
  assert(canAtomicallyCommitImport(transaction) && recoverInterruptedImport(transaction).action === 'resume_commit', 'Ready transaction should resume atomically');
}

void run();