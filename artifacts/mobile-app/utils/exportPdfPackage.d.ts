export type ExportPdfInput = {
  uri: string;
  title: string;
};

export type ExportPdfPackageOptions = {
  documents: ExportPdfInput[];
  includeToc: boolean;
  filename?: string;
  labels: {
    tocTitle: string;
    tocContinuationTitle: string;
    documentLabel: string;
    shareDialogTitle: string;
  };
};

export type ExportPdfPackageResult = {
  filename: string;
  uri?: string;
};

export type ExportPdfPackageErrorCode =
  | 'NO_DOCUMENTS'
  | 'SHARING_UNAVAILABLE'
  | 'SOURCE_UNAVAILABLE'
  | 'SOURCE_INVALID'
  | 'SOURCE_FETCH_FAILED'
  | 'FILE_WRITE_FAILED'
  | 'EXPORT_FAILED';

export function exportPdfPackage(options: ExportPdfPackageOptions): Promise<ExportPdfPackageResult>;