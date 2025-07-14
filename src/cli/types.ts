export interface FetchOptions {
  filename?: string;
  directory?: string;
  timeout?: number;
  format?: 'raw' | 'markdown';
  verbose?: boolean;
  copy?: boolean;
}

export interface AddOptions {
  noSsl?: boolean;
  default?: boolean;
  description?: string;
}

export interface CommanderError extends Error {
  code?: string;
  exitCode?: number;
  nestedError?: Error;
}
