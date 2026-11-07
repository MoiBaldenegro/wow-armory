import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { AppLogger, enabledLevels } from './app-logger';
import { REDACTED } from './redact';

function jsonLogger(level: 'error' | 'warn' | 'log' | 'debug' | 'verbose') {
  const lines: Array<{ line: string; level: LogLevel }> = [];
  const logger = new AppLogger({
    format: 'json',
    level,
    write: (line, writtenLevel) => lines.push({ line, level: writtenLevel }),
  });

  return {
    logger,
    lines,
    parsed: () => lines.map(({ line }) => JSON.parse(line)),
  };
}

describe('AppLogger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes one JSON line per event with timestamp, level, context and message', () => {
    const { logger, lines, parsed } = jsonLogger('log');

    logger.log('server started', 'Bootstrap');
    logger.warn('careful');

    expect(lines).toHaveLength(2);
    expect(lines[0].line).not.toContain('\n');

    const [first, second] = parsed();
    expect(first).toEqual({
      timestamp: expect.any(String),
      level: 'log',
      context: 'Bootstrap',
      message: 'server started',
    });
    expect(new Date(first.timestamp).toISOString()).toBe(first.timestamp);
    expect(second).toMatchObject({
      level: 'warn',
      context: 'Application',
      message: 'careful',
    });
  });

  it('respects LOG_LEVEL', () => {
    const { logger, parsed } = jsonLogger('warn');

    logger.verbose('verbose');
    logger.debug('debug');
    logger.log('log');
    logger.warn('warn');
    logger.error('error');
    logger.fatal('fatal');

    expect(parsed().map((entry) => entry.level)).toEqual([
      'warn',
      'error',
      'fatal',
    ]);
  });

  it('computes enabled levels from the threshold', () => {
    expect(enabledLevels('error')).toEqual(['fatal', 'error']);
    expect(enabledLevels('verbose')).toHaveLength(6);
  });

  it('includes the stack for errors and keeps the context', () => {
    const { logger, parsed } = jsonLogger('log');

    logger.error('boom', 'Error: boom\n    at somewhere', 'ExceptionsHandler');
    logger.error(new Error('kaput'), 'Bootstrap');

    const [first, second] = parsed();
    expect(first).toMatchObject({
      level: 'error',
      context: 'ExceptionsHandler',
      message: 'boom',
      stack: 'Error: boom\n    at somewhere',
    });
    expect(second).toMatchObject({
      context: 'Bootstrap',
      message: 'kaput',
    });
    expect(second.stack).toContain('kaput');
  });

  it('flattens object messages as redacted metadata without overriding core fields', () => {
    const { logger, parsed } = jsonLogger('log');

    logger.log(
      {
        message: 'event',
        level: 'spoofed',
        accessToken: 'ACCESS-SENTINEL',
        nested: { Cookie: 'COOKIE-SENTINEL' },
        statusCode: 200,
      },
      'HTTP',
    );

    const [entry] = parsed();
    expect(entry).toMatchObject({
      level: 'log',
      context: 'HTTP',
      message: 'event',
      accessToken: REDACTED,
      nested: { Cookie: REDACTED },
      statusCode: 200,
    });
    expect(JSON.stringify(entry)).not.toContain('SENTINEL');
  });

  it('writes errors to the error level sink', () => {
    const { logger, lines } = jsonLogger('log');

    logger.error('failed');

    expect(lines[0].level).toBe('error');
  });

  it('delegates to the Nest ConsoleLogger in pretty mode', () => {
    const log = jest
      .spyOn(ConsoleLogger.prototype, 'log')
      .mockImplementation(() => undefined);
    const warn = jest
      .spyOn(ConsoleLogger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const setLogLevels = jest.spyOn(ConsoleLogger.prototype, 'setLogLevels');

    const logger = new AppLogger({ format: 'pretty', level: 'warn' });
    logger.log({ message: 'hidden', token: 'TOKEN-SENTINEL' }, 'Ctx');
    logger.warn({ message: 'shown', token: 'TOKEN-SENTINEL' }, 'Ctx');

    expect(setLogLevels).toHaveBeenCalledWith(['fatal', 'error', 'warn']);
    expect(log).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      { message: 'shown', token: REDACTED },
      'Ctx',
    );
  });

  it('builds a lenient logger from raw env values', () => {
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    const logger = AppLogger.fromEnv({
      NODE_ENV: 'production',
      LOG_LEVEL: 'nonsense',
    });
    logger.log('hello', 'Test');

    expect(write).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(write.mock.calls[0][0]))).toMatchObject({
      level: 'log',
      message: 'hello',
    });
  });
});
