import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BestMateClient } from '../bestmate-client.js';
import { EvaluationResult } from '../types/index.js';

export function createEvaluatePromptTool(client: BestMateClient): Tool {
  return {
    name: 'bestmate_evaluate_prompt',
    description: 'Evaluate a prompt for clarity, effectiveness, and specificity',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt to evaluate'
        },
        context: {
          type: 'string',
          description: 'Additional context about how the prompt will be used (optional)'
        },
        criteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific evaluation criteria to focus on (optional)'
        }
      },
      required: ['prompt']
    }
  };
}

export async function handleEvaluatePrompt(
  client: BestMateClient,
  args: { prompt: string; context?: string; criteria?: string[] }
): Promise<EvaluationResult> {
  try {
    const result = await client.evaluatePrompt({
      prompt: args.prompt,
      context: args.context,
      criteria: args.criteria
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to evaluate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}