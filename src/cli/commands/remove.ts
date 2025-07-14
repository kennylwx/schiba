import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';

export async function removeConnection(tag: string): Promise<void> {
  try {
    configManager.remove(tag);
  } catch (error) {
    logger.error(`Failed to remove connection: ${(error as Error).message}`);
    throw error;
  }
}
