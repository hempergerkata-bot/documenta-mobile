import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Gemini retry attempts reserve uniquely and release failures", async () => {
  let source: string;
  try { source = await readFile("src/routes/documentaIntelligence.ts", "utf8"); }
  catch { source = await readFile("artifacts/api-server/src/routes/documentaIntelligence.ts", "utf8"); }
  const start = source.indexOf("async function callGemini(");
  const end = source.indexOf("/** Anonymous bootstrap", start);
  const body = source.slice(start, end);
  const loop = body.indexOf("for (let attempt = 0; attempt < 3; attempt += 1)");
  const uniqueId = body.indexOf(":attempt-${attempt + 1}`", loop);
  const reserve = body.indexOf("await reserveProvider(", loop);
  const outbound = body.indexOf("generateContent(", loop);
  const release = body.indexOf('"FAILED_RELEASED"', outbound);
  assert.ok(loop >= 0 && uniqueId > loop, "attempt must derive a unique operation ID inside the loop");
  assert.ok(reserve > uniqueId && reserve < outbound, "each attempt must reserve immediately before its outbound call");
  assert.ok(release > outbound, "a failed outbound attempt must release its own reservation");
  assert.equal(body.slice(0, loop).includes("await reserveProvider("), false, "Gemini must not pre-reserve outside the retry loop");
});