import { SUPPORTED_LANGUAGES } from './localization';
import {
  LANGUAGE_CAPABILITIES,
  LANGUAGE_CAPABILITY_MATRIX,
  auditLanguageCapabilityMatrix,
  languageCapability,
} from './languageCapabilities';
import type { SecuritySettings } from './documentDomain';
import { disableUnenforcedSecurity, driveUiStatus, requireCloudAccountRevalidation } from './truthfulness';

declare function require(name: string): any;
const assert = require('node:assert').strict;

assert.deepEqual(Object.keys(LANGUAGE_CAPABILITY_MATRIX).sort(), [...SUPPORTED_LANGUAGES].sort(), 'all and only the 15 listed languages are declared');
assert.equal(auditLanguageCapabilityMatrix().length, 0, 'every language/capability cell has an explicit valid status');
for (const language of SUPPORTED_LANGUAGES) {
  assert.equal(LANGUAGE_CAPABILITIES.length, 6);
  assert.equal(languageCapability(language, 'ui'), 'full');
  assert.equal(languageCapability(language, 'documentRecognition'), 'partial');
  assert.equal(languageCapability(language, 'tts'), 'partial', 'TTS is runtime/device dependent, never promised as universally available');
}
assert.equal(languageCapability('de', 'explanation'), 'full');
assert.equal(languageCapability('hu', 'replies'), 'full');
assert.equal(languageCapability('en', 'assistant'), 'full');
assert.equal(languageCapability('fr', 'explanation'), 'unsupported');
assert.equal(languageCapability('ar', 'replies'), 'unsupported');
assert.equal(languageCapability('uk', 'assistant'), 'partial');

const unsafeSecurity: SecuritySettings = { biometricProtection: true, pinEnabled: true, sensitiveDocumentsProtection: false, autoLockMinutes: 5, cloudSyncEnabled: false, gmailAccessEnabled: false, aiProcessingEnabled: false, retentionPolicy: '1 Jahr', analyticsEnabled: false, localOnly: true, retentionDays: 365, permissions: { kamera: 'nicht_erfragt', dateien: 'nicht_erfragt', benachrichtigungen: 'nicht_erfragt' } };
const safeSecurity = disableUnenforcedSecurity(unsafeSecurity);
assert.equal(safeSecurity.biometricProtection || safeSecurity.pinEnabled || safeSecurity.autoLockMinutes > 0, false, 'unenforced security settings cannot remain active');
const connectedDrive = { id: 'drive', providerType: 'google_drive' as const, displayName: 'Drive', status: 'connected' as const, grantedScopes: [], createdAt: '', updatedAt: '' };
const googleClientId = '123456789-example.apps.googleusercontent.com';
assert.equal(requireCloudAccountRevalidation([connectedDrive])[0].status, 'permission_required', 'persisted Drive metadata requires fresh validation');
assert.equal(driveUiStatus({ platform: 'web', clientId: 'id', account: connectedDrive }), 'configuration_required');
assert.equal(driveUiStatus({ platform: 'android', clientId: 'previous setup instructions', account: connectedDrive }), 'configuration_required');
assert.equal(driveUiStatus({ platform: 'android', clientId: googleClientId, account: { ...connectedDrive, status: 'permission_required' } }), 'disconnected');
assert.equal(driveUiStatus({ platform: 'android', clientId: googleClientId, account: connectedDrive }), 'connected');

console.log('Language capability tests passed');