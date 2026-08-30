import { analyzeDocumentIntelligence } from './documentIntelligence';
import { cloudReviewSuggestions, mergeCloudEvidence, mergeCloudOcrChunks, mergeCloudReviewValues, normalizeCloudFields, parseCloudOcrResponse, planCloudOcrChunks, runScanCloudPipeline } from './documentaCloudMapping';

declare function require(name: string): any;
const test: (name: string, body: () => void | Promise<void>) => void = require('node:test');
const assert = require('node:assert/strict');

test('cloud mapping accepts only validated exact OCR spans and keeps sensitive claims review-only', () => {
  const local = analyzeDocumentIntelligence({ text: 'A simple letter' });
  const accepted = mergeCloudEvidence(local, {
    family: 'correspondence', type: 'letter', confidence: .9,
    fields: { subtype: { value: 'letter', confidence: .9, validationState: 'VALIDATED', evidence: [{ text: 'letter', start: 9, end: 15 }] } },
  }, 'A simple letter');
  assert.equal(accepted.taxonomy.subtype.value, 'letter');
  const rejected = mergeCloudEvidence(local, {
    family: 'legal', type: 'notice', confidence: .99,
    fields: { subtype: { value: 'notice', confidence: .99, validationState: 'VALIDATED', evidence: [{ text: 'letter', start: 9, end: 15 }] } },
  }, 'A simple letter');
  assert.equal(rejected, local);
});

test('cloud OCR response parser preserves page indexes and concatenates documented and transitional responses', () => {
  const canonical = parseCloudOcrResponse({ pages: [{ pageIndex: 2, text: ' third ' }, { pageIndex: 0, text: 'first' }] });
  assert.deepEqual(canonical, { pages: [{ pageIndex: 0, text: 'first' }, { pageIndex: 2, text: 'third' }], text: 'first\nthird' });
  assert.deepEqual(parseCloudOcrResponse({ ocrText: ['one', 'two'] }), {
    pages: [{ pageIndex: 0, text: 'one' }, { pageIndex: 1, text: 'two' }], text: 'one\ntwo',
  });
});

test('cloud mapping rejects low-confidence, invalid, and mismatched evidence', () => {
  const local = analyzeDocumentIntelligence({ text: 'A simple letter' });
  for (const field of [
    { value: 'letter', confidence: .84, validationState: 'VALIDATED', evidence: [{ text: 'letter', start: 9, end: 15 }] },
    { value: 'letter', confidence: .9, validationState: 'UNVALIDATED', evidence: [{ text: 'letter', start: 9, end: 15 }] },
    { value: 'letter', confidence: .9, validationState: 'VALIDATED', evidence: [{ text: 'wrong', start: 9, end: 14 }] },
  ]) {
    assert.equal(mergeCloudEvidence(local, { family: 'correspondence', type: 'letter', confidence: .9, fields: { subtype: field } }, 'A simple letter'), local);
  }
});

test('invoice cloud suggestions are exact evidence-backed review values', () => {
  const source = 'Rosenhof GmbH\nRechnung Nr.: RH-17\nGesamtbetrag: 119,00 EUR';
  const invoiceStart = source.indexOf('RH-17');
  const amountStart = source.indexOf('119,00 EUR');
  const fields = normalizeCloudFields([
    { name: 'invoiceNumber', value: 'RH-17', confidence: .9, validationState: 'VALIDATED', evidence: [{ text: 'RH-17', start: invoiceStart, end: invoiceStart + 5 }] },
    { name: 'amount', value: '119,00 EUR', confidence: .9, validationState: 'VALIDATED', evidence: [{ text: '119,00 EUR', start: amountStart, end: amountStart + 10 }] },
    { name: 'sender', value: 'Invented', confidence: .9, validationState: 'VALIDATED', evidence: [{ text: 'Rosenhof', start: 0, end: 8 }] },
  ]);
  const suggestions = cloudReviewSuggestions({ family: 'financial', type: 'invoice', confidence: .9, fields }, source);
  assert.deepEqual(suggestions, {
    invoiceNumber: { value: 'RH-17', provenance: 'cloud_evidence' },
    amount: { value: '119,00 EUR', provenance: 'cloud_evidence' },
    documentType: { value: 'Rechnung', provenance: 'cloud_classification' },
  });
});

test('canonical API field arrays become exact-span keyed facts, while sensitive families remain review-only', () => {
  const text = 'A simple letter';
  const fields = normalizeCloudFields([{
    name: 'subtype', value: 'letter', confidence: .9, validationState: 'VALIDATED',
    evidence: [{ text: 'letter', start: 9, end: 15, pageIndex: 0 }],
  }]);
  assert.deepEqual(fields?.subtype.evidence[0], { text: 'letter', start: 9, end: 15, pageIndex: 0 });
  const local = analyzeDocumentIntelligence({ text });
  const applied = mergeCloudEvidence(local, { family: 'correspondence', type: 'letter', confidence: .9, fields }, text);
  assert.equal(applied.taxonomy.subtype.value, 'letter');
  assert.equal(mergeCloudEvidence(local, { family: 'financial', type: 'letter', confidence: .9, fields }, text), local);
});

