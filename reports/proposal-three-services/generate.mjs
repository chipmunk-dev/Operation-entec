import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = fileURLToPath(new URL('./', import.meta.url));
const evidence = JSON.parse(await readFile(`${root}evidence.json`, 'utf8'));
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const p = text => `<p>${text}</p>`;
const h = text => `<h3>${text}</h3>`;
const note = text => `<aside>${text}</aside>`;
const table = (heads, rows, widths = heads.length === 2 ? [29, 71] : [29, 35, 36]) => `<table><colgroup>${widths.map(width => `<col style="width:${width}%">`).join('')}</colgroup><thead><tr>${heads.map(text => `<th>${text}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(text => `<td>${text}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const flow = labels => `<div class="flow">${labels.map((label, i) => `<div><span>${i + 1}</span><b>${label}</b></div>`).join('<em>→</em>')}</div>`;
const fig = (name, caption, maxHeight = 365) => `<figure><img src="screenshots/${name}.png" style="max-height:${maxHeight}px" alt="${esc(caption)}"><figcaption>${caption}<br><span>실제 서비스 화면 · 서버명·IP·담당자는 가상 값</span></figcaption></figure>`;
const metric = (before, after, unit) => `<div class="metric"><div><small>기존 방식</small><strong>${before}</strong></div><em>→</em><div><small>보조기능 활용</small><strong>${after}</strong></div><span>${unit} · 작성자 제공 참고값</span></div>`;
const beforeAfter = (before, after) => `<div class="comparison"><div><h4>기존 업무</h4><p>${before}</p></div><div><h4>개선된 업무</h4><p>${after}</p></div></div>`;
const pages = [];
const add = (section, title, intro, content, accent = '#245b87') => pages.push({ section, title, intro, content, accent });

add('개선제안 보고 · 2026.10', '서버 운영의 반복 보고 업무를<br>붙여넣기·검토·복사로 간소화', 'OP 업무 보조기능 개선제안 보고서',
  `<div class="hero"><b>보고 대상은 3개 기능입니다.</b><span>해외메일 작성 · 해외 자동 백업 오류 정리 · 지속 이벤트 재전달</span></div>` +
  p('상황실이 서버 경고와 백업 오류를 정리해 담당자에게 전달하는 과정에서 반복되는 복사·편집·양식 작성을 자동화했습니다.') +
  table(['항목', '내용'], [
    ['제안 부서', 'LG CNS 전자/제조시스템 OP팀<br>(엔텍정보통신)'],
    ['제안자', '정지운 사원 · wldns0622@cnspartner.com'],
    ['부현장대리인', '이정선 책임'],
    ['현장대리인', '강성준 책임'],
    ['작성 기준', '2026.10.14 · 현재 서비스 기능 및 실제 화면'],
    ['처리 방식', '사용자 PC의 브라우저에서 처리<br><b>업무 데이터를 처리·보관하는 별도 서버·데이터베이스 미사용</b>'],
  ]) +
  p('<small>서비스: <a href="https://stupendous-stardust-bd8168.netlify.app/">stupendous-stardust-bd8168.netlify.app</a><br>소스: <a href="https://github.com/chipmunk-dev/Operation-entec">github.com/chipmunk-dev/Operation-entec</a></small>') +
  note('업무 경험이 없는 독자를 위해 기능별 업무 목적과 입력·결과 화면을 함께 설명합니다. 화면에 실제 운영정보나 개인정보는 사용하지 않았습니다.'));

add('한눈에 보는 개선 내용', '경고를 확인한 뒤 반복되는<br>정리·전달 작업을 줄였습니다', 'OP는 서버 운영 상황을 확인하고 필요한 내용을 담당자에게 전달하는 업무를 수행합니다.',
  table(['보고 대상', '기존 수작업', '보조기능이 하는 일'], [
    ['01 · 해외메일 작성', '서버명·IP·발생시각·경고를 영문 양식에 각각 옮김', '원본을 붙여넣으면 영문 메일 본문을 한 번에 생성'],
    ['02 · 해외 자동 백업 오류 정리', '백업 작업 목록에서 오류를 찾고 정책명·시각·오류코드를 수기 정리', '작업 결과를 붙여넣으면 오류만 추출해 보고 표·텍스트로 정리'],
    ['03 · 지속 이벤트 재전달', '아직 해소되지 않은 경고를 골라 전달 문구를 다시 작성', '전달 대상을 선택하면 국내·해외 전달 양식으로 문구 생성'],
  ]) +
  h('사용자가 하는 일은 세 단계입니다') + flow(['원본 붙여넣기', '결과·대상 검토', '복사·보고']) +
  h('업무 방식의 변화') + beforeAfter('내용을 여러 번 옮기고 불필요한 기록을 지우며 보고 양식을 재조립합니다.', '필요한 원본을 붙여넣고 자동 정리된 결과를 확인한 뒤 업무 도구에 복사합니다.') +
  note('자동화 범위는 데이터 정리와 보고 문구 작성입니다. 실제 메일·메신저 발송, 장애 조치, 백업 실행은 담당자가 기존 업무 절차에 따라 수행합니다.') +
  p('<small>기능별 설명: 해외메일 3–4쪽 · 백업 오류 정리 5–6쪽 · 지속 이벤트 재전달 7–8쪽 · 개선효과 9쪽</small>'));

add('01 · 해외메일 작성 — 입력 화면', '해외 담당자에게 전달할<br>서버 경고 메일을 자동 작성', '서버 상태 감시 시스템에서 발생한 경고를 해외 담당자에게 영문으로 안내하는 업무입니다.',
  beforeAfter('엑셀·원본 목록을 보면서 서버명, IP, 발생시각, 경고 내용을 영문 메일에 각각 옮깁니다.', '4개 열을 복사해 붙여넣으면 여러 건을 동일한 영문 메일 양식으로 정리합니다.') +
  flow(['경고 목록 복사', '4개 열 붙여넣기', '자동 변환']) +
  fig('mail-input', '① 원본의 열 순서를 맞춘 뒤 경고 2건을 붙여넣은 화면', 350) +
  table(['입력 항목', '업무상 의미'], [
    ['Host / IP', '어느 서버의 경고인지 확인할 서버명과 주소'],
    ['Message / Date', '경고 내용과 발생시각'],
  ]) +
  note('예시의 CPU 사용률 경고와 디스크 사용률 경고는 서버 상태를 확인해 달라는 안내입니다. Message 안에 섞인 줄바꿈·탭과 확인 이력도 정리됩니다.'), '#245b87');

add('01 · 해외메일 작성 — 결과 화면', '본문을 다시 조립하지 않고<br>결과를 검토한 뒤 복사', '영문 안내문과 서버별 필수 정보가 같은 순서로 생성됩니다.',
  fig('mail-result', '② 영문 안내문과 서버별 발생시각·IP·서버명·경고가 자동 생성된 화면', 345) +
  table(['결과 항목', '보고에 필요한 이유'], [
    ['Date / IP / Host', '해외 담당자가 해당 시각의 대상 서버를 식별'],
    ['Message', '확인이 필요한 경고 내용 전달'],
    ['메일 전체 복사', '메일 프로그램의 본문에 바로 붙여넣기'],
  ]) +
  metric('15~25초', '5~10초', '메일 작성 1건') +
  p('<b>업무 편의성:</b> 건별 양식 재조립이 줄고, 근무자별 메일 형식과 필수 정보 배치가 일관되게 유지됩니다.') +
  note('수신자·제목은 담당자가 지정합니다. 소요 시간은 작성자가 제공한 현업 참고값이며 건수·입력 복잡도에 따라 달라집니다.'), '#245b87');

add('02 · 해외 자동 백업 오류 정리 — 입력 화면', '백업 작업 목록에서<br>보고할 오류만 자동 추출', '서버의 데이터를 보관하는 백업 작업이 제대로 끝났는지 확인하고, 오류를 담당자에게 알리는 업무입니다.',
  beforeAfter('작업 목록을 한 행씩 확인해 오류를 찾고, 백업 작업명·시작시각·오류코드를 수기 정리합니다.', '백업존을 선택하고 목록을 붙여넣으면 보고할 오류 행을 자동으로 추출합니다.') +
  flow(['백업 결과 복사', '백업존에 붙여넣기', '오류 자동 추출']) +
  fig('backup-input', '① P-EUBKMST 백업존에 작업 결과 4건을 붙여넣은 화면', 310) +
  table(['예시 상태코드', '이 서비스의 처리'], [
    ['0 · 1', '오류 보고 목록에서 제외: 2건'],
    ['58 · 84', '오류 보고 목록에 포함: 2건'],
  ]) +
  note('보고서의 “자동 백업”은 백업 오류 정리·보고 자동화를 의미합니다. 서비스 메뉴명은 “자동 백업 에러”이며, 백업 실행이나 재시도를 수행하지 않습니다.'), '#8c6016');

add('02 · 해외 자동 백업 오류 정리 — 결과 화면', '오류 작업명·시각·코드를<br>보고 표와 텍스트로 정리', '해외 백업 담당자가 어떤 작업을 확인해야 하는지 바로 알 수 있도록 결과를 묶습니다.',
  fig('backup-result', '② 작업 4건 중 오류 2건만 남은 Outlook 보고용 결과', 335) +
  table(['화면 항목', '처음 보는 분을 위한 설명'], [
    ['Policy', '어떤 백업 작업에서 오류가 났는지 알 수 있는 작업명'],
    ['RIC 시간', '화면에 표시되는 백업 시작시각'],
    ['Err: 58 / Err: 84', '확인이 필요한 오류코드'],
    ['복사 / 메모장 내보내기', '보고 표에 붙여넣거나 텍스트 파일로 보관'],
  ]) +
  metric('약 20분', '5분 미만', '백업 오류 정리·보고 1회') +
  p('<b>업무 편의성:</b> 오류 검색과 수기 재입력이 줄고, 백업존별 결과를 같은 형식으로 보고할 수 있습니다.') +
  note('Status 1도 이 서비스의 제외 대상입니다. 업무상 별도 확인이 필요한 상태는 원본과 대조하며, 입력이 비어 있을 때의 오류 0건을 성공으로 판단하지 않습니다.'), '#8c6016');

add('03 · 지속 이벤트 재전달 — 대상 선택', '아직 해소되지 않은 경고를<br>골라 담당자에게 다시 전달', '지속 이벤트는 최초 안내 후에도 해소되지 않고 목록에 남아 있는 서버 경고를 뜻합니다.',
  beforeAfter('남아 있는 경고와 담당자 메모를 대조하고, 전달할 대상을 골라 안내 문구를 다시 조립합니다.', '원본을 붙여넣고 카드별 전달 추가를 누르면 여러 경고를 한 번에 보고 문구로 정리합니다.') +
  flow(['지속 경고 붙여넣기', '재전달 대상 선택', '보고 문구 생성']) +
  fig('redirect-selection', '① 경고 3건 중 WEB·DB 2건을 선택한 실제 화면', 365) +
  table(['예시 대상', '사용자의 판단과 화면 처리'], [
    ['WEB · DB 2건', '전달 추가를 눌러 보고 문구에 포함'],
    ['HOLD 1건', '점검 중·skip 메모를 확인하여 이번 예시에서 전달 대상에 넣지 않음'],
  ]) +
  note('보류 메모를 검토하고 실제로 전달할 대상은 근무자가 판단합니다. 프로그램의 완료 표시는 장애가 해소되었다는 의미가 아닙니다.'), '#08746c');

add('03 · 지속 이벤트 재전달 — 결과 화면', '선택한 대상만<br>국내·해외 양식으로 재전달', '국내 메신저·해외 메신저·해외메일 중 상황에 맞는 보고 형식을 선택합니다.',
  fig('redirect-result', '② 선택한 2건만 포함된 국내 메신저 재전달 결과', 350) +
  table(['주요 기능', '업무상 편의성'], [
    ['전달 형식 선택', '국내·해외 담당자에게 맞는 문구를 같은 원본으로 작성'],
    ['전체 복사', '선택한 여러 경고를 한 번에 붙여넣기'],
    ['확인·전달 상태 표시', '화면에서 업무 진행 내역을 구분해 관리'],
  ]) +
  metric('40~60분', '20분 미만', '지속 이벤트 정리·재전달 1회') +
  p('<b>업무 편의성:</b> 대상별 문구 재조립을 줄이고, 불필요한 확인 이력을 정리한 일관된 양식으로 전달합니다.') +
  note('완성 문구를 업무 도구에 붙여넣은 뒤 실제 담당자에게 발송합니다. 원본을 다시 입력하거나 열 순서를 바꾸면 화면의 선택 상태가 초기화됩니다.'), '#08746c');

add('개선효과 및 적용 방향', '처리시간뿐 아니라<br>보고 편의성과 양식 일관성 개선', '세 기능 모두 수작업 재조립을 원본 붙여넣기 → 검토 → 복사로 바꿉니다.',
  h('작성자 제공 소요시간 참고값') +
  table(['업무 단위', '기존 방식', '보조기능 활용'], [
    ['해외메일 작성 1건', '15~25초', '5~10초'],
    ['백업 오류 정리·보고 1회', '약 20분', '5분 미만'],
    ['지속 이벤트 재전달 1회', '40~60분', '20분 미만'],
  ]) +
  p('<small>※ 사용자 제공 현업 경험치로, 자동 측정한 평균이나 보장 수치가 아닙니다. 작업량·내용의 복잡도에 따라 달라집니다.</small>') +
  h('자동화로 개선되는 업무 방식') + table(['개선 항목', '기대되는 업무 효과'], [
    ['반복 편집 감소', '여러 필드를 옮기고 문구를 재조립하는 대신 붙여넣기·검토·복사로 처리'],
    ['근무자별 양식 일관성', '메일·백업 보고·재전달 문구의 필수 항목과 배치 통일'],
    ['누락·오기입 예방 지원', '자동 정리된 결과를 원본과 대조하는 데 집중'],
    ['추가 데이터 서버 불필요', '현재 브라우저에서 데이터 가공·파일 생성'],
  ]) +
  h('개선제안 적용·검증 방향') +
  p('세 기능의 캡처와 사용법을 팀에 공유하고 사용성 피드백을 수집합니다. 이후 동일한 업무량을 기준으로 실제 처리시간·수기 수정 건수를 기록하여 개선효과를 보완합니다.') +
  note('제안 요지: 기존 업무 판단과 발송 절차를 유지하면서, 반복되는 자료 정리와 보고 문구 작성을 표준화하여 운영 담당자의 작업 부담을 줄입니다.'));

const font = (await readFile(process.env.GUIDE_FONT || '/tmp/operation-guide-libs/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')).toString('base64');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>OP 업무 보조기능 개선제안 보고서 — 3개 기능</title><style>
@font-face{font-family:Report;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#e6ecf1;font-family:Report,sans-serif;color:#1b2d3e;font-size:15px;line-height:1.65}.page{width:210mm;height:297mm;margin:8mm auto;padding:12mm 15mm 17mm;position:relative;background:white;border-top:5px solid var(--accent);break-after:page}.page:last-child{break-after:auto}header{font-size:12px;color:var(--accent);padding-bottom:9px;border-bottom:1.5px solid var(--accent);margin-bottom:17px;display:flex;justify-content:space-between}h1{font-size:29px;line-height:1.4;margin:0 0 12px;letter-spacing:-.4px}.intro{font-size:15px;color:#435c70;margin:0 0 16px}h3{font-size:17px;margin:18px 0 9px;color:var(--accent)}p{margin:10px 0}b{color:var(--accent)}small{font-size:12px;color:#445b6d;line-height:1.65}a{color:var(--accent);text-decoration:none}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:14px;line-height:1.6;margin:13px 0}th{background:#ecf3f7;color:var(--accent);text-align:left;font-weight:bold}th,td{padding:9px 11px;vertical-align:top;border-bottom:1px solid #d8e3eb;overflow-wrap:anywhere}tr:nth-child(even) td{background:#f7f9fb}figure{margin:16px 0 10px;text-align:center}img{max-width:100%;height:auto;border:1px solid #d9e3ec;border-radius:8px}figcaption{font-size:12px;color:#385c77;line-height:1.4;margin-top:7px}figcaption span{font-size:10px;color:#566d7f}aside{font-size:13px;line-height:1.65;background:#f7f2e7;border-left:4px solid #b08030;padding:11px 14px;margin:15px 0;color:#44381e}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:13px 0}.comparison>div{background:#f2f5f8;padding:11px 15px;border-radius:8px}.comparison>div:last-child{background:#edf5f6}.comparison h4{margin:0;color:var(--accent);font-size:14px}.comparison p{font-size:14px;margin:7px 0 0;line-height:1.6}.flow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:16px 0;font-size:13px}.flow div{display:flex;align-items:center;gap:8px;background:#edf3f7;padding:11px 12px;border-radius:6px}.flow span{background:var(--accent);color:white;border-radius:50%;width:23px;height:23px;text-align:center;font-size:12px}.flow em{font-style:normal;color:#577386}.metric{display:flex;align-items:center;gap:20px;background:#edf5f6;border-radius:8px;padding:13px 17px;margin:15px 0}.metric>div{display:flex;flex-direction:column;gap:3px}.metric small{font-size:11px}.metric strong{font-size:23px;color:var(--accent);line-height:1.3}.metric em{font-style:normal;font-size:20px;color:#718496}.metric>span{font-size:11px;color:#47606f;margin-left:auto;max-width:175px}.hero{background:#193b52;border-radius:10px;padding:26px 24px;margin:22px 0;color:white}.hero b{font-size:23px;color:#b5e5ec;display:block;line-height:1.4}.hero span{display:block;margin-top:14px;font-size:14px}footer{position:absolute;left:15mm;right:15mm;bottom:9mm;border-top:1px solid #d6e1ea;padding-top:7px;display:flex;justify-content:space-between;font-size:10px;color:#506677}tr,aside,figure,.comparison,.metric{break-inside:avoid}@page{size:A4;margin:0}@media print{body{background:white}.page{margin:0}}
</style></head><body>${pages.map((page, i) => `<section class="page" id="page-${i + 1}" style="--accent:${page.accent}"><header><span>${page.section}</span><span>OP 업무 개선제안</span></header><main><h1>${page.title}</h1><p class="intro">${page.intro}</p>${page.content}</main><footer><span>LG CNS 전자/제조시스템팀 · 개선제안 검토용</span><span>${i + 1} / ${pages.length}</span></footer></section>`).join('')}</body></html>`;
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
    const clipped = [...node.querySelectorAll('p,td,th')].some(el => el.scrollWidth > el.clientWidth + 2);
    return bottom > footer - 12 || clipped ? [{ page: i + 1, bottom, footer, clipped }] : [];
  }));
  assert.deepEqual(overflow, [], '보고서 잘림·꼬릿말 겹침');
  assert.equal(await page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)), true);
  await page.pdf({ path: `${root}op-improvement-proposal-three-services.pdf`, preferCSSPageSize: true, printBackground: true, tagged: true });
  await mkdir(`${root}preview`, { recursive: true });
  for (let i = 0; i < pages.length; i++) await page.locator('.page').nth(i).screenshot({ path: `${root}preview/page-${String(i + 1).padStart(2, '0')}.png` });
} finally { await browser.close(); }
const archive = { 'op-improvement-proposal-three-services.pdf': new Uint8Array(await readFile(`${root}op-improvement-proposal-three-services.pdf`)) };
for (const name of ['mail.txt', 'backup.txt', 'redirect.txt', 'backup-result.txt']) archive[`samples/${name}`] = new Uint8Array(await readFile(`${root}samples/${name}`));
await writeFile(`${root}op-improvement-proposal-three-services-bundle.zip`, zipSync(archive));
await writeFile(`${root}manifest.json`, JSON.stringify({ pageCount: pages.length, services: ['해외메일 작성', '해외 자동 백업 오류 정리', '지속 이벤트 재전달'], screenshots: 6, timeBasis: '사용자가 제공한 현업 소요시간 참고값, 자동 측정 평균 아님', capturedAt: evidence.capturedAt }, null, 2));
console.log(`보고서 생성 완료: ${pages.length}페이지 / 세 기능·실제 화면 6개 / 잘림 없음`);
