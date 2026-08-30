import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db, documentaAuditEvents, documentaBatchJobs, documentaBatchPages, documentaCorrections, documentaDocuments, documentaEvidence, documentaIntelligence, documentaPages, documentaProviderUsage, documentaRelations, documentaSessionIssuance, documentaValidationRecords } from "@workspace/db";
import { Router, type IRouter, type RequestHandler } from "express";
import { mapFieldsToPages, OCR_PAGE_SEPARATOR, parseGeminiFields, type ParsedField } from "../lib/documentaFields";
import { extractInvoiceEssentials, mergeEvidenceFields } from "../lib/documentaInvoiceFields";
import { hasUnsupportedCloudMime, normalizeDocumentAiError } from "../lib/documentaProviderErrors";

const router: IRouter = Router();
const MAX_TEXT_BYTES = 256 * 1024;
const MAX_CLOUD_PAGE_BYTES = 4 * 1024 * 1024;
const MAX_CLOUD_PAGES_PER_REQUEST = 5;
const MAX_PAGES_PER_BATCH = 50;
const DOCUMENT_AI_EUR_PER_PAGE_ESTIMATE = 0.015;
const GEMINI_FLASH_EUR_PER_1K_TOKENS_ESTIMATE = 0.0001;
const GEMINI_PRO_EUR_PER_1K_TOKENS_ESTIMATE = 0.001;
const DAILY_REQUEST_LIMIT = 30;
const MONTHLY_REQUEST_LIMIT = 400;
// Hard platform ceilings cap anonymous UUID/IP rotation. At the conservative
// Pro estimate these remain below roughly €8/day and €120/month.
const GLOBAL_DAILY_PROVIDER_LIMIT = 500;
const GLOBAL_MONTHLY_PROVIDER_LIMIT = 8_000;
const SESSION_LIFETIME_SECONDS = 24 * 60 * 60;
const DOCUMENT_FAMILIES = ["identity", "financial", "insurance", "medical", "legal", "government", "employment", "education", "housing", "utilities", "travel", "vehicle", "tax", "commerce", "communication", "membership", "other"] as const;
type Family = (typeof DOCUMENT_FAMILIES)[number] | "unknown/novel";
type PaidProvider = "google_document_ai" | "gemini_flash" | "gemini_pro";

declare global {
  namespace Express {
    interface Request { documentaUserId?: string }
  }
}

function error(response: Parameters<RequestHandler>[1], status: number, code: string, message: string) {
  response.status(status).json({ error: code, message });
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

function installationUserId(installationId: string, secret: string) {
  // This irreversible HMAC is the sole installation-derived value retained.
  return createHmac("sha256", secret).update(`documenta-installation:v1:${installationId}`).digest("hex");
}

function mintBearerToken(userId: string, secret: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp })).toString("base64url");
  const signature = createHmac("sha256", secret).update(`documenta-api:v1:${payload}`).digest("hex");
  return { token: `${payload}.${signature}`, expiresAt: new Date(exp * 1000).toISOString() };
}

function decodeBase64Url(input: string) {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

/** Signed bearer token: base64url(JSON {sub,exp}).hex(HMAC-SHA256(payload)). */
export const requireDocumentaAuth: RequestHandler = (request, response, next) => {
  const raw = request.header("authorization");
  const token = raw?.startsWith("Bearer ") ? raw.slice(7) : "";
  const [payload, signature, extra] = token.split(".");
  const secret = sessionSecret();
  if (!secret) return error(response, 503, "auth_not_configured", "Documenta authentication is not configured.");
  if (!payload || !signature || extra || !/^[a-f0-9]{64}$/i.test(signature)) return error(response, 401, "unauthorized", "A valid bearer token is required.");
  const expected = createHmac("sha256", secret).update(`documenta-api:v1:${payload}`).digest();
  const supplied = Buffer.from(signature, "hex");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return error(response, 401, "unauthorized", "A valid bearer token is required.");
  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as { sub?: unknown; exp?: unknown };
    if (typeof claims.sub !== "string" || !/^[A-Za-z0-9:_-]{1,128}$/.test(claims.sub) || typeof claims.exp !== "number" || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= Date.now()) {
      return error(response, 401, "unauthorized", "The bearer token is expired or invalid.");
    }
    request.documentaUserId = claims.sub;
    next();
  } catch { return error(response, 401, "unauthorized", "A valid bearer token is required."); }
};

function asObject(body: unknown): Record<string, unknown> | undefined {
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : undefined;
}

function anonymousThrottleHash(secret: string, kind: "ip" | "installation", value: string) {
  return createHmac("sha256", secret).update(`documenta-anonymous-${kind}:v1:${value}`).digest("hex");
}
function text(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim().length > 0 && Buffer.byteLength(value, "utf8") <= maximum ? value.trim() : undefined;
}
function isoDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : undefined;
  return date && !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}
export function validIban(value: string) {
  const normalized = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)) return false;
  const moved = normalized.slice(4) + normalized.slice(0, 4);
  let remainder = 0;
  for (const char of moved) for (const digit of (/[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char)) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}
