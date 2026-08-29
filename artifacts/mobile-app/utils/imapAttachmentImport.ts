import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { PendingAsset } from '@/context/AppContext';

const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'attachment';
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export function decodedBase64Size(value: string): number | undefined {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return undefined;
  return (value.length / 4) * 3 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0);
}

function decodeBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function hex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function attachmentToPendingAsset(input: { filename: string; mimeType: string; base64: string; sha256?: string }): Promise<PendingAsset> {
  const decodedSize = decodedBase64Size(input.base64);
  if (!input.base64 || decodedSize === undefined || decodedSize > MAX_ATTACHMENT_BYTES || (input.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(input.sha256))) throw new Error('invalid_attachment');
  const extensionAllowed = input.mimeType === 'application/pdf' || input.mimeType.startsWith('image/');
  if (!extensionAllowed) throw new Error('unsupported_attachment');
  const bytes = decodeBase64(input.base64);
  if (bytes.byteLength !== decodedSize) throw new Error('invalid_attachment');
  const digestInput = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  if (input.sha256 && hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, digestInput)).toLowerCase() !== input.sha256.toLowerCase()) throw new Error('attachment_hash_mismatch');
  if (Platform.OS === 'web') {
    return { uri: `data:${input.mimeType};base64,${input.base64}`, name: safeName(input.filename), mimeType: input.mimeType, source: 'file' };
  }
  const directory = new Directory(Paths.cache, 'documenta-email-imports');
  directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, `${input.sha256?.slice(0, 16) ?? 'selected'}-${safeName(input.filename)}`);
  try {
    await FileSystemLegacy.writeAsStringAsync(file.uri, input.base64, { encoding: FileSystemLegacy.EncodingType.Base64 });
    const info = await FileSystemLegacy.getInfoAsync(file.uri);
    if (!file.exists || !info.exists || info.size !== decodedSize) throw new Error('attachment_write_failed');
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
  return { uri: file.uri, name: safeName(input.filename), mimeType: input.mimeType, source: 'file' };
}