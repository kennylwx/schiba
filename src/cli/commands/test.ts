import ora from 'ora';
import chalk from 'chalk';
import { configManager } from '../../config/manager';
import { createConnection } from '../../services/database';
import { logger } from '../../utils/logger';
import { EMOJI_MAP } from '../../utils/constants';

export async function testConnection(tag?: string): Promise<void> {
  const spinner = ora('Testing connection...').start();

  try {
    const connectionConfig = configManager.get(tag);
    const dbType = configManager.detectDatabaseType(connectionConfig);

    if (!dbType) {
      throw new Error('Unsupported database type');
    }

    spinner.text = `Testing connection to '${connectionConfig.tag}'...`;

    const connection = createConnection(connectionConfig);
    await connection.connect();
    const success = await connection.test();
    await connection.disconnect();

    if (success) {
      spinner.succeed(`Connection '${connectionConfig.tag}' is working`);
      console.log(chalk.green(`\n${EMOJI_MAP.success} Connection test successful!\n`));
    } else {
      spinner.fail(`Connection '${connectionConfig.tag}' test failed`);
    }
  } catch (error) {
    spinner.fail('Connection test failed');
    logger.error(`Test failed: ${(error as Error).message}`);
    throw error;
  }
}