function classify(input: string): { family: Family; type: string; confidence: number } {
  const lower = input.toLowerCase();
  const rules: Array<[Family, string, RegExp]> = [
    ["medical", "medical_document", /\b(patient|diagnosis|prescription|referral|laboratory|orvos|recept|beutaló|befund|arzt|rezept)\b/i],
    ["government", "authority_notice", /\b(authority|official notice|hatóság|határozat|bescheid|behörde|antrag)\b/i],
    ["legal", "fine_or_legal_document", /\b(court|fine|penalty|appeal|bíróság|bírság|fellebbezés|gericht|bußgeld|einspruch)\b/i],
    ["commerce", "receipt", /\b(receipt|cash register|nyugta|blokk|kassenbon|quittung)\b/i],
    ["commerce", "product_or_warranty", /\b(warranty|serial number|repair|garancia|jótállás|javítás|garantie|seriennummer|reparatur)\b/i],
    ["commerce", "online_order", /\b(order confirmation|shipping|return|refund|rendelés|szállítás|visszaküldés|bestellung|versand|retoure)\b/i],
    ["financial", "invoice", /\b(invoice|rechnung|számla)\b/i],
    ["financial", "financial_document", /\b(bank statement|loan|credit|iban|bankszámla|hitel|kontoauszug|darlehen|kredit)\b/i],
    ["employment", "hr_document", /\b(salary|employment|payslip|munkaviszony|fizetési jegyzék|gehalt|arbeitsvertrag|lohnabrechnung)\b/i],
    ["tax", "tax_document", /\b(tax|adó|steuer|finanzamt)\b/i],
    ["insurance", "insurance_document", /\b(insurance|policy|claim|biztosítás|kárigény|versicherung|police|schaden)\b/i],
    ["legal", "contract", /\b(contract|agreement|termination|szerződés|felmondás|vertrag|kündigung|vereinbarung)\b/i],
    ["housing", "real_estate_document", /\b(lease|rent|property|bérlet|ingatlan|mietvertrag|miete|immobilie)\b/i],
    ["education", "education_document", /\b(school|university|certificate|iskola|egyetem|bizonyítvány|schule|universität|zeugnis)\b/i],
    ["utilities", "utility_bill", /\b(utility|közmű|kwh|strom|erdgas|gasrechnung)\b/i],
    ["travel", "logistics_document", /\b(tracking|delivery note|consignment|fuvarlevél|kézbesítés|sendung|lieferschein)\b/i],
    ["vehicle", "vehicle_document", /\b(vehicle|registration|service record|jármű|forgalmi|gépjármű|fahrzeug|zulassung|hauptuntersuchung)\b/i],
  ];
  const match = rules.find((rule) => rule[2].test(lower));
  return match ? { family: match[0], type: match[1], confidence: 0.72 } : { family: "unknown/novel", type: "unknown/novel", confidence: 0.3 };
}
function deterministicExtraction(input: string) {
  const iban = input.match(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/i)?.[0];
  const dates = [...input.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map((m) => m[0]).filter((value) => isoDate(value));
  const amounts = [...input.matchAll(/\b\d{1,3}(?:[ ,.]\d{3})*(?:[,.]\d{2})\s?(?:EUR|USD|HUF|Ft|€)\b/gi)].map((m) => m[0]);
  return { iban: iban && validIban(iban) ? iban.replace(/\s/g, "").toUpperCase() : undefined, dates, amounts };
}
function evidenceForText(input: string) {
  const values: Array<{ field: string; value: string; startOffset: number; endOffset: number; state: string; rule: string }> = [];
  for (const match of input.matchAll(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/gi)) values.push({ field: "iban", value: match[0], startOffset: match.index, endOffset: match.index + match[0].length, state: validIban(match[0]) ? "VALIDATED" : "INVALID", rule: "iban_mod_97" });
  for (const match of input.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) values.push({ field: "date", value: match[0], startOffset: match.index, endOffset: match.index + match[0].length, state: isoDate(match[0]) ? "VALIDATED" : "INVALID", rule: "iso_8601_date" });
  for (const match of input.matchAll(/\b\d{1,3}(?:[ ,.]\d{3})*(?:[,.]\d{2})\s?(?:EUR|USD|HUF|Ft|€)\b/gi)) values.push({ field: "amount", value: match[0], startOffset: match.index, endOffset: match.index + match[0].length, state: "PARTIALLY_VALIDATED", rule: "currency_amount_format" });
  return values;
}
type CloudPage = { contentBase64: string; mimeType: "image/jpeg" | "image/png" };
function readCloudPages(value: unknown): CloudPage[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CLOUD_PAGES_PER_REQUEST) return undefined;
  const result: CloudPage[] = [];
  for (const item of value) {
    const page = asObject(item); const contentBase64 = typeof page?.contentBase64 === "string" ? page.contentBase64 : "";
    const mimeType = page?.mimeType;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(contentBase64) || !["image/jpeg", "image/png"].includes(String(mimeType))) return undefined;
    const content = Buffer.from(contentBase64, "base64");
    if (!content.length || content.length > MAX_CLOUD_PAGE_BYTES || content.toString("base64") !== contentBase64) return undefined;
    result.push({ contentBase64, mimeType: mimeType as CloudPage["mimeType"] });
  }
  return result;
}
async function documentAiOcr(userId: string, pages: CloudPage[], operationPrefix: string) {
  const processorName = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_NAME;
  const credentialsJson = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON;
  if (!processorName || !credentialsJson) throw new Error("document_ai_not_configured");
  let credentials: object;
  try { credentials = JSON.parse(credentialsJson) as object; } catch { throw new Error("document_ai_not_configured"); }
  try {
    const { DocumentProcessorServiceClient } = await (new Function("specifier", "return import(specifier)")("@google-cloud/documentai") as Promise<any>);
    const location = /^projects\/[^/]+\/locations\/([^/]+)\/processors\/[^/]+$/.exec(processorName)?.[1];
    if (!location || !/^[a-z0-9-]+$/i.test(location)) throw new Error("document_ai_not_configured");
    // Document AI is regional. The default SDK endpoint is US and rejects EU
    // processor names even when IAM and the processor resource are valid.
    const client = new DocumentProcessorServiceClient({
      credentials,
      apiEndpoint: `${location}-documentai.googleapis.com`,
    });
    const texts: string[] = [];
    for (const [index, page] of pages.entries()) {
      const usage = await reserveProvider(userId, "google_document_ai", "enterprise_document_ocr", `${operationPrefix}:document-ai:${index}`, 1, 0);
      if (!usage) throw new Error("quota_exceeded");
      try {
        const [result] = await client.processDocument({ name: processorName, rawDocument: { content: Buffer.from(page.contentBase64, "base64"), mimeType: page.mimeType } });
        if (!result.document?.text) throw new Error("document_ai_empty_result");
        await settleProvider(usage.id, "SUCCEEDED", 0, DOCUMENT_AI_EUR_PER_PAGE_ESTIMATE);
        texts.push(result.document.text);
      } catch (caught) {
        await settleProvider(usage.id, "FAILED_RELEASED");
        throw caught;
      }
    }
    return texts;
  } catch (caught) {
    throw new Error(normalizeDocumentAiError(caught));
  }
}
function periodBounds() {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { now, dayStart, monthStart };
}
async function reserveProvider(userId: string, provider: PaidProvider, model: string, operationId: string, inputPages: number, inputTokens: number) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(2147483001)`);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const { now, dayStart, monthStart } = periodBounds();
    const active = sql`${documentaProviderUsage.state} in ('RESERVED', 'SUCCEEDED')`;
    const [[daily], [monthly], [globalDaily], [globalMonthly]] = await Promise.all([
      tx.select({ count: sql<number>`count(*)` }).from(documentaProviderUsage).where(and(eq(documentaProviderUsage.userId, userId), active, gte(documentaProviderUsage.createdAt, dayStart), lt(documentaProviderUsage.createdAt, now))),
      tx.select({ count: sql<number>`count(*)` }).from(documentaProviderUsage).where(and(eq(documentaProviderUsage.userId, userId), active, gte(documentaProviderUsage.createdAt, monthStart), lt(documentaProviderUsage.createdAt, now))),
      tx.select({ count: sql<number>`count(*)` }).from(documentaProviderUsage).where(and(active, gte(documentaProviderUsage.createdAt, dayStart), lt(documentaProviderUsage.createdAt, now))),
      tx.select({ count: sql<number>`count(*)` }).from(documentaProviderUsage).where(and(active, gte(documentaProviderUsage.createdAt, monthStart), lt(documentaProviderUsage.createdAt, now))),
    ]);
    if (Number(daily.count) >= DAILY_REQUEST_LIMIT || Number(monthly.count) >= MONTHLY_REQUEST_LIMIT ||
      Number(globalDaily.count) >= GLOBAL_DAILY_PROVIDER_LIMIT || Number(globalMonthly.count) >= GLOBAL_MONTHLY_PROVIDER_LIMIT) return undefined;
    if (provider === "gemini_pro") {
      const [calls] = await tx.select({
        base: sql<number>`count(*) filter (where ${documentaProviderUsage.provider} = 'gemini_flash' and ${documentaProviderUsage.state} = 'SUCCEEDED')`,
        pro: sql<number>`count(*) filter (where ${documentaProviderUsage.provider} = 'gemini_pro' and ${documentaProviderUsage.state} in ('RESERVED','SUCCEEDED'))`,
      }).from(documentaProviderUsage).where(and(eq(documentaProviderUsage.userId, userId), gte(documentaProviderUsage.createdAt, monthStart)));
      if (Number(calls.pro) + 1 > Number(calls.base) * 0.15) return undefined;
    }
    const [row] = await tx.insert(documentaProviderUsage).values({ userId, provider, model, operationId, state: "RESERVED", inputPages, inputTokens }).returning();
    return row;
  });
}
async function settleProvider(id: string, state: "SUCCEEDED" | "FAILED_RELEASED", outputTokens = 0, estimatedEur = 0) {
  await db.update(documentaProviderUsage).set({ state, outputTokens, estimatedEur: state === "SUCCEEDED" ? estimatedEur : 0, updatedAt: new Date() }).where(and(eq(documentaProviderUsage.id, id), eq(documentaProviderUsage.state, "RESERVED")));
}
async function callGemini(userId: string, operationId: string, ocrText: string, usePro: boolean, correctionHints: string[] = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("gemini_not_configured");
  // Keep the SDK server-only. Indirect dynamic import also makes a missing optional
  // deployment dependency an explicit runtime cloud error rather than client bundling.
  const { GoogleGenAI } = await (new Function("specifier", "return import(specifier)")("@google/genai") as Promise<{ GoogleGenAI: new (options: { apiKey: string }) => { models: { generateContent: (input: unknown) => Promise<{ text?: string }> } } }>);
  // Gemini 2.5 is listed by the models endpoint but rejects newly provisioned
  // API keys at generation time. Keep these names aligned with models that the
  // configured project can actually invoke.
  const model = usePro ? "gemini-3.1-pro-preview" : "gemini-3.6-flash";
  const prompt = `Return only JSON matching this schema: {"family": one of ${JSON.stringify(DOCUMENT_FAMILIES)}, "type":string, "summary":string, "confidence":number 0..1, "fields":[{"name":string,"value":string,"confidence":number 0..1,"validationState":"UNVALIDATED"|"PARTIALLY_VALIDATED"|"VALIDATED"|"INVALID","evidence":[{"text":string,"start":integer,"end":integer,"pageIndex":integer}]}]}. family MUST be one listed value, never unknown/novel. For EVERY field, value must be the literal OCR substring (no trimming, normalization, or inferred text), and evidence.text must exactly equal OCR.slice(start,end), using JavaScript UTF-16 offsets into the complete OCR string. Omit any field you cannot support with one exact span. Do not infer facts absent from OCR. Hints may improve labels but cannot add facts: ${correctionHints.join(", ").slice(0, 2000)}\nOCR:\n${ocrText}`;
  let lastError: unknown;
  const inputTokens = Math.ceil(prompt.length / 4);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const attemptOperationId = `${operationId}:attempt-${attempt + 1}`;
    const usage = await reserveProvider(userId, usePro ? "gemini_pro" : "gemini_flash", model, attemptOperationId, 0, inputTokens);
    if (!usage) throw new Error(usePro ? "pro_quota_unavailable" : "quota_exceeded");
    try {
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", temperature: 0 } });
      const parsed = JSON.parse(result.text || "{}") as Record<string, unknown>;
      const outputTokens = Math.ceil((result.text?.length ?? 0) / 4);
      await settleProvider(usage.id, "SUCCEEDED", outputTokens, (inputTokens + outputTokens) / 1000 * (usePro ? GEMINI_PRO_EUR_PER_1K_TOKENS_ESTIMATE : GEMINI_FLASH_EUR_PER_1K_TOKENS_ESTIMATE));
      return { model, result: parsed, usageId: usage.id };
    } catch (caught) {
      await settleProvider(usage.id, "FAILED_RELEASED");
      lastError = caught;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw lastError;
}

/** Anonymous bootstrap only: converts a random installation UUID to a pseudonymous subject. */
router.post("/documenta/auth/session", async (request, response) => {
  const installationId = asObject(request.body)?.installationId;
  const secret = sessionSecret();
  // UUIDv4 means the app, not a stable hardware identifier, owns this random value.
  if (typeof installationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(installationId)) {
    return error(response, 400, "invalid_installation_id", "installationId must be a random UUIDv4.");
  }
  if (!secret) return error(response, 503, "auth_not_configured", "Documenta authentication is not configured.");
  const userId = installationUserId(installationId.toLowerCase(), secret);
  const normalizedIp = (request.ip || "unknown").replace(/^::ffff:/, "").toLowerCase();
  const ipHash = anonymousThrottleHash(secret, "ip", normalizedIp);
  const installationHash = anonymousThrottleHash(secret, "installation", installationId.toLowerCase());
  try {
    const allowed = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ipHash}))`);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${installationHash}))`);
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      await tx.delete(documentaSessionIssuance).where(lt(documentaSessionIssuance.expiresAt, now));
      const [[ipDaily], [knownInstall], [installHourly]] = await Promise.all([
        tx.select({ count: sql<number>`count(distinct ${documentaSessionIssuance.installationHash})` }).from(documentaSessionIssuance).where(and(eq(documentaSessionIssuance.ipHash, ipHash), gte(documentaSessionIssuance.issuedAt, dayAgo))),
        tx.select({ count: sql<number>`count(*)` }).from(documentaSessionIssuance).where(and(eq(documentaSessionIssuance.ipHash, ipHash), eq(documentaSessionIssuance.installationHash, installationHash), gte(documentaSessionIssuance.issuedAt, dayAgo))),
        tx.select({ count: sql<number>`count(*)` }).from(documentaSessionIssuance).where(and(eq(documentaSessionIssuance.installationHash, installationHash), gte(documentaSessionIssuance.issuedAt, hourAgo))),
      ]);
      if ((Number(knownInstall.count) === 0 && Number(ipDaily.count) >= 5) || Number(installHourly.count) >= 3) return false;
      await tx.insert(documentaSessionIssuance).values({ ipHash, installationHash, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) });
      // No raw installation ID, IP, token, or secret is included in audit metadata.
      await tx.insert(documentaAuditEvents).values({ userId, eventType: "installation_session_minted", metadata: { lifetimeSeconds: SESSION_LIFETIME_SECONDS } });
      return true;
    });
    if (!allowed) return error(response, 429, "session_rate_limited", "Anonymous session issuance limit reached. Please try again later.");
  } catch {
    return error(response, 503, "audit_unavailable", "A secure session could not be created at this time.");
  }
  const session = mintBearerToken(userId, secret);
  response.status(201).set("Cache-Control", "no-store").json({ tokenType: "Bearer", accessToken: session.token, expiresAt: session.expiresAt });
});

router.use(requireDocumentaAuth);

router.get("/documenta/cloud-status", async (request, response) => {
  const userId = request.documentaUserId!;
  const { now, dayStart, monthStart } = periodBounds();
  const active = sql`${documentaProviderUsage.state} in ('RESERVED', 'SUCCEEDED')`;
  const [[daily], [monthly]] = await Promise.all([
    db.select({ requests: sql<number>`count(*)` }).from(documentaProviderUsage).where(and(eq(documentaProviderUsage.userId, userId), active, gte(documentaProviderUsage.createdAt, dayStart), lt(documentaProviderUsage.createdAt, now))),
    db.select({ requests: sql<number>`count(*)`, proRequests: sql<number>`count(*) filter (where ${documentaProviderUsage.provider} = 'gemini_pro' and ${documentaProviderUsage.state} = 'SUCCEEDED')` }).from(documentaProviderUsage).where(and(eq(documentaProviderUsage.userId, userId), active, gte(documentaProviderUsage.createdAt, monthStart), lt(documentaProviderUsage.createdAt, now))),
  ]);
  response.json({
    documentAi: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_NAME && process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON
      ? "CONFIGURED"
      : "NOT_CONFIGURED",
    gemini: process.env.GEMINI_API_KEY ? "CONFIGURED" : "NOT_CONFIGURED",
    quota: {
      daily: { limit: DAILY_REQUEST_LIMIT, used: Number(daily?.requests ?? 0), remaining: Math.max(0, DAILY_REQUEST_LIMIT - Number(daily?.requests ?? 0)) },
      monthly: { limit: MONTHLY_REQUEST_LIMIT, used: Number(monthly?.requests ?? 0), remaining: Math.max(0, MONTHLY_REQUEST_LIMIT - Number(monthly?.requests ?? 0)) },
      proFallback: { used: Number(monthly?.proRequests ?? 0), maximumFraction: 0.15 },
    },
  });
});

router.post("/documenta/documents/process", async (request, response) => {
  const body = asObject(request.body); let ocrText = text(body?.ocrText, MAX_TEXT_BYTES); const title = text(body?.title, 255) ?? "Untitled document";
  const cloudOptIn = body?.cloudOptIn === true;
  const processOperationId = randomUUID();
  if (hasUnsupportedCloudMime(body?.cloudPages)) return error(response, 415, "unsupported_cloud_mime", "Cloud OCR supports JPEG and PNG images only.");
  const cloudPages = cloudOptIn && body?.cloudPages !== undefined ? readCloudPages(body.cloudPages) : undefined;
  if ((!ocrText && !cloudPages) || (body?.cloudPages !== undefined && !cloudOptIn) || (body?.cloudPages !== undefined && !cloudPages)) return error(response, 400, "invalid_request", `ocrText or bounded cloudPages are required; cloud page content is limited to ${MAX_CLOUD_PAGE_BYTES} bytes.`);
  let ocrPageTexts: string[] = ocrText ? [ocrText] : [];
  if (cloudPages) {
    try { ocrPageTexts = await documentAiOcr(request.documentaUserId!, cloudPages, processOperationId); ocrText = ocrPageTexts.join(OCR_PAGE_SEPARATOR); }
    catch (caught) {
      const code = caught instanceof Error ? caught.message : "document_ai_failed";
      return error(response, code === "quota_exceeded" ? 429 : code === "document_ai_not_configured" ? 503 : 502, code === "quota_exceeded" ? "quota_exceeded" : code === "document_ai_not_configured" ? "cloud_not_configured" : "cloud_ocr_failed", code === "quota_exceeded" ? "Daily or monthly provider-call limit reached." : code === "document_ai_not_configured" ? "Google Document AI is not configured." : "Google Document AI could not process the supplied pages.");
    }
  }
  if (!ocrText) return error(response, 502, "cloud_ocr_failed", "Google Document AI returned no OCR text.");
  const local = classify(ocrText); const extraction = deterministicExtraction(ocrText);
  let analysis: { family: Family; type: string; confidence: number; summary?: string; model: string; fields: ParsedField[] } = { ...local, summary: undefined, model: "deterministic", fields: [] };
  let correctionHintsUsed = 0;
  if (cloudOptIn) {
    try {
      const corrections = await db.select({ field: documentaCorrections.field }).from(documentaCorrections)
        .innerJoin(documentaIntelligence, eq(documentaCorrections.documentId, documentaIntelligence.documentId))
        .where(and(eq(documentaCorrections.userId, request.documentaUserId!), eq(documentaIntelligence.userId, request.documentaUserId!), eq(documentaIntelligence.type, local.type))).limit(20);
      const hints = corrections.filter((correction) => /^(type|family|purpose|category)$/i.test(correction.field)).map((correction) => `user corrected label field: ${correction.field}`);
      correctionHintsUsed = hints.length;
      const flash = await callGemini(request.documentaUserId!, `${processOperationId}:flash`, ocrText, false, hints);
      const confidence = typeof flash.result.confidence === "number" ? flash.result.confidence : 0;
      const family = DOCUMENT_FAMILIES.includes(flash.result.family as (typeof DOCUMENT_FAMILIES)[number]) ? flash.result.family as Family : "unknown/novel";
       analysis = { family: family === "unknown/novel" ? (local.family === "unknown/novel" ? "other" : local.family) : family, type: text(flash.result.type, 100) ?? local.type, confidence, summary: text(flash.result.summary, 2000), model: flash.model, fields: parseGeminiFields(flash.result.fields, ocrText) };
      // Pro is only attempted for low-confidence/invalid Flash output; quota remains auditable.
      if (confidence < 0.55 || family === "unknown/novel") {
        try {
          const pro = await callGemini(request.documentaUserId!, `${processOperationId}:pro`, ocrText, true, hints);
           const proFamily = DOCUMENT_FAMILIES.includes(pro.result.family as (typeof DOCUMENT_FAMILIES)[number]) ? pro.result.family as Family : (local.family === "unknown/novel" ? "other" : local.family);
           analysis = { family: proFamily, type: text(pro.result.type, 100) ?? local.type, confidence: typeof pro.result.confidence === "number" ? pro.result.confidence : 0, summary: text(pro.result.summary, 2000), model: pro.model, fields: parseGeminiFields(pro.result.fields, ocrText) };
        } catch (caught) {
          if (!(caught instanceof Error && caught.message === "pro_quota_unavailable")) throw caught;
        }
      }
    } catch (caught) {
      if (caught instanceof Error && caught.message === "gemini_not_configured") return error(response, 503, "cloud_not_configured", "Cloud intelligence was requested but GEMINI_API_KEY is not configured.");
      if (caught instanceof Error && caught.message === "quota_exceeded") return error(response, 429, "quota_exceeded", "Daily or monthly provider-call limit reached.");
      return error(response, 502, "cloud_processing_failed", "Cloud intelligence could not complete after retries.");
    }
  }
  analysis.fields = mapFieldsToPages(mergeEvidenceFields(analysis.fields, extractInvoiceEssentials(ocrText)), ocrPageTexts);
  const userId = request.documentaUserId!;
  const [providerTotals] = await db.select({ estimatedEur: sql<number>`coalesce(sum(${documentaProviderUsage.estimatedEur}), 0)` }).from(documentaProviderUsage)
    .where(and(eq(documentaProviderUsage.userId, userId), eq(documentaProviderUsage.state, "SUCCEEDED"), sql`${documentaProviderUsage.operationId} like ${`${processOperationId}:%`}`));
  const created = await db.transaction(async (tx) => {
    const [document] = await tx.insert(documentaDocuments).values({ userId, title, source: cloudOptIn ? "cloud_opt_in" : "local_ocr", cloudOptIn }).returning();
    const pages = await tx.insert(documentaPages).values(ocrPageTexts.map((pageText, index) => ({ userId, documentId: document.id, pageNumber: index + 1, ocrText: pageText, ocrProvider: cloudPages ? "google_document_ai" : "client_ocr" }))).returning();
    const [intelligenceRow] = await tx.insert(documentaIntelligence).values({ userId, documentId: document.id, family: analysis.family, type: analysis.type, summary: analysis.summary, confidence: analysis.confidence, validationState: extraction.iban || extraction.dates.length || extraction.amounts.length || analysis.fields.length ? "PARTIALLY_VALIDATED" : "UNVALIDATED", extraction: { ...extraction, fields: analysis.fields }, model: analysis.model }).returning();
    const intelligence = { ...intelligenceRow, fields: analysis.fields };
    const evidence = ocrPageTexts.flatMap((pageText, pageIndex) => evidenceForText(pageText).map((entry) => ({ ...entry, pageNumber: pageIndex + 1 })));
    if (evidence.length) {
      await tx.insert(documentaEvidence).values(evidence.map((entry) => ({ userId, intelligenceId: intelligenceRow.id, documentId: document.id, field: entry.field, value: entry.value, pageNumber: entry.pageNumber, startOffset: entry.startOffset, endOffset: entry.endOffset, confidence: entry.state === "VALIDATED" ? 1 : 0.7, validationState: entry.state })));
      await tx.insert(documentaValidationRecords).values(evidence.map((entry) => ({ userId, intelligenceId: intelligenceRow.id, field: entry.field, state: entry.state, rule: entry.rule })));
    }
    if (analysis.fields.length) {
      await tx.insert(documentaEvidence).values(analysis.fields.map((field) => ({ userId, intelligenceId: intelligenceRow.id, documentId: document.id, field: field.name, value: field.value, pageNumber: field.evidence[0].pageIndex + 1, startOffset: field.evidence[0].start, endOffset: field.evidence[0].end, confidence: field.confidence, validationState: field.validationState })));
      await tx.insert(documentaValidationRecords).values(analysis.fields.map((field) => ({ userId, intelligenceId: intelligenceRow.id, field: field.name, state: field.validationState, rule: field.provenance === "deterministic" ? "deterministic_invoice_span_verified" : "model_span_verified" })));
    }
    if (extraction.iban) {
      const matches = await tx.select({ documentId: documentaPages.documentId }).from(documentaPages)
        .where(and(eq(documentaPages.userId, userId), sql`${documentaPages.documentId} <> ${document.id}`, sql`${documentaPages.ocrText} ilike ${`%${extraction.iban}%`}`)).limit(10);
      if (matches.length) await tx.insert(documentaRelations).values(matches.map((match) => ({ userId, fromDocumentId: document.id, toDocumentId: match.documentId, relationType: "shared_identifier_lexical", confidence: 1 })));
    }
    const tokenEstimate = Math.ceil(ocrText.length / 4);
    await tx.insert(documentaAuditEvents).values({ userId, documentId: document.id, eventType: "processed", provider: cloudPages ? "google_document_ai+gemini" : cloudOptIn ? "gemini" : "deterministic", model: analysis.model, metadata: { bytes: Buffer.byteLength(ocrText), pageIds: pages.map((page) => page.id), cloudOptIn, cloudPageCount: cloudPages?.length ?? 0, estimatedEur: Number(providerTotals.estimatedEur), estimate: "sum_of_succeeded_provider_ledger_rows", tokenEstimate, operationId: processOperationId, relationSearch: "LEXICAL_FALLBACK_NO_PGVECTOR", correctionHintsUsed } });
    return { document, intelligence };
  });
  response.status(201).json(created);
});

router.post("/documenta/cloud-ocr", async (request, response) => {
  const body = asObject(request.body);
  if (body?.cloudOptIn !== true) return error(response, 403, "cloud_opt_in_required", "Cloud OCR requires explicit cloudOptIn: true.");
  if (hasUnsupportedCloudMime(body?.pages)) return error(response, 415, "unsupported_cloud_mime", "Cloud OCR supports JPEG and PNG images only.");
  const pages = readCloudPages(body?.pages);
  if (!pages) return error(response, 400, "invalid_request", "pages must contain 1 to 5 bounded base64 JPEG or PNG images.");
  try {
    const operationId = randomUUID();
    const ocrText = await documentAiOcr(request.documentaUserId!, pages, operationId);
    await db.insert(documentaAuditEvents).values({ userId: request.documentaUserId!, eventType: "cloud_ocr_completed", provider: "google_document_ai", metadata: { pageCount: pages.length, estimatedEur: pages.length * DOCUMENT_AI_EUR_PER_PAGE_ESTIMATE, estimate: "conservative_document_ai_per_page" } });
    response.json({ provider: "google_document_ai", pages: ocrText.map((text, pageIndex) => ({ pageIndex, text })), ocrText });
  } catch (caught) {
    const code = caught instanceof Error ? caught.message : "document_ai_failed";
    error(response, code === "quota_exceeded" ? 429 : code === "document_ai_not_configured" ? 503 : 502, code === "quota_exceeded" ? "quota_exceeded" : code === "document_ai_not_configured" ? "NOT_CONFIGURED" : "cloud_ocr_failed", code === "quota_exceeded" ? "Daily or monthly provider-call limit reached." : code === "document_ai_not_configured" ? "Google Document AI is not configured." : "Google Document AI could not process the supplied pages.");
  }
});

router.get("/documenta/documents", async (request, response) => {
  const pageSize = Math.min(Math.max(Number(request.query.pageSize) || 25, 1), 50);
  const documents = await db.select().from(documentaDocuments).where(eq(documentaDocuments.userId, request.documentaUserId!)).orderBy(desc(documentaDocuments.createdAt)).limit(pageSize);
  response.json({ documents, hasMore: documents.length === pageSize });
});
router.get("/documenta/documents/:id", async (request, response) => {
  const [document] = await db.select().from(documentaDocuments).where(and(eq(documentaDocuments.id, request.params.id), eq(documentaDocuments.userId, request.documentaUserId!)));
  if (!document) return error(response, 404, "not_found", "Document not found.");
  const intelligence = await db.select().from(documentaIntelligence).where(and(eq(documentaIntelligence.documentId, document.id), eq(documentaIntelligence.userId, request.documentaUserId!)));
  const evidence = await db.select().from(documentaEvidence).where(and(eq(documentaEvidence.documentId, document.id), eq(documentaEvidence.userId, request.documentaUserId!)));
  response.json({ document, intelligence, evidence });
});
router.post("/documenta/documents/:id/corrections", async (request, response) => {
  const body = asObject(request.body); const field = text(body?.field, 100); const correctedValue = text(body?.correctedValue, 4000);
  if (!field || !correctedValue) return error(response, 400, "invalid_request", "field and correctedValue are required.");
  const userId = request.documentaUserId!; const [document] = await db.select({ id: documentaDocuments.id }).from(documentaDocuments).where(and(eq(documentaDocuments.id, request.params.id), eq(documentaDocuments.userId, userId)));
  if (!document) return error(response, 404, "not_found", "Document not found.");
  const [correction] = await db.insert(documentaCorrections).values({ userId, documentId: document.id, field, correctedValue }).returning();
  await db.insert(documentaAuditEvents).values({ userId, documentId: document.id, eventType: "user_correction", metadata: { field } });
  response.status(201).json({ correction });
});
router.post("/documenta/batches/process", async (request, response) => {
  const body = asObject(request.body); const pages = Array.isArray(body?.pages) ? body.pages : undefined;
  const cloudOptIn = body?.cloudOptIn === true;
  const totalPages = body?.totalPages;
  if (typeof totalPages !== "number" || !Number.isInteger(totalPages) || totalPages < 1 || totalPages > 4000 ||
    !pages || pages.length < 1 || pages.length > MAX_PAGES_PER_BATCH || pages.length > totalPages || pages.some((page) => !text(asObject(page)?.ocrText, MAX_TEXT_BYTES))) return error(response, 400, "invalid_batch", `totalPages must be 1..4000 and each chunk must contain 1 to ${MAX_PAGES_PER_BATCH} OCR-text pages.`);
  const userId = request.documentaUserId!;
  const [job] = await db.insert(documentaBatchJobs).values({ userId, totalPages, cloudOptIn, status: "PENDING" }).returning();
  await db.insert(documentaBatchPages).values(pages.map((page, index) => ({ userId, jobId: job.id, pageNumber: index + 1, ocrText: text(asObject(page)?.ocrText, MAX_TEXT_BYTES)! })));
  await db.insert(documentaAuditEvents).values({ userId, eventType: "batch_created", metadata: { jobId: job.id, pageCount: pages.length, lexicalRelations: "LEXICAL_FALLBACK_NO_PGVECTOR" } });
  response.status(202).json({ jobId: job.id, state: job.status, pageCount: pages.length, maxPages: MAX_PAGES_PER_BATCH, nextCursor: 0, cloudProcessing: cloudOptIn ? "per_page_opt_in_required" : "disabled" });
});
router.post("/documenta/batches/:id/pages", async (request, response) => {
  const body = asObject(request.body); const pages = Array.isArray(body?.pages) ? body.pages : undefined; const userId = request.documentaUserId!;
  if (!pages || pages.length < 1 || pages.length > MAX_PAGES_PER_BATCH || pages.some((page) => !text(asObject(page)?.ocrText, MAX_TEXT_BYTES))) return error(response, 400, "invalid_batch", "Append chunks contain 1 to 50 OCR-text pages.");
  const result = await db.transaction(async (tx) => {
    const [job] = await tx.select().from(documentaBatchJobs).where(and(eq(documentaBatchJobs.id, request.params.id), eq(documentaBatchJobs.userId, userId))).for("update");
    if (!job) return undefined;
    const [count] = await tx.select({ value: sql<number>`count(*)` }).from(documentaBatchPages).where(and(eq(documentaBatchPages.jobId, job.id), eq(documentaBatchPages.userId, userId)));
    const current = Number(count.value); if (current + pages.length > job.totalPages) return null;
    await tx.insert(documentaBatchPages).values(pages.map((page, index) => ({ userId, jobId: job.id, pageNumber: current + index + 1, ocrText: text(asObject(page)?.ocrText, MAX_TEXT_BYTES)! })));
    return { appended: pages.length, acceptedPages: current + pages.length, totalPages: job.totalPages };
  });
  if (result === undefined) return error(response, 404, "not_found", "Batch job not found.");
  if (result === null) return error(response, 409, "batch_overflow", "Chunk exceeds declared totalPages.");
  response.status(202).json(result);
});
router.get("/documenta/batches/:id", async (request, response) => {
  const [job] = await db.select().from(documentaBatchJobs).where(and(eq(documentaBatchJobs.id, request.params.id), eq(documentaBatchJobs.userId, request.documentaUserId!)));
  if (!job) return error(response, 404, "not_found", "Batch job not found.");
  const pages = await db.select({ pageNumber: documentaBatchPages.pageNumber, status: documentaBatchPages.status, errorCode: documentaBatchPages.errorCode }).from(documentaBatchPages).where(and(eq(documentaBatchPages.jobId, job.id), eq(documentaBatchPages.userId, request.documentaUserId!))).orderBy(documentaBatchPages.pageNumber).limit(MAX_PAGES_PER_BATCH);
  response.json({ job, pages, lexicalRelations: "LEXICAL_FALLBACK_NO_PGVECTOR" });
});
router.post("/documenta/batches/:id/resume", async (request, response) => {
  const userId = request.documentaUserId!;
  const result = await db.transaction(async (tx) => {
    const [job] = await tx.select().from(documentaBatchJobs).where(and(eq(documentaBatchJobs.id, request.params.id), eq(documentaBatchJobs.userId, userId))).for("update");
    if (!job) return undefined;
    const pending = await tx.select().from(documentaBatchPages).where(and(eq(documentaBatchPages.jobId, job.id), eq(documentaBatchPages.userId, userId), eq(documentaBatchPages.status, "PENDING"))).orderBy(documentaBatchPages.pageNumber).limit(MAX_PAGES_PER_BATCH).for("update", { skipLocked: true });
    let succeeded = 0; let failed = 0;
    for (const batchPage of pending) {
      try {
        const source = batchPage.ocrText!; const found = classify(source); const extracted = deterministicExtraction(source); const evidence = evidenceForText(source);
        await tx.transaction(async (pageTx) => {
          const [document] = await pageTx.insert(documentaDocuments).values({ userId, title: `Batch page ${batchPage.pageNumber}`, source: "batch_ocr", status: "ready" }).returning();
          await pageTx.insert(documentaPages).values({ userId, documentId: document.id, pageNumber: 1, ocrText: source, ocrProvider: "client_ocr" });
          const [intel] = await pageTx.insert(documentaIntelligence).values({ userId, documentId: document.id, family: found.family, type: found.type, confidence: found.confidence, validationState: evidence.length ? "PARTIALLY_VALIDATED" : "UNVALIDATED", extraction: { ...extracted, fields: [] }, model: "deterministic_batch" }).returning();
          if (evidence.length) {
            await pageTx.insert(documentaEvidence).values(evidence.map((entry) => ({ userId, intelligenceId: intel.id, documentId: document.id, field: entry.field, value: entry.value, pageNumber: 1, startOffset: entry.startOffset, endOffset: entry.endOffset, confidence: entry.state === "VALIDATED" ? 1 : 0.7, validationState: entry.state })));
            await pageTx.insert(documentaValidationRecords).values(evidence.map((entry) => ({ userId, intelligenceId: intel.id, field: entry.field, state: entry.state, rule: entry.rule })));
          }
          if (extracted.iban) {
            const matches = await pageTx.select({ documentId: documentaPages.documentId }).from(documentaPages)
              .where(and(eq(documentaPages.userId, userId), sql`${documentaPages.documentId} <> ${document.id}`, sql`${documentaPages.ocrText} ilike ${`%${extracted.iban}%`}`)).limit(10);
            if (matches.length) await pageTx.insert(documentaRelations).values(matches.map((match) => ({ userId, fromDocumentId: document.id, toDocumentId: match.documentId, relationType: "shared_identifier_lexical", confidence: 1 })));
          }
        });
        await tx.update(documentaBatchPages).set({ status: "COMPLETE", updatedAt: new Date() }).where(eq(documentaBatchPages.id, batchPage.id)); succeeded++;
      } catch {
        await tx.update(documentaBatchPages).set({ status: "FAILED", errorCode: "page_persistence_failed", updatedAt: new Date() }).where(eq(documentaBatchPages.id, batchPage.id)); failed++;
      }
    }
    const [counts] = await tx.select({ complete: sql<number>`count(*) filter (where ${documentaBatchPages.status} = 'COMPLETE')`, failed: sql<number>`count(*) filter (where ${documentaBatchPages.status} = 'FAILED')`, all: sql<number>`count(*)` }).from(documentaBatchPages).where(and(eq(documentaBatchPages.jobId, job.id), eq(documentaBatchPages.userId, userId)));
    const complete = Number(counts.complete); const failedTotal = Number(counts.failed); const all = Number(counts.all);
    const status = all === job.totalPages && complete + failedTotal === job.totalPages ? (failedTotal ? "COMPLETED_WITH_ERRORS" : "COMPLETE") : "PENDING";
    await tx.update(documentaBatchJobs).set({ completedPages: complete, failedPages: failedTotal, nextCursor: complete + failedTotal, status, updatedAt: new Date() }).where(eq(documentaBatchJobs.id, job.id));
    return { jobId: job.id, processedPages: succeeded, failedPages: failed, nextCursor: complete + failedTotal, status };
  });
  if (!result) return error(response, 404, "not_found", "Batch job not found.");
  response.json(result);
});
router.get("/documenta/documents/:id/relations", async (request, response) => {
  const relations = await db.select().from(documentaRelations).where(and(eq(documentaRelations.userId, request.documentaUserId!), eq(documentaRelations.fromDocumentId, request.params.id)));
  response.json({ relations });
});

export default router;