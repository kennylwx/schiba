import { MongoClient } from 'mongodb';
import { BaseConnection } from './base';
import type { ConnectionOptions } from './base';
import type { ConnectionConfig } from '../../core/types';

export class MongoConnection extends BaseConnection {
  private client: MongoClient;

  constructor(connectionConfig: ConnectionConfig, options: ConnectionOptions = {}) {
    super(connectionConfig.url, options);
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

  private formatError(error: any): Error {
    const message = error?.message || 'Unknown error';

    if (message.includes('Authentication failed')) {
      return new Error('Authentication failed: Invalid credentials');
    }

    if (message.includes('connection timed out')) {
      return new Error('Connection timed out. Please check your network connection.');
    }

    return error;
  }
}
