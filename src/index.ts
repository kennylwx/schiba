#!/usr/bin/env node

import { program } from 'commander';
import { CONFIG } from './config/default';
import { AddOptions, addConnection, showAddHelp } from './cli/commands/add';
import { fetchSchema } from './cli/commands/fetch';
import { listConnections } from './cli/commands/list';
import { removeConnection } from './cli/commands/remove';
import { setDefaultConnection } from './cli/commands/default';
import { testConnection } from './cli/commands/test';
import { copyConnectionString } from './cli/commands/copy';
import { showUpdateHelp, updateConnection, UpdateProperty } from './cli/commands/update';
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
    .description('Add a database connection')
    .option('--no-ssl', 'Disable SSL connection')
    .option('--default', 'Set as default connection')
    .option('--description <text>', 'Add a description')
    .action(async (tag?: string, connectionString?: string, options?: AddOptions) => {
      try {
        if (!tag || !connectionString) {
          showAddHelp(tag);
          if (!tag) {
            throw new Error('Missing required argument: tag');
          }
          if (!connectionString) {
            throw new Error('Missing required argument: connection-string');
          }
        }
        await addConnection(tag, connectionString, options || {});
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
    .option('--no-copy', 'Do not copy output to clipboard')
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
      'Update connection properties (ssl, username, password, host, port, database, schema)'
    )
    .action(async (tag?: string, property?: string, value?: string) => {
      try {
        // Check if help is needed
        if (!tag || !property || !value) {
          showUpdateHelp(tag, property);
          if (!tag) {
            throw new Error('Missing required argument: tag');
          }
          if (!property) {
            throw new Error('Missing required argument: property');
          }
          if (!value) {
            throw new Error('Missing required argument: value');
          }
        }

        const validProperties: UpdateProperty[] = [
          'ssl',
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

  // Add example usage after configuring all commands
  program.addHelpText(
    'after',
    `
Get Started:
  $ schiba add local "postgresql://localhost:5432/mydb"
  $ schiba fetch
  $ schiba list
  $ schiba update local ssl disable
  $ schiba copy local`
  );

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
