export type AnalysisConfidence = 'high' | 'medium';

export type DocumentAnalysisField =
  | 'title'
  | 'sender'
  | 'category'
  | 'subcategory'
  | 'documentType'
  | 'documentDate'
  | 'payrollPeriod'
  | 'dueDate'
  | 'amount'
  | 'person'
  | 'referenceNumber'
  | 'customerNumber'
  | 'invoiceNumber'
  | 'contractNumber'
  | 'insuranceNumber'
  | 'iban'
  | 'taxNumber'
  | 'patientNumber'
  | 'schoolReference'
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
  unresolvedFields: DocumentAnalysisField[];
};

type DocumentRule = {
  documentType: string;
  category: string;
  subcategory?: string;
  tags: string[];
  patterns: RegExp[];
  fieldRules?: Array<{
    field: DocumentAnalysisField;
    labels: string[];
  }>;
};

const rules: DocumentRule[] = [
  {
    documentType: 'Arztbrief / Befund',
    category: 'Gesundheit',
    subcategory: 'Medizinische Unterlagen',
    tags: ['gesundheit', 'medizin'],
    patterns: [/\b(?:arztbrief|befundbericht|laborbefund|diagnose)\b/i, /\b(?:patient(?:in)?|behandelnde[rn]? arzt|anamnese)\b/i],
    fieldRules: [
      { field: 'patientNumber', labels: ['Patientennummer', 'Patienten-Nr\\.?', 'Fallnummer'] },
    ],
  },
  {
    documentType: 'Schule / Kindergarten',
    category: 'Arbeit & Bildung',
    subcategory: 'Schule & Betreuung',
    tags: ['schule', 'kind'],
    patterns: [/\b(?:schule|grundschule|gymnasium|kindergarten|kindertagesstätte|kita)\b/i, /\b(?:schüler(?:in)?|erziehungsberechtigte|elternbrief)\b/i],
    fieldRules: [
      { field: 'schoolReference', labels: ['Schülernummer', 'Aktenzeichen', 'Geschäftszeichen'] },
    ],
  },
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
    fieldRules: [
      { field: 'iban', labels: ['IBAN'] },
      { field: 'customerNumber', labels: ['Kundennummer', 'Kunden-Nr\\.?'] },
    ],
  },
  {
    documentType: 'Steuerdokument',
    category: 'Finanzen',
    subcategory: 'Steuern',
    tags: ['steuer', 'finanzamt'],
    patterns: [/\bsteuerbescheid\b/i, /\bfinanzamt\b/i, /\beinkommensteuer\b/i],
    fieldRules: [
      { field: 'taxNumber', labels: ['Steuernummer', 'Steuer-ID', 'Identifikationsnummer'] },
      { field: 'referenceNumber', labels: ['Aktenzeichen', 'Geschäftszeichen'] },
    ],
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
    fieldRules: [
      { field: 'insuranceNumber', labels: ['Versicherungsnummer', 'Versicherungs-Nr\\.?', 'Policennummer'] },
      { field: 'contractNumber', labels: ['Vertragsnummer', 'Vertrags-Nr\\.?'] },
    ],
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
    fieldRules: [
      { field: 'referenceNumber', labels: ['Aktenzeichen', 'Geschäftszeichen', 'Vorgangsnummer'] },
    ],
  },
  {
    documentType: 'Vertrag',
    category: 'Verträge',
    subcategory: 'Vertrag',
    tags: ['vertrag'],
    patterns: [/\bvertrag\b/i, /\bvertragsnummer\b/i, /\bvertragspartner\b/i],
    fieldRules: [
      { field: 'contractNumber', labels: ['Vertragsnummer', 'Vertrags-Nr\\.?'] },
      { field: 'customerNumber', labels: ['Kundennummer', 'Kunden-Nr\\.?'] },
    ],
  },
  {
    documentType: 'Rechnung',
    category: 'Finanzen',
    subcategory: 'Rechnungen',
    tags: ['rechnung'],
    patterns: [/\brechnung\b/i, /\brechnungs(?:nummer|datum|betrag)\b/i],
    fieldRules: [
      { field: 'invoiceNumber', labels: ['Rechnungsnummer', 'Rechnungs-Nr\\.?', 'Belegnummer'] },
      { field: 'customerNumber', labels: ['Kundennummer', 'Kunden-Nr\\.?'] },
      { field: 'iban', labels: ['IBAN'] },
    ],
  },
];

