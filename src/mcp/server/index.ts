#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types';
import { McpHandlers } from './handlers';
import { MCP_TOOLS } from './tools';
import { McpStore } from './store';

export class SchibaMcpServer {
  private server: Server;
  private handlers: McpHandlers;
  private store: McpStore;

  constructor() {
    this.handlers = new McpHandlers();
    this.store = McpStore.getInstance();

    this.server = new Server(
      {
        name: 'schiba-mcp-server',
        version: '0.2.10',
        description: 'Database schema extraction server with connection management via MCP',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: MCP_TOOLS,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_connections': {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.handlers.listConnections(), null, 2),
                },
              ],
            };
          }

          case 'fetch_schema': {
            const tag = typeof args?.tag === 'string' ? args.tag : undefined;
            const format =
              typeof args?.format === 'string' &&
              (args.format === 'raw' || args.format === 'markdown')
                ? args.format
                : 'raw';

            const schemaResult = await this.handlers.fetchSchema(tag, format);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(schemaResult, null, 2),
                },
              ],
            };
          }

          case 'test_connection': {
            const testTag = typeof args?.tag === 'string' ? args.tag : undefined;
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.handlers.testConnection(testTag), null, 2),
                },
              ],
            };
          }

          case 'add_connection': {
            if (typeof args?.tag !== 'string' || typeof args?.connectionString !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Missing required parameters: tag and connectionString must be strings'
              );
            }

            const ssl = typeof args.ssl === 'boolean' ? args.ssl : true;
            const isDefault = typeof args.default === 'boolean' ? args.default : false;
            const description = typeof args.description === 'string' ? args.description : undefined;

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.handlers.addConnection(args.tag, args.connectionString, {
                      ssl,
                      default: isDefault,
                      description,
                    }),
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'remove_connection': {
            if (typeof args?.tag !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Missing required parameter: tag must be a string'
              );
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.handlers.removeConnection(args.tag), null, 2),
                },
              ],
            };
          }

          case 'update_connection': {
            if (
              typeof args?.tag !== 'string' ||
              typeof args?.property !== 'string' ||
              typeof args?.value !== 'string'
            ) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Missing required parameters: tag, property, and value must be strings'
              );
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.handlers.updateConnection(args.tag, args.property, args.value),
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'set_default_connection': {
            if (typeof args?.tag !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Missing required parameter: tag must be a string'
              );
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.handlers.setDefaultConnection(args.tag), null, 2),
                },
              ],
            };
          }

          case 'get_operation_logs': {
            const limit = typeof args?.limit === 'number' ? args.limit : 50;
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await this.handlers.getOperationLogs(limit), null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Update server state
    this.store.updateServerState({
      status: 'running',
      pid: process.pid,
      startedAt: new Date().toISOString(),
    });

    process.stderr.write('Schiba MCP Server started successfully\n');
  }

  public async stop(): Promise<void> {
    // Update server state
    this.store.updateServerState({
      status: 'stopped',
      pid: undefined,
      startedAt: undefined,
    });

    this.store.close();
    await this.server.close();
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SchibaMcpServer();

  process.on('SIGINT', async () => {
    process.stderr.write('\nShutting down Schiba MCP Server...\n');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    process.stderr.write('\nShutting down Schiba MCP Server...\n');
    await server.stop();
    process.exit(0);
  });

  server.start().catch((error) => {
    process.stderr.write(`Failed to start Schiba MCP Server: ${error}\n`);
    process.exit(1);
  });
}
