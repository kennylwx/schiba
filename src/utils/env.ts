import { readFileSync, existsSync } from 'fs';
import { configPaths } from '../config/paths';

export function loadEnvFile(): void {
  const envPath = configPaths.getEnvPath();

  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');

          if (key && value !== undefined) {
            process.env[key] = value.replace(/^["'](.*)["']$/, '$1');
          }
        }
      });
    } catch (error) {
      // Silently ignore env file errors
    }
  }
}

export function parseEnvVariables(str: string): string {
  // Load .env file first
  loadEnvFile();

  // Replace ${VAR} or $VAR with environment values
  return str.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g, (match, p1, p2) => {
    const varName = p1 || p2;
    return process.env[varName] || match;
  });
}
