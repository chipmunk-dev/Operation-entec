import assert from 'node:assert/strict';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = fileURLToPath(new URL('./', import.meta.url));
const evidence = JSON.parse(await readFile(`${root}evidence.json`, 'utf8'));
const r = evidence.results;
const esc = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const p = (text) => `<p>${text}</p>`;
const h = (text) => `<h3>${text}</h3>`;
const note = (text) => `<p class="note">${text}</p>`;
const table = (
  heads,
  rows,
  widths = heads.length === 2 ? [26, 74] : [26, 37, 37]
) => {
  assert.equal(widths.length, heads.length, '표 열 수와 너비 설정 일치');
  assert.equal(widths.reduce((sum, width) => sum + width, 0), 100, '표 열 너비 합계');
  assert.ok(rows.every((row) => row.length === heads.length), '표 행의 열 수 일치');
  return `<table><colgroup>${widths.map((w) => `<col style="width:${w}%">`).join('')}</colgroup><thead><tr>${heads.map((t) => `<th>${t}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((t) => `<td>${t}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
};
const flow = (labels) =>
  `<div class="flow">${labels.map((t, i) => `<span><small>${String(i + 1).padStart(2, '0')}</small>${t}</span>`).join('<em>→</em>')}</div>`;
const examples = [];
const excerpt = (label, text) => {
  examples.push({ label, text });
  return `<div class="example"><div class="example-label">${esc(label)}</div><pre>${esc(text)}</pre></div>`;
};
const images = [];
const fig = (name, caption, maxHeight = 300) => {
  assert.ok(evidence.images.includes(name), name);
  images.push(name);
  return `<figure><img src="screenshots/${name}.png" style="max-height:${maxHeight}px" alt="${esc(caption)}"><figcaption>그림 ${images.length}. ${caption}</figcaption></figure>`;
};
const outcome = (text, before, after, unit) =>
  `<div class="outcome"><b>개선효과</b><p>${text}</p>${before ? `<div class="time"><span>${unit}</span><strong>${before} → ${after}</strong><small>현업 소요시간 참고값</small></div>` : ''}</div>`;
const pairs = (name, caption, text, label) =>
  `<div class="result-grid"><div>${fig(name, caption, 310)}</div><div>${excerpt(label, text)}</div></div>`;
const pages = [];
const add = (service, section, title, summary, content, kind = '') =>
  pages.push({ service, section, title, summary, content, kind });
const costs = {
  mail: { unit: '해외메일 작성 1건', before: '1분', after: '15초 미만' },
  gems: { unit: '메시지 10건 양식 정리', before: '30초 이상', after: '약 5초' },
  redirect: {
    unit: '지속 이벤트 재전달 1회',
    before: '1시간',
    after: '20분 미만',
  },
  backup: {
    unit: '백업 오류 정리·보고 1회',
    before: '약 20분',
    after: '5분 미만',
  },
  icheck: {
    unit: '아이체크 보고 문구 작성',
    before: '건수·담당자 수에 따라 증가',
    after: '1분 미만',
  },
  editor: {
    unit: '아이체크 파일 편집·변경 보고',
    before: '정량 비교 미측정',
    after: '정성 효과 확인',
  },
  persistent: {
    unit: '지속 메시지 목록 정리 1회',
    before: '1~2시간 이상',
    after: '15분 미만',
  },
};
const impact = (key, text) => {
  const c = costs[key];
  return outcome(text, c.before, c.after, c.unit);
};
const mailParts = r.mail.split(
  '-------------------------------------------------------'
);
assert.equal(mailParts.length, 4);
const mailExample =
  `${mailParts[0]}-------------------------------------------------------${mailParts[1]}-------------------------------------------------------${mailParts.at(-1)}`.trim();
const [zone, policies, times, errors] = r.backup.split('\t');
const backupRows = policies
  .split('\n')
  .map((t, i) => [
    esc(zone),
    esc(t),
    esc(times.split('\n')[i]),
    esc(errors.split('\n')[i]),
  ]);

add(
  null,
  '운영 업무 개선제안',
  '운영 업무 보조기능<br>개선제안서',
  '경고 전달 · 백업 오류 보고 · 장비 점검 내역 · 지속 메시지 정리',
  `<span class="version">전체 기능 통합 보고서 · 제2판</span><div class="cover-purpose">반복적인 자료 정리·문구 작성·엑셀 편집의 표준화를 통한<br><b>운영 업무 효율 및 보고 일관성 제고</b></div>` +
    table(
      ['구분', '내용'],
      [
        ['소속', 'LG CNS 전자/제조시스템 OP팀<br>(엔텍정보통신)'],
        ['제안자', '정지운 사원'],
        ['부현장대리인', '이정선 책임'],
        ['현장대리인', '강성준 책임'],
        [
          '개발·운영 방식',
          '브라우저 기반 업무 지원 도구<br><b>업무 데이터 처리·보관용 별도 서버 및 데이터베이스 미사용</b>',
        ],
      ]
    ) +
    `<p class="contact">문의 wldns0622@cnspartner.com</p>` +
    note(
      '웹 접속에는 호스팅을 사용하며, 입력 데이터 가공과 파일 생성은 사용자 PC의 브라우저에서 수행.'
    ),
  'cover'
);

add(
  null,
  '개선 개요',
  '운영지원 업무와 개선 필요성',
  '자료 정리·보고문구 생성을 자동화하고, 운영 담당자는 대상 검토와 전달에 집중.',
  h('운영지원 업무의 역할') +
    p(
      '기업의 업무시스템이 안정적으로 운영되도록 서버 상태와 백업 결과를 확인하고, 서버실 장비의 이상 표시를 점검하는 업무. 경고나 이상 징후가 있으면 서버 담당자에게 대상·시각·현상을 정확하게 전달하여 점검과 조치를 요청함.'
    ) +
    flow([
      '경고·작업 결과·현장 점검',
      '운영 담당자의 대상 검토',
      '서버 담당자에게 점검 요청',
    ]) +
    h('반복 수작업의 개선 필요성') +
    table(
      ['업무 구간', '현행 방식', '개선 방향'],
      [
        [
          '경고 전달',
          '서버별 정보를 다시 입력하고 메일·메신저 문구 재작성',
          '원본 붙여넣기와 일정한 양식 생성',
        ],
        [
          '오류·담당자 정리',
          '목록에서 오류를 찾고 담당자를 수기 분류',
          '자동 추출·후보 판독 후 담당자 검토',
        ],
        [
          '장비 내역 관리',
          '엑셀 행 이동·위치 수정·변경 보고를 각각 수행',
          '파일 편집과 원본 대비 변경 보고 연결',
        ],
      ]
    ) +
    h('개선 후 공통 업무 흐름') +
    flow([
      '원본 입력·파일 열기',
      '자동 정리·문구·파일 생성',
      '결과 확인·복사·저장',
    ]) +
    note(
      '자동화 범위는 자료 정리와 보고 작성. 장애 판단·수신자 선택·메일 및 메신저 발송·백업 실행은 기존 운영 절차에 따라 담당자가 수행.'
    ) +
    note(
      '모든 화면·입력·결과 예시는 가상 서버명·IP·담당자. 소요시간은 현업 경험 기반 참고값이며, 자동 측정 평균 또는 보장 수치가 아님.'
    )
);

const tocIndex = pages.length;
add(
  null,
  '기능별 구성',
  '업무 유형별 기능 구성',
  '같은 원본이라도 전달 문구 작성, 장비 파일 편집, 누적 목록 정리의 목적에 따라 기능 구분.',
  ''
);

add(
  'mail',
  '01  해외메일 작성',
  '해외 경고메일 작성 자동화',
  '서버 경고의 필수 정보를 영문 메일 양식으로 일괄 변환.',
  h('업무 목적') +
    p(
      '서버 상태 감시 시스템에서 발생한 경고를 해외 담당자에게 영문으로 전달하는 업무. 서버명·주소·발생시각·경고 내용이 정확해야 대상 서버를 식별하고 상태를 점검할 수 있음.'
    ) +
    table(
      ['구분', '처리 내용'],
      [
        [
          '현행 업무',
          '엑셀·원본 목록을 확인하며 필수 정보를 메일 본문에 개별 입력',
        ],
        [
          '개선 기능',
          '여러 경고를 붙여넣으면 확인 이력과 내부 줄바꿈·탭을 정리하여 영문 본문 생성',
        ],
        [
          '입력 정보',
          'Host(서버명) · Message(경고 내용) · Date(발생시각) · IP(서버 주소)',
        ],
      ]
    ) +
    fig('mail-input', '서버 경고 2건 입력 및 원본 열 순서 설정', 280) +
    h('처리 예시') +
    p(
      '처리장치(CPU) 사용률 경고와 저장공간 사용률 경고 각 1건을 입력. 담당자 확인 메모는 제거하고 점검에 필요한 원문과 서버 정보만 메일에 반영.'
    ) +
    note(
      '원본 열 순서가 다르면 상단 설정으로 위치를 맞춤. 실제 사건 발생시각은 입력값을 사용하며 시간대는 자동 변환하지 않음.'
    )
);

add(
  'mail',
  '01  해외메일 작성',
  '영문 메일 생성 결과 및 개선효과',
  '완성된 본문을 검토한 뒤 기존 메일 프로그램에서 발송.',
  pairs(
    'mail-result',
    '영문 메일 미리보기 및 전체 복사',
    mailExample,
    '실제 생성 본문 · 경고 1건 발췌'
  ) +
    table(
      ['결과 구성', '업무 활용'],
      [
        ['영문 안내문', '경고 발생과 점검 요청을 동일한 문구로 안내'],
        ['필수 정보 배치', '발생시각·IP·서버명·경고를 일정한 순서로 표기'],
        [
          '본문 일괄 복사',
          '여러 서버의 경고를 하나의 본문으로 복사하여 메일에 반영',
        ],
      ]
    ) +
    impact(
      'mail',
      '정보 재입력과 영문 양식 재조립 감소. 근무자별 전달 형식 통일 및 필수 항목 누락 예방 지원.'
    ) +
    note(
      '수신자·제목·원본 경고를 확인한 후 담당자가 발송. 메일 자동 발송 기능은 포함하지 않음.'
    )
);

add(
  'gems',
  '02  G-EMS 메시지',
  '서버 경고 메시지 정리 및 보고 자동화',
  '담당자 확인 이력을 분리하고 메신저 전달에 필요한 서버·경고 정보만 정리.',
  h('업무 목적') +
    p(
      'G-EMS는 서버 상태를 감시하고 경고를 표시하는 시스템. 경고 목록에는 서버 현상 외에 근무자의 연락·확인 이력이 함께 붙어 있어, 메신저로 전달할 때 불필요한 이력을 지우고 보고 문구를 다시 구성해야 함.'
    ) +
    table(
      ['구분', '처리 내용'],
      [
        [
          '현행 업무',
          '확인 이력 수기 삭제, 붙여넣기 후 줄바꿈 정리, 인사말·보고 양식 재작성',
        ],
        [
          '개선 기능',
          '확인 내역 제거 또는 보고 양식 자동완성 모드로 서버 경고 일괄 정리',
        ],
        ['입력 정보', 'Host(서버명) · Message(경고와 확인 이력), 총 2열'],
      ]
    ) +
    fig('gems-input', '확인 메모가 포함된 서버 경고 2건 입력', 230) +
    h('원본과 정리 결과의 차이') +
    table(
      ['원본에 포함된 내용', '결과에 남기는 내용'],
      [
        [
          '서버 경고 + 담당자 문자·확인 메모',
          '서버명 + 점검에 필요한 경고 본문',
        ],
        ['내부 탭·기존 확인 이력', '출력 양식에 맞춘 서버별 메시지'],
      ],
      [50, 50]
    ) +
    note(
      'G-EMS 입력은 경고 한 건당 한 줄. Event 내부 실제 줄바꿈 복구가 필요한 4열 데이터는 해외메일·지속 이벤트 재전달에서 처리.'
    )
);

add(
  'gems',
  '02  G-EMS 메시지',
  '두 가지 출력 방식 및 개선효과',
  '정리된 경고만 복사하거나 보고자 인사말을 포함한 메신저 문구 생성.',
  fig('gems-clean', '확인 내역만 제거한 출력 화면', 170) +
    pairs(
      'gems-result',
      '보고자 인사말을 포함한 출력 화면',
      r.gems,
      '실제 생성 문구 · 경고 2건'
    ) +
    table(
      ['설정 항목', '업무 활용'],
      [
        ['출력 방식', '확인 내역만 제거 / 메신저 보고 양식 자동완성 선택'],
        [
          '보고자 정보',
          '이름·직급 입력 후 문구 반영. 이름·출력 모드는 12시간 유지',
        ],
      ]
    ) +
    impact(
      'gems',
      '다수 메시지의 담당자 이력 삭제와 문구 재조립을 일괄 처리. 반복 편집 감소 및 메신저 보고 양식 일관성 향상.'
    ) +
    note(
      '시간 비교는 메시지 10건의 형식 정리 참고값. 보고 모드는 이름·불완전 입력 여부를 확인해야 복사 가능.'
    )
);

add(
  'redirect',
  '03  지속 이벤트 재전달',
  '1일 이상 지속 경고의 재전달 자동화',
  '해소되지 않은 경고를 담당자에게 다시 안내하고 확인내역 갱신.',
  h('업무 목적') +
    p(
      '서버 경고가 최초 안내 후에도 해소되지 않으면 추가 점검이 필요. 운영 담당자는 1일 이상 지속 중인 이벤트 메시지를 다시 전달하고, 재전달 이력이 반영되도록 확인내역을 수정함.'
    ) +
    table(
      ['구분', '처리 내용'],
      [
        [
          '현행 업무',
          '담당자별 경고를 모아 수기 재전달하고 문구·확인내역을 개별 수정',
        ],
        [
          '개선 기능',
          '담당자별 대상 선택 후 메신저 문구 자동 완성. 확인 완료 시 갱신된 확인내역 자동 생성',
        ],
        [
          '입력 정보',
          'Host(서버명) · Event(경고와 이력) · Date(발생시각) · IP 및 보고자 정보',
        ],
      ]
    ) +
    fig(
      'redirect-selection',
      '3건 중 김예시 책임에게 전달할 WEB·DB 경고 2건 선택',
      285
    ) +
    p(
      '점검 중 보류 메모가 있는 HOLD 서버 1건은 검토 후 선택 대상에서 제외. 복수 선택한 경고만 보고 문구에 반영.'
    ) +
    note(
      '1일 이상 지속 여부와 실제 담당자는 원본에서 확인하여 입력·선택. 보류 문구가 표시된 항목도 운영 기준에 따라 판단.'
    )
);

add(
  'redirect',
  '03  지속 이벤트 재전달',
  '담당자별 전달 문구 생성 및 개선효과',
  '국내 메신저·해외 메신저·해외메일 중 전달 목적에 맞는 형식 선택.',
  pairs(
    'redirect-result',
    '선택한 경고 2건의 국내 메신저 문구',
    r.redirect,
    '실제 생성 문구 · 동일 담당자 대상 2건'
  ) +
    table(
      ['결과 구성', '업무 활용'],
      [
        [
          '전달 형식 선택',
          '국내 메신저는 인사말, 해외 메신저는 Resend, 해외메일은 영문 메일 본문 생성',
        ],
        [
          '선택 대상 일괄 복사',
          '담당자에게 전달할 경고를 하나의 문구로 묶어 메신저·메일에 반영',
        ],
        ['수기 재조립 감소', '필요한 경고 선택과 결과 확인·복사 중심으로 처리'],
      ]
    ) +
    impact(
      'redirect',
      '담당자별 전달 문구와 확인내역의 수기 재작성 감소. 대상 선택 후 복사·붙여넣기로 처리하며, 근무자별 재전달 양식 일관성 확보 지원.'
    ) +
    note(
      '담당자별 대상을 선택해 문구를 구성하는 기능이며, 담당자에게 자동 발송하거나 장애 해소를 판단하지 않음.'
    )
);

add(
  'redirect',
  '03  지속 이벤트 재전달',
  '확인내역 자동 재생성과 작업 상태 관리',
  '기존 확인내용에 재전달자·시각·전달 내용을 반영하여 원본 목록 갱신 지원.',
  fig('redirect-history', '확인 완료 항목과 자동 생성된 재전달 확인내역', 235) +
    excerpt('실제 복사된 확인내역', r.redirectHistory) +
    flow([
      '경고 검토·전달 문구 복사',
      '확인 완료 항목에서 이력 복사',
      '원본 이력 갱신·상태 관리',
    ]) +
    table(
      ['화면 상태', '의미와 활용'],
      [
        ['대기 중', '아직 확인 완료로 이동하지 않은 경고'],
        [
          '확인됨',
          '확인 완료로 이동한 항목. 재전달 이력이 반영된 문구 복사 가능',
        ],
        [
          '전달 완료',
          '사용자가 표시한 작업 상태. 실제 발송 여부는 업무 도구에서 확인',
        ],
      ]
    ) +
    note(
      '확인 완료·전달 완료는 서버 경고 해소를 뜻하지 않음. 원본 확인내역은 복사해 반영하며 원격 시스템에 자동 기록하지 않음.'
    ) +
    note(
      '원본을 다시 붙여넣거나 열 순서를 바꾸면 선택·처리 상태가 초기화되므로, 필요한 문구와 이력을 먼저 반영.'
    )
);

add(
  'backup',
  '04  자동 백업 에러',
  '해외 백업 오류 추출 및 보고 자동화',
  '백업 작업 결과에서 확인이 필요한 오류만 추출하여 보고 작성.',
  h('업무 목적') +
    p(
      '백업은 장애나 데이터 손실에 대비해 업무 데이터를 별도로 보관하는 작업. 운영 담당자는 작업 완료 결과를 확인하고 오류가 있는 작업을 정리하여 서버 담당자에게 점검을 요청함.'
    ) +
    table(
      ['구분', '처리 내용'],
      [
        [
          '현행 업무',
          '행별 작업 상태 확인 후 오류 작업명·시작시각·상태코드를 수기 작성',
        ],
        [
          '개선 기능',
          '백업존별 목록에서 오류 행을 추출하여 보고 표·텍스트 자동 생성',
        ],
        [
          '입력 정보',
          'Status(상태코드) · Policy(작업명) · Start Time(시작시각)',
        ],
        [
          '관리 구분',
          '백업존: 작업 결과를 구분해 정리하는 단위<br>P-EUBKMST · NBUMASTER · EXTMASTER',
        ],
      ]
    ) +
    fig('backup-input', '4건 입력 후 Status 0·1 제외 및 오류 58·84 추출', 245) +
    note(
      '기본 열 위치는 Status 1열·Policy 6열·Start Time 7열. 원본 표가 다르면 열 설정으로 변경.'
    ) +
    note(
      '자동화 범위는 오류 추출과 보고 작성. 백업 실행·재시도는 포함하지 않음.'
    )
);

add(
  'backup',
  '04  자동 백업 에러',
  '백업존별 보고 결과 및 개선효과',
  'Outlook 보고용 표와 텍스트 파일로 오류 작업 정보 일괄 반영.',
  fig('backup-result', '오류 작업 2건으로 정리된 보고용 결과', 220) +
    h('실제 생성된 보고 표') +
    table(
      ['백업존', '작업명', '시작시각', '오류코드'],
      backupRows,
      [18, 30, 33, 19]
    ) +
    table(
      ['결과 구성', '업무 활용'],
      [
        ['표 전체·열별 복사', '작업명·시각·상태코드를 Outlook 표에 일괄 반영'],
        ['텍스트 파일 저장', '세 백업존 결과를 구분해 저장'],
        [
          '입력 데이터 관리',
          'JSON 내보내기·불러오기로 백업 목록 공유 및 재사용',
        ],
      ]
    ) +
    impact(
      'backup',
      '오류 검색과 수기 전사 작업 감소. 백업존별 필수 보고 항목·표 구성을 통일하여 후속 점검 대상 식별 지원.'
    ) +
    note(
      'Status 1도 현행 필터에서 제외하므로 업무상 추가 확인 필요 여부를 검토. 입력 없는 백업존의 오류 0건은 백업 성공을 의미하지 않음.'
    )
);

add(
  'icheck',
  '05  아이체크 보고',
  '서버실 장비 점검 결과의 담당자별 보고',
  '엑셀 장비 내역을 담당자별 메신저 보고 문구로 일괄 변환.',
  h('업무 목적') +
    p(
      '서버실의 장비 경고등이 켜지거나 상태가 달라지면 위치·서버명·표시 상태를 담당자에게 전달해야 함. 아이체크는 현장 점검 결과를 기록한 장비 목록이며, 이 기능은 보고할 행을 붙여넣어 담당자별 문구를 생성함.'
    ) +
    table(
      ['구분', '처리 내용'],
      [
        [
          '현행 업무',
          '장비 위치·서버·상태를 옮겨 적고 담당자별로 나누어 메신저 문구 작성',
        ],
        [
          '개선 기능',
          '13열 원본에서 담당자를 읽어 장비 목록 자동 분류 및 보고 문구 생성',
        ],
        [
          '입력 정보',
          '엑셀 A~M 13열. 주요 값: C 서버명 · D 위치 · I 상태 · L 담당자',
        ],
      ]
    ) +
    fig(
      'icheck-input',
      '3행 붙여넣기 후 동일 행 1건 제외, 보고 대상 2건',
      270
    ) +
    p(
      'WEB 장비는 김예시 책임, DB 장비는 이예시 선임에게 보고. 입력에 포함된 동일 WEB 행은 중복 제외하여 2건으로 정리.'
    ) +
    note(
      '빈 열을 삭제하지 않고 13열 순서 유지. 실제 신규·소등 여부는 원본에서 판단하며, 이 메뉴는 파일의 전후 차이를 계산하지 않음.'
    )
);

add(
  'icheck',
  '05  아이체크 보고',
  '담당자별 분리된 보고 결과 및 개선효과',
  '여러 장비를 입력해도 담당자별로 동일한 보고 형식 생성.',
  pairs(
    'icheck-result',
    '김예시 책임의 장비 1건 보고 카드',
    r.icheck,
    '실제 생성 문구 · 김예시 책임 대상'
  ) +
    excerpt('실제 생성 문구 · 이예시 선임 대상', r.icheckSecond) +
    table(
      ['결과 구성', '업무 활용'],
      [
        ['담당자별 자동 분류', '각 담당자에게 필요한 장비만 모아 보고'],
        [
          '문구 개별 복사',
          '보고자 인사말·위치·서버·상태를 완성하여 메신저에 반영',
        ],
      ]
    ) +
    outcome(
      '장비·담당자가 늘어날 때 반복되는 문구 편집을 일괄 처리. 담당자별 보고 형식과 필수 항목의 일관성 향상.'
    ) +
    note(
      '보고 문구 작성 소요시간은 현업 참고값 기준 1분 미만. 기존 시간은 건수·담당자 수에 따라 증가하므로 단일 비교값을 제시하지 않음.'
    )
);

add(
  'editor',
  '06  아이체크 내역 편집',
  '장비 점등·소등 내역 편집과 변경 보고',
  '현장 점검 결과를 엑셀에 반영하고 최초 원본과의 차이를 보고 문구로 생성.',
  h('업무 목적') +
    p(
      '점등은 장비의 표시등이 켜진 상태, 소등은 기존 표시등이 꺼진 상태. 현장 점검으로 확인한 변화를 장비 목록과 구역별 점검내역에 반영하고, 신규 점등·소등 정보를 담당자에게 보고하는 업무.'
    ) +
    table(
      ['구분', '처리 내용'],
      [
        [
          '현행 업무',
          '엑셀의 행 이동·구역 문구 수정 후 원본과 변경 내역을 대조하여 보고',
        ],
        [
          '개선 기능',
          '새 점등 입력과 소등 선택으로 파일 수정. 최초 원본 대비 변경 보고 자동 생성',
        ],
        [
          '입력 정보',
          '점등장비·소등장비·전자_Eyecheck 등 관련 시트가 있는 XLSX 파일',
        ],
      ]
    ) +
    fig('editor-original', '처음 연 연습 파일의 기존 점등 장비 2건', 235) +
    h('아이체크 보고와의 구분') +
    table(
      ['독립 아이체크 보고', '아이체크 내역 편집'],
      [
        [
          '붙여넣은 13열 행으로 문구 생성',
          '파일을 수정하고 최초 원본과 현재 상태 비교',
        ],
        [
          '원본 파일 자체는 변경하지 않음',
          '수정 파일 저장과 신규 점등·소등 보고 지원',
        ],
      ],
      [50, 50]
    ) +
    note(
      '표시등 변화는 점검 요청의 근거이며 장애 원인이나 조치 완료를 자동 판정하지 않음.'
    )
);

add(
  'editor',
  '06  아이체크 내역 편집',
  '점등 위치 입력 및 소등 장비 선택',
  '현재 장비 목록을 기준으로 신규 점등과 소등을 구분하여 반영.',
  fig('editor-entry', 'A-3(2) 입력: A구역 3번 위치에 신규 점등 2대', 220) +
    fig('editor-off', '기존 SA3A-1 장비 1건을 소등 대상으로 선택', 215) +
    h('입력 예시의 변경 관계') +
    table(
      ['구분', '입력·선택', '반영 결과'],
      [
        ['신규 점등', 'A-3(2)', 'SA3A-3 위치에 신규 장비 2건 생성'],
        [
          '소등',
          'DEMO-HOST-01 선택',
          '소등장비 시트로 이동하고 점검대상에서 제외',
        ],
        ['점등 목록', '기존 2건 + 신규 2건 − 소등 1건', '최종 점등장비 3건'],
      ]
    ) +
    note(
      '위치 뒤 괄호 숫자는 같은 위치의 장비 수. 입력 위치와 선택한 소등 행을 확인한 뒤 보고용 정보를 보완·저장.'
    )
);

add(
  'editor',
  '06  아이체크 내역 편집',
  '신규 장비 정보 보완 및 변경 보고',
  '서버명·위치·상태·담당자 등 누락 정보를 보완한 후 보고 문구 생성.',
  fig('editor-details', '신규 장비 1건의 호스트명·담당자 정보 보완', 200) +
    pairs(
      'editor-result',
      '신규 점등 2건과 소등 1건의 보고 미리보기',
      r.editor,
      '실제 생성 문구 · 변경 장비 3건'
    ) +
    note(
      '선택 장비의 필수 정보가 누락되면 복사를 차단. 누락 정보를 보완하거나 해당 보고 선택을 해제한 후 복사.'
    )
);

add(
  'editor',
  '06  아이체크 내역 편집',
  '수정 파일 결과와 원본 비교 유지',
  '저장 후에도 최초 원본 대비 신규·소등 보고를 유지하여 확인 업무 연결.',
  h('실제 내려받은 파일의 점등장비 값') +
    table(
      ['서버명', '위치', '표시 상태', '담당자'],
      r.editorRows.map((row) => [
        esc(row.C),
        esc(row.D),
        esc(row.I),
        esc(row.L),
      ]),
      [30, 20, 22, 28]
    ) +
    flow([
      '최초 원본: 점등 2건',
      '신규 2건·소등 1건 반영',
      '저장 파일: 점등 3건',
    ]) +
    h('파일과 보고의 연계') +
    table(
      ['기능', '활용 및 유의사항'],
      [
        [
          '수정 파일 저장',
          '새 파일 내려받기 또는 브라우저가 지원하는 기존 파일 저장',
        ],
        [
          '저장 후 비교 유지',
          '최초에 연 파일을 기준으로 신규 2건·소등 1건 보고 유지',
        ],
        ['기존 장비 재보고', '변경 없는 장비도 필요에 따라 선택해 보고'],
        [
          '붙여넣기로 보고',
          '13열 입력으로 바로 보고. 이 방식에서는 파일 전후 차이를 계산하지 않음',
        ],
      ]
    ) +
    outcome(
      '엑셀 행 이동·점검 구역 수정·변경 보고를 연결하여 반복 대조 감소. 신규 장비의 필수 정보 확인과 변경 유형별 보고 형식 표준화.'
    ) +
    note(
      '이 기능의 처리시간 단축 수치는 미측정으로 기재하지 않음. 새 파일 열기·새로고침 전 저장 필요.'
    ) +
    note(
      '신규 장비의 보완 정보는 저장 파일에 반영. 기존·저장 후 장비의 보고용 정보 보완은 엑셀 파일 수정과 구분.'
    )
);

add(
  'persistent',
  '07  지속 메시지 엑셀 추출',
  '장기 지속 메시지의 담당자별 목록 정리',
  '누적 경고와 확인 이력에서 담당자를 판독하여 검토용 엑셀 생성.',
  h('업무 목적') +
    p(
      '해소되지 않은 경고가 쌓이면 어느 서버의 어떤 경고를 누가 확인해야 하는지 파악하기 어려움. 지속 메시지 목록을 담당자·서버 기준으로 정리하여 장기 미해소 항목을 점검하고 담당자와 공유하는 업무.'
    ) +
    table(
      ['구분', '처리 내용'],
      [
        [
          '현행 업무',
          '오래된 경고 정리, 담당자 이력 판독·수기 분류, 서버별 목록과 엑셀 구성',
        ],
        [
          '개선 기능',
          '담당자 후보 자동 판독, 복수·미검출 항목 검토 후 정리된 XLSX 추출',
        ],
        [
          '입력 정보',
          '지속시간 · 그룹명 · 호스트 · 내용 · 발생일시 · IP, 총 6열',
        ],
      ]
    ) +
    fig(
      'persistent-input',
      '담당자 단일·복수·미검출을 포함한 경고 3건 입력',
      250
    ) +
    table(
      ['입력 예시', '검토 내용'],
      [
        ['DEMO-SRV-01', '김예시 책임 자동 판독'],
        ['DEMO-SRV-02', '김예시 책임·이예시 선임 후보를 모두 선택 후 확정'],
        ['DEMO-SRV-03', '담당자 미검출: 박예시 책임 직접 입력·확정'],
      ]
    ) +
    note(
      '이 기능은 장기 목록·파일 정리용. 실제 재전달 문구 작성·대기/확인 상태 관리는 지속 이벤트 재전달에서 수행.'
    )
);

add(
  'persistent',
  '07  지속 메시지 엑셀 추출',
  '복수·미검출 담당자 검토 및 확정',
  '자동 판독 결과를 확인하고 필요한 담당자만 선택·입력하여 추출 대상 확정.',
  fig('persistent-review', '복수 담당자 후보의 원문·선택·확정 영역', 240) +
    fig('persistent-manual', '담당자 미검출 항목의 직접 입력·확정 영역', 205) +
    table(
      ['검토 항목', '처리 내용'],
      [
        [
          '복수 담당자',
          '대상자를 여러 명 선택하고 선택 완료. 담당자별로 출력 행 확장',
        ],
        [
          '담당자 미검출',
          '직접 입력 후 Enter 또는 담당자 확정. 입력만 해서는 목록에 반영되지 않음',
        ],
        [
          '예외 확인 이력',
          '원래 담당자 미검출 시 재전달 이력을 참고한 후보를 확인',
        ],
        [
          '제외·미해결 관리',
          '필요 없는 행 제외. 미확정 담당자·입력 오류가 남으면 추출 차단',
        ],
      ]
    ) +
    note(
      '특이사항 일괄 제외 전 대상 확인 필요. 자동 판독 후보는 실제 담당자와 대조하여 확정.'
    )
);

add(
  'persistent',
  '07  지속 메시지 엑셀 추출',
  '엑셀 생성 결과 및 개선효과',
  '담당자별 행 확장과 필터를 적용하여 검토·공유할 목록 생성.',
  fig('persistent-preview', '담당자 확정 후 미리보기와 XLSX 추출', 230) +
    h('실제 내려받은 파일의 주요 열') +
    table(
      ['No.', '담당자', '서버명', '지속시간'],
      r.persistentRows.map((row) => [
        esc(row.A),
        esc(row.D),
        esc(row.E),
        esc(row.C),
      ]),
      [10, 28, 34, 28]
    ) +
    p(
      '입력 경고는 3건이나, 2번 서버에 담당자 2명이 지정되어 출력은 4행. 동일 경고가 담당자별로 나뉜 것으로 신규 경고가 증가한 것은 아님.'
    ) +
    p(
      '<b>파일 구성</b>　No.·발생일시·지속시간·담당자·호스트명·내용·IP·그룹명 총 8열. 필터와 첫 행 고정을 적용하여 담당자·서버 기준으로 목록을 검토·공유.'
    ) +
    impact(
      'persistent',
      '담당자 판독·서버별 정리·엑셀 재구성의 반복 작업 감소. 후보 검토와 목록 확인에 집중하며 공유 양식 통일.'
    ) +
    note(
      '예시 표는 내려받은 XLSX의 실제 셀값 중 주요 열을 발췌. 전체 열은 동봉된 결과 파일에서 확인 가능.'
    )
);

add(
  null,
  '개선효과 종합',
  '업무별 소요시간 및 정성적 개선효과',
  '업무 단위를 구분하여 비교하고 측정 근거가 없는 시간·절감률은 제시하지 않음.',
  h('업무별 소요시간 참고값') +
    table(
      ['업무 단위', '기존 방식', '보조기능 활용'],
      Object.values(costs).map((c) => [c.unit, c.before, c.after]),
      [42, 30, 28]
    ) +
    note(
      '현업 경험 기반 참고값. 메시지 건수·원본 형식·담당자 수·검토 난이도에 따라 변동하며, 자동 측정 평균·보장 수치가 아님.'
    ) +
    h('공통 개선효과') +
    table(
      ['개선 항목', '효과'],
      [
        [
          '반복 편집 감소',
          '재입력·문구 재조립 중심에서 원본 입력·검토·복사 중심으로 전환',
        ],
        ['보고 양식 일관성', '근무자별 필수 항목·문구·배치 표준화'],
        [
          '검토 누락 예방 지원',
          '미확정 담당자·필수 정보 누락 등 확인 필요 항목 표시 및 일부 작업 차단',
        ],
        [
          '구축 부담 최소화',
          '브라우저 내 처리로 별도 업무 데이터 서버·DB 구축 불필요',
        ],
      ]
    ) +
    p(
      '<b>제안 요지</b>　운영 판단과 보고 체계는 유지하면서 반복적인 자료 정리·문구 생성·파일 편집을 표준화하여 업무 효율과 보고 품질 개선.'
    )
);

add(
  null,
  '운영 적용 및 확인 기준',
  '업무 기준 유지와 단계적 효과 검증',
  '자료 정리 자동화의 장점을 활용하되 최종 판단·전달·보관은 기존 운영 절차 유지.',
  table(
    ['단계', '업무 적용 기준'],
    [
      ['입력 전', '원본 업무 자료의 열·시트·보고 대상 범위 확인'],
      ['자동 처리 후', '원본과 생성 결과의 서버·시각·담당자·상태 대조'],
      [
        '최종 전달·저장',
        '수신자 확인 후 발송. 필요한 확인 이력·결과 파일은 사내 절차에 따라 반영·보관',
      ],
    ]
  ) +
    h('주요 오해 방지') +
    table(
      ['구분', '판단 기준'],
      [
        [
          '문구 생성과 실제 발송',
          '메신저·메일은 완성 문구를 복사한 후 사용자가 전달',
        ],
        [
          '작업 완료와 경고 해소',
          '재전달 화면의 작업 상태와 실제 장애 조치 상태는 별도',
        ],
        [
          '오류 0건과 백업 성공',
          '미입력 백업존과 Status 1의 확인 필요 여부를 원본에서 검토',
        ],
        [
          '파일 편집과 붙여넣기 보고',
          '아이체크 편집은 원본 대비 차이, 독립 보고는 입력 행 기준',
        ],
        [
          '판독 후보와 확정 담당자',
          '복수·미검출 담당자를 검토하고 확정한 후 엑셀 추출',
        ],
      ],
      [33, 67]
    ) +
    h('효과 검증 및 보완 방향') +
    table(
      ['추진 항목', '확인 내용'],
      [
        ['사용성 확인', '기능별 예시 공유 후 팀원 피드백·수기 보정 사유 수집'],
        [
          '정량 효과 기록',
          '동일 업무량 기준 처리시간·문구 수정 건수·누락 확인 건수 기록',
        ],
        ['점진적 보완', '현업 예외 입력을 검증한 뒤 처리 규칙·문서 업데이트'],
      ]
    ) +
    note(
      '문서의 화면은 실제 기능 실행 후 캡처. 메일·메신저 발송 및 업무 데이터의 외부 업로드는 수행하지 않음.'
    )
);

const chapterNames = {
  mail: '해외메일 작성',
  gems: 'G-EMS 메시지',
  redirect: '지속 이벤트 재전달',
  backup: '자동 백업 에러',
  icheck: '아이체크 보고',
  editor: '아이체크 내역 편집',
  persistent: '지속 메시지 엑셀 추출',
};
const chapterDescriptions = {
  mail: '서버 경고 → 영문 메일',
  gems: '확인 이력 제거 → 메신저 문구',
  redirect: '1일 이상 경고 → 재전달·확인내역',
  backup: '백업 결과 → 오류 표·TXT',
  icheck: '13열 장비 내역 → 담당자별 문구',
  editor: 'XLSX 편집 → 변경 보고·수정 파일',
  persistent: '6열 누적 경고 → 담당자별 XLSX',
};
const chapters = Object.entries(chapterNames).map(([key, name], i) => {
  const indices = pages.flatMap((page, n) =>
    page.service === key ? [n + 1] : []
  );
  return {
    key,
    name,
    number: String(i + 1).padStart(2, '0'),
    start: indices[0],
    end: indices.at(-1),
    description: chapterDescriptions[key],
  };
});
pages[tocIndex].content =
  `<div class="toc">${table(
    ['기능', '주요 입력 → 생성 결과', '페이지'],
    chapters.map((c) => [
      `<a href="#page-${c.start}">${c.number}　${c.name}</a>`,
      c.description,
      `${c.start}–${c.end}`,
    ]),
    [39, 47, 14]
  )}</div>` +
  h('핵심 용어') +
  table(
    ['용어', '의미'],
    [
      ['Host · IP', '서버 이름과 네트워크 주소. 점검 대상 서버 식별에 사용'],
      ['Event · Message', '상태 감시 시스템에 표시된 경고 내용'],
      ['점등 · 소등', '장비의 상태 표시등이 켜짐·꺼짐. 현장 점검으로 확인'],
      [
        '담당자 · 보고자',
        '담당자는 점검 요청을 받는 사람, 보고자는 문구를 작성·전달하는 근무자',
      ],
    ]
  ) +
  note(
    '기능 이름을 클릭하면 해당 장으로 이동. 각 장은 업무 목적·현행 방식·실제 화면·생성 결과·개선효과 순서로 구성.'
  );
assert.equal(pages.length, 23);
assert.deepEqual(
  new Set(images),
  new Set(evidence.images),
  '캡처 이미지 전체 반영'
);

const fonts =
  process.env.GUIDE_FONT_DIR ||
  '/tmp/operation-guide-libs/usr/share/fonts/opentype/noto';
const regular = (
  await readFile(process.env.GUIDE_FONT || `${fonts}/NotoSansCJK-Regular.ttc`)
).toString('base64');
const bold = (
  await readFile(process.env.GUIDE_BOLD_FONT || `${fonts}/NotoSansCJK-Bold.ttc`)
).toString('base64');
const css = await readFile(`${root}report.css`, 'utf8');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>운영 업무 보조기능 개선제안서 · 전체 기능 제2판</title><style>@font-face{font-family:Report;src:url(data:font/ttf;base64,${regular});font-weight:400}@font-face{font-family:Report;src:url(data:font/ttf;base64,${bold});font-weight:700}${css}</style></head><body>${pages.map((page, i) => `<section class="page ${page.kind}" id="page-${i + 1}" data-service="${page.service || 'overview'}"><header><span>${page.section}</span><span>운영 업무 보조기능 · 제2판</span></header><main><h1>${page.title}</h1><p class="summary">${page.summary}</p>${page.content}</main><footer><span>LG CNS 전자/제조시스템팀</span><span>${i + 1} / ${pages.length}</span></footer></section>`).join('')}</body></html>`;
await writeFile(`${root}report.html`, html);
const { chromium } = await import(
  process.env.GUIDE_PLAYWRIGHT_MODULE ||
    '/tmp/operation-guide-tools/node_modules/playwright/index.mjs'
);
const browser = await chromium.launch({ headless: true });
const layout = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1400 },
  });
  await page.goto(new URL('./report.html', import.meta.url).href);
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  layout.push(
    ...(await page.locator('.page').evaluateAll((nodes) =>
      nodes.map((node, i) => {
        const bottom = node
          .querySelector('main')
          .getBoundingClientRect().bottom;
        const footer = node.querySelector('footer').getBoundingClientRect().top;
        const clipped = [...node.querySelectorAll('p,td,th,pre,.time')]
          .filter((el) => el.scrollWidth > el.clientWidth + 2)
          .map((el) => el.innerText.slice(0, 80));
        return { page: i + 1, footerGap: Math.round(footer - bottom), clipped };
      })
    ))
  );
  assert.deepEqual(
    layout.filter((item) => item.footerGap < 14 || item.clipped.length),
    [],
    '본문 넘침·가로 잘림·꼬릿말 겹침'
  );
  assert.equal(
    await page
      .locator('img')
      .evaluateAll((nodes) =>
        nodes.every((n) => n.complete && n.naturalWidth > 0)
      ),
    true,
    '이미지 로드'
  );
  await page.pdf({
    path: `${root}op-improvement-proposal-all-services-v2.pdf`,
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
    outline: true,
  });
  await mkdir(`${root}preview`, { recursive: true });
  for (let i = 0; i < pages.length; i++)
    await page
      .locator('.page')
      .nth(i)
      .screenshot({
        path: `${root}preview/page-${String(i + 1).padStart(2, '0')}.png`,
      });
} finally {
  await browser.close();
}
const pdfName = '운영업무보조기능_개선제안서_전체기능_제2판.pdf';
await copyFile(
  `${root}op-improvement-proposal-all-services-v2.pdf`,
  `${root}${pdfName}`
);
const archive = {
  [pdfName]: new Uint8Array(await readFile(`${root}${pdfName}`)),
};
for (const name of await readdir(`${root}samples`))
  archive[`samples/${name}`] = new Uint8Array(
    await readFile(`${root}samples/${name}`)
  );
await writeFile(
  `${root}op-improvement-proposal-all-services-v2-bundle.zip`,
  zipSync(archive)
);
await writeFile(
  `${root}manifest.json`,
  JSON.stringify(
    {
      edition: 2,
      pageCount: pages.length,
      chapters,
      screenshotCount: images.length,
      images,
      nativeExampleCount: examples.length,
      timeReferences: costs,
      timeBasis: '현업 소요시간 참고값, 자동 측정 평균 아님',
      capturedAt: evidence.capturedAt,
      layout,
      pdfName,
    },
    null,
    2
  )
);
console.log(
  `제2판 생성: ${pages.length}페이지 / 기능 ${chapters.length}개 / 화면 ${images.length}개 / 잘림 없음`
);
