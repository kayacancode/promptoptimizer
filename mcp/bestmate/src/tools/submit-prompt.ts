import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BestMateClient } from '../bestmate-client.js';

export function createSubmitPromptTool(client: BestMateClient): Tool {
  return {
    name: 'bestmate_submit_prompt',
    description: 'Submit a prompt to BestMate for optimization analysis. USAGE: Provide the prompt text directly as a parameter.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt text to optimize. Copy and paste your prompt text here.'
        },
        context: {
          type: 'string',
          description: 'Additional context about the prompt usage (optional)'
        },
        domain: {
          type: 'string',
          description: 'Domain or use case for the prompt (optional)'
        },
        model: {
          type: 'string',
          description: 'Model to use for optimization (optional, defaults to claude-4-opus)',
          enum: ['claude-4-opus', 'claude-3-sonnet', 'claude-3-haiku', 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro'],
          default: 'claude-4-opus'
        },
        temperature: {
          type: 'number',
          description: 'Temperature for model creativity (optional, defaults to 0.3)',
          minimum: 0.0,
          maximum: 1.0,
          default: 0.3
        },
        optimization_type: {
          type: 'string',
          description: 'Type of optimization to perform (optional, defaults to comprehensive)',
          enum: ['clarity', 'effectiveness', 'specificity', 'comprehensive'],
          default: 'comprehensive'
        }
      },
      required: ['prompt']
    }
  };
}

export async function handleSubmitPrompt(
  client: BestMateClient,
  args: { 
    prompt: string; 
    context?: string; 
    domain?: string;
    model?: string;
    temperature?: number;
    optimization_type?: string;
  }
): Promise<{ sessionId: string; status: string; config: object }> {
  try {
    const promptToOptimize = args.prompt;

    const result = await client.submitPrompt({
      prompt: promptToOptimize,
      context: args.context,
      domain: args.domain,
      model: args.model || 'claude-4-opus',
      temperature: args.temperature || 0.3,
      optimization_type: args.optimization_type || 'comprehensive'
    });

    return {
      sessionId: result.sessionId,
      status: 'submitted',
      config: {
        model: args.model || 'claude-4-opus',
        temperature: args.temperature || 0.3,
        optimization_type: args.optimization_type || 'comprehensive'
      }
    };
  } catch (error) {
    throw new Error(`Failed to submit prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}