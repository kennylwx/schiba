import { CONFIG } from '../../config/default';
import { BaseConnection } from './base';
import { PostgresConnection } from './postgres';
import { MongoConnection } from './mongodb';
import type { ConnectionConfig } from '../../core/types';

export function createConnection(
  connectionConfig: ConnectionConfig,
  options: { timeout?: number } = {}
): BaseConnection {
  const type = Object.entries(CONFIG.SUPPORTED_DATABASES).find(([_, prefixes]) =>
    prefixes.some((prefix) => connectionConfig.url.toLowerCase().startsWith(prefix))
  )?.[0];

  switch (type) {
    case 'POSTGRES':
      return new PostgresConnection(connectionConfig, options);
    case 'MONGODB':
      return new MongoConnection(connectionConfig, options);
    default:
      throw new Error(`Unsupported database type for connection: ${connectionConfig.tag}`);
  }
}

export * from './base';
export * from './postgres';
export * from './mongodb';
