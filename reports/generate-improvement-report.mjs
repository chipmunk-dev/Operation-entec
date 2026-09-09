import fs from 'node:fs';
import PDFDocument from '/tmp/operation-report-tools/node_modules/pdfkit/js/pdfkit.js';

const outputPath = new URL('./operation-cns-elect-improvement-report.pdf', import.meta.url);
const assetPath = new URL('./assets/', import.meta.url).pathname;
const regularFont = '/tmp/operation-report-tools/NotoSansCJKkr-Regular.otf';
const boldFont = '/tmp/operation-report-tools/NotoSansCJKkr-Bold.otf';
const serviceUrl = 'https://stupendous-stardust-bd8168.netlify.app';
const githubUrl = 'https://github.com/chipmunk-dev/Operation-entec';

const C = {
  navy: '#0F172A',
  slate: '#475569',
  muted: '#64748B',
  line: '#DCE5EF',
  soft: '#F4F7FB',
  blue: '#2563EB',
  blueSoft: '#EAF2FF',
  cyan: '#0891B2',
  cyanSoft: '#E8F8FC',
  green: '#059669',
  greenSoft: '#E9F9F2',
  amber: '#D97706',
  amberSoft: '#FFF6E5',
  red: '#DC2626',
  white: '#FFFFFF',
};

const doc = new PDFDocument({
  size: 'A4',
  margin: 0,
  info: {
    Title: 'Operation CNS Elect 운영 업무 개선활동 보고',
    Author: '정지운',
    Subject: '반복 운영업무 자동화 및 보고 품질 표준화',
  },
  bufferPages: true,
});

doc.registerFont('KR', regularFont);
doc.registerFont('KR-Bold', boldFont);
doc.pipe(fs.createWriteStream(outputPath));

const W = 595.28;
const H = 841.89;
const M = 44;
const CW = W - M * 2;

function rect(x, y, w, h, fill, radius = 12, stroke = null) {
  doc.roundedRect(x, y, w, h, radius);
  if (fill) doc.fill(fill);
  if (stroke) doc.strokeColor(stroke).lineWidth(0.8).stroke();
}

function line(x1, y1, x2, y2, color = C.line, width = 1) {
  doc.moveTo(x1, y1).lineTo(x2, y2).strokeColor(color).lineWidth(width).stroke();
}

function text(value, x, y, options = {}) {
  const {
    size = 10,
    color = C.navy,
    font = 'KR',
    width,
    align = 'left',
    lineGap = 2,
    continued = false,
    link,
    underline = false,
  } = options;
  doc.font(font).fontSize(size).fillColor(color).text(value, x, y, {
    width,
    align,
    lineGap,
    continued,
    link,
    underline,
  });
}

function label(value, x, y, color = C.blue, bg = C.blueSoft) {
  const width = doc.font('KR-Bold').fontSize(8).widthOfString(value) + 18;
  rect(x, y, width, 22, bg, 11);
  text(value, x + 9, y + 6, { size: 8, color, font: 'KR-Bold' });
  return width;
}

function pageBase(section, title, subtitle = '') {
  doc.addPage();
  rect(0, 0, W, 8, C.blue, 0);
  text(section, M, 34, { size: 8, color: C.blue, font: 'KR-Bold' });
  text(title, M, 53, { size: 25, color: C.navy, font: 'KR-Bold', width: CW });
  if (subtitle) text(subtitle, M, 91, { size: 10, color: C.muted, width: CW, lineGap: 3 });
  line(M, 122, W - M, 122);
}

function sectionTitle(value, y, kicker = '') {
  if (kicker) text(kicker, M, y, { size: 8, color: C.blue, font: 'KR-Bold' });
  text(value, M, y + (kicker ? 18 : 0), { size: 17, font: 'KR-Bold', width: CW });
}

