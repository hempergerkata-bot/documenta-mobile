import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasUnsupportedCloudMime, normalizeDocumentAiError } from "./documentaProviderErrors";

test("preserves quota exhaustion for HTTP 429 mapping", () => {
  assert.equal(normalizeDocumentAiError(new Error("quota_exceeded")), "quota_exceeded");
});

test("redacts unknown provider errors", () => {
  assert.equal(normalizeDocumentAiError(new Error("credential detail")), "document_ai_failed");
});

test("accepts PDF and rejects unsupported cloud MIME input", () => {
  assert.equal(hasUnsupportedCloudMime([{ mimeType: "application/pdf", contentBase64: "AA==" }]), false);
  assert.equal(hasUnsupportedCloudMime([{ mimeType: "image/png", contentBase64: "AA==" }]), false);
  assert.equal(hasUnsupportedCloudMime([{ mimeType: "text/plain", contentBase64: "AA==" }]), true);
});

test("both cloud routes perform MIME rejection before Document AI invocation", async () => {
  let source: string;
  try { source = await readFile("src/routes/documentaIntelligence.ts", "utf8"); }
  catch { source = await readFile("artifacts/api-server/src/routes/documentaIntelligence.ts", "utf8"); }
  for (const route of ['router.post("/documenta/documents/process"', 'router.post("/documenta/cloud-ocr"']) {
    const start = source.indexOf(route);
    const nextRoute = source.indexOf("\nrouter.", start + route.length);
    const body = source.slice(start, nextRoute < 0 ? undefined : nextRoute);
    assert.ok(body.indexOf("hasUnsupportedCloudMime") >= 0);
    assert.ok(body.indexOf("hasUnsupportedCloudMime") < body.indexOf("documentAiOcr("));
  }
});