const monthNames =
  'Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember';
const dateValuePattern = `(?:\\d{1,2}[.\\-/]\\d{1,2}[.\\-/]\\d{2,4}|\\d{1,2}\\.\\s*(?:${monthNames})\\s+\\d{4})`;
const amountPattern =
  '((?:\\d{1,3}(?:[.\\s]\\d{3})+|\\d{1,6})[,.]\\d{2}\\s*(?:€|EUR)?)';
const baseRequestedFields: DocumentAnalysisField[] = [
  'title',
  'sender',
  'category',
  'documentType',
  'documentDate',
  'person',
];

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function isDocumentLabelLine(line: string) {
  return /^(?:Absender|Arbeitgeber(?:bezeichnung|daten)?|Betriebsname|Firma|Betrieb|Betriebsstätte|Institution|Versicherer|Arbeitnehmer(?:name)?|Arbeitnehmer Name|Name des Arbeitnehmers|Beschäftigtenname|Mitarbeitername|AN-Name|Mitarbeiter(?:\/in)?|Beschäftigte(?:r|n)?|Personalien|Versicherte(?:r|n)?|Patient(?:in)?|Schüler(?:in)?|Empfänger(?:\/in)?|Dokumentdatum|Rechnungsdatum|Ausstellungsdatum|Abrechnungsdatum|Datum der Abrechnung|Abrechnungsstichtag|Abrechnung vom|Erstellt am|Datum|Fälligkeitsdatum|Fälligkeit|zahlbar bis|Frist bis|spätestens am|Auszahlungsbetrag|Nettoauszahlung|Überweisungsbetrag|Nettoentgelt|Nettobetrag|Nettoverdienst|Netto[- ]Bezüge|Auszahlung netto)\s*[:\-]?$/i.test(
    line,
  );
}

function suggestion(
  value: string | string[],
  confidence: AnalysisConfidence,
  evidence: string,
): SuggestedValue<string | string[]> {
  return { value, confidence, evidence: evidence.trim().slice(0, 180) };
}

function findLabelValue(lines: string[], labels: string[]) {
  for (const [lineIndex, line] of lines.entries()) {
    for (const label of labels) {
      const match = line.match(new RegExp(`\\b${label}\\b\\s*[:\\-]?\\s*(.+)$`, 'i'));
      if (match?.[1]?.trim()) {
        return { value: match[1].trim(), evidence: line };
      }
      if (
        new RegExp(`^${label}\\s*[:\\-]?$`, 'i').test(line) &&
        lines[lineIndex + 1] &&
        !isDocumentLabelLine(lines[lineIndex + 1])
      ) {
        return {
          value: lines[lineIndex + 1],
          evidence: `${line} ${lines[lineIndex + 1]}`,
        };
      }
    }
  }
  return undefined;
}

function cleanEntityValue(value: string) {
  return value
    .replace(
      /\b(?:Arbeitnehmer(?:name)?|Mitarbeiter(?:\/in)?|Personalnummer|Pers\.?-?\s*Nr\.?|Steuernummer|Betriebsnummer|Geburtsdatum|Eintrittsdatum)\b.*$/i,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,:;\s-]+|[,:;\s-]+$/g, '')
    .trim();
}

function cleanStructuredValue(value: string) {
  return value
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,:;\s-]+|[,:;\s-]+$/g, '')
    .trim()
    .slice(0, 120);
}

