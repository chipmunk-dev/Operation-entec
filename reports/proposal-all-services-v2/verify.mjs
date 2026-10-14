import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { unzipSync, strFromU8 } from 'fflate';
import { listDataRows } from '../../src/utils/xlsxSheetXml.js';
import { openEyecheckWorkbook } from '../../src/utils/eyecheckWorkbook.js';

const root = fileURLToPath(new URL('./', import.meta.url));
const manifest = JSON.parse(await readFile(`${root}manifest.json`, 'utf8'));
const evidence = JSON.parse(await readFile(`${root}evidence.json`, 'utf8'));
const text = await readFile(`${root}pdf-text.txt`, 'utf8');
const pages = text.split('\f').filter((value) => value.trim());
const normalize = (value) => value.replace(/\s/gu, '');
assert.equal(pages.length, manifest.pageCount);
assert.equal(manifest.chapters.length, 7);
assert.equal(manifest.screenshotCount, 21);
assert.equal(new Set(manifest.images).size, 21);
assert.doesNotMatch(
  text,
  /\uFFFD|\u25A1|github\.com|netlify\.app|소스 저장소|작성일|보고 대상은|처음 보는 분|15~25초|5~10초|40~60분/
);
for (const phrase of [
  '제2판',
  '정지운 사원',
  '이정선 책임',
  '강성준 책임',
  'LG CNS 전자/제조시스템 OP팀',
  '데이터베이스 미사용',
  '1분',
  '15초 미만',
  '1시간',
  '20분 미만',
  '1일 이상',
  '확인내역 자동 재생성',
  '원본 비교 유지',
  '1~2시간 이상',
  '15분 미만',
])
  assert.ok(normalize(text).includes(normalize(phrase)), phrase);
for (let i = 0; i < pages.length; i++) {
  assert.match(pages[i], /LG CNS 전자\/제조시스템팀/);
  assert.match(pages[i], new RegExp(`${i + 1}\\s*/\\s*${pages.length}`));
}
for (const c of manifest.chapters) {
  assert.ok(c.end >= c.start);
  for (let n = c.start; n <= c.end; n++)
    assert.ok(
      normalize(pages[n - 1]).includes(normalize(c.name)),
      `chapter ${c.name} page ${n}`
    );
}
// 레이아웃 추출은 좌측 캡션과 우측 예시를 같은 줄에 섞는다. 원문 비교는 PDF 읽기 순서로 검사한다.
const rawText = execFileSync(
  process.env.GUIDE_PDFTOTEXT || '/tmp/operation-guide-libs/usr/bin/pdftotext',
  ['-raw', `${root}op-improvement-proposal-all-services-v2.pdf`, '-'],
  { encoding: 'utf8' }
);
for (const key of [
  'gems',
  'redirect',
  'redirectHistory',
  'icheck',
  'icheckSecond',
  'editor',
])
  assert.ok(
    normalize(rawText).includes(normalize(evidence.results[key])),
    `실제 복사 문구: ${key}`
  );
const workbookParts = unzipSync(
  new Uint8Array(await readFile(`${root}samples/persistent-result.xlsx`))
);
const sheet = strFromU8(workbookParts['xl/worksheets/sheet1.xml']);
const rows = listDataRows(sheet, [], new Set(), 2).map((row) => row.vals);
assert.equal(rows.length, 4);
assert.deepEqual(rows, evidence.results.persistentRows);
assert.match(sheet, /autoFilter ref="A1:H5"/);
assert.match(sheet, /ySplit="1"/);
const editor = openEyecheckWorkbook(
  new Uint8Array(await readFile(`${root}samples/eyecheck-result.xlsx`)),
  'result.xlsx'
);
assert.equal(editor.move.rows.length, 3);
assert.deepEqual(
  editor.move.rows.map((row) => row.vals),
  evidence.results.editorRows
);
const bytes = new Uint8Array(await readFile(`${root}${manifest.pdfName}`));
assert.equal(
  (
    Buffer.from(bytes)
      .toString('latin1')
      .match(/\/Subtype\s*\/Link\b/g) || []
  ).length,
  7,
  'PDF 목차 링크 7개'
);
assert.deepEqual(
  bytes,
  new Uint8Array(
    await readFile(`${root}op-improvement-proposal-all-services-v2.pdf`)
  )
);
const bundle = unzipSync(
  new Uint8Array(
    await readFile(`${root}op-improvement-proposal-all-services-v2-bundle.zip`)
  )
);
assert.equal(Object.keys(bundle).length, 11);
assert.deepEqual(bundle[manifest.pdfName], bytes);
for (const [name, data] of Object.entries(bundle))
  if (name.startsWith('samples/'))
    assert.deepEqual(
      data,
      new Uint8Array(await readFile(`${root}${name}`)),
      name
    );
