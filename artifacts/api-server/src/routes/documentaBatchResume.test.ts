import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("batch resume uses a nested savepoint and handles failure outside it", async () => {
  let source: string;
  try {
    source = await readFile("src/routes/documentaIntelligence.ts", "utf8");
  } catch {
    source = await readFile("artifacts/api-server/src/routes/documentaIntelligence.ts", "utf8");
  }
  const routeStart = source.indexOf('router.post("/documenta/batches/:id/resume"');
  const routeEnd = source.indexOf('router.get("/documenta/documents/:id/relations"', routeStart);
  const route = source.slice(routeStart, routeEnd);
  const nestedStart = route.indexOf("await tx.transaction(async (pageTx) => {");
  const nestedEnd = route.indexOf("\n        });", nestedStart);
  const catchStart = route.indexOf("} catch {", nestedEnd);
  const failedUpdate = route.indexOf('status: "FAILED"', catchStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart, "resume route must exist");
  assert.ok(nestedStart >= 0, "each page must invoke tx.transaction");
  assert.ok(nestedEnd > nestedStart, "nested page transaction must close");
  assert.equal(route.slice(nestedStart, nestedEnd).includes("await tx."), true, "nested savepoint invocation must be present");
  assert.equal(route.slice(nestedStart + 1, nestedEnd).includes("await tx.insert"), false, "nested writes must use pageTx");
  assert.ok(catchStart > nestedEnd && failedUpdate > catchStart, "FAILED update must occur in the outer catch after the savepoint");
});