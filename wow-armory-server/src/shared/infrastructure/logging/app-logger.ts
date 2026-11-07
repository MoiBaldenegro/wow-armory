import { ConsoleLogger, LoggerService, LogLevel } from '@nestjs/common';
import {
  LOG_FORMATS,
  LOG_LEVELS,
  LogFormat,
  LogLevelName,
} from '../../../config/env.validation';
import { redact } from './redact';

export interface AppLoggerOptions {
  format: LogFormat;
  level: LogLevelName;
  /** Output sink for JSON lines. Defaults to stdout (stderr for errors). */
  write?: (line: string, level: LogLevel) => void;
}

const SEVERITY: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  log: 3,
  debug: 4,
  verbose: 5,
};

const DEFAULT_CONTEXT = 'Application';
const STACK_PATTERN = /\n\s*at /;

function defaultWrite(line: string, level: LogLevel): void {
  const stream =
    level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

export function enabledLevels(threshold: LogLevelName): LogLevel[] {
  return (Object.keys(SEVERITY) as LogLevel[]).filter(
    (level) => SEVERITY[level] <= SEVERITY[threshold],
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Error)
  );
}

/**
 * Application logger.
 *
 * - `json`: one JSON line per event with `timestamp`, `level`, `context`,
 *   `message` and any (redacted) metadata passed as an object message.
 * - `pretty`: delegates to Nest's `ConsoleLogger` (metadata is redacted too).
 */
export class AppLogger implements LoggerService {
  private readonly levels: LogLevel[];
  private readonly pretty?: ConsoleLogger;
  private readonly write: (line: string, level: LogLevel) => void;

  constructor(private readonly options: AppLoggerOptions) {
    this.levels = enabledLevels(options.level);
    this.write = options.write ?? defaultWrite;

    if (options.format === 'pretty') {
      this.pretty = new ConsoleLogger();
      this.pretty.setLogLevels(this.levels);
    }
  }

  /** Lenient factory used before configuration has been validated. */
  static fromEnv(env: Record<string, string | undefined>): AppLogger {
    const isProduction = env.NODE_ENV === 'production';
    const level = (LOG_LEVELS as readonly string[]).includes(
      env.LOG_LEVEL ?? '',
    )
      ? (env.LOG_LEVEL as LogLevelName)
      : 'log';
    const format = (LOG_FORMATS as readonly string[]).includes(
      env.LOG_FORMAT ?? '',
    )
      ? (env.LOG_FORMAT as LogFormat)
      : isProduction
        ? 'json'
        : 'pretty';

    return new AppLogger({ format, level });
  }

  isLevelEnabled(level: LogLevel): boolean {
    return this.levels.includes(level);
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('fatal', message, optionalParams);
  }

  private emit(level: LogLevel, message: unknown, params: unknown[]): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }

    const rest = [...params];
    let context = DEFAULT_CONTEXT;
    const last = rest[rest.length - 1];

    if (
      typeof last === 'string' &&
      !(level === 'error' && rest.length === 1 && STACK_PATTERN.test(last))
    ) {
      context = last;
      rest.pop();
    }

    let stack: string | undefined;
    if (
      (level === 'error' || level === 'fatal') &&
      typeof rest[0] === 'string'
    ) {
      stack = rest.shift() as string;
    }

    if (this.pretty) {
      const printable = isPlainObject(message) ? redact(message) : message;
      const args: unknown[] = stack ? [stack, context] : [context];
      this.pretty[level](printable, ...args);
      return;
    }

    let text = '';
    let meta: Record<string, unknown> = {};

    if (message instanceof Error) {
      text = message.message;
      stack = stack ?? message.stack;
    } else if (isPlainObject(message)) {
      const { message: innerMessage, ...others } = message;
      text = typeof innerMessage === 'string' ? innerMessage : '';
      meta = redact(others);
    } else {
      text = String(message);
    }

    const entry: Record<string, unknown> = {
      ...meta,
      timestamp: new Date().toISOString(),
      level,
      context,
      message: text,
    };

    if (stack) {
      entry.stack = stack;
    }

    this.write(JSON.stringify(entry), level);
  }
}
