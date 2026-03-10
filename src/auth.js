/**
 * Authentication module for Noura portal login.
 * Uses multiple selector fallbacks for resilience against DOM changes.
 */

const logger = require('./logger');
const fs = require('fs');
const path = require('path');

// Trainee portal uses National ID / User ID - not email
const USERNAME_SELECTORS = [
  'form input[name="UserName"]',
  'form input[name="username"]',
  'form input[name="NationalId"]',
  'form input[name="NationalID"]',
  'form input[name="Id"]',
  'form input[name="Email"]',
  'input[name="UserName"]',
  'input[name="username"]',
  'input[name="NationalId"]',
  'input[name="NationalID"]',
  'input[name="Id"]',
  'input[name="Email"]',
  'input[id="UserName"]',
  'input[id="Email"]',
  'input[type="email"]',
  'form input[type="text"]',
  'input[type="text"]',
];
const PASSWORD_SELECTORS = [
  'form input[name="Password"]',
  'form input[name="password"]',
  'form input[type="password"]',
  'input[name="Password"]',
  'input[name="password"]',
  'input[id="Password"]',
  'input[type="password"]',
];
const SUBMIT_SELECTORS = [
  'input[type="submit"]',
  'button[type="submit"]',
  'button:has-text("Login")',
  'button:has-text("Sign in")',
  'button:has-text("تسجيل دخول")',
  'input[value="Login"]',
  'input[value="Sign in"]',
  'input[value="تسجيل"]',
  'form input[type="submit"]',
  'form button',
  '.btn-primary',
  'input.btn',
  'button.btn',
];

async function findAndFill(page, selectors, value, label) {
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel);
      if ((await loc.count()) > 0) {
        await loc.first().fill(value, { timeout: 5000 });
        logger.debug(`Filled ${label} using selector: ${sel}`);
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

async function findAndClick(page, selectors, label) {
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel);
      if ((await loc.count()) > 0) {
        await loc.first().click({ timeout: 5000 });
        logger.debug(`Clicked ${label} using selector: ${sel}`);
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

async function login(page, config) {
  logger.info('Navigating to login page...');
  try {
    await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded', timeout: config.timeout });
    await page.waitForLoadState('networkidle').catch(() => {});
  } catch (e) {
    logger.warn('Network idle timeout, continuing with DOM...');
  }

  await new Promise((r) => setTimeout(r, 2000));

  logger.info('Filling credentials...');
  const userFilled = await findAndFill(page, USERNAME_SELECTORS, String(config.email), 'username/id');
  const passwordFilled = await findAndFill(page, PASSWORD_SELECTORS, config.password, 'password');

  if (!userFilled) {
    throw new Error(
      'Could not find username/ID field. The trainee login form may have changed. ' +
        'Run with --debug to inspect the page.'
    );
  }
  if (!passwordFilled) {
    throw new Error(
      'Could not find password field. Run with --debug to inspect the page.'
    );
  }

  logger.info('Submitting login...');
  const submitted = await findAndClick(page, SUBMIT_SELECTORS, 'submit');
  if (!submitted) {
    throw new Error('Could not find submit button. Run with --debug to inspect the page.');
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));

  const url = page.url();
  if (url.includes('/Account/Login') && !url.includes('ReturnUrl')) {
    const hasError = await page.locator('.field-validation-error, .validation-summary-errors, .error').count() > 0;
    if (hasError) {
      const errorText = await page.locator('.field-validation-error, .validation-summary-errors').first().textContent();
      throw new Error(`Login failed: ${errorText || 'Invalid credentials or validation error.'}`);
    }
    throw new Error('Login may have failed - still on login page. Check credentials.');
  }

  logger.info('Login successful');
  return true;
}

function saveAuthState(context, authPath) {
  const resolved = path.resolve(authPath);
  context.storageState({ path: resolved });
  logger.info('Session saved to', resolved);
}

function loadAuthState(authPath) {
  const resolved = path.resolve(authPath);
  if (fs.existsSync(resolved)) {
    logger.info('Using saved session from', resolved);
    return resolved;
  }
  return null;
}

module.exports = {
  login,
  saveAuthState,
  loadAuthState,
};
