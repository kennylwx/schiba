import clipboardy from 'clipboardy';
import chalk from 'chalk';
import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import { EMOJI_MAP } from '../../utils/constants';

export async function copyConnectionString(tag: string): Promise<void> {
  try {
    const connectionConfig = configManager.get(tag);

    await clipboardy.write(connectionConfig.url);

    console.log(
      chalk.green(`\n${EMOJI_MAP.success} Connection string for '${tag}' copied to clipboard!\n`)
    );
  } catch (error) {
    logger.error(`Failed to copy connection string: ${(error as Error).message}`);
    throw error;
  }
}
