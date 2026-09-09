import fs from 'node:fs';
import { chromium } from '/tmp/operation-report-tools/node_modules/playwright/index.mjs';

const outputDir = new URL('./assets/', import.meta.url);
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const font = fs.readFileSync('/tmp/operation-report-tools/NotoSansCJKkr-Regular.otf');

await page.route('http://report-font.local/NotoSansKR.otf', async (route) => {
  await route.fulfill({ status: 200, contentType: 'font/otf', body: font });
});

const routes = [
  ['foreign-mail', '/foreign-mail'],
  ['gems-message', '/gems-message'],
  ['backup-error', '/auto-backup-error-filter'],
  ['persistent-redirect', '/persistent-redirect'],
  ['icheck-report', '/icheck-report'],
  ['persistent-event-excel', '/persistent-event-excel'],
];

for (const [name, route] of routes) {
  await page.goto(`http://127.0.0.1:5173${route}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: `
      @font-face { font-family: ReportKR; src: url('http://report-font.local/NotoSansKR.otf'); }
      * { font-family: ReportKR, sans-serif !important; }
      body { background: #eef3f9 !important; }
      a[href='/light-log'] { display: none !important; }
    `,
  });
  await page.screenshot({
    path: new URL(`${name}.png`, outputDir).pathname,
    animations: 'disabled',
  });
}

await browser.close();
