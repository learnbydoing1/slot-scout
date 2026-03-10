#!/usr/bin/env node
/**
 * Noura Driving School - Final Road Test Slot Checker
 *
 * Logs into nouradc.com, switches to English, navigates to the booking page,
 * and polls for slot availability. Sends desktop + email notifications when slots appear.
 *
 * Usage:
 *   npm start       - Run headless, continuous loop
 *   npm run debug   - Run with visible browser for selector troubleshooting
 *   npm run check   - Single check then exit
 */

const { chromium } = require('playwright');
const { config, init } = require('./config');
const logger = require('./logger');
const { login, saveAuthState, loadAuthState } = require('./auth');
const { switchToEnglish, navigateToBookingPage, dismissOverlay } = require('./portal');
const { runCheckLoop } = require('./slotChecker');

const isDebug = process.argv.includes('--debug');
const runOnce = process.argv.includes('--once');

async function main() {
  init();
  const cfg = config;

  const launchOpts = {
    headless: isDebug ? false : cfg.headless,
    slowMo: isDebug ? 500 : cfg.slowMo,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    timeout: cfg.timeout,
  };

  logger.info('Starting Noura Slot Checker...');
  if (isDebug) logger.info('Debug mode: browser will be visible');

  const browser = await chromium.launch(launchOpts);
  const authState = loadAuthState(cfg.authStatePath);

  const contextOpts = {
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
    timeout: cfg.timeout,
    ...(authState && { storageState: authState }),
  };

  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down...`);
    await browser.close();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    logger.info('Loading trainee portal...');
    await page.goto(cfg.baseUrl, { waitUntil: 'domcontentloaded', timeout: cfg.timeout });
    await page.waitForLoadState('networkidle').catch(() => logger.warn('Waiting for network...'));
    await new Promise((r) => setTimeout(r, 2000));
    await dismissOverlay(page);

    const currentUrl = page.url();
    if (currentUrl.includes('/Account/Login')) {
      logger.info('Login required...');
      await login(page, cfg);
      await switchToEnglish(page, cfg);
      saveAuthState(context, cfg.authStatePath);
    } else {
      logger.info('Using existing session');
      await dismissOverlay(page);
      await switchToEnglish(page, cfg);
    }

    await navigateToBookingPage(page, cfg);

    if (runOnce) {
      const { hasNoSlotsMessage } = require('./portal');
      const noSlots = await hasNoSlotsMessage(page);
      if (!noSlots) {
        logger.info('Slots may be available!');
        const { notify } = require('./notifier');
        await notify(cfg);
      } else {
        logger.info('No slots available');
      }
      await browser.close();
      return;
    }

    await runCheckLoop(page, context, cfg);
  } catch (err) {
    logger.error(err.message);
    if (isDebug) logger.error(err.stack);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
