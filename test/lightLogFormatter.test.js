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

test('기존 내역에 없던 구역은 알파벳 순서에 맞는 자리에 새로 만든다', () => {
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

test('점등·소등의 맨숫자는 앞에 나온 구역 글자를 이어받는다', () => {
  const { list, unread } = parseLightEdits('A-15, 33, B-1, (2), 그냥글자');

  assert.deepEqual(list, [
    { group: 'A', num: '15', count: 1 },
    { group: 'A', num: '33', count: 1 },
    { group: 'B', num: '1', count: 1 },
  ]);
  assert.deepEqual(unread, ['(2)', '그냥글자']);
});

test('기존 내역이 비어 있으면 결과를 만들지 않는다', () => {
  assert.equal(buildLightLog('', 'A-1', ''), null);
  assert.equal(buildLightLog('   \n  ', '', ''), null);
});

test('엑셀 셀을 통째로 복사해 따옴표로 감싸져도 마지막 숫자까지 읽는다', () => {
  const log = buildLightLog('"점등(7ea) : A-15(3),21/B-01-3,15,18"', '', '');

  assert.equal(log.total, 7);
  assert.equal(log.output, '점등(7ea) : A-15(3),21/B-01-3,15,18');
  assert.deepEqual(log.unread, []);
});

test('따옴표로 감싸진 여러 줄 내역도 줄 구조를 유지하며 읽는다', () => {
  const log = buildLightLog('"점등(5개) : A-1,2/\nB-3,4/\nC-5"', '', '');

  assert.equal(log.total, 5);
  assert.equal(log.output, '점등(5개) : A-1,2/\nB-3,4/\nC-5');
  assert.deepEqual(log.unread, []);
});

test('번호 없는 "A-" 는 반영하지 않고 남긴다', () => {
  const log = buildLightLog('점등(3ea) : A-1,2,A-', '', '');

  assert.equal(log.total, 2);
  assert.deepEqual(log.unread, ['A-']);
  assert.equal(log.output, '점등(2ea) : A-1,2');
});

test('"A(0)" 처럼 번호 없이 괄호만 붙은 조각은 반영하지 않고 남긴다', () => {
  const log = buildLightLog('점등(1ea) : A(0),B-1', '', '');

  assert.equal(log.total, 1);
  assert.deepEqual(log.unread, ['A(0)']);
  assert.equal(log.output, '점등(1ea) : B-1');
});

test('괄호 개수가 0인 항목은 반영하지 않고 남긴다', () => {
  const log = buildLightLog('점등(2ea) : A-1,B-2(0)', '', '');

  assert.equal(log.total, 1);
  assert.deepEqual(log.unread, ['B-2(0)']);
  assert.equal(log.output, '점등(1ea) : A-1');
});

test('항목 뒤에 홀로 붙은 "(0)" 은 개수를 바꾸지 않고 남긴다', () => {
  const log = buildLightLog('점등(1ea) : A-1 (0)', '', '');

  assert.equal(log.total, 1);
  assert.deepEqual(log.unread, ['(0)']);
  assert.equal(log.output, '점등(1ea) : A-1');
});

test('점등·소등 입력의 "A-" 와 개수 0도 반영하지 않고 남긴다', () => {
  const { list, unread } = parseLightEdits('A-, B-1(0), C-2');

  assert.deepEqual(list, [{ group: 'C', num: '2', count: 1 }]);
  assert.deepEqual(unread, ['A-', 'B-1(0)']);
});

test('괄호 없이 "95ea" 형태의 머리말도 개수를 갱신한다', () => {
  const log = buildLightLog('점등 95ea : A-1', 'A-2', '');

  assert.equal(log.hasHead, true);
  assert.equal(log.output, '점등 2ea : A-1,2');
});

test('괄호 없는 머리말 앞에 시각이 있어도 개수 표기만 갱신한다', () => {
  const log = buildLightLog('08/19 09:00 점등 95개 : A-1', 'A-2', '');

  assert.equal(log.hasHead, true);
  assert.equal(log.output, '08/19 09:00 점등 2개 : A-1,2');
});

test('머리말에서 개수 표기를 찾지 못하면 알리고 머리말을 그대로 둔다', () => {
  const log = buildLightLog('점등 현황 : A-1', 'A-2', '');

  assert.equal(log.hasHead, false);
  assert.equal(log.total, 2);
  assert.equal(log.output, '점등 현황 : A-1,2');
});

test('새 구역은 기존 구역들 사이 알파벳 자리에 끼워 넣는다', () => {
  const log = buildLightLog('점등(2ea) : A-1/C-2', 'B-9', '');

  assert.equal(log.output, '점등(3ea) : A-1/B-9/C-2');
});

test('여러 줄 내역에서도 새 구역을 알파벳 자리 줄에 끼워 넣는다', () => {
  const log = buildLightLog('점등(2개) : A-1/\nC-2', 'B-9', '');

  assert.equal(log.output, '점등(3개) : A-1/\nB-9/C-2');
});

test('점등·소등에서 "A-1,2,3"은 A-1, A-2, A-3으로 읽는다', () => {
  const { list, unread } = parseLightEdits('A-1,2,3');

  assert.deepEqual(list, [
    { group: 'A', num: '1', count: 1 },
    { group: 'A', num: '2', count: 1 },
    { group: 'A', num: '3', count: 1 },
  ]);
  assert.deepEqual(unread, []);
});

test('새 구역 글자가 나오면 이후 맨숫자는 새 구역을 따른다', () => {
  const { list } = parseLightEdits('A-1, 2(2), B-5, 6');

  assert.deepEqual(list, [
    { group: 'A', num: '1', count: 1 },
    { group: 'A', num: '2', count: 2 },
    { group: 'B', num: '5', count: 1 },
    { group: 'B', num: '6', count: 1 },
  ]);
});

test('앞에 구역 글자가 없는 맨숫자는 반영하지 않고 남긴다', () => {
  const { list, unread } = parseLightEdits('33, A-1');

  assert.deepEqual(list, [{ group: 'A', num: '1', count: 1 }]);
  assert.deepEqual(unread, ['33']);
});

test('점등 "A-1,2,3" 입력이 기존 내역에 세 자리로 반영된다', () => {
  const log = buildLightLog('점등(1ea) : A-9', 'A-1,2,3', '');

  assert.equal(log.output, '점등(4ea) : A-1,2,3,9');
  assert.equal(log.total, 4);
});

test('같은 구역 안에 같은 번호가 여러 번 나오면 한 자리로 합쳐 개수를 더한다', () => {
  const log = buildLightLog('점등(3ea) : A-15,15,21', '', '');
  assert.equal(log.output, '점등(3ea) : A-15(2),21');
  assert.equal(log.total, 3);

  const added = buildLightLog('점등(1ea) : A-15', 'A-15, A-15', '');
  assert.equal(added.output, '점등(3ea) : A-15(3)');

  const removed = buildLightLog('점등(3ea) : A-15,15(2)', '', 'A-15');
  assert.equal(removed.output, '점등(2ea) : A-15(2)');
});

test('한 조각 안에서 구역 글자가 바뀌면 그 지점부터 다른 구역으로 읽는다', () => {
  const log = buildLightLog('점등(5ea) : A-15,15,16,B-12,A-17', '', '');

  assert.deepEqual(
    log.sectors.map((sector) => [sector.group, sector.items.map((item) => `${item.num}(${item.count})`)]),
    [
      ['A', ['15(2)', '16(1)', '17(1)']],
      ['B', ['12(1)']],
    ],
  );
  assert.equal(log.output, '점등(5ea) : A-15(2),16,17/B-12');
  assert.equal(log.total, 5);
});

test('allowEmptyBase면 빈 기존 내역에 점등을 더해 새로 만든다', () => {
  assert.equal(buildLightLog('', 'A-1', ''), null, '기본값은 기존과 같이 결과를 만들지 않는다');

  const log = buildLightLog('', 'A-15, A-15, B-3', '', { allowEmptyBase: true });
  assert.equal(log.output, 'A-15(2)/B-3');
  assert.equal(log.total, 3);
  assert.equal(log.before, 0);
  assert.equal(log.hasHead, false);
});
