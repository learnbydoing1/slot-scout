/**
 * Portal navigation: switch to English, navigate to "Book Final Road Test" page.
 * Uses flexible selectors to handle various DOM structures.
 */

const logger = require('./logger');

const NO_SLOTS_MESSAGE = 'Sorry, Slots Are Not Available Right Now.';
const NO_SLOTS_SELECTOR = 'div.msg-show';
const BOOK_FINAL_ROAD_TEST_TEXT = /book\s*final\s*road\s*test/i;

// Language switcher: dropdown, link, or button with "English"
const LANGUAGE_SELECTORS = [
  { type: 'select', selector: 'select[name*="lang"], select[id*="lang"], select.language' },
  { type: 'option', selector: 'option:has-text("English"), option[value="en"], option[value="English"]' },
  { type: 'link', selector: 'a:has-text("English"), a[href*="lang=en"], [data-lang="en"]' },
  { type: 'link', selector: '[class*="language"] a, [class*="lang"] a' },
];

// Sidebar 4th item or text "Book Final Road Test"
const BOOKING_MENU_SELECTORS = [
  'a:has-text("Book Final Road Test")',
  'a:has-text("Book Final Road")',
  'a:has-text("Final Road Test")',
  '[href*="BookFinalRoadTest"]',
  '[href*="book-final-road"]',
  '[href*="BookRoadTest"]',
  '[href*="FinalRoadTest"]',
  'nav a:nth-of-type(4)',
  'aside a:nth-of-type(4)',
  '.sidebar a:nth-of-type(4)',
  '.nav-menu a:nth-of-type(4)',
  '.list-group a:nth-of-type(4)',
  '.menu a:nth-of-type(4)',
  'ul.nav a:nth-of-type(4)',
  '.nav-link:nth-of-type(4)',
  '[role="navigation"] a:nth-of-type(4)',
  'a[href*="RoadTest"], a[href*="roadtest"]',
  'li:nth-child(4) a',
  '.sidebar li:nth-child(4) a',
  'aside li:nth-child(4) a',
  'nav li:nth-child(4) a',
  '.menu li:nth-child(4) a',
  '.list-group li:nth-child(4) a, .list-group .list-group-item:nth-child(4) a',
];

