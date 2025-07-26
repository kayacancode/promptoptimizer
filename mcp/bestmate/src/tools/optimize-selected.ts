import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BestMateClient } from '../bestmate-client.js';
import { handleSubmitPrompt } from './submit-prompt.js';
import { handleGetResults } from './get-results.js';

export function createOptimizeSelectedTool(client: BestMateClient): Tool {
  return {
    name: 'bestmate_optimize_selected',
    description: 'Optimize selected text/prompt from your editor with automatic context detection. Provide the selected text and get optimized versions from Claude 4 Opus and Gemini 2.5.',
    inputSchema: {
      type: 'object',
      properties: {
        selected_text: {
          type: 'string',
          description: 'The selected text/prompt to optimize'
        },
        context: {
          type: 'string',
          description: 'Additional context about the selected text (optional)'
        },
        domain: {
          type: 'string',
          description: 'Domain or use case for the prompt (optional)'
        },
        model: {
          type: 'string',
          description: 'Model to use for optimization (optional, defaults to claude-4-opus)',
          enum: ['claude-4-opus', 'gemini-2.5', 'claude-3-sonnet', 'claude-3-haiku', 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro'],
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
      required: ['selected_text']
    }
  };
}

export async function handleOptimizeSelected(
  client: BestMateClient,
  args: { 
    selected_text: string;
    context?: string;
    domain?: string;
    model?: string;
    temperature?: number;
    optimization_type?: string;
  }
): Promise<{ sessionId: string; status: string; config: object; message: string; results?: any }> {
  try {
    if (!args.selected_text || args.selected_text.trim().length === 0) {
      throw new Error('Selected text is required and cannot be empty');
    }

    // Step 1: Submit the selected text for optimization
    const submitResult = await handleSubmitPrompt(client, {
      prompt: args.selected_text,
      context: args.context,
      domain: args.domain,
      model: args.model || 'claude-4-opus',
      temperature: args.temperature || 0.3,
      optimization_type: args.optimization_type || 'comprehensive'
    });

    // Step 2: Get optimization results automatically
    const results = await handleGetResults(client, {
      sessionId: submitResult.sessionId
    });

    return {
      sessionId: submitResult.sessionId,
      status: 'completed',
      config: submitResult.config,
      message: `Selected text optimization completed successfully for session ${submitResult.sessionId}`,
      results: results
    };
  } catch (error) {
    throw new Error(`Failed to optimize selected text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}