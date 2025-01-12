import { Client, type PostgresClient } from '../../utils/pg-client';
import { BaseConnection } from './base';
import type { ConnectionOptions } from './base';

export class PostgresConnection extends BaseConnection {
  private client: PostgresClient;

  constructor(connectionString: string, options: ConnectionOptions = {}) {
    super(connectionString, options);
    this.client = new Client({
      connectionString: this.connectionString,
      connectionTimeoutMillis: this.options.timeout,
      ssl: this.options.ssl ? { rejectUnauthorized: false } : undefined,
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

  private formatError(error: any): Error {
    const message = error?.message || 'Unknown error';

    if (message.includes('password authentication failed')) {
      return new Error('Authentication failed: Invalid username or password');
    }

    if (message.includes('ECONNREFUSED')) {
      return new Error('Connection refused. Please check if the database server is running.');
    }

    return error;
  }
}
