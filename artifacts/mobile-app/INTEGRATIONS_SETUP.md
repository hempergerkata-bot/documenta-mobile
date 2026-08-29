# Email, calendar, and local-device integration setup

This document describes the configuration required to connect real accounts to
Documenta. The app is offline-first and email access is read-only. A provider
must not be described as connected until the user has completed consent and
Documenta has stored the resulting credential in native secure storage.

## Cost and deployment rule

**Mandatory external license/service cost: 0 EUR.** No billing SDK, paid
provider tier, remote-push backend, or usage-based cloud AI/TTS/search service
is required by this feature. A user may independently have a paid mailbox or
mobile-platform account; that is not a mandatory cost imposed by Documenta.

OAuth, secure storage, calendar, notifications, and local voice discovery are
native capabilities. They are not qualified by a web preview. Use an Android
or iOS Development Build for the native checks in
[REAL_DEVICE_TEST_PLAN.md](REAL_DEVICE_TEST_PLAN.md).

For backup crypto, native platform resolution uses
`backupCryptoProvider.native.ts`, which wires **react-native-quick-crypto
0.7.17** to native CSPRNG, SHA-256, PBKDF2-SHA-256, and AES-256-GCM. Browser
and Node paths use standards WebCrypto. Production Expo bundles for iOS and
Android were successfully exported; physical-device crypto and live Google
Drive flows remain **NOT RUN** / **not LIVE VALIDATED** and must follow the
existing real-device plan.

## OAuth common rules

- Register a **public/native client**. Do not create or ship a client secret.
- Register the exact custom redirect URI: **`documenta://oauth`**. The Expo
  configuration declares scheme `documenta`; the app creates
  `scheme: 'documenta', path: 'oauth'`.
- Build-time public configuration names are:
  - `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
  - `EXPO_PUBLIC_MICROSOFT_CLIENT_ID`
  - `EXPO_PUBLIC_OAUTH_REDIRECT_URI=documenta://oauth` (recommended, although
    the native fallback constructs the same URI)
- `EXPO_PUBLIC_*` values are public application configuration. They are
  appropriate only for client IDs and the redirect URI—never a secret,
  password, access token, refresh token, or API key.
- The implementation uses authorization code flow with PKCE. The verifier is
  supplied during code exchange. OAuth consent runs only after the user taps
  Connect.
- Do not use an Expo Go/web-preview result as proof of native OAuth support.
  The connection path intentionally reports that a native Development Build is
  required on web.

Provider-console changes, verified redirect registration, consent-screen
publication, tenant policy, and a test account are external prerequisites.
They are configuration prerequisites, not product-code blockers.

## Google: Gmail and Calendar

1. In Google Cloud Console, create/select a project and configure the OAuth
   consent screen for the intended test users or publishing state.
2. Create an Android/iOS public OAuth client matching the application package/
   bundle configuration and register **`documenta://oauth`** as its redirect
   URI where the client type permits custom URI redirects. Follow Google's
   platform-specific redirect/client guidance; do not substitute a web client
   secret into the app.
3. Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in the build environment and set
   `EXPO_PUBLIC_OAUTH_REDIRECT_URI=documenta://oauth`.
4. Add the currently requested scopes exactly:
   - `openid`
   - `email`
   - `https://www.googleapis.com/auth/gmail.readonly`
    - `https://www.googleapis.com/auth/calendar.events`
5. Enable Gmail API. Enable Google Calendar API if calendar listing/read
   features are being evaluated. Gmail is deliberately **readonly**: Documenta
   neither sends, deletes, labels, nor modifies Gmail messages.

The app requests offline access and consent/account selection so a provider may
return a refresh token. The token is retained only if the OS secure store is
available. Google disconnect attempts token revocation and always removes the
local credential even when revocation cannot run (for example, offline).

`calendar.events` is requested solely for the explicit user-confirmed calendar
candidate create/update flow. Gmail remains readonly; the app does not send,
delete, label, or otherwise mutate mail.

## Google Drive backup: dedicated app-data OAuth

Google Drive backup uses a **dedicated least-privilege consent flow**. It does
not reuse the Gmail/Calendar scope set. Configure the Google project and native
public client as follows:

