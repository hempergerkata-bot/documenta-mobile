import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import { File } from 'expo-file-system';
export type { CloudEvidence, CloudFact, CloudIntelligence, CloudOcrPage, CloudOcrResult, CloudPipelineFailure, CloudPipelineFailureReason, CloudPipelineStageState, ScanCloudPipelineResult, ScanCloudPipelineState } from './documentaCloudMapping';
import { mergeCloudOcrChunks, normalizeCloudFields, parseCloudOcrResponse, planCloudOcrChunks, runScanCloudPipeline as runPipeline, type CloudIntelligence, type CloudOcrResult } from './documentaCloudMapping';
export { cloudReviewSuggestions, mergeCloudEvidence, mergeCloudOcrChunks, normalizeCloudFields, parseCloudOcrResponse, planCloudOcrChunks, runScanCloudPipeline } from './documentaCloudMapping';

const INSTALLATION_KEY = '@documenta/cloud-installation-id';
const SESSION_KEY = '@documenta/cloud-session';
const baseUrl = () => `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ''}`;

export type CloudState = 'offline' | 'cloud' | 'unavailable' | 'quota';
type StoredSession = { accessToken: string; expiresAt: string };

export class DocumentaCloudError extends Error {
  constructor(public readonly state: Exclude<CloudState, 'offline' | 'cloud'>, message: string) {
    super(message);
  }
}

async function installationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(INSTALLATION_KEY);
  if (existing) return existing;
  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(INSTALLATION_KEY, created, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return created;
}

async function sessionToken(): Promise<string> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (raw) {
    try {
      const cached = JSON.parse(raw) as StoredSession;
      // Refresh a minute before expiry; a stale token must never be sent.
      if (cached.accessToken && Date.parse(cached.expiresAt) > Date.now() + 60_000) return cached.accessToken;
    } catch { /* replace malformed local state */ }
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api/documenta/auth/session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installationId: await installationId() }),
    });
  } catch {
    throw new DocumentaCloudError('unavailable', 'Cloud service is unavailable.');
  }
  const body = await response.json().catch(() => ({})) as { accessToken?: string; expiresAt?: string; error?: string; message?: string };
  if (!response.ok || !body.accessToken || !body.expiresAt) {
    throw new DocumentaCloudError(response.status === 429 ? 'quota' : 'unavailable', body.message || 'Cloud service is unavailable.');
  }
  const session = { accessToken: body.accessToken, expiresAt: body.expiresAt };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return session.accessToken;
}

/** Sends local OCR text only after an explicit UI opt-in. No provider key exists in this client. */
export async function processCloudIntelligence(ocrText: string, title: string): Promise<CloudIntelligence> {
  const token = await sessionToken();
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api/documenta/documents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ocrText, title, cloudOptIn: true }),
    });
  } catch {
    throw new DocumentaCloudError('unavailable', 'Cloud service is unavailable.');
  }
  const body = await response.json().catch(() => ({})) as {
    error?: string; message?: string;
    intelligence?: { family?: unknown; type?: unknown; summary?: unknown; confidence?: unknown; validationState?: unknown; model?: unknown; fields?: unknown };
  };
  if (!response.ok) {
    throw new DocumentaCloudError(response.status === 429 || body.error === 'quota_exceeded' ? 'quota' : 'unavailable', body.message || 'Cloud processing is unavailable.');
  }
  const intelligence = body.intelligence;
  if (!intelligence || typeof intelligence.family !== 'string' || typeof intelligence.type !== 'string' || typeof intelligence.confidence !== 'number') {
    throw new DocumentaCloudError('unavailable', 'Cloud response could not be safely read.');
  }
  const fields = normalizeCloudFields(intelligence.fields);
  return {
    family: intelligence.family, type: intelligence.type, confidence: intelligence.confidence,
    ...(typeof intelligence.summary === 'string' ? { summary: intelligence.summary } : {}),
    ...(typeof intelligence.validationState === 'string' ? { validationState: intelligence.validationState } : {}),
    ...(typeof intelligence.model === 'string' ? { model: intelligence.model } : {}),
    ...(fields ? { fields } : {}),
  };
}

export function cloudFailureState(error: unknown): CloudState {
  return error instanceof DocumentaCloudError ? error.state : 'unavailable';
}

export async function processScanCloudPipeline(input: {
  optedIn: boolean;
  localText: string;
  localOcrStatus: 'complete' | 'partial' | 'empty' | 'failed';
  title: string;
  pageUris: string[];
}) {
  return runPipeline(input, {
    uploadDocumentAiOcr: uploadCloudOcrPages,
    processGemini: processCloudIntelligence,
  });
}

/** Explicitly uploads selected page bytes only; callers must gate this behind opt-in. */
export async function uploadCloudOcrPages(pageUris: string[]): Promise<CloudOcrResult | undefined> {
  const token = await sessionToken();
  const pages = await Promise.all(pageUris.map(async (uri, pageIndex) => ({
    pageIndex,
    mimeType: uri.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg',
    contentBase64: Buffer.from(await new File(uri).bytes()).toString('base64'),
  })));
  const chunkResults: Array<{ requestedPageIndexes: number[]; result: CloudOcrResult }> = [];
  for (const chunk of planCloudOcrChunks(pages, 5)) {
    let response: Response;
    try {
      response = await fetch(`${baseUrl()}/api/documenta/cloud-ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pages: chunk, cloudOptIn: true }),
      });
    } catch {
      throw new DocumentaCloudError('unavailable', 'Cloud service is unavailable.');
    }
    const body = await response.json().catch(() => ({})) as { error?: string; message?: string; pages?: unknown; ocrText?: unknown; text?: unknown };
    if (!response.ok) throw new DocumentaCloudError(response.status === 429 ? 'quota' : 'unavailable', body.message || 'Cloud OCR is unavailable.');
    const result = parseCloudOcrResponse(body);
    if (!result) throw new DocumentaCloudError('unavailable', 'Cloud OCR returned no readable text.');
    chunkResults.push({ requestedPageIndexes: chunk.map((page) => page.pageIndex), result });
  }
  return mergeCloudOcrChunks(chunkResults);
}
