import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import chalk from 'chalk';
import { InteractivePrompts } from '../interactive/prompts';

export interface AddOptions {
  ssl?: boolean;
  default?: boolean;
  description?: string;
  interactive?: boolean;
}

export async function addConnection(
  tag?: string,
  connectionString?: string,
  options: AddOptions = {}
): Promise<void> {
  try {
    // If no arguments provided, go into interactive mode
    if (!tag && !connectionString) {
      await addConnectionInteractive();
      return;
    }

    // Original non-interactive mode
    if (!tag || !connectionString) {
      showAddHelp(tag);
      if (!tag) {
        throw new Error('Missing required argument: tag');
      }
      if (!connectionString) {
        throw new Error('Missing required argument: connection-string');
      }
    }

    configManager.add(tag, connectionString, options);

    // Show helpful next steps
    if (configManager.list().length === 1) {
      console.log(chalk.dim('\nTip: Run "schiba fetch" to extract the schema'));
    }
  } catch (error) {
    logger.error(`Failed to add connection: ${(error as Error).message}`);
    throw error;
  }
}

async function addConnectionInteractive(): Promise<void> {
  const prompts = new InteractivePrompts();

  try {
    // Collect connection details
    const details = await prompts.collectConnectionDetails();

    // Build connection string
    const connectionString = prompts.buildConnectionString(details);

    // Show summary and confirm
    const confirmed = await prompts.confirmConnection(details);

    if (!confirmed) {
      console.log(chalk.yellow('\n👋 Connection setup cancelled.'));
      return;
    }

    // Add the connection - don't pass ssl option, we'll set SSL mode separately
    configManager.add(details.tag, connectionString, {
      default: details.setAsDefault,
      description: details.description,
    });

    // Update SSL mode specifically (since configManager.add doesn't handle sslMode directly)
    if (details.sslMode !== 'prefer') {
      configManager.update(details.tag, 'ssl-mode', details.sslMode);
    }

    console.log(chalk.green(`\n✅ Connection '${details.tag}' added successfully!`));

    // Show next steps
    console.log(chalk.dim('\n💡 Next steps:'));
    console.log(chalk.dim(`   • Extract schema: ${chalk.cyan(`schiba fetch ${details.tag}`)}`));
    console.log(chalk.dim(`   • View connections: ${chalk.cyan('schiba list')}`));
    console.log(chalk.dim(`   • Test connection: ${chalk.cyan(`schiba test ${details.tag}`)}`));
    if (details.dbType === 'postgresql') {
      console.log(
        chalk.dim(`   • Configure schemas: ${chalk.cyan(`schiba schemas ${details.tag}`)}`)
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('User force closed')) {
      console.log(chalk.yellow('\n👋 Connection setup cancelled.'));
      return;
    }
    throw error;
  }
}

export function showAddHelp(tag?: string): void {
  console.log(chalk.yellow('\nAdd command usage:'));
  console.log(
    chalk.cyan('  schiba add                                    # Interactive mode (recommended)')
  );
  console.log(chalk.cyan('  schiba add <tag> <connection-string> [options] # Direct mode'));

  if (!tag) {
    console.log(chalk.dim('\nExample tags:'));
    console.log(chalk.dim('  - local'));
    console.log(chalk.dim('  - staging'));
    console.log(chalk.dim('  - production'));
    console.log(chalk.dim('  - dev'));
  }

  console.log(chalk.dim('\nConnection string formats (for direct mode):'));
  console.log(chalk.dim('  PostgreSQL: postgresql://user:pass@host:port/database'));
  console.log(chalk.dim('  MongoDB:    mongodb://user:pass@host:port/database'));

  console.log(chalk.dim('\nOptions (for direct mode):'));
  console.log(chalk.dim('  --no-ssl             Disable SSL connection'));
  console.log(chalk.dim('  --default            Set as default connection'));
  console.log(chalk.dim('  --description <text> Add a description'));

  console.log(chalk.dim('\nExamples:'));
  console.log(
    chalk.green('  schiba add                                           # Start interactive setup')
  );
  console.log(chalk.dim('  schiba add local "postgresql://localhost:5432/mydb" --no-ssl'));
  console.log(chalk.dim('  schiba add prod "postgresql://user:pass@host:5432/db" --default'));
  console.log(chalk.dim('  schiba add staging "mongodb://localhost:27017/mydb"'));

  console.log(chalk.dim('\nNote: Interactive mode is recommended for first-time users.'));
  console.log(chalk.dim('      If your connection string contains special characters (like ?),'));
  console.log(chalk.dim('      wrap it in quotes to prevent shell interpretation.\n'));
}
