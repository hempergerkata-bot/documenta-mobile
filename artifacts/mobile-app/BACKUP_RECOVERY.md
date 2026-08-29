# Backup and recovery

## Qualification and cost

Task #20 uses these exact capability labels:

- **IMPLEMENTED:** the code path exists and its behavior can be identified by
  source inspection. This label is not evidence of a successful live provider
  or physical-device run.
- **PREPARED:** implementation exists, but provider configuration, a supported
  native runtime, or live validation remains required.
- **LIVE VALIDATED:** the capability passed against the named live provider on
  the named physical iOS/Android Development Build and evidence was recorded.

No Task #20 capability is currently **LIVE VALIDATED**. **Live Google Drive,
iOS Development Build, and Android Development Build tests were NOT RUN.**
Follow [REAL_DEVICE_TEST_PLAN.md](REAL_DEVICE_TEST_PLAN.md) before changing a
label.

Production Expo bundles for both iOS and Android were successfully exported.
This confirms the native module is included in those production bundle exports;
it is not physical-device crypto evidence. Physical-device crypto and live
Google Drive flows remain **NOT RUN** / **not LIVE VALIDATED** and remain in the
existing real-device plan.

**Mandatory dependency/service cost: 0 EUR.** There is no paid backup SDK,
Documenta-hosted storage/key server, universal recovery service, or mandatory
usage-based backend.

## Security and passphrase model

Backup state, manifests, and every asset payload are encrypted before upload or
local export using AES-256-GCM with a fresh 16-byte salt and 12-byte nonce.
Passphrases are converted to a 256-bit key with PBKDF2-HMAC-SHA-256 using
210,000 iterations. Envelope metadata is authenticated as additional data, and
the GCM tag detects a wrong key or modification. SHA-256 content and manifest/
state hashes add integrity and content-addressing checks.

The passphrase is supplied for an operation and is not included in a backup.
Provider OAuth credentials, passwords, secrets, and native notification handles
are recursively removed before serialization. The implementation can also
accept an exact 32-byte raw key at its provider-neutral crypto boundary, but
the app's user backup flows use a passphrase.

There is **no universal key, escrow key, back door, password reset, or
provider-side passphrase recovery**. Losing the passphrase makes the encrypted
backup permanently unrecoverable. A wrong passphrase or modified ciphertext
must fail closed; it must not produce a partial restore. Users must retain the
passphrase separately in a trusted password manager.

Native iOS and Android resolution uses
`backupCryptoProvider.native.ts`, wired to **react-native-quick-crypto
0.7.17**, for native CSPRNG, SHA-256, PBKDF2-SHA-256, and AES-256-GCM.
Browser and Node resolution use standards WebCrypto. If the applicable
native/runtime boundary or OAuth configuration is unavailable, the feature is
**requires configuration**; it must never downgrade to weak encryption or claim
success.

## Google Drive layout and connection states

The dedicated OAuth flow is authorization code with PKCE, a public native
client, `documenta://oauth`, and no client secret. It requests only `openid`,
`email`, and `https://www.googleapis.com/auth/drive.appdata`. Objects are
stored in the app-private `appDataFolder`, not the user's normal Drive file
space.

The adapter reports requires configuration when the public client ID/redirect
or runtime network boundary is missing. Missing app-data scope, expiry,
revocation, rejected authorization, and mismatched account ownership require
permission/reconnection. Credentials remain in native secure storage and are
never restored from a backup.

Remote object names are neutral. Assets use content-addressed keys; manifests
are encrypted `.dcbak` envelopes. Publication uploads immutable encrypted
assets first, then the encrypted manifest, verifies the downloaded encrypted
manifest, and publishes a neutral current pointer last. The pointer contains
only an opaque manifest key and ciphertext hash.

## Incremental, limits, integrity, and retention

- Unchanged assets are identified by SHA-256/content-addressed key and skipped;
  changed/new assets are encrypted and uploaded. Each snapshot still receives
  a new encrypted manifest.
- Default per-file plaintext limit is 25 MiB and total asset limit is 100 MiB.
  The crypto envelope allows at most 25 MiB plaintext and 35 MiB serialized
  envelope; hash input is bounded at 100 MiB.