function bullet(value, x, y, width, options = {}) {
  const color = options.color ?? C.slate;
  doc.circle(x + 3, y + 7, 2.4).fill(options.dot ?? C.blue);
  text(value, x + 13, y, { size: options.size ?? 9.2, color, width: width - 13, lineGap: 3 });
}

function metricCard(x, y, w, h, value, title, detail, color, bg) {
  rect(x, y, w, h, bg, 14);
  text(value, x + 16, y + 15, { size: 25, color, font: 'KR-Bold', width: w - 32 });
  text(title, x + 16, y + 50, { size: 10, color: C.navy, font: 'KR-Bold', width: w - 32 });
  text(detail, x + 16, y + 69, { size: 7.8, color: C.muted, width: w - 32, lineGap: 2 });
}

function featureCard({ x, y, w, h, no, title, purpose, before, after, color = C.blue, bg = C.blueSoft }) {
  rect(x, y, w, h, C.white, 14, C.line);
  rect(x + 14, y + 14, 34, 34, bg, 10);
  text(String(no).padStart(2, '0'), x + 14, y + 23, {
    size: 11,
    color,
    font: 'KR-Bold',
    width: 34,
    align: 'center',
  });
  text(title, x + 58, y + 14, { size: 12, color: C.navy, font: 'KR-Bold', width: w - 72 });
  text(purpose, x + 58, y + 34, { size: 8.3, color: C.slate, width: w - 72, lineGap: 2 });
  line(x + 14, y + 66, x + w - 14, y + 66);
  label('기존', x + 14, y + 77, C.amber, C.amberSoft);
  text(before, x + 68, y + 80, { size: 8, color: C.muted, width: w - 82, lineGap: 2 });
  label('개선', x + 14, y + 112, C.green, C.greenSoft);
  text(after, x + 68, y + 115, { size: 8, color: C.navy, width: w - 82, lineGap: 2 });
}

function screenFeatureCard({ x, y, w, h, no, title, purpose, before, after, image, color = C.blue, bg = C.blueSoft }) {
  rect(x, y, w, h, C.white, 14, C.line);
  const imageWidth = 218;
  const imageHeight = 136;
  const imageX = x + w - imageWidth - 14;
  const copyWidth = w - imageWidth - 48;

  rect(x + 14, y + 14, 32, 32, bg, 9);
  text(String(no).padStart(2, '0'), x + 14, y + 22, {
    size: 9,
    color,
    font: 'KR-Bold',
    width: 32,
    align: 'center',
  });
  text(title, x + 56, y + 13, { size: 11.2, font: 'KR-Bold', width: copyWidth - 42 });
  text(purpose, x + 14, y + 52, { size: 7.6, color: C.slate, width: copyWidth, lineGap: 2 });
  label('기존', x + 14, y + 88, C.amber, C.amberSoft);
  text(before, x + 66, y + 91, { size: 6.9, color: C.muted, width: copyWidth - 52, lineGap: 1.5 });
  label('개선', x + 14, y + 122, C.green, C.greenSoft);
  text(after, x + 66, y + 125, { size: 6.9, color: C.navy, width: copyWidth - 52, lineGap: 1.5 });

  doc.save();
  doc.roundedRect(imageX, y + 14, imageWidth, imageHeight, 9).clip();
  doc.image(`${assetPath}${image}`, imageX, y + 14, {
    fit: [imageWidth, imageHeight],
    align: 'center',
    valign: 'center',
  });
  doc.restore();
  doc.roundedRect(imageX, y + 14, imageWidth, imageHeight, 9).strokeColor(C.line).lineWidth(0.7).stroke();
}

function footer(page, total) {
  line(M, H - 38, W - M, H - 38, '#E7EDF4', 0.7);
  text('LG CNS 전자/제조시스템팀 · 운영 업무 개선활동', M, H - 29, {
    size: 7,
    color: '#94A3B8',
  });
  text(`${page} / ${total}`, W - 84, H - 29, {
    size: 7,
    color: '#94A3B8',
    width: 40,
    align: 'right',
  });
}

