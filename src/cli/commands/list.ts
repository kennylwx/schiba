import chalk from 'chalk';
import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import { EMOJI_MAP } from '../../utils/constants';

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
  created: string;
  updated: string;
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

    // Parse connection details
    const connectionDetails: ConnectionDetails[] = connections.map(
      ({ tag, connection, isDefault }) => {
        const dbType = configManager.detectDatabaseType(connection) || 'Unknown';
        const details = parseConnectionString(connection.url, dbType);

        return {
          tag: isDefault ? `${tag} ${chalk.green('(default)')}` : tag,
          type: dbType,
          username: details.username || '-',
          password: details.password ? '***' : '-',
          host: details.host || '-',
          port: details.port || '-',
          database: details.database || '-',
          schema: details.schema || '-',
          ssl: connection.ssl ? chalk.green('✓') : chalk.red('✗'),
          created: formatDate(connection.created),
          updated: connection.updatedAt ? formatDate(connection.updatedAt) : '-',
          isDefault,
        };
      }
    );

    // Calculate column widths
    const columns = {
      tag: Math.max(3, ...connectionDetails.map((c) => stripAnsi(c.tag).length)),
      type: Math.max(4, ...connectionDetails.map((c) => c.type.length)),
      username: Math.max(8, ...connectionDetails.map((c) => c.username.length)),
      password: 8,
      host: Math.max(4, ...connectionDetails.map((c) => c.host.length)),
      port: Math.max(4, ...connectionDetails.map((c) => c.port.length)),
      database: Math.max(8, ...connectionDetails.map((c) => c.database.length)),
      schema: Math.max(6, ...connectionDetails.map((c) => c.schema.length)),
      ssl: 3,
      created: Math.max(7, ...connectionDetails.map((c) => c.created.length)),
      updated: Math.max(7, ...connectionDetails.map((c) => c.updated.length)),
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
      'SSL',
      'Created'.padEnd(columns.created),
      'Updated'.padEnd(columns.updated),
    ].join(' | ');

    console.log(chalk.bold(header));
    console.log(chalk.dim('-'.repeat(header.length + 20)));

    // Print rows
    connectionDetails.forEach((conn) => {
      const row = [
        conn.tag.padEnd(columns.tag + (conn.isDefault ? 10 : 0)), // Extra space for (default)
        conn.type.padEnd(columns.type),
        conn.username.padEnd(columns.username),
        conn.password.padEnd(columns.password),
        conn.host.padEnd(columns.host),
        conn.port.padEnd(columns.port),
        conn.database.padEnd(columns.database),
        conn.schema.padEnd(columns.schema),
        conn.ssl,
        conn.created.padEnd(columns.created),
        conn.updated.padEnd(columns.updated),
      ].join(' | ');

      console.log(row);
    });

    console.log();
  } catch (error) {
    logger.error(`Failed to list connections: ${(error as Error).message}`);
    throw error;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
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
