import Database from 'better-sqlite3';
import { join } from 'path';
import { configPaths } from '../../config/paths';
import type {
  McpStoredConnection,
  McpOperationLog,
  McpServerState,
  ServerStateRow,
  ConnectionRow,
  OperationLogRow,
} from '../types';

export class McpStore {
  private db: Database.Database;
  private static instance: McpStore;

  private constructor() {
    const dbPath = join(configPaths.getConfigDirectory(), 'mcp.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  public static getInstance(): McpStore {
    if (!McpStore.instance) {
      McpStore.instance = new McpStore();
    }
    return McpStore.instance;
  }

  private initializeTables(): void {
    // Server state table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS server_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        pid INTEGER,
        port INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'stopped', 'error')),
        started_at TEXT,
        last_error TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Connections cache table (mirrors config but with additional MCP metadata)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        tag TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL,
        ssl_mode TEXT NOT NULL,
        schemas TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT,
        last_used TEXT
      )
    `);

    // Operation logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id TEXT PRIMARY KEY,
        operation TEXT NOT NULL,
        connection_tag TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER,
        success BOOLEAN NOT NULL,
        error TEXT
      )
    `);

    // Ensure we have a server state row
    const serverState = this.db.prepare('SELECT * FROM server_state WHERE id = 1').get() as
      | ServerStateRow
      | undefined;
    if (!serverState) {
      this.db
        .prepare(
          `
        INSERT INTO server_state (id, port, status) 
        VALUES (1, 3001, 'stopped')
      `
        )
        .run();
    }
  }

  // Server state management
  public getServerState(): McpServerState {
    const row = this.db.prepare('SELECT * FROM server_state WHERE id = 1').get() as ServerStateRow;
    return {
      pid: row.pid || undefined,
      port: row.port,
      status: row.status as McpServerState['status'],
      startedAt: row.started_at || undefined,
      lastError: row.last_error || undefined,
    };
  }

  public updateServerState(state: Partial<McpServerState>): void {
    const updateFields: string[] = [];
    const values: unknown[] = [];

    if (state.pid !== undefined) {
      updateFields.push('pid = ?');
      values.push(state.pid);
    }
    if (state.port !== undefined) {
      updateFields.push('port = ?');
      values.push(state.port);
    }
    if (state.status !== undefined) {
      updateFields.push('status = ?');
      values.push(state.status);
    }
    if (state.startedAt !== undefined) {
      updateFields.push('started_at = ?');
      values.push(state.startedAt);
    }
    if (state.lastError !== undefined) {
      updateFields.push('last_error = ?');
      values.push(state.lastError);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length > 1) {
      // More than just updated_at
      const sql = `UPDATE server_state SET ${updateFields.join(', ')} WHERE id = 1`;
      this.db.prepare(sql).run(...values);
    }
  }

  // Connection management
  public syncConnection(connection: McpStoredConnection): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO connections 
      (id, tag, url, ssl_mode, schemas, description, created_at, updated_at, last_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        connection.id,
        connection.tag,
        connection.url,
        connection.sslMode,
        connection.schemas,
        connection.description,
        connection.createdAt,
        connection.updatedAt,
        connection.lastUsed
      );
  }

  public getConnections(): McpStoredConnection[] {
    const rows = this.db
      .prepare('SELECT * FROM connections ORDER BY created_at')
      .all() as ConnectionRow[];
    return rows.map((row) => ({
      id: row.id,
      tag: row.tag,
      url: row.url,
      sslMode: row.ssl_mode,
      schemas: row.schemas || undefined,
      description: row.description || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
      lastUsed: row.last_used || undefined,
    }));
  }

  public getConnection(tag: string): McpStoredConnection | null {
    const row = this.db.prepare('SELECT * FROM connections WHERE tag = ?').get(tag) as
      | ConnectionRow
      | undefined;
    if (!row) return null;

    return {
      id: row.id,
      tag: row.tag,
      url: row.url,
      sslMode: row.ssl_mode,
      schemas: row.schemas || undefined,
      description: row.description || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
      lastUsed: row.last_used || undefined,
    };
  }

  // Operation logging
  public logOperation(log: McpOperationLog): void {
    this.db
      .prepare(
        `
      INSERT INTO operation_logs 
      (id, operation, connection_tag, timestamp, duration, success, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        log.id,
        log.operation,
        log.connectionTag,
        log.timestamp,
        log.duration,
        log.success,
        log.error
      );
  }

  public getRecentOperations(limit: number = 100): McpOperationLog[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM operation_logs 
      ORDER BY timestamp DESC 
      LIMIT ?
    `
      )
      .all(limit) as OperationLogRow[];

    return rows.map((row) => ({
      id: row.id,
      operation: row.operation,
      connectionTag: row.connection_tag || undefined,
      timestamp: row.timestamp,
      duration: row.duration || undefined,
      success: Boolean(row.success),
      error: row.error || undefined,
    }));
  }

  // Cleanup operations
  public cleanupOldLogs(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = this.db
      .prepare(
        `
      DELETE FROM operation_logs 
      WHERE timestamp < ?
    `
      )
      .run(cutoffDate.toISOString());

    return result.changes;
  }

  public close(): void {
    this.db.close();
  }
}
