export interface CLIOptions {
  filename?: string;
  directory?: string;
  timeout?: number;
  format?: 'raw' | 'markdown';
  verbose?: boolean;
  copy?: boolean;
}

export interface CommanderError extends Error {
  code?: string;
  exitCode?: number;
  nestedError?: Error;
}
