// Renders the toolbar/store icons from one SVG with Playwright's Chromium. `npm run icons`
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="4" y="4" width="120" height="120" rx="28" fill="#0f766e"/>
  <rect x="34" y="22" width="60" height="84" rx="12" fill="#ffffff" transform="rotate(-8 64 64)" opacity="0.35"/>
  <rect x="34" y="22" width="60" height="84" rx="12" fill="#ffffff"/>
  <rect x="44" y="36" width="40" height="6" rx="3" fill="#0f766e" opacity="0.55"/>
  <rect x="44" y="48" width="30" height="6" rx="3" fill="#0f766e" opacity="0.35"/>
  <path d="M30 92 16 78l14-14M98 64l14 14-14 14" fill="none" stroke="#fbbf24" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

(async () => {
  const out = path.join(__dirname, '..', 'extension', 'icons');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${SVG.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.locator('svg').screenshot({ path: path.join(out, `icon${size}.png`), omitBackground: true });
  }
  await browser.close();
  console.log('Icons written to ' + out);
})();
