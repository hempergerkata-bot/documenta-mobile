import {
  aggregateOcrPageStatus,
  createOcrPageResult,
  formatOcrPageText,
} from './ocrPageAggregation';

let assertions = 0;
function assert(value: unknown, name: string) {
  assertions++;
  if (!value) throw new Error(name);
}

{
  const complete = [createOcrPageResult(0, 'Lesbarer Text', ['complete'])];
  const partial = [
    createOcrPageResult(0, 'Lesbarer Text', ['complete']),
    createOcrPageResult(1, '', ['failed']),
  ];
  const empty = [
    createOcrPageResult(0, '', ['empty']),
    createOcrPageResult(1, '', ['empty']),
  ];
  const failed = [
    createOcrPageResult(0, '', ['failed']),
    createOcrPageResult(1, '', ['empty']),
  ];

  assert(aggregateOcrPageStatus(complete) === 'complete', 'complete aggregate');
  assert(aggregateOcrPageStatus(partial) === 'partial', 'partial aggregate');
  assert(aggregateOcrPageStatus(empty) === 'empty', 'empty aggregate');
  assert(aggregateOcrPageStatus(failed) === 'failed', 'failed aggregate');
}

{
  const pages = [
    createOcrPageResult(0, 'Erste Seite', ['complete']),
    createOcrPageResult(1, '', ['failed']),
    createOcrPageResult(2, '', ['empty']),
    createOcrPageResult(3, 'Vierte Seite', ['complete']),
  ];

  assert(
    JSON.stringify(pages.map((page) => [page.pageIndex, page.status])) ===
      JSON.stringify([[0, 'complete'], [1, 'failed'], [2, 'empty'], [3, 'complete']]),
    'page result positions',
  );
  assert(
    formatOcrPageText(pages) ===
      '--- Seite 1 ---\nErste Seite\n\n--- Seite 2 ---\n\n\n--- Seite 3 ---\n\n\n--- Seite 4 ---\nVierte Seite',
    'page markers for empty and failed pages',
  );
}

console.log(`ocr page aggregation tests passed (${assertions} assertions)`);