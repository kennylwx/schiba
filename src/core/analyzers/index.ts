import { MongoAnalyzer } from './mongodb';
import { PostgresAnalyzer } from './postgres';
import type { DatabaseAnalyzer, ConnectionConfig } from '../types';

export async function createAnalyzer(
  type: string,
  connectionConfig: ConnectionConfig,
  timeout: number
): Promise<DatabaseAnalyzer> {
  switch (type.toUpperCase()) {
    case 'POSTGRES':
      return new PostgresAnalyzer(connectionConfig, timeout);
    case 'MONGODB':
      return new MongoAnalyzer(connectionConfig, timeout);
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}
