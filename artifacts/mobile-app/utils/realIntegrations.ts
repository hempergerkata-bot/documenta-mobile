import type { EmailAttachment, EmailMessage, EmailProviderType } from './premiumIntegrations';

export type RealProvider = 'google' | 'microsoft' | 'imap';
export type SetupStatus = 'implemented' | 'requires_configuration' | 'blocked';
export type ProviderSetup = {
  provider: RealProvider;
  status: SetupStatus;
  clientIdConfigured: boolean;
  redirectUri: string;
  scopes: readonly string[];
  reason: string;
};

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
};

export type ImportRange = {
  from: string;
  to: string;
  label: '7_days' | '30_days' | '90_days' | 'custom';
};

export type Page<T> = { items: T[]; nextPageToken?: string; hasMore: boolean };
export type RetryPolicy = { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number };

export const OAUTH_SCOPES = {
  // Gmail remains read-only. Calendar writes are only reached from the explicit
  // candidate-confirmation flow in the integration screen.
  google: ['openid', 'email', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events'] as const,
  microsoft: ['openid', 'email', 'offline_access', 'User.Read', 'Mail.Read', 'Calendars.ReadWrite'] as const,
} as const;

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
} as const;

export const MICROSOFT_DISCOVERY = {
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  revocationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
} as const;

export const DEFAULT_IMPORT_DAYS = [7, 30, 90] as const;

export const IMAP_PRESETS = {
  gmx: { host: 'imap.gmx.com', port: 993, tls: true, domains: ['gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch'] },
  webde: { host: 'imap.web.de', port: 993, tls: true, domains: ['web.de'] },
  yahoo: { host: 'imap.mail.yahoo.com', port: 993, tls: true, domains: ['yahoo.com', 'yahoo.de', 'yahoo.co.uk'] },
  tOnline: { host: 'secureimap.t-online.de', port: 993, tls: true, domains: ['t-online.de'] },
} as const;

export type ImapPresetKey = keyof typeof IMAP_PRESETS;
export type ImapConfig = { host: string; port: number; tls: true; preset?: ImapPresetKey };

export function providerSetups(env: Record<string, string | undefined> = {}, redirectUri = ''): ProviderSetup[] {
  const rawGoogleClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
  const googleClientId = /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(rawGoogleClientId) ? rawGoogleClientId : '';
  const microsoftClientId = env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID?.trim() ?? '';
  const safeRedirect = redirectUri || env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim() || '';
  return [
    { provider: 'google', status: googleClientId && safeRedirect ? 'implemented' : 'requires_configuration', clientIdConfigured: !!googleClientId, redirectUri: safeRedirect, scopes: OAUTH_SCOPES.google, reason: googleClientId && safeRedirect ? 'OAuth/PKCE client is configured.' : 'A public client ID and redirect URI are required.' },
    { provider: 'microsoft', status: microsoftClientId && safeRedirect ? 'implemented' : 'requires_configuration', clientIdConfigured: !!microsoftClientId, redirectUri: safeRedirect, scopes: OAUTH_SCOPES.microsoft, reason: microsoftClientId && safeRedirect ? 'OAuth/PKCE client is configured.' : 'A public client ID and redirect URI are required.' },
    { provider: 'imap', status: 'implemented', clientIdConfigured: false, redirectUri: '', scopes: [], reason: 'TLS-only IMAP requires explicit user configuration and secure credential storage.' },
  ];
}

export function importRange(days: 7 | 30 | 90, now = new Date()): ImportRange {
  const to = now.toISOString();
  const fromDate = new Date(now.getTime() - days * 86400000);
  return { from: fromDate.toISOString(), to, label: `${days}_days` as ImportRange['label'] };
}

export function customImportRange(from: string, to: string): ImportRange | undefined {
  const fromDate = Date.parse(from);
  const toDate = Date.parse(to);
  if (!Number.isFinite(fromDate) || !Number.isFinite(toDate) || fromDate > toDate) return undefined;
  return { from: new Date(fromDate).toISOString(), to: new Date(toDate).toISOString(), label: 'custom' };
}

