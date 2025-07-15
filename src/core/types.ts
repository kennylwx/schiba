export interface SchemaStats {
  totalSize: number;
  objectCount: number;
  details: {
    tables?: number;
    columns?: number;
    indexes?: number;
    enums?: number;
    collections?: number;
    fields?: number;
  };
}

export interface SchemaOptions {
  dbString: string;
  filename?: string;
  directory?: string;
  timeout?: number;
  format?: 'raw' | 'markdown';
}

export interface DatabaseAnalyzer {
  analyze(): Promise<{
    schema: string;
    stats: SchemaStats;
  }>;
}

export interface ColumnDefinition {
  column: string;
  type: string;
  nullable: string;
  default: string | null;
  constraints: string[] | null;
}

export interface TableIndex {
  name: string;
  definition: string;
}

export interface TableInfo {
  description?: string;
  columns: ColumnDefinition[];
  indexes: TableIndex[];
}

export interface Schema {
  tables: Record<string, TableInfo>;
  enums?: Record<string, string[]>;
}

// Add connection config types
export interface ConnectionConfig {
  url: string;
  sslMode: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
  description?: string;
  created: string;
  lastUsed?: string;
  tag: string;
}
