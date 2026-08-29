import QuickCrypto from 'react-native-quick-crypto';
import { webCryptoProvider, type BackupCryptoProvider, type WebCryptoLike } from './backupCrypto';

/**
 * Development Builds use react-native-quick-crypto's native iOS/Android engine
 * for CSPRNG, SHA-256, PBKDF2-SHA-256, and AES-256-GCM.
 */
export function platformCryptoProvider(): BackupCryptoProvider {
  const nativeWebCrypto: WebCryptoLike = {
    getRandomValues(array) {
      QuickCrypto.getRandomValues(array);
      return array;
    },
    subtle: QuickCrypto.webcrypto.subtle as unknown as NonNullable<WebCryptoLike['subtle']>,
  };
  return webCryptoProvider(nativeWebCrypto);
}