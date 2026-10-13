import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));
const text = await readFile(`${root}pdf-text.txt`, 'utf8');
const pages = text.split('\f').filter(value => value.trim());
assert.equal(pages.length, 9);
assert.doesNotMatch(text, /\uFFFD|\u25A1|G-EMS|아이체크|지속 메시지 엑셀/);
for (const phrase of ['해외메일 작성', '해외 자동 백업 오류 정리', '지속 이벤트 재전달', '정지운 사원', '이정선 책임', '강성준 책임', '데이터베이스', '참고값', '5~10초', '5분 미만', '20분 미만']) assert.ok(text.includes(phrase), phrase);
for (let i = 0; i < pages.length; i++) {
  assert.match(pages[i], /LG CNS 전자\/제조시스템팀/);
  assert.match(pages[i], new RegExp(`${i + 1}\\s*/\\s*9`));
}
const bundle = unzipSync(new Uint8Array(await readFile(`${root}op-improvement-proposal-three-services-bundle.zip`)));
assert.equal(Object.keys(bundle).length, 5);
assert.deepEqual(bundle['op-improvement-proposal-three-services.pdf'], new Uint8Array(await readFile(`${root}op-improvement-proposal-three-services.pdf`)));
const { chromium } = await import(process.env.GUIDE_PLAYWRIGHT_MODULE || '/tmp/operation-guide-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1300, height: 630 } });
  await page.goto(new URL('./report.html', import.meta.url).href);
  assert.equal(await page.locator('img').count(), 6);
  for (let group = 0; group < 3; group++) {
    const cards = Array.from({ length: 3 }, (_, i) => group * 3 + i + 1).map(number => `<figure><img src="${new URL(`./pdf-preview/page-${number}.png`, import.meta.url).href}"><figcaption>Page ${number}</figcaption></figure>`).join('');
    await page.setContent(`<style>body{margin:0;padding:10px;display:flex;gap:10px;background:#dce4ec}figure{margin:0;width:416px}img{width:416px}figcaption{text-align:center;font:16px sans-serif}</style>${cards}`);
    await page.waitForFunction(() => Array.from(document.images).every(img => img.complete && img.naturalWidth));
    await page.screenshot({ path: `${root}pdf-preview/contact-${group + 1}.png`, fullPage: true });
  }
} finally { await browser.close(); }
await writeFile(`${root}verification.json`, JSON.stringify({ date: '2026-10-14', pageCount: 9, screenshotCount: 6, checks: ['보고 대상 세 기능만 포함', '한글 추출·페이지 번호 정상', '작성자·부서 표기 확인', '사용자 제공 시간 참고값 표기', 'PDF와 ZIP 내 보고서 일치', '전체 페이지 렌더링 검수 자료 생성'] }, null, 2));
console.log('PASS: 보고 대상 3개 / 9페이지 / 캡처 6개 / 한글·역할·참고 수치·ZIP 일치');
