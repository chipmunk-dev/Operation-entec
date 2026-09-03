import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import {
  COUNT_SHEET,
  EYE_SHEET,
  OFF_SHEET,
  ON_SHEET,
  applyEyecheckChanges,
  backupName,
  calculateFloor,
  checkWorkbookConsistency,
  collectPendingWork,
  compareEntries,
  contentText,
  countByFloor,
  lightValue,
  moveRows,
  offTextOf,
  openEyecheckWorkbook,
  outputName,
  parsePosition,
  positionOf,
  scanEyecheck,
  scanFloorCounts,
  snapshotFloors,
} from '../src/utils/eyecheckWorkbook.js';
import { buildTextCell, isoToSerial, parseCells, parseSheet } from '../src/utils/xlsxSheetXml.js';

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const DATE = isoToSerial('2026-09-03');

const text = (ref, value, s = null) => buildTextCell(ref, s, value);
const num = (ref, value, s = null) =>
  `<c r="${ref}"${s === null ? '' : ` s="${s}"`}><v>${value}</v></c>`;
const formula = (ref, expr, value) => `<c r="${ref}"><f>${expr}</f><v>${value}</v></c>`;
const row = (r, cells) => `<row r="${r}">${cells}</row>`;
const sheet = (rowsXml, { dimension = 'A1:P60', tail = '' } = {}) =>
  `<?xml version="1.0"?><worksheet ${NS} xmlns:x14ac="x14ac"><dimension ref="${dimension}"/><sheetData>${rowsXml}</sheetData>${tail}</worksheet>`;

const deviceRow = (r, position, host = `HOST${r}`) =>
  row(
    r,
    `${num(`A${r}`, 46200, 1)}${text(`B${r}`, 'LG전자')}${text(`C${r}`, host)}${text(`D${r}`, position, 2)}${text(`G${r}`, 'Server')}${text(`I${r}`, '주황 점등')}${text(`M${r}`, '○ 06/01')}`,
  );

const onSheetXml = () =>
  sheet(
    row(1, text('A1', 'Check Date')) +
      row(2, text('A2', '머리글')) +
      deviceRow(3, 'SA3A-15') +
      deviceRow(4, 'SA3B-01-3') +
      deviceRow(5, 'SA4A-2'),
  );

const offSheetXml = () =>
  sheet(row(1, text('A1', 'Check Date')) + row(2, text('A2', '머리글')) + deviceRow(3, 'SA3C-9'), {
    tail: '<autoFilter ref="A2:M3"/>',
  });

const countSheetXml = () =>
  sheet(
    row(2, `${text('B2', '3층')}${formula('C2', 'COUNTIF(점등장비!D:D,"*SA3*")', 2)}`) +
      row(3, `${text('B3', '4층')}${formula('C3', 'COUNTIF(점등장비!D:D,"*SA4*")', 1)}`) +
      row(5, `${text('B5', '총합')}${formula('C5', 'SUM(C2:C3)', 3)}`),
  );

const eyeSheetXml = () =>
  sheet(
    row(26, `${text('B26', '점검대상')}${text('C26', '점 검 내 역')}${text('O26', '점검대상')}`) +
      row(27, `${text('B27', '3A 구역')}${text('O27', 'A-15(3),21', 7)}`) +
      row(28, `${text('B28', '3B 구역')}${text('O28', 'B-01-3', 7)}`) +
      row(40, `${text('B40', '점검대상')}${text('C40', '점검내역')}${text('O40', '점검대상')}`) +
      row(41, `${text('B41', '4A 구역')}${text('O41', 'A-2', 7)}`) +
      row(42, `${text('B42', '4B 구역')}<c r="O42" s="7"/>`),
    { tail: '<mergeCells count="1"><mergeCell ref="O27:P27"/></mergeCells>' },
  );

const stylesXml = () =>
  `<styleSheet><numFmts count="0"/><cellXfs count="8"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="0"/><xf numFmtId="0"/><xf numFmtId="0"/><xf numFmtId="0"/><xf numFmtId="0"/><xf numFmtId="0"/></cellXfs></styleSheet>`;

