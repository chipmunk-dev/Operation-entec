import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatICheckReport,
  groupICheckReportsByAdmin,
  parseICheckReportRows,
} from '../src/utils/iCheckReportFormatter.js';

const createRow = ({
  date = '2026-06-13',
  host = 'LGECCRP1 / LGEAETL1',
  location = 'SA3E-36',
  status = '!점등',
  admin = '김미경 책임',
  history = '○ 06/13 김미경 책임 - 확인요청',
} = {}) =>
  [
    date,
    'LG전자',
    host,
    location,
    'IBM',
    'Server',
    'POWER 570',
    'N/A',
    status,
    '2',
    '정유희',
    admin,
    history,
  ].join('\t');

test('13열 아이체크 행에서 보고용 필드를 정확히 추출한다', () => {
  const { rows, duplicateCount } = parseICheckReportRows(createRow());

  assert.equal(rows.length, 1);
  assert.equal(duplicateCount, 0);
  assert.equal(rows[0].columnCount, 13);
  assert.equal(rows[0].location, 'SA3E-36');
  assert.equal(rows[0].host, 'LGECCRP1 / LGEAETL1');
  assert.equal(rows[0].status, '!점등');
  assert.equal(rows[0].serverAdmin, '김미경 책임');
  assert.equal(rows[0].isComplete, true);
});

test('엑셀 헤더와 빈 줄을 제외한다', () => {
  const header = [
    '확인일',
    '고객사',
    '호스트명(서버명)',
    '장비 위치',
    '제조사(Vendor)',
    '구분(유형)',
    '장비 모델명',
    '기타값(파트명)',
    '점등상태(이상상태)',
    '근무자 조',
    '확인 근무자 이름',
    '서버 담당자(어드민)',
    '내역',
  ].join('\t');
  const result = parseICheckReportRows(`${header}\n\n${createRow()}`);

  assert.equal(result.headerCount, 1);
  assert.equal(result.rows.length, 1);
});

test('따옴표 안 여러 줄 내역을 하나의 13열 행으로 복구한다', () => {
  const rawInput = `${createRow({
    history: '"○ 08/04 김창준 선임 - 확인요청\n\n(전병호 책임 출장)"',
  })}\n${createRow({ host: 'NEXT-HOST', admin: '김민철 책임' })}`;
  const { rows } = parseICheckReportRows(rawInput);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].columnCount, 13);
  assert.equal(
    rows[0].history,
    '○ 08/04 김창준 선임 - 확인요청\n\n(전병호 책임 출장)',
  );
  assert.equal(rows[1].host, 'NEXT-HOST');
});

test('완전히 동일한 13열 행만 중복 제거한다', () => {
  const first = createRow();
  const changedStatus = createRow({ status: '주황 점등' });
  const result = parseICheckReportRows(
    `${first}\n${first}\n${changedStatus}`,
  );

  assert.equal(result.rows.length, 2);
  assert.equal(result.duplicateCount, 1);
});

