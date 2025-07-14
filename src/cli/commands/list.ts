import chalk from 'chalk';
import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import { EMOJI_MAP } from '../../utils/constants';

export async function listConnections(): Promise<void> {
  try {
    const connections = configManager.list();

    if (connections.length === 0) {
      logger.info(
        'No connections configured. Use "schiba add <tag> <connection-string>" to add a connection.'
      );
      return;
    }

    console.log(chalk.blue(`\n${EMOJI_MAP.connection} Configured Connections:\n`));

    connections.forEach(({ tag, connection, isDefault }) => {
      const dbType = configManager.detectDatabaseType(connection) || 'Unknown';
      const defaultMark = isDefault ? chalk.green(' (default)') : '';
      const sslStatus = connection.ssl ? chalk.green('SSL') : chalk.yellow('No SSL');

      console.log(chalk.bold(`  ${tag}${defaultMark}`));
      console.log(chalk.dim(`    Type: ${dbType} | ${sslStatus}`));
      if (connection.description) {
        console.log(chalk.dim(`    Description: ${connection.description}`));
      }
      console.log(chalk.dim(`    Created: ${new Date(connection.created).toLocaleDateString()}`));
      if (connection.lastUsed) {
        console.log(
          chalk.dim(`    Last used: ${new Date(connection.lastUsed).toLocaleDateString()}`)
        );
      }
      console.log();
    });
  } catch (error) {
    logger.error(`Failed to list connections: ${(error as Error).message}`);
    throw error;
  }
}
