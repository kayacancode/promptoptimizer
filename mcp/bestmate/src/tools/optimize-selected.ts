import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BestMateClient } from '../bestmate-client.js';

export function createOptimizeSelectedTool(client: BestMateClient): Tool {
  return {
    name: 'bestmate_optimize_selected',
    description: 'Optimize selected text from your editor. Select text in Cursor, then use this tool without any parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'Model to use (optional)',
          enum: ['claude-4-opus', 'claude-3-sonnet', 'claude-3-haiku', 'gpt-4', 'gpt-3.5-turbo', 'gemini-pro'],
          default: 'claude-4-opus'
        },
        temperature: {
          type: 'number',
          description: 'Temperature (optional)',
          minimum: 0.0,
          maximum: 1.0,
          default: 0.3
        },
        optimization_type: {
          type: 'string',
          description: 'Optimization focus (optional)',
          enum: ['clarity', 'effectiveness', 'specificity', 'comprehensive'],
          default: 'comprehensive'
        }
      },
      required: []
    }
  };
}

export async function handleOptimizeSelected(
  client: BestMateClient,
  args: { 
    model?: string;
    temperature?: number;
    optimization_type?: string;
  }
): Promise<{ instructions: string; workflow: string[] }> {
  
  return {
    instructions: "To optimize your selected text, please follow these steps:",
    workflow: [
      "1. Copy your selected text (Cmd+C)",
      "2. Use: @bestmate_submit_prompt prompt=\"[paste your text here]\"",
      "3. Wait for the sessionId in the response",
      "4. Use: @bestmate_get_results sessionId=\"[the-returned-session-id]\"",
      "5. Review the optimization suggestions",
      "6. Optionally use: @bestmate_apply_optimization to apply changes"
    ]
  };
}