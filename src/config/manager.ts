import { configPaths } from './paths';
import { ConfigStorage } from './storage';
import { ConfigValidator } from './validator';
import type { ConfigFile, ConnectionConfig } from './types';
import { CONFIG } from '../config/default';
import { logger } from '../utils/logger';
import { detectDatabaseType } from '../utils/helpers';
import { parseEnvVariables } from '../utils/env';

export class ConfigManager {
  private static instance: ConfigManager;
  private storage: ConfigStorage;
  private config: ConfigFile | null = null;

  private constructor() {
    this.storage = new ConfigStorage(configPaths.getConfigPath());
    this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): void {
    this.config = this.storage.read();
  }

  private saveConfig(): void {
    if (!this.config) {
      throw new Error('No config to save');
    }
    ConfigValidator.validateConfigFile(this.config);
    this.storage.write(this.config);
  }

  private ensureConfig(): void {
    if (!this.config) {
      this.config = {
        version: CONFIG.CONFIG_VERSION,
        connections: {},
        preferences: CONFIG.DEFAULT_PREFERENCES,
      };
      this.storage.ensureDirectory();
    }
  }

  public exists(): boolean {
    return this.storage.exists();
  }

  public add(
    tag: string,
    connectionString: string,
    options: { ssl?: boolean; default?: boolean; description?: string } = {}
  ): void {
    this.ensureConfig();

    if (this.config!.connections[tag]) {
      throw new Error(`Connection '${tag}' already exists`);
    }

    const isFirstConnection = Object.keys(this.config!.connections).length === 0;

    // The --no-ssl flag sets options.ssl to false.
    // If it's not present, options.ssl is true or undefined.
    const sslDisabled = options.ssl === false;

    const connection: ConnectionConfig = {
      url: connectionString,
      sslMode: sslDisabled ? 'disable' : 'prefer', // Use 'prefer' as a safe default
      description: options.description,
      created: new Date().toISOString(),
    };

    ConfigValidator.validateConnectionConfig(connection);
    this.config!.connections[tag] = connection;

    if (isFirstConnection || options.default) {
      this.config!.default = tag;
    }

    this.saveConfig();
    logger.success(`Added connection '${tag}'${this.config!.default === tag ? ' (default)' : ''}`);
  }

  public update(tag: string, property: string, value: string): void {
    if (!this.config) {
      throw new Error('No connections configured');
    }

    if (!this.config.connections[tag]) {
      throw new Error(`Connection '${tag}' not found`);
    }

    const connection = this.config.connections[tag];
    const url = new URL(connection.url);

    switch (property) {
      // The 'ssl' case has been removed entirely.
      case 'ssl-mode': {
        const validSSLModes = ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'];
        if (!validSSLModes.includes(value)) {
          throw new Error(`Invalid SSL mode. Use one of: ${validSSLModes.join(', ')}`);
        }
        connection.sslMode = value as ConnectionConfig['sslMode'];
        break;
      }

      case 'username':
        url.username = value;
        connection.url = url.toString();
        break;

      case 'password':
        url.password = value;
        connection.url = url.toString();
        break;

      case 'host':
        url.hostname = value;
        connection.url = url.toString();
        break;

      case 'port':
        url.port = value;
        connection.url = url.toString();
        break;

      case 'database': {
        const pathParts = url.pathname.split('/');
        pathParts[1] = value;
        url.pathname = pathParts.join('/');
        connection.url = url.toString();
        break;
      }

      case 'schema': {
        const searchParams = new URLSearchParams(url.search);
        searchParams.set('schema', value);
        url.search = searchParams.toString();
        connection.url = url.toString();
        break;
      }

      default:
        throw new Error(`Unknown property: ${property}`);
    }

    connection.updatedAt = new Date().toISOString();

    ConfigValidator.validateConnectionConfig(connection);
    this.saveConfig();
    logger.success(`Updated '${property}' for connection '${tag}'`);
  }

  public remove(tag: string): void {
    if (!this.config) {
      throw new Error('No connections configured');
    }

    if (!this.config.connections[tag]) {
      throw new Error(`Connection '${tag}' not found`);
    }

    delete this.config.connections[tag];

    if (this.config.default === tag) {
      delete this.config.default;
      const remaining = Object.keys(this.config.connections);
      if (remaining.length > 0) {
        this.config.default = remaining[0];
        logger.info(`Default connection changed to '${this.config.default}'`);
      }
    }

    this.saveConfig();
    logger.success(`Removed connection '${tag}'`);
  }

  public get(tag?: string): ConnectionConfig & { tag: string } {
    if (!this.config || Object.keys(this.config.connections).length === 0) {
      throw new Error(
        'No connections configured. Use "schiba add <tag> <connection-string>" to add a connection.'
      );
    }

    const targetTag = tag || this.config.default;
    if (!targetTag) {
      throw new Error(
        'No default connection set. Either:\n' +
          '  - Specify a connection: schiba fetch production\n' +
          '  - Set a default: schiba default local\n' +
          '  - List available connections: schiba list'
      );
    }

    const connection = this.config.connections[targetTag];
    if (!connection) {
      throw new Error(`Connection '${targetTag}' not found`);
    }

    connection.lastUsed = new Date().toISOString();
    this.saveConfig();

    const parsedUrl = parseEnvVariables(connection.url);

    return {
      ...connection,
      url: parsedUrl,
      tag: targetTag,
    };
  }

  public list(): Array<{ tag: string; connection: ConnectionConfig; isDefault: boolean }> {
    if (!this.config) {
      return [];
    }

    return Object.entries(this.config.connections).map(([tag, connection]) => ({
      tag,
      connection,
      isDefault: tag === this.config!.default,
    }));
  }

  public setDefault(tag: string): void {
    if (!this.config) {
      throw new Error('No connections configured');
    }

    if (!this.config.connections[tag]) {
      throw new Error(`Connection '${tag}' not found`);
    }

    this.config.default = tag;
    this.saveConfig();
    logger.success(`Set '${tag}' as default connection`);
  }

  public getPreferences(): ConfigFile['preferences'] {
    return this.config?.preferences || CONFIG.DEFAULT_PREFERENCES;
  }

  public detectDatabaseType(connectionConfig: ConnectionConfig): string | null {
    return detectDatabaseType(connectionConfig.url);
  }
}

export const configManager = ConfigManager.getInstance();
