import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import {
  GOOGLE_DISCOVERY,
  MICROSOFT_DISCOVERY,
  OAUTH_SCOPES,
  fetchWithRetry,
  gmailListUrl,
  microsoftMessagesUrl,
  normalizeProviderMessage,
  isOAuthTokenFresh,
  normalizeAttachment,
  type ImportRange,
  type OAuthTokenSet,
} from './realIntegrations';
import { loadProviderCredential, removeProviderCredential, saveProviderCredential } from './secureCredentials';
import type { CalendarProviderType, EmailAccount, EmailAttachment, EmailMessage, EmailProviderType } from './premiumIntegrations';

export type OAuthProvider = 'google' | 'microsoft';
export type OAuthConnectionResult =
  | { ok: true; accountId: string; emailAddress: string; displayName: string; expiresAt: number; scope: string }
  | { ok: false; error: 'requires_configuration' | 'cancelled' | 'secure_storage_unavailable' | 'oauth_failed'; message: string };

const providerConfig = (provider: OAuthProvider) => {
  const clientId = provider === 'google' ? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() : process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID?.trim();
  const redirectUri = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI?.trim() || AuthSession.makeRedirectUri({ scheme: 'documenta', path: 'oauth' });
  return {
    clientId: clientId ?? '',
    redirectUri,
    discovery: provider === 'google' ? GOOGLE_DISCOVERY : MICROSOFT_DISCOVERY,
    scopes: [...(provider === 'google' ? OAUTH_SCOPES.google : OAUTH_SCOPES.microsoft)],
  };
};

const tokenSet = (response: AuthSession.TokenResponse, previous?: OAuthTokenSet): OAuthTokenSet => ({
  accessToken: response.accessToken,
  refreshToken: response.refreshToken ?? previous?.refreshToken,
  expiresAt: (response.issuedAt + (response.expiresIn ?? 3600)) * 1000,
  scope: response.scope ?? previous?.scope ?? '',
});

async function providerProfile(provider: OAuthProvider, accessToken: string): Promise<{ email: string; name: string }> {
  const url = provider === 'google' ? 'https://openidconnect.googleapis.com/v1/userinfo' : 'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName';
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`profile_${response.status}`);
  const json = await response.json() as Record<string, unknown>;
  const email = String(provider === 'google' ? json.email ?? '' : json.mail ?? json.userPrincipalName ?? '');
  return { email, name: String((provider === 'google' ? json.name : json.displayName) ?? (email || provider)) };
}

const GOOGLE_DRIVE_BACKUP_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/drive.appdata'] as const;

/** Dedicated least-privilege OAuth flow for backup; it never requests Gmail or Calendar access. */
export async function connectGoogleDriveBackupProvider(): Promise<OAuthConnectionResult> {
  if (Platform.OS === 'web') return { ok: false, error: 'requires_configuration', message: 'Google Drive backup connection requires the native Development Build.' };
  const config = providerConfig('google');
  if (!config.clientId || !config.redirectUri) return { ok: false, error: 'requires_configuration', message: 'Public Google client ID and redirect URI are not configured.' };
  try {
    const request = new AuthSession.AuthRequest({
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: [...GOOGLE_DRIVE_BACKUP_SCOPES],
      usePKCE: true,
      extraParams: { access_type: 'offline', prompt: 'consent select_account' },
    });
    const result = await request.promptAsync(config.discovery);
    if (result.type !== 'success' || !result.params.code || !request.codeVerifier) return { ok: false, error: 'cancelled', message: 'Authorization was cancelled or did not return a code.' };
    const response = await AuthSession.exchangeCodeAsync({
      clientId: config.clientId,
      code: result.params.code,
      redirectUri: config.redirectUri,
      scopes: [...GOOGLE_DRIVE_BACKUP_SCOPES],
      extraParams: { code_verifier: request.codeVerifier },
    }, config.discovery);
    const profile = await providerProfile('google', response.accessToken);
    const accountId = `google-drive-${profile.email.toLocaleLowerCase()}`;
    const tokens = tokenSet(response);
    if (!(await saveProviderCredential(accountId, tokens))) return { ok: false, error: 'secure_storage_unavailable', message: 'Secure device storage is unavailable; no token was retained.' };
    return { ok: true, accountId, emailAddress: profile.email, displayName: profile.name, expiresAt: tokens.expiresAt, scope: tokens.scope };
  } catch {
    return { ok: false, error: 'oauth_failed', message: 'Google Drive authorization failed. Local encrypted export remains available.' };
  }
}