1. Enable the Google Drive API and configure the OAuth consent screen/test
   users.
2. Register a **public Android/iOS client** for the Development Build. The flow
   is authorization code with PKCE; **do not create, configure, or ship a
   client secret**.
3. Register the exact redirect **`documenta://oauth`** where the selected
   Google client type permits it, and ensure the package/bundle identity
   matches the Development Build. Follow Google's current native-client
   redirect rules rather than substituting a confidential web client.
4. Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` and
   `EXPO_PUBLIC_OAUTH_REDIRECT_URI=documenta://oauth` in the build environment.
5. Grant only `openid`, `email`, and
   `https://www.googleapis.com/auth/drive.appdata` for this backup flow.
   `drive.appdata` limits storage to the app's private `appDataFolder`; the
   backup feature does not request access to the user's ordinary Drive files.

The UI must remain in an explicit **requires configuration** state when the
public client ID or redirect is absent, when the native network/crypto boundary
is unavailable, or when running in web preview. Missing/expired app-data
consent, a token for the wrong account, or rejected authorization is a
reconnect/permission state, never a false Connected state. OAuth credentials
are kept in native secure storage and are deliberately excluded from backups.
After restore, providers must be reauthenticated.

The Drive setup and backup design are described further in
[BACKUP_RECOVERY.md](BACKUP_RECOVERY.md). **Live Google Drive testing and both
iOS and Android Development Build testing were NOT RUN for Task #20.**

## Microsoft: Outlook/Microsoft 365 and Calendar

1. In Microsoft Entra ID, register a **public client/native application**.
   Enable public client flows as required by the tenant policy.
2. Add the mobile custom redirect URI **`documenta://oauth`** to the app
   registration. Do not add a client secret to the mobile app.
3. The implementation uses the `common` tenant authority:
   `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` and
   `/token`. This permits eligible work/school and personal Microsoft
   accounts, subject to tenant policy and consent.
4. Set `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` and
   `EXPO_PUBLIC_OAUTH_REDIRECT_URI=documenta://oauth` in the build environment.
5. Add/delegate and consent to these exact Graph scopes:
   - `openid`
   - `email`
   - `offline_access`
   - `User.Read`
   - `Mail.Read`
   - `Calendars.ReadWrite`

`Mail.Read` is read-only mail access. `Calendars.ReadWrite` is requested only
because the explicit user-confirmed calendar flow can create or update the
selected calendar event. A tenant administrator may prohibit public-client
flow, user consent, or either delegated permission; such a policy must be
resolved by the account/tenant administrator.

## IMAP TLS

The API accepts only hostname-based IMAP over implicit TLS on port **993**.
STARTTLS/insecure port 143 and clear-text IMAP are not supported. Known
autodetected presets are:

| Provider/domain | Host | Port | Transport |
| --- | --- | ---: | --- |
| GMX (`gmx.de`, `.net`, `.at`, `.ch`) | `imap.gmx.com` | 993 | TLS |
| WEB.DE (`web.de`) | `imap.web.de` | 993 | TLS |
| Yahoo (`yahoo.com`, `.de`, `.co.uk`) | `imap.mail.yahoo.com` | 993 | TLS |
| T-Online (`t-online.de`) | `secureimap.t-online.de` | 993 | TLS |

Custom hosts are intentionally **BLOCKED**: the UI does not connect them and
the server accepts only the four audited preset hosts above. Before every IMAP
connection the server resolves the preset again, rejects non-public IPv4/IPv6
results, connects to that resolved public address while retaining the preset
hostname for TLS SNI/certificate validation, and applies a conservative
per-resolved-IP limit. Do not accept URLs/IP literals or downgrade transport.

Many providers require an **app password** when MFA is enabled or have disabled
basic IMAP login. UX/instructions must say “app password” where applicable:
the user generates a provider-specific app password, enters it once in the
secure password field, and can revoke it in the provider account. Documenta
does not ask for an account's normal password when the provider requires an app
password. The app must show a specific authentication failure and leave manual
document import available; it must not log, display, or persist the secret in
app state.

## Credential, privacy, and import boundaries

