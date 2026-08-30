import { countryProfile, searchCountries, suggestCountriesForDeviceLocales } from './countryRegistry';
import { answerDocumentQuestion, deriveTranslationState, resetConversation, selectConversation } from './explanationExperience';
import type { DocumentIntelligenceResult } from './documentIntelligence';

declare function require(name: string): any;
const assert = require('node:assert').strict;
const evidence = [{ text: 'Sender: Amt', source: 'ocr' as const, confidence: 'high' as const }];
const result = {
  parties: { sender: { value: 'Amt', evidence }, recipient: { value: 'Ada', evidence } },
  dates: { documentDate: { value: '2025-01-01', evidence }, references: { value: ['INV-400123'], evidence } }, amounts: { main: { value: '10 EUR', evidence } },
  identifiers: { value: [{ kind: 'reference', value: 'INV-400123', validation: 'partially_validated', evidence }], evidence },
  deadlines: [{ value: '2025-02-01', kind: 'payment', source: 'explicit', relative: false, confidence: 'high', evidence }], actions: [{ requirement: 'Reply', evidence }],
  responseNecessary: { value: true, evidence }, reviewRequired: false, reviewReasons: [], reviewRecords: [], deadlineConflicts: [], case: { summary: { value: 'Case A', evidence } },
  changes: [], taxonomy: { mainCategory: { value: 'health', evidence }, purpose: { value: 'Insurance decision', evidence } }, actionSummary: 'Appointment', plainLanguageExplanation: 'Summary',
} as unknown as DocumentIntelligenceResult;
const before = JSON.stringify(result);
assert.equal(countryProfile('CH').defaultCurrency, 'CHF');
assert.equal(countryProfile('XX').countryCode, 'UNKNOWN');
assert.ok(searchCountries('hung').length === 1);
assert.equal(suggestCountriesForDeviceLocales(['de-CH'])[0].persistence, 'suggestion_only');
assert.equal(deriveTranslationState('de', 'de', 'automatic_when_needed').state, 'not_needed');
assert.equal(deriveTranslationState('de', 'hu', 'automatic_when_needed').state, 'unavailable', 'cross-language need is recognized without pretending a translator exists');
assert.equal(deriveTranslationState('de', 'hu', 'off').state, 'disabled');
assert.equal(answerDocumentQuestion(result, 'sender?', 'en').text, 'According to the document: Sender: Amt');
assert.equal(answerDocumentQuestion(result, 'invoice number?', 'en').text, 'According to the document: Reference: INV-400123');
assert.equal(answerDocumentQuestion(result, 'what is the purpose?', 'en').text, 'According to the document: Purpose: Insurance decision');
assert.equal(answerDocumentQuestion(result, 'payment terms?', 'en').text, 'According to the document: Payment terms: 2025-02-01');
assert.equal(answerDocumentQuestion(result, 'sender?', 'de', { sender: 'Korrigiert' }).text, 'Laut Dokument: Absender: Korrigiert');
assert.ok(answerDocumentQuestion(result, 'medical?', 'en').safetyNotice);
assert.ok(answerDocumentQuestion(result, 'amount?', 'en').safetyNotice?.includes('financial'), 'amount answers carry payment verification safety');
const lowAmount = { ...result, amounts: { main: { value: '999 EUR', role: 'payable', confidence: 'low', evidence: [{ ...evidence[0], confidence: 'low' }] } } } as unknown as DocumentIntelligenceResult;
assert.equal(answerDocumentQuestion(lowAmount, 'amount?', 'en').supported, false, 'low-confidence amount is never stated as certain');
const legal = { ...result, taxonomy: { mainCategory: { value: 'authority', evidence } } } as DocumentIntelligenceResult;
assert.ok(answerDocumentQuestion(legal, 'sender?', 'en').safetyNotice?.includes('legal'), 'legal documents carry a safety notice');
assert.equal(JSON.stringify(result), before, 'answering does not mutate intelligence');
const records = [{ documentId: 'a', threadId: 'one', id: '1', role: 'user' as const, text: 'x', createdAt: '1' }, { documentId: 'b', threadId: 'one', id: '2', role: 'user' as const, text: 'y', createdAt: '1' }];
assert.equal(selectConversation(records, 'a', 'one').length, 1);
assert.equal(resetConversation(records, 'a', 'one').length, 1);
console.log('explanationExperience tests passed');