export async function connectOAuthProvider(provider: OAuthProvider): Promise<OAuthConnectionResult> {
  if (Platform.OS === 'web') return { ok: false, error: 'requires_configuration', message: 'OAuth account connection requires the native Development Build.' };
  const config = providerConfig(provider);
  if (!config.clientId || !config.redirectUri) return { ok: false, error: 'requires_configuration', message: 'Public client ID and redirect URI are not configured.' };
  try {
    const request = new AuthSession.AuthRequest({
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: config.scopes,
      usePKCE: true,
      extraParams: provider === 'google' ? { access_type: 'offline', prompt: 'consent select_account' } : { prompt: 'select_account' },
    });
    const result = await request.promptAsync(config.discovery);
    if (result.type !== 'success' || !result.params.code || !request.codeVerifier) return { ok: false, error: 'cancelled', message: 'Authorization was cancelled or did not return a code.' };
    const response = await AuthSession.exchangeCodeAsync({
      clientId: config.clientId,
      code: result.params.code,
      redirectUri: config.redirectUri,
      scopes: config.scopes,
      extraParams: { code_verifier: request.codeVerifier },
    }, config.discovery);
    const profile = await providerProfile(provider, response.accessToken);
    const accountId = `${provider}-${profile.email.toLocaleLowerCase()}`;
    const tokens = tokenSet(response);
    if (!(await saveProviderCredential(accountId, tokens))) return { ok: false, error: 'secure_storage_unavailable', message: 'Secure device storage is unavailable; no token was retained.' };
    return { ok: true, accountId, emailAddress: profile.email, displayName: profile.name, expiresAt: tokens.expiresAt, scope: tokens.scope };
  } catch {
    return { ok: false, error: 'oauth_failed', message: 'OAuth authorization failed. Manual import remains available.' };
  }
}

export async function refreshOAuthProvider(provider: OAuthProvider, accountId: string): Promise<boolean> {
  const current = await loadProviderCredential(accountId);
  const config = providerConfig(provider);
  if (!current?.refreshToken || !config.clientId) return false;
  try {
    const response = await AuthSession.refreshAsync({ clientId: config.clientId, refreshToken: current.refreshToken, scopes: config.scopes }, config.discovery);
    return saveProviderCredential(accountId, tokenSet(response, current));
  } catch {
    return false;
  }
}

export async function disconnectOAuthProvider(provider: OAuthProvider, accountId: string): Promise<void> {
  const current = await loadProviderCredential(accountId);
  const config = providerConfig(provider);
  if (current?.accessToken && provider === 'google') {
    try {
      await AuthSession.revokeAsync({ token: current.accessToken, clientId: config.clientId }, config.discovery);
    } catch {
      // Local credential removal is mandatory even when provider revocation is offline.
    }
  }
  await removeProviderCredential(accountId);
}

async function authorizedJson<T>(provider: OAuthProvider, accountId: string, input: string, init?: RequestInit): Promise<T> {
  let credential = await loadProviderCredential(accountId);
  if (!credential) throw new Error('reconnect_required');
  if (!isOAuthTokenFresh(credential) && !(await refreshOAuthProvider(provider, accountId))) throw new Error('reconnect_required');
  credential = await loadProviderCredential(accountId);
  if (!credential) throw new Error('reconnect_required');
  let refreshedAfterUnauthorized = false;
  return fetchWithRetry(async () => {
    let response = await fetch(input, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${credential!.accessToken}`, Accept: 'application/json' } });
    if (response.status === 401 && !refreshedAfterUnauthorized) {
      refreshedAfterUnauthorized = true;
      if (!(await refreshOAuthProvider(provider, accountId))) throw new Error('reconnect_required');
      credential = await loadProviderCredential(accountId);
      if (!credential) throw new Error('reconnect_required');
      response = await fetch(input, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${credential.accessToken}`, Accept: 'application/json' } });
    }
    if (response.status === 401) throw new Error('reconnect_required');
    if (response.status === 429 || response.status >= 500) throw new Error(`retryable_${response.status}`);
    if (!response.ok) throw new Error(`provider_${response.status}`);
    return response.json() as Promise<T>;
  });
}

