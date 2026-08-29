import { createExportPagePlan, tocTitleForStandardFont } from './exportPdfPackageCore';

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const planned = createExportPagePlan([2, 5, 1], true);
equal(planned, { tocPages: 1, documentStartPages: [2, 4, 9] });
equal(createExportPagePlan([1, 1], false), { tocPages: 0, documentStartPages: [1, 2] });
const multiPageToc = createExportPagePlan(Array.from({ length: 39 }, () => 2), true);
equal(multiPageToc.tocPages, 2);
equal([multiPageToc.documentStartPages[0], multiPageToc.documentStartPages[38]], [3, 79]);
equal(tocTitleForStandardFont('Szerződés', 0, 'Dokumentum', (value) => /^[\x00-\x7f]*$/.test(value)), 'Dokumentum 1');
equal(tocTitleForStandardFont('عقد', 1, 'وثيقة', (value) => /^[\x00-\x7f]*$/.test(value)), 'Document 2');
equal(tocTitleForStandardFont('Invoice', 2, 'Document', () => true), 'Invoice');
console.log('export PDF package tests passed');