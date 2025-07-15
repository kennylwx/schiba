import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import { Client } from '../../utils/pg-client';
import { buildSSLConfig } from '../../utils/ssl';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';

export interface SchemaListItem {
  name: string;
  selected: boolean;
  hasPermission: boolean;
}

export async function listAvailableSchemas(tag: string): Promise<SchemaListItem[]> {
  const spinner = ora('Discovering schemas...').start();

  try {
    const connectionConfig = configManager.get(tag);
    const dbType = configManager.detectDatabaseType(connectionConfig);

    if (dbType !== 'POSTGRES') {
      throw new Error('Schema selection is currently only supported for PostgreSQL databases');
    }

    // Use the PostgreSQL client directly
    const client = new Client({
      connectionString: connectionConfig.url,
      ssl: buildSSLConfig(connectionConfig.sslMode),
    });

    await client.connect();

    // Get all accessible schemas
    const result = await client.query(`
      SELECT 
        schema_name,
        has_schema_privilege(schema_name, 'USAGE') as has_permission
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1')
      ORDER BY schema_name
    `);

    await client.end();
    spinner.stop();

    const currentSchemas = connectionConfig.schemas || ['public'];

    return result.rows.map((row: { schema_name: string; has_permission: boolean }) => ({
      name: row.schema_name,
      selected: currentSchemas.includes(row.schema_name),
      hasPermission: row.has_permission,
    }));
  } catch (error) {
    spinner.fail('Failed to discover schemas');
    throw error;
  }
}

export async function selectSchemas(tag: string): Promise<void> {
  try {
    const availableSchemas = await listAvailableSchemas(tag);

    if (availableSchemas.length === 0) {
      console.log(chalk.yellow('No schemas found in the database.'));
      return;
    }

    console.log(chalk.blue(`\n📋 Available schemas for '${tag}':\n`));

    // Prepare choices for the multiselect prompt
    const choices = availableSchemas
      .filter((schema) => schema.hasPermission) // Only show schemas user has permission to
      .map((schema) => ({
        title: schema.name,
        value: schema.name,
        selected: schema.selected,
      }));

    if (choices.length === 0) {
      console.log(
        chalk.yellow('No accessible schemas found. Please check your database permissions.')
      );
      return;
    }

    const response = await prompts(
      {
        type: 'multiselect',
        name: 'schemas',
        message: 'Select schemas to extract:',
        choices: choices,
        hint: '- Space to select. Return to submit',
        instructions: `
${chalk.dim('Instructions:')}
${chalk.dim('  ↑/↓ to move, space to select/deselect, enter to confirm')}
${chalk.dim('  a to toggle all, i to invert selection')}`,
      },
      {
        onCancel: () => {
          console.log(chalk.yellow('\n👋 Schema selection cancelled.'));
          return false;
        },
      }
    );

    // Check if user cancelled
    if (!response.schemas) {
      return;
    }

    const selectedSchemas = response.schemas;

    if (selectedSchemas.length === 0) {
      console.log(chalk.yellow('No schemas selected. At least one schema is required.'));
      return;
    }

    // Update the connection configuration
    configManager.updateSchemas(tag, selectedSchemas);

    console.log(chalk.green(`\n✓ Updated schemas for '${tag}':`));
    selectedSchemas.forEach((schema: string) => {
      console.log(chalk.green(`  - ${schema}`));
    });
    console.log();
  } catch (error) {
    logger.error(`Failed to select schemas: ${(error as Error).message}`);
    throw error;
  }
}

export async function listConnectionSchemas(tag: string): Promise<void> {
  try {
    const connectionConfig = configManager.get(tag);
    const schemas = connectionConfig.schemas || ['public'];

    console.log(chalk.blue(`\nSchemas for connection '${tag}':\n`));
    schemas.forEach((schema, index) => {
      console.log(chalk.green(`  ${index + 1}. ${schema}`));
    });
    console.log();
  } catch (error) {
    logger.error(`Failed to list schemas: ${(error as Error).message}`);
    throw error;
  }
}

export function showSchemasHelp(): void {
  console.log(chalk.yellow('\nSchemas command usage:'));
  console.log(chalk.cyan('  schiba schemas <tag>           # Interactive schema selection'));
  console.log(chalk.cyan('  schiba schemas <tag> --list    # List current schemas for connection'));

  const connections = configManager.list();
  if (connections.length > 0) {
    console.log(chalk.dim('\nAvailable connections:'));
    connections.forEach(({ tag, isDefault }) => {
      console.log(chalk.dim(`  - ${tag}${isDefault ? ' (default)' : ''}`));
    });
  }

  console.log(chalk.dim('\nExamples:'));
  console.log(chalk.dim('  schiba schemas prod           # Select schemas for prod connection'));
  console.log(chalk.dim('  schiba schemas local --list   # Show current schemas for local'));
  console.log();
}
