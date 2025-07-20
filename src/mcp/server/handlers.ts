import { randomUUID } from 'crypto';
import { configManager } from '../../config/manager';
import { createAnalyzer } from '../../core/analyzers';
import { createFormatter } from '../../core/formatters';
import { createConnection } from '../../services/database';
import { McpStore } from './store';
import type { McpToolResult, McpStoredConnection } from '../types';

export class McpHandlers {
  private store: McpStore;

  constructor() {
    this.store = McpStore.getInstance();
  }

  private async logOperation(
    operation: string,
    connectionTag: string | undefined,
    startTime: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    const duration = Date.now() - startTime;
    this.store.logOperation({
      id: randomUUID(),
      operation,
      connectionTag,
      timestamp: new Date().toISOString(),
      duration,
      success,
      error,
    });
  }

  private syncConnectionToStore(tag: string): void {
    try {
      const connectionConfig = configManager.get(tag);
      const storedConnection: McpStoredConnection = {
        id: randomUUID(),
        tag: connectionConfig.tag,
        url: connectionConfig.url,
        sslMode: connectionConfig.sslMode,
        schemas: connectionConfig.schemas?.join(','),
        description: connectionConfig.description,
        createdAt: connectionConfig.created || new Date().toISOString(),
        updatedAt: connectionConfig.updatedAt,
        lastUsed: connectionConfig.lastUsed,
      };
      this.store.syncConnection(storedConnection);
    } catch (error) {
      // Connection might not exist, that's okay
    }
  }

  public async listConnections(): Promise<McpToolResult> {
    const startTime = Date.now();
    try {
      const connections = configManager.list();

      // Sync all connections to store
      connections.forEach(({ tag }) => this.syncConnectionToStore(tag));

      const result = connections.map(({ tag, connection, isDefault }) => ({
        tag,
        url: connection.url.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'), // Mask credentials
        sslMode: connection.sslMode,
        schemas: connection.schemas || ['public'],
        description: connection.description,
        isDefault,
        created: connection.created,
        lastUsed: connection.lastUsed,
      }));

      await this.logOperation('list_connections', undefined, startTime, true);
      return {
        success: true,
        data: { connections: result }, // Wrap array in object
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logOperation('list_connections', undefined, startTime, false, errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async fetchSchema(
    tag?: string,
    format: 'raw' | 'markdown' = 'raw'
  ): Promise<McpToolResult> {
    const startTime = Date.now();
    try {
      const connectionConfig = configManager.get(tag);
      this.syncConnectionToStore(connectionConfig.tag);

      const dbType = configManager.detectDatabaseType(connectionConfig);
      if (!dbType) {
        throw new Error('Unsupported database type');
      }

      const analyzer = await createAnalyzer(dbType, connectionConfig, 30000);
      const { schema, stats } = await analyzer.analyze();

      const formatter = createFormatter(format);
      const formattedContent = formatter.format(schema, stats);

      await this.logOperation('fetch_schema', connectionConfig.tag, startTime, true);
      return {
        success: true,
        data: {
          schema: formattedContent,
          stats,
          format,
          connectionTag: connectionConfig.tag,
          dbType,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logOperation('fetch_schema', tag, startTime, false, errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async testConnection(tag?: string): Promise<McpToolResult> {
    const startTime = Date.now();
    try {
      const connectionConfig = configManager.get(tag);
      this.syncConnectionToStore(connectionConfig.tag);

      const dbType = configManager.detectDatabaseType(connectionConfig);
      if (!dbType) {
        throw new Error('Unsupported database type');
      }

      const connection = createConnection(connectionConfig);
      await connection.connect();
      const success = await connection.test();
      await connection.disconnect();

      await this.logOperation('test_connection', connectionConfig.tag, startTime, success);
      return {
        success: true,
        data: {
          connectionTag: connectionConfig.tag,
          testResult: success,
          dbType,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logOperation('test_connection', tag, startTime, false, errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async addConnection(
    tag: string,
    connectionString: string,
    options: {
      ssl?: boolean;
      default?: boolean;
      description?: string;
    } = {}
  ): Promise<McpToolResult> {
    const startTime = Date.now();
    try {
      const { finalTag, tagResult } = configManager.add(tag, connectionString, options);
      this.syncConnectionToStore(finalTag);

      await this.logOperation('add_connection', finalTag, startTime, true);
      return {
        success: true,
        data: {
          tag: finalTag,
          wasRenamed: tagResult.wasConflictResolved,
          originalTag: tagResult.originalTag,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logOperation('add_connection', tag, startTime, false, errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async removeConnection(tag: string): Promise<McpToolResult> {
    const startTime = Date.now();
    try {
      configManager.remove(tag);

      await this.logOperation('remove_connection', tag, startTime, true);
      return {
        success: true,
        data: { removedTag: tag },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logOperation('remove_connection', tag, startTime, false, errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async updateConnection(
    tag: string,
    property: string,
    value: string
  ): Promise<McpToolResult> {
    const startTime = Date.now();
    try {
      const result = configManager.update(tag, property, value);

      // Handle tag renaming result
      if (property === 'tag' && result) {
        const { finalTag } = result;
        this.syncConnectionToStore(finalTag);

        await this.logOperation('update_connection', finalTag, startTime, true);
        return {
          success: true,
          data: {
            originalTag: tag,
            finalTag: finalTag,
            property,
            value,
          },
          timestamp: new Date().toISOString(),
        };
      } else {
        this.syncConnectionToStore(tag);

        await this.logOperation('update_connection', tag, startTime, true);
        return {
          success: true,
          data: {
            tag,
            property,
            value,
          },
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logOperation('update_connection', tag, startTime, false, errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async setDefaultConnection(tag: string): Promise<McpToolResult> {
    const startTime = Date.now();
    try {
      configManager.setDefault(tag);
      this.syncConnectionToStore(tag);

      await this.logOperation('set_default', tag, startTime, true);
      return {
        success: true,
        data: { defaultTag: tag },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logOperation('set_default', tag, startTime, false, errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async getOperationLogs(limit: number = 50): Promise<McpToolResult> {
    const startTime = Date.now();
    try {
      const logs = this.store.getRecentOperations(limit);

      await this.logOperation('get_operation_logs', undefined, startTime, true);
      return {
        success: true,
        data: { logs }, // Wrap array in object
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logOperation('get_operation_logs', undefined, startTime, false, errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
