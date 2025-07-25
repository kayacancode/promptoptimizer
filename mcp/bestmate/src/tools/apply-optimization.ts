import { Tool } from '@modelcontextprotocol/sdk/types.js';

export function createApplyOptimizationTool(): Tool {
  return {
    name: 'bestmate_apply_optimization',
    description: 'Apply a selected optimization suggestion to your prompt',
    inputSchema: {
      type: 'object',
      properties: {
        suggestionId: {
          type: 'string',
          description: 'The ID of the suggestion to apply'
        },
        optimizedPrompt: {
          type: 'string',
          description: 'The optimized prompt text to apply'
        }
      },
      required: ['suggestionId', 'optimizedPrompt']
    }
  };
}

export async function handleApplyOptimization(
  args: { suggestionId: string; optimizedPrompt: string }
): Promise<{ applied: boolean; prompt: string; suggestionId: string }> {
  return {
    applied: true,
    prompt: args.optimizedPrompt,
    suggestionId: args.suggestionId
  };
}