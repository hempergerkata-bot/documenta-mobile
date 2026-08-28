export type AnalysisConfidence = 'high' | 'medium';

export type DocumentAnalysisField =
  | 'title'
  | 'sender'
  | 'category'
  | 'subcategory'
  | 'documentType'
  | 'documentDate'
  | 'dueDate'
  | 'amount'
  | 'person'
  | 'status'
  | 'tags';

export type SuggestedValue<T = string> = {
  value: T;
  confidence: AnalysisConfidence;
  evidence: string;
};

export type DocumentAnalysisResult = {
  text: string;
  fields: Partial<Record<DocumentAnalysisField, SuggestedValue<string | string[]>>>;
  uncertainFields: DocumentAnalysisField[];
};

type DocumentRule = {
  documentType: string;
  category: string;
  subcategory?: string;
  tags: string[];
  patterns: RegExp[];
};

const rules: DocumentRule[] = [
  {
    documentType: 'Lohnabrechnung / Gehaltsabrechnung',
    category: 'Arbeit & Bildung',
    subcategory: 'Lohn & Gehalt',
    tags: ['lohnabrechnung', 'gehalt'],
    patterns: [/\b(?:lohn|gehalts|entgelt)abrechnung\b/i, /\bnetto(?:bezug|entgelt)?\b/i],
  },
  {
    documentType: 'Mahnung',
    category: 'Finanzen',
    subcategory: 'Forderungen',
    tags: ['mahnung', 'frist'],
    patterns: [/\b(?:zweite |letzte )?mahnung\b/i, /\bmahngebühr(?:en)?\b/i],
  },
  {
    documentType: 'Zahlungsaufforderung',
    category: 'Finanzen',
    subcategory: 'Forderungen',
    tags: ['zahlung', 'frist'],
    patterns: [/\bzahlungsaufforderung\b/i, /\bwir fordern sie (?:hiermit )?auf\b/i],
  },
  {
    documentType: 'Kontoauszug',
    category: 'Finanzen',
    subcategory: 'Bank',
    tags: ['kontoauszug', 'bank'],
    patterns: [/\bkontoauszug\b/i, /\b(?:iban|bic)\b[\s\S]{0,120}\b(?:saldo|kontostand)\b/i],
  },
  {
    documentType: 'Steuerdokument',
    category: 'Finanzen',
    subcategory: 'Steuern',
    tags: ['steuer', 'finanzamt'],
    patterns: [/\bsteuerbescheid\b/i, /\bfinanzamt\b/i, /\beinkommensteuer\b/i],
  },
  {
    documentType: 'Krankenkasse',
    category: 'Gesundheit',
    subcategory: 'Krankenkasse',
    tags: ['krankenkasse', 'gesundheit'],
    patterns: [/\bkrankenkasse\b/i, /\b(?:aok|techniker krankenkasse|barmer|dak-gesundheit|ikk)\b/i],
  },
  {
    documentType: 'Versicherungsbrief',
    category: 'Versicherungen',
    subcategory: 'Versicherung',
    tags: ['versicherung'],
    patterns: [/\bversicherungsschein\b/i, /\bversicherungsnummer\b/i, /\bversicherungsbeitrag\b/i],
  },
  {
    documentType: 'Rechnung Strom/Gas/Internet',
    category: 'Wohnen',
    subcategory: 'Energie & Internet',
    tags: ['rechnung', 'wohnen'],
    patterns: [
      /\b(?:strom|gas|erdgas|internet|dsl|breitband)(?:rechnung|abrechnung|vertrag)?\b/i,
      /\b(?:zählernummer|verbrauchsstelle|kilowattstunden|kwh)\b/i,
    ],
  },
  {
    documentType: 'Behördenschreiben',
    category: 'Behörden',
    subcategory: 'Amtliches Schreiben',
    tags: ['behörde'],
    patterns: [/\b(?:bescheid|aktenzeichen)\b/i, /\b(?:bundesagentur|bürgeramt|landratsamt|stadtverwaltung)\b/i],
  },
  {
    documentType: 'Vertrag',
    category: 'Verträge',
    subcategory: 'Vertrag',
    tags: ['vertrag'],
    patterns: [/\bvertrag\b/i, /\bvertragsnummer\b/i, /\bvertragspartner\b/i],
  },
  {
    documentType: 'Rechnung',
    category: 'Finanzen',
    subcategory: 'Rechnungen',
    tags: ['rechnung'],
    patterns: [/\brechnung\b/i, /\brechnungs(?:nummer|datum|betrag)\b/i],
  },
];

