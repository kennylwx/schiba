import { Client, type PostgresClient } from '../../utils/pg-client';
import type { SchemaStats, ConnectionConfig } from '../types';
import { buildSSLConfig, appendSSLToConnectionString } from '../../utils/ssl';
import chalk from 'chalk';

export interface PostgresTable {
  columns?: Array<{
    column: string;
    type: string;
    nullable: string;
    default: string | null;
    constraints: string[] | null;
  }>;
  indexes?: Array<{
    name: string;
    definition: string;
  }>;
  description?: string | null;
}

export interface PostgresSchema {
  tables?: Record<string, PostgresTable>;
  enums?: Record<string, string[]>;
}

export class PostgresAnalyzer {
  private client: PostgresClient;
  private connectionConfig: ConnectionConfig;

  constructor(connectionConfig: ConnectionConfig, timeout: number) {
    this.connectionConfig = connectionConfig;
    // Append SSL mode to connection string
    const connStr = appendSSLToConnectionString(connectionConfig.url, connectionConfig.sslMode);

    this.client = new Client({
      connectionString: connStr,
      connectionTimeoutMillis: timeout,
      ssl: buildSSLConfig(connectionConfig.sslMode),
    });
  }

  public async analyze(): Promise<{ schema: string; stats: SchemaStats }> {
    try {
      await this.client.connect();
      const result = await this.extractSchema();
      const stats = this.calculateStats(result);

      return {
        schema: JSON.stringify(result, null, 0),
        stats,
      };
    } catch (error) {
      // Format the error with helpful messages
      throw this.formatError(error);
    } finally {
      await this.client.end();
    }
  }

  private formatError(error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';

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

    if (message.includes('password authentication failed')) {
      return new Error('Authentication failed: Invalid username or password');
    }

    if (message.includes('ECONNREFUSED')) {
      return new Error('Connection refused. Please check if the database server is running.');
    }

    return error instanceof Error ? error : new Error(message);
  }

  private async extractSchema(): Promise<PostgresSchema> {
    const query = `
      WITH table_info AS (
        SELECT 
          c.table_name,
          json_agg(
            json_build_object(
              'column', c.column_name,
              'type', c.data_type,
              'nullable', c.is_nullable,
              'default', c.column_default,
              'constraints', (
                SELECT json_agg(DISTINCT tc.constraint_type)
                FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu 
                  ON tc.constraint_name = ccu.constraint_name
                WHERE ccu.column_name = c.column_name 
                  AND ccu.table_name = c.table_name
              )
            ) ORDER BY c.ordinal_position
          ) as columns,
          obj_description(pgc.oid, 'pg_class') as description
        FROM information_schema.columns c
        JOIN pg_class pgc ON pgc.relname = c.table_name
        WHERE c.table_schema = 'public'
        GROUP BY c.table_name, pgc.oid
      ),
      index_info AS (
        SELECT 
          tablename as table_name,
          json_agg(
            json_build_object(
              'name', indexname,
              'definition', indexdef
            )
          ) as indexes
        FROM pg_indexes
        WHERE schemaname = 'public'
        GROUP BY tablename
      ),
      enum_info AS (
        SELECT 
          t.typname as enum_name,
          json_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        GROUP BY t.typname
      )
      SELECT json_build_object(
        'tables', (SELECT json_object_agg(t.table_name, 
          json_build_object(
            'columns', t.columns,
            'description', t.description,
            'indexes', COALESCE(i.indexes, '[]'::json)
          )
        ) FROM table_info t
        LEFT JOIN index_info i ON t.table_name = i.table_name),
        'enums', (SELECT json_object_agg(enum_name, enum_values) FROM enum_info)
      ) as schema;
    `;

    const result = await this.client.query(query);
    return result.rows[0].schema;
  }

  private calculateStats(schema: PostgresSchema): SchemaStats {
    const tables = Object.keys(schema.tables || {});
    const enums = Object.keys(schema.enums || {});

    const totalColumns = tables.reduce(
      (acc, table) => acc + (schema.tables?.[table].columns?.length || 0),
      0
    );

    const totalIndexes = tables.reduce(
      (acc, table) => acc + (schema.tables?.[table].indexes?.length || 0),
      0
    );

    return {
      totalSize: JSON.stringify(schema).length,
      objectCount: tables.length,
      details: {
        tables: tables.length,
        columns: totalColumns,
        indexes: totalIndexes,
        enums: enums.length,
      },
    };
  }
}