test('normalizes common Gemini invoice field aliases for review suggestions', () => {
  const source = 'Rosenhof Schultheis e.K.\nMwSt.: 2,15 EUR';
  const fields = normalizeCloudFields([
    { name: 'vendor_name', value: 'Rosenhof Schultheis e.K.', confidence: 0.98, validationState: 'PARTIALLY_VALIDATED', evidence: [{ text: 'Rosenhof Schultheis e.K.', start: 0, end: 24, pageIndex: 0 }] },
    { name: 'vat_amount', value: '2,15 EUR', confidence: 0.98, validationState: 'PARTIALLY_VALIDATED', evidence: [{ text: '2,15 EUR', start: 32, end: 40, pageIndex: 0 }] },
  ]);
  assert.equal(fields?.sender.value, 'Rosenhof Schultheis e.K.');
  assert.equal(fields?.vatAmount.value, '2,15 EUR');
  assert.deepEqual(cloudReviewSuggestions({ family: 'financial', type: 'invoice', confidence: 0.98, fields }, source), {
    sender: { value: 'Rosenhof Schultheis e.K.', provenance: 'cloud_evidence' },
    vatAmount: { value: '2,15 EUR', provenance: 'cloud_evidence' },
    documentType: { value: 'Rechnung', provenance: 'cloud_classification' },
  });
});

test('evidence-backed cloud values fill blank canonical fields and flag conflicts without overwriting them', () => {
  const text = 'Sender: Rosenhof GmbH\nDue date: 20.01.2025';
  const fields = normalizeCloudFields([
    { name: 'vendor_name', value: 'Rosenhof GmbH', confidence: .95, validationState: 'VALIDATED', provenance: 'deterministic', evidence: [{ text: 'Rosenhof GmbH', start: 8, end: 21 }] },
    { name: 'due_date', value: '20.01.2025', confidence: .95, validationState: 'VALIDATED', evidence: [{ text: '20.01.2025', start: 32, end: 42 }] },
  ]);
  const merged = mergeCloudReviewValues({ sender: '', dueDate: '19.01.2025', recipient: '' }, {
    family: 'finance', type: 'invoice', confidence: .7, fields,
  }, text);
  assert.equal(merged.values.sender, 'Rosenhof GmbH');
  assert.equal(merged.values.dueDate, '19.01.2025');
  assert.deepEqual(merged.conflicts, ['dueDate']);
});

test('keeps literal evidence while offering normalized values and semantic taxonomy as review candidates', () => {
  const sourceText = 'Rechnungsdatum: 30.08.2026';
  const dateStart = sourceText.indexOf('30.08.2026');
  const fields = normalizeCloudFields([{
    name: 'document_date',
    value: '30.08.2026',
    normalizedValue: '2026-08-30',
    confidence: 0.96,
    validationState: 'VALIDATED',
    provenance: 'deterministic',
    evidence: [{ text: '30.08.2026', start: dateStart, end: dateStart + 10, pageIndex: 0 }],
  }]);
  const suggestions = cloudReviewSuggestions({
    family: 'finance',
    type: 'invoice',
    confidence: 0.93,
    fields,
  }, sourceText);
  assert.equal(fields?.documentDate.value, '30.08.2026');
  assert.equal(fields?.documentDate.normalizedValue, '2026-08-30');
  assert.equal(suggestions.documentDate.value, '2026-08-30');
  assert.equal(suggestions.category.value, 'Finanzen');
  assert.equal(suggestions.documentType.value, 'Rechnung');
});

test('twelve cloud OCR pages are planned in max-five chunks and merged in global order', () => {
  const chunks = planCloudOcrChunks(Array.from({ length: 12 }, (_, pageIndex) => ({ pageIndex })));
  assert.deepEqual(chunks.map((chunk) => chunk.length), [5, 5, 2]);
  const merged = mergeCloudOcrChunks(chunks.map((chunk) => ({
    requestedPageIndexes: chunk.map((page) => page.pageIndex),
    // Transitional responses restart their indexes within each request.
    result: {
      pages: chunk.map((page, localIndex) => ({ pageIndex: localIndex, text: `page-${page.pageIndex}` })),
      text: '',
    },
  })));
  assert.deepEqual(merged?.pages.map((page) => page.pageIndex), Array.from({ length: 12 }, (_, index) => index));
  assert.equal(merged?.text, Array.from({ length: 12 }, (_, index) => `page-${index}`).join('\n'));
});

