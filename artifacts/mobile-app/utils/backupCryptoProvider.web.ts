import { webCryptoProvider, type BackupCryptoProvider } from './backupCrypto';

/** Browser builds use the standards-based WebCrypto implementation. */
export function platformCryptoProvider(): BackupCryptoProvider {
  return webCryptoProvider();
}