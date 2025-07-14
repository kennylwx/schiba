import { homedir } from 'os';
import { dirname, join } from 'path';

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

    // Always return global config path
    return this.getGlobalConfigPath();
  }

  public getEnvPath(): string {
    const configPath = this.getConfigPath();
    const configDir = configPath.substring(0, configPath.lastIndexOf(join('/', '')));
    return join(configDir, '.env');
  }

  public getGlobalConfigPath(): string {
    const home = homedir();

    if (process.platform === 'win32') {
      // Windows: %APPDATA%\schiba\config.json
      const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
      return join(appData, 'schiba', 'config.json');
    } else {
      // macOS/Linux: ~/.config/schiba/config.json
      const configHome = process.env.XDG_CONFIG_HOME || join(home, '.config');
      return join(configHome, 'schiba', 'config.json');
    }
  }

  public getConfigDirectory(): string {
    const configPath = this.getConfigPath();
    return dirname(configPath);
  }
}

export const configPaths = ConfigPaths.getInstance();
