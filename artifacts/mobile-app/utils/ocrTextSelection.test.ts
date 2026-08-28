import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseBestOcrText, scoreDocumentOcrText } from './ocrTextSelection';

test('prefers original OCR when optimized OCR loses payroll labels', () => {
  const optimized = 'Nordlicht Logistik 2026 2548,77';
  const original = `
    Nordlicht Logistik GmbH
    Gehaltsabrechnung
    Arbeitgeber: Nordlicht Logistik GmbH
    Arbeitnehmername: Tobias Beispiel
    Nettoauszahlung: 2.548,77 EUR
  `;

  assert.equal(chooseBestOcrText(optimized, original), original.trim());
  assert.ok(scoreDocumentOcrText(original) > scoreDocumentOcrText(optimized));
});

test('keeps optimized OCR when it contains the stronger document structure', () => {
  const optimized = `
    Gehaltsabrechnung
    Arbeitgeber: Muster GmbH
    Arbeitnehmer: Nora Muster
    Auszahlungsbetrag: 2.611,42 EUR
  `;
  const original = 'Muster GmbH Nora Muster 2611 42';

  assert.equal(chooseBestOcrText(optimized, original), optimized.trim());
});

test('falls back when one OCR source is empty', () => {
  assert.equal(chooseBestOcrText('', 'Lesbarer Originaltext'), 'Lesbarer Originaltext');
  assert.equal(chooseBestOcrText('Lesbarer optimierter Text', ''), 'Lesbarer optimierter Text');
});