const buildParts = () => ({
  '[Content_Types].xml': '<Types/>',
  '_rels/.rels': '<Relationships/>',
  'docProps/app.xml': '<Properties><Application>Test</Application></Properties>',
  'xl/workbook.xml': `<workbook xmlns:r="r"><sheets><sheet name="${ON_SHEET}" sheetId="1" r:id="rId1"/><sheet name="${OFF_SHEET}" sheetId="2" r:id="rId2"/><sheet name="${COUNT_SHEET}" sheetId="3" r:id="rId3"/><sheet name="${EYE_SHEET}" sheetId="4" r:id="rId4"/></sheets><calcPr calcId="191029"/></workbook>`,
  'xl/_rels/workbook.xml.rels': `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Target="worksheets/sheet4.xml"/></Relationships>`,
  'xl/styles.xml': stylesXml(),
  'xl/worksheets/sheet1.xml': onSheetXml(),
  'xl/worksheets/sheet2.xml': offSheetXml(),
  'xl/worksheets/sheet3.xml': countSheetXml(),
  'xl/worksheets/sheet4.xml': eyeSheetXml(),
  'xl/media/image1.png': 'PNG\r\n',
});

const zipParts = (parts) =>
  zipSync(
    Object.fromEntries(Object.entries(parts).map(([path, xml]) => [path, strToU8(xml)])),
    { level: 6 },
  );

const cellsOf = (xml, r) =>
  Object.fromEntries(
    parseCells(parseSheet(xml).rows.find((candidate) => candidate.r === r).xml).map((cell) => [
      cell.col,
      cell,
    ]),
  );

test('점등장비 위치 문자열을 층·구역·번호로 읽고 다시 만든다', () => {
  assert.deepEqual(parsePosition('SA3A-15'), { floor: '3', group: 'A', num: '15' });
  assert.deepEqual(parsePosition(' sa3-b-01-3 '), { floor: '3', group: 'B', num: '01-3' });
  assert.equal(parsePosition('B-15'), null);
  assert.equal(positionOf('3', 'A', '15'), 'SA3A-15');
});

test('구역 글자 다음 번호 자연 순서로 정렬한다', () => {
  const entries = [
    { group: 'B', num: '2' },
    { group: 'A', num: '38' },
    { group: 'A', num: '36-2' },
    { group: 'A', num: '36-1' },
  ];
  assert.deepEqual(
    entries.sort(compareEntries).map((entry) => `${entry.group}-${entry.num}`),
    ['A-36-1', 'A-36-2', 'A-38', 'B-2'],
  );
});

test('층별 점등장비 개수를 COUNTIF 기준으로 센다', () => {
  const rows = [
    { r: 3, vals: { D: 'SA3A-15' } },
    { r: 4, vals: { D: ' sa3b-1 ' } },
    { r: 5, vals: { D: 'SA4A-2' } },
    { r: 6, vals: {} },
  ];
  assert.deepEqual(countByFloor(rows, ['3', '4', '5']), { total: 3, 3: 2, 4: 1, 5: 0 });
});

test('전자_Eyecheck에서 층 블록과 점검대상 칸을 찾는다', () => {
  const { floors } = scanEyecheck(eyeSheetXml(), [], null);
  assert.equal(floors.length, 2);
  assert.equal(floors[0].floor, '3');
  assert.equal(floors[0].targetCol, 'O');
  assert.deepEqual(
    floors[0].zones.map(({ label, letter, ref, text: value }) => ({ label, letter, ref, text: value })),
    [
      { label: '3A', letter: 'A', ref: 'O27', text: 'A-15(3),21' },
      { label: '3B', letter: 'B', ref: 'O28', text: 'B-01-3' },
    ],
  );
  assert.equal(floors[0].zoneText, 'A-15(3),21/B-01-3');
  assert.equal(floors[1].zoneText, 'A-2');
  assert.equal(floors[1].zones[1].text, '');
});

test('층별갯수 시트에서 라벨 오른쪽 개수 칸을 찾는다', () => {
  assert.deepEqual(scanFloorCounts(countSheetXml(), []), {
    3: { ref: 'C2', value: 2 },
    4: { ref: 'C3', value: 1 },
    total: { ref: 'C5', value: 3 },
  });
});

