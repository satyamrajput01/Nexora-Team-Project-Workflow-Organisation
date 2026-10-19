# Nexora Visual Browser QA Suite

This directory contains real browser-automated end-to-end and responsive visual tests for **Nexora** using Playwright and Chromium.

---

## Prerequisites & Installation

To run these tests in any standard Node.js environment:

```bash
# 1. Install Playwright dependency
npm install -D playwright --legacy-peer-deps

# 2. Download the Chromium browser binary
npx playwright install chromium chromium-headless-shell
```

---

## Running the Visual QA Tests

### Against Development Server (default: `http://localhost:3000`)

```bash
node qa/browser-tests.mjs
```

### Against Production Build Preview (port `4173`)

```bash
# First, build and launch the Vite preview server:
npm run build
npx vite preview --port 4173 &

# Then run the suite specifying the target URL:
TEST_URL=http://localhost:4173 node qa/browser-tests.mjs
```

---

## Test Coverage

The suite (`qa/browser-tests.mjs`) automatically executes and verifies:

1. **Responsive Viewport Rendering & Screenshots:**
   - Desktop: `1440 × 900` (`qa/screenshots/desktop-1440.png`)
   - Tablet: `768 × 1024` (`qa/screenshots/tablet-768.png`)
   - Mobile Standard: `375 × 812` (`qa/screenshots/mobile-375.png`)
   - Mobile Small: `320 × 800` (`qa/screenshots/mobile-320.png`)
   - Legal Desktop: `1440 × 900` (`qa/screenshots/privacy-desktop.png`, `qa/screenshots/terms-desktop.png`)
   - Legal Mobile: `375 × 812` (`qa/screenshots/privacy-mobile.png`, `qa/screenshots/terms-mobile.png`)

2. **Horizontal Overflow & Layout Integrity:**
   - Evaluates `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
   - Confirms zero horizontal scrolling across all viewports.
   - Verifies landmark visibility: Header, Hero, Workspace Preview, Features, Pricing, FAQ, Final CTA, and Footer.

3. **Interactive Features:**
   - **Accessible Mobile Navigation Drawer:** Toggle button, `aria-expanded` synchronization, Esc key dismissal, and focus restoration to trigger.
   - **Interactive Product Interface:** Tab switching (Board, Tasks, Automation), Arrow key keyboard navigation (`ArrowRight`, `ArrowLeft`), active panel visibility.
   - **Task Checklist & Live Deliverables Progress:** Checkbox updates, live progress bar percentage calculation, and category filter buttons.
   - **Monthly vs. Annual Pricing Switcher:** Billing cadence toggle, price adjustments ($12 -> $10/mo and $24 -> $20/mo), explicit annual totals ($120/yr and $240/yr), and verified savings labels ($24/year and $48/year).
   - **FAQ Accordion:** Multi-item expansion/collapse, chevron rotation, and ARIA state management.
   - **Action Modal & Form Validation:** Empty submission validation, malformed email format checks, valid submission handling (honest demo simulation), focus trap, Escape key handling, and focus restoration.
   - **Reduced Motion:** Verified against `prefers-reduced-motion: reduce`.
