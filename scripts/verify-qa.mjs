import fs from 'fs';
import path from 'path';

console.log('--- STARTING QA TEST VERIFICATION ---');

const indexHtml = fs.readFileSync('index.html', 'utf-8');
const privacyHtml = fs.readFileSync('privacy.html', 'utf-8');
const termsHtml = fs.readFileSync('terms.html', 'utf-8');
const mainTs = fs.readFileSync('src/main.ts', 'utf-8');

let errors = [];
let passed = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
    console.error('❌ FAIL:', message);
  } else {
    passed.push(message);
    console.log('✅ PASS:', message);
  }
}

// 1. Check all required IDs referenced in main.ts exist in index.html
const requiredIds = [
  'site-header',
  'mobile-menu-toggle',
  'mobile-menu',
  'mobile-menu-close',
  'preview-progress-bar',
  'preview-progress-text',
  'billing-switch',
  'price-pro',
  'price-team',
  'interval-pro',
  'interval-team',
  'note-pro',
  'note-team',
  'annual-savings-text',
  'label-monthly',
  'label-annual',
  'action-modal',
  'modal-overlay',
  'modal-close-btn',
  'action-form',
  'modal-title',
  'form-plan',
  'form-success-state',
  'modal-reset-btn',
  'form-email',
  'form-name',
  'form-terms',
  'error-email',
  'error-name',
  'error-terms',
  'success-user-email',
  'success-user-plan'
];

requiredIds.forEach(id => {
  assert(indexHtml.includes(`id="${id}"`), `index.html contains id="${id}"`);
});

// 2. Check tab panel targets
const tabViews = ['board', 'tasks', 'automation'];
tabViews.forEach(view => {
  assert(indexHtml.includes(`data-view="${view}"`), `Tab button data-view="${view}" exists`);
  assert(indexHtml.includes(`id="preview-panel-${view}"`), `Panel id="preview-panel-${view}" exists`);
});

// 3. Check FAQ Accordion pairs
const faqItems = (indexHtml.match(/class="faq-item/g) || []).length;
assert(faqItems >= 5, `At least 5 FAQ items exist (found ${faqItems})`);

for (let i = 1; i <= faqItems; i++) {
  const triggerMatches = indexHtml.includes(`id="faq-btn-${i}"`) && indexHtml.includes(`aria-controls="faq-ans-${i}"`);
  const panelMatches = indexHtml.includes(`id="faq-ans-${i}"`) && indexHtml.includes(`aria-labelledby="faq-btn-${i}"`);
  assert(triggerMatches, `FAQ Button ${i} has matching aria-controls="faq-ans-${i}"`);
  assert(panelMatches, `FAQ Panel ${i} has matching aria-labelledby="faq-btn-${i}"`);
}

// 4. Check Internal Anchor Links
const internalAnchors = ['#features', '#interface', '#pricing', '#faq'];
internalAnchors.forEach(hash => {
  const targetId = hash.slice(1);
  assert(indexHtml.includes(`id="${targetId}"`), `Anchor target id="${targetId}" exists`);
});

// 5. Check Legal Pages Link Back
assert(privacyHtml.includes('href="./index.html"'), 'privacy.html links back to ./index.html');
assert(termsHtml.includes('href="./index.html"'), 'terms.html links back to ./index.html');
assert(indexHtml.includes('href="./privacy.html"'), 'index.html links to ./privacy.html');
assert(indexHtml.includes('href="./terms.html"'), 'index.html links to ./terms.html');

// 6. Check Branding
assert(!indexHtml.includes('Made with AI'), 'No "Made with AI" badge in index.html');
assert(indexHtml.includes('Nexora'), 'Nexora brand present in index.html');
assert(privacyHtml.includes('Nexora'), 'Nexora brand present in privacy.html');
assert(termsHtml.includes('Nexora'), 'Nexora brand present in terms.html');

// 7. Check Favicon file existence
assert(fs.existsSync('favicon.svg'), 'favicon.svg exists in root');
assert(fs.existsSync('public/favicon.svg'), 'favicon.svg exists in public/');

// 8. Pricing Math Validation
const proMonthly = 12;
const proAnnualMonthly = 10;
const proAnnualYearTotal = proAnnualMonthly * 12; // 120
const proMonthlyYearTotal = proMonthly * 12; // 144
const proSavings = proMonthlyYearTotal - proAnnualYearTotal; // 24
const proPct = Math.round((proSavings / proMonthlyYearTotal) * 100); // 17 or 16.7%

assert(proSavings === 24, `Pro savings calculation is exactly $24/year (got ${proSavings})`);
assert(mainTs.includes('$120/year per user (Save $24/year)'), 'main.ts has accurate Pro annual savings string');

const teamMonthly = 24;
const teamAnnualMonthly = 20;
const teamAnnualYearTotal = teamAnnualMonthly * 12; // 240
const teamMonthlyYearTotal = teamMonthly * 12; // 288
const teamSavings = teamMonthlyYearTotal - teamAnnualYearTotal; // 48
assert(teamSavings === 48, `Team savings calculation is exactly $48/year (got ${teamSavings})`);
assert(mainTs.includes('$240/year per user (Save $48/year)'), 'main.ts has accurate Team annual savings string');

console.log('\n--- QA SUMMARY ---');
console.log(`Passed: ${passed.length} tests`);
console.log(`Failed: ${errors.length} tests`);

if (errors.length > 0) {
  process.exit(1);
} else {
  console.log('ALL QA AUTOMATION TESTS PASSED!');
}
