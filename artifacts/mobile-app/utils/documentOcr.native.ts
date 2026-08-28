import TextRecognition, {
  TextRecognitionScript,
} from '@react-native-ml-kit/text-recognition';
import {
  analyzeGermanDocumentText,
  DocumentAnalysisResult,
} from '@/utils/documentAnalysis';

export async function recognizeAndAnalyzeDocument(
  pageUris: string[],
): Promise<DocumentAnalysisResult> {
  const pageTexts: string[] = [];
  for (const pageUri of pageUris) {
    const result = await TextRecognition.recognize(
      pageUri,
      TextRecognitionScript.LATIN,
    );
    const text = result.text.trim();
    if (text) pageTexts.push(text);
  }
  return analyzeGermanDocumentText(pageTexts.join('\n\n--- Seite ---\n\n'));
}