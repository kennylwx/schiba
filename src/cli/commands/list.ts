import chalk from 'chalk';
import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import { configPaths } from '@/config/paths';

interface ConnectionDetails {
  tag: string;
  type: string;
  username: string;
  password: string;
  host: string;
  port: string;
  database: string;
  schema: string;
  ssl: string;
  sslMode: string;
  isDefault: boolean;
}

interface ParsedConnectionDetails {
  username: string;
  password: string;
  host: string;
  port: string;
  database: string;
  schema: string;
}

interface ListOptions {
  showPasswords?: boolean;
}

export async function listConnections(options: ListOptions = {}): Promise<void> {
  try {
    const connections = configManager.list();

    if (connections.length === 0) {
      showListHelp();
      return;
    }

    showConfigLocation();

    // Parse connection details
    const connectionDetails: ConnectionDetails[] = connections.map(
      ({ tag, connection, isDefault }) => {
        const dbType = configManager.detectDatabaseType(connection) || 'Unknown';
        const details = parseConnectionString(connection.url, dbType);

        return {
          tag: isDefault ? `${tag} ${chalk.green('(default)')}` : tag,
          type: dbType,
          username: details.username || '-',
          password:
            options.showPasswords && details.password
              ? details.password
              : details.password
                ? '***'
                : '-',
          host: details.host || '-',
          port: details.port || '-',
          database: details.database || '-',
          schema: details.schema || '-',
          ssl: connection.ssl ? chalk.green('✓') : chalk.red('✗'),
          sslMode: connection.sslMode,
          isDefault,
        };
      }
    );

    // Calculate column widths
    const columns = {
      tag: Math.max(3, ...connectionDetails.map((c) => stripAnsi(c.tag).length)),
      type: Math.max(4, ...connectionDetails.map((c) => c.type.length)),
      username: Math.max(8, ...connectionDetails.map((c) => c.username.length)),
      password: Math.max(8, ...connectionDetails.map((c) => c.password.length)),
      host: Math.max(4, ...connectionDetails.map((c) => c.host.length)),
      port: Math.max(4, ...connectionDetails.map((c) => c.port.length)),
      database: Math.max(8, ...connectionDetails.map((c) => c.database.length)),
      schema: Math.max(6, ...connectionDetails.map((c) => c.schema.length)),
      ssl: 3,
      sslMode: Math.max(8, ...connectionDetails.map((c) => c.sslMode.length)), // "SSL Mode"
    };

    // Print header
    const header = [
      'Tag'.padEnd(columns.tag),
      'Type'.padEnd(columns.type),
      'Username'.padEnd(columns.username),
      'Password'.padEnd(columns.password),
      'Host'.padEnd(columns.host),
      'Port'.padEnd(columns.port),
      'Database'.padEnd(columns.database),
      'Schema'.padEnd(columns.schema),
      'SSL'.padEnd(columns.ssl),
      'SSL Mode'.padEnd(columns.sslMode),
    ].join(' | ');

    console.log(chalk.bold(header));
    console.log(chalk.dim('-'.repeat(header.length)));

    // Print rows
    connectionDetails.forEach((conn) => {
      const tagPadding = columns.tag + (conn.tag.length - stripAnsi(conn.tag).length);

      // FIX: Center the SSL symbol by adding padding to the left and right.
      const sslVisibleWidth = stripAnsi(conn.ssl).length;
      const sslTotalPadding = columns.ssl - sslVisibleWidth;
      const sslLeftPadding = ' '.repeat(Math.floor(sslTotalPadding / 2));
      const sslRightPadding = ' '.repeat(Math.ceil(sslTotalPadding / 2));
      const centeredSsl = `${sslLeftPadding}${conn.ssl}${sslRightPadding}`;

      const row = [
        conn.tag.padEnd(tagPadding),
        conn.type.padEnd(columns.type),
        conn.username.padEnd(columns.username),
        conn.password.padEnd(columns.password),
        conn.host.padEnd(columns.host),
        conn.port.padEnd(columns.port),
        conn.database.padEnd(columns.database),
        conn.schema.padEnd(columns.schema),
        centeredSsl, // Use the new centered string
        conn.sslMode.padEnd(columns.sslMode),
      ].join(' | ');

      console.log(row);
    });

    if (!options.showPasswords) {
      console.log(chalk.dim('\nTip: Use --show-passwords to reveal passwords'));
    }

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
  console.log(chalk.dim('  schiba list          # List all connections'));
  console.log(chalk.dim('  schiba fetch         # Extract schema from default connection'));
  console.log(chalk.dim('  schiba test <tag>    # Test a specific connection\n'));
}

function parseConnectionString(url: string, dbType: string): ParsedConnectionDetails {
  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);

    switch (dbType.toUpperCase()) {
      case 'POSTGRES':
        return {
          username: urlObj.username,
          password: urlObj.password,
          host: urlObj.hostname,
          port: urlObj.port || '5432',
          database: urlObj.pathname.slice(1),
          schema: searchParams.get('schema') || 'public',
        };
      case 'MONGODB':
        return {
          username: urlObj.username,
          password: urlObj.password,
          host: urlObj.hostname,
          port: urlObj.port || '27017',
          database: urlObj.pathname.slice(1) || 'admin',
          schema: '-',
        };
      default:
        return {
          username: urlObj.username,
          password: urlObj.password,
          host: urlObj.hostname,
          port: urlObj.port,
          database: urlObj.pathname.slice(1),
          schema: '-',
        };
    }
  } catch {
    return {
      username: '-',
      password: '-',
      host: '-',
      port: '-',
      database: '-',
      schema: '-',
    };
  }
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

export function showConfigLocation(): void {
  const configPath = configPaths.getConfigPath();
  console.log(chalk.dim(`\nConfiguration loaded from ${configPath}\n`));
}
