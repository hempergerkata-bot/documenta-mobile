import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { DocumentRecord, PendingAsset } from '@/context/AppContext';

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

export type CanonicalDocumentAssets = Pick<
  DocumentRecord,
  'uri' | 'pdfUri' | 'pageUris' | 'originalPageUris' | 'cleanPageUris' | 'blackWhitePageUris'
>;

export type DocumentAssetState = 'not_present' | 'available' | 'missing';

function extensionForUri(uri: string, fallback: string) {
  const clean = uri.split(/[?#]/)[0];
  const extension = clean.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : fallback;
}

function persistentCopy(uri: string, directory: Directory, filename: string) {
  const source = new File(uri);
  if (!source.exists) {
    throw new Error('Die ausgewählte Datei ist nicht mehr verfügbar.');
  }
  const destination = new File(directory, filename);
  if (source.uri === destination.uri) return destination.uri;
  if (destination.exists) destination.delete();
  source.copy(destination);
  if (!destination.exists) {
    throw new Error('Die Datei konnte nicht dauerhaft gespeichert werden.');
  }
  return destination.uri;
}

export function persistDocumentAssets(asset: PendingAsset, documentId: string): CanonicalDocumentAssets {
  if (Platform.OS === 'web') {
    return {
      uri: asset.uri,
      pdfUri: asset.pdfUri,
      pageUris: asset.pageUris,
      originalPageUris: asset.originalPageUris,
      cleanPageUris: asset.cleanPageUris,
      blackWhitePageUris: asset.blackWhitePageUris,
    };
  }

  const documentDirectory = new Directory(Paths.document, 'documenta', documentId);
  documentDirectory.create({ intermediates: true, idempotent: true });
  const copyList = (uris: string[] | undefined, role: string, fallback = 'jpg') =>
    uris?.map((uri, index) =>
      persistentCopy(uri, documentDirectory, `${role}-${index + 1}.${extensionForUri(uri, fallback)}`),
    );
  const primary = persistentCopy(asset.uri, documentDirectory, `source.${getExtension(asset)}`);
  const pdfUri = asset.pdfUri
    ? persistentCopy(asset.pdfUri, documentDirectory, 'document.pdf')
    : asset.mimeType?.toLowerCase().includes('pdf')
      ? primary
      : undefined;
  return {
    uri: pdfUri ?? primary,
    pdfUri,
    pageUris: copyList(asset.pageUris, 'page'),
    originalPageUris: copyList(asset.originalPageUris, 'original'),
    cleanPageUris: copyList(asset.cleanPageUris, 'clean'),
    blackWhitePageUris: copyList(asset.blackWhitePageUris, 'black-white'),
  };
}

export function canonicalPdfUri(document: Pick<DocumentRecord, 'uri' | 'pdfUri' | 'mimeType'>) {
  if (document.pdfUri) return document.pdfUri;
  if (document.mimeType?.toLowerCase().includes('pdf') || document.uri?.split(/[?#]/)[0].toLowerCase().endsWith('.pdf')) {
    return document.uri;
  }
  return undefined;
}

/**
 * Checks persisted app-owned assets without rebuilding intelligence or silently
 * replacing a missing source. A document can intentionally be metadata-only
 * (for example a legacy sample), so absence is different from a broken asset.
 */
export async function validateDocumentAssets(
  document: Pick<DocumentRecord, 'uri' | 'pdfUri' | 'pageUris' | 'originalPageUris' | 'cleanPageUris' | 'blackWhitePageUris'>,
): Promise<DocumentAssetState> {
  const uris = [
    document.uri,
    document.pdfUri,
    ...(document.pageUris ?? []),
    ...(document.originalPageUris ?? []),
    ...(document.cleanPageUris ?? []),
    ...(document.blackWhitePageUris ?? []),
  ].filter((uri): uri is string => Boolean(uri));
  if (!uris.length) return 'not_present';
  if (Platform.OS === 'web') return 'available';
  return uris.every((uri) => {
    try {
      return new File(uri).exists;
    } catch {
      return false;
    }
  }) ? 'available' : 'missing';
}

export function persistDocumentAsset(asset: PendingAsset, documentId: string) {
  return persistDocumentAssets(asset, documentId).uri;
}
