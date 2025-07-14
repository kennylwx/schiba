import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import chalk from 'chalk';

export interface AddOptions {
  ssl?: boolean;
  default?: boolean;
  description?: string;
}

export async function addConnection(
  tag: string,
  connectionString: string,
  options: AddOptions
): Promise<void> {
  try {
    configManager.add(tag, connectionString, options);

    // Show helpful next steps
    if (configManager.list().length === 1) {
      console.log(chalk.dim('\nNext step: Run "schiba fetch" to extract the schema'));
    }
  } catch (error) {
    logger.error(`Failed to add connection: ${(error as Error).message}`);
    throw error;
  }
}

export function showAddHelp(tag?: string): void {
  console.log(chalk.yellow('\nAdd command usage:'));
  console.log(chalk.cyan('  schiba add <tag> <connection-string> [options]'));

  if (!tag) {
    console.log(chalk.dim('\nExample tags:'));
    console.log(chalk.dim('  - local'));
    console.log(chalk.dim('  - staging'));
    console.log(chalk.dim('  - production'));
    console.log(chalk.dim('  - dev'));
  }

  console.log(chalk.dim('\nConnection string formats:'));
  console.log(chalk.dim('  PostgreSQL: postgresql://user:pass@host:port/database'));
  console.log(chalk.dim('  MongoDB:    mongodb://user:pass@host:port/database'));

  console.log(chalk.dim('\nOptions:'));
  console.log(chalk.dim('  --no-ssl             Disable SSL connection'));
  console.log(chalk.dim('  --default            Set as default connection'));
  console.log(chalk.dim('  --description <text> Add a description'));

  console.log(chalk.dim('\nExamples:'));
  console.log(chalk.dim('  schiba add local "postgresql://localhost:5432/mydb" --no-ssl'));
  console.log(chalk.dim('  schiba add prod "postgresql://user:pass@host:5432/db" --default'));
  console.log(chalk.dim('  schiba add staging "mongodb://localhost:27017/mydb"'));

  console.log(chalk.dim('\nNote: If your connection string contains special characters (like ?),'));
  console.log(chalk.dim('      wrap it in quotes to prevent shell interpretation.\n'));
}
