import { assessReconstruction, selectPageVariant } from './documentReconstruction';

const assertEqual = (actual: unknown, expected: unknown, label: string) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
};

const assertJsonEqual = (actual: unknown, expected: unknown, label: string) => {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label);
};

export function runDocumentReconstructionFixtures() {
  for (const fixture of [
  ['flat', 12, 0.01, 0.98, 48, 0.02, 0.02, true],
  ['skew', 30, 0.02, 0.94, 42, 0.05, 0.04, true],
  ['shadow', 42, 0.03, 0.91, 37, 0.42, 0.07, true],
  ['folded', 64, 0.08, 0.86, 31, 0.25, 0.09, true],
  ['faint', 48, 0.04, 0.84, 20, 0.10, 0.35, true],
  ['table', 28, 0.02, 0.97, 51, 0.03, 0.02, true],
  ['finger', 96, 0.22, 0.71, 29, 0.11, 0.05, false],
] as const) {
    const [, change, clipped, retained, contrast, shadow, faint, accepted] = fixture;
    const result = assessReconstruction(change, clipped, retained, contrast, shadow, faint);
    assertEqual(result.accepted, accepted, `${fixture[0]} fixture`);
  }

  assertJsonEqual(
    selectPageVariant('blackWhite', ['o'], ['c'], ['bw']),
    ['bw'],
    'selected variant routes PDF/OCR',
  );
}

runDocumentReconstructionFixtures();