interface ErrorDetails {
  code?: string;
  message?: string;
  stack?: string;
  [key: string]: unknown;
}

export class SchibaError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'SchibaError';
  }
}

export class ConnectionError extends SchibaError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

export class ValidationError extends SchibaError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class SchemaExtractionError extends SchibaError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'SCHEMA_EXTRACTION_ERROR', details);
    this.name = 'SchemaExtractionError';
  }
}

// Add configuration-related errors
export class ConfigError extends SchibaError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class NoConnectionError extends ConfigError {
  constructor(message: string = 'No connections configured', details?: ErrorDetails) {
    super(message, details);
    this.name = 'NoConnectionError';
  }
}

export class ConnectionNotFoundError extends ConfigError {
  constructor(tag: string, details?: ErrorDetails) {
    super(`Connection '${tag}' not found`, details);
    this.name = 'ConnectionNotFoundError';
  }
}
