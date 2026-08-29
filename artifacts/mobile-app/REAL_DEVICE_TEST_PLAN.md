# Real-device integration test plan

## Qualification rule

This plan is intentionally **not** a record of completed testing. Production
Expo bundles for iOS and Android were successfully exported, but no physical
native-device crypto, live Google Drive, live Google, live Microsoft, or live
IMAP validation was performed while producing this documentation. Web preview,
mocked responses, source inspection, and a successful build/export do not
qualify as a real-provider PASS.

For the backup path, platform resolution selects
`backupCryptoProvider.native.ts`, wired to **react-native-quick-crypto
0.7.17**, for native CSPRNG, SHA-256, PBKDF2-SHA-256, and AES-256-GCM. Browser
and Node paths use standards WebCrypto. Physical-device crypto remains **NOT
RUN** / **not LIVE VALIDATED** under this plan.

Run this once on an Android Development Build and once on an iOS Development
Build where the relevant platform supports the capability. Record build ID,
OS/device, app version, account type, provider tenant/policy outcome, test
date, and result without recording any credential, token, mailbox content, or
notification payload containing personal data.

## Prerequisites

1. Use a Development Build whose app configuration contains scheme `documenta`,
   the `expo-secure-store`, `expo-calendar`, `expo-notifications`,
   `expo-web-browser`, and `expo-dev-client` plugins, and Android package
   `com.documenta.app` / the corresponding iOS bundle configuration.
2. Configure Google and Microsoft public clients exactly as described in
   [INTEGRATIONS_SETUP.md](INTEGRATIONS_SETUP.md), including the exact
   `documenta://oauth` redirect and public env names. Use separately approved
   non-production test accounts with messages in known dates and a small
   PDF/image attachment.
3. Prepare an IMAP test mailbox with a supported audited preset (custom hosts
   are intentionally blocked),
   implicit TLS 993 enabled, and a provider-issued app password if required.
   Prepare a second IMAP account to test account isolation.
4. Prepare a writable Google, Microsoft, and device calendar. Have a device
   that can show local notifications. Enable/disable permissions during tests.
5. Start with no saved provider credential. Enable tester entitlement (15 or
   30-day test entitlement) without enabling any payment product.
6. Ensure testers understand the privacy boundary: no screenshots/logs may
   include passwords, tokens, mailbox subjects, addresses, or document
   contents. Test data should be disposable.
7. For Drive backup, enable the Google Drive API and configure the dedicated
   `openid email drive.appdata` public-client consent described in
   [INTEGRATIONS_SETUP.md](INTEGRATIONS_SETUP.md). Prepare a strong test
   passphrase in an approved password manager and disposable documents/assets
   around the documented size boundaries. Never place the passphrase in logs.

External OAuth consent, Entra tenant consent/policy, app-password availability,
provider API enablement, device OS permission, and use of a Development Build
are prerequisites—not code BLOCKED states.

## Execution matrix

