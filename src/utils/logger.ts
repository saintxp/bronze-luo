/**
 * 铜声·识洛 — Namespaced logger
 *
 * Lightweight logging with namespace prefix and level filtering.
 * In production builds, debug/info logs are stripped.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'debug';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function createLogger(namespace: string) {
  const shouldLog = (level: LogLevel): boolean =>
    LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];

  const format = (level: LogLevel, msg: string): string => {
    return `[${level.toUpperCase()}] [${namespace}] ${msg}`;
  };

  return {
    debug: (msg: string, ...args: unknown[]) => {
      if (shouldLog('debug')) console.debug(format('debug', msg), ...args);
    },
    info: (msg: string, ...args: unknown[]) => {
      if (shouldLog('info')) console.info(format('info', msg), ...args);
    },
    warn: (msg: string, ...args: unknown[]) => {
      if (shouldLog('warn')) console.warn(format('warn', msg), ...args);
    },
    error: (msg: string, ...args: unknown[]) => {
      if (shouldLog('error')) console.error(format('error', msg), ...args);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
