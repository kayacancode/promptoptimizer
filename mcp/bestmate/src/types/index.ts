export interface BestMateConfig {
  apiKey: string;
  baseUrl: string;
}

export interface PromptSubmission {
  prompt: string;
  context?: string;
  domain?: string;
  model?: string;
  temperature?: number;
  optimization_type?: string;
}

export interface OptimizationResult {
  sessionId: string;
  originalPrompt: string;
  suggestions: PromptSuggestion[];
  status: 'processing' | 'completed' | 'failed';
}

export interface PromptSuggestion {
  id: string;
  optimizedPrompt: string;
  improvements: string[];
  confidence: number;
  reasoning: string;
}

export interface EvaluationRequest {
  prompt: string;
  context?: string;
  criteria?: string[];
}

export interface EvaluationResult {
  id: string;
  prompt: string;
  scores: {
    clarity: number;
    effectiveness: number;
    specificity: number;
    overall: number;
  };
  feedback: string;
  suggestions: string[];
}