function findProfileFields(lines: string[], rule?: DocumentRule) {
  const result: Partial<
    Record<DocumentAnalysisField, SuggestedValue<string | string[]>>
  > = {};
  for (const fieldRule of rule?.fieldRules ?? []) {
    const found = findLabelValue(lines, fieldRule.labels);
    const value = found ? cleanStructuredValue(found.value) : '';
    if (found && value.length >= 2) {
      result[fieldRule.field] = suggestion(value, 'high', found.evidence);
    }
  }
  return result;
}

function extractLegalEntity(line: string) {
  const match = line.match(
    /([\p{L}\d][\p{L}\d&.,'()\/\s-]{1,90}?\b(?:GmbH(?:\s*&\s*Co\.?\s*KG)?|UG(?:\s*\(haftungsbeschränkt\))?|AG|KG|OHG|e\.?\s*V\.?|Krankenkasse|Versicherung|Finanzamt|Stadtwerke))\b/iu,
  );
  return match?.[1] ? cleanEntityValue(match[1]) : undefined;
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

function findPayrollDate(text: string) {
  return findDateByLabel(text, [
    'Dokumentdatum',
    'Ausstellungsdatum',
    'Abrechnungsdatum',
    'Datum der Abrechnung',
    'Abrechnungsstichtag',
    'Abrechnung vom',
    'Erstellt am',
  ]);
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
    'Arbeitgeberbezeichnung',
    'Arbeitgeberdaten',
    'Betriebsname',
    'Firma',
    'Betrieb',
    'Betriebsstätte',
    'Institution',
    'Versicherer',
  ]);
  const labelledValue = labelled ? cleanEntityValue(labelled.value) : '';
  if (labelled && labelledValue.length >= 3 && labelledValue.length <= 100) {
    return {
      value: labelledValue,
      evidence: labelled.evidence,
      confidence: 'high' as const,
    };
  }

  const legalEntityLine = lines
    .slice(0, 15)
    .find((line) =>
      /\b(?:GmbH(?:\s*&\s*Co\.?\s*KG)?|AG|e\.?\s*V\.?|Krankenkasse|Versicherung|Finanzamt|Stadtwerke)\b/i.test(
        line,
      ),
    );
  const legalEntity = legalEntityLine ? extractLegalEntity(legalEntityLine) : undefined;
  if (legalEntity && legalEntity.length <= 100) {
    return {
      value: legalEntity,
      evidence: legalEntityLine ?? legalEntity,
      confidence: 'medium' as const,
    };
  }
  return undefined;
}

function findPerson(lines: string[], isPayroll: boolean) {
  const labelled = findLabelValue(lines, [
    'Arbeitnehmer(?:\\/in)?',
    'Arbeitnehmername',
    'Arbeitnehmer Name',
    'Name des Arbeitnehmers',
    'Beschäftigtenname',
    'Mitarbeitername',
    'AN-Name',
    'Mitarbeiter(?:\\/in)?',
    'Beschäftigte(?:r|n)?',
    'Personalien',
    'Versicherte(?:r|n)?',
    'Patient(?:in)?',
    'Schüler(?:in)?',
    'Empfänger(?:\\/in)?',
  ]);
  if (labelled) {
    const name = cleanEntityValue(
      labelled.value.replace(
        /\b(?:Personalnummer|Versichertennummer|Geburtsdatum|Eintrittsdatum)\b.*$/i,
        '',
      ),
    );
    if (/^[\p{L}][\p{L}\s.'-]{2,80}$/u.test(name)) {
      return { value: name, evidence: labelled.evidence, confidence: 'high' as const };
    }
  }

  for (let index = 0; index < Math.min(lines.length - 3, 35); index += 1) {
    const candidate = lines[index];
    const followingLines = lines.slice(index + 1, index + 4);
    if (
      /^[\p{Lu}][\p{L}.'-]+(?:\s+[\p{Lu}][\p{L}.'-]+){1,3}$/u.test(candidate) &&
      !/\b(?:GmbH|AG|KG|OHG|UG|e\.?\s*V\.?|Krankenkasse|Versicherung)\b/i.test(candidate) &&
      followingLines.some((line) =>
        /\b\d{4,5}\s+\p{L}/u.test(line),
      )
    ) {
      return {
        value: candidate,
        evidence: `${candidate} ${followingLines.join(' ')}`,
        confidence: 'medium' as const,
      };
    }
  }
  return undefined;
}

function findAmount(text: string, lines: string[], documentType?: string) {
  const labels: Array<{ label: string; confidence: AnalysisConfidence }> =
    documentType === 'Lohnabrechnung / Gehaltsabrechnung'
      ? [
          { label: 'Netto-Auszahlungsbetrag', confidence: 'high' },
          { label: 'Netto Auszahlungsbetrag', confidence: 'high' },
          { label: 'Nettoauszahlung', confidence: 'high' },
          { label: 'Auszahlungsbetrag', confidence: 'high' },
          { label: 'Auszahlung netto', confidence: 'high' },
          { label: 'Netto-Bezüge', confidence: 'medium' },
          { label: 'Netto Bezüge', confidence: 'medium' },
        ]
      : [
          { label: 'Rechnungsbetrag', confidence: 'high' },
          { label: 'Gesamtbetrag', confidence: 'high' },
          { label: 'Zahlbetrag', confidence: 'high' },
          { label: 'Forderungsbetrag', confidence: 'high' },
          { label: 'Zu zahlen', confidence: 'high' },
        ];
  for (const { label, confidence } of labels) {
    for (const [lineIndex, line] of lines.entries()) {
      const forward = line.match(
        new RegExp(`\\b${label}\\b\\s*[:=\\-]?\\s*${amountPattern}`, 'i'),
      );
      if (forward?.[1]) {
        return {
          value: forward[1].replace(/\s+/g, ' ').trim(),
          evidence: forward[0],
          confidence,
        };
      }
      const reverse = line.match(
        new RegExp(`${amountPattern}\\s*[:=\\-]?\\s*\\b${label}\\b`, 'iu'),
      );
      if (reverse?.[1]) {
        return {
          value: reverse[1].replace(/\s+/g, ' ').trim(),
          evidence: reverse[0],
          confidence,
        };
      }
      if (
        new RegExp(`^${label}\\s*[:\\-]?$`, 'i').test(line) &&
        lines[lineIndex + 1] &&
        !isDocumentLabelLine(lines[lineIndex + 1])
      ) {
        const amount = lines[lineIndex + 1].match(
          new RegExp(`^\\s*${amountPattern}`, 'i'),
        );
        if (amount?.[1]) {
          return {
            value: amount[1].replace(/\s+/g, ' ').trim(),
            evidence: `${line} ${lines[lineIndex + 1]}`,
            confidence,
          };
        }
      }
    }
  }
  return undefined;
}

function findPayrollPeriod(text: string) {
  const periodPattern = `((?:${monthNames})\\s+\\d{4}|(?:0?[1-9]|1[0-2])[.\\-/]\\d{4})`;
  const patterns = [
    new RegExp(
      `\\b(?:Abrechnungsmonat|Abrechnungszeitraum|Abrechnungsperiode|Entgeltabrechnung|Abrechnung)\\b\\s*(?:für\\s+(?:den\\s+)?Monat\\s+|für\\s+|im\\s+Monat\\s+|[:\\-]?\\s*)${periodPattern}`,
      'i',
    ),
    new RegExp(
      `\\bfür\\s+(?:den\\s+)?Monat\\s+${periodPattern}`,
      'i',
    ),
    new RegExp(`\\bMonat\\b\\s*[:\\-]?\\s*${periodPattern}`, 'i'),
  ];
  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean);
  return match?.[1]?.replace(/\bMaerz\b/i, 'März');
}

