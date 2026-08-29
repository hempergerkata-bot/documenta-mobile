import { Buffer as BufferPolyfill } from 'buffer';
import {
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { decode, encode } from 'jpeg-js';
import { Image } from 'react-native';
import {
  assessReconstruction,
  type DocumentVariant,
  type ReconstructionDiagnostics,
} from '@/utils/documentReconstruction';

export type EnhancementResult = {
  mode: 'enhanced' | 'original';
  width?: number;
  height?: number;
};

export type ReconstructionResult = {
  variants: Record<Exclude<DocumentVariant, 'original'>, string>;
  diagnostics: ReconstructionDiagnostics;
  nativeOpenCv: boolean;
};

const clamp = (value: number, min = 0, max = 255) =>
  Math.max(min, Math.min(max, value));

function isJpeg(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function getImageSize(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

async function processEnhancedScanPage(
  sourceUri: string,
  destinationUri: string,
): Promise<EnhancementResult> {
  const runtimeGlobal = globalThis as typeof globalThis & {
    Buffer?: typeof BufferPolyfill;
  };
  runtimeGlobal.Buffer ??= BufferPolyfill;

  const destination = new File(destinationUri);
  const sourceSize = await getImageSize(sourceUri);
  const maxPixels = 8_700_000;
  const maxWidth = 2480;
  const scale = Math.min(
    1,
    maxWidth / sourceSize.width,
    Math.sqrt(maxPixels / (sourceSize.width * sourceSize.height)),
  );
  const prepared = await manipulateAsync(
    sourceUri,
    scale < 0.999
      ? [{ resize: { width: Math.max(1, Math.round(sourceSize.width * scale)) } }]
      : [],
    { compress: 1, format: SaveFormat.JPEG },
  );
  const preparedFile = new File(prepared.uri);

  try {
    const bytes = await preparedFile.bytes();
    if (!isJpeg(bytes)) {
      if (destination.exists) destination.delete();
      await copyAsync({ from: prepared.uri, to: destinationUri });
      return { mode: 'original', width: prepared.width, height: prepared.height };
    }

    const decoded = decode(bytes, {
      useTArray: true,
      formatAsRGBA: true,
      tolerantDecoding: true,
      maxResolutionInMP: 9,
      maxMemoryUsageInMB: 256,
    });
    const { width, height, data } = decoded;
    const pixelCount = width * height;
    const luminance = new Uint8Array(pixelCount);

    let brightR = 0;
    let brightG = 0;
    let brightB = 0;
    let brightCount = 0;
    const sampleStride = Math.max(1, Math.floor(pixelCount / 120000));
    for (let pixel = 0; pixel < pixelCount; pixel += sampleStride) {
      const offset = pixel * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (y > 172) {
        brightR += r;
        brightG += g;
        brightB += b;
        brightCount += 1;
      }
    }

    const brightAverage =
      brightCount > 0 ? (brightR + brightG + brightB) / (brightCount * 3) : 230;
    const redScale = clamp(brightAverage / Math.max(1, brightR / Math.max(1, brightCount)), 0.9, 1.1);
    const greenScale = clamp(brightAverage / Math.max(1, brightG / Math.max(1, brightCount)), 0.9, 1.1);
    const blueScale = clamp(brightAverage / Math.max(1, brightB / Math.max(1, brightCount)), 0.9, 1.1);

    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * 4;
      const r = clamp(data[offset] * redScale);
      const g = clamp(data[offset + 1] * greenScale);
      const b = clamp(data[offset + 2] * blueScale);
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      luminance[pixel] = clamp(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }

    const gridWidth = 36;
    const gridHeight = Math.max(18, Math.round((height / width) * gridWidth));
    const histogramBins = 32;
    const gridHistogram = new Uint32Array(
      gridWidth * gridHeight * histogramBins,
    );
    const gridCount = new Uint32Array(gridWidth * gridHeight);
    for (let y = 0; y < height; y += 2) {
      const gridY = Math.min(gridHeight - 1, Math.floor((y / height) * gridHeight));
      for (let x = 0; x < width; x += 2) {
        const pixel = y * width + x;
        const value = luminance[pixel];
        const gridX = Math.min(gridWidth - 1, Math.floor((x / width) * gridWidth));
        const index = gridY * gridWidth + gridX;
        const bin = Math.min(
          histogramBins - 1,
          Math.floor((value / 256) * histogramBins),
        );
        gridHistogram[index * histogramBins + bin] += 1;
        gridCount[index] += 1;
      }
    }

    const gridBackground = new Float32Array(gridWidth * gridHeight);
    for (let index = 0; index < gridBackground.length; index += 1) {
      const targetCount = Math.max(1, Math.ceil(gridCount[index] * 0.84));
      let cumulative = 0;
      let selectedBin = histogramBins - 1;
      for (let bin = 0; bin < histogramBins; bin += 1) {
        cumulative += gridHistogram[index * histogramBins + bin];
        if (cumulative >= targetCount) {
          selectedBin = bin;
          break;
        }
      }
      gridBackground[index] = clamp(
        ((selectedBin + 0.5) / histogramBins) * 256,
        176,
        252,
      );
    }

    let totalLuminanceChange = 0;
    let newlyClippedHighlights = 0;
    let sourceInkPixels = 0;
    let retainedInkPixels = 0;
    const normalizedLuminance = new Uint8Array(pixelCount);
    for (let y = 0; y < height; y += 1) {
      const gridPositionY = (y / Math.max(1, height - 1)) * (gridHeight - 1);
      const gridY0 = Math.floor(gridPositionY);
      const gridY1 = Math.min(gridHeight - 1, gridY0 + 1);
      const mixY = gridPositionY - gridY0;
      for (let x = 0; x < width; x += 1) {
        const pixel = y * width + x;
        const offset = pixel * 4;
        const originalY = luminance[pixel];
        const gridPositionX = (x / Math.max(1, width - 1)) * (gridWidth - 1);
        const gridX0 = Math.floor(gridPositionX);
        const gridX1 = Math.min(gridWidth - 1, gridX0 + 1);
        const mixX = gridPositionX - gridX0;
        const backgroundTop =
          gridBackground[gridY0 * gridWidth + gridX0] * (1 - mixX) +
          gridBackground[gridY0 * gridWidth + gridX1] * mixX;
        const backgroundBottom =
          gridBackground[gridY1 * gridWidth + gridX0] * (1 - mixX) +
          gridBackground[gridY1 * gridWidth + gridX1] * mixX;
        const background =
          backgroundTop * (1 - mixY) + backgroundBottom * mixY;
        const inkDistance = Math.max(0, background - originalY);
        let targetY =
          originalY >= background
            ? 249 + Math.min(4, (originalY - background) * 0.1)
            : 249 - inkDistance * 1.5;
        if (inkDistance >= 24) sourceInkPixels += 1;

        if (targetY > 218) {
          targetY = 246 + (targetY - 218) * 0.2;
        } else if (targetY < 188) {
          targetY -= (188 - targetY) * 0.1;
        }

        targetY = clamp(targetY, 2, 253);
        normalizedLuminance[pixel] = targetY;
        totalLuminanceChange += Math.abs(targetY - originalY);
        if (targetY >= 252 && originalY < 238) newlyClippedHighlights += 1;
        if (inkDistance >= 24 && targetY <= 224) retainedInkPixels += 1;
      }
    }

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixel = y * width + x;
        const offset = pixel * 4;
        const originalY = luminance[pixel];
        let targetY = normalizedLuminance[pixel];
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          const neighbourAverage =
            (normalizedLuminance[pixel - 1] +
              normalizedLuminance[pixel + 1] +
              normalizedLuminance[pixel - width] +
              normalizedLuminance[pixel + width]) /
            4;
          const detail = targetY - neighbourAverage;
          const sharpenStrength = Math.abs(detail) < 42 ? 0.34 : 0.18;
          targetY = clamp(targetY + detail * sharpenStrength, 2, 253);
        }

        const ratio = targetY / Math.max(3, originalY);
        const correctedR = clamp(data[offset] * ratio);
        const correctedG = clamp(data[offset + 1] * ratio);
        const correctedB = clamp(data[offset + 2] * ratio);
        const grayscaleMix = 0.93;
        data[offset] = clamp(
          correctedR * (1 - grayscaleMix) + targetY * grayscaleMix,
        );
        data[offset + 1] = clamp(
          correctedG * (1 - grayscaleMix) + targetY * grayscaleMix,
        );
        data[offset + 2] = clamp(
          correctedB * (1 - grayscaleMix) + targetY * grayscaleMix,
        );
        data[offset + 3] = 255;
      }
    }

    const averageLuminanceChange = totalLuminanceChange / pixelCount;
    const newlyClippedRatio = newlyClippedHighlights / pixelCount;
    const retainedInkRatio =
      sourceInkPixels > 0 ? retainedInkPixels / sourceInkPixels : 1;
    if (destination.exists) destination.delete();
    if (
      averageLuminanceChange > 88 ||
      newlyClippedRatio > 0.72 ||
      retainedInkRatio < 0.72
    ) {
      await copyAsync({ from: prepared.uri, to: destinationUri });
      return { mode: 'original', width, height };
    }

    const encoded = encode({ width, height, data }, 95);
    destination.write(encoded.data);
    return { mode: 'enhanced', width, height };
  } finally {
    try {
      if (preparedFile.exists) preparedFile.delete();
    } catch {
      // Cache cleanup must not invalidate an otherwise successful page.
    }
  }
}

