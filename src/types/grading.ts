export type GradingMode = 'semantic_argument' | 'strict_literal';

export type HarakatRule = 'ignore' | 'strict_irab';

export interface GradingRequest {
  imageBase64: string;
  imageMimeType: string;
  questionText?: string;
  teacherAnswerKey: string;
  mode: GradingMode;
  harakatRule: HarakatRule;
  maxScore?: number;
  customApiKey?: string;
}

export interface RubricItem {
  aspect: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface GradingResult {
  studentTranscription: string;
  transcriptionConfidence: 'high' | 'medium' | 'low';
  studentTranslation: string;
  score: number;
  maxScore: number;
  status: 'CORRECT' | 'PARTIAL' | 'INCORRECT';
  isCoreMeaningMatched: boolean;
  semanticAnalysis: {
    coreArgumentEvaluation: string;
    differencesWithKey: string;
    synonymNotes?: string;
  };
  harakatEvaluation: {
    ruleApplied: string;
    status: 'sesuai' | 'ada_kekurangan' | 'diabaikan';
    details: string;
  };
  rubricBreakdown: RubricItem[];
  teacherNotes: string;
  studentFeedback: string;
}

export interface SamplePreset {
  id: string;
  title: string;
  category: string;
  question: string;
  teacherKey: string;
  mode: GradingMode;
  harakatRule: HarakatRule;
  sampleImageUrl?: string;
  description: string;
}
