import chalk from 'chalk';
import { EMOJI_MAP } from './constants';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.INFO;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  private log(level: LogLevel, prefix: string, message: string, args: unknown[] = []): void {
    if (this.level <= level) {
      process.stdout.write(`${prefix} ${message}\n`);
      if (args.length > 0) {
        args.forEach((arg) => {
          if (arg instanceof Error) {
            process.stdout.write(`${chalk.red(arg.stack || arg.message)}\n`);
          } else {
            process.stdout.write(`${String(arg)}\n`);
          }
        });
      }
    }
  }

  public debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, chalk.gray(`${EMOJI_MAP.info} DEBUG:`), message, args);
  }

  public info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, chalk.blue(`${EMOJI_MAP.info}`), message, args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, chalk.yellow(`${EMOJI_MAP.warning} WARNING:`), message, args);
  }

  public error(message: string, error?: Error, ...args: unknown[]): void {
    this.log(
      LogLevel.ERROR,
      chalk.red(`${EMOJI_MAP.error} ERROR:`),
      message,
      [error, ...args].filter(Boolean)
    );
  }

  public success(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, chalk.green(`${EMOJI_MAP.success}`), message, args);
  }
}

export const logger = Logger.getInstance();
