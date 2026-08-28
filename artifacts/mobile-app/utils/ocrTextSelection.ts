const documentSignals = [
  /\b(?:lohn|gehalts|entgelt)abrechnung\b/i,
  /\barbeitgeber\b/i,
  /\barbeitnehmer(?:name)?\b/i,
  /\babrechnungs(?:monat|zeitraum|periode|datum)\b/i,
  /\b(?:nettoauszahlung|auszahlungsbetrag|nettobetrag|nettoentgelt|netto-bezüge)\b/i,
  /\b(?:rechnung|rechnungsdatum|gesamtbetrag|zahlbetrag)\b/i,
  /\b(?:fälligkeitsdatum|zahlbar bis|frist bis)\b/i,
  /\b(?:absender|institution|firma)\b/i,
];

export function scoreDocumentOcrText(text: string) {
  const normalized = text.trim();
  if (!normalized) return 0;
  const letterCount = normalized.match(/\p{L}/gu)?.length ?? 0;
  const digitCount = normalized.match(/\d/g)?.length ?? 0;
  const signalCount = documentSignals.filter((pattern) => pattern.test(normalized)).length;
  const labelledAmountCount =
    normalized.match(
      /\b(?:auszahlung|netto|betrag|zu zahlen)\b[^\d]{0,35}\d{1,3}(?:[.\s]\d{3})*,\d{2}/gi,
    )?.length ?? 0;
  return (
    Math.min(letterCount, 600) +
    Math.min(digitCount, 120) * 0.4 +
    signalCount * 140 +
    labelledAmountCount * 90
  );
}

export function chooseBestOcrText(optimizedText: string, originalText: string) {
  const optimized = optimizedText.trim();
  const original = originalText.trim();
  const optimizedScore = scoreDocumentOcrText(optimized);
  const originalScore = scoreDocumentOcrText(original);

  if (!optimized) return original;
  if (!original) return optimized;
  return originalScore > optimizedScore ? original : optimized;
}