// 1. Cover
rect(0, 0, W, H, C.navy, 0);
doc.circle(515, 95, 145).fill('#17356E');
doc.circle(515, 95, 102).fill('#1D4ED8');
doc.circle(85, 760, 130).fill('#123552');
label('2025.12 - 2026.09 TEAM IMPROVEMENT', M, 55, '#BFDBFE', '#1E3A70');
text('반복 운영업무를\n더 빠르고 정확하게', M, 118, {
  size: 34,
  color: C.white,
  font: 'KR-Bold',
  width: 440,
  lineGap: 7,
});
text('Operation CNS Elect', M, 233, {
  size: 16,
  color: '#7DD3FC',
  font: 'KR-Bold',
});
text('관제·운영 데이터 정리와 보고 문구 작성을 자동화한\n브라우저 기반 업무 보조 서비스', M, 272, {
  size: 12,
  color: '#CBD5E1',
  width: 420,
  lineGap: 5,
});

rect(M, 374, CW, 192, '#15213A', 20, '#31415D');
text('기능별 확인된 개선 효과', M + 24, 397, { size: 10, color: '#93C5FD', font: 'KR-Bold' });
const coverMetrics = [
  ['해외메일 · 하루 100건', '약 25분', '약 15분'],
  ['백업 오류 필터', '약 20분', '5분 미만'],
  ['지속 이벤트 재전달', '약 40~60분', '20분 미만'],
  ['지속 메시지 Excel', '1~2시간 이상', '15분 미만'],
];
coverMetrics.forEach(([name, before, after], index) => {
  const y = 426 + index * 34;
  text(name, M + 24, y + 4, { size: 8.1, color: '#CBD5E1', font: 'KR-Bold', width: 150 });
  text(before, M + 190, y + 2, { size: 11, color: C.white, font: 'KR-Bold', width: 95, align: 'right' });
  text('→', M + 302, y + 1, { size: 13, color: '#60A5FA', font: 'KR-Bold', width: 24, align: 'center' });
  text(after, M + 344, y + 2, { size: 11, color: '#67E8F9', font: 'KR-Bold', width: 112 });
  if (index < coverMetrics.length - 1) line(M + 24, y + 27, W - M - 24, y + 27, '#2B3B57', 0.6);
});

rect(M, 590, CW, 42, '#0B3D46', 12, '#155E75');
text('SECURITY', M + 15, 603, { size: 7.5, color: '#67E8F9', font: 'KR-Bold', width: 55 });
text('업무 데이터 처리용 서버·데이터베이스 미사용  ·  입력 데이터는 브라우저 내부에서 처리', M + 78, 601, {
  size: 8.6,
  color: '#CCFBF1',
  font: 'KR-Bold',
  width: CW - 94,
});

rect(M, 648, CW, 127, '#15213A', 16, '#31415D');
line(M + 329, 662, M + 329, 761, '#31415D', 0.7);
text('소속', M + 17, 663, { size: 7.5, color: '#93C5FD', font: 'KR-Bold' });
text('LG CNS 전자/제조시스템 OP팀(엔텍정보통신)', M + 17, 681, {
  size: 10.2,
  color: C.white,
  font: 'KR-Bold',
  width: 295,
});
text('개선활동 담당', M + 17, 713, { size: 7.5, color: '#93C5FD', font: 'KR-Bold' });
text('정지운 사원', M + 17, 732, { size: 10, color: C.white, font: 'KR-Bold' });
text('wldns0622@cnspartner.com', M + 91, 733, { size: 8, color: '#94A3B8', width: 205 });

text('부현장대리인', M + 347, 663, { size: 7.5, color: '#93C5FD', font: 'KR-Bold' });
text('이정선 책임', M + 347, 681, { size: 10, color: C.white, font: 'KR-Bold' });
text('현장대리인', M + 347, 715, { size: 7.5, color: '#93C5FD', font: 'KR-Bold' });
text('강성준 책임', M + 347, 733, { size: 10, color: C.white, font: 'KR-Bold' });

