import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import clipboardy from 'clipboardy';
import { createAnalyzer } from '@/core/analyzers';
import { CLIOptions } from '../types.js';
import { createFormatter } from '@/core/formatters';
import { CONFIG } from '@/config/default';
import { EMOJI_MAP } from '@/utils/constants';

export async function extractSchema(dbString: string, options: CLIOptions): Promise<void> {
  const spinner = ora('Connecting to database...').start();

  try {
    const timeout = options.timeout ? options.timeout : CONFIG.CONNECTION_TIMEOUT;
    const dbType = detectDatabaseType(dbString);

    if (!dbType) {
      throw new Error('Unsupported database type');
    }

    spinner.text = 'Analyzing schema...';
    const analyzer = await createAnalyzer(dbType, dbString, timeout);
    const { schema, stats } = await analyzer.analyze();

    spinner.text = 'Formatting output...';
    const formatter = createFormatter(options.format || 'raw');
    const formattedContent = formatter.format(schema, stats);

    spinner.text = 'Writing to file...';
    const outputPath = await writeToFile(formattedContent, options);

    if (options.copy) {
      spinner.text = 'Copying to clipboard...';
      try {
        await clipboardy.write(formattedContent);
      } catch (error) {
        spinner.warn('Failed to copy to clipboard');
        if (options.verbose) {
          console.error('Clipboard error:', error);
        }
      }
    }

    // Remove spinner success message as it will be handled in printSummary
    spinner.stop();

    printSummary(dbType, stats, outputPath, {
      format: options.format || 'raw',
      duration: process.hrtime()[0],
      copiedToClipboard: options.copy,
    });
  } catch (error) {
    spinner.fail('Error extracting schema');
    throw error;
  }
}

function detectDatabaseType(connectionString: string): string | null {
  for (const [dbType, prefixes] of Object.entries(CONFIG.SUPPORTED_DATABASES)) {
    if (prefixes.some((prefix) => connectionString.toLowerCase().startsWith(prefix))) {
      return dbType;
    }
  }
  return null;
}

async function writeToFile(content: string, options: CLIOptions): Promise<string> {
  const directory = options.directory || process.cwd();
  const filename =
    options.filename ||
    (options.format === 'markdown' ? CONFIG.DEFAULT_OUTPUT.MARKDOWN : CONFIG.DEFAULT_OUTPUT.RAW);

  const fullPath = path.join(directory, filename);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');

  return fullPath;
}

interface SummaryStats {
  details: {
    tables?: number;
    totalColumns?: number;
    indexCount?: number;
    enums?: number;
    collections?: number;
    totalFields?: number;
    totalIndexes?: number;
  };
  totalSize: number;
  hasSensitiveData?: boolean;
}

interface SummaryMetadata {
  format: string;
  duration: number;
  copiedToClipboard?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  return `${(seconds / 60).toFixed(1)}m`;
}

function formatStorageSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)}KB`;
  }
  return `${(kb / 1024).toFixed(1)}MB`;
}

function estimateStats(stats: SummaryStats): {
  totalColumns: number;
  totalIndexes: number;
} {
  // Estimate columns: average 5 columns per table if not provided
  const totalColumns =
    stats.details.totalColumns || (stats.details.tables ? stats.details.tables * 5 : 0);

  // Estimate indexes: ~20% of columns if not provided
  const totalIndexes = stats.details.indexCount || Math.floor(totalColumns * 0.2);

  return { totalColumns, totalIndexes };
}

/**
 * Prints a formatted summary of the schema analysis
 * @param dbType - Type of database (e.g., 'POSTGRES', 'MONGODB')
 * @param stats - Statistics about the schema
 * @param outputPath - Path where the schema was saved
 * @param meta - Additional metadata about the operation
 */
function printSummary(
  dbType: string,
  stats: SummaryStats,
  outputPath: string,
  meta: SummaryMetadata
): void {
  try {
    // Calculate derived statistics
    const { totalColumns, totalIndexes } = estimateStats(stats);
    const durationFormatted = formatDuration(meta.duration);
    const sizeFormatted = formatStorageSize(stats.totalSize);

    // Version and info header
    console.log(chalk.dim(`Schemix v${CONFIG.VERSION}`));
    console.log(
      chalk.dim('Please check https://github.com/kennylwx/schemix for more information.\n')
    );

    // Main content block with single separator
    console.log(chalk.white(`${EMOJI_MAP.stats} Breakdown:`));
    console.log(chalk.dim('─────────────'));

    // Stats block with consistent coloring
    console.log(
      chalk.white('Database: ') +
        chalk.bold.cyan(dbType) +
        chalk.dim(' | Duration: ') +
        chalk.dim(durationFormatted) +
        chalk.dim(' | Size: ') +
        chalk.dim(sizeFormatted)
    );

    // Objects line with consistent coloring
    console.log(
      chalk.white(`Tables: ${stats.details.tables || 0}`) +
        chalk.dim(
          ` | Columns: ${totalColumns} | ` +
            `Indexes: ${totalIndexes} | ` +
            `Enums: ${stats.details.enums || 0}`
        )
    );

    // Output info with consistent coloring
    console.log(
      chalk.white('Directory: ') +
        chalk.white(outputPath) +
        chalk.dim(' | Format: ') +
        chalk.dim(meta.format) +
        '\n'
    );

    // Bottom separator and success message

    // Single success message with proper spacing
    const successMessage = meta.copiedToClipboard
      ? 'Schema extracted and copied to clipboard!'
      : 'Schema extracted successfully!';

    console.log(`${EMOJI_MAP.success} ${chalk.green(successMessage)}\n`);

    // Security warning (if needed)
    if (stats.hasSensitiveData) {
      console.log(
        chalk.yellow(
          `\n${EMOJI_MAP.warning} Warning: Schema contains sensitive data - handle with care`
        )
      );
    }
  } catch (error) {
    // Fallback to basic output in case of formatting errors
    console.log(chalk.yellow(`\n${EMOJI_MAP.warning} Error formatting summary output`));
    console.log(`Database: ${dbType}`);
    console.log(`Output: ${outputPath}`);
    console.log(chalk.green(`\n${EMOJI_MAP.success} Schema extracted successfully`));
  }
}
