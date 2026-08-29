const DOCUMENT_AI_PRESERVED_ERRORS = new Set([
  "document_ai_not_configured",
  "document_ai_empty_result",
  "quota_exceeded",
]);

/** Keeps control-plane errors actionable while hiding provider implementation details. */
export function normalizeDocumentAiError(error: unknown) {
  return error instanceof Error && DOCUMENT_AI_PRESERVED_ERRORS.has(error.message)
    ? error.message
    : "document_ai_failed";
}

export function hasUnsupportedCloudMime(value: unknown) {
  return Array.isArray(value) && value.some((item) => {
    if (!item || typeof item !== "object") return false;
    const mime = (item as Record<string, unknown>).mimeType;
    return typeof mime === "string" && !["image/jpeg", "image/png"].includes(mime);
  });
}