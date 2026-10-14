import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { openEyecheckWorkbook } from '../../src/utils/eyecheckWorkbook.js';
import { listDataRows } from '../../src/utils/xlsxSheetXml.js';

const root = fileURLToPath(new URL('./', import.meta.url));
await mkdir(`${root}screenshots`, { recursive: true });
await mkdir(`${root}samples`, { recursive: true });
const samples = {};
for (const name of [
  'mail',
  'gems',
  'redirect',
  'backup',
  'icheck',
  'persistent',
]) {
  let value = await readFile(
    new URL(`../user-guide/samples/${name}.txt`, import.meta.url),
    'utf8'
  );
  if (name === 'redirect')
    value = value.replaceAll('이예시 선임', '김예시 책임');
  if (name === 'icheck') value += `\n${value.split('\n')[0]}`;
  samples[name] = value;
  await writeFile(`${root}samples/${name}.txt`, value);
}
const originalParts = unzipSync(
  new Uint8Array(
    await readFile(
      new URL('../user-guide/samples/eyecheck-practice.xlsx', import.meta.url)
    )
  )
);
const practiceParts = Object.fromEntries(
  Object.entries(originalParts).map(([name, bytes]) => [
    name,
    name.endsWith('.xml')
      ? strToU8(
          strFromU8(bytes)
            .replaceAll('TEST-HOST', 'DEMO-HOST')
            .replaceAll('테스트 책임', '김예시 책임')
        )
      : bytes,
  ])
);
await writeFile(
  `${root}samples/eyecheck-practice.xlsx`,
  zipSync(practiceParts)
);

const { chromium } = await import(
  process.env.GUIDE_PLAYWRIGHT_MODULE ||
    '/tmp/operation-guide-tools/node_modules/playwright/index.mjs'
);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1100, height: 1050 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
await context.addInitScript(() => {
  window.showSaveFilePicker = undefined;
});
const font = await readFile(
  process.env.GUIDE_FONT ||
    '/tmp/operation-guide-libs/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
);
await context.route('**/__proposal-font', (route) =>
  route.fulfill({ contentType: 'font/ttf', body: font })
);
await context.addInitScript(() =>
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent =
      '@font-face{font-family:ProposalKorean;src:url(/__proposal-font)}body,body *{font-family:ProposalKorean,sans-serif!important}';
    document.head.append(style);
  })
);
const page = await context.newPage();
const errors = [];
const images = [];
const results = {};
page.on('pageerror', (error) => errors.push(error.message));
const goto = async (path) => {
  await page.goto(
    `${process.env.GUIDE_BASE_URL || 'http://127.0.0.1:5173'}${path}`
  );
  const collapse = page.getByRole('button', { name: '메뉴 접기', exact: true });
  if (await collapse.isVisible()) await collapse.click();
  await page.waitForFunction(
    () =>
      parseFloat(
        getComputedStyle(document.querySelector('.app-content')).marginLeft
      ) < 100
  );
  await page.evaluate(() => document.fonts.ready);
};
const panelWith = (heading) =>
  page
    .locator('section.panel')
    .filter({ has: page.getByRole('heading', { name: heading, exact: true }) });
