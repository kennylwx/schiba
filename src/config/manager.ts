import { configPaths } from './paths';
import { ConfigStorage } from './storage';
import { ConfigValidator } from './validator';
import type { ConfigFile, ConnectionConfig } from './types';
import { CONFIG } from '../config/default';
import { logger } from '../utils/logger';
import { detectDatabaseType } from '../utils/helpers';
import { parseEnvVariables } from '../utils/env';
import { TagGenerator, type TagGenerationResult } from '../utils/tag-generator';

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

  /**
   * Generate a unique tag using Greek alphabet rotation or resolve conflicts
   */
  private generateUniqueTag(requestedTag?: string): TagGenerationResult {
    this.ensureConfig();
    const existingTags = Object.keys(this.config!.connections);
    const tagGenerator = new TagGenerator(existingTags);
    return tagGenerator.getUniqueTag(requestedTag);
  }

  /**
   * Rename a connection tag
   */
  public renameTag(
    currentTag: string,
    newTag: string
  ): { finalTag: string; tagResult: TagGenerationResult } {
    if (!this.config) {
      throw new Error('No connections configured');
    }

    if (!this.config.connections[currentTag]) {
      throw new Error(`Connection '${currentTag}' not found`);
    }

    // Validate new tag format
    if (!newTag.trim()) {
      throw new Error('New tag cannot be empty');
    }

    const sanitizedNewTag = newTag.trim();
    if (sanitizedNewTag.includes(' ')) {
      throw new Error('Tag cannot contain spaces');
    }

    if (sanitizedNewTag.length > 50) {
      throw new Error('Tag must be 50 characters or less');
    }

    // Generate unique tag (handles conflicts automatically)
    const tagResult = this.generateUniqueTag(sanitizedNewTag);
    const finalTag = tagResult.tag;

    // Copy connection with new tag
    const connection = { ...this.config.connections[currentTag] };
    connection.updatedAt = new Date().toISOString();

    // Add with new tag and remove old tag
    this.config.connections[finalTag] = connection;
    delete this.config.connections[currentTag];

    // Update default connection if necessary
    if (this.config.default === currentTag) {
      this.config.default = finalTag;
    }

    this.saveConfig();

    if (currentTag !== finalTag) {
      logger.success(
        `Renamed connection '${currentTag}' to '${finalTag}'${this.config.default === finalTag ? ' (default)' : ''}`
      );
    } else {
      logger.success(`Connection tag '${currentTag}' is already using the requested name`);
    }

    return { finalTag, tagResult };
  }

  public add(
    tag: string | undefined,
    connectionString: string,
    options: { ssl?: boolean; default?: boolean; description?: string } = {}
  ): { finalTag: string; tagResult: TagGenerationResult } {
    this.ensureConfig();

    // Generate unique tag
    const tagResult = this.generateUniqueTag(tag);
    const finalTag = tagResult.tag;

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
    this.config!.connections[finalTag] = connection;

    if (isFirstConnection || options.default) {
      this.config!.default = finalTag;
    }

    this.saveConfig();
    logger.success(
      `Added connection '${finalTag}'${this.config!.default === finalTag ? ' (default)' : ''}`
    );

    return { finalTag, tagResult };
  }

  public update(
    tag: string,
    property: string,
    value: string
  ): { finalTag: string; tagResult: TagGenerationResult } | void {
    if (!this.config) {
      throw new Error('No connections configured');
    }

    if (!this.config.connections[tag]) {
      throw new Error(`Connection '${tag}' not found`);
    }

    // Handle tag renaming - return the result
    if (property === 'tag') {
      return this.renameTag(tag, value);
    }

    // For all other properties, continue with existing logic and return void
    const connection = this.config.connections[tag];
    const url = new URL(connection.url);

    switch (property) {
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
        const schemaValues = value.split(',').map((s) => s.trim());
        searchParams.set('schema', schemaValues.join(','));
        url.search = searchParams.toString();
        connection.url = url.toString();
        connection.schemas = schemaValues;
        break;
      }

      default:
        throw new Error(`Unknown property: ${property}`);
    }

    connection.updatedAt = new Date().toISOString();

    ConfigValidator.validateConnectionConfig(connection);
    this.saveConfig();
    logger.success(`Updated '${property}' for connection '${tag}'`);

    // Return void for non-tag updates
    return;
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

    // Parse schemas from URL if not already present in connection config
    let schemas = connection.schemas;
    if (!schemas) {
      try {
        const url = new URL(parsedUrl);
        const schemaParam = url.searchParams.get('schema');
        if (schemaParam) {
          schemas = schemaParam.split(',').map((s) => s.trim());
        }
      } catch (error) {
        // Ignore URL parsing errors, will fall back to ['public'] in analyzer
      }
    }

    return {
      ...connection,
      url: parsedUrl,
      tag: targetTag,
      schemas: schemas,
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

  public updateSchemas(tag: string, schemas: string[]): void {
    if (!this.config) {
      throw new Error('No connections configured');
    }

    if (!this.config.connections[tag]) {
      throw new Error(`Connection '${tag}' not found`);
    }

    const connection = this.config.connections[tag];
    connection.schemas = schemas;
    connection.updatedAt = new Date().toISOString();

    ConfigValidator.validateConnectionConfig(connection);
    this.saveConfig();
    logger.success(`Updated schemas for connection '${tag}': ${schemas.join(', ')}`);
  }
}

export const configManager = ConfigManager.getInstance();