const { chromium } = await import(
  process.env.GUIDE_PLAYWRIGHT_MODULE ||
    '/tmp/operation-guide-tools/node_modules/playwright/index.mjs'
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1300, height: 640 },
  });
  await page.goto(new URL('./report.html', import.meta.url).href);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('.page').count(), pages.length);
  assert.equal(await page.locator('img').count(), 21);
  assert.equal(await page.locator('.example').count(), 7);
  assert.equal(await page.locator('a').count(), 7);
  assert.equal(
    await page.locator('.toc a').evaluateAll((links) => links.every((el) =>
      el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) + 1
    )),
    true,
    '목차의 기능 이름을 한 줄로 표기'
  );
  for (const c of manifest.chapters)
    assert.equal(await page.locator(`a[href="#page-${c.start}"]`).count(), 1);
  const fonts = await page
    .locator('h1')
    .first()
    .evaluate((el) => ({
      family: getComputedStyle(el).fontFamily,
      weight: getComputedStyle(el).fontWeight,
    }));
  assert.ok(fonts.family.includes('Report'));
  assert.equal(fonts.weight, '700');
  assert.ok(
    manifest.layout.every(
      (item) => item.footerGap >= 14 && !item.clipped.length
    )
  );
  await mkdir(`${root}pdf-preview`, { recursive: true });
  for (let offset = 0; offset < pages.length; offset += 3) {
    const cards = pages
      .slice(offset, offset + 3)
      .map((_, i) => {
        const n = offset + i + 1;
        return `<figure><img src="${new URL(`./pdf-preview/page-${String(n).padStart(2, '0')}.png`, import.meta.url).href}"><figcaption>Page ${n}</figcaption></figure>`;
      })
      .join('');
    await page.setContent(
      `<style>body{margin:0;padding:10px;display:flex;gap:10px;background:#dce4ec}figure{margin:0;width:416px}img{width:416px}figcaption{text-align:center;font:16px sans-serif}</style>${cards}`
    );
    await page.waitForFunction(() =>
      Array.from(document.images).every(
        (img) => img.complete && img.naturalWidth
      )
    );
    await page.screenshot({
      path: `${root}pdf-preview/contact-${Math.floor(offset / 3) + 1}.png`,
      fullPage: true,
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  `${root}verification.json`,
  JSON.stringify(
    {
      pageCount: pages.length,
      serviceCount: 7,
      screenshotCount: 21,
      nativeExampleCount: 7,
      checks: [
        '전체 페이지 수·제목·페이지 번호',
        '국문 고딕 Regular·Bold 및 한글 텍스트 추출',
        '서비스·소스 주소·작성일 미표기',
        '현재 7개 메뉴와 목차·기능별 페이지 범위 일치',
        '실제 복사 문구 6종과 PDF 본문 일치',
        '21개 실제 화면·7개 검색 가능한 결과 문구',
        'PDF·ZIP 및 동봉 샘플 파일 바이트 일치',
        '담당자별 XLSX 4행·필터·첫 행 고정',
        '아이체크 저장 XLSX 3건·실제 셀값 일치',
        '전체 페이지 잘림·가로 넘침·꼬릿말 겹침 없음',
        '전체 23페이지 시각 검수용 렌더링 완료',
      ],
    },
    null,
    2
  )
);
console.log(
  `PASS: 제2판 ${pages.length}페이지 / 7개 기능 / 실제 화면 21개 / 실제 결과·엑셀·ZIP 검증`
);
