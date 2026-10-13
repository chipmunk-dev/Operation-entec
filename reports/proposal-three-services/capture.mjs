import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));
await mkdir(`${root}screenshots`, { recursive: true });
await mkdir(`${root}samples`, { recursive: true });
const samples = {};
for (const name of ['mail', 'backup', 'redirect']) {
  samples[name] = await readFile(new URL(`../user-guide/samples/${name}.txt`, import.meta.url), 'utf8');
  await writeFile(`${root}samples/${name}.txt`, samples[name]);
}
const { chromium } = await import(process.env.GUIDE_PLAYWRIGHT_MODULE || '/tmp/operation-guide-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1100, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
// Headless 환경에서는 파일 저장 대화상자 대신 서비스의 실제 다운로드 대체 경로를 검증합니다.
await context.addInitScript(() => { window.showSaveFilePicker = undefined; });
const font = await readFile(process.env.GUIDE_FONT || '/tmp/operation-guide-libs/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc');
await context.route('**/__proposal-font', route => route.fulfill({ contentType: 'font/ttf', body: font }));
await context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = '@font-face{font-family:ProposalKorean;src:url(/__proposal-font)}body,body *{font-family:ProposalKorean,sans-serif!important}';
  document.head.append(style);
}));
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const results = {};
const goto = async path => {
  await page.goto(`${process.env.GUIDE_BASE_URL || 'http://127.0.0.1:5173'}${path}`);
  const collapse = page.getByRole('button', { name: '메뉴 접기', exact: true });
  if (await collapse.isVisible()) await collapse.click();
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.app-content')).marginLeft) < 100);
  await page.evaluate(() => document.fonts.ready);
};
const shot = async (name, locator) => {
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('14px ProposalKorean', '안녕하세요 서버 내용')), true);
  await locator.screenshot({ path: `${root}screenshots/${name}.png`, animations: 'disabled' });
  console.log(`Captured ${name}`);
};
const readClipboard = () => page.evaluate(() => navigator.clipboard.readText());
try {
  await goto('/foreign-mail');
  await page.locator('textarea').fill(samples.mail);
  await page.getByRole('button', { name: '열 순서 설정', exact: true }).click();
  await shot('mail-input', page.locator('section.panel').nth(0));
  await page.getByRole('button', { name: '메일 전체 복사', exact: true }).click();
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes('DEMO-DB-01'));
  results.mail = await readClipboard();
  assert.match(results.mail, /Dear!/);
  assert.match(results.mail, /192\.0\.2\.10/);
  assert.match(results.mail, /Filesystem\) Utilization MAJOR/);
  assert.doesNotMatch(results.mail, /UserName|김예시/);
  await shot('mail-result', page.locator('section.panel').nth(1));

  await goto('/auto-backup-error-filter');
  await page.locator('textarea').fill(samples.backup);
  const backupInput = page.locator('section.panel').filter({ has: page.locator('textarea') });
  await shot('backup-input', backupInput);
  await page.getByRole('button', { name: 'Outlook 행 복사', exact: true }).first().click();
  await page.getByRole('button', { name: '표 복사됨', exact: true }).waitFor();
  results.backup = await readClipboard();
  assert.match(results.backup, /DEMO_DB_DAILY/);
  assert.match(results.backup, /Err: 58/);
  assert.match(results.backup, /Err: 84/);
  assert.doesNotMatch(results.backup, /DEMO_SUCCESS|DEMO_PARTIAL/);
  const backupResult = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: '2. Outlook 보고용 결과', exact: true }) });
  await shot('backup-result', backupResult);
  await page.getByRole('button', { name: /데이터 관리/ }).click();
  const downloadWait = page.waitForEvent('download');
  await page.getByRole('button', { name: '메모장으로 내보내기', exact: true }).click();
  const download = await downloadWait;
  await download.saveAs(`${root}samples/backup-result.txt`);
  results.backupTxt = await readFile(`${root}samples/backup-result.txt`, 'utf8');
  assert.match(results.backupTxt, /DEMO_DB_DAILY/);
  assert.match(results.backupTxt, /58/);

  await goto('/persistent-redirect');
  await page.getByPlaceholder('정지운', { exact: true }).fill('홍예시');
  await page.getByLabel('원본 데이터', { exact: true }).fill(samples.redirect);
  for (const host of ['DEMO-WEB-01', 'DEMO-DB-01']) {
    await page.locator('div.p-4.rounded-lg.border').filter({ hasText: host }).getByRole('button', { name: '전달 추가', exact: true }).click();
  }
  assert.equal(await page.getByRole('button', { name: '추가 취소', exact: true }).count(), 2);
  await shot('redirect-selection', page.locator('section.panel').filter({ has: page.getByRole('heading', { name: '재전달 메시지 선택', exact: true }) }));
  await page.getByRole('button', { name: '전체 복사', exact: true }).click();
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes('지속중인 메세지'));
  results.redirect = await readClipboard();
  assert.match(results.redirect, /DEMO-WEB-01/);
  assert.match(results.redirect, /DEMO-DB-01/);
  assert.doesNotMatch(results.redirect, /DEMO-HOLD-01|UserName/);
  await shot('redirect-result', page.locator('#persistent-redirect-output'));
  assert.deepEqual(errors, []);
  await writeFile(`${root}evidence.json`, JSON.stringify({ capturedAt: new Date().toISOString(), dataKind: '가상 서버·IP·담당자', results, checks: ['해외메일 2건 및 내부 줄바꿈 정리', '확인 이력 제거', '백업 Status 0·1 제외 / 58·84 추출', 'Outlook 표 복사 및 TXT 내려받기', '지속 이벤트 3건 중 2건 복수선택', '보류 1건의 전달 문구 미포함', '브라우저 오류 없음'] }, null, 2));
} finally { await browser.close(); }
