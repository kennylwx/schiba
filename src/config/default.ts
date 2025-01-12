export const CONFIG = {
  VERSION: '0.1.0',
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  SUPPORTED_DATABASES: {
    POSTGRES: ['postgresql://', 'postgres://'],
    MONGODB: ['mongodb://', 'mongodb+srv://'],
    MYSQL: ['mysql://', 'mariadb://'],
    MSSQL: ['mssql://', 'sqlserver://'],
    ORACLE: ['oracle://', 'oracledb://'],
  } as const,
  DEFAULT_OUTPUT: {
    RAW: 'schemix-out.txt',
    MARKDOWN: 'schemix-out.md'
  }
};