test('고른 행을 점등장비에서 빼고 소등장비 아래에 날짜와 함께 붙인다', () => {
  const result = moveRows({
    onXml: onSheetXml(),
    offXml: offSheetXml(),
    selectedRows: [4, 2],
    dateSerial: DATE,
  });

  assert.deepEqual(result.movedRows, [4]);
  assert.deepEqual(result.targetRows, [4]);
  assert.equal(result.onRemaining, 2);
  assert.equal(result.offLastRow, 4);

  const on = parseSheet(result.onXml).rows.map((candidate) => candidate.r);
  assert.deepEqual(on, [1, 2, 3, 4], '아래 행이 위로 당겨진다');
  assert.equal(cellsOf(result.onXml, 4).D.inner, '<is><t xml:space="preserve">SA4A-2</t></is>');

  const moved = cellsOf(result.offXml, 4);
  assert.equal(moved.A.inner, `<v>${DATE}</v>`);
  assert.equal(moved.A.s, '1', '날짜 서식은 원래 행의 것을 따른다');
  assert.equal(moved.D.inner, '<is><t xml:space="preserve">SA3B-01-3</t></is>');
  assert.match(result.offXml, /<autoFilter ref="A2:M4"\/>/);
  assert.match(result.onXml, /<dimension ref="A1:P4"\/>/);
});

test('값이 있는 행을 고르지 않으면 이동하지 않는다', () => {
  assert.throws(
    () => moveRows({ onXml: onSheetXml(), offXml: offSheetXml(), selectedRows: [2, 9], dateSerial: DATE }),
    /이동할 행이 없습니다/,
  );
});

test('고른 행 중 해당 층의 것만 소등 입력으로 만든다', () => {
  const rows = [
    { r: 3, vals: { D: 'SA3A-15' } },
    { r: 4, vals: { D: 'SA3B-01-3' } },
    { r: 5, vals: { D: 'SA4A-2' } },
  ];
  assert.equal(offTextOf(rows, new Set([3, 4, 5]), '3'), 'A-15,B-01-3');
  assert.equal(offTextOf(rows, [5], '3'), '');
});

const floor3 = () => scanEyecheck(eyeSheetXml(), [], null).floors[0];
const moveRowsOf = () => [
  { r: 3, vals: { D: 'SA3A-15' } },
  { r: 4, vals: { D: 'SA3B-01-3' } },
  { r: 5, vals: { D: 'SA4A-2' } },
];

test('층 계산: 소등은 고른 행에서, 점등은 입력에서 반영하고 추가 행을 만든다', () => {
  const calc = calculateFloor(floor3(), {
    base: 'A-15(3),21/B-01-3',
    on: 'C-1(2), A-30',
    moveRows: moveRowsOf(),
    selectedRows: [3],
    dateSerial: DATE,
    content: '○ 09/03',
    shift: '1조',
    finder: '주상돈',
    lightType: '주황',
    lightOther: '',
    picks: { '3|C-1|0': { t: '기타', o: '팬 점멸' } },
    addDevices: true,
  });

  assert.equal(calc.off, 'A-15');
  assert.equal(calc.output, 'A-15(2),21,30/B-01-3/C-1(2)');
  assert.deepEqual(calc.zones.map((zone) => zone.next), ['A-15(2),21,30', 'B-01-3']);
  assert.deepEqual(calc.unmatched, ['C']);
  assert.equal(calc.dirty, true);
  assert.deepEqual(
    calc.items.map(({ pos, count, type, other, own }) => ({ pos, count, type, other, own })),
    [
      { pos: 'SA3A-30', count: 1, type: '주황', other: '', own: false },
      { pos: 'SA3C-1', count: 2, type: '기타', other: '팬 점멸', own: true },
    ],
  );
  assert.deepEqual(calc.devices, [
    { A: DATE, D: 'SA3A-30', I: '주황 점등', J: '1조', K: '주상돈', M: '○ 09/03' },
    { A: DATE, D: 'SA3C-1', I: '팬 점멸', J: '1조', K: '주상돈', M: '○ 09/03' },
    { A: DATE, D: 'SA3C-1', I: '팬 점멸', J: '1조', K: '주상돈', M: '○ 09/03' },
  ]);
  assert.equal(calc.deviceCount, 2 - 1 + 3);
});

