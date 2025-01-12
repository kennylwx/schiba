#!/usr/bin/env node

import { program } from 'commander';
import { CONFIG } from './config/default';
import { extractSchema } from './cli/commands/extract';
import { validateConnectionString } from './utils/helpers';
import type { CLIOptions } from './cli/types';
import { logger, LogLevel } from './utils/logger';

async function main(): Promise<void> {
  program
    .name('schemix')
    .description(
      'schemix - Extract and compact database schemas for AI context windows\n\n' +
        'Example usage:\n' +
        '  $ schemix "postgresql://user:password@localhost:5432/dbname"\n' +
        '  $ schemix "mongodb://user:password@localhost:27017/dbname" --format markdown\n\n' +
        'Supported databases:\n' +
        Object.entries(CONFIG.SUPPORTED_DATABASES)
          .map(([db, prefixes]) => `  - ${db} (${prefixes.join(', ')})`)
          .join('\n') +
        '\n\nOutput formats:\n' +
        '  - raw (default): JSON format with AI context header\n' +
        '  - markdown: Tables and documentation in markdown\n'
    )
    .version(CONFIG.VERSION, '-v, --version', 'Output the current version')
    .argument('<db-string>', 'Database connection string (must be wrapped in quotes)')
    .option('-f, --filename <name>', 'Output filename')
    .option('-d, --directory <path>', 'Output directory (default: current directory)')
    .option(
      '-t, --timeout <ms>',
      'Connection timeout in milliseconds',
      String(CONFIG.CONNECTION_TIMEOUT)
    )
    .option('--format <type>', 'Output format: "raw" or "markdown"', 'raw')
    .option('--verbose', 'Enable verbose logging')
    .addHelpText('after', '\nNote: Connection string must be wrapped in quotes')
    .action(async (dbString: string, options: CLIOptions) => {
      try {
        // Set logging level based on verbose flag
        if (options.verbose) {
          logger.setLevel(LogLevel.DEBUG);
        }

        // Validate connection string
        if (!validateConnectionString(dbString)) {
          throw new Error('Invalid connection string format');
        }

        // Validate format option
        if (options.format && !['raw', 'markdown', 'md'].includes(options.format.toLowerCase())) {
          throw new Error('Invalid format option. Use "raw" or "markdown"');
        }

        // Normalize format option
        if (options.format?.toLowerCase() === 'md') {
          options.format = 'markdown';
        }

        await extractSchema(dbString, {
          filename: options.filename,
          directory: options.directory,
          timeout: options.timeout ? options.timeout : CONFIG.CONNECTION_TIMEOUT,
          format: options.format as 'raw' | 'markdown',
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
          if (options.verbose) {
            logger.error('Stack trace:', error);
          }
        } else {
          logger.error('An unknown error occurred');
        }
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
