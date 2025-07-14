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
