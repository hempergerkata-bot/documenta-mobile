export const TOC_ROWS_PER_PAGE = 38;

export type ExportPagePlan = {
  tocPages: number;
  documentStartPages: number[];
};

/** Calculates one-based PDF page numbers after all source PDFs have been parsed. */
export function createExportPagePlan(pageCounts: readonly number[], includeToc: boolean): ExportPagePlan {
  const tocPages = includeToc ? Math.ceil(pageCounts.length / TOC_ROWS_PER_PAGE) : 0;
  let nextPage = tocPages + 1;
  const documentStartPages = pageCounts.map((count) => {
    const startPage = nextPage;
    nextPage += count;
    return startPage;
  });
  return { tocPages, documentStartPages };
}

/** Standard PDF fonts cannot represent all Unicode. Never alter a real title. */
export function tocTitleForStandardFont(
  title: string,
  index: number,
  documentLabel: string,
  canEncode: (value: string) => boolean,
): string {
  if (canEncode(title)) return title;
  const numberedLabel = `${documentLabel} ${index + 1}`;
  return canEncode(numberedLabel) ? numberedLabel : `Document ${index + 1}`;
}

export function standardFontLabel(label: string, asciiFallback: string, canEncode: (value: string) => boolean): string {
  return canEncode(label) ? label : asciiFallback;
}