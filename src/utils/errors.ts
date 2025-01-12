interface ErrorDetails {
  code?: string;
  message?: string;
  stack?: string;
  [key: string]: unknown;
}

export class SchemixError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'SchemixError';
  }
}

export class ConnectionError extends SchemixError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

export class ValidationError extends SchemixError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class SchemaExtractionError extends SchemixError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'SCHEMA_EXTRACTION_ERROR', details);
    this.name = 'SchemaExtractionError';
  }
}
