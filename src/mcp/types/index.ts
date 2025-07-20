export interface McpServerState {
  pid?: number;
  port: number;
  status: 'running' | 'stopped' | 'error';
  startedAt?: string;
  lastError?: string;
}

export interface McpServerConfig {
  port: number;
  host: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxConnections: number;
}

export interface McpStoredConnection {
  id: string;
  tag: string;
  url: string;
  sslMode: string;
  schemas?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  lastUsed?: string;
}

export interface McpToolResult {
  success: boolean;
  data?: Record<string, unknown> | string | number | boolean | null;
  error?: string;
  timestamp: string;
}

export interface McpOperationLog {
  id: string;
  operation: string;
  connectionTag?: string;
  timestamp: string;
  duration?: number;
  success: boolean;
  error?: string;
}

// Database row types for better type safety
export interface ServerStateRow {
  id: number;
  pid: number | null;
  port: number;
  status: string;
  started_at: string | null;
  last_error: string | null;
  updated_at: string;
}

export interface ConnectionRow {
  id: string;
  tag: string;
  url: string;
  ssl_mode: string;
  schemas: string | null;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  last_used: string | null;
}

export interface OperationLogRow {
  id: string;
  operation: string;
  connection_tag: string | null;
  timestamp: string;
  duration: number | null;
  success: number;
  error: string | null;
}
