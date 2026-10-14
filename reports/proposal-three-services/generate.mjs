import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = fileURLToPath(new URL('./', import.meta.url));
const evidence = JSON.parse(await readFile(`${root}evidence.json`, 'utf8'));
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const p = text => `<p>${text}</p>`;
const h = text => `<h3>${text}</h3>`;
const footnote = text => `<p class="note">${text}</p>`;
const table = (heads, rows, widths = heads.length === 2 ? [26, 74] : [26, 37, 37]) => `<table><colgroup>${widths.map(width => `<col style="width:${width}%">`).join('')}</colgroup><thead><tr>${heads.map(text => `<th>${text}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(text => `<td>${text}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const flow = labels => `<div class="flow">${labels.map((label, i) => `<span><small>${String(i + 1).padStart(2, '0')}</small>${label}</span>`).join('<em>→</em>')}</div>`;
const fig = (name, caption, maxHeight = 330) => `<figure><img src="screenshots/${name}.png" style="max-height:${maxHeight}px" alt="${esc(caption)}"><figcaption>${caption}</figcaption></figure>`;
const excerpt = (label, text) => `<div class="example"><div class="example-label">${label}</div><pre>${esc(text)}</pre></div>`;
const outcome = (text, before, after, unit) => `<div class="outcome"><b>개선효과</b><p>${text}</p><div class="time"><span>${unit}</span><strong>${before} → ${after}</strong><small>현업 소요시간 참고값</small></div></div>`;
const pages = [];
const add = (section, title, summary, content, kind = '') => pages.push({ section, title, summary, content, kind });
const divider = '-------------------------------------------------------';
const mailParts = evidence.results.mail.split(divider);
assert.equal(mailParts.length, 4, '해외메일 실제 생성 결과의 2건 구성');
const mailExcerpt = `${mailParts[0]}${divider}${mailParts[1]}${divider}${mailParts.at(-1)}`.trim();
const [zone, policies, times, errors] = evidence.results.backup.split('\t');
const backupRows = policies.split('\n').map((policy, i) => [zone, policy, times.split('\n')[i], errors.split('\n')[i]]);

add('운영 업무 개선제안', '운영 보고 업무 자동화<br>개선제안서', '해외 경고메일 작성 · 해외 백업 오류 보고 · 지속 경고 재전달',
  `<div class="cover-purpose">반복적인 정보 정리와 보고문구 작성의 표준화를 통한<br><b>운영 업무 효율 및 보고 일관성 제고</b></div>` +
  table(['구분', '내용'], [
    ['소속', 'LG CNS 전자/제조시스템 OP팀<br>(엔텍정보통신)'],
    ['제안자', '정지운 사원'],
    ['부현장대리인', '이정선 책임'],
    ['현장대리인', '강성준 책임'],
    ['작성일', '2026년 10월 14일'],
    ['개발·운영 방식', '브라우저 기반 업무 지원 도구<br><b>업무 데이터 처리·보관용 별도 서버 및 데이터베이스 미사용</b>'],
  ]) +
  `<div class="cover-links"><p>서비스 <a href="https://stupendous-stardust-bd8168.netlify.app/">stupendous-stardust-bd8168.netlify.app</a></p><p>소스 저장소 <a href="https://github.com/chipmunk-dev/Operation-entec">github.com/chipmunk-dev/Operation-entec</a></p><p>문의 wldns0622@cnspartner.com</p></div>` +
  footnote('웹 접속에는 서비스 호스팅을 사용하며, 입력 데이터 가공과 파일 생성은 사용자 PC의 브라우저에서 수행.'), 'cover');

add('01  개선 개요', '추진 배경 및 개선 내용', '반복 수작업을 자동 정리·양식 생성으로 전환하고, 담당자는 결과 검토와 전달에 집중.',
  h('운영지원 업무의 역할') +
  p('서버와 업무시스템의 상태를 확인하고, 경고 또는 백업 오류가 발생하면 점검할 내용을 담당자에게 전달하는 업무. 정확한 대상·시각·현상을 정리해야 담당자가 문제를 확인하고 조치할 수 있음.') +
  h('현행 업무의 개선 필요성') +
  p('경고 목록과 백업 결과를 보고 양식에 옮기는 과정에서 반복 복사·수기 입력이 발생. 건수가 많아질수록 정리 시간이 증가하고, 근무자에 따라 필수 정보의 배치와 전달 문구가 달라짐.') +
  table(['개선 기능', '현행 방식', '개선 내용'], [
    ['해외메일 작성', '서버명·주소·발생시각·경고를 영문 메일에 개별 입력', '원본 데이터를 영문 메일 양식으로 일괄 변환'],
    ['해외 백업 오류 보고', '작업 결과에서 오류를 찾아 작업명·시각·코드를 수기 정리', '오류만 추출하여 백업존별 보고 표와 텍스트 생성'],
    ['지속 이벤트 재전달', '미해소 경고의 전달 대상을 확인하고 문구를 재작성', '선택한 경고를 국내·해외 전달 양식으로 자동 구성'],
  ]) +
  h('개선 후 업무 흐름') + flow(['원본 데이터 입력', '자동 정리·문구 생성', '담당자 검토·전달']) +
  footnote('적용 범위: 자료 정리와 보고문구 생성. 경고의 조치 여부 판단, 메일·메신저 발송, 백업 실행은 기존 업무 절차에 따라 담당자가 수행.') +
  footnote('화면 및 결과 예시에는 가상 서버명·IP·담당자를 사용. 처리시간은 현업 경험 기반 참고값이며, 자동 측정 평균 또는 보장 수치가 아님.'));

add('02  해외메일 작성', '해외 경고메일 작성 자동화', '서버 경고의 필수 정보를 영문 보고 양식으로 일괄 변환.',
  h('업무 목적') +
  p('서버 상태 감시 시스템에서 발생한 경고를 해외 담당자에게 영문으로 전달하는 업무. 발생시각, 서버명, 서버 주소(IP), 경고 내용이 정확히 전달되어야 대상 서버를 식별하고 상태를 점검할 수 있음.') +
  table(['구분', '처리 내용'], [
    ['현행 업무', '엑셀·원본 목록을 확인하며 필수 정보를 메일 본문에 각각 입력'],
    ['개선 기능', '경고 목록 입력 시 불필요한 확인 이력과 내부 줄바꿈을 정리하고 영문 메일 생성'],
    ['입력 정보', 'Host(서버명) · Message(경고) · Date(발생시각) · IP(서버 주소)'],
  ]) +
  fig('mail-input', '그림 1. 경고 2건 입력 및 원본 열 순서 설정', 300) +
  h('처리 예시') +
  p('서버 처리장치(CPU) 사용률 경고와 저장공간 사용률 경고를 각각 1건 입력하면, 동일한 영문 메일 형식으로 생성. 담당자 메모는 제거하고 점검에 필요한 정보만 전달.'));

add('02  해외메일 작성', '생성 결과 및 개선효과', '자동 생성된 본문을 검토한 후 기존 메일 프로그램에서 발송.',
  `<div class="result-grid"><div>${fig('mail-result', '그림 2. 영문 메일 생성 화면', 310)}</div><div>${excerpt('생성 본문 예시 · 실제 결과에서 1건 발췌', mailExcerpt)}</div></div>` +
  table(['결과 구성', '업무 활용'], [
    ['영문 안내문', '서버 경고 발생 및 점검 요청을 동일한 문구로 안내'],
    ['서버별 필수 정보', 'Date·IP·Host·Message를 일정한 순서로 배치'],
    ['본문 일괄 복사', '완성된 내용을 메일 본문에 복사하고 수신자·제목 확인 후 발송'],
  ]) +
  outcome('정보 재입력과 메일 양식 재조립 감소. 근무자별 전달 형식 통일 및 필수 항목 누락 예방 지원.', '15~25초', '5~10초', '메일 작성 1건') +
  footnote('예시는 서버 처리장치(CPU) 사용률 경고. 입력된 시각을 표시하며 시간대 변환이나 메일 발송을 자동 수행하지 않음.'));

add('03  해외 백업 오류 보고', '백업 오류 추출 및 보고 자동화', '해외 시스템의 백업 작업 결과에서 확인이 필요한 오류를 추출.',
  h('업무 목적') +
  p('백업은 장애나 데이터 손실에 대비해 업무 데이터를 별도로 보관하는 작업. 운영 담당자는 작업 완료 결과를 확인하고, 오류가 있는 작업을 정리하여 담당자에게 점검을 요청함.') +
  table(['구분', '처리 내용'], [
    ['현행 업무', '작업 목록을 행별로 확인하고 오류 작업명·시작시각·상태코드를 수기 작성'],
    ['개선 기능', '백업존별 목록을 입력하면 오류 행을 추출하고 보고 항목을 자동 정리'],
    ['입력 정보', 'Status(작업 상태코드) · Policy(작업명) · Start Time(시작시각)'],
    ['관리 구분', '백업존: 작업 결과를 구분하여 정리하는 관리 단위'],
  ]) +
  fig('backup-input', '그림 3. 백업 작업 결과 4건 입력 및 오류 분류', 275) +
  h('처리 예시') +
  p('입력 4건 중 Status 0·1인 2건은 오류 보고에서 제외하고, 58·84인 2건을 보고 대상으로 추출.') +
  footnote('서비스 메뉴명: 자동 백업 에러. 자동화 범위는 오류 추출과 보고 작성이며 백업 실행·재시도는 포함하지 않음.'));

add('03  해외 백업 오류 보고', '생성 결과 및 개선효과', '오류 작업명·시작시각·코드를 백업존별로 정리하여 보고 자료로 활용.',
  fig('backup-result', '그림 4. 오류 2건으로 정리된 보고용 결과 화면', 250) +
  h('보고 표 생성 예시 · 실제 결과') +
  table(['백업존', '작업명', '시작시각', '오류코드'], backupRows, [18, 30, 33, 19]) +
  table(['결과 구성', '업무 활용'], [
    ['보고 표 복사', '작업명·시각·오류코드를 Outlook 보고 표에 일괄 반영'],
    ['텍스트 파일 생성', '세 백업존의 오류 결과를 구분해 파일로 저장'],
  ]) +
  outcome('오류 검색 및 수기 전사 작업 감소. 백업존별 보고 항목과 표 구성을 통일하여 후속 점검 대상 식별 지원.', '약 20분', '5분 미만', '오류 정리·보고 1회') +
  footnote('현행 추출 규칙은 Status 0·1 제외. 원본의 업무상 확인 필요 여부는 별도 검토하며, 입력이 없는 경우의 오류 0건은 백업 성공을 의미하지 않음.'));

add('04  지속 이벤트 재전달', '지속 경고 재전달 자동화', '최초 안내 이후 미해소 상태로 남은 경고를 선별하여 담당자에게 재안내.',
  h('업무 목적') +
  p('지속 이벤트는 서버 경고를 최초 안내한 뒤에도 해소되지 않고 목록에 남아 있는 항목. 운영 담당자는 미해소 경고와 점검·보류 메모를 확인한 후, 재확인이 필요한 내용을 담당자에게 다시 전달함.') +
  table(['구분', '처리 내용'], [
    ['현행 업무', '지속 경고와 처리 메모를 대조하고 전달 대상별 안내 문구를 재작성'],
    ['개선 기능', '전달 대상을 선택하면 불필요한 이력을 정리한 보고 문구 생성'],
    ['입력 정보', '서버명 · 경고 내용 · 발생시각 · IP 및 보고자 정보'],
  ]) +
  fig('redirect-selection', '그림 5. 경고 3건 중 재전달 대상 2건 선택', 305) +
  h('처리 예시') +
  p('WEB·DB 서버 경고 2건은 전달 대상으로 선택. 점검 중 보류 메모가 있는 HOLD 서버 1건은 검토 후 선택 대상에서 제외.'));

add('04  지속 이벤트 재전달', '생성 결과 및 개선효과', '선택한 경고만 포함하여 국내·해외 담당자에 맞는 전달 문구 생성.',
  `<div class="result-grid"><div>${fig('redirect-result', '그림 6. 재전달 문구 생성 화면', 305)}</div><div>${excerpt('생성 문구 예시 · 실제 결과', evidence.results.redirect)}</div></div>` +
  table(['결과 구성', '업무 활용'], [
    ['전달 형식 선택', '국내 메신저·해외 메신저·해외메일에 맞는 문구 생성'],
    ['선택 대상 일괄 복사', '여러 경고를 하나의 문구로 묶어 업무 도구에 반영'],
    ['확인·전달 상태 기록', '화면에서 처리 진행 내역을 구분하여 관리'],
  ]) +
  outcome('대상별 문구 재조립 감소. 보류 항목 검토와 선택 대상 확인에 집중하고, 근무자별 재전달 양식 일관성 확보 지원.', '40~60분', '20분 미만', '지속 경고 재전달 1회') +
  footnote('실제 발송과 조치 여부 판단은 담당자가 수행. 화면의 완료 표시는 서버 경고가 해소되었다는 의미가 아님.'));

add('05  개선효과 및 적용 방향', '업무 효율 및 보고 품질 개선', '반복 편집 감소와 보고 형식 표준화를 통해 운영 담당자의 작업 부담 완화.',
  h('업무별 소요시간 비교') +
  table(['업무 단위', '기존 방식', '보조기능 활용'], [
    ['해외메일 작성 1건', '15~25초', '5~10초'],
    ['백업 오류 정리·보고 1회', '약 20분', '5분 미만'],
    ['지속 이벤트 재전달 1회', '40~60분', '20분 미만'],
  ]) +
  footnote('현업 경험 기반 참고값. 작업량·내용의 복잡도에 따라 달라지며, 자동 측정 평균 또는 보장 수치가 아님.') +
  h('정성적 개선효과') + table(['개선 항목', '개선 내용'], [
    ['반복 작업 감소', '원본 입력과 결과 검토·복사 중심으로 업무 전환'],
    ['보고 형식 일관성', '메일·오류 보고·재전달 문구의 필수 항목과 배치 표준화'],
    ['누락·오기입 예방 지원', '재입력 구간을 줄이고 원본 대조와 대상 검토에 집중'],
    ['구축 부담 최소화', '브라우저에서 처리하여 별도 업무 데이터 서버·DB 구축 불필요'],
  ]) +
  h('적용 및 효과 검증') +
  table(['구분', '추진 내용'], [
    ['사용성 점검', '기능별 사용법 공유 및 팀원 피드백 반영'],
    ['효과 검증', '동일 업무량 기준 처리시간·수기 수정 건수 기록'],
    ['업무 기준 유지', '수신자 확인·보류 여부 판단·최종 발송은 기존 운영 절차 적용'],
  ]) +
  p('<b>제안 요지</b>　운영 판단과 보고 체계를 유지하면서 반복적인 자료 정리·문구 생성을 표준화하여 업무 효율을 개선.'));

const fonts = process.env.GUIDE_FONT_DIR || '/tmp/operation-guide-libs/usr/share/fonts/opentype/noto';
const regular = (await readFile(process.env.GUIDE_FONT || `${fonts}/NotoSansCJK-Regular.ttc`)).toString('base64');
const bold = (await readFile(process.env.GUIDE_BOLD_FONT || `${fonts}/NotoSansCJK-Bold.ttc`)).toString('base64');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>운영 보고 업무 자동화 개선제안서</title><style>
@font-face{font-family:Report;src:url(data:font/ttf;base64,${regular});font-weight:400}@font-face{font-family:Report;src:url(data:font/ttf;base64,${bold});font-weight:700}*{box-sizing:border-box}body{margin:0;background:#e7ebef;font-family:Report,sans-serif;color:#20262e;font-size:15px;line-height:1.65}.page{width:210mm;height:297mm;margin:8mm auto;padding:13mm 16mm 17mm;position:relative;background:white;break-after:page}.page:last-child{break-after:auto}header{display:flex;justify-content:space-between;font-size:11px;color:#485566;border-bottom:1px solid #253951;padding-bottom:9px;margin-bottom:20px}h1{font-size:27px;line-height:1.4;margin:0 0 11px;letter-spacing:-.35px;font-weight:700}.summary{font-size:15px;color:#394958;margin:0 0 19px}h3{font-size:16px;color:#243b55;margin:18px 0 8px;font-weight:700}h3:before{content:'';display:inline-block;width:4px;height:13px;background:#243b55;margin-right:8px}p{margin:9px 0}b,strong{font-weight:700}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:14px;line-height:1.6;margin:12px 0}th{background:#edf0f4;color:#26364a;text-align:left;border-top:1px solid #6f7d8d;font-weight:700}th,td{padding:8px 10px;border-bottom:1px solid #d0d6de;vertical-align:top;overflow-wrap:anywhere}tr:nth-child(even) td{background:#fafbfc}.note{font-size:12px;color:#505b68;line-height:1.6;margin-top:12px}.note:before{content:'※ ';color:#505b68}figure{margin:14px 0 10px;text-align:center}img{max-width:100%;height:auto;border:1px solid #d4dae2;border-radius:2px}figcaption{font-size:11px;color:#47566a;line-height:1.5;margin-top:7px}.flow{display:flex;align-items:center;justify-content:space-between;gap:9px;margin:14px 0;font-size:13px;color:#2e4158}.flow span{border-bottom:2px solid #718297;padding:7px 8px}.flow small{font-weight:700;margin-right:8px}.flow em{font-style:normal;color:#7b8796}.outcome{border-top:1px solid #9ba7b4;border-bottom:1px solid #cdd4dc;padding:12px 0;margin:17px 0}.outcome>b{font-size:14px;color:#243b55}.outcome p{font-size:14px;margin:5px 0 10px}.time{display:flex;align-items:baseline;gap:15px;padding:8px 11px;background:#f0f3f6;font-size:13px}.time strong{font-size:18px;color:#243b55}.time small{margin-left:auto;font-size:10px;color:#5a6470}.result-grid{display:grid;grid-template-columns:44% 1fr;gap:17px;align-items:start;margin-top:15px}.result-grid figure{margin-top:0}.example{border:1px solid #bdc8d5;background:#f9fafc}.example-label{font-size:11px;font-weight:700;line-height:1.4;padding:8px 11px;color:#243b55;border-bottom:1px solid #d7dee7}.example pre{font-family:Report,sans-serif;font-size:12px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;margin:0;padding:12px;color:#20262e;tab-size:2}.cover header{margin-bottom:49px}.cover h1{font-size:36px;line-height:1.5;margin-bottom:16px}.cover .summary{font-size:16px}.cover-purpose{margin:28px 0;padding:17px 0;border-top:2px solid #243b55;border-bottom:1px solid #a5b1bf;font-size:16px;color:#293b50;line-height:1.7}.cover table{margin-top:31px}.cover-links{font-size:12px;margin-top:25px;color:#47576a}.cover-links p{margin:5px 0}a{color:#324f70;text-decoration:none}footer{position:absolute;left:16mm;right:16mm;bottom:9mm;border-top:1px solid #c8d1dc;padding-top:7px;display:flex;justify-content:space-between;color:#4d5e70;font-size:10px}tr,figure,.example,.outcome{break-inside:avoid}@page{size:A4;margin:0}@media print{body{background:white}.page{margin:0}}
.example pre{font-size:13px;line-height:1.6}
</style></head><body>${pages.map((page, i) => `<section class="page ${page.kind}" id="page-${i + 1}"><header><span>${page.section}</span><span>운영 보고 업무 자동화</span></header><main><h1>${page.title}</h1><p class="summary">${page.summary}</p>${page.content}</main><footer><span>LG CNS 전자/제조시스템팀</span><span>${i + 1} / ${pages.length}</span></footer></section>`).join('')}</body></html>`;
await writeFile(`${root}report.html`, html);
const { chromium } = await import(process.env.GUIDE_PLAYWRIGHT_MODULE || '/tmp/operation-guide-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  await page.goto(new URL('./report.html', import.meta.url).href);
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  const overflow = await page.locator('.page').evaluateAll(nodes => nodes.flatMap((node, i) => {
    const bottom = node.querySelector('main').getBoundingClientRect().bottom;
    const footer = node.querySelector('footer').getBoundingClientRect().top;
    const clipped = [...node.querySelectorAll('p,td,th,pre')].some(el => el.scrollWidth > el.clientWidth + 2);
    return bottom > footer - 14 || clipped ? [{ page: i + 1, bottom, footer, clipped }] : [];
  }));
  assert.deepEqual(overflow, [], '보고서 잘림·꼬릿말 겹침');
  assert.equal(await page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)), true);
  assert.equal(await page.locator('.example').count(), 2);
  assert.ok((await page.locator('body').innerText()).includes('DEMO_DB_DAILY'));
  assert.ok((await page.locator('body').innerText()).includes('안녕하세요.'));
  await page.pdf({ path: `${root}op-improvement-proposal-three-services.pdf`, preferCSSPageSize: true, printBackground: true, tagged: true });
  await mkdir(`${root}preview`, { recursive: true });
  for (let i = 0; i < pages.length; i++) await page.locator('.page').nth(i).screenshot({ path: `${root}preview/page-${String(i + 1).padStart(2, '0')}.png` });
} finally { await browser.close(); }
const archive = { 'op-improvement-proposal-three-services.pdf': new Uint8Array(await readFile(`${root}op-improvement-proposal-three-services.pdf`)) };
for (const name of ['mail.txt', 'backup.txt', 'redirect.txt', 'backup-result.txt']) archive[`samples/${name}`] = new Uint8Array(await readFile(`${root}samples/${name}`));
await writeFile(`${root}op-improvement-proposal-three-services-bundle.zip`, zipSync(archive));
await copyFile(`${root}op-improvement-proposal-three-services.pdf`, `${root}운영보고업무자동화_개선제안서_2026.10.pdf`);
await writeFile(`${root}manifest.json`, JSON.stringify({ pageCount: pages.length, services: ['해외메일 작성', '해외 백업 오류 보고', '지속 이벤트 재전달'], screenshots: 6, resultExamples: ['영문 메일 본문 1건 발췌', '오류 보고 표 2건', '재전달 문구 2건'], typography: '본고딕 계열 국문 고딕 Regular / Bold', timeBasis: '현업 소요시간 참고값, 자동 측정 평균 아님', capturedAt: evidence.capturedAt }, null, 2));
console.log(`상부 보고용 개정본: ${pages.length}페이지 / 캡처 6개 / 결과 예시 3개 / 잘림 없음`);