- OAuth access/refresh tokens and IMAP passwords are stored only via
  `expo-secure-store` on a native device, with OAuth values protected using
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Web does not retain credentials.
- The in-memory credential map is test-only. It is not a production fallback.
  If secure storage is unavailable, connection fails and no credential is
  retained.
- Persisted integration state explicitly strips access tokens, refresh tokens,
  IMAP passwords, and client secrets. Non-sensitive account state, selected
  mailboxes/calendars, ranges, message metadata, attachment metadata, source
  traces, and integration audit/state may be persisted locally.
- OAuth mail listing requests metadata/preview fields. IMAP listing opens the
  mailbox read-only. Neither route sends mail, deletes mail, marks mail read,
  or imports an entire mailbox automatically.
- The user can choose a 7-, 30-, or 90-day range or enter a validated custom
  `from`/`to` range. Sync state and continuation cursors are account-specific.
- Gmail and Graph listings support cursors (`nextPageToken` and
  `@odata.nextLink`) and bound normal initial pages to 50 messages (provider
  URL maximum is 100). IMAP accepts pages of 1–50 and a UID cursor. The UI
  exposes account-specific “Next page”, resync, and retry controls whenever a
  continuation cursor exists.
- Retry is exponential: up to 3 attempts, 250 ms base delay, capped at
  4 seconds, for OAuth API HTTP 429 and 5xx failures. It does not invent a
  response or silently treat failures as imports.
- Imported message and attachment records are account-scoped and have stable
  provider-based IDs; state-level duplicate protection is used when records
  are added. Calendar event linkage also uses source reference/calendar
  identity. Cross-account source links must remain isolated.
- Attachment candidates are limited to PDF or image MIME types and 25 MiB.
  IMAP download hashes the bytes (SHA-256), rejects larger/other types, and
  enters a user-confirmed Documenta import path. Gmail, Microsoft Graph, and
  IMAP attachments all require an explicit user import action; none are
  downloaded into the document pipeline automatically.
- Imported metadata and user-confirmed documents follow the app's local
  retention setting. Disconnect/revocation removes credentials, **not** already
  imported local data. Users retain normal control of those local records;
  providers do not receive document-pipeline output.

## Device calendars and local notifications

Calendar permission is requested only when the user chooses to load device
calendars or creates a confirmed device-calendar event. The app lists writable
device calendars, lets the user select one, writes only after explicit
candidate confirmation, then reads the event back. Invalid dates and failed
writes do not create a persisted success record.

Local notification permission is requested when scheduling/testing a local
notification. Android config declares the `documenta-local` channel. Scheduled
notifications use a future date trigger; recovery compares known scheduled
IDs after app restart and reschedules missing future entries. There is no
remote-push service. Private-mode lock-screen body is the generic
“Documenta hat eine lokale Erinnerung.” and navigation data contains only the
target route, not document/action/case detail.

These need physical Android/iOS validation because web returns no native
calendar/notification result. See the device plan for permission-denied,
restart, reschedule/cancel, deep-link and platform-specific checks.

## Local speech behavior

Expo Speech is used for local voice discovery and a neutral, short preview/
explanation. Available voices are filtered to voices reported as local-service
voices; the user preference can refer to locale, quality, and voice identifier.
There is no automatic cloud TTS fallback. If no local voice is available,
discovery returns no eligible voice; the UI must communicate that condition
rather than sending text to a cloud service. Speech output is platform-service
dependent and requires a native device test.

## Tester entitlement

The Premium integration surface is entitlement-gated. The current tester UI
can activate tester access for 15 or 30 days without a payment SDK. Entitlement
state supports tester access, access start/end dates, source/status, and
future `monthly_subscription`, `one_time_purchase`, `lifetime_unlock`, `trial`,
and `promo` sources. These represent state/model support only: no store
billing, automatic charge, or renewal is enabled. Expiry locks new premium
actions but must not delete imported data.

## Capability matrix (code-inspection report)

Capability labels are exactly: **IMPLEMENTED** means code exists;
**PREPARED** means code exists but requires external provider/account/build
configuration or has not received a live test; **LIVE VALIDATED** means a
named live provider and physical Development Build passed with recorded
evidence. This report is based on source inspection only—no real provider or
native device validation was performed for this documentation task, so no row
is LIVE VALIDATED.

