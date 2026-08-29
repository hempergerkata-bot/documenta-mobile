# Third-party notices

This application directly uses **react-native-fast-opencv** (version 0.4.8),
copyright © 2024–2026 Lukasz Kurant, licensed under the MIT License. Its
source and license are included in `node_modules/react-native-fast-opencv/LICENSE`.

`react-native-fast-opencv` distributes and links OpenCV native components.
OpenCV is copyright © OpenCV contributors and is licensed under the
Apache License, Version 2.0. The complete Apache 2.0 license and OpenCV
notices are supplied by that dependency in its native distribution.

The app also uses `jpeg-js` (MIT), `pdf-lib` (MIT), Expo modules (MIT), and
Google ML Kit text-recognition bindings under their respective upstream
licenses. This notice does not replace the full license texts shipped by
those dependencies.

## Local document-intelligence cost and license audit

The Document Intelligence pipeline is implemented as deterministic local
TypeScript code. It does not call a remote AI model, paid API, cloud OCR,
analytics service, or other usage-based backend, and it adds no dependency.

**Jelenlegi kötelező külső licenc-/szolgáltatásköltség: 0 €**

The existing direct native wrappers declare these licenses in their installed
package metadata:

- `react-native-pdf` 7.0.5: MIT
- `react-native-document-scanner-plugin` 2.0.4: MIT
- `@react-native-ml-kit/text-recognition` 2.0.0: MIT

The wrapper license does not replace the upstream terms that apply to bundled
or linked native components. In particular, Google ML Kit and platform SDK
terms must still be reviewed for distribution and attribution requirements.
The app uses the on-device text-recognition path; the Document Intelligence
feature does not introduce a per-call cloud fee or mandatory license key.

Zero-cost replacement paths remain available if an upstream term changes:
local Tesseract OCR for text recognition, platform-native PDF rendering, and
the existing deterministic TypeScript pipeline for document interpretation.

## Email, calendar, notification, and voice integration notices

The API server used with this application directly uses **imapflow** 1.7.6,
copyright © Andris Reinman and contributors, under the MIT License. Its source
and complete license text are supplied by the dependency at
`artifacts/api-server/node_modules/imapflow/LICENSE`.

The following Expo packages currently declared by the mobile app are
distributed under the MIT License (copyright notices and full license texts
remain in their respective upstream packages):

| Package | Declared version |
| --- | --- |
| `expo` | ~54.0.27 |
| `expo-auth-session` | ~7.0.11 |
| `expo-blur` | ~15.0.8 |
| `expo-calendar` | ~15.0.8 |
| `expo-constants` | ~18.0.11 |
| `expo-crypto` | ~15.0.9 |
| `expo-dev-client` | 6.0.21 |
| `expo-document-picker` | ~14.0.8 |
| `expo-file-system` | ~19.0.24 |
| `expo-font` | ~14.0.10 |
| `expo-glass-effect` | ~0.1.4 |
| `expo-haptics` | ~15.0.8 |
| `expo-image` | ~3.0.11 |
| `expo-image-manipulator` | ~14.0.8 |
| `expo-image-picker` | ~17.0.9 |
| `expo-linear-gradient` | ~15.0.8 |
| `expo-linking` | ~8.0.10 |
| `expo-location` | ~19.0.8 |
| `expo-notifications` | ~0.32.17 |
| `expo-print` | ~15.0.8 |
| `expo-router` | ~6.0.17 |
| `expo-secure-store` | ~15.0.8 |
| `expo-sharing` | ~14.0.8 |
| `expo-speech` | ~14.0.8 |
| `expo-splash-screen` | ~31.0.12 |
| `expo-status-bar` | ~3.0.9 |
| `expo-symbols` | ~1.0.8 |
| `expo-system-ui` | ~6.0.9 |
| `expo-web-browser` | ~15.0.10 |

Expo packages invoke operating-system APIs and may be subject to Apple,
Google, Android, or other platform SDK terms in addition to their wrapper
licenses. OAuth providers, mailbox providers, and Microsoft Graph have their
own terms and account requirements. None of these packages or integrations
introduces a mandatory paid Documenta service, mandatory license purchase, or
usage-based service fee.

**Mandatory external license/service cost for the email, calendar,
notification, and local-voice feature: 0 EUR.**

## Backup and recovery notices

The backup implementation uses **react-native-quick-crypto 0.7.17** (MIT
License, as declared in its installed package metadata). On iOS and Android,
platform-resolved `backupCryptoProvider.native.ts` wires that package for native
CSPRNG, SHA-256, PBKDF2-SHA-256, and AES-256-GCM. Browser and Node paths use
standards WebCrypto. It does not add a paid backup SDK, hosted Documenta key
service, remote recovery service, or mandatory usage-based service.

Google Drive, Google OAuth, Apple, Android, and operating-system file/share
facilities remain subject to their provider/platform terms and account or
developer-program requirements. A user's independently obtained account or
developer access is not a Documenta service charge.

**Mandatory dependency/service cost for Task #20 backup and recovery: 0 EUR.**

Production Expo bundles for iOS and Android were successfully exported.
Physical-device crypto and live Google Drive flows remain **NOT RUN** / **not
LIVE VALIDATED**; they are covered by the existing
[REAL_DEVICE_TEST_PLAN.md](REAL_DEVICE_TEST_PLAN.md).
