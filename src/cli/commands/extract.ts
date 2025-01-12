import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
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

    spinner.succeed('Schema extracted successfully');

    printSummary(dbType, stats, outputPath, {
      format: options.format || 'raw',
      duration: process.hrtime()[0],
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

function printSummary(
  dbType: string,
  stats: SummaryStats,
  outputPath: string,
  meta: { format: string; duration: number }
): void {
  console.log(chalk.blue(`\n${EMOJI_MAP.stats} Schema Analysis:`));
  console.log('──────────────────────');

  if (dbType === 'POSTGRES') {
    console.log(`Tables: ${stats.details.tables}`);
    console.log(`Total Columns: ${stats.details.totalColumns}`);
    console.log(`Indexes: ${stats.details.indexCount}`);
    console.log(`Enums: ${stats.details.enums}`);
  } else if (dbType === 'MONGODB') {
    console.log(`Collections: ${stats.details.collections}`);
    console.log(`Total Fields: ${stats.details.totalFields}`);
    console.log(`Total Indexes: ${stats.details.totalIndexes}`);
  }

  console.log(chalk.blue(`\n${EMOJI_MAP.info} Summary:`));
  console.log('────────────');
  console.log(`Database: ${dbType}`);
  console.log(`Duration: ${meta.duration}s`);
  console.log(`Output: ${outputPath}`);
  console.log(`Format: ${meta.format}`);
  console.log(`Schema Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);

  if (stats.hasSensitiveData) {
    console.log(chalk.yellow(`\n${EMOJI_MAP.warning} Security Notice:`));
    console.log('───────────────────');
    console.log('Schema contains potentially sensitive tables/collections.');
    console.log('Ensure proper handling of the output file.');
  }

  console.log(chalk.green(`\n${EMOJI_MAP.success} All Done!`));
  console.log('Your schema has been successfully extracted and formatted for AI context.');
}
