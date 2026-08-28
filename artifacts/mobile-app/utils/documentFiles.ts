import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { PendingAsset } from '@/context/AppContext';

const extensionByMimeType: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
};

function getExtension(asset: PendingAsset) {
  const fromName = asset.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return extensionByMimeType[asset.mimeType ?? ''] ?? (asset.source === 'file' ? 'pdf' : 'jpg');
}

export function persistDocumentAsset(asset: PendingAsset, documentId: string) {
  if (Platform.OS === 'web') {
    return asset.uri;
  }

  const documentDirectory = new Directory(Paths.document, 'documenta');
  documentDirectory.create({ intermediates: true, idempotent: true });

  const source = new File(asset.uri);
  if (!source.exists) {
    throw new Error('Die ausgewählte Datei ist nicht mehr verfügbar.');
  }

  const destination = new File(
    documentDirectory,
    `${documentId}.${getExtension(asset)}`,
  );
  if (destination.exists) destination.delete();
  source.copy(destination);

  if (!destination.exists) {
    throw new Error('Die Datei konnte nicht dauerhaft gespeichert werden.');
  }

  return destination.uri;
}
