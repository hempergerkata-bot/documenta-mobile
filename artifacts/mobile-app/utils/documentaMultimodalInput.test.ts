const test: (name: string, body: () => void | Promise<void>) => void = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises') as { readFile(path: string, encoding: string): Promise<string> };

test('direct mobile multimodal client preserves PDF MIME and uses one endpoint', async () => {
  const source = await readFile('utils/documentaCloud.ts', 'utf8');
  assert.match(source, /blob\.type === 'application\/pdf' \? 'application\/pdf'/);
  assert.match(source, /lower\.includes\('\.pdf'\) \? 'application\/pdf'/);
  assert.match(source, /documents\/multimodal/);
});

test('scanner and gallery share the direct multimodal client', async () => {
  const source = await readFile('app/scan-review.tsx', 'utf8');
  assert.match(source, /processMultimodalDocument\(pageUris, name\)/);
  assert.doesNotMatch(source.slice(source.indexOf('const cloudForPages')), /uploadCloudOcrPages/);
});