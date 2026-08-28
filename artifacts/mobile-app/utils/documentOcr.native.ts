import TextRecognition, {
  TextRecognitionScript,
} from '@react-native-ml-kit/text-recognition';
import {
  analyzeGermanDocumentText,
  DocumentAnalysisResult,
} from '@/utils/documentAnalysis';
import { chooseBestOcrText } from '@/utils/ocrTextSelection';

async function recognizePage(pageUri?: string) {
  if (!pageUri) return '';
  try {
    const result = await TextRecognition.recognize(
      pageUri,
      TextRecognitionScript.LATIN,
    );
    return result.text.trim();
  } catch {
    return '';
  }
}

export async function recognizeAndAnalyzeDocument(
  pageUris: string[],
  originalPageUris: string[] = [],
): Promise<DocumentAnalysisResult> {
  const pageTexts: string[] = [];
  for (const [pageIndex, pageUri] of pageUris.entries()) {
    const optimizedText = await recognizePage(pageUri);
    const originalText = await recognizePage(originalPageUris[pageIndex]);
    const selectedText = chooseBestOcrText(optimizedText, originalText);

    if (selectedText) {
      pageTexts.push(`--- Seite ${pageIndex + 1} ---\n${selectedText}`);
    }
  }
  return analyzeGermanDocumentText(pageTexts.join('\n\n'));
}