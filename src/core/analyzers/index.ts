import { MongoAnalyzer } from './mongodb';
import { PostgresAnalyzer } from './postgres';
import type { DatabaseAnalyzer } from '../types';

export async function createAnalyzer(
  type: string,
  connectionString: string,
  timeout: number
): Promise<DatabaseAnalyzer> {
  switch (type.toUpperCase()) {
    case 'POSTGRES':
      return new PostgresAnalyzer(connectionString, timeout);
    case 'MONGODB':
      return new MongoAnalyzer(connectionString, timeout);
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}
