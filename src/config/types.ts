export interface ConnectionConfig {
  url: string;
  ssl: boolean;
  sslMode: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
  description?: string;
  created: string;
  updatedAt?: string;
  lastUsed?: string;
}

export interface ConfigFile {
  version: string;
  default?: string;
  connections: Record<string, ConnectionConfig>;
  preferences?: {
    format?: 'raw' | 'markdown';
    timeout?: number;
    copy?: boolean;
  };
}

export interface ConfigOptions {
  global?: boolean;
}
