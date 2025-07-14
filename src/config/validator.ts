import { validateConnectionString } from '../utils/helpers';
import type { ConfigFile, ConnectionConfig } from './types';

export class ConfigValidator {
  public static validateConnectionConfig(config: ConnectionConfig): void {
    if (!config.url) {
      throw new Error('Connection URL is required');
    }

    if (!validateConnectionString(config.url)) {
      throw new Error('Invalid connection string format');
    }

    const validSSLModes = ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'];
    if (!validSSLModes.includes(config.sslMode)) {
      throw new Error(`Invalid SSL mode: ${config.sslMode}`);
    }
  }

  public static validateConfigFile(config: ConfigFile): void {
    if (!config.version) {
      throw new Error('Config version is required');
    }

    if (!config.connections || typeof config.connections !== 'object') {
      throw new Error('Connections object is required');
    }

    // Validate each connection
    Object.values(config.connections).forEach((conn) => {
      this.validateConnectionConfig(conn);
    });

    // Validate default exists if specified
    if (config.default && !config.connections[config.default]) {
      throw new Error(`Default connection '${config.default}' does not exist`);
    }
  }
}
