import type { CloudAccount } from './backupDomain';
import type { SecuritySettings } from './documentDomain';

/** Controls without a real enforcement boundary must remain off. */
export function disableUnenforcedSecurity(settings: SecuritySettings): SecuritySettings {
  return { ...settings, biometricProtection: false, pinEnabled: false, autoLockMinutes: 0 };
}

/** Persisted provider metadata is not proof that its credential remains valid. */
export function requireCloudAccountRevalidation(accounts: readonly CloudAccount[]): CloudAccount[] {
  return accounts.map(account => account.status === 'connected' ? { ...account, status: 'permission_required' } : account);
}

export type DriveUiStatus = 'configuration_required' | 'disconnected' | 'connected';
export function driveUiStatus(input: Readonly<{ platform: string; clientId?: string; account?: CloudAccount }>): DriveUiStatus {
  const clientId = input.clientId?.trim() ?? '';
  if (input.platform === 'web' || !/^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(clientId)) return 'configuration_required';
  return input.account?.providerType === 'google_drive' && input.account.status === 'connected' ? 'connected' : 'disconnected';
}