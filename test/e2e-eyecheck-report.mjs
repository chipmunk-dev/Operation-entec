import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { reportWorkbookBytes } from './fixtures/eyecheckReportWorkbook.js';
import { openEyecheckWorkbook } from '../src/utils/eyecheckWorkbook.js';

// npm install --prefix /tmp/eyecheck-ui-tools playwright
// EYECHECK_PLAYWRIGHT_MODULE=/tmp/eyecheck-ui-tools/node_modules/playwright/index.mjs node test/e2e-eyecheck-report.mjs
const { chromium } = await import(
  process.env.EYECHECK_PLAYWRIGHT_MODULE || 'playwright'
);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
if (process.env.EYECHECK_TEST_FONT) {
  const font = await readFile(process.env.EYECHECK_TEST_FONT);
  await context.route('**/__eyecheck-test-font', (route) =>
    route.fulfill({ contentType: 'font/ttf', body: font })
  );
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent =
        '@font-face{font-family:TestKorean;src:url(/__eyecheck-test-font)} body,input,button,select,textarea,pre{font-family:TestKorean,sans-serif!important}';
      document.head.append(style);
    });
  });
}
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const upload = async () => {
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'eyecheck-test.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(reportWorkbookBytes()),
    });
  await page.getByText('eyecheck-test.xlsx', { exact: true }).waitFor();
  const dialog = page.getByRole('alertdialog');
  if (await dialog.isVisible())
    await dialog.getByRole('button', { name: '확인', exact: true }).click();
};
try {
  await page.goto('http://127.0.0.1:5173/eyecheck-light-log');
  await upload();
  await page.getByRole('tab', { name: '담당자 보고' }).click();
  await page.getByText('변경내역이 없습니다.', { exact: false }).waitFor();
  await page.getByRole('tab', { name: '내역 편집', exact: true }).click();
  await page.getByPlaceholder('A-15, D-24(2)').fill('A-3(2)');
  await page.getByRole('checkbox', { name: '3행 선택', exact: true }).check();
  await page.getByRole('tab', { name: '담당자 보고' }).click();
  await page
    .getByText('신규 2 · 소등 1 · 보고 선택 3', { exact: true })
    .waitFor();
  await page.getByLabel('보고자 이름', { exact: true }).fill('테스트');
  assert.equal(
    await page
      .getByRole('button', { name: '문구 복사', exact: true })
      .isDisabled(),
    true
  );
  // 한 글자씩 타이핑해도 카드가 재생성되어 포커스를 잃지 않아야 한다.
  await page
    .getByLabel('SA3A-3 호스트명', { exact: true })
    .nth(0)
    .pressSequentially('NEW-HOST-01');
  assert.equal(
    await page
      .getByLabel('SA3A-3 호스트명', { exact: true })
      .nth(0)
      .inputValue(),
    'NEW-HOST-01'
  );
  await page
    .getByLabel('SA3A-3 서버 담당자', { exact: true })
    .nth(0)
    .fill('테스트 책임');
  await page
    .getByLabel('SA3A-3 호스트명', { exact: true })
    .nth(1)
    .fill('NEW-HOST-02');
  await page
    .getByLabel('SA3A-3 서버 담당자', { exact: true })
    .nth(1)
    .fill('다른 책임');
  // 선택 해제가 카드를 숨기지 않으며 검색해도 유지된다.
  await page
    .getByLabel('SA3A-3 on 보고 선택', { exact: true })
    .nth(1)
    .uncheck();
  assert.equal(
    await page.getByLabel('SA3A-3 on 보고 선택', { exact: true }).count(),
    2
  );
  await page.getByLabel('보고 장비 검색').fill('없는호스트');
  await page.getByLabel('보고 장비 검색').fill('');
  assert.equal(
    await page
      .getByLabel('SA3A-3 on 보고 선택', { exact: true })
      .nth(1)
      .isChecked(),
    false
  );
  await page.getByLabel('SA3A-3 on 보고 선택', { exact: true }).nth(1).check();
  await page.getByRole('tab', { name: '내역 편집', exact: true }).click();
  await page.getByRole('tab', { name: '담당자 보고' }).click();
  assert.equal(
    await page
      .getByLabel('SA3A-3 호스트명', { exact: true })
      .nth(0)
      .inputValue(),
    'NEW-HOST-01'
  );
  await page
    .getByRole('button', { name: '문구 복사', exact: true })
    .first()
    .click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(clipboard, /NEW-HOST-01/);
  assert.match(clipboard, /\[소등\]/);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: '/tmp/eyecheck-report-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  const downloadWait = page.waitForEvent('download');
  await page
    .getByRole('button', { name: '새 파일로 내려받기', exact: true })
    .click();
  const download = await downloadWait;
  const saved = openEyecheckWorkbook(
    new Uint8Array(await readFile(await download.path())),
    'saved.xlsx'
  );
  assert.equal(saved.move.rows.length, 3);
  assert.equal(
    saved.move.rows.find((row) => row.vals.C === 'NEW-HOST-01').vals.L,
    '테스트 책임'
  );
  assert.equal(
    saved.move.rows.some((row) => row.vals.C === 'TEST-HOST-01'),
    false
  );
  await page
    .getByText('신규 2 · 소등 1 · 보고 선택 3', { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole('button', { name: '새 파일로 내려받기', exact: true })
      .isDisabled(),
    true
  );
  // 저장 후 신규 장비를 소등하면 신규 보고는 없어지고 원본 소등만 남는다.
  await page.getByRole('tab', { name: '내역 편집', exact: true }).click();
  await page.getByRole('checkbox', { name: '4행 선택', exact: true }).check();
  await page.getByRole('checkbox', { name: '5행 선택', exact: true }).check();
  await page.getByRole('tab', { name: '담당자 보고' }).click();
  await page
    .getByText('신규 0 · 소등 1 · 보고 선택 1', { exact: true })
    .waitFor();
  await page.getByLabel('변경 없는 기존 장비도 표시', { exact: false }).check();
  await page.getByLabel('SA3A-2 existing 보고 선택', { exact: true }).check();
  await page
    .getByText('신규 0 · 소등 1 · 보고 선택 2', { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '메뉴 접기', exact: true }).click();
  await page.waitForFunction(
    () =>
      parseFloat(
        getComputedStyle(document.querySelector('.app-content')).marginLeft
      ) <= 93
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    ),
    true
  );
  await page.screenshot({
    path: '/tmp/eyecheck-report-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: '다른 파일 열기', exact: true })
    .click();
  await upload();
  await page
    .getByText('신규 0 · 소등 0 · 보고 선택 0', { exact: true })
    .waitFor();
  await page.goto('http://127.0.0.1:5173/icheck-report');
  await page.getByRole('tab', { name: '담당자 보고' }).waitFor();
  assert.match(page.url(), /eyecheck-light-log\?tab=report/);
  await page
    .getByRole('button', { name: '붙여넣기로 보고', exact: true })
    .click();
  await page
    .getByLabel('아이체크 엑셀 원본 데이터')
    .fill(
      '2026-09-09\tLG전자\tTEST-HOST\tSA3A-1\tIBM\tServer\tMODEL\tN/A\t!점등\t1\t테스트\t테스트 책임\t확인요청'
    );
  await page.getByText('보고 대상 1건', { exact: true }).waitFor();
  // 원본 덮어쓰기의 권한/파일 API만 대체하여 실패와 재시도를 검증한다.
  await context.addInitScript((bytes) => {
    window.__failEyecheckWrite = true;
    window.__savedEyecheckBytes = bytes;
    const handle = {
      getFile: async () =>
        new File(
          [new Uint8Array(window.__savedEyecheckBytes)],
          'overwrite-test.xlsx'
        ),
      queryPermission: async () => 'granted',
      createWritable: async () => ({
        write: async (blob) => {
          if (window.__failEyecheckWrite) throw new Error('테스트 저장 실패');
          window.__savedEyecheckBytes = Array.from(
            new Uint8Array(await blob.arrayBuffer())
          );
        },
        close: async () => {},
        abort: async () => {},
      }),
    };
    window.showOpenFilePicker = async () => [handle];
  }, Array.from(reportWorkbookBytes()));
  await page.goto('http://127.0.0.1:5173/eyecheck-light-log');
  await page
    .getByRole('button', { name: 'Eye Check xlsx 파일을', exact: false })
    .click();
  await page.getByText('overwrite-test.xlsx', { exact: true }).waitFor();
  if (await page.getByRole('alertdialog').isVisible())
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '확인', exact: true })
      .click();
  await page.getByPlaceholder('A-15, D-24(2)').fill('A-5');
  await page
    .getByRole('button', { name: '원본 파일에 덮어쓰기', exact: true })
    .click();
  await page
    .getByText('파일을 쓰는 중 실패했습니다.', { exact: false })
    .waitFor();
  assert.equal(
    await page.getByPlaceholder('A-15, D-24(2)').inputValue(),
    'A-5'
  );
  await page.getByRole('tab', { name: '담당자 보고' }).click();
  await page
    .getByText('신규 1 · 소등 0 · 보고 선택 1', { exact: true })
    .waitFor();
  await page.getByLabel('SA3A-5 호스트명', { exact: true }).fill('RETRY-HOST');
  await page
    .getByLabel('SA3A-5 서버 담당자', { exact: true })
    .fill('재시도 책임');
  await page.evaluate(() => {
    window.__failEyecheckWrite = false;
  });
  await page
    .getByRole('button', { name: '원본 파일에 덮어쓰기', exact: true })
    .click();
  await page
    .getByText('신규 1 · 소등 0 · 보고 선택 1', { exact: true })
    .waitFor();
  await page.waitForFunction(
    () => !document.querySelector('fieldset[disabled]')
  );
  assert.equal(
    await page
      .getByRole('button', { name: '원본 파일에 덮어쓰기', exact: true })
      .isDisabled(),
    true
  );
  const overwritten = openEyecheckWorkbook(
    new Uint8Array(await page.evaluate(() => window.__savedEyecheckBytes)),
    'overwrite-test.xlsx'
  );
  assert.equal(
    overwritten.move.rows.find((row) => row.vals.C === 'RETRY-HOST').vals.L,
    '재시도 책임'
  );
  await page.getByRole('tab', { name: '내역 편집', exact: true }).click();
  await page.getByPlaceholder('A-15, D-24(2)').fill('A-6');
  await page.locator('input[type=date]').fill('');
  await page
    .getByRole('button', { name: '원본 파일에 덮어쓰기', exact: true })
    .click();
  await page
    .getByText('점검 날짜가 올바르지 않습니다.', { exact: true })
    .waitFor();
  assert.equal(
    await page.getByPlaceholder('A-15, D-24(2)').inputValue(),
    'A-6'
  );
  await page.getByRole('tab', { name: '담당자 보고' }).click();
  await page
    .getByLabel('SA3A-6 호스트명', { exact: true })
    .fill('SHOULD-NOT-RETURN');
  await page.getByRole('tab', { name: '내역 편집', exact: true }).click();
  await page.getByPlaceholder('A-15, D-24(2)').fill('');
  await page.getByRole('tab', { name: '담당자 보고' }).click();
  await page
    .getByText('신규 1 · 소등 0 · 보고 선택 1', { exact: true })
    .waitFor();
  await page.getByRole('tab', { name: '내역 편집', exact: true }).click();
  await page.getByPlaceholder('A-15, D-24(2)').fill('A-6');
  await page.getByRole('tab', { name: '담당자 보고' }).click();
  assert.equal(
    await page.getByLabel('SA3A-6 호스트명', { exact: true }).inputValue(),
    ''
  );
  assert.deepEqual(errors, []);
  await writeFile('/tmp/eyecheck-test.xlsx', reportWorkbookBytes());
  console.log(
    'PASS: upload, unchanged, duplicate positions, typing focus, missing fields, selection, tab persistence, clipboard, download contents, retained baseline, add-then-remove, existing report, mobile overflow, new-file reset, legacy route/paste, overwrite failure/retry, invalid date, removed-device detail reset, no browser errors'
  );
} finally {
  await browser.close();
}
