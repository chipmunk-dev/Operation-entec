import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLightLog,
  parseLightEdits,
} from '../src/utils/lightLogFormatter.js';

test('기존 내역에 점등·소등을 반영해 한 줄 형태로 되돌린다', () => {
  const log = buildLightLog(
    '점등(95ea) : A-15(3),21/B-01-3,15,18',
    'A-15, D-24(2), M-01',
    'B-18, E-49(2)',
  );

  assert.equal(log.output, '점등(10ea) : A-15(4),21/B-01-3,15/D-24(2)/M-01');
  assert.equal(log.before, 7);
  assert.equal(log.total, 10);
  assert.deepEqual(log.missing, ['E-49']);
  assert.deepEqual(log.unread, []);
});

test('콤마 뒤의 맨숫자는 앞에 나온 구역 글자를 이어받는다', () => {
  const log = buildLightLog('점등(3ea) : A-15,21,33', '', '');
  const [sector] = log.sectors;

  assert.equal(sector.group, 'A');
  assert.deepEqual(
    sector.items.map((item) => item.num),
    ['15', '21', '33'],
  );
  assert.equal(log.total, 3);
});

test('B-01-3은 범위가 아니라 번호 하나로 읽는다', () => {
  const log = buildLightLog('점등(1ea) : B-01-3', '', '');
  const [sector] = log.sectors;

  assert.equal(sector.group, 'B');
  assert.deepEqual(sector.items, [{ num: '01-3', count: 1 }]);
  assert.equal(log.total, 1);
});

test('괄호 안의 숫자를 그 자리의 점등 개수로 센다', () => {
  const log = buildLightLog('점등(4ea) : A-15(3),21', '', '');

  assert.equal(log.total, 4);
  assert.equal(log.output, '점등(4ea) : A-15(3),21');
});

test('머리말 앞에 시각이 있어도 개수 표기만 갱신한다', () => {
  const log = buildLightLog('08/19 09:00 점등(95ea) : A-15(3),21', 'A-15', '');

  assert.equal(log.hasHead, true);
  assert.equal(log.output, '08/19 09:00 점등(5ea) : A-15(4),21');
});

test('머리말이 없으면 개수만 세고 원문을 그대로 둔다', () => {
  const log = buildLightLog('A-1,2,3', 'A-4', '');

  assert.equal(log.hasHead, false);
  assert.equal(log.output, 'A-1,2,3,4');
  assert.equal(log.total, 4);
});

test('여러 줄 구조와 줄 끝 슬래시를 그대로 유지한다', () => {
  const log = buildLightLog('점등(5개) : A-1,2/\nB-3,4/\nC-5', '', '');

  assert.equal(log.output, '점등(5개) : A-1,2/\nB-3,4/\nC-5');
  assert.equal(log.total, 5);
});

test('기존 내역에 없던 구역은 마지막 줄 끝에 새로 만든다', () => {
  const log = buildLightLog('점등(1ea) : A-1', 'Z-9(2)', '');

  assert.equal(log.output, '점등(3ea) : A-1/Z-9(2)');
  assert.equal(log.sectors.at(-1).group, 'Z');
});

test('새로 켜진 번호는 자연 정렬로 끼워 넣는다', () => {
  const log = buildLightLog('점등(2ea) : A-36-1,38', 'A-36-2', '');

  assert.equal(log.output, '점등(3ea) : A-36-1,36-2,38');
});

test('소등으로 개수가 0 이하가 되면 목록에서 뺀다', () => {
  const log = buildLightLog('점등(3ea) : A-1(2),2', '', 'A-1(2)');

  assert.equal(log.output, '점등(1ea) : A-2');
  assert.equal(log.total, 1);
});

test('기존 내역에 없는 자리를 소등하면 반영하지 않고 알린다', () => {
  const log = buildLightLog('점등(1ea) : A-1', '', 'B-18, A-99');

  assert.deepEqual(log.missing, ['B-18', 'A-99']);
  assert.equal(log.total, 1);
});

test('구역 글자가 없는 점등·소등 조각은 반영하지 않고 남긴다', () => {
  const { list, unread } = parseLightEdits('A-15, 33, B-1, (2), 그냥글자');

  assert.deepEqual(list, [
    { group: 'A', num: '15', count: 1 },
    { group: 'B', num: '1', count: 1 },
  ]);
  assert.deepEqual(unread, ['33', '(2)', '그냥글자']);
});

test('기존 내역이 비어 있으면 결과를 만들지 않는다', () => {
  assert.equal(buildLightLog('', 'A-1', ''), null);
  assert.equal(buildLightLog('   \n  ', '', ''), null);
});
