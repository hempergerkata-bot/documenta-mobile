import { createElement } from 'react';

export function DocumentPdfPreview({ uri }: { uri: string }) {
  return createElement('iframe', {
    src: uri,
    title: 'PDF-Dokument',
    'data-testid': 'document-pdf-preview',
    style: {
      width: '100%',
      height: '100%',
      border: 0,
      backgroundColor: '#ffffff',
    },
  });
}