const shot = async (name, locator) => {
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    await page.evaluate(() =>
      document.fonts.check('14px ProposalKorean', '안녕하세요 서버 내용')
    ),
    true
  );
  await locator.screenshot({
    path: `${root}screenshots/${name}.png`,
    animations: 'disabled',
  });
  images.push(name);
  console.log(`Captured ${name}`);
};
const clipboardAfter = async (button, expected) => {
  await page.evaluate(() => navigator.clipboard.writeText(''));
  await button.click();
  await page.waitForFunction(
    async (value) => (await navigator.clipboard.readText()).includes(value),
    expected
  );
  return page.evaluate(() => navigator.clipboard.readText());
};
try {
  await goto('/foreign-mail');
  const routes = await page
    .locator('nav a')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')));
  assert.deepEqual(routes, [
    '/foreign-mail',
    '/gems-message',
    '/persistent-redirect',
    '/auto-backup-error-filter',
    '/icheck-report',
    '/eyecheck-light-log',
    '/persistent-event-excel',
  ]);
  await page.locator('textarea').fill(samples.mail);
  await page.getByRole('button', { name: '열 순서 설정', exact: true }).click();
  await shot('mail-input', page.locator('section.panel').nth(0));
  results.mail = await clipboardAfter(
    page.getByRole('button', { name: '메일 전체 복사', exact: true }),
    'DEMO-DB-01'
  );
  assert.match(results.mail, /Filesystem\) Utilization MAJOR/);
  assert.doesNotMatch(results.mail, /UserName|김예시/);
  await shot('mail-result', page.locator('section.panel').nth(1));

  await goto('/gems-message');
  await page.locator('input[value=basic]').check();
  await page.locator('textarea').fill(samples.gems);
  results.gemsClean = await page.locator('pre').innerText();
  assert.doesNotMatch(results.gemsClean, /UserName|김예시|이예시/);
  await shot(
    'gems-input',
    page.locator('section.panel').filter({ has: page.locator('textarea') })
  );
  await shot(
    'gems-clean',
    page.locator('section.panel').filter({ has: page.locator('pre') })
  );
  await page.locator('input[value=report]').check();
  await page.getByPlaceholder('정지운', { exact: true }).fill('홍예시');
  results.gems = await clipboardAfter(
    page.getByRole('button', { name: /전체 복사/ }),
    '홍예시'
  );
  assert.match(results.gems, /G-EMS/);
  await shot(
    'gems-result',
    page.locator('section.panel').filter({ has: page.locator('pre') })
  );

  await goto('/persistent-redirect');
  await page.getByPlaceholder('정지운', { exact: true }).fill('홍예시');
  await page.getByLabel('원본 데이터', { exact: true }).fill(samples.redirect);
  for (const host of ['DEMO-WEB-01', 'DEMO-DB-01']) {
    await page
      .locator('div.p-4.rounded-lg.border')
      .filter({ hasText: host })
      .getByRole('button', { name: '전달 추가', exact: true })
      .click();
  }
  assert.equal(
    await page.getByRole('button', { name: '추가 취소', exact: true }).count(),
    2
  );
  await shot('redirect-selection', panelWith('재전달 메시지 선택'));
  results.redirect = await clipboardAfter(
    page.getByRole('button', { name: '전체 복사', exact: true }),
    '지속중인'
  );
  assert.doesNotMatch(results.redirect, /DEMO-HOLD-01|UserName/);
  await shot('redirect-result', page.locator('#persistent-redirect-output'));
  await page.getByRole('button', { name: '해외메일', exact: true }).click();
  results.redirectMail = await clipboardAfter(
    page.getByRole('button', { name: '전체 복사', exact: true }),
    'DEMO-WEB-01'
  );
  await page.getByRole('button', { name: '국내 메신저', exact: true }).click();
  await page
    .locator('div.p-4.rounded-lg.border')
    .filter({ hasText: 'DEMO-WEB-01' })
    .getByRole('button', { name: '확인 완료', exact: true })
    .click();
  await page.getByRole('button', { name: /확인됨 \(1\)/ }).click();
  const confirmed = page
    .locator('div.p-4.rounded-lg.border')
    .filter({ hasText: 'DEMO-WEB-01' });
  results.redirectHistory = await clipboardAfter(
    confirmed.getByRole('button', { name: '복사', exact: true }),
    '재전달'
  );
  assert.match(results.redirectHistory, /홍예시.*김예시 책임.*재전달/);
  await shot('redirect-history', panelWith('재전달 메시지 선택'));

  await goto('/auto-backup-error-filter');
  await page.locator('textarea').fill(samples.backup);
  await shot(
    'backup-input',
    page.locator('section.panel').filter({ has: page.locator('textarea') })
  );
  results.backup = await clipboardAfter(
    page.getByRole('button', { name: 'Outlook 행 복사', exact: true }).first(),
    'DEMO_DB_DAILY'
  );
  assert.match(results.backup, /Err: 58/);
  assert.match(results.backup, /Err: 84/);
  assert.doesNotMatch(results.backup, /DEMO_SUCCESS|DEMO_PARTIAL/);
  await shot('backup-result', panelWith('2. Outlook 보고용 결과'));
  await page.getByRole('button', { name: /데이터 관리/ }).click();
  const backupWait = page.waitForEvent('download');
  await page
    .getByRole('button', { name: '메모장으로 내보내기', exact: true })
    .click();
  await (await backupWait).saveAs(`${root}samples/backup-result.txt`);
  results.backupTxt = await readFile(
    `${root}samples/backup-result.txt`,
    'utf8'
  );

  await goto('/icheck-report');
  await page
    .getByLabel('아이체크 엑셀 원본 데이터', { exact: true })
    .fill(samples.icheck);
  await page.getByRole('textbox', { name: '이름', exact: true }).fill('홍예시');
  await page.getByText('보고 대상 2건', { exact: true }).waitFor();
  await page.getByText('중복 제외 1건', { exact: true }).waitFor();
  await shot(
    'icheck-input',
    page.locator('section.panel').filter({ has: page.locator('textarea') })
  );
  results.icheck = await clipboardAfter(
    page.getByRole('button', { name: '담당자 문구 복사', exact: true }).first(),
    'DEMO-WEB-01'
  );
  results.icheckSecond = await clipboardAfter(
    page.getByRole('button', { name: '담당자 문구 복사', exact: true }).nth(1),
    'DEMO-DB-01'
  );
  assert.doesNotMatch(results.icheck, /DEMO-DB-01/);
  await shot(
    'icheck-result',
    page.locator('article').filter({ hasText: '김예시 책임' })
  );

  await goto('/eyecheck-light-log');
  await page
    .locator('input[type=file]')
    .setInputFiles(`${root}samples/eyecheck-practice.xlsx`);
  await page.getByText('eyecheck-practice.xlsx', { exact: true }).waitFor();
  const dialog = page.getByRole('alertdialog');
  if (await dialog.isVisible())
    await dialog.getByRole('button', { name: '확인', exact: true }).click();
  await shot(
    'editor-original',
    page
      .locator('section.panel')
      .filter({ has: page.getByLabel('3행 선택', { exact: true }) })
  );
  await page.getByPlaceholder('A-15, D-24(2)').fill('A-3(2)');
  await page.getByRole('checkbox', { name: '3행 선택', exact: true }).check();
  await shot('editor-entry', panelWith('1. 층별 점등내역'));
  await shot(
    'editor-off',
    page
      .locator('section.panel')
      .filter({ has: page.getByLabel('3행 선택', { exact: true }) })
  );
  await page.getByRole('tab', { name: '담당자 보고' }).click();
  await page
    .getByText('신규 2 · 소등 1 · 보고 선택 3', { exact: true })
    .waitFor();
  await page.getByLabel('보고자 이름', { exact: true }).fill('홍예시');
  assert.equal(
    await page.getByRole('button', { name: '문구 복사', exact: true }).count(),
    1
  );
  assert.equal(
    await page
      .getByRole('button', { name: '문구 복사', exact: true })
      .isDisabled(),
    true
  );
  for (let i = 0; i < 2; i++) {
    await page
      .getByLabel('SA3A-3 호스트명', { exact: true })
      .nth(i)
      .fill(`DEMO-NEW-0${i + 1}`);
    await page
      .getByLabel('SA3A-3 서버 담당자', { exact: true })
      .nth(i)
      .fill('김예시 책임');
  }
  await shot(
    'editor-details',
    page
      .locator('article')
      .filter({ has: page.getByLabel('SA3A-3 호스트명', { exact: true }) })
      .first()
  );
  results.editor = await clipboardAfter(
    page.getByRole('button', { name: '문구 복사', exact: true }),
    'DEMO-NEW-01'
  );
  assert.match(results.editor, /\[신규 점등\]/);
  assert.match(results.editor, /\[소등\]/);
  await shot(
    'editor-result',
    page
      .getByRole('heading', { name: '담당자별 보고 미리보기', exact: true })
      .locator('..')
  );
  const editorWait = page.waitForEvent('download');
  await page
    .getByRole('button', { name: '새 파일로 내려받기', exact: true })
    .click();
  await (await editorWait).saveAs(`${root}samples/eyecheck-result.xlsx`);
  const saved = openEyecheckWorkbook(
    new Uint8Array(await readFile(`${root}samples/eyecheck-result.xlsx`)),
    'result.xlsx'
  );
  results.editorRows = saved.move.rows.map((row) => row.vals);
  assert.equal(saved.move.rows.length, 3);
  assert.equal(
    saved.move.rows.find((row) => row.vals.C === 'DEMO-NEW-01').vals.L,
    '김예시 책임'
  );
  await page
    .getByText('신규 2 · 소등 1 · 보고 선택 3', { exact: true })
    .waitFor();

  await goto('/persistent-event-excel');
  await page.locator('textarea').fill(samples.persistent);
  assert.equal(
    await page
      .getByRole('button', { name: '엑셀 파일 추출', exact: true })
      .isDisabled(),
    true
  );
  await shot('persistent-input', panelWith('1. 원본 데이터 입력'));
  const multi = page
    .locator('article')
    .filter({
      has: page.getByRole('checkbox', { name: '김예시 책임', exact: true }),
    });
  await shot('persistent-review', multi);
  await page
    .getByRole('checkbox', { name: '김예시 책임', exact: true })
    .check();
  await page
    .getByRole('checkbox', { name: '이예시 선임', exact: true })
    .check();
  await page.getByRole('button', { name: '선택 완료', exact: true }).click();
  await page
    .getByLabel('3행 담당자 직접 입력', { exact: true })
    .fill('박예시 책임');
  await shot(
    'persistent-manual',
    page
      .locator('article')
      .filter({ has: page.getByLabel('3행 담당자 직접 입력', { exact: true }) })
  );
  await page.getByLabel('3행 담당자 직접 입력', { exact: true }).press('Enter');
  await shot(
    'persistent-preview',
    page
      .locator('section.panel')
      .filter({
        has: page.getByRole('button', { name: '엑셀 파일 추출', exact: true }),
      })
  );
  const persistentWait = page.waitForEvent('download');
  await page
    .getByRole('button', { name: '엑셀 파일 추출', exact: true })
    .click();
  await (await persistentWait).saveAs(`${root}samples/persistent-result.xlsx`);
  const excelParts = unzipSync(
    new Uint8Array(await readFile(`${root}samples/persistent-result.xlsx`))
  );
  const sheetXml = strFromU8(excelParts['xl/worksheets/sheet1.xml']);
  results.persistentRows = listDataRows(sheetXml, [], new Set(), 2).map(
    (row) => row.vals
  );
  assert.equal(results.persistentRows.length, 4);
  assert.match(sheetXml, /autoFilter ref="A1:H5"/);
  assert.match(sheetXml, /ySplit="1"/);
  assert.equal(
    results.persistentRows.filter((row) => row.E === 'DEMO-SRV-02').length,
    2
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${root}evidence.json`,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        dataKind: '가상 서버·IP·담당자',
        routes,
        images,
        results,
        checks: [
          '현재 7개 메뉴 확인',
          '메일 탭·줄바꿈 정리 및 확인 이력 제거',
          'G-EMS 2가지 출력 모드·실제 복사',
          '재전달 복수선택·보류 미포함·확인내역 재생성',
          '백업 Status 0·1 제외·58·84 추출·TXT 다운로드',
          '아이체크 13열·중복 1건 제거·담당자별 2문구 분리',
          '편집 원본 2건·신규 2건·소등 1건·필수정보 누락 복사 차단',
          '편집 결과 XLSX 3건·장비정보 저장·저장 후 비교 유지',
          '담당자 미확정 추출 차단·복수담당자 확정·XLSX 4행·필터·첫 행 고정',
          '브라우저 오류 없음',
        ],
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
