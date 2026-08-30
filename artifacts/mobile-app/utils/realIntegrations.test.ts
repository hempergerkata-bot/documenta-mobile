const assert = {
  equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`); },
  match(actual: string, expected: RegExp) { if (!expected.test(actual)) throw new Error(`Expected ${actual} to match ${String(expected)}`); },
};
import { createTesterEntitlement, entitlementStatus, hasPremiumEntitlement, migrateIntegrationState } from './premiumIntegrations';
import { customImportRange, gmailListUrl, imapConfigForEmail, importRange, microsoftMessagesUrl, minimalNotificationPayload, normalizeAttachment, OAUTH_SCOPES, providerSetups, validateImapConfig } from './realIntegrations';

const now = new Date('2026-08-29T12:00:00.000Z');
const range = importRange(30, now);
assert.equal(range.from, '2026-07-30T12:00:00.000Z');
assert.equal(customImportRange(range.to, range.from), undefined);
assert.match(gmailListUrl(range, 'next', 500), /maxResults=100/);
assert.match(gmailListUrl(range, 'next'), /pageToken=next/);
assert.match(microsoftMessagesUrl(range), /receivedDateTime/);
assert.equal(imapConfigForEmail('person@web.de')?.host, 'imap.web.de');
assert.equal(validateImapConfig({ host: 'imap.web.de', port: 143, tls: true }), false);
assert.equal(providerSetups({}, 'documenta://oauth')[0].status, 'requires_configuration');
assert.equal(providerSetups({ EXPO_PUBLIC_GOOGLE_CLIENT_ID: 'previous setup instructions' }, 'documenta://oauth')[0].status, 'requires_configuration');
assert.equal(providerSetups({ EXPO_PUBLIC_GOOGLE_CLIENT_ID: '123456789-example.apps.googleusercontent.com' }, 'documenta://oauth')[0].status, 'implemented');
assert.equal((OAUTH_SCOPES.google as readonly string[]).includes('https://www.googleapis.com/auth/drive.appdata'), false);
assert.equal((OAUTH_SCOPES.google as readonly string[]).some((scope) => scope === 'https://www.googleapis.com/auth/drive'), false);
assert.equal(normalizeAttachment({ messageId: 'm', id: 'a', mimeType: 'application/pdf', size: 26 * 1024 * 1024 }), undefined);
assert.equal(minimalNotificationPayload({ title: 'Deadline', body: 'Private document title', privateMode: true }).body.includes('Private document title'), false);

const tester = createTesterEntitlement(15, now);
assert.equal(hasPremiumEntitlement(tester, new Date('2026-09-01T00:00:00.000Z')), true);
assert.equal(entitlementStatus(tester, new Date('2026-09-20T00:00:00.000Z')), 'expired');
const migrated = migrateIntegrationState({ emailAccounts: [{ id: 'x', providerType: 'google', displayName: 'X', emailAddress: 'x@example.test', connectionStatus: 'connected', permissions: [], syncEnabled: false, createdAt: now.toISOString(), updatedAt: now.toISOString(), accessToken: 'must-not-survive' } as never] }, now);
assert.equal('accessToken' in migrated.emailAccounts[0], false);
console.log('real integrations tests passed');