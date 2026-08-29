import { createHmac } from "node:crypto";

const buildId = "e6289353-bf0c-4e9a-bc47-423981b2398c";
const minimumTtlSeconds = 5 * 60;
const maximumTtlSeconds = 14 * 24 * 60 * 60;
const defaultTtlSeconds = 7 * 24 * 60 * 60;

const requestedTtl =
  process.argv.slice(2).find((argument) => argument !== "--") ??
  String(defaultTtlSeconds);
const ttlSeconds = Number(requestedTtl);
if (
  !Number.isSafeInteger(ttlSeconds) ||
  ttlSeconds < minimumTtlSeconds ||
  ttlSeconds > maximumTtlSeconds
) {
  throw new Error(
    `TTL must be an integer between ${minimumTtlSeconds} and ${maximumTtlSeconds} seconds.`,
  );
}

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "SESSION_SECRET is required. Run this only inside the authorized Replit workspace.",
  );
}

const configuredBaseUrl = process.env.DOCUMENTA_DOWNLOAD_BASE_URL;
const replitDomain = process.env.REPLIT_DEV_DOMAIN;
const baseUrl = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/+$/, "")
  : replitDomain
    ? `https://${replitDomain}`
    : undefined;
if (!baseUrl) {
  throw new Error(
    "Set DOCUMENTA_DOWNLOAD_BASE_URL or run inside the authorized Replit workspace.",
  );
}

const expiresAt = String(Date.now() + ttlSeconds * 1000);
const signature = createHmac("sha256", secret)
  .update(`documenta-apk:${buildId}:${expiresAt}`)
  .digest("hex");

console.error(
  `Documenta internal install link; expires ${new Date(Number(expiresAt)).toISOString()}. Treat it as a bearer credential.`,
);
console.log(
  `${baseUrl}/api/install/documenta?token=${expiresAt}.${signature}`,
);