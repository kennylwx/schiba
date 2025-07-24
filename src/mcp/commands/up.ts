import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import ora from 'ora';
import { McpStore } from '../server/store';
import { logger } from '../../utils/logger';
import { EMOJI_MAP } from '../../utils/constants';

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

    // Path to the main CLI executable to run the internal MCP server command
    // Use process.argv[1] to get the actual path of the running executable
    const cliPath = process.argv[1];

    if (options.verbose) {
      logger.info(`Debug: Using CLI path: ${cliPath}`);
      logger.info(`Debug: file exists: ${existsSync(cliPath)}`);
    }

    // Spawn the MCP server process using the internal command
    const serverProcess: ChildProcess = spawn('node', [cliPath, '_mcp-server'], {
      detached: options.detach !== false, // Default to true for detachment
      stdio: options.verbose
        ? 'inherit'
        : options.detach !== false
          ? 'ignore'
          : ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MCP_SERVER_PORT: port.toString(),
      },
    });

    if (!serverProcess.pid) {
      throw new Error('Failed to start MCP server process');
    }

    // Capture stderr for better error reporting
    let stderr = '';
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    // If detached, unref the process immediately so parent can exit
    if (options.detach !== false) {
      serverProcess.unref();
      // For detached mode, just wait briefly to check for immediate errors
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(true);
        }, 500); // Very short wait for detached mode

        serverProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        // Only check for immediate exit errors in detached mode
        const exitHandler = (code: number | null): void => {
          if (code !== null && code !== 0) {
            clearTimeout(timeout);
            const errorMessage = `Server process exited with code ${code}${
              stderr ? `:\n${stderr}` : ''
            }`;
            reject(new Error(errorMessage));
          }
        };

        serverProcess.once('exit', exitHandler);

        // Remove the exit handler after timeout to prevent hanging
        setTimeout(() => {
          serverProcess.removeListener('exit', exitHandler);
        }, 500);
      });
    } else {
      // For attached mode, wait longer and monitor properly
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
            const errorMessage = `Server process exited with code ${code}${
              stderr ? `:\n${stderr}` : ''
            }`;
            reject(new Error(errorMessage));
          }
        });
      });
    }

    // Update server state
    store.updateServerState({
      status: 'running',
      pid: serverProcess.pid,
      startedAt: new Date().toISOString(),
      lastError: undefined,
    });

    spinner.succeed('MCP Server started successfully');

    logger.info(`\n${EMOJI_MAP.success} Schiba MCP Server started successfully!`);
    logger.info(`   Process ID: ${serverProcess.pid}`);
    logger.info(`   Transport: stdio (MCP standard)`);
    if (options.detach !== false) {
      logger.info(`   Mode: Detached (running in background)`);
    } else {
      logger.info(`   Mode: Attached (foreground)`);
    }

    logger.info('\n🔌 Connect with MCP Clients:');
    logger.info('   • Claude Desktop - Add to your claude_desktop_config.json:');
    logger.info('     {');
    logger.info('       "mcpServers": {');
    logger.info('         "schiba": {');
    logger.info(`           "command": "node",`);
    logger.info(`           "args": ["${process.argv[1]}", "_mcp-server"]`);
    logger.info('         }');
    logger.info('       }');
    logger.info('     }');
    logger.info('   • Other MCP clients - Use stdio transport with the above command');

    logger.info('\n📋 Available Database Tools:');
    logger.info('   • list_connections, fetch_schema, test_connection');
    logger.info('   • add_connection, remove_connection, update_connection');
    logger.info('   • set_default_connection, get_operation_logs');

    logger.info('\n🔧 Server Management:');
    logger.info('   • schiba status          - Check server status and uptime');
    logger.info('   • schiba down           - Stop the server');
    logger.info('   • schiba up --no-detach - Start in foreground mode');

    logger.info('\n📖 Documentation & Examples:');
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