text('개선활동 보고 · 2026.09', M, 793, { size: 8, color: '#94A3B8' });
text('※ 처리시간은 현업 경험 기준의 대략값이며 데이터량과 업무 유형에 따라 달라질 수 있습니다.', M, 814, {
  size: 6.8,
  color: '#64748B',
  width: CW,
});

// 2. Executive summary
pageBase('01  EXECUTIVE SUMMARY', '개인 불편에서 시작해 팀의 표준 업무 도구로',
  '반복되는 수작업을 줄이고, 누구나 같은 형식의 결과를 만들 수 있도록 현업 담당자가 직접 설계했습니다.');

metricCard(M, 150, 158, 108, '6개', '운영 중인 보조 기능', '메일·메신저·Excel·백업 오류 등 반복 업무를 한곳에서 처리', C.blue, C.blueSoft);
metricCard(M + 174, 150, 158, 108, '기능별', '업무시간 단축', '각 기능의 실제 사용 방식에 맞춰 전후 처리시간을 개별 비교', C.green, C.greenSoft);
metricCard(M + 348, 150, 159, 108, '브라우저', '서버·DB 미사용', '업무 데이터는 외부 저장 없이 사용자 브라우저 내부에서 처리', C.cyan, C.cyanSoft);

sectionTitle('왜 이 서비스가 필요했나', 292);
const problems = [
  ['반복 입력', '관제 화면과 엑셀의 데이터를 사람이 다시 정리하고 보고 문구를 작성'],
  ['불규칙한 원본', '셀 안의 탭·줄바꿈·따옴표 때문에 행이 깨지고 담당자 판독이 어려움'],
  ['개인별 편차', '같은 상황도 근무자마다 문구와 결과 형식이 달라 재확인이 필요'],
];
problems.forEach(([t, d], i) => {
  const y = 336 + i * 67;
  rect(M, y, CW, 52, i === 1 ? C.amberSoft : C.soft, 12);
  text(t, M + 15, y + 13, { size: 10, font: 'KR-Bold', color: i === 1 ? C.amber : C.navy, width: 75 });
  text(d, M + 100, y + 12, { size: 9, color: C.slate, width: CW - 116, lineGap: 3 });
});

sectionTitle('개선의 핵심', 557);
rect(M, 595, CW, 126, C.navy, 16);
const core = [
  ['01', '붙여넣기', '원본 데이터를 그대로 입력'],
  ['02', '자동 정리', '깨진 행과 불필요 이력 복구'],
  ['03', '표준 결과', '메일·메신저·파일로 출력'],
];
core.forEach(([n, t, d], i) => {
  const x = M + 19 + i * 164;
  rect(x, 615, 38, 38, '#1E40AF', 12);
  text(n, x, 627, { size: 9, color: '#BFDBFE', font: 'KR-Bold', width: 38, align: 'center' });
  text(t, x, 669, { size: 10, color: C.white, font: 'KR-Bold', width: 140 });
  text(d, x, 689, { size: 7.5, color: '#94A3B8', width: 135 });
  if (i < 2) text('→', x + 135, 627, { size: 18, color: '#38BDF8', font: 'KR-Bold' });
});

// 3. Overview
pageBase('02  SERVICE OVERVIEW', '처음 보는 사람도 이해하는 서비스 처리 흐름',
  '복잡한 운영 원문을 사람이 다시 작성하는 대신, 필요한 형태로 자동 변환하는 “업무 번역기”입니다.');

