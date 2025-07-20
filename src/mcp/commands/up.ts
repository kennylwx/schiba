import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ora from 'ora';
import { McpStore } from '../server/store';
import { logger } from '../../utils/logger';
import { EMOJI_MAP } from '../../utils/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface McpUpOptions {
  port?: number;
  detach?: boolean;
  verbose?: boolean;
}

export async function startMcpServer(options: McpUpOptions = {}): Promise<void> {
  const store = McpStore.getInstance();
  const currentState = store.getServerState();

  // Check if server is already running
  if (currentState.status === 'running' && currentState.pid) {
    try {
      // Check if the process is actually running
      process.kill(currentState.pid, 0);
      logger.info(`${EMOJI_MAP.warning} MCP Server is already running (PID: ${currentState.pid})`);
      logger.info(`   Port: ${currentState.port}`);
      logger.info(`   Started: ${currentState.startedAt}`);
      logger.info('\n   Use "schiba down" to stop the server');
      return;
    } catch (error) {
      // Process doesn't exist, update state
      store.updateServerState({
        status: 'stopped',
        pid: undefined,
        startedAt: undefined,
      });
    }
  }

  const port = options.port || currentState.port || 3001;
  const spinner = ora('Starting MCP Server...').start();

  try {
    // Update port if different
    if (port !== currentState.port) {
      store.updateServerState({ port });
    }

    // Path to the MCP server file
    const serverPath = join(__dirname, '../server/index.js');

    // Spawn the MCP server process
    const serverProcess: ChildProcess = spawn('node', [serverPath], {
      detached: options.detach !== false, // Default to true for detachment
      stdio: options.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MCP_SERVER_PORT: port.toString(),
      },
    });

    if (!serverProcess.pid) {
      throw new Error('Failed to start MCP server process');
    }

    // Wait a moment to see if the process starts successfully
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(true);
      }, 2000);

      serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      serverProcess.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Server process exited with code ${code}`));
        }
      });
    });

    // If detached, unref the process so parent can exit
    if (options.detach !== false) {
      serverProcess.unref();
    }

    // Update server state
    store.updateServerState({
      status: 'running',
      pid: serverProcess.pid,
      startedAt: new Date().toISOString(),
      lastError: undefined,
    });

    spinner.succeed('MCP Server started successfully');

    logger.info(`\n${EMOJI_MAP.success} Schiba MCP Server is now running`);
    logger.info(`   Process ID: ${serverProcess.pid}`);
    logger.info(`   Port: ${port}`);
    logger.info(`   Transport: stdio (MCP standard)`);

    if (options.detach !== false) {
      logger.info(`   Mode: Detached (background)`);
    }

    logger.info('\n📋 Available MCP Tools:');
    logger.info('   • list_connections       - List all database connections');
    logger.info('   • fetch_schema           - Extract database schema');
    logger.info('   • test_connection        - Test database connectivity');
    logger.info('   • add_connection         - Add new database connection');
    logger.info('   • remove_connection      - Remove database connection');
    logger.info('   • update_connection      - Update connection properties');
    logger.info('   • set_default_connection - Set default connection');
    logger.info('   • get_operation_logs     - Get server operation logs');

    logger.info('\n🔧 Server Management:');
    logger.info('   • schiba status          - Check server status');
    logger.info('   • schiba down           - Stop the server');
    logger.info('   • schiba up --verbose   - Start with verbose logging');

    logger.info('\n📖 For MCP client configuration, see:');
    logger.info('   https://github.com/kennylwx/schiba#mcp-integration\n');
  } catch (error) {
    spinner.fail('Failed to start MCP Server');

    const errorMessage = error instanceof Error ? error.message : String(error);
    store.updateServerState({
      status: 'error',
      lastError: errorMessage,
    });

    logger.error(
      'MCP Server startup failed:',
      error instanceof Error ? error : new Error(errorMessage)
    );

    logger.error(`\n${EMOJI_MAP.error} Failed to start MCP Server`);
    logger.error(`   Error: ${errorMessage}`);
    logger.info('\n💡 Troubleshooting:');
    logger.info('   • Check if port is already in use');
    logger.info('   • Try a different port: schiba up --port 3002');
    logger.info('   • Run with verbose output: schiba up --verbose');
    logger.info('');

    throw error;
  }
}

export function showMcpUpHelp(): void {
  logger.info('\nMCP Up command usage:');
  logger.info('  schiba up [options]');

  logger.info('\nOptions:');
  logger.info('  --port <number>     Port for MCP server (default: 3001)');
  logger.info('  --no-detach         Run in foreground (attached mode)');
  logger.info('  --verbose           Enable verbose logging');

  logger.info('\nExamples:');
  logger.info('  schiba up                      # Start server on default port');
  logger.info('  schiba up --port 3002          # Start server on custom port');
  logger.info('  schiba up --verbose            # Start with detailed logs');
  logger.info('  schiba up --no-detach          # Run in foreground');

  logger.info('\nThe MCP server provides all Schiba functionality via');
  logger.info('the Model Context Protocol for AI assistants and tools.');
  logger.info('');
}