function uniqueTags(values: Array<string | undefined>) {
  const result: string[] = [];
  for (const value of values) {
    const normalized = value?.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    if (!result.some((existing) => existing.toLocaleLowerCase('de') === normalized.toLocaleLowerCase('de'))) {
      result.push(normalized);
    }
  }
  return result;
}

export function analyzeGermanDocumentText(rawText: string): DocumentAnalysisResult {
  const text = rawText.replace(/\u0000/g, '').trim();
  const fields: DocumentAnalysisResult['fields'] = {};
  if (!text) {
    return {
      text: '',
      fields,
      uncertainFields: [],
      unresolvedFields: baseRequestedFields,
    };
  }

  const lines = normalizeLines(text);
  const detected = detectRule(text);
  const documentType = detected?.rule.documentType;
  const isPayroll = documentType === 'Lohnabrechnung / Gehaltsabrechnung';

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
  }

  const sender = findSender(lines);
  if (sender) fields.sender = suggestion(sender.value, sender.confidence, sender.evidence);

  const documentDate = isPayroll
    ? findPayrollDate(text)
    : findDateByLabel(text, [
        'Dokumentdatum',
        'Rechnungsdatum',
        'Ausstellungsdatum',
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

  const amount = findAmount(text, lines, documentType);
  if (amount) {
    fields.amount = suggestion(amount.value, amount.confidence, amount.evidence);
  }

  const person = findPerson(lines, isPayroll);
  if (person) {
    fields.person = suggestion(person.value, person.confidence, person.evidence);
  }

  Object.assign(fields, findProfileFields(lines, detected?.rule));

  const payrollPeriod =
    isPayroll
      ? findPayrollPeriod(text)
      : undefined;
  if (payrollPeriod) {
    fields.payrollPeriod = suggestion(payrollPeriod, 'high', payrollPeriod);
  }
  if (isPayroll && payrollPeriod) {
    const title = fields.sender?.value
      ? `Lohnabrechnung ${payrollPeriod} – ${fields.sender.value}`
      : `Lohnabrechnung ${payrollPeriod}`;
    fields.title = suggestion(title, fields.sender ? 'high' : 'medium', payrollPeriod);
  } else if (isPayroll && fields.sender?.value) {
    fields.title = suggestion(
      `Lohnabrechnung – ${fields.sender.value}`,
      'medium',
      `${documentType}; ${fields.sender.evidence}`,
    );
  } else if (documentType && fields.sender?.value) {
    fields.title = suggestion(
      `${documentType} – ${fields.sender.value}`,
      'medium',
      `${documentType}; ${fields.sender.evidence}`,
    );
  } else if (documentType) {
    fields.title = suggestion(documentType, 'medium', detected?.evidence ?? documentType);
  }

  if (detected) {
    const senderTag =
      typeof fields.sender?.value === 'string' ? fields.sender.value : undefined;
    const tags = uniqueTags([
      ...detected.rule.tags,
      senderTag,
      isPayroll ? payrollPeriod : undefined,
    ]);
    fields.tags = suggestion(
      tags,
      detected.score >= 2 ? 'high' : 'medium',
      [detected.evidence, senderTag, payrollPeriod].filter(Boolean).join('; '),
    );
  }

  const uncertainFields = (Object.entries(fields) as [
    DocumentAnalysisField,
    SuggestedValue<string | string[]>,
  ][])
    .filter(([, value]) => value.confidence === 'medium')
    .map(([field]) => field);

  const profileRequestedFields =
    detected?.rule.fieldRules?.map((fieldRule) => fieldRule.field) ?? [];
  const financialDocument =
    isPayroll ||
    /(?:Rechnung|Mahnung|Zahlungsaufforderung|Kontoauszug|Steuerdokument|Versicherungsbrief)/.test(
      documentType ?? '',
    );
  const requestedFields = uniqueTags([
    ...baseRequestedFields,
    ...profileRequestedFields,
    isPayroll ? 'payrollPeriod' : undefined,
    financialDocument ? 'amount' : undefined,
  ]) as DocumentAnalysisField[];
  const unresolvedFields = requestedFields.filter((field) => !fields[field]);

  return { text, fields, uncertainFields, unresolvedFields };
}