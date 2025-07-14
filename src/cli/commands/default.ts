import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';

export async function setDefaultConnection(tag: string): Promise<void> {
  try {
    configManager.setDefault(tag);
  } catch (error) {
    logger.error(`Failed to set default connection: ${(error as Error).message}`);
    throw error;
  }
}
