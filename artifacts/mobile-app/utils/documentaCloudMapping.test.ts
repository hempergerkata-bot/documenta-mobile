import { analyzeDocumentIntelligence } from './documentIntelligence';
import { mergeCloudEvidence, mergeCloudOcrChunks, normalizeCloudFields, parseCloudOcrResponse, planCloudOcrChunks } from './documentaCloudMapping';

declare function require(name: string): any;
const test: (name: string, body: () => void) => void = require('node:test');
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