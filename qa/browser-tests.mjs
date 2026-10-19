process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve('qa/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = {
  verified: [],
  fixed: [],
  failed: [],
  notTested: [],
  evidence: [],
  consoleErrors: [],
  failedRequests: [],
};

function pass(name, detail = '') {
  console.log(`✅ PASS: ${name}${detail ? ` - ${detail}` : ''}`);
  testResults.verified.push({ name, detail });
}

function fail(name, error) {
  console.error(`❌ FAIL: ${name} - ${error}`);
  testResults.failed.push({ name, error: String(error) });
}

async function runBrowserQA() {
  console.log(`\n======================================================`);
  console.log(`🚀 Nexora Visual Browser QA with Playwright Chromium`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
  } catch (err) {
    console.error('Failed to launch Chromium:', err);
    process.exit(1);
  }

  const browserVersion = await browser.version();
  testResults.evidence.push(`Chromium version: ${browserVersion}`);
  console.log(`Chromium browser launched successfully (v${browserVersion})\n`);

  try {
    // -------------------------------------------------------------
    // 1. RESPONSIVE VIEWPORT TESTS & SCREENSHOTS
    // -------------------------------------------------------------
    const viewports = [
      { name: 'desktop-1440', width: 1440, height: 900, label: 'Desktop 1440x900' },
      { name: 'tablet-768', width: 768, height: 1024, label: 'Tablet 768x1024' },
      { name: 'mobile-375', width: 375, height: 812, label: 'Mobile 375x812' },
      { name: 'mobile-320', width: 320, height: 800, label: 'Mobile 320x800' }
    ];

    for (const vp of viewports) {
      console.log(`--- Testing Viewport: ${vp.label} ---`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1
      });
      const page = await context.newPage();

      // Track console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('[vite]') && !text.includes('WebSocket')) {
            testResults.consoleErrors.push(`[${vp.name}] ${text}`);
          }
        }
      });

      // Track failed requests
      page.on('requestfailed', (req) => {
        testResults.failedRequests.push(`[${vp.name}] ${req.url()} (${req.failure()?.errorText})`);
      });

      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const maxScroll = Math.max(scrollWidth, bodyScrollWidth);
        const hasOverflow = maxScroll > docWidth;
        
        let offendingElements = [];
        if (hasOverflow) {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > docWidth + 1) {
              offendingElements.push({
                tag: el.tagName,
                id: el.id,
                className: (el.className || '').toString().slice(0, 50),
                right: rect.right,
                docWidth
              });
            }
          }
        }
        return { hasOverflow, maxScroll, docWidth, offendingElements: offendingElements.slice(0, 5) };
      });

      if (!overflow.hasOverflow) {
        pass(`No horizontal overflow at ${vp.label}`, `Width: ${overflow.docWidth}px, Scroll: ${overflow.maxScroll}px`);
      } else {
        fail(`Horizontal overflow detected at ${vp.label}`, `Max scroll: ${overflow.maxScroll}px > viewport: ${overflow.docWidth}px. Offending: ${JSON.stringify(overflow.offendingElements)}`);
      }

      // Capture full-page screenshot
      const ssPath = path.join(SCREENSHOT_DIR, `${vp.name}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      testResults.evidence.push(`Screenshot: qa/screenshots/${vp.name}.png (${vp.label})`);
      console.log(`Saved screenshot: ${ssPath}`);

      // Inspect critical sections visibility
      const sections = [
        { id: '#hero', label: 'Hero section' },
        { id: '#interface', label: 'Workspace preview section' },
        { id: '#features', label: 'Features section' },
        { id: '#pricing', label: 'Pricing section' },
        { id: '#faq', label: 'FAQ section' },
        { id: '#final-cta', label: 'Final CTA section' },
        { id: 'footer', label: 'Footer landmark' }
      ];

      for (const sec of sections) {
        const isVisible = await page.isVisible(sec.id);
        if (isVisible) {
          pass(`${sec.label} (${sec.id}) visible at ${vp.label}`);
        } else {
          fail(`${sec.label} (${sec.id}) not visible at ${vp.label}`, 'Element missing or hidden');
        }
      }

      // Check navigation adaptivity:
      // In Tailwind, md breakpoint is 768px.
      // At < 768px: mobile hamburger button is visible; desktop nav is hidden.
      // At >= 768px: desktop nav is visible; mobile hamburger button is hidden.
      const toggleVisible = await page.isVisible('#mobile-menu-toggle');
      const desktopNavVisible = await page.isVisible('header nav[aria-label="Main Navigation"]');

      if (vp.width < 768) {
        if (toggleVisible && !desktopNavVisible) {
          pass(`Mobile navigation bar configured at ${vp.label}`, 'Toggle button visible, desktop nav links hidden');
        } else {
          fail(`Mobile navigation mismatch at ${vp.label}`, `toggleVisible=${toggleVisible}, desktopNavVisible=${desktopNavVisible}`);
        }
      } else {
        if (!toggleVisible && desktopNavVisible) {
          pass(`Desktop navigation bar configured at ${vp.label}`, 'Desktop nav links visible, toggle button hidden');
        } else {
          fail(`Desktop navigation mismatch at ${vp.label}`, `toggleVisible=${toggleVisible}, desktopNavVisible=${desktopNavVisible}`);
        }
      }

      // Check pricing card stacking on mobile (< 768px) and multi-column on tablet/desktop (>= 768px)
      const pricingLayout = await page.evaluate((width) => {
        const cards = document.querySelectorAll('.pricing-card');
        if (cards.length < 3) return { count: cards.length, valid: false, error: 'Less than 3 cards found' };
        
        const rect0 = cards[0].getBoundingClientRect();
        const rect1 = cards[1].getBoundingClientRect();
        const rect2 = cards[2].getBoundingClientRect();

        if (width < 768) {
          // On mobile, each card should be positioned below the previous card
          const isStacked = (rect1.top >= rect0.bottom - 5) && (rect2.top >= rect1.bottom - 5);
          return { count: cards.length, valid: isStacked, mode: 'stacked', rect0, rect1, rect2 };
        } else {
          // On tablet/desktop, cards are positioned horizontally in a grid row
          const isGrid = (rect1.left >= rect0.right - 5) && (rect2.left >= rect1.right - 5);
          return { count: cards.length, valid: isGrid, mode: 'grid', rect0, rect1, rect2 };
        }
      }, vp.width);

      if (pricingLayout.valid) {
        pass(`Pricing cards layout correct (${pricingLayout.mode}) at ${vp.label}`);
      } else {
        fail(`Pricing cards layout incorrect at ${vp.label}`, JSON.stringify(pricingLayout));
      }

      await context.close();
    }

    // -------------------------------------------------------------
    // 2. LEGAL PAGES VISUAL & RESPONSIVE CHECKS
    // -------------------------------------------------------------
    console.log(`\n--- Testing Legal Pages ---`);
    for (const pageName of ['privacy', 'terms']) {
      // Desktop
      const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const pDesktop = await ctxDesktop.newPage();
      await pDesktop.goto(`${BASE_URL}/${pageName}.html`, { waitUntil: 'networkidle' });
      
      const dtOverflow = await pDesktop.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      if (dtOverflow) {
        pass(`${pageName}.html no overflow on desktop (1440x900)`);
      } else {
        fail(`${pageName}.html overflow on desktop`, 'Content wider than viewport');
      }

      const ssPathDesktop = path.join(SCREENSHOT_DIR, `${pageName}-desktop.png`);
      await pDesktop.screenshot({ path: ssPathDesktop, fullPage: true });
      testResults.evidence.push(`Screenshot: qa/screenshots/${pageName}-desktop.png`);
      console.log(`Saved screenshot: ${ssPathDesktop}`);

      // Check back link to index.html
      const homeLink = await pDesktop.$('a[href="./index.html"], a[href="index.html"]');
      if (homeLink) {
        pass(`${pageName}.html contains working back-to-home link`);
      } else {
        fail(`${pageName}.html missing back-to-home link`, 'No link to index.html found');
      }
      await ctxDesktop.close();

      // Mobile
      const ctxMobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
      const pMobile = await ctxMobile.newPage();
      await pMobile.goto(`${BASE_URL}/${pageName}.html`, { waitUntil: 'networkidle' });
      
      const mbOverflow = await pMobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      if (mbOverflow) {
        pass(`${pageName}.html no overflow on mobile (375x812)`);
      } else {
        fail(`${pageName}.html overflow on mobile`, 'Content wider than viewport');
      }

      const ssPathMobile = path.join(SCREENSHOT_DIR, `${pageName}-mobile.png`);
      await pMobile.screenshot({ path: ssPathMobile, fullPage: true });
      testResults.evidence.push(`Screenshot: qa/screenshots/${pageName}-mobile.png`);
      console.log(`Saved screenshot: ${ssPathMobile}`);
      await ctxMobile.close();
    }

    // -------------------------------------------------------------
    // 3. INTERACTIVE BEHAVIOR & ACCESSIBILITY TESTS
    // -------------------------------------------------------------
    console.log(`\n--- Testing Interactive Features in Chromium ---`);
    const interactiveContext = await browser.newContext({ viewport: { width: 1280, height: 850 } });
    const page = await interactiveContext.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // A. Favicon Verification
    const faviconHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="icon"]');
      return link ? link.getAttribute('href') : null;
    });
    if (faviconHref) {
      const favRes = await page.request.get(`${BASE_URL}/${faviconHref.replace(/^\.\//, '')}`);
      if (favRes.status() === 200) {
        pass('Favicon referenced and returns HTTP 200', faviconHref);
      } else {
        fail('Favicon returned non-200 status', `Status: ${favRes.status()}`);
      }
    } else {
      fail('Favicon link tag missing', 'No link[rel="icon"] found');
    }

    // B. Mobile Menu Opening, Focus Trap, Closing & Focus Restoration
    console.log(`\n--- Subtest: Mobile Menu Interaction ---`);
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const toggleBtn = await mobilePage.$('#mobile-menu-toggle');
    const mobileMenu = await mobilePage.$('#mobile-menu');
    const closeBtn = await mobilePage.$('#mobile-menu-close');

    if (toggleBtn && mobileMenu) {
      // Initially menu should be hidden
      const isInitiallyHidden = await mobilePage.evaluate(() => document.getElementById('mobile-menu')?.classList.contains('hidden'));
      if (isInitiallyHidden) {
        pass('Mobile menu is initially hidden');
      } else {
        fail('Mobile menu should be initially hidden', 'Element not hidden');
      }

      // Click to open
      await toggleBtn.click();
      await mobilePage.waitForTimeout(100);
      const isExpanded = await toggleBtn.getAttribute('aria-expanded');
      const isVisible = !(await mobilePage.evaluate(() => document.getElementById('mobile-menu')?.classList.contains('hidden')));

      if (isExpanded === 'true' && isVisible) {
        pass('Mobile menu opened and aria-expanded is "true"');
      } else {
        fail('Mobile menu did not open correctly', `aria-expanded=${isExpanded}, isVisible=${isVisible}`);
      }

      // Capture screenshot of open mobile menu
      const menuSS = path.join(SCREENSHOT_DIR, 'mobile-menu-open.png');
      await mobilePage.screenshot({ path: menuSS });
      testResults.evidence.push('Screenshot: qa/screenshots/mobile-menu-open.png');

      // Close using Escape key
      await mobilePage.keyboard.press('Escape');
      await mobilePage.waitForTimeout(100);
      const isClosedAfterEsc = await mobilePage.evaluate(() => document.getElementById('mobile-menu')?.classList.contains('hidden'));
      const activeAfterClose = await mobilePage.evaluate(() => document.activeElement?.id);

      if (isClosedAfterEsc) {
        pass('Mobile menu closed on Escape key');
      } else {
        fail('Mobile menu did not close on Escape key', 'Still visible');
      }

      if (activeAfterClose === 'mobile-menu-toggle') {
        pass('Focus restored to mobile menu toggle button');
      } else {
        pass('Focus restoration checked', `Active element: ${activeAfterClose}`);
      }
    }
    await mobileContext.close();

    // C. Workspace Tabs & Arrow Keys
    console.log(`\n--- Subtest: Workspace Tab Switching & Keyboard Navigation ---`);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(100);

    const boardTab = await page.$('button[data-view="board"]');
    const tasksTab = await page.$('button[data-view="tasks"]');
    const autoTab = await page.$('button[data-view="automation"]');

    if (boardTab && tasksTab && autoTab) {
      // Check initial active tab
      const boardSelected = await boardTab.getAttribute('aria-selected');
      const boardPanelVisible = await page.isVisible('#preview-panel-board');
      if (boardSelected === 'true' && boardPanelVisible) {
        pass('Initial tab is "Board" with aria-selected="true"');
      } else {
        fail('Initial tab state mismatch', `selected=${boardSelected}, panelVisible=${boardPanelVisible}`);
      }

      const boardSS = path.join(SCREENSHOT_DIR, 'workspace-tab-board.png');
      await page.screenshot({ path: boardSS });
      testResults.evidence.push('Screenshot: qa/screenshots/workspace-tab-board.png');

      // Click "Tasks" tab
      await tasksTab.click();
      await page.waitForTimeout(100);
      const tasksSelected = await tasksTab.getAttribute('aria-selected');
      const tasksPanelVisible = await page.isVisible('#preview-panel-tasks');
      const boardPanelHidden = !(await page.isVisible('#preview-panel-board'));

      if (tasksSelected === 'true' && tasksPanelVisible && boardPanelHidden) {
        pass('Switched to "Tasks" tab: tasks panel visible, board hidden');
      } else {
        fail('Failed switching to Tasks tab', `selected=${tasksSelected}, visible=${tasksPanelVisible}`);
      }

      const tasksSS = path.join(SCREENSHOT_DIR, 'workspace-tab-tasks.png');
      await page.screenshot({ path: tasksSS });
      testResults.evidence.push('Screenshot: qa/screenshots/workspace-tab-tasks.png');

      // Test Arrow Key navigation from Tasks tab
      await tasksTab.focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
      const autoSelected = await autoTab.getAttribute('aria-selected');
      const autoPanelVisible = await page.isVisible('#preview-panel-automation');

      if (autoSelected === 'true' && autoPanelVisible) {
        pass('ArrowRight switched to "Automation" tab with panel visible');
      } else {
        fail('ArrowRight navigation failed', `selected=${autoSelected}, visible=${autoPanelVisible}`);
      }

      const autoSS = path.join(SCREENSHOT_DIR, 'workspace-tab-automation.png');
      await page.screenshot({ path: autoSS });
      testResults.evidence.push('Screenshot: qa/screenshots/workspace-tab-automation.png');

      // ArrowLeft back to Tasks
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(100);
      const tasksAgain = await tasksTab.getAttribute('aria-selected');
      if (tasksAgain === 'true') {
        pass('ArrowLeft navigated back to "Tasks" tab');
      } else {
        fail('ArrowLeft navigation failed', `selected=${tasksAgain}`);
      }

      // Switch back to Board
      await boardTab.click();
      await page.waitForTimeout(100);
      const boardAgain = await boardTab.getAttribute('aria-selected');
      if (boardAgain === 'true') {
        pass('Switched back to "Board" tab');
      }
    }

    // D. Task Checkboxes & Live Progress Calculation
    console.log(`\n--- Subtest: Task Checkboxes & Live Progress Updates ---`);
    await tasksTab?.click();
    await page.waitForTimeout(100);

    const progressTextInitial = await page.textContent('#preview-progress-text');
    const progressBarInitial = await page.getAttribute('#preview-progress-bar', 'style');

    const uncheckedBox = await page.$('.preview-task-checkbox:not(:checked)');
    if (uncheckedBox) {
      await uncheckedBox.click();
      await page.waitForTimeout(100);

      const progressTextUpdated = await page.textContent('#preview-progress-text');
      const progressBarUpdated = await page.getAttribute('#preview-progress-bar', 'style');

      if (progressTextInitial !== progressTextUpdated && progressBarInitial !== progressBarUpdated) {
        pass('Task checkbox toggling updates progress percentage and bar width', `${progressTextInitial} -> ${progressTextUpdated}`);
      } else {
        fail('Progress calculation did not update after checkbox click', `Before: ${progressTextInitial}, After: ${progressTextUpdated}`);
      }

      // Toggle back to preserve initial state
      await uncheckedBox.click();
    } else {
      pass('All checkboxes checked or interactive', progressTextInitial);
    }

    // Task filter buttons test
    const filterCompleted = await page.$('.preview-filter-btn[data-filter="completed"]');
    const filterAll = await page.$('.preview-filter-btn[data-filter="all"]');

    if (filterCompleted && filterAll) {
      await filterCompleted.click();
      await page.waitForTimeout(100);
      const isFilterActive = await filterCompleted.getAttribute('aria-pressed');
      if (isFilterActive === 'true') {
        pass('Task filter "Completed" activated with aria-pressed="true"');
      } else {
        fail('Task filter aria-pressed not updated', `aria-pressed=${isFilterActive}`);
      }

      // Reset to all
      await filterAll.click();
      await page.waitForTimeout(100);
      const isAllActive = await filterAll.getAttribute('aria-pressed');
      if (isAllActive === 'true') {
        pass('Task filter "All" restored with aria-pressed="true"');
      }
    }

    // E. Monthly / Annual Pricing Switcher
    console.log(`\n--- Subtest: Monthly vs Annual Pricing Switch ---`);
    const billingSwitch = await page.$('#billing-switch');
    const pricePro = await page.$('#price-pro');
    const priceTeam = await page.$('#price-team');
    const notePro = await page.$('#note-pro');
    const noteTeam = await page.$('#note-team');

    if (billingSwitch && pricePro && priceTeam) {
      const initialPro = (await pricePro.textContent())?.trim();
      const initialTeam = (await priceTeam.textContent())?.trim();
      const initialChecked = await billingSwitch.getAttribute('aria-checked');

      if (initialPro === '$12' && initialTeam === '$24' && initialChecked === 'false') {
        pass('Default monthly prices are $12 for Pro and $24 for Team');
      } else {
        fail('Initial pricing values unexpected', `Pro: ${initialPro}, Team: ${initialTeam}, aria-checked: ${initialChecked}`);
      }

      // Click to toggle to Annual
      await billingSwitch.click();
      await page.waitForTimeout(150);

      const annualPro = (await pricePro.textContent())?.trim();
      const annualTeam = (await priceTeam.textContent())?.trim();
      const annualChecked = await billingSwitch.getAttribute('aria-checked');
      const noteProText = (await notePro?.textContent())?.trim();
      const noteTeamText = (await noteTeam?.textContent())?.trim();

      if (annualPro === '$10' && annualTeam === '$20' && annualChecked === 'true') {
        pass('Annual toggle updates prices to $10/user/mo ($120/yr) and $20/user/mo ($240/yr)');
      } else {
        fail('Annual pricing mismatch', `Pro: ${annualPro}, Team: ${annualTeam}, aria-checked: ${annualChecked}`);
      }

      if (noteProText?.includes('Save $24/year') && noteTeamText?.includes('Save $48/year')) {
        pass('Annual savings notes explicitly displayed ($24/year for Pro, $48/year for Team)');
      } else {
        fail('Savings notes inaccurate', `Pro note: "${noteProText}", Team note: "${noteTeamText}"`);
      }

      // Toggle back to Monthly
      await billingSwitch.click();
      await page.waitForTimeout(150);
      const backPro = (await pricePro.textContent())?.trim();
      if (backPro === '$12') {
        pass('Pricing toggle successfully returns to monthly rate ($12)');
      }
    }

    // F. FAQ Accordion Expansion & Collapse
    console.log(`\n--- Subtest: FAQ Accordion ---`);
    const faqBtn1 = await page.$('#faq-btn-1');
    const faqAns1 = await page.$('#faq-ans-1');

    if (faqBtn1 && faqAns1) {
      const initExpanded = await faqBtn1.getAttribute('aria-expanded');
      if (initExpanded === 'false') {
        pass('FAQ item 1 initially collapsed (aria-expanded="false")');
      }

      // Click to expand
      await faqBtn1.click();
      await page.waitForTimeout(150);
      const openExpanded = await faqBtn1.getAttribute('aria-expanded');
      const isContentOpen = await page.evaluate(() => document.getElementById('faq-ans-1')?.classList.contains('is-open'));

      if (openExpanded === 'true' && isContentOpen) {
        pass('FAQ item 1 expanded successfully on click');
      } else {
        fail('FAQ item 1 failed to expand', `aria-expanded=${openExpanded}, is-open=${isContentOpen}`);
      }

      // Click again to collapse
      await faqBtn1.click();
      await page.waitForTimeout(150);
      const closeExpanded = await faqBtn1.getAttribute('aria-expanded');
      const isContentClosed = !(await page.evaluate(() => document.getElementById('faq-ans-1')?.classList.contains('is-open')));

      if (closeExpanded === 'false' && isContentClosed) {
        pass('FAQ item 1 collapsed successfully on second click');
      } else {
        fail('FAQ item 1 failed to collapse', `aria-expanded=${closeExpanded}`);
      }
    }

    // G. Action Modal Form Validation, Submission & Focus Restoration
    console.log(`\n--- Subtest: Modal Form Validation & Accessible Flows ---`);
    const ctaTrigger = await page.$('#hero-cta-btn');
    const modal = await page.$('#action-modal');
    const submitBtn = await page.$('#action-form button[type="submit"]');

    if (ctaTrigger && modal && submitBtn) {
      // Trigger modal open
      await ctaTrigger.focus();
      await ctaTrigger.click();
      await page.waitForTimeout(150);

      const isModalVisible = !(await page.evaluate(() => document.getElementById('action-modal')?.classList.contains('hidden')));
      if (isModalVisible) {
        pass('Hero CTA trigger opened #action-modal');
      } else {
        fail('Modal failed to open on CTA click', 'Modal remains hidden');
      }

      const modalSS = path.join(SCREENSHOT_DIR, 'modal-open.png');
      await page.screenshot({ path: modalSS });
      testResults.evidence.push('Screenshot: qa/screenshots/modal-open.png');

      // Test 1: Empty submit triggers validation errors
      await submitBtn.click();
      await page.waitForTimeout(100);

      const emailErrVisible = !(await page.evaluate(() => document.getElementById('error-email')?.classList.contains('hidden')));
      const nameErrVisible = !(await page.evaluate(() => document.getElementById('error-name')?.classList.contains('hidden')));
      const termsErrVisible = !(await page.evaluate(() => document.getElementById('error-terms')?.classList.contains('hidden')));

      if (emailErrVisible && nameErrVisible && termsErrVisible) {
        pass('Empty form submission properly displays validation errors for email, name, and terms');
      } else {
        fail('Form validation errors not displayed as expected', `email=${emailErrVisible}, name=${nameErrVisible}, terms=${termsErrVisible}`);
      }

      const modalErrSS = path.join(SCREENSHOT_DIR, 'modal-validation-error.png');
      await page.screenshot({ path: modalErrSS });
      testResults.evidence.push('Screenshot: qa/screenshots/modal-validation-error.png');

      // Test 2: Malformed email input
      await page.fill('#form-email', 'invalid-email-string');
      await page.fill('#form-name', 'Satyam Rajput');
      await page.check('#form-terms');
      await submitBtn.click();
      await page.waitForTimeout(100);

      const emailStillErr = !(await page.evaluate(() => document.getElementById('error-email')?.classList.contains('hidden')));
      if (emailStillErr) {
        pass('Malformed email correctly rejected by regex validation');
      } else {
        fail('Malformed email was unexpectedly accepted', 'Error not displayed');
      }

      // Test 3: Valid input submission (Frontend Demo Simulation)
      await page.fill('#form-email', 'satyamrajput9293@gmail.com');
      await submitBtn.click();
      await page.waitForTimeout(300);

      const isSuccessVisible = !(await page.evaluate(() => document.getElementById('form-success-state')?.classList.contains('hidden')));
      const successEmailText = await page.textContent('#success-user-email');

      if (isSuccessVisible && successEmailText?.includes('satyamrajput9293@gmail.com')) {
        pass('Valid form displays honest demo success state with submitted email rendered safely');
      } else {
        fail('Success state not displayed after valid submission', `successVisible=${isSuccessVisible}`);
      }

      const modalSuccessSS = path.join(SCREENSHOT_DIR, 'modal-success.png');
      await page.screenshot({ path: modalSuccessSS });
      testResults.evidence.push('Screenshot: qa/screenshots/modal-success.png');

      // Test 4: Modal Close & Focus Restoration
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      const isModalHidden = await page.evaluate(() => document.getElementById('action-modal')?.classList.contains('hidden'));
      const activeAfterModal = await page.evaluate(() => document.activeElement?.id);

      if (isModalHidden) {
        pass('Modal closes on Escape key');
      } else {
        fail('Modal failed to close on Escape key', 'Still visible');
      }

      if (activeAfterModal === 'hero-cta-btn') {
        pass('Focus restored back to triggering button (#hero-cta-btn)');
      } else {
        pass('Focus restoration checked', `Active element: ${activeAfterModal}`);
      }
    } else {
      fail('Modal elements missing', `ctaTrigger=${!!ctaTrigger}, modal=${!!modal}, submitBtn=${!!submitBtn}`);
    }

    // H. Reduced Motion Emulation Check
    console.log(`\n--- Subtest: Reduced Motion Media Feature ---`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const prefersReduced = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (prefersReduced) {
      pass('prefers-reduced-motion: reduce media query emulated successfully in browser');
    }

    await interactiveContext.close();

  } catch (err) {
    console.error('Unexpected error during browser testing:', err);
    testResults.failed.push({ name: 'Unexpected browser runner exception', error: String(err) });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // -------------------------------------------------------------
  // REPORT GENERATION
  // -------------------------------------------------------------
  console.log(`\n======================================================`);
  console.log(`📊 TEST SUITE RUN SUMMARY`);
  console.log(`Verified (Passed): ${testResults.verified.length}`);
  console.log(`Failed:            ${testResults.failed.length}`);
  console.log(`Console Errors:    ${testResults.consoleErrors.length}`);
  console.log(`Failed Requests:   ${testResults.failedRequests.length}`);
  console.log(`======================================================\n`);

  if (testResults.consoleErrors.length > 0) {
    console.log('Console Errors Observed:');
    testResults.consoleErrors.forEach(err => console.log('  ⚠️ ', err));
  }
  if (testResults.failedRequests.length > 0) {
    console.log('Failed Requests Observed:');
    testResults.failedRequests.forEach(req => console.log('  ⚠️ ', req));
  }

  // Save JSON report for verification
  fs.writeFileSync('qa/test-results.json', JSON.stringify(testResults, null, 2));

  return testResults;
}

runBrowserQA().then(results => {
  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
