import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { createEncryptedExport, LOCAL_BACKUP_FILENAME, LOCAL_BACKUP_MIME_TYPE, parseEncryptedExport } from './localBackup';
import { inventoryDocumentAssetUris } from './backupService';
import { sha256Hex, type BackupCryptoProvider, type BackupKeyInput } from './backupCrypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const toBase64 = (bytes: Uint8Array) => {
  let value = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const word = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    value += alphabet[(word >>> 18) & 63] + alphabet[(word >>> 12) & 63] + (i + 1 < bytes.length ? alphabet[(word >>> 6) & 63] : '=') + (i + 2 < bytes.length ? alphabet[word & 63] : '=');
  }
  return value;
};
const fromBase64 = (value: string) => {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Invalid local backup asset encoding.');
  const output: number[] = [];
  for (let i = 0; i < value.length; i += 4) {
    const a = alphabet.indexOf(value[i]), b = alphabet.indexOf(value[i + 1]), c = value[i + 2] === '=' ? 0 : alphabet.indexOf(value[i + 2]), d = value[i + 3] === '=' ? 0 : alphabet.indexOf(value[i + 3]);
    output.push((a << 2) | (b >> 4)); if (value[i + 2] !== '=') output.push(((b & 15) << 4) | (c >> 2)); if (value[i + 3] !== '=') output.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(output);
};

export type LocalBackupBundle<T> = Readonly<{
  kind: 'documenta-local-bundle-v1';
  state: T;
  assets: Readonly<Record<string, string>>;
  assetReferences: Readonly<Record<string, string>>;
}>;

/** Strictly bounded, encrypted portable bundle; asset names are hashes, never archive paths. */
export async function createLocalBackupBundle<T extends Record<string, unknown>>(state: T, key: BackupKeyInput, crypto: BackupCryptoProvider): Promise<Uint8Array> {
  const assets: Record<string, string> = {};
  const assetReferences: Record<string, string> = {};
  let total = 0;
  for (const uri of inventoryDocumentAssetUris(state)) {
    const bytes = await new File(uri).bytes();
    total += bytes.length;
    if (total > 20 * 1024 * 1024) throw new Error('Local backup assets exceed the 20 MB portable export limit.');
    const hash = await sha256Hex(bytes, crypto);
    assets[hash] = toBase64(bytes);
    assetReferences[uri] = hash;
  }
  return (await createEncryptedExport({ kind: 'documenta-local-bundle-v1', state, assets, assetReferences }, key, crypto)).bytes;
}

export async function chooseLocalBackup(): Promise<Uint8Array | undefined> {
  const selected = await DocumentPicker.getDocumentAsync({ type: LOCAL_BACKUP_MIME_TYPE, copyToCacheDirectory: true, multiple: false });
  if (selected.canceled || !selected.assets[0]) return undefined;
  return new File(selected.assets[0].uri).bytes();
}

export async function shareLocalBackup(bytes: Uint8Array): Promise<void> {
  const folder = new Directory(Paths.cache, 'documenta-backup-export');
  folder.create({ intermediates: true, idempotent: true });
  const destination = new File(folder, LOCAL_BACKUP_FILENAME);
  if (destination.exists) destination.delete();
  destination.write(bytes);
  if (!destination.exists || destination.size !== bytes.length) throw new Error('Local backup export could not be verified.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing local backups is unavailable on this device.');
  await Sharing.shareAsync(destination.uri, { mimeType: LOCAL_BACKUP_MIME_TYPE, dialogTitle: LOCAL_BACKUP_FILENAME });
}

export async function parseLocalBackupBundle<T extends Record<string, unknown>>(bytes: Uint8Array, key: BackupKeyInput, crypto: BackupCryptoProvider): Promise<LocalBackupBundle<T>> {
  const parsed = await parseEncryptedExport<LocalBackupBundle<T>>(bytes, key, crypto);
  if (!parsed.ok) throw new Error(parsed.message);
  const bundle = parsed.payload;
  if (!bundle || bundle.kind !== 'documenta-local-bundle-v1' || !bundle.state || typeof bundle.state !== 'object' || !bundle.assets || typeof bundle.assets !== 'object' || !bundle.assetReferences || typeof bundle.assetReferences !== 'object') throw new Error('This is not a Documenta local backup bundle.');
  return bundle;
}

export function relinkLocalBundleState<T>(value: T, references: Readonly<Record<string, string>>, urisByHash: Readonly<Record<string, string>>): T {
  if (typeof value === 'string') {
    const hash = references[value];
    return (hash && urisByHash[hash] ? urisByHash[hash] : value) as T;
  }
  if (Array.isArray(value)) return value.map(item => relinkLocalBundleState(item, references, urisByHash)) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [
    key,
    relinkLocalBundleState(child, references, urisByHash),
  ])) as T;
}

/** Stages verified content-addressed assets privately; no archive filename is used. */
export async function stageBackupAssets(encoded: Readonly<Record<string, string>>, crypto: BackupCryptoProvider): Promise<Readonly<Record<string, string>>> {
  return stageBackupAssetBytes(Object.fromEntries(Object.entries(encoded).map(([hash, value]) => [hash, fromBase64(value)])), crypto);
}

export async function stageBackupAssetBytes(assetBytes: Readonly<Record<string, Uint8Array>>, crypto: BackupCryptoProvider): Promise<Readonly<Record<string, string>>> {
  const directory = new Directory(Paths.document, 'documenta', 'backup-assets');
  directory.create({ intermediates: true, idempotent: true });
  const result: Record<string, string> = {};
  for (const [hash, bytes] of Object.entries(assetBytes)) {
    if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error('Local backup has an unsafe asset hash.');
    if ((await sha256Hex(bytes, crypto)).toLowerCase() !== hash.toLowerCase()) throw new Error('Local backup asset integrity validation failed.');
    const finalFile = new File(directory, `${hash.toLowerCase()}.bin`);
    const temporary = new File(directory, `${hash.toLowerCase()}.tmp`);
    if (temporary.exists) temporary.delete();
    temporary.write(bytes);
    if (!temporary.exists || temporary.size !== bytes.length) throw new Error('Could not stage local backup asset.');
    if (finalFile.exists) finalFile.delete();
    temporary.move(finalFile);
    if (!finalFile.exists || finalFile.size !== bytes.length) throw new Error('Could not commit staged local backup asset.');
    result[hash.toLowerCase()] = finalFile.uri;
  }
  return result;
}