const monthNames =
  'Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember';
const dateValuePattern = `(?:\\d{1,2}[.\\-/]\\d{1,2}[.\\-/]\\d{2,4}|\\d{1,2}\\.\\s*(?:${monthNames})\\s+\\d{4})`;
const amountPattern = '(\\d{1,3}(?:[.\\s]\\d{3})*(?:,\\d{2})\\s*(?:€|EUR))';

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function suggestion(
  value: string | string[],
  confidence: AnalysisConfidence,
  evidence: string,
): SuggestedValue<string | string[]> {
  return { value, confidence, evidence: evidence.trim().slice(0, 180) };
}

function findLabelValue(lines: string[], labels: string[]) {
  for (const line of lines) {
    for (const label of labels) {
      const match = line.match(new RegExp(`\\b${label}\\b\\s*[:\\-]?\\s*(.+)$`, 'i'));
      if (match?.[1]?.trim()) return { value: match[1].trim(), evidence: line };
    }
  }
  return undefined;
}

function normalizeDate(value: string) {
  return value
    .replace(/\bMaerz\b/i, 'März')
    .replace(/\s+/g, ' ')
    .trim();
}

function findDateByLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(
      new RegExp(`\\b${label}\\b\\s*[:\\-]?\\s*(${dateValuePattern})`, 'i'),
    );
    if (match?.[1]) {
      return { value: normalizeDate(match[1]), evidence: match[0] };
    }
  }
  return undefined;
}

function detectRule(text: string) {
  let best: { rule: DocumentRule; score: number; evidence: string } | undefined;
  for (const rule of rules) {
    const matches = rule.patterns.filter((pattern) => pattern.test(text));
    const score = matches.length;
    if (score > 0 && (!best || score > best.score)) {
      const evidence = normalizeLines(text).find((line) =>
        rule.patterns.some((pattern) => pattern.test(line)),
      );
      best = { rule, score, evidence: evidence ?? rule.documentType };
    }
  }
  return best;
}

function findSender(lines: string[]) {
  const labelled = findLabelValue(lines, [
    'Absender',
    'Arbeitgeber',
    'Firma',
    'Institution',
    'Versicherer',
  ]);
  if (labelled && labelled.value.length >= 3 && labelled.value.length <= 100) {
    return { ...labelled, confidence: 'high' as const };
  }

  const legalEntity = lines
    .slice(0, 15)
    .find((line) =>
      /\b(?:GmbH(?:\s*&\s*Co\.?\s*KG)?|AG|e\.?\s*V\.?|Krankenkasse|Versicherung|Finanzamt|Stadtwerke)\b/i.test(
        line,
      ),
    );
  if (legalEntity && legalEntity.length <= 100) {
    return { value: legalEntity, evidence: legalEntity, confidence: 'medium' as const };
  }
  return undefined;
}

