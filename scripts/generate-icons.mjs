// Renders the PWA icons from inline SVG with Playwright's Chromium (run once: npm run icons).
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const mark = (scale) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)" stroke="#c4f04a" stroke-width="44" stroke-linecap="round" fill="none">
    <path d="M176 150v212M116 200v112M336 150v212M396 200v112M176 256h160"/>
  </g>`;
const svg = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${maskable ? '' : 'rx="112"'} fill="#0b0d10"/>${mark(maskable ? 0.72 : 1)}</svg>`;

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, maskable] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style><div style="width:${size}px;height:${size}px">${svg(maskable).replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>`);
  await writeFile(`public/icons/${file}`, await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
  console.log('wrote', file);
}
await browser.close();