const flow = [
  { t: '원본 수집', d: '관제 화면\n엑셀 데이터', c: C.amber, bg: C.amberSoft },
  { t: '입력 복구', d: '탭·줄바꿈\n깨진 행 정리', c: C.blue, bg: C.blueSoft },
  { t: '업무 판독', d: '담당자·오류\n전달 이력 구분', c: C.cyan, bg: C.cyanSoft },
  { t: '결과 활용', d: '메일·메신저\nExcel·TXT', c: C.green, bg: C.greenSoft },
];
flow.forEach((f, i) => {
  const x = M + i * 130;
  rect(x, 157, 116, 112, f.bg, 15);
  doc.circle(x + 24, 181, 11).fill(f.c);
  text(String(i + 1), x + 14, 175, { size: 8, color: C.white, font: 'KR-Bold', width: 20, align: 'center' });
  text(f.t, x + 15, 205, { size: 11, font: 'KR-Bold', width: 86 });
  text(f.d, x + 15, 231, { size: 8, color: C.slate, width: 86, lineGap: 3 });
  if (i < 3) text('›', x + 118, 194, { size: 26, color: '#94A3B8', font: 'KR-Bold' });
});

sectionTitle('한 화면에 모은 6가지 현업 기능', 308);
const mini = [
  ['01', '해외메일 작성', '장애 데이터를 영문 메일로 변환'],
  ['02', 'G-EMS 메시지', '이력 제거 및 보고 문구 자동완성'],
  ['03', '백업 오류 필터', '정상 건을 제외하고 오류만 추출'],
  ['04', '지속 이벤트 재전달', '대기 이벤트의 재전달 문구 생성'],
  ['05', '아이체크 보고', '장비 점검 결과를 담당자별 정리'],
  ['06', '지속 메시지 Excel', '장기 이벤트를 보고용 파일로 생성'],
];
mini.forEach(([n, t, d], i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = M + col * 258;
  const y = 350 + row * 76;
  rect(x, y, col === 0 ? 244 : 249, 62, C.white, 12, C.line);
  text(n, x + 13, y + 13, { size: 9, color: C.blue, font: 'KR-Bold', width: 27 });
  text(t, x + 47, y + 10, { size: 10, font: 'KR-Bold', width: 180 });
  text(d, x + 47, y + 31, { size: 7.6, color: C.muted, width: 185 });
});

rect(M, 676, CW, 58, C.soft, 12);
text('설계 원칙', M + 16, 693, { size: 9, color: C.blue, font: 'KR-Bold' });
text('현업 데이터 그대로 입력 · 결과는 바로 복사 · 업무 처리용 서버·DB 없이 브라우저 내부에서 가공', M + 87, 692, {
  size: 8.2,
  color: C.slate,
  width: CW - 105,
  lineGap: 3,
});

// 4. Features 1-3
pageBase('03  CORE FEATURES', '메일 작성과 백업 오류 확인을 단순하게',
  '반복적으로 읽고, 지우고, 재작성하던 작업을 “붙여넣기 → 확인 → 복사” 과정으로 줄였습니다.');

screenFeatureCard({
  x: M, y: 145, w: CW, h: 164, no: 1,
  title: '해외메일 작성',
  purpose: 'Host·장애내용·발생일시·IP 데이터를 해외 담당자에게 전달할 영문 메일 형식으로 변환합니다.',
  before: '건당 15~25초 · 하루 100건 기준 약 25분',
  after: '건당 5~10초 · 하루 100건 기준 약 15분',
  image: 'foreign-mail.png',
});
screenFeatureCard({
  x: M, y: 321, w: CW, h: 164, no: 2,
  title: 'G-EMS 메시지 담당자 제거·보고 양식 자동완성',
  purpose: '관제 메시지에 섞인 이전 처리내역을 정리하고, 메신저에 바로 보낼 보고 문구를 만듭니다.',
  before: '10건 처리 시 이력 제거·줄바꿈에 30초 이상',
  after: '여러 메시지를 한 번에 처리 · 약 5초',
  image: 'gems-message.png',
  color: C.cyan, bg: C.cyanSoft,
});
screenFeatureCard({
  x: M, y: 497, w: CW, h: 164, no: 3,
  title: '자동 백업 에러 필터',
  purpose: '여러 백업 존의 작업 중 정상 건은 제외하고 실제 확인이 필요한 오류만 선별합니다.',
  before: '오류 선별과 수기 작성에 약 20분',
  after: '오류 추출과 TXT 생성까지 5분 미만',
  image: 'backup-error.png',
  color: C.green, bg: C.greenSoft,
});