test('층 계산: 바뀐 것이 없으면 기록 대상이 아니고, 목록이 없으면 행도 만들지 않는다', () => {
  const calc = calculateFloor(floor3(), {
    base: 'A-15(3),21/B-01-3',
    on: '',
    moveRows: null,
    selectedRows: [],
    dateSerial: DATE,
    lightType: '주황',
    picks: {},
    addDevices: true,
  });
  assert.equal(calc.dirty, false);
  assert.deepEqual(calc.devices, []);
  assert.equal(calc.deviceCount, null);

  // 점검대상 칸이 비어 있는 새 시트에서도 점등 입력은 구역 칸에 기록돼야 한다.
  const empty = calculateFloor(floor3(), { base: '', on: 'A-1', moveRows: moveRowsOf(), selectedRows: [], lightType: '주황', picks: {}, addDevices: false });
  assert.equal(empty.log.output, 'A-1');
  assert.equal(empty.zones[0].next, 'A-1');
  assert.equal(empty.dirty, true);
  assert.equal(empty.deviceCount, 2, '추가를 끄면 추가 행은 개수에 넣지 않는다');

  const idle = calculateFloor(floor3(), { base: '', on: '', moveRows: null, selectedRows: [], lightType: '주황', picks: {}, addDevices: true });
  assert.equal(idle.log, null, '기존 내역도 점등·소등도 없으면 결과를 만들지 않는다');
});

test('저장할 작업을 층 기록·이동·추가 행으로 모은다', () => {
  const floor = floor3();
  const calc = calculateFloor(floor, {
    base: floor.zoneText,
    on: 'A-30',
    moveRows: moveRowsOf(),
    selectedRows: [4],
    dateSerial: DATE,
    lightType: '주황',
    picks: {},
    addDevices: true,
  });
  const doc = { move: { rows: moveRowsOf() } };
  const work = collectPendingWork(doc, [{ floor, calc }], 1, true);
  assert.deepEqual(work.floors.map((item) => item.floor), ['3']);
  assert.equal(work.moveCount, 1);
  assert.equal(work.devices.length, 1);
  assert.deepEqual(collectPendingWork(doc, [{ floor, calc }], 0, false).devices, []);
});

test('문구·파일 이름 도우미', () => {
  assert.equal(contentText('2026-09-03'), '○ 09/03');
  assert.equal(contentText(''), '');
  assert.equal(lightValue('주황'), '주황 점등');
  assert.equal(lightValue('기타', ' 팬 점멸 '), '팬 점멸');
  assert.equal(outputName('EyeCheck.xlsx', '2026-09-03'), 'EyeCheck_20260903.xlsx');
  assert.equal(backupName('EyeCheck.XLSX', '2026-09-03'), 'EyeCheck_백업_20260903.xlsx');
});

test('xlsx를 열어 네 시트를 읽는다', () => {
  const doc = openEyecheckWorkbook(zipParts(buildParts()), 'EyeCheck.xlsx');
  assert.equal(doc.move.rows.length, 3);
  assert.equal(doc.move.rows[0].vals.D, 'SA3A-15');
  assert.equal(doc.move.rows[0].vals.A, '2026-06-27', '날짜 서식 셀은 날짜로 읽는다');
  assert.equal(doc.move.offLast, 3);
  assert.deepEqual(Object.keys(doc.counts.cells), ['3', '4', 'total']);
  assert.deepEqual(doc.eye.floors.map((floor) => floor.floor), ['3', '4']);
});

