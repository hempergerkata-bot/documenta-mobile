import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function workspaceFile(local: string, root: string) {
  try { return await readFile(local, "utf8"); }
  catch { return readFile(root, "utf8"); }
}

test("anonymous throttle is durable, hashed, expiring, and has no mint map", async () => {
  const route = await workspaceFile("src/routes/documentaIntelligence.ts", "artifacts/api-server/src/routes/documentaIntelligence.ts");
  const schema = await workspaceFile("../../lib/db/src/schema/documenta.ts", "lib/db/src/schema/documenta.ts");
  assert.equal(route.includes("mintAttempts"), false);
  assert.ok(route.includes('anonymousThrottleHash(secret, "ip"'));
  assert.ok(route.includes("tx.delete(documentaSessionIssuance)"));
  assert.ok(route.includes("documentaSessionIssuance.expiresAt"));
  assert.ok(schema.includes('ipHash: text("ip_hash")'));
  assert.ok(schema.includes('installationHash: text("installation_hash")'));
  assert.ok(schema.includes('expiresAt: timestamp("expires_at"'));
});

test("global active limits are checked under lock before provider reservation", async () => {
  const source = await workspaceFile("src/routes/documentaIntelligence.ts", "artifacts/api-server/src/routes/documentaIntelligence.ts");
  const start = source.indexOf("async function reserveProvider(");
  const end = source.indexOf("async function settleProvider(", start);
  const body = source.slice(start, end);
  const globalLock = body.indexOf("pg_advisory_xact_lock(2147483001)");
  const globalDaily = body.indexOf("GLOBAL_DAILY_PROVIDER_LIMIT");
  const globalMonthly = body.indexOf("GLOBAL_MONTHLY_PROVIDER_LIMIT");
  const insert = body.indexOf("tx.insert(documentaProviderUsage)");
  assert.ok(globalLock >= 0 && globalDaily > globalLock && globalMonthly > globalLock);
  assert.ok(insert > globalDaily && insert > globalMonthly);
  assert.ok(body.includes("RESERVED', 'SUCCEEDED"));
});