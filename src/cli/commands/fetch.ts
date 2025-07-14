import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import clipboardy from 'clipboardy';
import { createAnalyzer } from '../../core/analyzers';
import { createFormatter } from '../../core/formatters';
import { CONFIG } from '../../config/default';
import { EMOJI_MAP } from '../../utils/constants';
import { TokenCounterImpl } from '../../services/tokenizer/implementations';
import { configManager } from '../../config/manager';
import { SchemaStats } from '@/core/types';

export interface FetchOptions {
  filename?: string;
  directory?: string;
  timeout?: number;
  format?: 'raw' | 'markdown';
  verbose?: boolean;
  copy?: boolean;
}

export async function fetchSchema(tag: string | undefined, options: FetchOptions): Promise<void> {
  const spinner = ora('Connecting to database...').start();

  try {
    // Get connection config
    const connectionConfig = configManager.get(tag);
    const dbType = configManager.detectDatabaseType(connectionConfig);

    if (!dbType) {
      throw new Error('Unsupported database type');
    }

    // Merge preferences with options
    const preferences = configManager.getPreferences();
    const timeout = options.timeout || preferences?.timeout || CONFIG.CONNECTION_TIMEOUT;
    const format = options.format || preferences?.format || 'raw';
    const shouldCopy = options.copy ?? preferences?.copy ?? true; // Default to true

    spinner.text = `Analyzing schema for '${connectionConfig.tag}'...`;
    const analyzer = await createAnalyzer(dbType, connectionConfig, timeout);
    const { schema, stats } = await analyzer.analyze();

    spinner.text = 'Formatting output...';
    const formatter = createFormatter(format);
    const formattedContent = formatter.format(schema, stats);

    spinner.text = 'Writing to file...';
    const outputPath = await writeToFile(formattedContent, { ...options, format });

    if (shouldCopy) {
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

    spinner.stop();

    printSummary(dbType, stats, outputPath, {
      format,
      duration: process.hrtime()[0],
      copiedToClipboard: shouldCopy,
      connectionTag: connectionConfig.tag,
    });
  } catch (error) {
    spinner.fail('Error fetching schema');

    throw error;
  }
}

async function writeToFile(
  content: string,
  options: FetchOptions & { format: string }
): Promise<string> {
  const directory = options.directory || process.cwd();
  const filename =
    options.filename ||
    (options.format === 'markdown' ? CONFIG.DEFAULT_OUTPUT.MARKDOWN : CONFIG.DEFAULT_OUTPUT.RAW);

  const fullPath = path.join(directory, filename);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');

  return fullPath;
}

interface SummaryMetadata {
  format: string;
  duration: number;
  copiedToClipboard?: boolean;
  connectionTag: string;
}
function printSummary(
  dbType: string,
  stats: SchemaStats,
  outputPath: string,
  meta: SummaryMetadata
): void {
  try {
    const tokenCounter = new TokenCounterImpl();
    const tokenEstimates = tokenCounter.countTokens(JSON.stringify(stats));

    console.log(chalk.dim(`🐕 Schiba v${CONFIG.VERSION}`));
    console.log(
      chalk.dim('Please check https://github.com/kennylwx/schiba for more information.\n')
    );

    console.log(
      chalk.white('Connection: ') +
        chalk.bold.cyan(meta.connectionTag) +
        chalk.dim(' | Database: ') +
        chalk.dim(dbType) +
        chalk.dim(' | Duration: ') +
        chalk.dim(`${meta.duration}s`) +
        chalk.dim(' | Size: ') +
        chalk.dim(`${(stats.totalSize / 1024).toFixed(2)}KB`)
    );

    console.log(
      chalk.white(`Breakdown: `) +
        chalk.dim(`${stats.details.tables || 0} tables`) +
        chalk.dim(` | `) +
        chalk.dim(`${stats.details.columns || 0} columns`) +
        chalk.dim(` | `) +
        chalk.dim(`${stats.details.indexes || 0} indexes`) +
        chalk.dim(` | `) +
        chalk.dim(`${stats.details.enums || 0} enums`)
    );

    console.log(
      chalk.white('Token Usage: ') +
        chalk.white('Claude: ') +
        chalk.cyan(`${tokenEstimates.claude.toLocaleString()} tokens`) +
        chalk.dim(' | ') +
        chalk.white('GPT-4: ') +
        chalk.cyan(`${tokenEstimates.gpt4.toLocaleString()} tokens`)
    );

    console.log('\n' + chalk.dim('Directory: ') + chalk.dim(outputPath) + '\n');

    const successMessage = meta.copiedToClipboard
      ? 'Schema extracted and copied to clipboard!'
      : 'Schema extracted successfully!';

    console.log(chalk.green(`${EMOJI_MAP.success} ${chalk.green(successMessage)}\n`));
  } catch (error) {
    console.log(chalk.green(`\n${EMOJI_MAP.success} Schema extracted successfully`));
  }
}
