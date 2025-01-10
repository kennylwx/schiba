#!/usr/bin/env node

import { program } from 'commander';
import pg from 'pg';
import { MongoClient } from 'mongodb';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';

const { Client } = pg;

// Constants
const VERSION = '0.1.0';
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const SUPPORTED_DATABASES = {
  POSTGRES: ['postgresql://', 'postgres://'],
  MONGODB: ['mongodb://', 'mongodb+srv://'],
  MYSQL: ['mysql://', 'mariadb://'],
  MSSQL: ['mssql://', 'sqlserver://'],
  ORACLE: ['oracle://', 'oracledb://'],
} as const;


interface CommanderError extends Error {
  code?: string;
  exitCode?: number;
  nestedError?: Error;
}

interface SchemaOptions {
  dbString: string;
  filename?: string;
  directory?: string;
  timeout?: number;
}

function printHeader() {
  console.log(chalk.blue(`📦 schemix v${VERSION}`));
  console.log('Extract database schemas in a compact format for AI context windows\n');
}

function detectDatabaseType(connectionString: string): string | null {
  for (const [dbType, prefixes] of Object.entries(SUPPORTED_DATABASES)) {
    if (prefixes.some(prefix => connectionString.toLowerCase().startsWith(prefix))) {
      return dbType;
    }
  }
  return null;
}

function formatError(error: unknown, dbType: string | null): string {
  const baseError = error instanceof Error ? error.message : String(error);
  
  // PostgreSQL specific errors
  if (baseError.includes('password authentication failed')) {
    return 'Authentication failed: Invalid username or password';
  }
  
  if (baseError.includes('ECONNREFUSED')) {
    return `Could not connect to ${dbType || 'database'} server. Please check:\n` +
           chalk.yellow('1. The server is running\n') +
           chalk.yellow('2. The connection string is correct\n') +
           chalk.yellow('3. The port is accessible\n') +
           chalk.yellow('4. Network/firewall settings allow the connection');
  }
  
  if (baseError.includes('authentication failed')) {
    return `Authentication failed. Please verify:\n` +
           chalk.yellow('1. Username is correct\n') +
           chalk.yellow('2. Password is correct\n') +
           chalk.yellow('3. User has necessary permissions');
  }
  
  if (baseError.includes('timeout')) {
    return `Connection timed out after ${CONNECTION_TIMEOUT/1000} seconds.\n` +
           'Please check your network connection and try again.';
  }
  
  return `Database error: ${baseError}`;
}

async function getPostgresSchema(connectionString: string): Promise<string> {
  const client = new Client({ 
    connectionString,
    connectionTimeoutMillis: CONNECTION_TIMEOUT,
    ssl: connectionString.includes('?sslmode=require') ? { rejectUnauthorized: false } : undefined
  });
  
  const spinner = ora('Connecting to PostgreSQL database...').start();
  
  try {
    await client.connect();
    spinner.text = 'Extracting schema information...';

    // Get tables, columns, and constraints
    const tablesResult = await client.query(`
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
      SELECT 
        json_build_object(
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
    `);

    spinner.succeed('Schema extracted successfully');
    return JSON.stringify(tablesResult.rows[0].schema, null, 0);
  } finally {
    await client.end();
  }
}

async function getMongoSchema(connectionString: string): Promise<string> {
  const client = new MongoClient(connectionString, {
    serverSelectionTimeoutMS: CONNECTION_TIMEOUT
  });
  
  const spinner = ora('Connecting to MongoDB database...').start();
  
  try {
    await client.connect();
    spinner.text = 'Analyzing collections...';
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    const schemas = [];
    
    for (const collection of collections) {
      spinner.text = `Analyzing collection: ${collection.name}...`;
      const sample = await db.collection(collection.name)
        .aggregate([{ $sample: { size: 5 } }])
        .toArray();
        
      if (sample.length > 0) {
        const schema = {
          collection: collection.name,
          fields: Array.from(new Set(sample.flatMap(doc => Object.keys(doc)))),
          types: Object.fromEntries(
            Object.keys(sample[0]).map(key => [
              key,
              sample.map(doc => typeof doc[key]).filter((v, i, a) => a.indexOf(v) === i)
            ])
          ),
          indexes: await db.collection(collection.name).indexes(),
          sampleData: sample[0]
        };
        schemas.push(schema);
      }
    }
    
    spinner.succeed('Schema extracted successfully');
    return JSON.stringify(schemas, null, 0);
  } finally {
    await client.close();
  }
}

async function writeSchemaToFile(schema: string, options: SchemaOptions): Promise<string> {
  const directory = options.directory || process.cwd();
  const filename = options.filename || 'schemix-out.txt';
  const fullPath = path.join(directory, filename);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(fullPath, schema, 'utf8');
  
  return fullPath;
}

