import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatGemsMessage,
  parseGemsMessageRows,
} from '../src/utils/gemsMessageFormatter.js';

test('첫 번째 탭을 호스트 구분자로 사용해 한 건을 파싱한다', () => {
  const [row] = parseGemsMessageRows('HOST-01\tCPU warning');

  assert.equal(row.host, 'HOST-01');
  assert.equal(row.message, 'CPU warning');
  assert.equal(row.hasDelimiter, true);
  assert.equal(row.isComplete, true);
});

test('여러 줄 입력을 각각 독립된 메시지로 처리한다', () => {
  const rows = parseGemsMessageRows(
    'HOST-01\tCPU warning\nHOST-02\tMemory warning\nHOST-03\tDisk warning',
  );

  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map(({ host }) => host),
    ['HOST-01', 'HOST-02', 'HOST-03'],
  );
});

test('첫 탭 이후의 추가 탭은 메시지 공백으로 합친다', () => {
  const [row] = parseGemsMessageRows(
    '자유로운 호스트 값\tCPU\tUtilization\tMAJOR occurred',
  );

  assert.equal(row.host, '자유로운 호스트 값');
  assert.equal(row.message, 'CPU Utilization MAJOR occurred');
});

test('메시지 뒤의 날짜형 확인 내역을 제거한다', () => {
  const [row] = parseGemsMessageRows(
    'HOST-01\tCPU warning [2026-08-03 10:00:00: 김철수 책임\t메신저 확인 UserName: 정지운]',
  );

  assert.equal(row.message, 'CPU warning');
  assert.match(row.confirmationText, /김철수 책임 메신저 확인/u);
});

test('날짜형 확인 내역이 아니면 대괄호 내용을 보존한다', () => {
  const [row] = parseGemsMessageRows('HOST-01\tCPU warning [PRIMARY]');

  assert.equal(row.message, 'CPU warning [PRIMARY]');
  assert.equal(row.confirmationText, '');
});

test('빈 줄과 BOM은 제거하고 CRLF 입력을 처리한다', () => {
  const rows = parseGemsMessageRows(
    '\uFEFFHOST-01\tCPU warning\r\n\r\nHOST-02\tDisk warning\r\n',
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].host, 'HOST-01');
  assert.equal(rows[1].lineNumber, 3);
});

test('탭이 없는 줄은 호스트로 보존하고 누락 행으로 표시한다', () => {
  const [row] = parseGemsMessageRows('HOST-WITHOUT-MESSAGE');

  assert.equal(row.host, 'HOST-WITHOUT-MESSAGE');
  assert.equal(row.message, '');
  assert.equal(row.hasDelimiter, false);
  assert.equal(row.isComplete, false);
});

test('줄바꿈은 복구하지 않고 각 물리 줄을 별도 행으로 판독한다', () => {
  const rows = parseGemsMessageRows(
    'HOST-01\tCPU warning first line\ncontinued message without tab',
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].message, 'CPU warning first line');
  assert.equal(rows[1].host, 'continued message without tab');
  assert.equal(rows[1].isComplete, false);
});

test('기본 정리 양식은 라벨 없이 호스트와 내용을 한 줄 간격으로 조립한다', () => {
  const rows = parseGemsMessageRows(
    'HOST-01\tCPU warning\nHOST-02\tDisk warning',
  );
  const result = formatGemsMessage(rows);

  assert.equal(
    result,
    'HOST-01\nCPU warning\n\nHOST-02\nDisk warning',
  );
});

test('메신저 보고용은 입력한 이름과 직급을 상단 문구에 반영한다', () => {
  const rows = parseGemsMessageRows('HOST-01\tCPU warning');
  const result = formatGemsMessage(rows, {
    mode: 'report',
    name: '홍길동',
    position: '책임',
  });

  assert.equal(
    result,
    '안녕하세요 상암 상황실 홍길동 책임 입니다.\nG-EMS에서 발생한 메세지 전달드리니 확인 부탁드립니다.\n\nHOST-01\nCPU warning',
  );
});

test('두 출력 방식 모두 호스트와 내용 라벨을 포함하지 않는다', () => {
  const rows = parseGemsMessageRows('HOST-01\tCPU warning');

  assert.doesNotMatch(formatGemsMessage(rows), /호스트:|내용:/u);
  assert.doesNotMatch(
    formatGemsMessage(rows, { mode: 'report', name: '홍길동' }),
    /호스트:|내용:/u,
  );
});

test('보고자 정보가 비어 있으면 알아볼 수 있는 자리표시자를 사용한다', () => {
  const rows = parseGemsMessageRows('HOST-01\tCPU warning');
  const result = formatGemsMessage(rows, {
    mode: 'report',
    name: ' ',
    position: '',
  });

  assert.match(result, /\(이름\) \(직급\) 입니다\./u);
});

test('빈 입력과 비배열 입력은 빈 결과를 반환한다', () => {
  assert.deepEqual(parseGemsMessageRows(''), []);
  assert.equal(formatGemsMessage([]), '');
  assert.equal(formatGemsMessage(null), '');
});
