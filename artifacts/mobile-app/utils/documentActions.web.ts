export async function shareDocumentPdf(uri?: string) {
  if (!uri) throw new Error('Für dieses Dokument ist keine PDF-Datei verfügbar.');
  if (navigator.share) {
    await navigator.share({ title: 'Documenta PDF', url: uri });
    return;
  }
  window.open(uri, '_blank', 'noopener,noreferrer');
}

export async function exportDocumentPdf(uri?: string) {
  if (!uri) throw new Error('Für dieses Dokument ist keine PDF-Datei verfügbar.');
  const link = document.createElement('a');
  link.href = uri;
  link.download = 'documenta.pdf';
  link.click();
}

export async function printDocumentPdf(uri?: string) {
  if (!uri) throw new Error('Für dieses Dokument ist keine PDF-Datei verfügbar.');
  const printWindow = window.open(uri, '_blank', 'noopener,noreferrer');
  printWindow?.addEventListener('load', () => printWindow.print());
}