test('cloud facts validate against the stored Gemini source rather than the local document body', () => {
  const localText = 'Locally recognized correspondence';
  const cloudSource = 'Cloud recognized letter';
  const local = analyzeDocumentIntelligence({ text: localText });
  const fields = normalizeCloudFields([{
    name: 'subtype', value: 'letter', confidence: .9, validationState: 'VALIDATED',
    evidence: [{ text: 'letter', start: 17, end: 23, pageIndex: 0 }],
  }]);
  const cloud = { family: 'correspondence', type: 'letter', confidence: .9, fields, sourceText: cloudSource };
  assert.equal(mergeCloudEvidence(local, cloud, localText), local);
  assert.equal(mergeCloudEvidence(local, cloud, cloud.sourceText).taxonomy.subtype.value, 'letter');
});

test('scan cloud pipeline makes opt-in a hard provider boundary', async () => {
  let remoteCalls = 0;
  const result = await runScanCloudPipeline({
    optedIn: false,
    localText: 'local text',
    localOcrStatus: 'complete',
    title: 'Letter',
    pageUris: ['page.jpg'],
  }, {
    uploadDocumentAiOcr: async () => {
      remoteCalls += 1;
      return { text: 'cloud text', pages: [] };
    },
    processGemini: async () => {
      remoteCalls += 1;
      return { family: 'correspondence', type: 'letter', confidence: .9 };
    },
  });
  assert.equal(remoteCalls, 0);
  assert.equal(result.pipeline.cloudState, 'offline');
  assert.equal(result.pipeline.documentAiOcr.state, 'not_requested');
  assert.equal(result.pipeline.gemini.state, 'not_requested');
  assert.equal(result.pipeline.finalProvider, 'local_only');
});

test('Document AI failure is persisted when Gemini explicitly falls back to local OCR', async () => {
  const result = await runScanCloudPipeline({
    optedIn: true,
    localText: 'local letter',
    localOcrStatus: 'complete',
    title: 'Letter',
    pageUris: ['page.jpg'],
  }, {
    uploadDocumentAiOcr: async () => {
      throw Object.assign(new Error('Document AI timed out.'), { state: 'unavailable' });
    },
    processGemini: async (text) => {
      assert.equal(text, 'local letter');
      return { family: 'correspondence', type: 'letter', confidence: .9 };
    },
  });
  assert.equal(result.pipeline.documentAiOcr.state, 'failed');
  assert.equal(result.pipeline.gemini.state, 'succeeded');
  assert.equal(result.pipeline.gemini.input, 'local_ocr');
  assert.equal(result.pipeline.fallbackUsed, true);
  assert.equal(result.pipeline.failureReason, 'service_unavailable');
  assert.equal(result.pipeline.finalProvider, 'local_ocr_gemini');
  assert.equal(result.pipeline.cloudState, 'cloud');
  assert.equal(result.cloudIntelligence?.sourceText, 'local letter');
});

test('scan cloud pipeline never reports Gemini success when no OCR source can be used', async () => {
  let geminiCalls = 0;
  const result = await runScanCloudPipeline({
    optedIn: true,
    localText: '',
    localOcrStatus: 'failed',
    title: 'Unreadable',
    pageUris: ['page.jpg'],
  }, {
    uploadDocumentAiOcr: async () => {
      throw Object.assign(new Error('Quota exhausted.'), { state: 'quota' });
    },
    processGemini: async () => {
      geminiCalls += 1;
      return { family: 'unknown', type: 'unknown', confidence: 0 };
    },
  });
  assert.equal(geminiCalls, 0);
  assert.equal(result.pipeline.localOcr.state, 'failed');
  assert.equal(result.pipeline.documentAiOcr.state, 'failed');
  assert.equal(result.pipeline.gemini.state, 'skipped');
  assert.equal(result.pipeline.cloudState, 'quota');
  assert.deepEqual(result.pipeline.failures.map((failure) => failure.stage), ['local_ocr', 'document_ai_ocr']);
});

test('successful Document AI OCR is the recorded Gemini provenance', async () => {
  const result = await runScanCloudPipeline({
    optedIn: true,
    localText: 'local text',
    localOcrStatus: 'complete',
    title: 'Letter',
    pageUris: ['page.jpg'],
  }, {
    uploadDocumentAiOcr: async () => ({ text: 'cloud letter', pages: [{ pageIndex: 0, text: 'cloud letter' }] }),
    processGemini: async () => ({ family: 'correspondence', type: 'letter', confidence: .9 }),
  });
  assert.equal(result.pipeline.documentAiOcr.state, 'succeeded');
  assert.equal(result.pipeline.gemini.state, 'succeeded');
  assert.equal(result.pipeline.gemini.input, 'document_ai_ocr');
  assert.equal(result.pipeline.fallbackUsed, false);
  assert.equal(result.pipeline.finalProvider, 'document_ai_gemini');
  assert.equal(result.pipeline.failures.length, 0);
});