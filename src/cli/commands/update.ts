import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';

export type UpdateProperty =
  | 'ssl'
  | 'username'
  | 'password'
  | 'host'
  | 'port'
  | 'database'
  | 'schema';

export async function updateConnection(
  tag: string,
  property: UpdateProperty,
  value: string
): Promise<void> {
  try {
    configManager.update(tag, property, value);
  } catch (error) {
    logger.error(`Failed to update connection: ${(error as Error).message}`);
    throw error;
  }
}
