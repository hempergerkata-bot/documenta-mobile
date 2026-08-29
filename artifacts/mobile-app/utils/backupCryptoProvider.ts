import { webCryptoProvider, type BackupCryptoProvider } from './backupCrypto';

/** Default provider for Node-based tests and non-platform-aware tooling. */
export function platformCryptoProvider(): BackupCryptoProvider {
  return webCryptoProvider();
}