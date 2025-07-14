import { Client, type PostgresClient } from '../../utils/pg-client';
import { BaseConnection } from './base';
import type { ConnectionOptions } from './base';
import type { ConnectionConfig } from '../../core/types';
import { buildSSLConfig, appendSSLToConnectionString } from '../../utils/ssl';

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

    if (message.includes('password authentication failed')) {
      return new Error('Authentication failed: Invalid username or password');
    }

    if (message.includes('ECONNREFUSED')) {
      return new Error('Connection refused. Please check if the database server is running.');
    }

    if (message.includes('server does not support SSL')) {
      return new Error(
        'The server does not support SSL connections. Use --no-ssl flag when adding the connection.'
      );
    }

    return error instanceof Error ? error : new Error(message);
  }
}
