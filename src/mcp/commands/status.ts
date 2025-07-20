import chalk from 'chalk';
import { McpStore } from '../server/store';
import { EMOJI_MAP } from '../../utils/constants';
import { formatDuration } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export interface McpStatusOptions {
  verbose?: boolean;
  logs?: boolean;
}

export async function showMcpServerStatus(options: McpStatusOptions = {}): Promise<void> {
  const store = McpStore.getInstance();
  const currentState = store.getServerState();

  // Header
  logger.info(`\n${EMOJI_MAP.database} Schiba MCP Server Status\n`);

  // Server state
  const statusIcon = getStatusIcon(currentState.status);
  const statusColor = getStatusColor(currentState.status);

  logger.info(`${statusIcon} Status: ${statusColor(currentState.status.toUpperCase())}`);

  if (currentState.pid) {
    // Check if process is actually running
    let processRunning = false;
    try {
      process.kill(currentState.pid, 0);
      processRunning = true;
    } catch (error) {
      // Process doesn't exist
      processRunning = false;
      // Update state if it's out of sync
      if (currentState.status === 'running') {
        store.updateServerState({
          status: 'stopped',
          pid: undefined,
          startedAt: undefined,
        });
      }
    }

    if (processRunning) {
      logger.info(chalk.green(`   Process ID: ${currentState.pid} (running)`));
    } else {
      logger.info(chalk.red(`   Process ID: ${currentState.pid} (not found)`));
    }
  }

  logger.info(chalk.dim(`   Port: ${currentState.port}`));

  // Uptime calculation
  if (currentState.startedAt && currentState.status === 'running') {
    const startTime = new Date(currentState.startedAt);
    const uptime = Date.now() - startTime.getTime();
    const uptimeFormatted = formatDuration(uptime / 1000);

    logger.info(chalk.dim(`   Started: ${startTime.toLocaleString()}`));
    logger.info(chalk.green(`   Uptime: ${uptimeFormatted}`));
  }

  // Error information
  if (currentState.lastError) {
    logger.info(chalk.red(`   Last Error: ${currentState.lastError}`));
  }

  // Transport information
  if (currentState.status === 'running') {
    logger.info(chalk.dim(`   Transport: stdio (MCP standard)`));
    logger.info(chalk.dim(`   Protocol: Model Context Protocol v1.0`));
  }

  // Connection count
  try {
    const connections = store.getConnections();
    logger.info(chalk.dim(`   Cached Connections: ${connections.length}`));
  } catch (error) {
    logger.info(chalk.dim(`   Cached Connections: Unable to determine`));
  }

  // Available tools (if server is running)
  if (currentState.status === 'running') {
    logger.info(chalk.dim('\n📋 Available MCP Tools:'));
    const tools = [
      'list_connections',
      'fetch_schema',
      'test_connection',
      'add_connection',
      'remove_connection',
      'update_connection',
      'set_default_connection',
      'get_operation_logs',
    ];

    tools.forEach((tool) => {
      logger.info(chalk.dim(`   • ${tool}`));
    });
  }

  // Recent operation logs (if verbose or logs option)
  if (options.logs || options.verbose) {
    logger.info(chalk.dim('\n📊 Recent Operations:'));
    try {
      const recentLogs = store.getRecentOperations(10);

      if (recentLogs.length === 0) {
        logger.info(chalk.dim('   No operations recorded'));
      } else {
        recentLogs.forEach((log) => {
          const timestamp = new Date(log.timestamp).toLocaleTimeString();
          const statusIcon = log.success ? chalk.green('✓') : chalk.red('✗');
          const duration = log.duration ? ` (${log.duration}ms)` : '';

          logger.info(`   ${statusIcon} ${timestamp} ${log.operation}${duration}`);
          if (log.connectionTag) {
            logger.info(chalk.dim(`     Connection: ${log.connectionTag}`));
          }
          if (log.error) {
            logger.info(chalk.red(`     Error: ${log.error}`));
          }
        });
      }
    } catch (error) {
      logger.info(chalk.red('   Unable to retrieve operation logs'));
    }
  }

  // Action suggestions
  logger.info(chalk.dim('\n🔧 Available Actions:'));

  if (currentState.status === 'running') {
    logger.info(chalk.dim('   • schiba down           - Stop the server'));
    logger.info(chalk.dim('   • schiba status --logs  - Show recent operations'));
  } else {
    logger.info(chalk.dim('   • schiba up             - Start the server'));
    logger.info(chalk.dim('   • schiba up --verbose   - Start with detailed logs'));
  }

  logger.info(chalk.dim('   • schiba list           - Show database connections'));
  logger.info(chalk.dim('   • schiba fetch          - Extract schema'));

  // Verbose information
  if (options.verbose) {
    logger.info(chalk.dim('\n🔍 System Information:'));
    logger.info(chalk.dim(`   Node.js: ${process.version}`));
    logger.info(chalk.dim(`   Platform: ${process.platform} ${process.arch}`));
    logger.info(chalk.dim(`   PID: ${process.pid}`));
    logger.info(chalk.dim(`   Working Directory: ${process.cwd()}`));

    // Memory usage
    const memoryUsage = process.memoryUsage();
    logger.info(chalk.dim(`   Memory RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`));
    logger.info(chalk.dim(`   Memory Heap: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`));
  }

  logger.info('');
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'running':
      return chalk.green(EMOJI_MAP.success);
    case 'stopped':
      return chalk.yellow(EMOJI_MAP.warning);
    case 'error':
      return chalk.red(EMOJI_MAP.error);
    default:
      return chalk.dim(EMOJI_MAP.info);
  }
}

function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'running':
      return chalk.green;
    case 'stopped':
      return chalk.yellow;
    case 'error':
      return chalk.red;
    default:
      return chalk.dim;
  }
}

export function showMcpStatusHelp(): void {
  logger.info('\nMCP Status command usage:');
  logger.info('  schiba status [options]');

  logger.info('\nOptions:');
  logger.info('  --verbose       Show detailed system information');
  logger.info('  --logs          Show recent operation logs');

  logger.info('\nExamples:');
  logger.info('  schiba status               # Basic status information');
  logger.info('  schiba status --verbose     # Detailed status with system info');
  logger.info('  schiba status --logs        # Status with recent operations');

  logger.info('\nThe status command shows the current state of the MCP server,');
  logger.info('including process information, uptime, and available tools.');
  logger.info('');
}
