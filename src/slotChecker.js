/**
 * Slot check loop: detect when "Sorry, Slots Are Not Available" disappears.
 */

const logger = require('./logger');
const { hasNoSlotsMessage, switchToEnglish, navigateToBookingPage, isTrainingIncomplete } = require('./portal');
const { notify } = require('./notifier');
const { login, saveAuthState } = require('./auth');

async function runCheckLoop(page, context, config) {
  const authStatePath = config.authStatePath;
  const checkIntervalMs = config.checkIntervalMs;

  let checkCount = 0;

  async function ensureOnBookingPage() {
    const url = page.url();
    if (url.includes('/Account/Login')) {
      logger.info('Session expired, re-logging in...');
      await login(page, config);
      await switchToEnglish(page, config);

      if (await isTrainingIncomplete(page)) {
        logger.info('Training path is incomplete — booking not available yet. Skipping check.');
        return false;
      }

      await navigateToBookingPage(page, config);
      saveAuthState(context, authStatePath);
    }
    return true;
  }

  async function performCheck() {
    checkCount += 1;
    logger.info(`Check #${checkCount} - ${new Date().toLocaleTimeString()}`);

    const ready = await ensureOnBookingPage();
    if (!ready) return false;

    try {
      await page.reload({ waitUntil: 'networkidle', timeout: config.timeout });
      await new Promise((r) => setTimeout(r, 2000));

      const noSlots = await hasNoSlotsMessage(page);
      if (!noSlots) {
        logger.info('SLOTS DETECTED! Sending notifications...');
        await notify(config);
        return true;
      }
      logger.info('No slots available yet');
      return false;
    } catch (err) {
      logger.warn('Check failed:', err.message);
      return false;
    }
  }

  // First check
  const found = await performCheck();
  if (found) return;

  // Loop
  while (true) {
    await new Promise((r) => setTimeout(r, checkIntervalMs));
    const foundAgain = await performCheck();
    if (foundAgain) break;
  }
}

module.exports = { runCheckLoop };
