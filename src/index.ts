#!/usr/bin/env node

import { program } from 'commander';
import { CONFIG } from './config/default';
import { addConnection } from './cli/commands/add';
import { fetchSchema } from './cli/commands/fetch';
import { listConnections } from './cli/commands/list';
import { removeConnection } from './cli/commands/remove';
import { setDefaultConnection } from './cli/commands/default';
import { testConnection } from './cli/commands/test';
import { logger, LogLevel } from './utils/logger';

async function main(): Promise<void> {
  program
    .name('schiba')
    .description(
      'schiba - Database schema extraction tool with connection management\n\n' +
        'Quick start:\n' +
        '  $ schiba add local "postgresql://localhost:5432/mydb" --no-ssl\n' +
        '  $ schiba fetch\n\n' +
        'Commands:\n' +
        '  add <tag> <connection>  Add a database connection\n' +
        '  fetch [tag]            Fetch schema (uses default if no tag)\n' +
        '  list                   List all connections\n' +
        '  remove <tag>           Remove a connection\n' +
        '  default <tag>          Set default connection\n' +
        '  test [tag]             Test a connection'
    )
    .version(CONFIG.VERSION, '-v, --version', 'Output the current version');

  // Add command
  program
    .command('add <tag> <connection-string>')
    .description('Add a database connection')
    .option('--no-ssl', 'Disable SSL connection')
    .option('--default', 'Set as default connection')
    .option('--description <text>', 'Add a description')
    .action(async (tag: string, connectionString: string, options) => {
      try {
        await addConnection(tag, connectionString, options);
      } catch (error) {
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
    .option('-c, --copy', 'Copy the output to clipboard')
    .option('--verbose', 'Enable verbose logging')
    .action(async (tag: string | undefined, options) => {
      try {
        if (options.verbose) {
          logger.setLevel(LogLevel.DEBUG);
        }

        // Validate format option
        if (options.format && !['raw', 'markdown', 'md'].includes(options.format.toLowerCase())) {
          throw new Error('Invalid format option. Use "raw" or "markdown"');
        }

        // Normalize format option
        if (options.format?.toLowerCase() === 'md') {
          options.format = 'markdown';
        }

        await fetchSchema(tag, options);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
          if (options.verbose) {
            logger.error('Stack trace:', error);
          }
        }
        process.exit(1);
      }
    });

  // List command
  program
    .command('list')
    .description('List all connections')
    .action(async () => {
      try {
        await listConnections();
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

  await program.parseAsync();
}

// Handle uncaught exceptions
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