async function dismissOverlay(page) {
  // SweetAlert/cookie overlays can block clicks - dismiss them first
  try {
    const overlay = page.locator('.sweet-overlay');
    if ((await overlay.count()) > 0) {
      // Try clicking OK/Confirm button inside sweet-alert
      const btn = page.locator('.sweet-alert button, .sweet-alert a, .sweet-alert [role="button"]').first();
      if (await btn.count() > 0) {
        await btn.click({ force: true, timeout: 3000 });
        await new Promise((r) => setTimeout(r, 500));
        return;
      }
      // Fallback: hide overlay via JS so we can interact with page
      await page.evaluate(() => {
        document.querySelectorAll('.sweet-overlay, .sweet-alert').forEach((el) => {
          el.style.display = 'none';
          el.style.pointerEvents = 'none';
        });
      });
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch {
    // Overlay might have different structure or already gone
  }
}

async function switchToEnglish(page, config) {
  logger.info('Switching portal to English...');

  await dismissOverlay(page);

  // Try select dropdown first
  const selectEl = page.locator('select').filter({ has: page.locator('option').filter({ hasText: /english/i }) }).first();
  if (await selectEl.count() > 0) {
    try {
      await selectEl.selectOption({ label: 'English' });
    } catch {
      await selectEl.selectOption({ index: 1 });
    }
    await page.waitForLoadState('networkidle');
    logger.info('Language switched via select dropdown');
    return true;
  }

  // Try clicking link/button with "English"
  const englishLink = page.getByRole('link', { name: /english/i }).first();
  if (await englishLink.count() > 0) {
    await englishLink.click();
    await page.waitForLoadState('networkidle');
    logger.info('Language switched via English link');
    return true;
  }

  // Try custom dropdown: click trigger then option
  const langTrigger = page.locator(
    '[class*="language"], [class*="lang"], [id*="lang"], .dropdown, select'
  ).first();
  if (await langTrigger.count() > 0) {
    await langTrigger.click({ force: true });
    await new Promise((r) => setTimeout(r, 500));
    const opt = page.locator('option:has-text("English"), [role="option"]:has-text("English"), a:has-text("English")').first();
    if (await opt.count() > 0) {
      await opt.click();
      await page.waitForLoadState('networkidle');
      logger.info('Language switched via custom dropdown');
      return true;
    }
  }

  logger.warn(
    'Could not find language switcher. Site may already be in English or structure changed. ' +
      'Continuing with booking page navigation...'
  );
  return false;
}

async function navigateToBookingPage(page, config) {
  logger.info('Navigating to Book Final Road Test page...');

  await page.waitForLoadState('networkidle').catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));

  const clickedViaEval = await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    for (const a of links) {
      const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
      if (/book\s*final\s*road\s*test/i.test(text)) {
        a.click();
        return true;
      }
    }
    return false;
  });
  if (clickedViaEval) {
    await page.waitForLoadState('networkidle');
    await new Promise((r) => setTimeout(r, 2000));
    logger.info('Reached booking page via evaluate');
    return true;
  }

  try {
    const bookingLink = page.getByRole('link', { name: /book\s*final\s*road\s*test/i });
    if ((await bookingLink.count()) > 0) {
      await bookingLink.first().click();
      await page.waitForLoadState('networkidle');
      await new Promise((r) => setTimeout(r, 1500));
      logger.info('Reached booking page via role locator');
      return true;
    }
  } catch (e) {
    logger.debug('Role locator failed:', e.message);
  }

  for (const sel of BOOKING_MENU_SELECTORS) {
    try {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await el.click();
        await page.waitForLoadState('networkidle');
        await new Promise((r) => setTimeout(r, 1500));

        const hasNoSlots = await page.getByText(NO_SLOTS_MESSAGE).count() > 0;
        const hasSlotsUI = await page.locator('[class*="slot"], [class*="calendar"], [class*="booking"], table').count() > 0;

        if (hasNoSlots || hasSlotsUI || page.url().toLowerCase().includes('book') || page.url().toLowerCase().includes('test')) {
          logger.info('Reached booking page');
          return true;
        }
      }
    } catch (e) {
      logger.debug(`Selector ${sel} failed:`, e.message);
      continue;
    }
  }

  // Fallback: get all links in main/sidebar area, find one matching "Book Final Road Test"
  const sidebar = page.locator('nav, aside, .sidebar, .menu, .nav, [class*="side"]');
  const links = await (await sidebar.count() > 0 ? sidebar.first().locator('a') : page.locator('a')).all();
  for (const link of links) {
    try {
      const text = await link.textContent();
      if (text && BOOK_FINAL_ROAD_TEST_TEXT.test(text.trim().replace(/\s+/g, ' '))) {
        await link.click();
        await page.waitForLoadState('networkidle');
        await new Promise((r) => setTimeout(r, 1500));
        logger.info('Reached booking page via text match');
        return true;
      }
    } catch {
      continue;
    }
  }

  const fourthLink = page.locator('nav a, aside a, .sidebar a, .menu a, ul a').nth(3);
  if ((await fourthLink.count()) > 0) {
    try {
      await fourthLink.click();
      await page.waitForLoadState('networkidle');
      await new Promise((r) => setTimeout(r, 1500));
      logger.info('Reached booking page via 4th nav item');
      return true;
    } catch (e) {
      logger.debug('4th item click failed:', e.message);
    }
  }

  const directUrl = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href]');
    for (const a of links) {
      const text = (a.textContent || '').trim();
      if (/book\s*final\s*road|road\s*test|final\s*test/i.test(text)) {
        const href = a.getAttribute('href') || '';
        if (href.startsWith('/') || href.includes('nouradc')) return href;
      }
    }
    return null;
  });
  if (directUrl) {
    const baseUrl = (config && config.baseUrl) || 'https://nouradc.com/trainee';
    const fullUrl = directUrl.startsWith('http') ? directUrl : new URL(directUrl, baseUrl).href;
    await page.goto(fullUrl, { waitUntil: 'networkidle' });
    await new Promise((r) => setTimeout(r, 2000));
    logger.info('Reached booking page via direct URL');
    return true;
  }

  throw new Error(
    'Could not find "Book Final Road Test" menu item. Run with --debug to inspect the sidebar.'
  );
}

