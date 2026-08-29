import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type StoredProviderCredential = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
};

const prefix = 'documenta.provider.credential.';
const memoryStore = new Map<string, string>();

export function credentialKey(accountId: string): string {
  return `${prefix}${accountId.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

export async function secureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveProviderCredential(accountId: string, credential: StoredProviderCredential): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (!(await secureStoreAvailable())) return false;
    await SecureStore.setItemAsync(credentialKey(accountId), JSON.stringify(credential), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch {
    return false;
  }
}

export async function loadProviderCredential(accountId: string): Promise<StoredProviderCredential | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    if (!(await secureStoreAvailable())) return undefined;
    const raw = await SecureStore.getItemAsync(credentialKey(accountId), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<StoredProviderCredential>;
    if (typeof parsed.accessToken !== 'string' || typeof parsed.expiresAt !== 'number' || typeof parsed.scope !== 'string') return undefined;
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken, expiresAt: parsed.expiresAt, scope: parsed.scope };
  } catch {
    return undefined;
  }
}

export async function removeProviderCredential(accountId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(credentialKey(accountId));
  } catch {
    // A disconnect remains safe when the OS credential was already removed.
  }
}

export async function saveImapPassword(accountId: string, password: string): Promise<boolean> {
  if (!password || !(await secureStoreAvailable())) return false;
  try {
    await SecureStore.setItemAsync(`${credentialKey(accountId)}.imap-password`, password, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    return true;
  } catch { return false; }
}

export async function loadImapPassword(accountId: string): Promise<string | undefined> {
  if (!(await secureStoreAvailable())) return undefined;
  try { return (await SecureStore.getItemAsync(`${credentialKey(accountId)}.imap-password`)) ?? undefined; } catch { return undefined; }
}

export async function removeImapPassword(accountId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try { await SecureStore.deleteItemAsync(`${credentialKey(accountId)}.imap-password`); } catch { /* already absent */ }
}

/** Only used by deterministic tests; production credentials never use this map. */
export function clearTestCredentialMemory(): void {
  memoryStore.clear();
}