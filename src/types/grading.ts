export type GradingMode = 'semantic_argument' | 'strict_literal';

export type HarakatRule = 'ignore' | 'strict_irab';

export interface ExamQuestion {
  id: string;
  number: number;
  text: string;
  answerKey: string;
  maxScore: number;
}

export interface ExtractExamRequest {
  fileBase64: string;
  fileMimeType: string;
  fileName: string;
  customApiKey?: string;
}

export interface ExtractExamResponse {
  title: string;
  description?: string;
  questions: ExamQuestion[];
  totalQuestions: number;
}

export interface QuestionGradingResult {
  questionNumber: number;
  questionText: string;
  teacherKey: string;
  maxScore: number;
  score: number;
  status: 'CORRECT' | 'PARTIAL' | 'INCORRECT';
  isCoreMeaningMatched: boolean;
  studentTranscription: string;
  studentTranslation: string;
  semanticAnalysis: string;
  synonymNotes?: string;
  harakatNotes?: string;
  feedback: string;
}

export interface BatchGradingRequest {
  questions: ExamQuestion[];
  studentFileBase64: string;
  studentFileMimeType: string;
  studentFileName: string;
  mode: GradingMode;
  harakatRule: HarakatRule;
  customApiKey?: string;
}

export interface BatchGradingResult {
  examTitle?: string;
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
  summary: {
    totalQuestions: number;
    correctCount: number;
    partialCount: number;
    incorrectCount: number;
    overallEvaluation: string;
  };
  questionResults: QuestionGradingResult[];
}

// Single Question Compatibility
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
  questions?: ExamQuestion[];
}
