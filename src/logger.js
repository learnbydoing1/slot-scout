/**
 * Simple timestamped logger for consistent console output.
 */

const PREFIX = '[Noura]';

function timestamp() {
  return new Date().toISOString();
}

function format(level, ...args) {
  return [`${timestamp()} ${PREFIX} [${level}]`, ...args];
}

const logger = {
  info(...args) {
    console.log(...format('INFO', ...args));
  },
  warn(...args) {
    console.warn(...format('WARN', ...args));
  },
  error(...args) {
    console.error(...format('ERROR', ...args));
  },
  debug(...args) {
    if (process.env.DEBUG) {
      console.debug(...format('DEBUG', ...args));
    }
  },
};

module.exports = logger;
