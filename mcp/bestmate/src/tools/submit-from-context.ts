import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BestMateClient } from '../bestmate-client.js';
import { handleSubmitPrompt } from './submit-prompt.js';
import { handleGetResults } from './get-results.js';

export function createSubmitFromContextTool(client: BestMateClient): Tool {
  return {
    name: 'bestmate_submit_from_context',
    description: 'Extract prompt from conversation context, submit to BestMate for optimization, and return results automatically. This performs the full optimization workflow in one step.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt_text: {
          type: 'string',
          description: 'The prompt text to optimize (optional - if not provided, will extract from conversation context)'
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
          enum: ['claude-4-opus', 'gemini-2.5', 'claude-3-sonnet', 'claude-3-haiku', 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro'],
          default: 'claude-4-opus', 
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
      required: []
    }
  };
}

export async function handleSubmitFromContext(
  client: BestMateClient,
  args: { 
    prompt_text?: string;
    context?: string; 
    domain?: string;
    model?: string;
    temperature?: number;
    optimization_type?: string;
  }
): Promise<{ sessionId: string; status: string; config: object; message: string; results?: any }> {
  try {
    let promptToOptimize: string;
    
    if (args.prompt_text) {
      // Use provided prompt text
      promptToOptimize = args.prompt_text;
    } else {
      // For now, return instruction for Claude Code to provide the context
      return {
        sessionId: 'context-needed',
        status: 'awaiting-prompt',
        config: {
          model: args.model || 'claude-4-opus',
          temperature: args.temperature || 0.3,
          optimization_type: args.optimization_type || 'comprehensive'
        },
        message: `Please provide the prompt text you want to optimize. You can either:
1. Call this tool again with prompt_text parameter
2. Use @bestmate_submit_prompt directly with your prompt text

Workflow will automatically continue to get optimization results once prompt is submitted.`
      };
    }

    // Step 1: Submit prompt for optimization
    const submitResult = await handleSubmitPrompt(client, {
      prompt: promptToOptimize,
      context: args.context,
      domain: args.domain,
      model: args.model || 'claude-4-opus',
      temperature: args.temperature || 0.3,
      optimization_type: args.optimization_type || 'comprehensive'
    });

    // Step 2: Get optimization results
    const results = await handleGetResults(client, {
      sessionId: submitResult.sessionId
    });

    return {
      sessionId: submitResult.sessionId,
      status: 'completed',
      config: submitResult.config,
      message: `Optimization workflow completed successfully for session ${submitResult.sessionId}`,
      results: results
    };
  } catch (error) {
    throw new Error(`Failed to complete optimization workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}