import { MongoClient } from 'mongodb';
import { BaseConnection } from './base';
import type { ConnectionOptions } from './base';
import type { ConnectionConfig } from '../../core/types';
import chalk from 'chalk';

export class MongoConnection extends BaseConnection {
  private client: MongoClient;
  private connectionConfig: ConnectionConfig;

  constructor(connectionConfig: ConnectionConfig, options: ConnectionOptions = {}) {
    super(connectionConfig.url, options);
    this.connectionConfig = connectionConfig;
    this.client = new MongoClient(connectionConfig.url, {
      serverSelectionTimeoutMS: this.options.timeout,
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
      await this.client.close();
      this.connected = false;
    }
  }

  public async test(): Promise<boolean> {
    try {
      await this.client.db().command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  public getClient(): MongoClient {
    return this.client;
  }

  private formatError(error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Authentication failed')) {
      return new Error('Authentication failed: Invalid credentials');
    }

    if (message.includes('connection timed out')) {
      return new Error('Connection timed out. Please check your network connection.');
    }

    // Add SSL-related error handling for MongoDB
    if (message.includes('SSL') || message.includes('TLS')) {
      return new Error(
        `SSL/TLS connection error.\n\n` +
          `To fix this, try disabling SSL:\n` +
          `  ${chalk.cyan(`schiba update ${this.connectionConfig.tag} ssl disable`)}\n\n` +
          `Or enable SSL if required:\n` +
          `  ${chalk.cyan(`schiba update ${this.connectionConfig.tag} ssl enable`)}\n\n` +
          `Then test your connection:\n` +
          `  ${chalk.cyan(`schiba test ${this.connectionConfig.tag}`)}`
      );
    }

    return error instanceof Error ? error : new Error(message);
  }
}
