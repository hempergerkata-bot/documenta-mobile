import {
  analyzeGermanDocumentText,
  DocumentAnalysisResult,
} from '@/utils/documentAnalysis';

export async function recognizeAndAnalyzeDocument(): Promise<DocumentAnalysisResult> {
  return analyzeGermanDocumentText('');
}