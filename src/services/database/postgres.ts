import { Client, type PostgresClient } from '../../utils/pg-client';
import { BaseConnection } from './base';
import type { ConnectionOptions } from './base';
import type { ConnectionConfig } from '../../core/types';
import { buildSSLConfig } from '../../utils/ssl';
import chalk from 'chalk';

export class PostgresConnection extends BaseConnection {
  private client: PostgresClient;
  private connectionConfig: ConnectionConfig;

  constructor(connectionConfig: ConnectionConfig, options: ConnectionOptions = {}) {
    super(connectionConfig.url, options);
    this.connectionConfig = connectionConfig;

    this.client = new Client({
      connectionString: connectionConfig.url,
      connectionTimeoutMillis: this.options.timeout,
      ssl: buildSSLConfig(connectionConfig.sslMode),
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      const formattedError = this.formatError(error);
      throw formattedError;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
    }
  }

  public async test(): Promise<boolean> {
    try {
      await this.client.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  public getClient(): PostgresClient {
    return this.client;
  }

  private formatError(error: unknown): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error instanceof Error && 'code' in error ? error.code : null;

    // FIX: Add a specific check for the RDS Proxy TLS error.
    if (message.includes('This RDS Proxy requires TLS connections')) {
      return new Error(
        `The database requires a secure SSL/TLS connection, but the current setting is likely 'disable'.\n\n` +
          chalk.yellow('To fix this, enable SSL by changing the SSL mode:') +
          '\n' +
          `  ${chalk.cyan(`schiba update ${this.connectionConfig.tag} ssl-mode require`)}\n\n` +
          `Then, try testing the connection again:\n` +
          `  ${chalk.cyan(`schiba test ${this.connectionConfig.tag}`)}`
      );
    }

    if (message.includes("does not match certificate's altnames")) {
      return new Error(
        `SSL hostname verification failed.\n` +
          `The host you are connecting to (e.g., 'localhost') does not match the name in the server's SSL certificate.\n` +
          `This is a common issue when using an SSH tunnel or a proxy.\n\n` +
          chalk.yellow(
            'To fix this, change the SSL mode to `verify-ca` to skip hostname verification:'
          ) +
          '\n' +
          `  ${chalk.cyan(`schiba update ${this.connectionConfig.tag} ssl-mode verify-ca`)}\n`
      );
    }

    if (message.includes('ECONNREFUSED') || errorCode === 'ECONNREFUSED') {
      try {
        const url = new URL(this.connectionConfig.url);
        return new Error(
          `Connection Refused: Could not connect to ${chalk.cyan(`${url.hostname}:${url.port}`)}.\n\n` +
            chalk.yellow('Please check the following:') +
            '\n' +
            `  1. The database server is running and accessible.\n` +
            `  2. The host and port in your connection details are correct.\n` +
            `  3. Firewalls or network security groups are not blocking the connection.\n\n` +
            `You can update connection details using ${chalk.cyan('schiba update ...')}`
        );
      } catch {
        return new Error(
          `Connection Refused: Could not connect to the database server.\n\n` +
            chalk.yellow('Please check the following:') +
            '\n' +
            `  1. The database server is running and accessible.\n` +
            `  2. The host and port in your connection details are correct.\n` +
            `  3. Firewalls or network security groups are not blocking the connection.\n\n` +
            `You can update connection details using ${chalk.cyan('schiba update ...')}`
        );
      }
    }

    if (message.includes('EHOSTUNREACH') || errorCode === 'EHOSTUNREACH') {
      const url = new URL(this.connectionConfig.url);
      return new Error(
        `Host Unreachable: Could not reach ${chalk.cyan(`${url.hostname}:${url.port}`)}.\n\n` +
          chalk.yellow('Please check the following:') +
          '\n' +
          `  1. The hostname is correct and reachable.\n` +
          `  2. Your network connection is working.\n` +
          `  3. VPN or proxy settings if required.\n\n` +
          `You can update connection details using ${chalk.cyan('schiba update ...')}`
      );
    }

    if (message.includes('ETIMEDOUT') || message.includes('timeout') || errorCode === 'ETIMEDOUT') {
      const url = new URL(this.connectionConfig.url);
      return new Error(
        `Connection Timeout: Could not connect to ${chalk.cyan(`${url.hostname}:${url.port}`)} within the timeout period.\n\n` +
          chalk.yellow('Please check the following:') +
          '\n' +
          `  1. The database server is responding.\n` +
          `  2. Network latency or firewall rules may be causing delays.\n` +
          `  3. Try increasing the timeout with --timeout option.\n\n` +
          `You can update connection details using ${chalk.cyan('schiba update ...')}`
      );
    }

    if (
      message.includes('ENOTFOUND') ||
      message.includes('getaddrinfo') ||
      errorCode === 'ENOTFOUND'
    ) {
      try {
        const url = new URL(this.connectionConfig.url);
        return new Error(
          `Host Not Found: Could not resolve hostname ${chalk.cyan(`${url.hostname}`)}.\n\n` +
            chalk.yellow('Please check the following:') +
            '\n' +
            `  1. The hostname is spelled correctly.\n` +
            `  2. DNS resolution is working properly.\n` +
            `  3. The host exists and is reachable from your network.\n\n` +
            `You can update the hostname using ${chalk.cyan(`schiba update ${this.connectionConfig.tag} host <correct-hostname>`)}`
        );
      } catch {
        return new Error(
          `Host Not Found: DNS resolution failed.\n\n` +
            chalk.yellow('Please check the following:') +
            '\n' +
            `  1. The hostname is spelled correctly.\n` +
            `  2. DNS resolution is working properly.\n` +
            `  3. The host exists and is reachable from your network.\n\n` +
            `You can update connection details using ${chalk.cyan('schiba update ...')}`
        );
      }
    }

    if (message.includes('password authentication failed')) {
      return new Error('Authentication failed: Invalid username or password');
    }

    if (message.includes('server does not support SSL')) {
      return new Error(
        `The server does not support SSL connections.\n\n` +
          `To fix this, disable SSL for your connection:\n` +
          `  ${chalk.cyan(`schiba update ${this.connectionConfig.tag} ssl disable`)}\n\n` +
          `Then try again:\n` +
          `  ${chalk.cyan(`schiba fetch ${this.connectionConfig.tag}`)}\n\n` +
          `To see all your connections:\n` +
          `  ${chalk.cyan('schiba list')}`
      );
    }

    return error instanceof Error ? error : new Error(message);
  }
}
