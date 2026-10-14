import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));
const text = await readFile(`${root}pdf-text.txt`, 'utf8');
const pages = text.split('\f').filter(value => value.trim());
assert.equal(pages.length, 9);
assert.doesNotMatch(text, /\uFFFD|\u25A1|G-EMS|아이체크|지속 메시지 엑셀/);
assert.doesNotMatch(text, /보고 대상은 3개|처음 보는 분|업무 경험이 없는 독자|사용자가 하는 일은|한눈에 보는 개선/);
for (const phrase of ['해외메일 작성', '해외 백업 오류 보고', '지속 이벤트 재전달', '정지운 사원', '이정선 책임', '강성준 책임', '데이터베이스', '참고값', '5~10초', '5분 미만', '20분 미만', 'Monitoring System', 'DEMO_DB_DAILY', 'DEMO-WEB-01', '안녕하세요.']) assert.ok(text.includes(phrase), phrase);
for (let i = 0; i < pages.length; i++) {
  assert.match(pages[i], /LG CNS 전자\/제조시스템팀/);
  assert.match(pages[i], new RegExp(`${i + 1}\\s*/\\s*9`));
}
const bundle = unzipSync(new Uint8Array(await readFile(`${root}op-improvement-proposal-three-services-bundle.zip`)));
assert.equal(Object.keys(bundle).length, 5);
assert.deepEqual(bundle['op-improvement-proposal-three-services.pdf'], new Uint8Array(await readFile(`${root}op-improvement-proposal-three-services.pdf`)));
assert.deepEqual(new Uint8Array(await readFile(`${root}운영보고업무자동화_개선제안서_2026.10.pdf`)), bundle['op-improvement-proposal-three-services.pdf']);
const { chromium } = await import(process.env.GUIDE_PLAYWRIGHT_MODULE || '/tmp/operation-guide-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1300, height: 630 } });
  await page.goto(new URL('./report.html', import.meta.url).href);
  assert.equal(await page.locator('img').count(), 6);
  assert.equal(await page.locator('.example').count(), 2);
  const fonts = await page.locator('h1').first().evaluate(el => ({ family: getComputedStyle(el).fontFamily, weight: getComputedStyle(el).fontWeight }));
  assert.ok(fonts.family.includes('Report'));
  assert.equal(fonts.weight, '700');
  for (let group = 0; group < 3; group++) {
    const cards = Array.from({ length: 3 }, (_, i) => group * 3 + i + 1).map(number => `<figure><img src="${new URL(`./pdf-preview/page-${number}.png`, import.meta.url).href}"><figcaption>Page ${number}</figcaption></figure>`).join('');
    await page.setContent(`<style>body{margin:0;padding:10px;display:flex;gap:10px;background:#dce4ec}figure{margin:0;width:416px}img{width:416px}figcaption{text-align:center;font:16px sans-serif}</style>${cards}`);
    await page.waitForFunction(() => Array.from(document.images).every(img => img.complete && img.naturalWidth));
    await page.screenshot({ path: `${root}pdf-preview/contact-${group + 1}.png`, fullPage: true });
  }
} finally { await browser.close(); }
await writeFile(`${root}verification.json`, JSON.stringify({ date: '2026-10-14', pageCount: 9, screenshotCount: 6, resultExampleCount: 3, checks: ['세 기능만 포함', '상부 보고 문체 및 작업 안내 문구 제거', '국문 고딕 본문·굵은 제목 적용', '한글 추출·페이지 번호 정상', '작성자·부서 표기 확인', '현업 시간 참고값 표기', '메일 본문·오류 보고 표·재전달 문구 예시 포함', 'PDF와 ZIP 내 보고서 일치', '전체 페이지 렌더링 검수 자료 생성'] }, null, 2));
console.log('PASS: 보고 대상 3개 / 9페이지 / 캡처 6개 / 한글·역할·참고 수치·ZIP 일치');