| Area | Steps | Pass criteria |
| --- | --- | --- |
| Secure-store boundary | Attempt connection on web preview; then connect in Development Build; inspect only app-visible result; disconnect. | Web retains no credential/does not claim connect. Native connection only succeeds with secure storage. Disconnect removes local credential; imported local data remains. |
| Google OAuth/PKCE | With configured test client, tap Connect, select/cancel account once, then complete consent. Relaunch and test a request after token expiry/refresh scenario if safely possible. | Redirect returns to app via `documenta://oauth`; no secret is packaged; cancellation is safe; successful account/profile is correct; expiring credentials refresh before requests and a failed refresh requires reconnect without deleting imported data. |
| Gmail readonly range/listing | Seed messages inside/outside 7/30/90/custom day windows; sync each range; test next page/resync and provoke a rate-limit/server failure only in an approved test environment. | Only messages in chosen range appear; no send/delete/label/read mutation; 429/5xx retry is bounded and errors remain visible. Account-specific cursor continuation is available. |
| Microsoft OAuth/Graph | Repeat Connect with a personal account and, if authorized, work/school tenant under `common`; test tenant denial/consent denial. | Correct redirect/account, readable human failure, no false Connected state under tenant denial. `Mail.Read` remains read-only. |
| Microsoft calendar | Load calendars, select a writable one, confirm a clearly labelled candidate, read back event, confirm an update candidate, disconnect/revoke permission. | Permission only follows user action; selected calendar is used; title/time/timezone/source are visible before confirmation; readback matches; failure/revocation does not silently overwrite local data. |
| Google calendar | Load calendars with a configured project, choose a target, explicitly confirm an event, read it back, then update and read back again. | `calendar.events` consent is present; no write occurs before confirmation; the selected calendar is used and readback matches. |
| IMAP TLS and app password | Connect each audited preset using port 993; verify a custom host is blocked before credentials leave the app; test invalid app password; list 7/30/90/custom range and continuation; download approved and oversized/disallowed attachments. | TLS 993 only; mailbox opened read-only; custom host is never contacted; bad secret gets auth error with manual import available; page size/cursor limits hold; only PDF/image ≤25 MiB can enter candidate path and hash is recorded without exposing bytes. |
| Multi-account/isolation | Connect two approved accounts, use each account's range/next-page/retry controls, import same provider message IDs where possible, disconnect one, then inspect visible metadata/source links. | Every account has independent controls and cursor state; no source metadata or credential crosses accounts; disconnecting one leaves other local state intact. |
| Device calendar permission | Deny then grant calendar permission; load calendars; select writable target; create, read back, update; revoke permission and retry. | No prompt before action; denial is safe; success follows selected calendar; revocation/error produces no false persisted success. |
| Local notifications | Deny then grant permission; send test notification five seconds ahead; schedule a future action reminder; cancel/reschedule; restart/update app and run recovery; tap notification. | Android channel is `documenta-local`; scheduled local notification fires offline; generic private body contains no sensitive detail; tap routes only via target; no remote push is used. |
| Speech | Inventory local voices, choose locale/voice/quality where UI permits, preview neutral text, then test no-local-voice/offline state. | Only local-service voices are offered; preview does not require cloud fallback; unavailable state is explicit. |
| Entitlement/retention | Activate tester access, let/use an expired controlled entitlement, and disconnect providers after importing test data. | No charge/renewal occurs; premium actions lock when appropriate; imported local data is retained until user retention/deletion actions. |

## Task #20 Google Drive and Development Build procedure

**Status at documentation time: NOT RUN.** Production iOS and Android Expo
bundles were successfully exported, but physical-device crypto, live Google
Drive, iOS Development Build, and Android Development Build tests were NOT RUN.
The steps below are required before any Task #20 capability may be changed to
**LIVE VALIDATED**.

Run every applicable step separately on a physical Android Development Build
and a physical iOS Development Build:

1. **Configuration states:** install a build with the client ID omitted and
   verify an explicit requires-configuration result. Install the correctly
   configured build with the exact `documenta://oauth` redirect. Confirm that
   web preview does not claim native backup support.
2. **Dedicated OAuth:** tap Connect Google Drive, cancel once, then consent
   with the approved test account. Inspect the consent screen: it must request
   `drive.appdata` plus identity scopes, not broad Drive, Gmail, or Calendar
   access. Verify PKCE return to the app and that no client secret exists in
   build configuration. Deny consent and test an expired/revoked token; each
   must show permission/reconnect rather than Connected.
3. **Account binding:** connect account A, create a backup, then attempt the
   restore path while account B is selected. Verify ownership/account mismatch
   is visible and no cross-account restore or credential use occurs. Repeat
   the entitled cross-account scenario only if it is an approved product case.
