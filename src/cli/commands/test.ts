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

    if (error instanceof Error) {
      console.error('\n' + chalk.red(error.message) + '\n');

      // Add contextual help for test failures
      if (!error.message.includes('schiba update')) {
        console.log(chalk.yellow('Troubleshooting tips:'));
        console.log(chalk.dim('  - Check your connection details: ') + chalk.cyan(`schiba list`));
        console.log(
          chalk.dim('  - Update connection settings: ') +
            chalk.cyan(`schiba update ${tag || '<tag>'} <property> <value>`)
        );
        console.log(
          chalk.dim('  - Common properties to update: ssl, host, port, username, password')
        );
        console.log();
      }
    } else {
      logger.error(`Test failed: ${error}`);
    }

    throw error;
  }
}
