import clipboardy from 'clipboardy';
import chalk from 'chalk';
import { configManager } from '../../config/manager';
import { logger } from '../../utils/logger';
import { EMOJI_MAP } from '../../utils/constants';

export async function copyConnectionString(
  tag?: string,
  property?: 'host' | 'port' | 'schemas' | 'username' | 'password' | 'database'
): Promise<void> {
  try {
    const connectionConfig = configManager.get(tag);
    const url = new URL(connectionConfig.url);

    let valueToCopy: string | undefined;
    let propertyName = 'Connection string';

    if (property) {
      switch (property) {
        case 'host':
          valueToCopy = url.hostname;
          propertyName = 'Host';
          break;
        case 'port':
          valueToCopy = url.port;
          propertyName = 'Port';
          break;
        case 'schemas': {
          const schemas = new URLSearchParams(url.search).get('schema');
          if (schemas) {
            valueToCopy = schemas;
            propertyName = 'Schemas';
          }
          break;
        }
        case 'username':
          valueToCopy = url.username;
          propertyName = 'Username';
          break;
        case 'password':
          valueToCopy = url.password;
          propertyName = 'Password';
          break;
        case 'database': {
          const pathParts = url.pathname.split('/');
          if (pathParts[1]) {
            valueToCopy = pathParts[1];
            propertyName = 'Database';
          }
          break;
        }
        default:
          logger.error(`Invalid property: ${property}`);
          console.log(
            chalk.yellow(
              '\nAvailable properties: host, port, schemas, username, password, database\n'
            )
          );
          return;
      }

      if (!valueToCopy) {
        logger.error(`${propertyName} not found in the connection string for '${tag}'.`);
        return;
      }
    } else {
      valueToCopy = connectionConfig.url;
    }

    await clipboardy.write(valueToCopy);

    console.log(
      chalk.green(
        `
${EMOJI_MAP.success} ${propertyName} for '${connectionConfig.tag}' copied to clipboard!\n`
      )
    );
  } catch (error) {
    logger.error(`Failed to copy connection string: ${(error as Error).message}`);
    console.log(chalk.yellow('\nUsage: schiba copy <tag> [property]'));
    console.log(chalk.yellow('Example: schiba copy beta host'));
    throw error;
  }
}