rect(M, 680, CW, 54, C.blueSoft, 14);
text('사용자가 체감하는 변화', M + 16, 696, { size: 8, color: C.blue, font: 'KR-Bold' });
text('“내용을 다시 쓰는 작업”에서 “자동 생성된 결과를 확인하는 작업”으로 바뀝니다.', M + 135, 694, {
  size: 10,
  color: C.navy,
  font: 'KR-Bold',
  width: CW - 151,
});

// 5. Features 4-5
pageBase('04  COLLABORATION FEATURES', '재전달과 장비 점검 보고를 팀 단위로 표준화',
  '담당자와 처리 이력을 빠르게 구분하고, 다음 근무자에게 같은 기준으로 전달할 수 있게 했습니다.');

screenFeatureCard({
  x: M, y: 146, w: CW, h: 174, no: 4,
  title: '지속 이벤트 재전달',
  purpose: '오랫동안 남아 있는 장애 이벤트에서 원문과 처리기록을 분리하고 재전달 문구를 생성합니다.',
  before: '이력 확인과 재전달 작성에 약 40~60분',
  after: '대기·완료 구분과 문구 생성까지 20분 미만',
  image: 'persistent-redirect.png',
});
screenFeatureCard({
  x: M, y: 334, w: CW, h: 174, no: 5,
  title: '아이체크 보고',
  purpose: '아이체크 장비 점검 결과 13개 열을 읽어 서버 담당자별 보고 내용으로 묶습니다.',
  before: '건수와 담당자가 늘어날수록 분류·작성시간 증가',
  after: '다수 건도 일괄 처리 후 복사 · 1분 미만',
  image: 'icheck-report.png',
  color: C.cyan, bg: C.cyanSoft,
});

sectionTitle('팀 운영 측면의 개선', 548);
const teamBenefits = [
  ['인수인계', '근무자가 바뀌어도 같은 기준과 문구로 재전달'],
  ['가독성', '장문의 이력에서 원문·처리내용·담당자를 구분'],
  ['누락 방지', '담당자별로 묶고 복사 단위를 명확하게 제공'],
  ['학습 부담', '기능별 사용방법을 화면에서 바로 확인'],
];
teamBenefits.forEach(([t, d], i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = M + col * 258;
  const y = 586 + row * 67;
  rect(x, y, col === 0 ? 244 : 249, 53, C.soft, 11);
  text(t, x + 14, y + 11, { size: 9, color: C.blue, font: 'KR-Bold', width: 62 });
  text(d, x + 79, y + 10, { size: 8, color: C.slate, width: 150, lineGap: 2 });
});

// 6. Feature 6
pageBase('05  REPORTING FEATURES', '장기 이벤트를 보고용 Excel로 자동 정리',
  '복잡한 담당자 판독과 행 복구를 자동화해, 손이 많이 가는 후속 보고서 작성까지 지원합니다.');

featureCard({
  x: M, y: 148, w: CW, h: 164, no: 6,
  title: '지속 메시지 Excel 추출',
  purpose: '지속시간·그룹·Host·내용·발생일시·IP를 읽고, 담당자별 보고 행이 담긴 Excel을 만듭니다.',
  before: '오래된 메시지 정리·필터링과 담당자 분류에 1~2시간 이상',
  after: '담당자 자동 판독과 서버별 정리 후 Excel 추출까지 15분 미만',
});

