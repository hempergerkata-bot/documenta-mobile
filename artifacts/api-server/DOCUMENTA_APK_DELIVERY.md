# Documenta internal APK delivery

The install page and APK endpoint require a build-scoped, expiring HMAC token. Unsigned, malformed, expired, or overlong-lived links fail closed with HTTP 401. The server also verifies the pinned APK byte size and SHA-256 before serving it.

## Authorized operator workflow

Only a workspace operator with access to the configured `SESSION_SECRET` can mint a link. The secret itself is never printed or included in the link.

From the repository root:

```sh
pnpm --filter @workspace/api-server run mint:documenta-url
```

The default TTL is seven days. To request another TTL, pass whole seconds between 300 and 1,209,600:

```sh
pnpm --filter @workspace/api-server run mint:documenta-url -- 3600
```

The command prints one signed install URL and its expiration time. Treat the URL as a bearer credential and share it only with the intended internal recipient. The install page preserves the same token in its APK link.

## Verification

For each release:

1. Confirm unsigned install and download requests return HTTP 401.
2. Mint a fresh short-lived URL with the operator command.
3. Load the install page and follow its APK link.
4. Verify the full response byte count and SHA-256 against `FEATURE_PARITY_MATRIX.md`.
5. Verify a range request returns HTTP 206 with the expected `Content-Range`.