// Helper to clean and validate connection string
function sanitizeConnectionString(str: string): string {
  // Remove surrounding quotes if they exist
  str = str.replace(/^["'](.+)["']$/, '$1');
  
  try {
    // Special handling for query parameters
    const [baseUrl, ...queryParts] = str.split('?');
    const query = queryParts.join('?'); // Rejoin in case there are multiple question marks
    
    // Parse the base URL
    const urlObj = new URL(baseUrl);
    
    // Handle special characters in password
    if (urlObj.password) {
      urlObj.password = encodeURIComponent(decodeURIComponent(urlObj.password));
    }
    
    // Reattach query parameters if they exist
    if (query) {
      return `${urlObj.toString()}?${query}`;
    }
    
    return urlObj.toString();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw new Error('Invalid connection string format');
    }
    throw error;
  }
}

async function main(options: SchemaOptions) {
  try {
    printHeader();
    
    const dbType = detectDatabaseType(options.dbString);
    if (!dbType) {
      console.error(chalk.red('Error: Unsupported database type'));
      console.log('\nSupported database connection strings:');
      Object.entries(SUPPORTED_DATABASES).forEach(([db, prefixes]) => {
        console.log(`  ${chalk.green(db)}: ${prefixes.join(', ')}`);
      });
      process.exit(1);
    }
    
    console.log(`Database type: ${chalk.green(dbType)}`);
    
    const startTime = Date.now();
    let schema: string;

    if (SUPPORTED_DATABASES.MONGODB.some(prefix => options.dbString.startsWith(prefix))) {
      schema = await getMongoSchema(options.dbString);
    } else if (SUPPORTED_DATABASES.POSTGRES.some(prefix => options.dbString.startsWith(prefix))) {
      schema = await getPostgresSchema(options.dbString);
    } else {
      throw new Error(`${dbType} support is coming soon!`);
    }

    const outputPath = await writeSchemaToFile(schema, options);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(chalk.blue('\n📊 Summary:'));
    console.log(`Database: ${dbType}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Output: ${outputPath}`);
    console.log(`Size: ${(schema.length / 1024).toFixed(2)} KB`);
    console.log(chalk.green('\n🎉 All Done!'));

  } catch (error) {
    const dbType = detectDatabaseType(options.dbString);
    const errorMessage = formatError(error, dbType);
    console.error(chalk.red('\nError:'), errorMessage);
    process.exit(1);
  }
}


// CLI setup with error handling
program
  .name('schemix')
  .description(
    'schemix - Extract and compact database schemas for AI context windows\n\n' +
    'Example usage:\n' +
    '  $ schemix "postgresql://user:password@localhost:5432/dbname"\n' +
    '  $ schemix "mongodb://user:password@localhost:27017/dbname"\n\n' +
    'Supported databases:\n' +
    '  - PostgreSQL (postgresql://, postgres://)\n' +
    '  - MongoDB (mongodb://, mongodb+srv://)\n' +
    '  - MySQL (coming soon)\n' +
    '  - MSSQL (coming soon)\n' +
    '  - Oracle (coming soon)'
  )
  .version(VERSION, '-v, --version', 'Output the current version')
  .argument('<db-string>', 'Database connection string (must be wrapped in quotes)')
  .option('-f, --filename <name>', 'Output filename (default: schemix-out.txt)')
  .option('-d, --directory <path>', 'Output directory (default: current directory)')
  .option('-t, --timeout <ms>', 'Connection timeout in milliseconds (default: 10000)')
  .addHelpText('after', '\n' + chalk.yellow('Important:') + 
    ' Connection string must be wrapped in quotes:\n' +
    '  $ schemix "postgresql://user:pass@localhost:5432/db"\n' +
    '  $ schemix "postgresql://user:pass@localhost:5432/db?schema=public"\n')
  .configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stdout.write(str),
    // Capture commander output without throwing errors
    outputError: (str, write) => write(str)
  })
  .action((dbString, options) => {
    try {
      // Skip action for help and version
      if (program.opts().help || program.opts().version) {
        return;
      }

      const sanitizedDbString = sanitizeConnectionString(dbString);
      main({
        dbString: sanitizedDbString,
        filename: options.filename,
        directory: options.directory,
        timeout: options.timeout ? parseInt(options.timeout) : CONNECTION_TIMEOUT
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (err instanceof Error && errorMessage.includes('Invalid URL')) {
        console.error(chalk.red('\nError: Invalid connection string format'));
        console.log('\nCorrect formats:');
        console.log('  $ schemix "postgresql://user:password@localhost:5432/dbname"');
        console.log('  $ schemix "mongodb://user:password@localhost:27017/dbname"\n');
      } else {
        console.error(chalk.red('\nError:'), errorMessage);
      }
      process.exit(1);
    }
  });

  process.on('uncaughtException', (err: Error) => {
    // Cast to CommanderError to access the code property
    const commanderErr = err as CommanderError;
    if (commanderErr.code === 'commander.helpDisplayed' || commanderErr.code === 'commander.version') {
      process.exit(0);
    }
    console.error(chalk.red('Error:'), err.message);
    process.exit(1);
  });

program.parse();