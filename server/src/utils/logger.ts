type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const colors: Record<LogLevel, string> = {
  info: '\x1b[36m',    // cyan
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  debug: '\x1b[35m',   // magenta
};

const reset = '\x1b[0m';

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const color = colors[level];
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}${metaStr}`;
}

export const logger = {
  info(message: string, meta?: unknown) {
    console.log(formatMessage('info', message, meta));
  },
  warn(message: string, meta?: unknown) {
    console.warn(formatMessage('warn', message, meta));
  },
  error(message: string, meta?: unknown) {
    console.error(formatMessage('error', message, meta));
  },
  debug(message: string, meta?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};
