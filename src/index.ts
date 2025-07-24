#!/usr/bin/env node

import { program } from 'commander';
import { CONFIG } from './config/default';
import { AddOptions, addConnection } from './cli/commands/add';
import { fetchSchema } from './cli/commands/fetch';
import { listConnections } from './cli/commands/list';
import { removeConnection } from './cli/commands/remove';
import { setDefaultConnection } from './cli/commands/default';
import { testConnection } from './cli/commands/test';
import { copyConnectionString } from './cli/commands/copy';
import { showUpdateHelp, updateConnection, UpdateProperty } from './cli/commands/update';
import { selectSchemas, listConnectionSchemas, showSchemasHelp } from './cli/commands/schemas';
import { startMcpServer } from './mcp/commands/up';
import { stopMcpServer } from './mcp/commands/down';
import { showMcpServerStatus } from './mcp/commands/status';
import { logger, LogLevel } from './utils/logger';

async function main(): Promise<void> {
  program
    .name('schiba')
    .description('Database schema extraction tool with connection management')
    .version(CONFIG.VERSION, '-v, --version', 'Output the current version')
    .configureHelp({
      sortSubcommands: true,
      showGlobalOptions: true,
    });

  // Add command
  program
    .command('add [tag] [connection-string]')
    .description('Add a database connection (interactive mode if no arguments)')
    .option('--no-ssl', 'Disable SSL (sets ssl-mode to "disable")')
    .option('--default', 'Set as default connection')
    .option('--description <text>', 'Add a description')
    .action(async (tag?: string, connectionString?: string, options?: AddOptions) => {
      try {
        await addConnection(tag, connectionString, options || {});
      } catch (error) {
        process.exit(1);
      }
    });

  // Schemas command
  program
    .command('schemas [tag]')
    .description('Manage schemas for a database connection')
    .option('--list', 'List current schemas for the connection')
    .action(async (tag?: string, options?: { list?: boolean }) => {
      try {
        if (!tag) {
          showSchemasHelp();
          throw new Error('Missing required argument: tag');
        }

        if (options?.list) {
          await listConnectionSchemas(tag);
        } else {
          await selectSchemas(tag);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('\n' + error.message + '\n');
        }
        process.exit(1);
      }
    });

  // Fetch command
  program
    .command('fetch [tag]')
    .description('Fetch database schema (uses default if no tag provided)')
    .option('-f, --filename <name>', 'Output filename')
    .option('-d, --directory <path>', 'Output directory (default: current directory)')
    .option('-t, --timeout <ms>', 'Connection timeout in milliseconds')
    .option('--format <type>', 'Output format: "raw" or "markdown"')
    .option('--no-copy', 'Do not copy output to clipboard')
    .option('--verbose', 'Enable verbose logging')
    .action(async (tag: string | undefined, options) => {
      try {
        if (options.verbose) {
          logger.setLevel(LogLevel.DEBUG);
        }
        if (options.format && !['raw', 'markdown', 'md'].includes(options.format.toLowerCase())) {
          throw new Error('Invalid format option. Use "raw" or "markdown"');
        }
        if (options.format?.toLowerCase() === 'md') {
          options.format = 'markdown';
        }
        await fetchSchema(tag, options);
      } catch (error) {
        if (error instanceof Error) {
          console.error('\n' + error.message + '\n');
        } else {
          logger.error(String(error));
        }
        process.exit(1);
      }
    });

  // List command
  program
    .command('list')
    .description('List all connections')
    .option('--show-passwords', 'Show passwords in plain text')
    .action(async (options) => {
      try {
        await listConnections(options);
      } catch (error) {
        process.exit(1);
      }
    });

  // Remove command
  program
    .command('remove <tag>')
    .description('Remove a connection')
    .action(async (tag: string) => {
      try {
        await removeConnection(tag);
      } catch (error) {
        process.exit(1);
      }
    });

  // Default command
  program
    .command('default <tag>')
    .description('Set default connection')
    .action(async (tag: string) => {
      try {
        await setDefaultConnection(tag);
      } catch (error) {
        process.exit(1);
      }
    });

  // Test command
  program
    .command('test [tag]')
    .description('Test a connection')
    .action(async (tag: string | undefined) => {
      try {
        await testConnection(tag);
      } catch (error) {
        process.exit(1);
      }
    });

  // Copy command
  program
    .command('copy <tag>')
    .description('Copy connection string to clipboard')
    .action(async (tag: string) => {
      try {
        await copyConnectionString(tag);
      } catch (error) {
        process.exit(1);
      }
    });

  // Update command
  program
    .command('update [tag] [property] [value]')
    .description(
      'Update connection properties (tag, ssl-mode, username, password, host, port, database, schema)'
    )
    .action(async (tag?: string, property?: string, value?: string) => {
      try {
        if (!tag || !property || !value) {
          showUpdateHelp(tag, property);
          if (!tag) throw new Error('Missing required argument: tag');
          if (!property) throw new Error('Missing required argument: property');
          if (!value) throw new Error('Missing required argument: value');
        }

        const validProperties: UpdateProperty[] = [
          'tag',
          'ssl-mode',
          'username',
          'password',
          'host',
          'port',
          'database',
          'schema',
        ];

        if (!validProperties.includes(property as UpdateProperty)) {
          showUpdateHelp(tag, property);
          throw new Error(`Invalid property. Valid properties are: ${validProperties.join(', ')}`);
        }
        await updateConnection(tag, property as UpdateProperty, value);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(1);
      }
    });

  // MCP Server commands
  program
    .command('up')
    .description('Start the MCP (Model Context Protocol) server')
    .option('--port <number>', 'Port for MCP server (default: 3001)', parseInt)
    .option('--no-detach', 'Run in foreground (attached mode)')
    .option('--verbose', 'Enable verbose logging')
    .action(async (options) => {
      try {
        await startMcpServer(options);
      } catch (error) {
        process.exit(1);
      }
    });

  program
    .command('down')
    .description('Stop the MCP server')
    .option('--force', 'Force kill the server process')
    .option('--verbose', 'Enable verbose logging during shutdown')
    .action(async (options) => {
      try {
        await stopMcpServer(options);
      } catch (error) {
        process.exit(1);
      }
    });

  program
    .command('status')
    .description('Check MCP server status')
    .option('--verbose', 'Show detailed system information')
    .option('--logs', 'Show recent operation logs')
    .action(async (options) => {
      try {
        await showMcpServerStatus(options);
      } catch (error) {
        process.exit(1);
      }
    });

  // Hidden command to start MCP server internally (used by the up command)
  program
    .command('_mcp-server', { hidden: true })
    .description('Internal command to start MCP server')
    .action(async () => {
      try {
        const { SchibaMcpServer } = await import('./mcp/server/index');
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

        await server.start();
      } catch (error) {
        process.stderr.write(`Failed to start Schiba MCP Server: ${error}\n`);
        process.exit(1);
      }
    });

  program.addHelpText(
    'after',
    `
Get Started:
  $ schiba add "postgresql://localhost:5432/mydb"
  $ schiba fetch
  $ schiba list

Common Workflows:
  $ schiba schemas prod              # Select schemas interactively
  $ schiba schemas prod --list       # Show current schema selection
  $ schiba fetch prod --format md    # Extract to markdown format
  $ schiba update prod ssl-mode require  # Update connection settings
  
Multi-Schema Support:
  - Use 'schiba schemas <tag>' for interactive schema selection
  - Extract from multiple PostgreSQL schemas simultaneously
  - View selected schemas in 'schiba list' output

MCP Server (Model Context Protocol):
  $ schiba up                        # Start MCP server for AI integration
  $ schiba status                    # Check server status and uptime
  $ schiba down                      # Stop MCP server
  
  The MCP server exposes all Schiba functionality as tools that AI assistants
  and other MCP clients can use to interact with your databases.`
  );

  await program.parseAsync();
}

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: Error | unknown) => {
  logger.error(
    'Unhandled rejection:',
    reason instanceof Error ? reason : new Error(String(reason))
  );
  process.exit(1);
});

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