| Capability | Status | Evidence / test environment |
| --- | --- | --- |
| OAuth authorization-code + PKCE, custom redirect, secure token save | PREPARED | `providerAdapters.ts`, `secureCredentials.ts`; needs configured public client and native Development Build |
| Google Gmail readonly metadata listing, range/cursor/retry | PREPARED | Gmail URL/scopes and adapter are implemented; requires Google project/account |
| Microsoft mail metadata listing, range/cursor/retry | PREPARED | Graph adapter is implemented; requires Entra registration/account |
| OAuth refresh/revoke and reconnect state | IMPLEMENTED | Requests refresh before expiry, retry once after 401, and preserve local imports when reconnect is required; live provider behavior untested |
| Gmail/Graph attachment download into document pipeline | PREPARED | Metadata is listed then only user-selected PDF/image attachments at or below 25 MiB enter the pending-asset flow; provider/device validation remains required |
| TLS-only audited IMAP presets, server read-only listing/download | PREPARED | audited preset host/IP policy plus `realIntegrations.ts` and API `routes/imap.ts`; needs real IMAP account/app password |
| IMAP attachment filtering, 25 MiB maximum, SHA-256 | IMPLEMENTED | API validates MIME/size and hashes downloads; live server/device test not performed |
| User-facing custom range and next-page continuation | IMPLEMENTED | Screen exposes custom date fields, retry, and account-specific next-page cursors |
| Multi-account data model/account-scoped IDs | IMPLEMENTED | Integration state and provider account IDs are account-scoped |
| Multi-account sync management in UI | IMPLEMENTED | Connect remains available and each connected account has independent sync controls/status |
| Microsoft calendar select/create/update/readback | PREPARED | Graph adapter and explicit confirmation flow exist; needs consented tenant/account |
| Google calendar write | PREPARED | `calendar.events` scope plus explicit candidate confirmation; requires consented Google account and native validation |
| Device calendar select/create/update/readback | PREPARED | `expo-calendar` adapter; physical-device permission test required |
| Local notification permission/schedule/cancel/recovery/test | PREPARED | `expo-notifications` adapter/config; physical-device test required |
| Local-only voice discovery/preview | PREPARED | `expo-speech` local-service filtering; physical-device voice inventory required |
| Tester entitlement without billing | IMPLEMENTED | Entitlement model and 15/30-day tester UI; no billing SDK |

### Backup capability labels

Task #20 uses exactly these qualification labels:

- **IMPLEMENTED** — the code path exists and can be established by source
  inspection; this is not a claim of live provider/device success.
- **PREPARED** — implementation exists, but external configuration or native/
  live validation is still required.
- **LIVE VALIDATED** — passed against the named real provider and physical
  Development Build with recorded evidence.

No Task #20 capability is labelled **LIVE VALIDATED**. Live Google Drive and
iOS/Android Development Build tests were **NOT RUN**.

| Task #20 capability | Label | Basis |
| --- | --- | --- |
| Dedicated Google Drive `drive.appdata` OAuth, PKCE, custom redirect, secure credential storage | PREPARED | Native flow exists; Google client/consent and physical Development Builds are required |
| AES-256-GCM envelope, PBKDF2-SHA-256 passphrase derivation, authenticated decryption and secret stripping | IMPLEMENTED | `backupCryptoProvider.native.ts` wires react-native-quick-crypto 0.7.17 for native CSPRNG/SHA-256/PBKDF2-SHA-256/AES-256-GCM; browser/Node use standards WebCrypto; physical-device crypto remains NOT RUN |
| Encrypted manifest/assets, SHA-256 verification, bounded uploads, incremental content-addressed asset reuse | PREPARED | Orchestration and Drive adapter exist; live Drive transfer was not run |
| Ownership checks, deterministic conflict classification, prepare-then-confirm restore | IMPLEMENTED | Restore planning prevents commit until validation and conflicts permit confirmation |
| Local encrypted export/import with verified asset staging | PREPARED | Native picker/sharing/file paths exist; iOS/Android Development Build test was not run |
| Foreground, session-unlocked automatic backup timer | PREPARED | Debounced active-app path exists; no background OS execution is claimed and device validation remains |
