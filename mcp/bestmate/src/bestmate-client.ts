import { BestMateConfig, PromptSubmission, OptimizationResult, EvaluationRequest, EvaluationResult } from './types/index.js';

export class BestMateClient {
  private config: BestMateConfig;

  constructor(config: BestMateConfig) {
    this.config = config;
  }

  async submitPrompt(submission: PromptSubmission): Promise<{ sessionId: string }> {
    const response = await fetch(`${this.config.baseUrl}/optimize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      throw new Error(`BestMate API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as { sessionId: string };
  }

  async getOptimizationResults(sessionId: string): Promise<OptimizationResult> {
    const response = await fetch(`${this.config.baseUrl}/optimize/${sessionId}/results`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`BestMate API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as OptimizationResult;
  }

  async evaluatePrompt(request: EvaluationRequest): Promise<EvaluationResult> {
    const response = await fetch(`${this.config.baseUrl}/evaluate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`BestMate API error: ${response.status} ${response.statusText}`);
    }

    return await response.json() as EvaluationResult;
  }
}