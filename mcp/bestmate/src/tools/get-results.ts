import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BestMateClient } from '../bestmate-client.js';
import { OptimizationResult } from '../types/index.js';

export function createGetResultsTool(client: BestMateClient): Tool {
  return {
    name: 'bestmate_get_results',
    description: 'Retrieve optimization results from BestMate for a given session',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'The session ID returned from submit_prompt'
        }
      },
      required: ['sessionId']
    }
  };
}

export async function handleGetResults(
  client: BestMateClient,
  args: { sessionId: string }
): Promise<OptimizationResult> {
  try {
    const result = await client.getOptimizationResults(args.sessionId);
    return result;
  } catch (error) {
    throw new Error(`Failed to get results: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}