4. **Encrypted upload and incremental behavior:** create a small state-only
   backup and a backup containing PDF/image assets. Inspect Drive API metadata
   using only an approved test tool: objects must be under `appDataFolder`;
   manifests and assets must be encrypted/opaque. Create a second backup
   without changing an asset and verify the content-addressed asset is skipped,
   then modify/add an asset and verify only new content is uploaded before the
   encrypted manifest and neutral latest pointer.
5. **Integrity and interruption:** alter a disposable downloaded ciphertext or
   stored hash through an approved test harness and confirm authenticated
   decryption/SHA-256 validation rejects it without committing state. Cancel or
   interrupt during asset upload, manifest upload, download, and validation;
   relaunch and verify no incomplete snapshot becomes current and the journal/
   visible failure is coherent.
6. **Limits and retention:** verify a file over 25 MiB and total assets over
   100 MiB fail explicitly. Also use an asset whose encrypted/base64 envelope
   exceeds the Drive adapter's 5 MiB object limit and verify the current
   non-resumable path rejects it explicitly rather than partially publishing
   it. Set retention to 3, create at least 4 completed snapshots, and verify
   only excess encrypted manifests are removed while the newest three remain
   discoverable.
7. **Two-step restore/conflicts:** prepare a restore and verify local state is
   unchanged during download, decryption, schema/hash checks, asset staging,
   preview, and conflict classification. Test identical, local-only,
   remote-only, local deletion, remote deletion, and both-sides-changed cases.
   Manual conflicts must prevent confirmation. Only a second explicit Confirm
   action may commit a conflict-free plan.
8. **Post-restore behavior:** verify provider credentials were not restored.
   Restored email/calendar provider records must require reauthentication.
   Drive authorization is not carried in the backup, so a clean destination
   device must connect Drive itself; an existing same-device secure-store
   credential remains a separate lifecycle item. Native notification
   identifiers/schedules must not be restored; future reminders require native
   rescheduling and must not duplicate.
9. **Passphrase recovery boundary:** decrypt with the correct passphrase, then
   try a wrong passphrase and a modified envelope. Both must fail without
   partial restore. With a disposable backup, deliberately discard the
   passphrase and verify there is no universal key, reset route, or provider
   recovery route: the backup is unrecoverable.
10. **Local encrypted portability:** export a `.documenta-backup` through the
    native share sheet, import it on a clean approved device with the correct
    passphrase, and verify hashes, staged assets, URI relinking, and restored
    state. Test wrong passphrase, tampering, cancellation, a conflicting local
    document, and assets exceeding the 20 MiB portable-export limit.
11. **Automatic backup boundary:** enable automatic backup only after entering
    a passphrase in the current unlocked app session. Change data and keep the
    app foregrounded for more than the 30-second debounce; verify one backup.
    Background/lock/terminate the app before the timer and verify no backup is
    claimed. Resume/unlock and verify behavior only in foreground. This is not
    an OS background-execution test because no background execution is
    implemented or claimed.
12. **Record evidence:** capture build ID, package/bundle ID, OS/device,
    account, consent scopes, object counts/sizes (not content), snapshot IDs,
    timestamps, each expected error, and PASS/FAIL/NOT RUN. Do not record
    tokens, passphrases, document data, or ciphertext that could aid an attack.

## Acceptance and defect triage

Mark a row PASS only with its environment evidence. Mark it FAIL for data loss,
credential leakage, mail mutation, event written to a wrong calendar, sensitive
lock-screen content, silent permission/revocation overwrite, or any paid/remote
service requirement. Mark it NOT RUN when a prerequisite is absent; do not
convert NOT RUN to BLOCKED.

Physical provider/device validation remains NOT RUN until this plan is
executed; source inspection is not a PASS.

Task #20 labels are exactly **PREPARED**, **IMPLEMENTED**, and **LIVE
VALIDATED**, with the definitions in
[BACKUP_RECOVERY.md](BACKUP_RECOVERY.md). A source-inspected implementation is
not automatically LIVE VALIDATED.
