import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PERSISTENT_REDIRECT_ORDER,
  parsePersistentRedirectRows,
} from '../src/utils/persistentRedirectParser.js';

test('Event 내부 탭과 줄바꿈을 복구하고 다음 데이터 행을 분리한다', () => {
  const rows = parsePersistentRedirectRows(
    [
      'HOST-01\tDisk\tusage warning',
      'continued [2026-07-26 10:00:00: 김철수 선임 확인]\t2026-07-26 09:00:00\t10.0.0.1',
      'HOST-02\tCPU warning\t2026-07-26 09:30:00\t10.0.0.2',
    ].join('\n'),
    DEFAULT_PERSISTENT_REDIRECT_ORDER,
  );

  assert.equal(rows.length, 2);
  assert.equal(
    rows[0].data.event,
    'Disk usage warning continued [2026-07-26 10:00:00: 김철수 선임 확인]',
  );
  assert.equal(rows[0].data.date, '2026-07-26 09:00:00');
  assert.equal(rows[0].data.ip, '10.0.0.1');
  assert.equal(rows[0].wasRecovered, true);
  assert.equal(rows[0].extraEventColumns, 1);
  assert.equal(rows[0].physicalLineCount, 2);
  assert.equal(rows[1].data.host, 'HOST-02');
  assert.equal(rows[1].wasRecovered, false);
});

test('Event가 마지막 열이어도 줄바꿈을 다음 데이터 시작 전까지 합친다', () => {
  const order = ['host', 'date', 'ip', 'event'];
  const rows = parsePersistentRedirectRows(
    [
      'HOST-01\t2026-07-26 09:00:00\t10.0.0.1\tDisk warning',
      'continued event',
      'HOST-02\t2026-07-26 09:30:00\t10.0.0.2\tCPU warning',
    ].join('\n'),
    order,
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].data.event, 'Disk warning continued event');
  assert.equal(rows[1].data.event, 'CPU warning');
});

test('Event가 첫 열이면 뒤쪽 안정 필드를 만나는 시점에 행을 완성한다', () => {
  const order = ['event', 'host', 'date', 'ip'];
  const rows = parsePersistentRedirectRows(
    [
      'Disk warning',
      'continued event\tHOST-01\t2026-07-26 09:00:00\t10.0.0.1',
      'CPU warning\tHOST-02\t2026-07-26 09:30:00\t10.0.0.2',
    ].join('\n'),
    order,
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].data.event, 'Disk warning continued event');
  assert.equal(rows[0].data.host, 'HOST-01');
  assert.equal(rows[1].data.host, 'HOST-02');
});
