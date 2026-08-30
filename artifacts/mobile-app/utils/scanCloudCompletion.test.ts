import { observeScanCloudCompletion, publishScanCloudCompletion } from './scanCloudCompletion';
import type { ScanCloudCompletion } from './scanCloudCompletion';

declare function require(name: string): any;
const test: (name: string, body: () => void | Promise<void>) => void = require('node:test');
const assert = require('node:assert/strict');

const completion: ScanCloudCompletion = {
  cloudState: 'cloud',
  cloudPipeline: {
    optedIn: true,
    localOcr: { state: 'succeeded', textAvailable: true },
    documentAiOcr: { state: 'succeeded' },
    gemini: { state: 'succeeded', input: 'document_ai_ocr' },
    fallbackUsed: false,
    failures: [],
    finalProvider: 'document_ai_gemini',
    cloudState: 'cloud',
  },
};

test('delivers a completion published before save exactly once', () => {
  publishScanCloudCompletion('before-save', completion);
  let calls = 0;
  observeScanCloudCompletion('before-save', () => { calls += 1; });
  observeScanCloudCompletion('before-save', () => { calls += 1; });
  assert.equal(calls, 1);
});

test('delivers a completion published after save exactly once', () => {
  let calls = 0;
  observeScanCloudCompletion('after-save', () => { calls += 1; });
  publishScanCloudCompletion('after-save', completion);
  publishScanCloudCompletion('after-save', completion);
  assert.equal(calls, 1);
});