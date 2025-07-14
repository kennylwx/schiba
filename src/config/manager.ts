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

    // Check if tag already exists
    if (this.config!.connections[tag]) {
      throw new Error(`Connection '${tag}' already exists`);
    }

    const isFirstConnection = Object.keys(this.config!.connections).length === 0;

    // Fixed: Handle ssl option correctly (Commander sets ssl to false when --no-ssl is used)
    const sslEnabled = options.ssl !== false;

    const connection: ConnectionConfig = {
      url: connectionString,
      ssl: sslEnabled,
      sslMode: sslEnabled ? 'prefer' : 'disable',
      description: options.description,
      created: new Date().toISOString(),
    };

    ConfigValidator.validateConnectionConfig(connection);
    this.config!.connections[tag] = connection;

    // First connection becomes default automatically
    if (isFirstConnection || options.default) {
      this.config!.default = tag;
    }

    this.saveConfig();
    logger.success(`Added connection '${tag}'${this.config!.default === tag ? ' (default)' : ''}`);
  }

  public remove(tag: string): void {
    if (!this.config) {
      throw new Error('No connections configured');
    }

    if (!this.config.connections[tag]) {
      throw new Error(`Connection '${tag}' not found`);
    }

    delete this.config.connections[tag];

    // If removed connection was default, clear default
    if (this.config.default === tag) {
      delete this.config.default;

      // Set new default to first remaining connection
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

    // Update last used
    connection.lastUsed = new Date().toISOString();
    this.saveConfig();

    // Parse environment variables in connection string
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
