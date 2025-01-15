import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json and get version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

export const CONFIG = {
  VERSION: packageJson.version,
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  SUPPORTED_DATABASES: {
    POSTGRES: ['postgresql://', 'postgres://'],
    MONGODB: ['mongodb://', 'mongodb+srv://'],
    MYSQL: ['mysql://', 'mariadb://'],
    MSSQL: ['mssql://', 'sqlserver://'],
    ORACLE: ['oracle://', 'oracledb://'],
  } as const,
  DEFAULT_OUTPUT: {
    RAW: 'schiba-out.txt',
    MARKDOWN: 'schiba-out.md',
  },
} as const;
