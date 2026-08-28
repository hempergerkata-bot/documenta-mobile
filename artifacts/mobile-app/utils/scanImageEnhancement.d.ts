export type EnhancementResult = {
  mode: 'enhanced' | 'original';
  width?: number;
  height?: number;
};

export function enhanceScanPage(
  sourceUri: string,
  destinationUri: string,
): Promise<EnhancementResult>;