rect(M, 334, CW, 323, C.white, 16, C.line);
text('실제 서비스 화면', M + 16, 350, { size: 9, color: C.blue, font: 'KR-Bold' });
doc.save();
doc.roundedRect(M + 16, 375, CW - 32, 265, 10).clip();
doc.image(`${assetPath}persistent-event-excel.png`, M + 16, 375, {
  fit: [CW - 32, 265],
  align: 'center',
  valign: 'center',
});
doc.restore();
doc.roundedRect(M + 16, 375, CW - 32, 265, 10).strokeColor(C.line).lineWidth(0.7).stroke();

rect(M, 680, CW, 55, C.greenSoft, 13);
text('결과', M + 16, 697, { size: 9, color: C.green, font: 'KR-Bold' });
text('담당자 검토와 제외 항목 확인 후, 필터와 서식이 적용된 Excel 파일을 바로 내려받습니다.', M + 63, 696, {
  size: 9,
  color: C.navy,
  font: 'KR-Bold',
  width: CW - 80,
});

// 7. Impact
pageBase('06  IMPROVEMENT IMPACT', '기능별 처리시간과 업무 편의성 개선',
  '반복 조립을 붙여넣기·복사로 단순화하고, 누구나 같은 양식의 결과를 만들도록 자동화했습니다.');

sectionTitle('기능별 소요시간 변화', 145);
const impactColumns = [122, 145, 135, 105];
const impactX = [M, M + 122, M + 267, M + 402];
rect(M, 184, CW, 34, C.navy, 8);
['기능', '기존 방식', '서비스 이용', '핵심 편의성'].forEach((value, index) => {
  text(value, impactX[index] + 10, 195, {
    size: 8,
    color: C.white,
    font: 'KR-Bold',
    width: impactColumns[index] - 20,
    align: index === 0 ? 'left' : 'center',
  });
});

const impacts = [
  ['해외메일 작성', '건당 15~25초\n100건 약 25분', '건당 5~10초\n100건 약 15분', '메일 양식\n자동 조립'],
  ['G-EMS 메시지', '10건 처리 시\n30초 이상', '10건 일괄\n약 5초', '붙여넣기 후\n바로 복사'],
  ['백업 오류 필터', '오류 선별·작성\n약 20분', '자동 추출\n5분 미만', '오류 항목\n자동 선별'],
  ['지속 이벤트 재전달', '이력 확인·작성\n약 40~60분', '자동 분리·생성\n20분 미만', '담당자·문구\n자동 구성'],
  ['아이체크 보고', '건수·담당자에\n비례해 증가', '다수 건 일괄\n1분 미만', '보고 양식\n일괄 생성'],
  ['지속 메시지 Excel', '정리·필터링\n1~2시간 이상', '자동 판독·추출\n15분 미만', '서버별\n자동 정리'],
];

impacts.forEach((row, rowIndex) => {
  const y = 226 + rowIndex * 67;
  rect(M, y, CW, 58, rowIndex % 2 === 0 ? C.soft : C.white, 8, C.line);
  row.forEach((value, colIndex) => {
    text(value, impactX[colIndex] + 10, y + 12, {
      size: colIndex === 0 ? 8.5 : 7.8,
      color: colIndex === 3 ? C.green : colIndex === 2 ? C.blue : C.slate,
      font: colIndex === 0 || colIndex === 3 ? 'KR-Bold' : 'KR',
      width: impactColumns[colIndex] - 20,
      align: colIndex === 0 ? 'left' : 'center',
      lineGap: 3,
    });
  });
});

text('※ 시간은 현업 사용 경험을 기준으로 한 대략값이며, 데이터량과 메시지 복잡도에 따라 달라질 수 있습니다.', M, 638, {
  size: 7.2,
  color: C.muted,
  width: CW,
});

