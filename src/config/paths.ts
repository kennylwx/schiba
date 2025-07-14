import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

export class ConfigPaths {
  private static instance: ConfigPaths;

  private constructor() {}

  public static getInstance(): ConfigPaths {
    if (!ConfigPaths.instance) {
      ConfigPaths.instance = new ConfigPaths();
    }
    return ConfigPaths.instance;
  }

  public getConfigPath(): string {
    // Check environment variable first
    if (process.env.SCHIBA_CONFIG_PATH) {
      return process.env.SCHIBA_CONFIG_PATH;
    }

    // Check local project config
    const localPath = join(process.cwd(), '.schiba', 'config.json');
    if (existsSync(localPath)) {
      return localPath;
    }

    // Return local path as default (will be created on first use)
    return localPath;
  }

  public getEnvPath(): string {
    const configPath = this.getConfigPath();
    const configDir = configPath.substring(0, configPath.lastIndexOf('/'));
    return join(configDir, '.env');
  }

  public getGlobalConfigPath(): string {
    const home = homedir();
    if (process.platform === 'win32') {
      return join(home, 'AppData', 'Roaming', 'schiba', 'config.json');
    }
    return join(home, '.config', 'schiba', 'config.json');
  }
}

export const configPaths = ConfigPaths.getInstance();
