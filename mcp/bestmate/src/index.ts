#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { getBestMateConfig } from './config/index.js';
import { BestMateClient } from './bestmate-client.js';
import {
  createSubmitPromptTool,
  handleSubmitPrompt,
  createSubmitFromContextTool,
  handleSubmitFromContext,
  createGetResultsTool,
  handleGetResults,
  createApplyOptimizationTool,
  handleApplyOptimization,
  createEvaluatePromptTool,
  handleEvaluatePrompt,
  createOptimizeSelectedTool,
  handleOptimizeSelected
} from './tools/index.js';

class BestMateServer {
  private server: Server;
  private client: BestMateClient;

  constructor() {
    this.server = new Server(
      {
        name: 'bestmate-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const config = getBestMateConfig();
    this.client = new BestMateClient(config);

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          createSubmitPromptTool(this.client),
          createSubmitFromContextTool(this.client),
          createGetResultsTool(this.client),
          createApplyOptimizationTool(),
          createEvaluatePromptTool(this.client),
          createOptimizeSelectedTool(this.client),
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'bestmate_submit_prompt':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleSubmitPrompt(this.client, args as any), null, 2),
                },
              ],
            };

          case 'bestmate_submit_from_context':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleSubmitFromContext(this.client, args as any), null, 2),
                },
              ],
            };

          case 'bestmate_get_results':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleGetResults(this.client, args as any), null, 2),
                },
              ],
            };

          case 'bestmate_apply_optimization':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleApplyOptimization(args as any), null, 2),
                },
              ],
            };

          case 'bestmate_evaluate_prompt':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleEvaluatePrompt(this.client, args as any), null, 2),
                },
              ],
            };

          case 'bestmate_optimize_selected':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await handleOptimizeSelected(this.client, args as any), null, 2),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('BestMate MCP server running on stdio');
  }
}

const server = new BestMateServer();
server.run().catch(console.error);