function findPerson(lines: string[]) {
  const labelled = findLabelValue(lines, [
    'Arbeitnehmer(?:\\/in)?',
    'Mitarbeiter(?:\\/in)?',
    'Versicherte(?:r|n)?',
    'Empfänger(?:\\/in)?',
  ]);
  if (!labelled) return undefined;
  const name = labelled.value
    .replace(/\b(?:Personalnummer|Versichertennummer|Geburtsdatum)\b.*$/i, '')
    .trim();
  if (!/^[\p{L}][\p{L}\s.'-]{2,80}$/u.test(name)) return undefined;
  return { value: name, evidence: labelled.evidence };
}

function findAmount(text: string, documentType?: string) {
  const labels =
    documentType === 'Lohnabrechnung / Gehaltsabrechnung'
      ? ['Auszahlungsbetrag', 'Nettoauszahlung', 'Überweisungsbetrag', 'Nettoentgelt']
      : ['Rechnungsbetrag', 'Gesamtbetrag', 'Zahlbetrag', 'Forderungsbetrag', 'Zu zahlen'];
  for (const label of labels) {
    const match = text.match(new RegExp(`\\b${label}\\b[^\\d]{0,20}${amountPattern}`, 'i'));
    if (match?.[1]) return { value: match[1].replace(/\s+/g, ' '), evidence: match[0] };
  }
  return undefined;
}

function findPayrollPeriod(text: string) {
  const match = text.match(
    new RegExp(
      `\\b(?:Abrechnungsmonat|Abrechnungszeitraum|für)\\b\\s*[:\\-]?\\s*((?:${monthNames})\\s+\\d{4})`,
      'i',
    ),
  );
  return match?.[1]?.replace(/\bMaerz\b/i, 'März');
}

export function analyzeGermanDocumentText(rawText: string): DocumentAnalysisResult {
  const text = rawText.replace(/\u0000/g, '').trim();
  const fields: DocumentAnalysisResult['fields'] = {};
  if (!text) return { text: '', fields, uncertainFields: [] };

  const lines = normalizeLines(text);
  const detected = detectRule(text);
  const documentType = detected?.rule.documentType;

  if (detected) {
    const confidence: AnalysisConfidence = detected.score >= 2 ? 'high' : 'medium';
    fields.documentType = suggestion(
      detected.rule.documentType,
      confidence,
      detected.evidence,
    );
    fields.category = suggestion(detected.rule.category, confidence, detected.evidence);
    if (detected.rule.subcategory) {
      fields.subcategory = suggestion(detected.rule.subcategory, confidence, detected.evidence);
    }
    fields.tags = suggestion(detected.rule.tags, confidence, detected.evidence);
  }

  const sender = findSender(lines);
  if (sender) fields.sender = suggestion(sender.value, sender.confidence, sender.evidence);

  const documentDate = findDateByLabel(text, [
    'Dokumentdatum',
    'Rechnungsdatum',
    'Ausstellungsdatum',
    'Abrechnungsdatum',
    'Datum',
  ]);
  if (documentDate) {
    fields.documentDate = suggestion(documentDate.value, 'high', documentDate.evidence);
  }

  const dueDate = findDateByLabel(text, [
    'Fälligkeitsdatum',
    'Fälligkeit',
    'zahlbar bis',
    'Frist bis',
    'spätestens am',
  ]);
  if (dueDate) fields.dueDate = suggestion(dueDate.value, 'high', dueDate.evidence);

  const amount = findAmount(text, documentType);
  if (amount) fields.amount = suggestion(amount.value, 'high', amount.evidence);

  const person = findPerson(lines);
  if (person) fields.person = suggestion(person.value, 'high', person.evidence);

  const payrollPeriod =
    documentType === 'Lohnabrechnung / Gehaltsabrechnung'
      ? findPayrollPeriod(text)
      : undefined;
  if (documentType === 'Lohnabrechnung / Gehaltsabrechnung' && payrollPeriod) {
    const title = fields.sender?.value
      ? `Lohnabrechnung ${payrollPeriod} – ${fields.sender.value}`
      : `Lohnabrechnung ${payrollPeriod}`;
    fields.title = suggestion(title, fields.sender ? 'high' : 'medium', payrollPeriod);
  } else if (documentType && fields.sender?.value) {
    fields.title = suggestion(
      `${documentType} – ${fields.sender.value}`,
      'medium',
      `${documentType}; ${fields.sender.evidence}`,
    );
  }

  const uncertainFields = (Object.entries(fields) as [
    DocumentAnalysisField,
    SuggestedValue<string | string[]>,
  ][])
    .filter(([, value]) => value.confidence === 'medium')
    .map(([field]) => field);

  return { text, fields, uncertainFields };
}