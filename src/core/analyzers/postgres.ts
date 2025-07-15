import { Client, type PostgresClient } from '../../utils/pg-client';
import type { SchemaStats, ConnectionConfig } from '../types';
import { buildSSLConfig } from '../../utils/ssl';
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
  schemas?: Record<
    string,
    {
      tables?: Record<string, PostgresTable>;
      enums?: Record<string, string[]>;
    }
  >;
}

export class PostgresAnalyzer {
  private client: PostgresClient;
  private connectionConfig: ConnectionConfig;

  constructor(connectionConfig: ConnectionConfig, timeout: number) {
    this.connectionConfig = connectionConfig;

    this.client = new Client({
      connectionString: connectionConfig.url,
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
      throw this.formatError(error);
    } finally {
      await this.client.end();
    }
  }

  private formatError(error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('This RDS Proxy requires TLS connections')) {
      return new Error(
        `The database requires a secure SSL/TLS connection, but the current setting is likely 'disable'.\n\n` +
          chalk.yellow('To fix this, enable SSL by changing the SSL mode:') +
          '\n' +
          `  ${chalk.cyan(`schiba update ${this.connectionConfig.tag} ssl-mode require`)}\n\n` +
          `Then, try the command again.`
      );
    }

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

    if (message.includes('server does not support SSL')) {
      return new Error(
        `The server does not support SSL connections.\n\n` +
          `To fix this, disable SSL for your connection:\n` +
          `  ${chalk.cyan(`schiba update ${this.connectionConfig.tag} ssl-mode disable`)}\n\n` +
          `Then try again:\n` +
          `  ${chalk.cyan(`schiba fetch ${this.connectionConfig.tag}`)}\n\n` +
          `To see all your connections:\n` +
          `  ${chalk.cyan('schiba list')}`
      );
    }

    if (message.includes('password authentication failed')) {
      return new Error('Authentication failed: Invalid username or password');
    }

    return error instanceof Error ? error : new Error(message);
  }

  private async extractSchema(): Promise<PostgresSchema> {
    const schemasToExtract = this.connectionConfig.schemas || ['public'];
    const schemaList = schemasToExtract.map((s: string) => `'${s}'`).join(',');

    const query = `
      WITH table_info AS (
        SELECT 
          c.table_schema,
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
                  AND ccu.table_schema = c.table_schema
              )
            ) ORDER BY c.ordinal_position
          ) as columns,
          obj_description(pgc.oid, 'pg_class') as description
        FROM information_schema.columns c
        JOIN pg_class pgc ON pgc.relname = c.table_name
        JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = c.table_schema
        WHERE c.table_schema IN (${schemaList})
        GROUP BY c.table_schema, c.table_name, pgc.oid
      ),
      index_info AS (
        SELECT 
          schemaname as table_schema,
          tablename as table_name,
          json_agg(
            json_build_object(
              'name', indexname,
              'definition', indexdef
            )
          ) as indexes
        FROM pg_indexes
        WHERE schemaname IN (${schemaList})
        GROUP BY schemaname, tablename
      ),
      enum_info AS (
        SELECT 
          n.nspname as schema_name,
          t.typname as enum_name,
          json_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname IN (${schemaList})
        GROUP BY n.nspname, t.typname
      )
      SELECT json_build_object(
        'schemas', (
          SELECT json_object_agg(
            schema_name,
            json_build_object(
              'tables', schema_tables,
              'enums', schema_enums
            )
          )
          FROM (
            SELECT 
              t.table_schema as schema_name,
              json_object_agg(t.table_name, 
                json_build_object(
                  'columns', t.columns,
                  'description', t.description,
                  'indexes', COALESCE(i.indexes, '[]'::json)
                )
              ) as schema_tables,
              (
                SELECT json_object_agg(enum_name, enum_values) 
                FROM enum_info e 
                WHERE e.schema_name = t.table_schema
              ) as schema_enums
            FROM table_info t
            LEFT JOIN index_info i ON t.table_name = i.table_name AND t.table_schema = i.table_schema
            GROUP BY t.table_schema
          ) schemas_data
        )
      ) as schema;
    `;

    const result = await this.client.query(query);
    return result.rows[0].schema;
  }

  private calculateStats(schema: PostgresSchema): SchemaStats {
    let totalTables = 0;
    let totalColumns = 0;
    let totalIndexes = 0;
    let totalEnums = 0;

    if (schema.schemas) {
      Object.values(schema.schemas).forEach((schemaData) => {
        if (schemaData.tables) {
          const tables = Object.keys(schemaData.tables);
          totalTables += tables.length;

          tables.forEach((tableName) => {
            const table = schemaData.tables![tableName];
            totalColumns += table.columns?.length || 0;
            totalIndexes += table.indexes?.length || 0;
          });
        }

        if (schemaData.enums) {
          totalEnums += Object.keys(schemaData.enums).length;
        }
      });
    }

    return {
      totalSize: JSON.stringify(schema).length,
      objectCount: totalTables,
      details: {
        tables: totalTables,
        columns: totalColumns,
        indexes: totalIndexes,
        enums: totalEnums,
      },
    };
  }
}
