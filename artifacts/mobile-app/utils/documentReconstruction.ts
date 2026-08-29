export type DocumentVariant = 'original' | 'clean' | 'blackWhite';

export type ReconstructionDiagnostics = {
  contrast: number;
  shadow: number;
  faintInk: number;
  clippedHighlights: number;
  retainedInk: number;
  accepted: boolean;
  warnings: string[];
  dimensions?: { width: number; height: number };
  edgeDensity?: number;
  blur?: number;
  lineStraightness?: number;
  corners?: { x: number; y: number }[];
  stages?: ReconstructionStage[];
};

export type ReconstructionStage = {
  name: 'scannerBoundary' | 'denoise' | 'edgeLines' | 'perspective' | 'illumination' | 'binarize' | 'qualityGate';
  status: 'applied' | 'skipped' | 'fallback';
  detail: string;
};

export function assessReconstruction(
  averageChange: number,
  clippedHighlights: number,
  retainedInk: number,
  contrast: number,
  shadow: number,
  faintInk: number,
): ReconstructionDiagnostics {
  const warnings: string[] = [];
  if (shadow > 0.28) warnings.push('Schatten erkannt – Original bleibt erhalten.');
  if (faintInk > 0.22) warnings.push('Blasse Schrift erkannt – Schwarzweiß prüfen.');
  if (clippedHighlights > 0.16) warnings.push('Zu viele helle Details würden verloren gehen.');
  if (retainedInk < 0.78) warnings.push('Zu wenig Schriftstruktur erhalten.');
  if (contrast < 18) warnings.push('Geringer Kontrast – erneut scannen empfohlen.');
  const accepted =
    averageChange <= 88 &&
    clippedHighlights <= 0.16 &&
    retainedInk >= 0.78;
  return { contrast, shadow, faintInk, clippedHighlights, retainedInk, accepted, warnings };
}

export function selectPageVariant<T>(
  variant: DocumentVariant,
  originals: T[],
  clean: T[],
  blackWhite: T[],
) {
  return variant === 'original' ? originals : variant === 'blackWhite' ? blackWhite : clean;
}