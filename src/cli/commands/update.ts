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
  | 'schema'
  | 'tag';

export async function updateConnection(
  tag: string,
  property: UpdateProperty,
  value: string
): Promise<void> {
  try {
    const result = configManager.update(tag, property, value);

    // Handle tag renaming feedback - only for tag updates
    if (property === 'tag' && result) {
      // TypeScript now knows result is { finalTag: string; tagResult: TagGenerationResult }
      const { finalTag, tagResult } = result;

      if (tagResult.wasConflictResolved) {
        console.log(
          chalk.yellow(
            `⚠️  Tag '${tagResult.originalTag}' already exists. Using '${finalTag}' instead.`
          )
        );
      }
    }
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
    console.log(chalk.dim('  - tag        : rename the connection tag'));
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
  console.log(chalk.dim('  schiba update local ssl-mode disable'));
  console.log(chalk.dim('  schiba update prod username newuser'));
  console.log(chalk.dim('  schiba update local port 5433'));
  console.log(
    chalk.dim('  schiba update alpha tag production    # Rename "alpha" to "production"')
  );
  console.log(
    chalk.dim(
      '  schiba update local tag prod          # Rename "local" to "prod" (or "prod-1" if taken)'
    )
  );

  console.log(
    chalk.dim(
      '\nNote: When renaming tags, if the new name is taken, a number will be appended automatically.\n'
    )
  );
}
