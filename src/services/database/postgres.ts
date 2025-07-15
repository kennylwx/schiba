import { Client, type PostgresClient } from '../../utils/pg-client';
import { BaseConnection } from './base';
import type { ConnectionOptions } from './base';
import type { ConnectionConfig } from '../../core/types';
import { buildSSLConfig, appendSSLToConnectionString } from '../../utils/ssl';
import chalk from 'chalk';

export class PostgresConnection extends BaseConnection {
  private client: PostgresClient;
  private connectionConfig: ConnectionConfig;

  constructor(connectionConfig: ConnectionConfig, options: ConnectionOptions = {}) {
    super(connectionConfig.url, options);
    this.connectionConfig = connectionConfig;

    const connStr = appendSSLToConnectionString(connectionConfig.url, connectionConfig.sslMode);

    this.client = new Client({
      connectionString: connStr,
      connectionTimeoutMillis: this.options.timeout,
      ssl: buildSSLConfig(connectionConfig.sslMode),
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
    }
  }

  public async test(): Promise<boolean> {
    try {
      await this.client.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  public getClient(): PostgresClient {
    return this.client;
  }

  private formatError(error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes("does not match certificate's altnames")) {
      return new Error(
        `SSL hostname verification failed.\n` +
          `The host you are connecting to (e.g., 'localhost') does not match the name in the server's SSL certificate.\n` +
          `This is a common issue when using an SSH tunnel or a proxy.\n\n` +
          chalk.yellow(
            'To fix this, change the SSL mode to `verify-ca` to skip hostname verification:'
          ) +
          '\n' +
          `  ${chalk.cyan(`schiba update ${this.connectionConfig.tag} ssl-mode verify-ca`)}\n`
      );
    }

    if (message.includes('ECONNREFUSED')) {
      const url = new URL(this.connectionConfig.url);
      return new Error(
        `Connection Refused: Could not connect to ${chalk.cyan(`${url.hostname}:${url.port}`)}.\n\n` +
          chalk.yellow('Please check the following:') +
          '\n' +
          `  1. The database server is running and accessible.\n` +
          `  2. The host and port in your connection details are correct.\n` +
          `  3. Firewalls or network security groups are not blocking the connection.\n\n` +
          `You can update connection details using ${chalk.cyan('schiba update ...')}`
      );
    }

    if (message.includes('password authentication failed')) {
      return new Error('Authentication failed: Invalid username or password');
    }

    if (message.includes('ECONNREFUSED')) {
      return new Error('Connection refused. Please check if the database server is running.');
    }

    if (message.includes('server does not support SSL')) {
      return new Error(
        `The server does not support SSL connections.\n\n` +
          `To fix this, disable SSL for your connection:\n` +
          `  ${chalk.cyan(`schiba update ${this.connectionConfig.tag} ssl disable`)}\n\n` +
          `Then try again:\n` +
          `  ${chalk.cyan(`schiba fetch ${this.connectionConfig.tag}`)}\n\n` +
          `To see all your connections:\n` +
          `  ${chalk.cyan('schiba list')}`
      );
    }

    return error instanceof Error ? error : new Error(message);
  }
}