test('xlsx가 아니거나 필요한 시트가 없으면 열지 않는다', () => {
  assert.throws(() => openEyecheckWorkbook(new Uint8Array(0), 'a.xls'), /xlsx 파일만/);
  assert.throws(() => openEyecheckWorkbook(strToU8('not a zip'), 'a.xlsx'), /압축을 풀 수 없습니다/);

  const parts = buildParts();
  parts['xl/workbook.xml'] = `<workbook xmlns:r="r"><sheets><sheet name="기타" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  assert.throws(() => openEyecheckWorkbook(zipParts(parts), 'a.xlsx'), /시트를 찾지 못했습니다.*기타/);
});

test('파일 안 개수가 서로 맞지 않거나 지난 저장과 다르면 알린다', () => {
  const doc = openEyecheckWorkbook(zipParts(buildParts()), 'EyeCheck.xlsx');
  const clean = checkWorkbookConsistency(doc, null);
  assert.deepEqual(clean.diffs, ['3층 점검대상 칸 5개 ↔ 점등장비 2건']);
  assert.equal(clean.stale, false);

  const stale = checkWorkbookConsistency(doc, {
    at: '2026-09-01 09:00',
    floors: { 3: 'A-15(3),21/B-01-3/C-9' },
    counts: { 3: 2, 4: 1, total: 4 },
  });
  assert.equal(stale.stale, true);
  assert.deepEqual(stale.diffs.slice(1), ['3층 점검대상 칸', '점등장비 총 개수 (저장 4 → 파일 3)']);
  assert.match(stale.headline, /2026-09-01 09:00에 저장한 내용과 다릅니다/);
});

test('변경을 반영한 xlsx는 네 시트만 바뀌고 나머지 파트는 그대로다', () => {
  const parts = buildParts();
  const original = zipParts(parts);
  const doc = openEyecheckWorkbook(original, 'EyeCheck.xlsx');
  const floor = doc.eye.floors[0];
  const calc = calculateFloor(floor, {
    base: floor.zoneText,
    on: 'A-30',
    moveRows: doc.move.rows,
    selectedRows: [3],
    dateSerial: DATE,
    content: '○ 09/03',
    shift: '1조',
    finder: '주상돈',
    lightType: '빨강',
    lightOther: '',
    picks: {},
    addDevices: true,
  });
  const work = collectPendingWork(doc, [{ floor, calc }], 1, true);

  const result = applyEyecheckChanges(doc, {
    floors: work.floors,
    calcByFloor: { [floor.floor]: calc },
    selectedRows: [3],
    dateSerial: DATE,
    devices: work.devices,
  });

  assert.deepEqual(result.done, [
    '점등내역 3층 기록',
    `1건 이동 (${ON_SHEET} 2건 남음, ${OFF_SHEET} 4~4행)`,
    `${ON_SHEET} 5~5행에 1행 추가`,
  ]);
  assert.deepEqual(result.saved, [{ floor: '3', zoneText: 'A-15(2),21,30/B-01-3' }]);
  assert.deepEqual(result.finalCounts, { total: 3, 3: 2, 4: 1 });

  const back = unzipSync(result.bytes);
  assert.deepEqual(Object.keys(back), Object.keys(parts), '파트 순서가 유지된다');
  for (const untouched of ['[Content_Types].xml', '_rels/.rels', 'docProps/app.xml', 'xl/media/image1.png']) {
    assert.equal(strFromU8(back[untouched]), parts[untouched], `${untouched} 는 바이트 그대로`);
  }

  const eye = strFromU8(back['xl/worksheets/sheet4.xml']);
  assert.equal(cellsOf(eye, 27).O.inner, '<is><t xml:space="preserve">A-15(2),21,30</t></is>');
  assert.equal(cellsOf(eye, 27).O.s, '7', '점검대상 칸 서식은 유지');

  const off = strFromU8(back['xl/worksheets/sheet2.xml']);
  assert.equal(cellsOf(off, 4).D.inner, '<is><t xml:space="preserve">SA3A-15</t></is>');
  assert.equal(cellsOf(off, 4).A.inner, `<v>${DATE}</v>`);

  const on = strFromU8(back['xl/worksheets/sheet1.xml']);
  assert.deepEqual(parseSheet(on).rows.map((candidate) => candidate.r), [1, 2, 3, 4, 5]);
  const added = cellsOf(on, 5);
  assert.equal(added.D.inner, '<is><t xml:space="preserve">SA3A-30</t></is>');
  assert.equal(added.I.inner, '<is><t xml:space="preserve">빨강 점등</t></is>');
  assert.equal(added.M.inner, '<is><t xml:space="preserve">○ 09/03</t></is>');

  const counts = strFromU8(back['xl/worksheets/sheet3.xml']);
  assert.match(counts, /<c r="C2"><f>[^<]*<\/f><v>2<\/v><\/c>/);
  assert.match(counts, /<c r="C5"><f>SUM\(C2:C3\)<\/f><v>3<\/v><\/c>/);
  assert.match(strFromU8(back['xl/workbook.xml']), /<calcPr fullCalcOnLoad="1" calcId="191029"\/>/);
  assert.match(strFromU8(back['xl/styles.xml']), /<cellXfs count="1[0-9]">/, '정렬 스타일이 추가된다');
  assert.equal(strFromU8(doc.entries['xl/workbook.xml']).includes('fullCalcOnLoad'), false, '원본 doc은 바뀌지 않는다');
});

test('날짜가 없으면 이동·추가를 거부한다', () => {
  const doc = openEyecheckWorkbook(zipParts(buildParts()), 'EyeCheck.xlsx');
  assert.throws(
    () => applyEyecheckChanges(doc, { selectedRows: [3], dateSerial: null }),
    /점검 날짜/,
  );
  assert.throws(
    () => applyEyecheckChanges(doc, { devices: [{ A: null, D: 'SA3A-1' }] }),
    /점검 날짜/,
  );
});

const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
/** 한셀처럼 모든 SpreadsheetML 요소에 x: 접두사를 붙인 형태로 바꾼다. */
const toPrefixed = (xml) => {
  const withNs = xml.includes(`xmlns="${MAIN_NS}"`)
    ? xml.replace(`xmlns="${MAIN_NS}"`, `xmlns:x="${MAIN_NS}"`)
    : xml.replace(/^(<\?xml[^>]*>)?<([A-Za-z]+)/, `$1<$2 xmlns:x="${MAIN_NS}"`);
  return withNs.replace(/<(\/?)(?!\?)([A-Za-z])/g, '<$1x:$2');
};

test('한셀처럼 접두사를 붙여 저장한 xlsx는 엑셀에서 다시 저장하라고 안내한다', () => {
  const parts = buildParts();
  parts['xl/workbook.xml'] = toPrefixed(parts['xl/workbook.xml']);
  assert.match(parts['xl/workbook.xml'], /<x:workbook /);
  assert.throws(
    () => openEyecheckWorkbook(zipParts(parts), 'Hancell.xlsx'),
    /엑셀에서 열어 다시 저장/,
  );
});

test('손대지 않은 층은 칸 표기가 정규 형태와 달라도 기록 대상이 아니다', () => {
  const floor = { ...floor3(), zoneText: 'A-15(1), 21/B-01-3' };
  floor.zones = floor.zones.map((zone, index) => ({ ...zone, text: index === 0 ? 'A-15(1), 21' : 'B-01-3' }));
  const untouched = calculateFloor(floor, { base: floor.zoneText, on: '', moveRows: null, selectedRows: [], lightType: '주황', picks: {}, addDevices: true });
  assert.equal(untouched.touched, false);
  assert.equal(untouched.dirty, false, '정규화 차이(A-15(1), 21 → A-15,21)만으로는 쓰지 않는다');

  const typed = calculateFloor(floor, { base: floor.zoneText, on: 'A-30', moveRows: null, selectedRows: [], lightType: '주황', picks: {}, addDevices: true });
  assert.equal(typed.touched, true);
  assert.equal(typed.dirty, true);

  const edited = calculateFloor(floor, { base: 'A-15,21/B-01-3', on: '', moveRows: null, selectedRows: [], lightType: '주황', picks: {}, addDevices: true });
  assert.equal(edited.touched, true, '기존 내역을 직접 고치면 건드린 것으로 본다');
});

test('저장 스냅샷은 기록한 층은 새 값, 나머지 층은 파일 값을 담는다', () => {
  const floors = [
    { floor: '3', zoneText: 'A-1' },
    { floor: '4', zoneText: 'B-2' },
    { floor: '5', zoneText: '' },
  ];
  assert.deepEqual(snapshotFloors(floors, [{ floor: '3', zoneText: 'A-1,2' }]), [
    { floor: '3', zoneText: 'A-1,2' },
    { floor: '4', zoneText: 'B-2' },
    { floor: '5', zoneText: '' },
  ]);
});