export async function listProviderMessages(provider: OAuthProvider, account: EmailAccount, range: ImportRange, cursor?: string): Promise<{ messages: EmailMessage[]; nextCursor?: string }> {
  if (provider === 'google') {
    const listing = await authorizedJson<{ messages?: Array<{ id: string; threadId?: string }>; nextPageToken?: string }>(provider, account.id, gmailListUrl(range, cursor));
    const details = await Promise.all((listing.messages ?? []).slice(0, 50).map(async (item) => {
      const detail = await authorizedJson<{ id: string; threadId?: string; snippet?: string; internalDate?: string; payload?: { headers?: Array<{ name: string; value: string }>; parts?: unknown[] } }>(provider, account.id, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`);
      const header = (name: string) => detail.payload?.headers?.find((entry) => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.value;
      return normalizeProviderMessage({ provider: 'google', accountId: account.id, id: detail.id, threadId: detail.threadId, subject: header('Subject'), sender: header('From'), recipients: header('To')?.split(',').map((value) => value.trim()), receivedAt: detail.internalDate ? new Date(Number(detail.internalDate)).toISOString() : header('Date') || new Date().toISOString(), snippet: detail.snippet, hasAttachments: Boolean(detail.payload?.parts?.length) });
    }));
    return { messages: details, nextCursor: listing.nextPageToken };
  }
  const listing = await authorizedJson<{ value?: Array<{ id: string; conversationId?: string; subject?: string; from?: { emailAddress?: { address?: string } }; toRecipients?: Array<{ emailAddress?: { address?: string } }>; receivedDateTime: string; bodyPreview?: string; hasAttachments?: boolean }>; '@odata.nextLink'?: string }>(provider, account.id, microsoftMessagesUrl(range, cursor));
  return {
    messages: (listing.value ?? []).map((item) => normalizeProviderMessage({ provider: 'microsoft', accountId: account.id, id: item.id, threadId: item.conversationId, subject: item.subject, sender: item.from?.emailAddress?.address, recipients: item.toRecipients?.map((value) => value.emailAddress?.address ?? '').filter(Boolean), receivedAt: item.receivedDateTime, snippet: item.bodyPreview, hasAttachments: item.hasAttachments })),
    nextCursor: listing['@odata.nextLink'],
  };
}

type GmailPart = { filename?: string; mimeType?: string; body?: { attachmentId?: string; size?: number }; parts?: GmailPart[] };
export async function listProviderAttachments(provider: OAuthProvider, account: EmailAccount, message: EmailMessage): Promise<EmailAttachment[]> {
  if (provider === 'google') {
    const detail = await authorizedJson<{ payload?: GmailPart }>(provider, account.id, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.providerMessageId)}?format=full`);
    const parts = (part: GmailPart | undefined): GmailPart[] => !part ? [] : [part, ...(part.parts ?? []).flatMap(parts)];
    return parts(detail.payload).flatMap((part) => {
      const remoteId = part.body?.attachmentId;
      const attachment = remoteId && normalizeAttachment({ messageId: message.id, id: `google-attachment-${message.providerMessageId}-${remoteId}`, filename: part.filename, mimeType: part.mimeType, size: part.body?.size });
      return attachment ? [{ ...attachment, providerAttachmentId: remoteId }] : [];
    });
  }
  const json = await authorizedJson<{ value?: Array<{ id: string; name?: string; contentType?: string; size?: number; isInline?: boolean }> }>(provider, account.id, `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(message.providerMessageId)}/attachments?$select=id,name,contentType,size,isInline`);
  return (json.value ?? []).flatMap((item) => {
    const attachment = !item.isInline && normalizeAttachment({ messageId: message.id, id: `microsoft-attachment-${message.providerMessageId}-${item.id}`, filename: item.name, mimeType: item.contentType, size: item.size });
    return attachment ? [{ ...attachment, providerAttachmentId: item.id }] : [];
  });
}

/** Downloads only a user-selected, previously metadata-filtered attachment. */
export async function downloadProviderAttachment(provider: OAuthProvider, account: EmailAccount, message: EmailMessage, attachment: EmailAttachment): Promise<{ filename: string; mimeType: string; base64: string; sha256?: string }> {
  if (!attachment.providerAttachmentId) throw new Error('attachment_missing');
  if (provider === 'google') {
    const json = await authorizedJson<{ data?: string }>(provider, account.id, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(message.providerMessageId)}/attachments/${encodeURIComponent(attachment.providerAttachmentId)}`);
    if (!json.data) throw new Error('attachment_missing');
    return { filename: attachment.filename, mimeType: attachment.mimeType, base64: json.data.replace(/-/g, '+').replace(/_/g, '/') };
  }
  const json = await authorizedJson<{ contentBytes?: string }>(provider, account.id, `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(message.providerMessageId)}/attachments/${encodeURIComponent(attachment.providerAttachmentId)}`);
  if (!json.contentBytes) throw new Error('attachment_missing');
  return { filename: attachment.filename, mimeType: attachment.mimeType, base64: json.contentBytes };
}

export async function listRemoteCalendars(provider: OAuthProvider, accountId: string): Promise<Array<{ id: string; title: string; canWrite: boolean }>> {
  if (provider === 'google') {
    const json = await authorizedJson<{ items?: Array<{ id: string; summary?: string; accessRole?: string }> }>(provider, accountId, 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=100');
    return (json.items ?? []).map((item) => ({ id: item.id, title: item.summary ?? item.id, canWrite: item.accessRole === 'owner' || item.accessRole === 'writer' }));
  }
  const json = await authorizedJson<{ value?: Array<{ id: string; name?: string; canEdit?: boolean }> }>(provider, accountId, 'https://graph.microsoft.com/v1.0/me/calendars?$select=id,name,canEdit');
  return (json.value ?? []).map((item) => ({ id: item.id, title: item.name ?? item.id, canWrite: item.canEdit === true }));
}

export async function createRemoteCalendarEvent(provider: CalendarProviderType, accountId: string, calendarId: string, input: { title: string; startAt: string; endAt?: string; timezone: string; sourceReference: string }): Promise<string | undefined> {
  const oauthProvider: OAuthProvider | undefined = provider === 'google_calendar' ? 'google' : provider === 'microsoft_calendar' ? 'microsoft' : undefined;
  if (!oauthProvider) return undefined;
  const endAt = input.endAt ?? new Date(Date.parse(input.startAt) + 3600000).toISOString();
  const url = oauthProvider === 'google'
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`;
  const body = oauthProvider === 'google'
    ? { summary: input.title, start: { dateTime: input.startAt, timeZone: input.timezone }, end: { dateTime: endAt, timeZone: input.timezone }, extendedProperties: { private: { documentaSource: input.sourceReference } } }
    : { subject: input.title, start: { dateTime: input.startAt.replace(/Z$/, ''), timeZone: input.timezone }, end: { dateTime: endAt.replace(/Z$/, ''), timeZone: input.timezone }, singleValueExtendedProperties: [] };
  const response = await authorizedJson<{ id?: string }>(oauthProvider, accountId, url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return response.id;
}

export async function readRemoteCalendarEvent(provider: CalendarProviderType, accountId: string, calendarId: string, eventId: string): Promise<{ id: string; title: string; startAt: string; endAt: string } | undefined> {
  const oauthProvider = provider === 'google_calendar' ? 'google' : provider === 'microsoft_calendar' ? 'microsoft' : undefined;
  if (!oauthProvider) return undefined;
  const url = oauthProvider === 'google'
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?$select=id,subject,start,end`;
  const json = await authorizedJson<Record<string, any>>(oauthProvider, accountId, url);
  return oauthProvider === 'google'
    ? { id: String(json.id), title: String(json.summary ?? ''), startAt: String(json.start?.dateTime ?? json.start?.date ?? ''), endAt: String(json.end?.dateTime ?? json.end?.date ?? '') }
    : { id: String(json.id), title: String(json.subject ?? ''), startAt: String(json.start?.dateTime ?? ''), endAt: String(json.end?.dateTime ?? '') };
}

export async function updateRemoteCalendarEvent(provider: CalendarProviderType, accountId: string, calendarId: string, eventId: string, input: { title: string; startAt: string; endAt?: string; timezone: string }): Promise<boolean> {
  const oauthProvider = provider === 'google_calendar' ? 'google' : provider === 'microsoft_calendar' ? 'microsoft' : undefined;
  if (!oauthProvider) return false;
  const endAt = input.endAt ?? new Date(Date.parse(input.startAt) + 3600000).toISOString();
  const url = oauthProvider === 'google'
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const body = oauthProvider === 'google'
    ? { summary: input.title, start: { dateTime: input.startAt, timeZone: input.timezone }, end: { dateTime: endAt, timeZone: input.timezone } }
    : { subject: input.title, start: { dateTime: input.startAt.replace(/Z$/, ''), timeZone: input.timezone }, end: { dateTime: endAt.replace(/Z$/, ''), timeZone: input.timezone } };
  await authorizedJson(oauthProvider, accountId, url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return true;
}