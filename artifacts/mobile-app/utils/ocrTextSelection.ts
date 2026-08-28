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

const complementaryLineSignals =
  /\b(?:arbeitgeber|arbeitnehmer|mitarbeiter|beschäftigte|personalnummer|pers\.?\s*-?\s*nr|netto|auszahlung|überweisung|auszahlungsbetrag|abrechnungs(?:monat|zeitraum|periode|datum)|abrechnung\s+(?:vom|für)|für\s+(?:den\s+)?monat|rechnungs?datum|fällig|zahlbar|datum|betrag)\b|(?:€|EUR|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i;

const labelOnlyLineSignal =
  /^(?:arbeitgeber(?:bezeichnung|daten)?|betriebsname|firma|betrieb|betriebsstätte|arbeitnehmer(?:name)?|arbeitnehmer\s+name|name\s+des\s+arbeitnehmers|beschäftigtenname|mitarbeitername|an-name|abrechnungsdatum|datum\s+der\s+abrechnung|abrechnung\s+vom|abrechnungsmonat|abrechnungszeitraum|abrechnungsperiode|nettoauszahlung|auszahlungsbetrag|überweisungsbetrag|auszahlung\s+netto|nettoentgelt|nettobetrag|nettoverdienst|netto[-\s]?bezüge)\s*[:\-]?$/i;

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

function normalizedLine(line: string) {
  return line
    .toLocaleLowerCase('de')
    .replace(/[^\p{L}\d]+/gu, '');
}

export function mergeComplementaryOcrText(
  optimizedText: string,
  originalText: string,
) {
  const optimized = optimizedText.trim();
  const original = originalText.trim();
  if (!optimized) return original;
  if (!original) return optimized;

  const primary = chooseBestOcrText(optimized, original);
  const secondary = primary === optimized ? original : optimized;
  const primaryLines = primary
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const knownLines = new Set(primaryLines.map(normalizedLine).filter(Boolean));
  const knownBlocks = new Set<string>();
  for (let index = 0; index < primaryLines.length - 1; index += 1) {
    const label = primaryLines[index];
    const value = primaryLines[index + 1];
    if (labelOnlyLineSignal.test(label) && !labelOnlyLineSignal.test(value)) {
      knownBlocks.add(`${normalizedLine(label)}=>${normalizedLine(value)}`);
    }
  }
  const secondaryLines = secondary
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const additions: string[] = [];
  for (let index = 0; index < secondaryLines.length; index += 1) {
    const line = secondaryLines[index];
    const normalized = normalizedLine(line);
    if (labelOnlyLineSignal.test(line) && secondaryLines[index + 1]) {
      const valueLine = secondaryLines[index + 1];
      const normalizedValue = normalizedLine(valueLine);
      const blockKey = `${normalized}=>${normalizedValue}`;
      if (
        normalizedValue &&
        !labelOnlyLineSignal.test(valueLine) &&
        !knownBlocks.has(blockKey)
      ) {
        additions.push(line, valueLine);
        knownBlocks.add(blockKey);
        knownLines.add(normalized);
        knownLines.add(normalizedValue);
      }
      index += 1;
      continue;
    }
    if (
      normalized &&
      !knownLines.has(normalized) &&
      complementaryLineSignals.test(line)
    ) {
      additions.push(line);
      knownLines.add(normalized);
    }
  }

  return additions.length > 0 ? `${primary}\n${additions.join('\n')}` : primary;
}