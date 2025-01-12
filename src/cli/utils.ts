import chalk from 'chalk';
import { EMOJI_MAP } from '../utils/constants';
import { CONFIG } from '../config/default';

export function printHeader(): void {
  console.log(chalk.blue(`${EMOJI_MAP.database} schemix v${CONFIG.VERSION}`));
  console.log('Extract database schemas in a compact format for AI context windows\n');
}

export function sanitizeConnectionString(str: string): string {
  str = str.replace(/^["'](.+)["']$/, '$1');
  
  try {
    const [baseUrl, ...queryParts] = str.split('?');
    const query = queryParts.join('?');
    
    const urlObj = new URL(baseUrl);
    
    if (urlObj.password) {
      urlObj.password = encodeURIComponent(decodeURIComponent(urlObj.password));
    }
    
    return query ? `${urlObj.toString()}?${query}` : urlObj.toString();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw new Error('Invalid connection string format');
    }
    throw error;
  }
}

export function formatError(error: unknown, dbType: string | null): string {
  const baseError = error instanceof Error ? error.message : String(error);
  
  if (baseError.includes('password authentication failed')) {
    return 'Authentication failed: Invalid username or password';
  }
  
  if (baseError.includes('ECONNREFUSED')) {
    return `Could not connect to ${dbType || 'database'} server. Please check:\n` +
           chalk.yellow('1. The server is running\n') +
           chalk.yellow('2. The connection string is correct\n') +
           chalk.yellow('3. The port is accessible\n') +
           chalk.yellow('4. Network/firewall settings allow the connection');
  }
  
  if (baseError.includes('timeout')) {
    return `Connection timed out after ${CONFIG.CONNECTION_TIMEOUT/1000} seconds.\n` +
           'Please check your network connection and try again.';
  }
  
  return `Database error: ${baseError}`;
}