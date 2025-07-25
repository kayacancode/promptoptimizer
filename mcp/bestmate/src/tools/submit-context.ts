import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BestMateClient } from '../bestmate-client.js';

export function createSubmitContextTool(client: BestMateClient): Tool {
  return {
    name: 'bestmate_submit_context',
    description: 'Submit selected/copied text from Cursor for prompt optimization. Use this when you have text selected in your editor.',
    inputSchema: {
      type: 'object',
      properties: {
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
        },
        context: {
          type: 'string',
          description: 'Additional context about the prompt usage (optional)'
        },
        domain: {
          type: 'string',
          description: 'Domain or use case for the prompt (optional)'
        }
      },
      required: []
    }
  };
}

export async function handleSubmitContext(
  client: BestMateClient,
  args: { 
    model?: string;
    temperature?: number;
    optimization_type?: string;
    context?: string; 
    domain?: string;
  }
): Promise<{ sessionId: string; status: string; config: object; message: string }> {
  try {
    // Since we can't directly access Cursor's context through MCP,
    // we'll create a prompt that instructs the user about the workflow
    const instructionalPrompt = `Please provide the prompt text you want to optimize. 

If you have text selected in Cursor:
1. Copy the selected text (Cmd+C)
2. Use @bestmate_submit_prompt prompt="[paste your text here]"

Or use this tool after copying text to your clipboard, and the system will guide you through the optimization process.`;

    const result = await client.submitPrompt({
      prompt: instructionalPrompt,
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
      },
      message: 'Context-based submission created. Please provide your prompt text to continue.'
    };
  } catch (error) {
    throw new Error(`Failed to submit context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}