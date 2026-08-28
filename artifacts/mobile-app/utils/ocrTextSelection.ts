const documentSignals = [
  /\b(?:rechnung|bescheid|vertrag|abrechnung|befund|arztbrief|kontoauszug|mahnung)\b/i,
  /\b(?:datum|fällig|frist|betrag|summe|zeichen|nummer|kundennummer)\b/i,
  /\b(?:absender|empfänger|institution|firma|praxis|schule|versicherung|finanzamt|bank)\b/i,
  /\b(?:straße|strasse|weg|platz)\b.{0,30}\b\d{4,5}\b/i,
  /\b(?:€|EUR|IBAN|BIC|Steuernummer|Aktenzeichen)\b/i,
];

export function scoreDocumentOcrText(text: string) {
  const normalized = text.trim();
  if (!normalized) return 0;
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const letterCount = normalized.match(/\p{L}/gu)?.length ?? 0;
  const digitCount = normalized.match(/\d/g)?.length ?? 0;
  const signalCount = documentSignals.filter((pattern) => pattern.test(normalized)).length;
  const readableLineCount = lines.filter((line) => {
    const useful = line.match(/[\p{L}\d]/gu)?.length ?? 0;
    return useful >= 3 && useful / Math.max(1, line.length) >= 0.55;
  }).length;
  const replacementPenalty = (normalized.match(/[�□]/g)?.length ?? 0) * 40;
  const noisePenalty = lines.filter((line) => /[^\p{L}\d\s.,:;()\-+€/%&@]/u.test(line)).length * 8;
  return (
    Math.min(letterCount, 1200) +
    Math.min(digitCount, 250) * 0.45 +
    Math.min(readableLineCount, 80) * 16 +
    signalCount * 70 -
    replacementPenalty -
    noisePenalty
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

function isReadableLine(line: string) {
  const useful = line.match(/[\p{L}\d]/gu)?.length ?? 0;
  if (useful < 2 || useful / Math.max(1, line.length) < 0.5) return false;
  return !/[�□]/.test(line);
}

function isNearDuplicate(candidate: string, known: string[]) {
  const normalized = normalizedLine(candidate);
  if (!normalized) return true;
  return known.some((existing) => {
    if (existing === normalized) return true;
    const shorter = existing.length < normalized.length ? existing : normalized;
    const longer = existing.length < normalized.length ? normalized : existing;
    return shorter.length >= 8 && longer.includes(shorter) && shorter.length / longer.length >= 0.78;
  });
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
  const knownLines = primaryLines.map(normalizedLine).filter(Boolean);
  const secondaryLines = secondary
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const additions: string[] = [];
  for (const line of secondaryLines) {
    if (isReadableLine(line) && !isNearDuplicate(line, knownLines)) {
      additions.push(line);
      knownLines.push(normalizedLine(line));
    }
  }

  return additions.length > 0 ? `${primary}\n${additions.join('\n')}` : primary;
}