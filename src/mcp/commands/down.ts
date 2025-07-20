import ora from 'ora';
import { McpStore } from '../server/store';
import { logger } from '../../utils/logger';
import { EMOJI_MAP } from '../../utils/constants';

export interface McpDownOptions {
  force?: boolean;
  verbose?: boolean;
}

export async function stopMcpServer(options: McpDownOptions = {}): Promise<void> {
  const store = McpStore.getInstance();
  const currentState = store.getServerState();

  // Check if server is running
  if (currentState.status !== 'running' || !currentState.pid) {
    logger.info(`${EMOJI_MAP.warning} MCP Server is not currently running`);
    logger.info('   Use "schiba status" to check server state');
    logger.info('   Use "schiba up" to start the server');
    return;
  }

  const spinner = ora('Stopping MCP Server...').start();

  try {
    const pid = currentState.pid;

    // Try to gracefully terminate the process
    try {
      if (options.verbose) {
        spinner.text = `Sending SIGTERM to process ${pid}...`;
      }

      process.kill(pid, 'SIGTERM');

      // Wait for graceful shutdown
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (options.force) {
            resolve(true);
          } else {
            reject(new Error('Graceful shutdown timeout'));
          }
        }, 5000);

        const checkInterval = setInterval(() => {
          try {
            process.kill(pid, 0); // Check if process still exists
          } catch (error) {
            // Process doesn't exist anymore
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    } catch (gracefulError) {
      if (options.force || (gracefulError as Error).message.includes('timeout')) {
        if (options.verbose) {
          spinner.text = `Force killing process ${pid}...`;
        }

        try {
          process.kill(pid, 'SIGKILL');
        } catch (forceError) {
          // Process might already be dead
          if (options.verbose) {
            logger.warn('Process may already be terminated');
          }
        }
      } else {
        throw gracefulError;
      }
    }

    // Final check to ensure process is terminated
    try {
      process.kill(pid, 0);
      // If we reach here, process is still running
      if (!options.force) {
        throw new Error(`Failed to terminate process ${pid}`);
      }
    } catch (error) {
      // Process is dead, which is what we want
    }

    // Update server state
    store.updateServerState({
      status: 'stopped',
      pid: undefined,
      startedAt: undefined,
    });

    // Calculate uptime
    let uptimeMessage = '';
    if (currentState.startedAt) {
      const startTime = new Date(currentState.startedAt);
      const uptime = Date.now() - startTime.getTime();
      const seconds = Math.floor(uptime / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        uptimeMessage = `Uptime: ${hours}h ${minutes % 60}m ${seconds % 60}s`;
      } else if (minutes > 0) {
        uptimeMessage = `Uptime: ${minutes}m ${seconds % 60}s`;
      } else {
        uptimeMessage = `Uptime: ${seconds}s`;
      }
    }

    spinner.succeed('MCP Server stopped successfully');

    logger.info(`\n${EMOJI_MAP.success} Schiba MCP Server has been stopped`);
    logger.info(`   Process ID: ${pid} (terminated)`);
    if (uptimeMessage) {
      logger.info(`   ${uptimeMessage}`);
    }
    logger.info(`   Port: ${currentState.port} (released)`);

    logger.info('\n🔧 Server Management:');
    logger.info('   • schiba up             - Start the server');
    logger.info('   • schiba status         - Check server status');
    logger.info('');
  } catch (error) {
    spinner.fail('Failed to stop MCP Server');

    const errorMessage = error instanceof Error ? error.message : String(error);
    store.updateServerState({
      status: 'error',
      lastError: `Stop error: ${errorMessage}`,
    });

    logger.error(
      'MCP Server shutdown failed:',
      error instanceof Error ? error : new Error(errorMessage)
    );

    logger.error(`\n${EMOJI_MAP.error} Failed to stop MCP Server`);
    logger.error(`   Error: ${errorMessage}`);
    logger.info('\n💡 Troubleshooting:');
    logger.info('   • Try force stopping: schiba down --force');
    logger.info('   • Check process manually: ps aux | grep schiba');
    logger.info('   • Kill manually: kill -9 <pid>');
    logger.info('');

    throw error;
  }
}

export function showMcpDownHelp(): void {
  logger.info('\nMCP Down command usage:');
  logger.info('  schiba down [options]');

  logger.info('\nOptions:');
  logger.info('  --force         Force kill the server process (SIGKILL)');
  logger.info('  --verbose       Enable verbose logging during shutdown');

  logger.info('\nExamples:');
  logger.info('  schiba down                    # Graceful shutdown');
  logger.info('  schiba down --force            # Force kill server');
  logger.info('  schiba down --verbose          # Detailed shutdown logs');

  logger.info('\nThe server will attempt a graceful shutdown first,');
  logger.info('waiting up to 5 seconds before force termination.');
  logger.info('');
}
