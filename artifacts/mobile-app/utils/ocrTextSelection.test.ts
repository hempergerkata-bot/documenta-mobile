import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chooseBestOcrText,
  mergeComplementaryOcrText,
  scoreDocumentOcrText,
} from './ocrTextSelection';

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

test('keeps complementary labelled lines from the other OCR source', () => {
  const merged = mergeComplementaryOcrText(
    'Gehaltsabrechnung\nNordlicht Logistik GmbH',
    'Arbeitnehmer: Tobias Beispiel\nNettoauszahlung: 2.548,77 EUR',
  );

  assert.match(merged, /Arbeitnehmer: Tobias Beispiel/);
  assert.match(merged, /Nettoauszahlung: 2\.548,77 EUR/);
});

test('keeps split label-value blocks atomic and does not join adjacent labels', () => {
  const merged = mergeComplementaryOcrText(
    'Gehaltsabrechnung\nNordlicht Logistik',
    [
      'Arbeitgeber',
      'Nordlicht Logistik GmbH',
      'Abrechnungsdatum',
      '31.08.2026',
      'Arbeitnehmer',
      'Tobias Beispiel',
      'Auszahlungsbetrag',
      '2.548,77 EUR',
    ].join('\n'),
  );

  assert.match(merged, /Arbeitgeber\nNordlicht Logistik GmbH/);
  assert.match(merged, /Abrechnungsdatum\n31\.08\.2026/);
  assert.match(merged, /Arbeitnehmer\nTobias Beispiel/);
  assert.match(merged, /Auszahlungsbetrag\n2\.548,77 EUR/);
  assert.doesNotMatch(merged, /Arbeitgeber\nAbrechnungsdatum/);
});

test('repairs an incomplete duplicate primary label from a complete secondary block', () => {
  const merged = mergeComplementaryOcrText(
    'Gehaltsabrechnung\nArbeitgeber\nAbrechnungsdatum\n31.08.2026',
    'Arbeitgeber\nNordlicht Logistik GmbH\nAbrechnungsdatum\n31.08.2026',
  );

  assert.match(merged, /Arbeitgeber\nNordlicht Logistik GmbH/);
});