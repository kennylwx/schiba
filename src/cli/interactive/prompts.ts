import { input, select, confirm, password } from '@inquirer/prompts';
import chalk from 'chalk';

export interface DatabaseConnectionDetails {
  dbType: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  schema?: string;
  sslMode: string;
  tag: string;
  description?: string;
  setAsDefault: boolean;
}

export class InteractivePrompts {
  public async collectConnectionDetails(): Promise<DatabaseConnectionDetails> {
    console.log(chalk.blue('\n🐕 Schiba - Interactive Connection Setup\n'));
    console.log(chalk.dim("Let's set up your database connection step by step.\n"));

    // Step 1: Database Type
    const dbType = await select({
      message: 'What type of database are you connecting to?',
      choices: [
        {
          name: 'PostgreSQL',
          value: 'postgresql',
          description: 'PostgreSQL database server',
        },
        {
          name: 'MongoDB',
          value: 'mongodb',
          description: 'MongoDB database server',
        },
      ],
    });

    // Step 2: Connection Tag
    const tag = await input({
      message: 'Enter a name/tag for this connection:',
      default: 'local',
      validate: (input: string) => {
        if (!input.trim()) return 'Connection tag cannot be empty';
        if (input.includes(' ')) return 'Connection tag cannot contain spaces';
        if (input.length > 50) return 'Connection tag must be 50 characters or less';
        return true;
      },
    });

    // Step 3: Host
    const host = await input({
      message: 'Database host:',
      default: 'localhost',
      validate: (input: string) => {
        if (!input.trim()) return 'Host cannot be empty';
        return true;
      },
    });

    // Step 4: Port
    const defaultPort = dbType === 'postgresql' ? '5432' : '27017';
    const port = await input({
      message: 'Database port:',
      default: defaultPort,
      validate: (input: string) => {
        const portNum = parseInt(input);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          return 'Port must be a valid number between 1 and 65535';
        }
        return true;
      },
    });

    // Step 5: Database Name
    const database = await input({
      message: `${dbType === 'postgresql' ? 'Database' : 'Database'} name:`,
      validate: (input: string) => {
        if (!input.trim()) return 'Database name cannot be empty';
        return true;
      },
    });

    // Step 6: Username
    const username = await input({
      message: 'Username:',
      validate: (input: string) => {
        if (!input.trim()) return 'Username cannot be empty';
        return true;
      },
    });

    // Step 7: Password
    const userPassword = await password({
      message: 'Password:',
      mask: '*',
    });

    // Step 8: Schema (PostgreSQL only)
    let schema: string | undefined;
    if (dbType === 'postgresql') {
      schema = await input({
        message: 'Schema:',
        default: 'public',
      });
    }

    // Step 9: SSL Mode
    const sslChoices =
      dbType === 'postgresql'
        ? [
            { name: 'Disable SSL (local development)', value: 'disable' },
            { name: 'Prefer SSL (recommended)', value: 'prefer' },
            { name: 'Require SSL (production)', value: 'require' },
            { name: 'Verify Certificate Authority', value: 'verify-ca' },
            { name: 'Verify Full (most secure)', value: 'verify-full' },
          ]
        : [
            { name: 'Disable SSL (local development)', value: 'disable' },
            { name: 'Enable SSL (recommended)', value: 'prefer' },
          ];

    const sslMode = await select({
      message: 'SSL/TLS configuration:',
      choices: sslChoices,
      default: host === 'localhost' || host === '127.0.0.1' ? 'disable' : 'prefer',
    });

    // Step 10: Description (optional)
    const description = await input({
      message: 'Description (optional):',
      required: false,
    });

    // Step 11: Set as Default
    const setAsDefault = await confirm({
      message: 'Set this as your default connection?',
      default: true,
    });

    return {
      dbType,
      host,
      port,
      database,
      username,
      password: userPassword,
      schema,
      sslMode,
      tag,
      description: description || undefined,
      setAsDefault,
    };
  }

  public buildConnectionString(details: DatabaseConnectionDetails): string {
    const { dbType, username, password, host, port, database, schema } = details;

    // Encode username and password to handle special characters
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);

    let connectionString = `${dbType}://${encodedUsername}:${encodedPassword}@${host}:${port}/${database}`;

    // Add schema as query parameter for PostgreSQL
    if (dbType === 'postgresql' && schema && schema !== 'public') {
      connectionString += `?schema=${encodeURIComponent(schema)}`;
    }

    return connectionString;
  }

  public async confirmConnection(details: DatabaseConnectionDetails): Promise<boolean> {
    console.log(chalk.green('\n✨ Connection Summary:'));
    console.log(chalk.dim('────────────────────────────────────────'));
    console.log(`${chalk.cyan('Tag:')} ${details.tag}`);
    console.log(`${chalk.cyan('Database:')} ${details.dbType.toUpperCase()}`);
    console.log(`${chalk.cyan('Host:')} ${details.host}:${details.port}`);
    console.log(`${chalk.cyan('Database:')} ${details.database}`);
    console.log(`${chalk.cyan('Username:')} ${details.username}`);
    console.log(`${chalk.cyan('Password:')} ${'*'.repeat(details.password.length)}`);
    if (details.schema) {
      console.log(`${chalk.cyan('Schema:')} ${details.schema}`);
    }
    console.log(`${chalk.cyan('SSL Mode:')} ${details.sslMode}`);
    if (details.description) {
      console.log(`${chalk.cyan('Description:')} ${details.description}`);
    }
    console.log(`${chalk.cyan('Default:')} ${details.setAsDefault ? 'Yes' : 'No'}`);
    console.log(chalk.dim('────────────────────────────────────────'));

    return await confirm({
      message: 'Does this look correct?',
      default: true,
    });
  }
}
