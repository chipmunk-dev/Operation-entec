import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';

const root = fileURLToPath(new URL('./', import.meta.url));
const text = await readFile(`${root}pdf-text.txt`, 'utf8');
const pages = text.split('\f').filter(part => part.trim());
const manifest = JSON.parse(await readFile(`${root}manifest.json`, 'utf8'));
assert.equal(pages.length, manifest.pageCount);
assert.equal(manifest.chapters.length, 6);
assert.doesNotMatch(text, /\uFFFD|\u25A1/);
for (const [i, page] of pages.entries()) {
  assert.match(page, /LG CNS 전자\/제조시스템팀/);
  assert.match(page, new RegExp(`${String(i + 1).padStart(2, '0')}\\s*[/]\\s*${manifest.pageCount}`));
}
for (const chapter of manifest.chapters) {
  for (let i = chapter.start - 1; i < chapter.end; i++) {
    assert.ok(pages[i].includes(chapter.name), `${i + 1}페이지 서비스명`);
    assert.ok(pages[i].includes('서비스 안내'), `${i + 1}페이지 챕터 진행 표시`);
  }
  assert.ok(pages[chapter.start - 1].includes('비슷한 서비스와의 차이'));
}
for (const expected of ['해외메일', 'G-EMS', '지속 이벤트 재전달', '자동 백업 에러', '아이체크', '지속 메시지 엑셀', '김예시', '박예시', 'NEW-HOST-01']) assert.ok(text.includes(expected), expected);
const parts = unzipSync(new Uint8Array(await readFile(`${root}samples/persistent-result.xlsx`)));
const xml = strFromU8(parts['xl/worksheets/sheet1.xml']);
assert.equal((xml.match(/<row\b/g) || []).length, 5, '헤더 + 데이터 4행');
assert.match(xml, /autoFilter ref="A1:H5"/);
const bundle = unzipSync(new Uint8Array(await readFile(`${root}operation-cns-elect-user-guide-bundle.zip`)));
assert.equal(Object.keys(bundle).length, 10);
assert.deepEqual(bundle['operation-cns-elect-user-guide.pdf'], new Uint8Array(await readFile(`${root}operation-cns-elect-user-guide.pdf`)));
const { chromium } = await import(process.env.GUIDE_PLAYWRIGHT_MODULE || '/tmp/eyecheck-ui-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(new URL('./user-guide.html', import.meta.url).href);
  for (let group = 0; group < Math.ceil(pages.length / 5); group++) {
    const images = Array.from({ length: Math.min(5, pages.length - group * 5) }, (_, i) => group * 5 + i + 1).map(n => `<figure><img src="${new URL(`./pdf-preview/page-${String(n).padStart(2, '0')}.png`, import.meta.url).href}"><figcaption>Page ${n}</figcaption></figure>`).join('');
    await page.setContent(`<style>body{margin:0;background:#d9e0e8;display:flex;gap:8px;padding:8px}figure{margin:0;width:268px}img{width:268px}figcaption{text-align:center;font:16px sans-serif}</style>${images}`);
    await page.waitForFunction(() => Array.from(document.images).every(img => img.complete && img.naturalWidth));
    await page.screenshot({ path: `${root}pdf-preview/contact-${group + 1}.png`, fullPage: true });
  }
} finally { await browser.close(); }
console.log(`PDF 한글·${pages.length}페이지·서비스별 구분·꼬릿말, XLSX 4행·필터, ZIP 구성·PDF 일치 확인 완료`);
