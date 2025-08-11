import chalk from 'chalk';
import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import { configPaths } from '@/config/paths';

interface ListOptions {
  showPasswords?: boolean;
}

interface ParsedConnectionDetails {
  username: string;
  password: string;
  host: string;
  port: string;
  database: string;
  schemas: string; // Changed from 'schema' to 'schemas'
}

function parseConnectionString(
  url: string,
  dbType: string,
  configSchemas?: string[]
): ParsedConnectionDetails {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);

    // Handle schemas - prioritize config schemas over URL schema
    let schemas = 'public'; // default
    if (configSchemas && configSchemas.length > 0) {
      schemas = configSchemas.join(', ');
    } else {
      const urlSchema = searchParams.get('schema');
      if (urlSchema) {
        schemas = urlSchema;
      }
    }

    // Decode password to handle URL encoding
    const password = urlObj.password ? decodeURIComponent(urlObj.password) : '';

    switch (dbType.toUpperCase()) {
      case 'POSTGRES':
        return {
          username: urlObj.username || '-',
          password: password,
          host: urlObj.hostname || '-',
          port: urlObj.port || '5432',
          database: urlObj.pathname.slice(1) || '-',
          schemas: schemas,
        };
      case 'MONGODB':
        return {
          username: urlObj.username || '-',
          password: password,
          host: urlObj.hostname || '-',
          port: urlObj.port || '27017',
          database: urlObj.pathname.slice(1) || 'admin',
          schemas: '-', // MongoDB doesn't have schemas like PostgreSQL
        };
      default:
        return {
          username: urlObj.username || '-',
          password: password,
          host: urlObj.hostname || '-',
          port: urlObj.port || '-',
          database: urlObj.pathname.slice(1) || '-',
          schemas: schemas,
        };
    }
  } catch {
    return {
      username: '-',
      password: '-',
      host: '-',
      port: '-',
      database: '-',
      schemas: '-',
    };
  }
}

export function showConfigLocation(): void {
  const configPath = configPaths.getConfigPath();
  console.log(chalk.dim(`Configuration loaded from ${configPath}\n`));
}

export async function listConnections(options: ListOptions = {}): Promise<void> {
  try {
    const connections = configManager.list();

    if (connections.length === 0) {
      showListHelp();
      return;
    }

    showConfigLocation();

    const connectionDetails = connections.map(({ tag, connection, isDefault }) => {
      const dbType = configManager.detectDatabaseType(connection) || 'Unknown';
      const details = parseConnectionString(connection.url, dbType, connection.schemas);

      return {
        tag,
        type: dbType,
        username: details.username || '-',
        password: details.password || '',
        host: details.host || '-',
        port: details.port || '-',
        database: details.database || '-',
        schemas: details.schemas || '-',
        sslMode: connection.sslMode || 'prefer',
        isDefault,
      };
    });

    // Calculate label width for alignment
    const labelWidth = options.showPasswords ? 9 : 9; // "Password:" is longest

    // Print each connection in card format
    connectionDetails.forEach((conn, index) => {
      // Build the tag display with default indicator
      let tagDisplay = conn.tag;
      if (conn.isDefault) {
        tagDisplay = chalk.bold.cyan(`${conn.tag} (default)`);
      }

      // Connection header without type in brackets
      console.log(tagDisplay);

      // Connection details with aligned labels
      const indent = '    ';
      console.log(`${indent}${'Type:'.padEnd(labelWidth)} ${conn.type}`);
      console.log(`${indent}${'Host:'.padEnd(labelWidth)} ${conn.host}:${conn.port}`);
      console.log(`${indent}${'Database:'.padEnd(labelWidth)} ${conn.database}`);
      console.log(`${indent}${'User:'.padEnd(labelWidth)} ${conn.username}`);

      // Password display logic
      if (conn.password) {
        if (options.showPasswords) {
          console.log(`${indent}${'Password:'.padEnd(labelWidth)} ${conn.password}`);
        } else {
          console.log(`${indent}${'Password:'.padEnd(labelWidth)} ***`);
        }
      } else if (options.showPasswords) {
        console.log(`${indent}${'Password:'.padEnd(labelWidth)} (no password)`);
      }

      // Schemas (only for non-MongoDB)
      if (conn.type !== 'MONGODB' && conn.schemas !== '-') {
        console.log(`${indent}${'Schemas:'.padEnd(labelWidth)} ${conn.schemas}`);
      }

      console.log(`${indent}${'SSL:'.padEnd(labelWidth)} ${conn.sslMode}`);

      // Add spacing between connections except for the last one
      if (index < connectionDetails.length - 1) {
        console.log();
      }
    });

    // Footer with summary and tips
    console.log('\n' + chalk.dim('─'.repeat(50)));
    const defaultCount = connectionDetails.filter((c) => c.isDefault).length;
    const summaryText =
      defaultCount > 0
        ? `${connections.length} connections configured`
        : `${connections.length} connections configured`;
    console.log(summaryText);

    if (!options.showPasswords) {
      console.log(chalk.dim('Tip 1: Use --show-passwords to reveal passwords'));
    }
    console.log(
      chalk.dim('Tip 2: Use "schiba schemas <tag>" to configure schemas for a connection')
    );
    console.log();
  } catch (error) {
    logger.error(`Failed to list connections: ${(error as Error).message}`);
    throw error;
  }
}

export function showListHelp(): void {
  console.log(chalk.yellow('\nNo connections configured yet.'));
  console.log(chalk.cyan('\nTo get started, add a connection:'));
  console.log(chalk.cyan('  schiba add <tag> <connection-string>'));

  console.log(chalk.dim('\nConnection string formats:'));
  console.log(chalk.dim('  PostgreSQL: postgresql://user:pass@host:port/database'));
  console.log(chalk.dim('  MongoDB:    mongodb://user:pass@host:port/database'));

  console.log(chalk.dim('\nExamples:'));
  console.log(chalk.dim('  schiba add local "postgresql://localhost:5432/mydb" --no-ssl'));
  console.log(chalk.dim('  schiba add prod "postgresql://user:pass@host:5432/db" --default'));
  console.log(chalk.dim('  schiba add staging "mongodb://localhost:27017/mydb"'));

  console.log(chalk.dim('\nAfter adding connections, you can:'));
  console.log(chalk.dim('  schiba list              # List all connections'));
  console.log(chalk.dim('  schiba schemas <tag>     # Configure schemas for a connection'));
  console.log(chalk.dim('  schiba fetch             # Extract schema from default connection'));
  console.log(chalk.dim('  schiba test <tag>        # Test a specific connection\n'));
}
