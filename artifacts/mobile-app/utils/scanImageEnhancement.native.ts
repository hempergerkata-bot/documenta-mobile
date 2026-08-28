import { Buffer as BufferPolyfill } from 'buffer';
import {
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { decode, encode } from 'jpeg-js';
import { Image } from 'react-native';

export type EnhancementResult = {
  mode: 'enhanced' | 'original';
  width?: number;
  height?: number;
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

    const gridWidth = 24;
    const gridHeight = Math.max(12, Math.round((height / width) * gridWidth));
    const gridSum = new Float64Array(gridWidth * gridHeight);
    const gridCount = new Uint32Array(gridWidth * gridHeight);
    const gridMax = new Uint8Array(gridWidth * gridHeight);
    for (let y = 0; y < height; y += 3) {
      const gridY = Math.min(gridHeight - 1, Math.floor((y / height) * gridHeight));
      for (let x = 0; x < width; x += 3) {
        const pixel = y * width + x;
        const value = luminance[pixel];
        const gridX = Math.min(gridWidth - 1, Math.floor((x / width) * gridWidth));
        const index = gridY * gridWidth + gridX;
        gridMax[index] = Math.max(gridMax[index], value);
        if (value >= 155) {
          gridSum[index] += value;
          gridCount[index] += 1;
        }
      }
    }

    const gridBackground = new Float32Array(gridWidth * gridHeight);
    for (let index = 0; index < gridBackground.length; index += 1) {
      gridBackground[index] =
        gridCount[index] > 0
          ? Math.max(gridMax[index] * 0.92, gridSum[index] / gridCount[index])
          : gridMax[index] >= 100
            ? gridMax[index]
            : 225;
    }

    let totalLuminanceChange = 0;
    let newlyClippedHighlights = 0;
    let sourceInkPixels = 0;
    let retainedInkPixels = 0;
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
            ? 248 + Math.min(5, (originalY - background) * 0.12)
            : 248 - inkDistance * 1.42;
        if (inkDistance >= 24) sourceInkPixels += 1;
        if (targetY <= 218) retainedInkPixels += 1;

        if (targetY > 205) {
          targetY = 244 + (targetY - 205) * 0.22;
        } else if (targetY < 180) {
          targetY -= (180 - targetY) * 0.12;
        }

        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          const neighbourAverage =
            (luminance[pixel - 1] +
              luminance[pixel + 1] +
              luminance[pixel - width] +
              luminance[pixel + width]) /
            4;
          const edge = Math.abs(originalY - neighbourAverage);
          targetY =
            edge < 7
              ? targetY * 0.88 + neighbourAverage * 0.12
              : targetY + (originalY - neighbourAverage) * 0.15;
        }

        targetY = clamp(targetY, 2, 253);
        totalLuminanceChange += Math.abs(targetY - originalY);
        if (targetY >= 252 && originalY < 238) newlyClippedHighlights += 1;
        const ratio = targetY / Math.max(3, originalY);
        const correctedR = clamp(data[offset] * ratio);
        const correctedG = clamp(data[offset + 1] * ratio);
        const correctedB = clamp(data[offset + 2] * ratio);
        const grayscaleMix = 0.88;
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