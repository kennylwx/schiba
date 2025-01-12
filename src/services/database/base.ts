export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  test(): Promise<boolean>;
}

export interface ConnectionOptions {
  timeout?: number;
  ssl?: boolean;
  schema?: string;
}

export abstract class BaseConnection implements DatabaseConnection {
  protected connected: boolean = false;
  protected connectionString: string;
  protected options: ConnectionOptions;

  constructor(connectionString: string, options: ConnectionOptions = {}) {
    this.connectionString = connectionString;
    this.options = {
      timeout: options.timeout || 10000,
      ssl: options.ssl || false,
      schema: options.schema || 'public'
    };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  
  public isConnected(): boolean {
    return this.connected;
  }

  abstract test(): Promise<boolean>;
}