async function acceptTermsAndConditions(page) {
  try {
    await new Promise((r) => setTimeout(r, 2000));

    const modal = page.locator(
      '[class*="modal"]:has-text("TermsCondition"), [class*="modal"]:has-text("FinaRoadTest"), [class*="modal"]:has-text("Terms"), .modal.show, .modal.in, .modal-dialog, [role="dialog"]'
    ).first();
    if ((await modal.count()) === 0) return false;
    if (!(await modal.isVisible())) return false;

    logger.info('Terms & Conditions popup detected, scrolling and accepting...');

    const scrollToBottom = async (scrollable) => {
      await scrollable.evaluate((node) => {
        const scrollHeight = node.scrollHeight;
        node.scrollTop = scrollHeight;
      });
    };

    const scrollSelectors = ['.modal-body', '.modal-content', '[class*="scroll"]'];
    for (const sel of scrollSelectors) {
      try {
        const scrollable = modal.locator(sel).first();
        if ((await scrollable.count()) === 0) continue;
        const el = scrollable.first();
        await scrollToBottom(el);
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        continue;
      }
    }

    await modal.evaluate((node) => {
      const bodies = node.querySelectorAll('.modal-body, [class*="modal-body"], [class*="content"]');
      bodies.forEach((body) => {
        if (body.scrollHeight > body.clientHeight) {
          body.scrollTop = body.scrollHeight;
        }
      });
    }).catch(() => {});

    const modalBody = modal.locator('.modal-body').first();
    if ((await modalBody.count()) > 0) {
      await modalBody.hover();
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 400);
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    await new Promise((r) => setTimeout(r, 1000));

    const agreeSelectors = [
      'button:has-text("I AGREE")',
      'button:has-text("I agree")',
      'button:has-text("I Agree")',
      'a:has-text("I AGREE")',
      'a:has-text("I agree")',
      'input[value="I AGREE"]',
      'input[value="I agree"]',
      'button:has-text("موافق")',
      '.modal-footer .btn-primary:has-text("I AGREE")',
      '.modal-footer .btn-primary:has-text("I agree")',
      '.modal-footer .btn-primary',
    ];

    for (const sel of agreeSelectors) {
      try {
        const btn = modal.locator(sel).filter({ hasNotText: /disagree/i });
        if ((await btn.count()) > 0) {
          const firstBtn = btn.first();
          await firstBtn.scrollIntoViewIfNeeded();
          await new Promise((r) => setTimeout(r, 500));
          const text = await firstBtn.textContent();
          if (text && /disagree/i.test(text)) continue;
          await firstBtn.click({ force: true, timeout: 5000 });
          await new Promise((r) => setTimeout(r, 1500));
          logger.info('Terms accepted via:', sel);
          return true;
        }
      } catch {
        continue;
      }
    }

    const agreeBtn = page.locator('button, a, input[type="button"], input[type="submit"]').filter({
      hasText: /^i\s*agree$|(?<!dis)agree|موافق/i,
      hasNotText: /disagree/i,
    });
    if ((await agreeBtn.count()) > 0) {
      const btn = agreeBtn.first();
      await btn.scrollIntoViewIfNeeded();
      await new Promise((r) => setTimeout(r, 300));
      await btn.click({ force: true, timeout: 5000 });
      await new Promise((r) => setTimeout(r, 1500));
      logger.info('Terms accepted via filter locator');
      return true;
    }

    const agreeViaEval = await page.evaluate(() => {
      const tryClick = (el) => {
        if (!el) return false;
        const text = (el.textContent || el.value || '').trim().toUpperCase();
        if (!text.includes('I AGREE') || text.includes('DISAGREE')) return false;
        el.scrollIntoView({ block: 'center' });
        el.focus();
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        el.click();
        return true;
      };
      const primaryBtn = document.querySelector('.modal-footer .btn-primary, .modal .btn-primary');
      if (tryClick(primaryBtn)) return true;
      const modals = document.querySelectorAll('.modal, .modal-dialog, [role="dialog"]');
      for (const modal of modals) {
        const btns = modal.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]');
        for (const b of btns) {
          if (tryClick(b)) return true;
        }
      }
      return false;
    });
    if (agreeViaEval) {
      await new Promise((r) => setTimeout(r, 1500));
      logger.info('Terms accepted via evaluate click');
      return true;
    }

    const clicked = await page.evaluate(() => {
      const all = document.querySelectorAll('.modal button, .modal a, .modal-footer button, .modal-footer a, [role="dialog"] button, [role="dialog"] a');
      for (const el of all) {
        const t = (el.textContent || '').trim().toUpperCase();
        if (t.includes('I AGREE') && !t.includes('DISAGREE')) {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          el.click();
          return true;
        }
      }
      return false;
    });
    if (clicked) {
      await new Promise((r) => setTimeout(r, 1500));
      logger.info('Terms accepted via XPath click');
      return true;
    }

    const agreeBtnLoc = modal.locator('button, a').filter({ hasText: /i\s*agree/i, hasNotText: /disagree/i }).first();
    if ((await agreeBtnLoc.count()) > 0) {
      try {
        const box = await agreeBtnLoc.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await new Promise((r) => setTimeout(r, 1500));
          logger.info('Terms accepted via mouse click coords');
          return true;
        }
      } catch {
        // fall through
      }
    }

    logger.warn('Could not find I agree button in T&C popup');
    return false;
  } catch (e) {
    logger.debug('No T&C popup or error:', e.message);
    return false;
  }
}

