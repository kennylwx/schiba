import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { ConfigFile } from './types';

export class ConfigStorage {
  constructor(private configPath: string) {}

  public exists(): boolean {
    return existsSync(this.configPath);
  }

  public read(): ConfigFile | null {
    if (!this.exists()) {
      return null;
    }

    try {
      const content = readFileSync(this.configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read config file: ${(error as Error).message}`);
    }
  }

  public write(config: ConfigFile): void {
    try {
      const dir = dirname(this.configPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to write config file: ${(error as Error).message}`);
    }
  }

  public ensureDirectory(): void {
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
