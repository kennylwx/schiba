import { CONFIG } from '../../config/default';
import { BaseConnection } from './base';
import { PostgresConnection } from './postgres';
import { MongoConnection } from './mongodb';

export function createConnection(
  connectionString: string,
  options: { timeout?: number; ssl?: boolean } = {}
): BaseConnection {
  
  const type = Object.entries(CONFIG.SUPPORTED_DATABASES).find(([_, prefixes]) =>
    prefixes.some(prefix => connectionString.toLowerCase().startsWith(prefix))
  )?.[0];

  switch (type) {
    case 'POSTGRES':
      return new PostgresConnection(connectionString, options);
    case 'MONGODB':
      return new MongoConnection(connectionString, options);
    default:
      throw new Error(`Unsupported database type for connection string: ${connectionString}`);
  }
}

export * from './base';
export * from './postgres';
export * from './mongodb';