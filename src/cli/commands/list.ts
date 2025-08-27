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
        schemas = urlSchema
          .split(',')
          .map((s) => s.trim())
          .join(', ');
      }
    }

    switch (dbType.toUpperCase()) {
      case 'POSTGRES':
        return {
          username: urlObj.username,
          password: urlObj.password,
          host: urlObj.hostname,
          port: urlObj.port || '5432',
          database: urlObj.pathname.slice(1),
          schemas: schemas,
        };
      case 'MONGODB':
        return {
          username: urlObj.username,
          password: urlObj.password,
          host: urlObj.hostname,
          port: urlObj.port || '27017',
          database: urlObj.pathname.slice(1) || 'admin',
          schemas: '-', // MongoDB doesn't have schemas like PostgreSQL
        };
      default:
        return {
          username: urlObj.username,
          password: urlObj.password,
          host: urlObj.hostname,
          port: urlObj.port,
          database: urlObj.pathname.slice(1),
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

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

function truncateWithEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
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

    const MAX_HOST_LENGTH = 18; // Define maximum host column width

    const connectionDetails = connections.map(({ tag, connection, isDefault }) => {
      const dbType = configManager.detectDatabaseType(connection) || 'Unknown';
      const details = parseConnectionString(connection.url, dbType, connection.schemas);

      return {
        tag: isDefault ? `${tag} ${chalk.green('*')}` : tag,
        type: dbType,
        username: details.username || '-',
        password: details.password ? (options.showPasswords ? details.password : '***') : '-',
        host: details.host || '-',
        port: details.port || '-',
        database: details.database || '-',
        schemas: details.schemas || '-',
        sslMode: connection.sslMode,
        isDefault,
      };
    });

    // Calculate column widths (conditionally include password)
    const columns = {
      tag: Math.max(3, ...connectionDetails.map((c) => stripAnsi(c.tag).length)),
      type: Math.max(4, ...connectionDetails.map((c) => c.type.length)),
      username: Math.max(8, ...connectionDetails.map((c) => c.username.length)),
      password: options.showPasswords
        ? Math.max(8, ...connectionDetails.map((c) => c.password.length))
        : 0,
      host: Math.min(MAX_HOST_LENGTH, Math.max(4, ...connectionDetails.map((c) => c.host.length))),
      port: Math.max(4, ...connectionDetails.map((c) => c.port.length)),
      database: Math.max(8, ...connectionDetails.map((c) => c.database.length)),
      schemas: Math.max(7, ...connectionDetails.map((c) => c.schemas.length)),
      sslMode: Math.max(8, ...connectionDetails.map((c) => c.sslMode.length)),
    };

    // Build header array conditionally
    const headerItems = [
      'Tag'.padEnd(columns.tag),
      'Type'.padEnd(columns.type),
      'Username'.padEnd(columns.username),
    ];

    if (options.showPasswords) {
      headerItems.push('Password'.padEnd(columns.password));
    }

    headerItems.push(
      'Host'.padEnd(columns.host),
      'Port'.padEnd(columns.port),
      'Database'.padEnd(columns.database),
      'Schemas'.padEnd(columns.schemas),
      'SSL Mode'.padEnd(columns.sslMode)
    );

    const header = headerItems.join(' | ');
    console.log(chalk.bold(header));
    console.log(chalk.dim('-'.repeat(header.length)));

    // Print rows
    connectionDetails.forEach((conn) => {
      const tagPadding = columns.tag + (conn.tag.length - stripAnsi(conn.tag).length);
      const truncatedHost = truncateWithEllipsis(conn.host, MAX_HOST_LENGTH);

      const rowItems = [
        conn.tag.padEnd(tagPadding),
        conn.type.padEnd(columns.type),
        conn.username.padEnd(columns.username),
      ];

      if (options.showPasswords) {
        rowItems.push(conn.password.padEnd(columns.password));
      }

      rowItems.push(
        truncatedHost.padEnd(columns.host),
        conn.port.padEnd(columns.port),
        conn.database.padEnd(columns.database),
        conn.schemas.padEnd(columns.schemas),
        conn.sslMode.padEnd(columns.sslMode)
      );

      const row = rowItems.join(' | ');
      console.log(row);
    });

    if (!options.showPasswords) {
      console.log(
        chalk.dim('\nTip 1: Use --show-passwords to reveal passwords and show Password column')
      );
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
