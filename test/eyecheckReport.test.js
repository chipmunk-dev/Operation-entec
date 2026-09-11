import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareReportRows,
  prepareReportDevices,
  groupChangeReports,
  formatChangeReport,
  reportMissingFields,
} from '../src/utils/eyecheckReport.js';

const row = (r, overrides = {}) => ({
  r,
  vals: { C: 'HOST1', D: 'SA3A-01', I: '! 점등', L: '담당 책임', ...overrides },
});

test('변경 없음, 빈 입력, 행 재정렬/재번호/날짜 변경은 보고를 만들지 않는다', () => {
  assert.deepEqual(compareReportRows([], []), []);
  assert.deepEqual(
    compareReportRows(
      [row(3), row(4, { D: 'SA4B-2' })],
      [row(3, { D: 'SA4B-2', A: '2026-09-09' }), row(6)]
    ),
    []
  );
});
test('신규/소등 장비만 추리고 원본을 변경하지 않는다', () => {
  const original = [row(3), row(4, { C: 'HOST2' })];
  const before = JSON.stringify(original);
  const changes = compareReportRows(original, [
    row(3),
    row(5, { C: 'HOST3', D: 'SA3B-10' }),
  ]);
  assert.deepEqual(
    changes.map((entry) => [entry.kind, entry.vals.C]),
    [
      ['on', 'HOST3'],
      ['off', 'HOST2'],
    ]
  );
  assert.equal(JSON.stringify(original), before);
});
test('동일 위치와 동일 장비의 중복 개수 차이도 한 건씩 보존한다', () => {
  assert.equal(compareReportRows([row(3), row(4)], [row(8)]).length, 1);
  const changes = compareReportRows([row(3)], [row(3), row(4), row(5)]);
  assert.equal(changes.length, 2);
  assert.equal(new Set(changes.map((entry) => entry.id)).size, 2);
});
test('저장 전후 행 번호 변경에도 신규 보고 ID와 소등 내역을 유지한다', () => {
  const original = [row(3)];
  const before = compareReportRows(original, [
    { vals: row(0, { D: 'SA3B-1' }).vals, detailKey: 'new' },
  ]);
  const after = compareReportRows(original, [
    row(3, { D: 'SA3B-1', A: '2026-09-09' }),
  ]);
  assert.deepEqual(
    before.map(({ id, kind }) => ({ id, kind })),
    after.map(({ id, kind }) => ({ id, kind }))
  );
});
test('신규 장비의 호스트/담당자를 입력해도 보고 ID가 유지된다', () => {
  const before = compareReportRows([], [row(3, { C: '', L: '' })]);
  const after = compareReportRows([], [row(3)]);
  assert.equal(before[0].id, after[0].id);
});
test('동일 위치 여러 장비의 보완 정보는 서로 섞이지 않는다', () => {
  const devices = [
    { D: 'SA3A-1', I: '주황 점등' },
    { D: 'SA3A-1', I: '빨강 점등' },
  ];
  const initial = prepareReportDevices(devices);
  const result = prepareReportDevices(devices, {
    [initial[1].key]: { C: 'HOST2', L: '담당2' },
  });
  assert.equal(result[0].vals.C, undefined);
  assert.equal(result[1].vals.C, 'HOST2');
  assert.equal(devices[1].C, undefined);
});
test('필수값 누락/공백은 보고 그룹에서 제외하고 빈 보고자 복사를 막는다', () => {
  const changes = compareReportRows([], [row(3), row(4, { C: '  ', L: '' })]);
  assert.deepEqual(reportMissingFields(changes[1]), [
    '호스트명',
    '서버 담당자',
  ]);
  assert.equal(groupChangeReports(changes)[0].rows.length, 1);
  assert.equal(formatChangeReport(changes, '보고자', '사원'), '');
  assert.equal(formatChangeReport([changes[0]], '  ', '사원'), '');
});
test('담당자별 분류와 소등 문구에 원래 상태 포함, 줄바꿈 정리', () => {
  const changes = compareReportRows(
    [row(3)],
    [row(4, { C: 'HOST\n2', D: 'SA4A-1', L: '담당2 책임' })]
  );
  const groups = groupChangeReports(changes);
  assert.equal(groups.length, 2);
  const message = formatChangeReport(changes, '테스트', '사원');
  assert.match(message, /서버: HOST 2/);
  assert.match(message, /소등 \(기존: ! 점등\)/);
});
test('추가 후 제거하여 최초 상태로 복구하면 보고도 사라진다', () => {
  const original = [row(3)];
  assert.equal(compareReportRows(original, [row(7)]).length, 0);
  assert.equal(compareReportRows([], []).length, 0);
});
