/**
 * Centralized configuration from environment variables.
 * Validates required values and provides sensible defaults.
 */

require('dotenv').config();

const REQUIRED = ['NOURA_EMAIL', 'NOURA_PASSWORD'];

function getEnv(key, defaultValue) {
  const value = process.env[key];
  if (value !== undefined && value !== '') return value;
  return defaultValue;
}

function validateConfig() {
  const missing = REQUIRED.filter((k) => !process.env[k] || process.env[k] === '');
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in your credentials.'
    );
  }
}

const config = {
  // Portal (trainee dashboard)
  baseUrl: 'https://nouradc.com/trainee',
  loginUrl: 'https://nouradc.com/trainee/Account/Login',
  email: process.env.NOURA_EMAIL,
  password: process.env.NOURA_PASSWORD,

  // Notifications
  notifyEmail: getEnv('NOTIFY_EMAIL'),
  smtp: {
    host: getEnv('SMTP_HOST'),
    port: parseInt(getEnv('SMTP_PORT', '587'), 10),
    secure: getEnv('SMTP_PORT') === '465',
    user: getEnv('SMTP_USER'),
    pass: getEnv('SMTP_PASS'),
  },
  emailEnabled:
    process.env.NOTIFY_EMAIL &&
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS,

  // Timing
  checkIntervalMs: Math.max(60_000, parseInt(getEnv('CHECK_INTERVAL_MIN', '5'), 10) * 60_000),

  // Playwright
  headless: getEnv('PLAYWRIGHT_HEADLESS', 'true') !== 'false',
  slowMo: parseInt(getEnv('PLAYWRIGHT_SLOW_MO', '0'), 10),
  timeout: 45_000,

  // Session persistence
  authStatePath: 'auth.json',
};

function init() {
  validateConfig();
  return config;
}

module.exports = { config, init };