test('제공된 아이체크 목록 패턴을 중복 없이 9명의 담당자로 묶는다', () => {
  const sampleRows = [
    { host: 'LGECCRP1 / LGEAETL1', admin: '김미경 책임', status: '!점등' },
    { host: 'LGEB2E-SE8Q', admin: '김미경 책임', status: '! 점등' },
    { host: 'LGEB2E-SE8Q (DAT)', admin: '김미경 책임', status: '! 빨간 점등' },
    { host: 'LGEAILIC01', admin: '김우찬 책임', status: '주황 점등' },
    { host: 'LGEWB2C2 ', admin: '김미경 책임', status: '주황 점등' },
    { host: 'LGEKVM-SE2Q', admin: '김민철 책임', status: '주황 점등' },
    { host: 'LGEAMRELO05', admin: '김민철 책임', status: '! 점등' },
    { host: 'LGEDCONS02Q', admin: '김민철 책임', status: '! 점등' },
    { host: 'LGEAFCM01', admin: '유민상 책임', status: '주황 점등' },
    { host: 'LGEWMCPDM01', admin: '김경상 책임', status: '메시지 주황 점등' },
    { host: 'LGEWGSCP01', admin: '김민철 책임', status: '전파 점등' },
    { host: 'LGECPAMS0', admin: '강해마루 사원', status: '전파 점멸' },
    { host: 'LGEWCBEE27P', admin: '임관우 선임', status: '! 점멸' },
    { host: 'LGEEP-6Q', admin: '김우찬 책임', status: 'Attention warnning' },
    { host: 'LGEDCRM1', admin: '신호준 선임', status: '주황 점멸' },
    { host: 'LGEDELEA02Q', admin: '김민철 책임', status: '! 점등' },
    {
      host: 'LGEWCBEE53P',
      admin: '김창준 선임',
      status: '주황 점등',
      history: '"○ 08/04 김창준 선임 - 확인요청\n\n(전병호 책임 출장)"',
    },
  ].map(createRow).join('\n');
  const parsedResult = parseICheckReportRows(
    `${sampleRows}\n\n${sampleRows}`,
  );
  const groups = groupICheckReportsByAdmin(parsedResult.rows);

  assert.equal(parsedResult.rows.length, 17);
  assert.equal(parsedResult.duplicateCount, 17);
  assert.equal(groups.length, 9);
  assert.equal(
    groups.find(({ serverAdmin }) => serverAdmin === '김민철 책임').rows.length,
    5,
  );
});

test('열 개수 또는 보고 필수값이 잘못된 행을 확인 필요로 표시한다', () => {
  const shortRow = createRow().split('\t').slice(0, 12).join('\t');
  const missingAdmin = createRow({ admin: '' });
  const { rows } = parseICheckReportRows(`${shortRow}\n${missingAdmin}`);

  assert.equal(rows[0].columnCount, 12);
  assert.equal(rows[0].isComplete, false);
  assert.equal(rows[1].columnCount, 13);
  assert.deepEqual(rows[1].missingFields, ['서버 담당자']);
  assert.equal(rows[1].isComplete, false);
});

test('서버 담당자별로 입력 순서를 유지해 여러 장비를 묶는다', () => {
  const { rows } = parseICheckReportRows(
    [
      createRow({ host: 'HOST-01', admin: '김미경 책임' }),
      createRow({ host: 'HOST-02', admin: '김민철 책임' }),
      createRow({ host: 'HOST-03', admin: '김미경 책임' }),
    ].join('\n'),
  );
  const groups = groupICheckReportsByAdmin(rows);

  assert.deepEqual(
    groups.map(({ serverAdmin, rows: groupRows }) => ({
      serverAdmin,
      hosts: groupRows.map(({ host }) => host),
    })),
    [
      { serverAdmin: '김미경 책임', hosts: ['HOST-01', 'HOST-03'] },
      { serverAdmin: '김민철 책임', hosts: ['HOST-02'] },
    ],
  );
});

test('담당자 그룹의 장비를 한 보고 문구로 생성한다', () => {
  const { rows } = parseICheckReportRows(
    [
      createRow({ host: 'HOST-01', location: 'SA3E-36', status: '!점등' }),
      createRow({ host: 'HOST-02', location: 'SA3A-15', status: '주황 점등' }),
    ].join('\n'),
  );
  const result = formatICheckReport(rows, {
    name: '홍길동',
    position: '선임',
  });

  assert.equal(
    result,
    `안녕하세요 상암상황실 홍길동 선임입니다.
서버실 장비 이상/점등건을 확인하여 보고드립니다.

위치: SA3E-36
서버: HOST-01
상태: !점등

위치: SA3A-15
서버: HOST-02
상태: 주황 점등`,
  );
});

test('보고자 정보가 비어 있으면 자리표시자를 사용한다', () => {
  const { rows } = parseICheckReportRows(createRow());
  assert.match(formatICheckReport(rows), /\(이름\) 사원입니다\./u);
  assert.equal(formatICheckReport([]), '');
});
