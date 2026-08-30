import type { CloudIntelligence, ScanCloudPipelineState } from './documentaCloudMapping';

export type ScanCloudCompletion = {
  cloudIntelligence?: CloudIntelligence;
  cloudPipeline: ScanCloudPipelineState;
  cloudState: ScanCloudPipelineState['cloudState'];
};

type Listener = (completion: ScanCloudCompletion) => void;
const completed = new Map<string, ScanCloudCompletion>();
const listeners = new Map<string, Listener>();
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const COMPLETION_TTL_MS = 10 * 60 * 1000;

function clearHandoff(documentId: string) {
  listeners.delete(documentId);
  completed.delete(documentId);
  const timer = expiryTimers.get(documentId);
  if (timer) clearTimeout(timer);
  expiryTimers.delete(documentId);
}

function scheduleExpiry(documentId: string) {
  const current = expiryTimers.get(documentId);
  if (current) clearTimeout(current);
  const timer = setTimeout(() => clearHandoff(documentId), COMPLETION_TTL_MS);
  // Node's test runner must not be kept alive by a mobile lifecycle timer.
  (timer as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();
  expiryTimers.set(documentId, timer);
}

/** Delivers an in-flight scan result to the document that was saved meanwhile. */
export function publishScanCloudCompletion(documentId: string, completion: ScanCloudCompletion) {
  const listener = listeners.get(documentId);
  if (!listener) {
    completed.set(documentId, completion);
    scheduleExpiry(documentId);
    return;
  }
  listener(completion);
  clearHandoff(documentId);
}

/**
 * Registers before saving. A result which arrived during the save is delivered
 * immediately, so neither navigation nor the pending-asset lifetime loses it.
 */
export function observeScanCloudCompletion(documentId: string, listener: Listener) {
  listeners.set(documentId, listener);
  scheduleExpiry(documentId);
  const completion = completed.get(documentId);
  if (completion) {
    listener(completion);
    clearHandoff(documentId);
  }
  return () => clearHandoff(documentId);
}