async function isTrainingIncomplete(page) {
  return page.evaluate(() => {
    const body = document.body.innerText || '';
    const progressMatch = body.match(/(\d+)\s*%/);
    if (!progressMatch) return false;
    const pct = parseInt(progressMatch[1], 10);
    if (pct >= 100) return false;

    const hasTrainingPath = /training\s*path/i.test(body);
    const hasDashboard = /welcome\s.*\sto\s/i.test(body) || /your\s*training\s*progress/i.test(body);
    return hasTrainingPath && hasDashboard;
  });
}

function getNoSlotsSelector() {
  return NO_SLOTS_MESSAGE;
}

async function isTermsPopupVisible(page) {
  try {
    const modal = page.locator('.modal.show, .modal.in, .modal-dialog, [role="dialog"]').filter({ hasText: /terms|condition|agree|disagree/i }).first();
    return (await modal.count()) > 0 && (await modal.isVisible());
  } catch {
    return false;
  }
}

async function hasNoSlotsMessage(page) {
  const found = await page.evaluate(() => {
    const el = document.querySelector('div.msg-show');
    if (!el) return false;
    const text = (el.textContent || '').toLowerCase();
    return text.includes('sorry') && (text.includes('not available') || text.includes('slots'));
  });
  return found;
}

module.exports = {
  switchToEnglish,
  navigateToBookingPage,
  dismissOverlay,
  acceptTermsAndConditions,
  isTermsPopupVisible,
  isTrainingIncomplete,
  getNoSlotsSelector,
  hasNoSlotsMessage,
};
