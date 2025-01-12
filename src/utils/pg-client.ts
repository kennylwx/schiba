import type { Client as PgClient } from 'pg';
import pkg from 'pg';

const { Client } = pkg;

// Export the constructor
export { Client };
// Export the type with a different name
export type PostgresClient = PgClient;
