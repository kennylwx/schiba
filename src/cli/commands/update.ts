import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import chalk from 'chalk';

export type UpdateProperty =
  | 'ssl'
  | 'ssl-mode'
  | 'username'
  | 'password'
  | 'host'
  | 'port'
  | 'database'
  | 'schema';

export async function updateConnection(
  tag: string,
  property: UpdateProperty,
  value: string
): Promise<void> {
  try {
    configManager.update(tag, property, value);
  } catch (error) {
    logger.error(`Failed to update connection: ${(error as Error).message}`);
    throw error;
  }
}

export function showUpdateHelp(tag?: string, property?: string): void {
  console.log(chalk.yellow('\nUpdate command usage:'));
  console.log(chalk.cyan('  schiba update <tag> <property> <value>'));

  if (!tag) {
    // Show available tags
    const connections = configManager.list();
    if (connections.length > 0) {
      console.log(chalk.dim('\nAvailable tags:'));
      connections.forEach(({ tag, isDefault }) => {
        console.log(chalk.dim(`  - ${tag}${isDefault ? ' (default)' : ''}`));
      });
    }
  }

  if (!property || tag) {
    console.log(chalk.dim('\nAvailable properties:'));
    console.log(chalk.dim('  - ssl        : enable/disable'));
    console.log(chalk.dim('  - ssl-mode   : SSL mode (e.g., require, verify-ca)'));
    console.log(chalk.dim('  - username   : database username'));
    console.log(chalk.dim('  - password   : database password'));
    console.log(chalk.dim('  - host       : database host'));
    console.log(chalk.dim('  - port       : database port'));
    console.log(chalk.dim('  - database   : database name'));
    console.log(chalk.dim('  - schema     : database schema (PostgreSQL)'));
  }

  console.log(chalk.dim('\nExamples:'));
  console.log(chalk.dim('  schiba update local ssl disable'));
  console.log(chalk.dim('  schiba update prod username newuser'));
  console.log(chalk.dim('  schiba update local port 5433\n'));
}