- The Drive adapter bounds each simple multipart object upload to 5 MiB.
  The current app orchestration does not implement resumable upload or split
  one encrypted asset envelope across objects, so an envelope over 5 MiB is
  rejected rather than partially published. This provider-object bound can be
  reached before the plaintext policy maxima above.
- Upload validates a supplied object hash. Restore validates authenticated
  decryption, schema, manifest hash, state hash, asset metadata, byte length,
  and SHA-256 before a plan can be committed.
- Default retention is the newest 3 snapshots and must remain a positive
  integer. Excess encrypted manifests are deleted after a completed publish.
  Retention is snapshot housekeeping, not proof that unreferenced immutable
  asset objects have been garbage-collected.
- Cancellation/interruption journal stages make incomplete work visible. Only
  a complete, content-addressed manifest is eligible for the latest pointer.

Do not describe this as continuous sync or OS background backup.

## Ownership, conflicts, and two-step restore

Manifest account ownership is compared with the active account. Cross-account
restore requires the applicable entitlement; credential/account mismatch is
rejected. Discovery marks whether a snapshot is owned and whether entitlement
is required.

Restore is deliberately two-step:

1. **Prepare:** download and decrypt, validate schema and all hashes, stage
   verified assets, relink file URIs, rebuild derived search state, and produce
   a conflict preview. Local state is not committed by preparation.
2. **Confirm:** only a prepared, conflict-free plan may replace local state
   after a second explicit user action.

Document conflicts compare canonical base/local/remote values. Identical,
local-only, and remote-only cases have deterministic handling. Deletions and
both-sides-changed records require manual correction; there is no silent
last-write-wins rule. Current UI behavior blocks commit while manual conflicts
exist.

After commit, saved provider metadata may remain for context, but connected
email accounts become reconnect-required, calendar accounts become
permission-required, and native notification instances become unscheduled.
Provider credentials are not restored: a destination device must reauthenticate
the applicable providers. An already-present same-device secure-store
credential has its own lifecycle and is not sourced from the backup. The user
must explicitly reschedule applicable future native notifications; restored OS
notification IDs are never trusted.

## Local encrypted export and import

The local path creates a portable `.documenta-backup` bundle containing state,
content-hash-named assets, and URI/hash references, then encrypts the entire
bundle with the same passphrase envelope. Native document picker and share
sheet APIs perform import/export. Portable asset content is limited to 20 MiB.

Import authenticates/decrypts the bundle, rejects malformed content or wrong
passphrases, verifies every staged asset's SHA-256 and safe hash name, writes
through a temporary file, verifies size, then relinks URIs. A conflicting
existing document prevents local import rather than silently overwriting it.
Provider reauthentication and native notification rescheduling rules are the
same as cloud restore.

## Automatic backup boundary

Automatic backup is opt-in, dirty-state driven, and debounced for 30 seconds.
It can run only while the app is active in the foreground, a Google Drive
account is connected, entitlement permits backup, and a passphrase remains
available from a backup action in the current unlocked in-memory session.
Leaving the active app clears the timer. The passphrase is not persisted as a
universal/background key.

This is a **session-unlocked foreground convenience**, not background OS
execution. No periodic background task, headless job, remote push trigger, or
guaranteed backup while suspended, locked, terminated, or rebooted is claimed.

## Capability report

| Capability | Label | Remaining qualification |
| --- | --- | --- |
| Crypto envelope, secret stripping, integrity primitives | IMPLEMENTED | Native provider is wired; physical-device crypto remains NOT RUN in the device plan |
| Deterministic ownership/conflict and prepare/confirm restore boundaries | IMPLEMENTED | End-to-end device commit remains unvalidated |
| Dedicated Drive app-data OAuth and secure account connection | PREPARED | Configure Google and run both Development Builds |
| Encrypted incremental Drive publish, retention, discovery, deletion, restore | PREPARED | Run live Drive transfer/interruption/limit tests |
| Local encrypted export/import and verified asset staging | PREPARED | Run native picker/share/filesystem tests on iOS and Android |
| Session-unlocked foreground automatic backup | PREPARED | Run foreground/lifecycle tests; no background claim |