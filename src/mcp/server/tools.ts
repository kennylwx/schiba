import { Tool } from '@modelcontextprotocol/sdk/types';

export const MCP_TOOLS: Tool[] = [
  {
    name: 'list_connections',
    description: 'List all configured database connections with their details',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'fetch_schema',
    description: 'Extract database schema from a connection. Returns formatted schema data.',
    inputSchema: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description:
            'Connection tag to fetch schema from. If not provided, uses default connection.',
        },
        format: {
          type: 'string',
          enum: ['raw', 'markdown'],
          description: 'Output format for the schema. Defaults to "raw".',
          default: 'raw',
        },
      },
      required: [],
    },
  },
  {
    name: 'test_connection',
    description: 'Test connectivity to a database connection',
    inputSchema: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Connection tag to test. If not provided, uses default connection.',
        },
      },
      required: [],
    },
  },
  {
    name: 'add_connection',
    description: 'Add a new database connection configuration',
    inputSchema: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Unique identifier for the connection (e.g., "prod", "staging", "local")',
        },
        connectionString: {
          type: 'string',
          description: 'Database connection string (e.g., "postgresql://user:pass@host:port/db")',
        },
        ssl: {
          type: 'boolean',
          description: 'Enable SSL connection. Defaults to true.',
          default: true,
        },
        default: {
          type: 'boolean',
          description: 'Set this connection as the default. Defaults to false.',
          default: false,
        },
        description: {
          type: 'string',
          description: 'Optional description for the connection',
        },
      },
      required: ['tag', 'connectionString'],
    },
  },
  {
    name: 'remove_connection',
    description: 'Remove a database connection configuration',
    inputSchema: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Tag of the connection to remove',
        },
      },
      required: ['tag'],
    },
  },
  {
    name: 'update_connection',
    description: 'Update a property of an existing database connection',
    inputSchema: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Tag of the connection to update',
        },
        property: {
          type: 'string',
          enum: ['tag', 'ssl-mode', 'username', 'password', 'host', 'port', 'database', 'schema'],
          description: 'Property to update',
        },
        value: {
          type: 'string',
          description: 'New value for the property',
        },
      },
      required: ['tag', 'property', 'value'],
    },
  },
  {
    name: 'set_default_connection',
    description: 'Set a connection as the default for operations',
    inputSchema: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Tag of the connection to set as default',
        },
      },
      required: ['tag'],
    },
  },
  {
    name: 'get_operation_logs',
    description: 'Get recent operation logs from the MCP server',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of log entries to return. Defaults to 50.',
          default: 50,
          minimum: 1,
          maximum: 1000,
        },
      },
      required: [],
    },
  },
];
