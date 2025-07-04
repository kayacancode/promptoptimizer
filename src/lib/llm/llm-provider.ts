import Anthropic from '@anthropic-ai/sdk'
import { GeminiClient } from './gemini-client'

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMRequest {
  model: string
  max_tokens: number
  temperature: number
  system?: string
  messages: LLMMessage[]
}

export interface LLMResponse {
  content: string
  provider: 'anthropic' | 'gemini'
}

export class LLMProvider {
  private anthropic?: Anthropic
  private gemini?: GeminiClient
  private preferredProvider: 'anthropic' | 'gemini'

  constructor() {
    // Initialize available providers
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
    }

    if (process.env.GOOGLE_GEMINI_API_KEY) {
      this.gemini = new GeminiClient(process.env.GOOGLE_GEMINI_API_KEY)
    }

    // Set preferred provider based on what's available
    this.preferredProvider = process.env.PREFERRED_LLM_PROVIDER as 'anthropic' | 'gemini' || 'gemini'
    
    // Fallback logic
    if (this.preferredProvider === 'gemini' && !this.gemini) {
      this.preferredProvider = 'anthropic'
    } else if (this.preferredProvider === 'anthropic' && !this.anthropic) {
      this.preferredProvider = 'gemini'
    }
  }

  async generateContent(request: LLMRequest): Promise<LLMResponse> {
    const provider = this.getActiveProvider()
    
    if (provider === 'gemini' && this.gemini) {
      return this.generateWithGemini(request)
    } else if (provider === 'anthropic' && this.anthropic) {
      return this.generateWithAnthropic(request)
    } else {
      throw new Error('No LLM provider available. Please set either GOOGLE_GEMINI_API_KEY or ANTHROPIC_API_KEY')
    }
  }

  private async generateWithGemini(request: LLMRequest): Promise<LLMResponse> {
    if (!this.gemini) throw new Error('Gemini client not initialized')
    
    const geminiParams = GeminiClient.convertAnthropicToGemini(request)
    const content = await this.gemini.generateContentWithParams(geminiParams)
    
    return {
      content,
      provider: 'gemini'
    }
  }

  private async generateWithAnthropic(request: LLMRequest): Promise<LLMResponse> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized')
    
    const response = await this.anthropic.messages.create({
      model: request.model,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      system: request.system,
      messages: request.messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content
      }))
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic')
    }

    return {
      content: content.text,
      provider: 'anthropic'
    }
  }

  private getActiveProvider(): 'anthropic' | 'gemini' {
    if (this.preferredProvider === 'gemini' && this.gemini) {
      return 'gemini'
    } else if (this.preferredProvider === 'anthropic' && this.anthropic) {
      return 'anthropic'
    } else if (this.gemini) {
      return 'gemini'
    } else if (this.anthropic) {
      return 'anthropic'
    } else {
      throw new Error('No LLM provider available')
    }
  }

  isAvailable(): boolean {
    return !!(this.anthropic || this.gemini)
  }

  getAvailableProviders(): string[] {
    const providers: string[] = []
    if (this.anthropic) providers.push('anthropic')
    if (this.gemini) providers.push('gemini')
    return providers
  }

  // APE-specific methods
  async generatePromptVariations(
    originalPrompt: string,
    count: number,
    type: 'exemplar' | 'diversity',
    patterns: string[],
    successfulPrompts: string[],
    recommendedStructure: string
  ): Promise<{ type: 'text'; text: string }> {
    const systemPrompt = type === 'exemplar' 
      ? `You are an expert prompt engineer. Generate ${count} improved versions of the given prompt by incorporating successful patterns from real user interactions.

Successful patterns identified:
${patterns.map(p => `- ${p}`).join('\n')}

Successful prompt examples:
${successfulPrompts.slice(0, 3).map(p => `- "${p}"`).join('\n')}

Recommended structure: ${recommendedStructure}

For each variation, explain your reasoning and maintain the original intent while improving clarity, specificity, and likely performance.`
      : `You are an expert prompt engineer focused on generating diverse prompt variations. Create prompts that:
1. Explore different communication styles (formal, conversational, technical)
2. Vary the level of detail and specificity
3. Experiment with different structural approaches
4. Test different ways of framing the same request

Ensure each variation maintains the core intent but approaches it differently.`;

    const userPrompt = `Original prompt: "${originalPrompt}"\n\nGenerate ${count} ${type === 'diversity' ? 'diverse' : 'improved'} variations. Format each as:
VARIATION [N]:
[${type === 'diversity' ? 'diverse prompt variation' : 'improved prompt'}]

REASONING [N]:
[explanation of ${type === 'diversity' ? 'the different approach taken' : 'changes and expected improvements'}]`;

    const response = await this.generateContent({
      model: this.getActiveProvider() === 'gemini' ? 'gemini-2.0-flash-exp' : 'claude-3-opus-20240229',
      max_tokens: 1000,
      temperature: type === 'diversity' ? 0.9 : 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    return { type: 'text', text: response.content };
  }

  async applyStructuralTechnique(
    originalPrompt: string,
    technique: string
  ): Promise<{ type: 'text'; text: string }> {
    const response = await this.generateContent({
      model: this.getActiveProvider() === 'gemini' ? 'gemini-2.0-flash-exp' : 'claude-3-opus-20240229',
      max_tokens: 500,
      temperature: 0.3,
      system: `You are a prompt engineering expert. Improve the given prompt by applying this specific technique: "${technique}". Maintain the original intent while making the structural improvement.`,
      messages: [{
        role: 'user',
        content: `Original prompt: "${originalPrompt}"\n\nApply the technique: "${technique}"\n\nReturn only the improved prompt.`
      }]
    });

    return { type: 'text', text: response.content };
  }

  async simulateResponse(systemPrompt: string, userInput: string): Promise<{ type: 'text'; text: string }> {
    const response = await this.generateContent({
      model: this.getActiveProvider() === 'gemini' ? 'gemini-2.0-flash-exp' : 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput }]
    });

    return { type: 'text', text: response.content };
  }

  async evaluateResponse(input: string, response: string): Promise<number> {
    const evalResponse = await this.generateContent({
      model: this.getActiveProvider() === 'gemini' ? 'gemini-2.0-flash-exp' : 'claude-3-opus-20240229',
      max_tokens: 100,
      temperature: 0,
      system: `Evaluate the quality of an AI response. Consider relevance, clarity, completeness, and helpfulness. Return only a score from 0.0 to 1.0.`,
      messages: [{
        role: 'user',
        content: `Input: "${input}"\nResponse: "${response}"\n\nScore (0.0-1.0):`
      }]
    });

    const scoreMatch = evalResponse.content.match(/(\d*\.?\d+)/);
    if (scoreMatch) {
      return Math.max(0, Math.min(1, parseFloat(scoreMatch[1])));
    }
    return 0.5;
  }

  async reinforcementLearningStep(
    currentPrompt: string,
    successfulTests: any[],
    failedTests: any[]
  ): Promise<{ type: 'text'; text: string }> {
    const response = await this.generateContent({
      model: this.getActiveProvider() === 'gemini' ? 'gemini-2.0-flash-exp' : 'claude-3-opus-20240229',
      max_tokens: 800,
      temperature: 0.5,
      system: `You are a prompt engineering expert using reinforcement learning to iteratively improve prompts. Analyze the test results and refine the prompt to address failures while maintaining successes.`,
      messages: [{
        role: 'user',
        content: `Current prompt: "${currentPrompt}"

Successful test cases (${successfulTests.length}):
${successfulTests.slice(0, 3).map(t => `- Input: "${t.input}" | Score: ${t.score.toFixed(2)}`).join('\n')}

Failed test cases (${failedTests.length}):
${failedTests.slice(0, 3).map(t => `- Input: "${t.input}" | Score: ${t.score.toFixed(2)}`).join('\n')}

Refine the prompt to improve performance on failed cases while maintaining performance on successful ones. Return only the refined prompt.`
      }]
    });

    return { type: 'text', text: response.content };
  }

  async generateOptimizationExplanation(
    original: string,
    optimized: string,
    reasoning: string
  ): Promise<{ type: 'text'; text: string }> {
    const response = await this.generateContent({
      model: this.getActiveProvider() === 'gemini' ? 'gemini-2.0-flash-exp' : 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.3,
      system: `Generate a clear explanation of how a prompt was optimized, highlighting key improvements and expected benefits.`,
      messages: [{
        role: 'user',
        content: `Original: "${original}"\nOptimized: "${optimized}"\nReasoning: "${reasoning}"\n\nProvide a clear explanation of the optimization:`
      }]
    });

    return { type: 'text', text: response.content };
  }
} 