sectionTitle('자동화로 함께 개선된 부분', 675);
const qualitative = [
  ['사용 단순화', '원본 붙여넣기 후 결과 복사'],
  ['양식 일관성', '팀원별 결과 형식 편차 감소'],
  ['검토 집중', '재조립 대신 최종 결과 확인'],
];
qualitative.forEach(([title, detail], index) => {
  const x = M + index * 170;
  rect(x, 710, index === 2 ? 167 : 157, 52, index === 0 ? C.blueSoft : C.soft, 10);
  text(title, x + 12, 720, { size: 8, color: index === 0 ? C.blue : C.navy, font: 'KR-Bold' });
  text(detail, x + 12, 739, { size: 6.9, color: C.muted, width: index === 2 ? 143 : 133 });
});

// 8. History and next steps
pageBase('07  SUSTAINABILITY', '현업 피드백으로 계속 성장하는 업무 도구',
  '실제 사용 중 발견된 예외 데이터를 반영하고 기능별 테스트와 변경 이력을 지속적으로 관리했습니다.');

sectionTitle('개선활동 확장 과정', 145);
const history = [
  ['2025.12', '협업 기능 시작', '지속 이벤트 재전달과 국내·해외 전달 문구 적용'],
  ['2026.01', '메일 양식 개선', '해외메일 본문 간격과 출력 형식 개선'],
  ['2026.02~06', '현업 적용·규칙 정리', '실제 사용 중 수집한 예외 입력과 처리 기준 정리'],
  ['2026.07', '보고 자동화 확장', '지속 메시지 Excel 추출과 백업 오류 관리 기능 보강'],
  ['2026.08', '기능 통합', 'G-EMS·아이체크 기능과 사용방법 안내 추가'],
  ['2026.09', '사용성 고도화', '입력 화면 간소화와 변경 이력·출력 설정 개선'],
];
history.forEach(([date, title, detail], i) => {
  const y = 181 + i * 61;
  if (i < history.length - 1) line(M + 16, y + 31, M + 16, y + 67, '#BFDBFE', 2);
  doc.circle(M + 16, y + 14, 8).fill(i === history.length - 1 ? C.green : C.blue);
  text(date, M + 40, y + 1, { size: 7.8, color: C.blue, font: 'KR-Bold', width: 70 });
  text(title, M + 119, y, { size: 9.4, font: 'KR-Bold', width: 122 });
  text(detail, M + 250, y, { size: 7.8, color: C.slate, width: 255, lineGap: 2 });
});

sectionTitle('다음 단계', 561);
const next = [
  ['사용성 검증', '팀원 대상 사용 테스트와 불편사항 수집'],
  ['효과 측정', '기능별 사용 건수·실제 처리시간·오류 감소 기록'],
  ['업무 표준화', '검증된 출력 양식을 팀 업무 가이드와 연결'],
  ['안정적 운영', '예외 데이터 테스트 확대와 변경 이력 관리'],
];
next.forEach(([t, d], i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = M + col * 258;
  const y = 602 + row * 66;
  rect(x, y, col === 0 ? 244 : 249, 52, i === 0 ? C.blueSoft : C.soft, 11);
  text(t, x + 14, y + 10, { size: 9, color: i === 0 ? C.blue : C.navy, font: 'KR-Bold', width: 75 });
  text(d, x + 95, y + 9, { size: 7.7, color: C.slate, width: 135, lineGap: 2 });
});

rect(M, 742, CW, 49, C.navy, 12);
text('서비스 정보', M + 14, 751, { size: 7.6, color: '#7DD3FC', font: 'KR-Bold', width: 64 });
text('배포', M + 86, 750, { size: 7, color: '#94A3B8', font: 'KR-Bold', width: 28 });
text(serviceUrl, M + 116, 749, {
  size: 7.1, color: C.white, font: 'KR', width: 330, link: serviceUrl, underline: true,
});
text('GitHub', M + 86, 770, { size: 7, color: '#94A3B8', font: 'KR-Bold', width: 28 });
text(githubUrl, M + 116, 769, {
  size: 7.1, color: C.white, font: 'KR', width: 330, link: githubUrl, underline: true,
});

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i += 1) {
  doc.switchToPage(i);
  if (i > 0) footer(i + 1, range.count);
}

doc.end();
