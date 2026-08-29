export type EnhancementResult = {
  mode: 'enhanced' | 'original';
  width?: number;
  height?: number;
};

export type ReconstructionResult = {
  variants: { clean: string; blackWhite: string };
  diagnostics: import('./documentReconstruction').ReconstructionDiagnostics;
  nativeOpenCv: boolean;
};

export function enhanceScanPage(
  sourceUri: string,
  destinationUri: string,
): Promise<EnhancementResult>;

export function reconstructScanPage(
  sourceUri: string,
  cleanUri: string,
  blackWhiteUri: string,
): Promise<ReconstructionResult>;