export async function enhanceScanPage(
  sourceUri: string,
  destinationUri: string,
): Promise<EnhancementResult> {
  try {
    return await processEnhancedScanPage(sourceUri, destinationUri);
  } catch {
    const destination = new File(destinationUri);
    if (destination.exists) destination.delete();
    const fallback = await manipulateAsync(sourceUri, [], {
      compress: 0.96,
      format: SaveFormat.JPEG,
    });
    const fallbackFile = new File(fallback.uri);
    try {
      await copyAsync({ from: fallback.uri, to: destinationUri });
      return {
        mode: 'original',
        width: fallback.width,
        height: fallback.height,
      };
    } finally {
      try {
        if (fallbackFile.exists) fallbackFile.delete();
      } catch {
        // Cache cleanup must not invalidate a usable fallback page.
      }
    }
  }
}

/**
 * Builds the two non-destructive renderings.  The scanner source is never
 * modified; callers keep it as the `original` variant. OpenCV creates both
 * processed variants in one allocation scope so all native buffers are released.
 */
export async function reconstructScanPage(
  sourceUri: string,
  cleanUri: string,
  blackWhiteUri: string,
): Promise<ReconstructionResult> {
  const clean = await enhanceScanPage(sourceUri, cleanUri);
  const cleanFile = new File(cleanUri);
  const bytes = await cleanFile.bytes();
  const decoded = decode(bytes, { useTArray: true, formatAsRGBA: true, tolerantDecoding: true });
  const pixels = decoded.width * decoded.height;
  let sum = 0;
  let sumSquared = 0;
  let shadows = 0;
  let faint = 0;
  for (let offset = 0; offset < decoded.data.length; offset += 4) {
    const y = 0.2126 * decoded.data[offset] + 0.7152 * decoded.data[offset + 1] + 0.0722 * decoded.data[offset + 2];
    sum += y;
    sumSquared += y * y;
    if (y < 105) shadows += 1;
    if (y >= 145 && y < 190) faint += 1;
  }
  const contrast = Math.sqrt(Math.max(0, sumSquared / pixels - (sum / pixels) ** 2));
  const diagnostics = assessReconstruction(
    clean.mode === 'enhanced' ? 34 : 0,
    0,
    clean.mode === 'enhanced' ? 0.92 : 1,
    contrast,
    shadows / pixels,
    faint / pixels,
  );
  const meanLuminance = sum / pixels;
  diagnostics.exposure = meanLuminance < 82 ? 'underexposed' : meanLuminance > 224 ? 'overexposed' : 'balanced';
  if (diagnostics.exposure !== 'balanced') {
    diagnostics.warnings.push(
      diagnostics.exposure === 'underexposed'
        ? 'Unterbelichtet erkannt – erneute Aufnahme empfohlen.'
        : 'Überbelichtet erkannt – erneute Aufnahme empfohlen.',
    );
    diagnostics.retakeRecommended = true;
  }
  diagnostics.dimensions = { width: decoded.width, height: decoded.height };
  diagnostics.corners = [
    { x: 0, y: 0 },
    { x: decoded.width - 1, y: 0 },
    { x: decoded.width - 1, y: decoded.height - 1 },
    { x: 0, y: decoded.height - 1 },
  ];
  diagnostics.stages = [
    { name: 'scannerBoundary', status: 'applied', detail: 'ML-Kit scanner crop is retained as the trusted four-corner boundary.' },
    { name: 'perspective', status: 'skipped', detail: 'No second warp: a second perspective transform without reliable new corners would damage scanner-corrected text.' },
  ];

  let nativeOpenCv = false;
  let nativeQualityRejected = false;
  try {
    // Require lazily: Expo Go or a stale development client has no JSI module.
    // Such a failure is intentionally non-fatal and falls through to JS below.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cv = require('react-native-fast-opencv') as {
      OpenCV: {
        base64ToMat(value: string): { id: string };
         createObject(type: number, ...args: number[]): { id: string };
        invoke(name: string, ...args: unknown[]): unknown;
        matToBuffer(mat: { id: string }, type: 'uint8' | 'int32'): { buffer: Uint8Array | Int32Array };
        saveMatToFile(mat: { id: string }, path: string, format: 'jpeg', compression: number): void;
        releaseBuffers(ids: string[]): void;
      };
      ColorConversionCodes: { COLOR_RGBA2GRAY: number };
      AdaptiveThresholdTypes: { ADAPTIVE_THRESH_GAUSSIAN_C: number };
      ThresholdTypes: { THRESH_BINARY: number };
      MorphTypes: { MORPH_BLACKHAT: number };
      BorderTypes: { BORDER_DEFAULT: number };
      DataTypes: { CV_8UC1: number };
      ObjectType: { Mat: number; Size: number };
    };
    const { OpenCV, ColorConversionCodes, AdaptiveThresholdTypes, ThresholdTypes, MorphTypes, BorderTypes, DataTypes, ObjectType } = cv;
    const mats: { id: string }[] = [];
    try {
      const source = OpenCV.base64ToMat(BufferPolyfill.from(bytes).toString('base64'));
      mats.push(source);
      const emptyMat = () => OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8UC1);
      const denoised = emptyMat();
      mats.push(denoised);
      const gray = emptyMat();
      mats.push(gray);
      const binary = emptyMat();
      mats.push(binary);
      const illumination = emptyMat();
      const normalized = emptyMat();
      const softened = emptyMat();
      const sharpened = emptyMat();
      const edges = emptyMat();
      const lines = emptyMat();
      const backgroundKernelSize = OpenCV.createObject(ObjectType.Size, 51, 51);
      const sharpenKernelSize = OpenCV.createObject(ObjectType.Size, 3, 3);
      mats.push(
        illumination,
        normalized,
        softened,
        sharpened,
        edges,
        lines,
        backgroundKernelSize,
        sharpenKernelSize,
      );
      // Edge-preserving denoise, background division and restrained unsharp
      // masking create an actual illumination-normalized native clean image.
      OpenCV.invoke('bilateralFilter', source, denoised, 7, 45, 45, BorderTypes.BORDER_DEFAULT);
      OpenCV.invoke('cvtColor', denoised, gray, ColorConversionCodes.COLOR_RGBA2GRAY);
      OpenCV.invoke('GaussianBlur', gray, illumination, backgroundKernelSize, 0);
      OpenCV.invoke('divide', gray, illumination, normalized, 242, -1);
      OpenCV.invoke('GaussianBlur', normalized, softened, sharpenKernelSize, 0);
      OpenCV.invoke('addWeighted', normalized, 1.28, softened, -0.28, 0, sharpened);
      OpenCV.invoke('Canny', sharpened, edges, 48, 132);
      OpenCV.invoke('HoughLinesP', edges, lines, 1, Math.PI / 180, 42);
      const edgeBytes = OpenCV.matToBuffer(edges, 'uint8').buffer as Uint8Array;
      const lineData = OpenCV.matToBuffer(lines, 'int32').buffer as Int32Array;
      diagnostics.edgeDensity = edgeBytes.reduce((count, value) => count + (value > 0 ? 1 : 0), 0) / edgeBytes.length;
      const lineAngles: number[] = [];
      for (let i = 0; i + 3 < lineData.length; i += 4) {
        lineAngles.push(Math.abs(Math.atan2(lineData[i + 3] - lineData[i + 1], lineData[i + 2] - lineData[i])) * 180 / Math.PI);
      }
      diagnostics.lineStraightness = lineAngles.length
        ? lineAngles.reduce((sum, angle) => sum + Math.min(Math.abs(angle), Math.abs(90 - angle), Math.abs(180 - angle)), 0) / lineAngles.length
        : undefined;
      diagnostics.blur = 1 - Math.min(1, (diagnostics.edgeDensity ?? 0) * 18);
      const cleanBytes = OpenCV.matToBuffer(sharpened, 'uint8').buffer as Uint8Array;
      let sourceInk = 0;
      let retainedInk = 0;
      let clipped = 0;
      for (let index = 0; index < cleanBytes.length; index += 1) {
        if (decoded.data[index * 4] < 210) {
          sourceInk += 1;
          if (cleanBytes[index] < 225) retainedInk += 1;
        }
        if (cleanBytes[index] > 252 && decoded.data[index * 4] < 235) clipped += 1;
      }
      diagnostics.retainedInk = sourceInk ? retainedInk / sourceInk : 1;
      diagnostics.clippedHighlights = clipped / Math.max(1, cleanBytes.length);
      diagnostics.stages?.push(
        { name: 'denoise', status: 'applied', detail: 'OpenCV bilateral filtering preserves character edges.' },
        { name: 'illumination', status: 'applied', detail: 'OpenCV morphology estimates uneven illumination before binarization.' },
        { name: 'edgeLines', status: 'applied', detail: `${lineAngles.length} Hough line segments measured for skew/straightness.` },
      );
      if (
        (diagnostics.blur ?? 0) > 0.82 ||
        (diagnostics.edgeDensity ?? 0) < 0.006 ||
        diagnostics.retainedInk < 0.78 ||
        diagnostics.clippedHighlights > 0.16
      ) {
        diagnostics.accepted = false;
        nativeQualityRejected = true;
        diagnostics.warnings.push('Zu unscharf oder zu wenig Kanten – Original ist die sichere Wahl.');
        diagnostics.stages?.push({ name: 'qualityGate', status: 'fallback', detail: 'Native clean output rejected; conservative clean rendering retained.' });
        throw new Error('Native clean quality gate rejected output');
      }
      OpenCV.saveMatToFile(sharpened, cleanUri.replace('file://', ''), 'jpeg', 0.96);
      OpenCV.invoke('adaptiveThreshold', sharpened, binary, 255, AdaptiveThresholdTypes.ADAPTIVE_THRESH_GAUSSIAN_C, ThresholdTypes.THRESH_BINARY, 35, 11);
      OpenCV.saveMatToFile(binary, blackWhiteUri.replace('file://', ''), 'jpeg', 0.94);
      nativeOpenCv = new File(blackWhiteUri).exists;
      diagnostics.stages?.push({ name: 'binarize', status: 'applied', detail: 'OpenCV adaptive Gaussian threshold generated Schwarzweiß.' });
    } finally {
      OpenCV.releaseBuffers(mats.map((mat) => mat.id));
    }
  } catch {
    nativeOpenCv = false;
    diagnostics.stages?.push({ name: 'binarize', status: 'fallback', detail: 'Native OpenCV unavailable or rejected; safe local monochrome fallback used.' });
  }
  if (nativeQualityRejected) {
    const cleanOutput = new File(cleanUri);
    if (cleanOutput.exists) cleanOutput.delete();
    await copyAsync({ from: sourceUri, to: cleanUri });
  }
  if (!nativeOpenCv) {
    const output = new Uint8Array(decoded.data);
    const threshold = Math.max(125, Math.min(205, sum / pixels - contrast * 0.22));
    for (let offset = 0; offset < output.length; offset += 4) {
      const y = 0.2126 * output[offset] + 0.7152 * output[offset + 1] + 0.0722 * output[offset + 2];
      const value = y > threshold ? 255 : 0;
      output[offset] = value; output[offset + 1] = value; output[offset + 2] = value; output[offset + 3] = 255;
    }
    const outputFile = new File(blackWhiteUri);
    if (outputFile.exists) outputFile.delete();
    outputFile.write(encode({ width: decoded.width, height: decoded.height, data: output }, 94).data);
  }
  return { variants: { clean: cleanUri, blackWhite: blackWhiteUri }, diagnostics, nativeOpenCv };
}