export function gmailListUrl(range: ImportRange, pageToken?: string, pageSize = 50): string {
  const after = Math.floor(Date.parse(range.from) / 1000);
  const before = Math.floor(Date.parse(range.to) / 1000);
  const params = new URLSearchParams({ q: `after:${after} before:${before}`, maxResults: String(Math.min(100, Math.max(1, pageSize))) });
  if (pageToken) params.set('pageToken', pageToken);
  return `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
}

export function microsoftMessagesUrl(range: ImportRange, nextLink?: string, pageSize = 50): string {
  if (nextLink) return nextLink;
  const params = new URLSearchParams({
    '$filter': `receivedDateTime ge ${range.from} and receivedDateTime le ${range.to}`,
    '$orderby': 'receivedDateTime desc',
    '$top': String(Math.min(100, Math.max(1, pageSize))),
    '$select': 'id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments',
  });
  return `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`;
}

export async function fetchWithRetry<T>(request: () => Promise<T>, policy: RetryPolicy = {}): Promise<T> {
  const maxAttempts = Math.max(1, policy.maxAttempts ?? 3);
  const baseDelayMs = Math.max(0, policy.baseDelayMs ?? 250);
  const maxDelayMs = Math.max(baseDelayMs, policy.maxDelayMs ?? 4000);
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts - 1) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Provider request failed');
}

export function presetForEmail(email: string): ImapPresetKey | undefined {
  const domain = email.trim().toLocaleLowerCase().split('@').pop() ?? '';
  return (Object.keys(IMAP_PRESETS) as ImapPresetKey[]).find((key) => (IMAP_PRESETS[key].domains as readonly string[]).includes(domain));
}

export function imapConfigForEmail(email: string): ImapConfig | undefined {
  const preset = presetForEmail(email);
  if (!preset) return undefined;
  const value = IMAP_PRESETS[preset];
  return { host: value.host, port: value.port, tls: true, preset };
}

export function validateImapConfig(config: Partial<ImapConfig>): config is ImapConfig {
  return typeof config.host === 'string' && config.host.trim().length > 2 && Number(config.port) === 993 && config.tls === true;
}

export function normalizeProviderMessage(input: {
  provider: EmailProviderType;
  accountId: string;
  id: string;
  threadId?: string;
  subject?: string;
  sender?: string;
  recipients?: string[];
  receivedAt: string;
  snippet?: string;
  hasAttachments?: boolean;
}): EmailMessage {
  return {
    id: `${input.provider}-message-${input.id}`,
    accountId: input.accountId,
    providerMessageId: input.id,
    threadId: input.threadId,
    subject: input.subject?.trim() || '(no subject)',
    sender: input.sender?.trim() || 'unknown sender',
    recipients: input.recipients ?? [],
    receivedAt: new Date(input.receivedAt).toISOString(),
    snippet: input.snippet?.slice(0, 500),
    hasAttachments: input.hasAttachments === true,
    importStatus: 'suggested',
    relatedDocumentIds: [],
  };
}

export function normalizeAttachment(input: { messageId: string; id: string; filename?: string; mimeType?: string; size?: number; hash?: string }): EmailAttachment | undefined {
  const filename = input.filename?.trim() || 'attachment';
  const mimeType = input.mimeType?.toLocaleLowerCase() || 'application/octet-stream';
  const allowed = mimeType === 'application/pdf' || mimeType.startsWith('image/');
  if (!allowed || !Number.isFinite(input.size) || (input.size ?? 0) <= 0 || (input.size ?? 0) > 25 * 1024 * 1024) return undefined;
  return { id: input.id, messageId: input.messageId, filename, mimeType, size: input.size!, importStatus: 'suggested', hash: input.hash };
}

export function minimalNotificationPayload(input: { title: string; body: string; target?: string; privateMode?: boolean }) {
  return { title: input.title.slice(0, 80), body: input.privateMode ? 'Documenta hat eine lokale Erinnerung.' : input.body.slice(0, 180), data: input.target ? { target: input.target } : undefined };
}

export function isOAuthTokenFresh(tokens: Pick<OAuthTokenSet, 'expiresAt'>, now = Date.now(), safetyWindowMs = 60_000): boolean {
  return tokens.expiresAt > now + safetyWindowMs;
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}