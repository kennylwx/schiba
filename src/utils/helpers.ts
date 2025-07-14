import { CONFIG } from '../config/default';

export function isSecuritySensitive(schema: string): boolean {
  const sensitivePatterns = [
    /user/i,
    /password/i,
    /auth/i,
    /token/i,
    /secret/i,
    /credential/i,
    /key/i,
    /permission/i,
    /role/i,
    /access/i,
  ];

  return sensitivePatterns.some((pattern) => pattern.test(schema));
}

export function validateConnectionString(str: string): boolean {
  try {
    const url = new URL(str);
    return !!(url.protocol && url.host);
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function calculateCompressionRatio(original: number, compressed: number): string {
  const ratio = (1 - compressed / original) * 100;
  return `${ratio.toFixed(1)}%`;
}

// Add database type detection
export function detectDatabaseType(connectionString: string): string | null {
  for (const [dbType, prefixes] of Object.entries(CONFIG.SUPPORTED_DATABASES)) {
    if (prefixes.some((prefix) => connectionString.toLowerCase().startsWith(prefix))) {
      return dbType;
    }
  }
  return null;
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}
