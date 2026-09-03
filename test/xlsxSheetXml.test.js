import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendRows,
  buildTextCell,
  cellText,
  colToIndex,
  extendAutoFilter,
  isoToSerial,
  lastDataRow,
  listDataRows,
  mergeAnchorOf,
  parseCells,
  parseDateStyles,
  parseMerges,
  parseSharedStrings,
  parseSheet,
  parseStyles,
  patchWorkbookForRecalc,
  rebuildSheet,
  renumberRow,
  resolveSheetPaths,
  serialToISO,
  serialToTime,
  setCachedValues,
  setCell,
  stripUndeclaredPrefixes,
  writeCells,
  xmlEscape,
  xmlUnescape,
} from '../src/utils/xlsxSheetXml.js';

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';

const sheet = (rowsXml, { dimension = 'A1:D9', tail = '' } = {}) =>
  `<?xml version="1.0"?><worksheet ${NS}><dimension ref="${dimension}"/><sheetData>${rowsXml}</sheetData>${tail}</worksheet>`;

const text = (ref, value, s = null) => buildTextCell(ref, s, value);
const num = (ref, value, s = null) =>
  `<c r="${ref}"${s === null ? '' : ` s="${s}"`}><v>${value}</v></c>`;
const row = (r, cells) => `<row r="${r}">${cells}</row>`;

test('열 글자를 번호로 바꾼다', () => {
  assert.equal(colToIndex('A'), 1);
  assert.equal(colToIndex('Z'), 26);
  assert.equal(colToIndex('AA'), 27);
  assert.equal(colToIndex('AZ'), 52);
});

test('ISO 날짜와 엑셀 시리얼을 서로 바꾼다', () => {
  assert.equal(isoToSerial('2026-09-03'), 46268);
  assert.equal(serialToISO(46268), '2026-09-03');
  assert.equal(serialToISO(46268.75), '2026-09-03');
  assert.equal(serialToTime(0.5), '12:00');
  assert.equal(serialToTime(0.999), '23:59');
  assert.throws(() => isoToSerial('2026/09/03'), /YYYY-MM-DD/);
});

test('XML 이스케이프를 왕복한다', () => {
  const source = 'A&B <c> "d" \'e\'';
  assert.equal(xmlUnescape(xmlEscape(source)), source);
  assert.equal(xmlUnescape('&#x2713; &#65; &amp;lt;'), '✓ A &lt;');
});

test('workbook.xml과 rels에서 시트 이름별 경로를 찾는다', () => {
  const workbook = `<workbook xmlns:r="r"><sheets><sheet name="점등장비" sheetId="1" r:id="rId1"/><sheet name="A&amp;B" sheetId="2" r:id="rId2"/><sheet name="없음" sheetId="3" r:id="rId9"/></sheets></workbook>`;
  const rels = `<Relationships><Relationship Id="rId1" Type="ws" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="ws" Target="/xl/worksheets/sheet2.xml"/></Relationships>`;

  assert.deepEqual(resolveSheetPaths(workbook, rels), {
    점등장비: 'xl/worksheets/sheet1.xml',
    'A&B': 'xl/worksheets/sheet2.xml',
  });
});

test('sharedStrings의 서식 런을 이어 붙이고 발음 표기는 버린다', () => {
  const xml = `<sst><si><t>plain</t></si><si><r><t>rich </t></r><r><t>text</t></r></si><si><t>漢字</t><rPh sb="0" eb="2"><t>かんじ</t></rPh></si><si/></sst>`;
  assert.deepEqual(parseSharedStrings(xml), ['plain', 'rich text', '漢字', '']);
  assert.deepEqual(parseSharedStrings(''), []);
});

test('날짜 서식인 스타일 인덱스를 찾는다', () => {
  const styles = `<styleSheet><numFmts><numFmt numFmtId="164" formatCode="yyyy&quot;년&quot; m&quot;월&quot;"/><numFmt numFmtId="165" formatCode="0.00"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>`;
  assert.deepEqual([...parseDateStyles(styles)], [1, 2]);
  assert.equal(parseDateStyles('').size, 0);
});

test('시트를 행·셀로 나누고 셀 값을 읽는다', () => {
  const xml = sheet(
    row(1, `<c r="A1" t="s"><v>0</v></c>${text('B1', '인라인')}${num('C1', 46268, 1)}<c r="D1"><v>3.5</v></c>`) +
      row(2, `<c r="A2" t="b"><v>1</v></c><c r="B2" t="str"><v>x&amp;y</v></c><c r="C2"/>`),
  );
  const parsed = parseSheet(xml);
  assert.deepEqual(parsed.rows.map((r) => r.r), [1, 2]);

  const first = parseCells(parsed.rows[0].xml);
  const dateStyles = new Set([1]);
  assert.equal(cellText(first[0], ['공유'], dateStyles), '공유');
  assert.equal(cellText(first[1], [], dateStyles), '인라인');
  assert.equal(cellText(first[2], [], dateStyles), '2026-09-03');
  assert.equal(cellText(first[3], [], dateStyles), '3.5');

  const second = parseCells(parsed.rows[1].xml);
  assert.equal(cellText(second[0], [], null), 'TRUE');
  assert.equal(cellText(second[1], [], null), 'x&y');
  assert.equal(second[2].inner, '');
});

test('sheetData가 자기 닫힘 태그여도 읽고 다시 조립한다', () => {
  const xml = `<worksheet ${NS}><dimension ref="A1"/><sheetData/><pageMargins/></worksheet>`;
  const parsed = parseSheet(xml);
  assert.deepEqual(parsed.rows, []);
  const rebuilt = rebuildSheet(parsed, [{ r: 3, xml: row(3, text('B3', 'x')) }]);
  assert.match(rebuilt, /<sheetData><row r="3">.*<\/row><\/sheetData><pageMargins\/>/);
  assert.match(rebuilt, /<dimension ref="A1:A3"\/>/);
});

test('값이 있는 데이터 행만 시작 행 이후로 모은다', () => {
  const xml = sheet(
    row(1, text('A1', '머리글')) +
      row(3, `${num('A3', 46268, 1)}${text('D3', 'SA3A-15')}`) +
      row(4, '<c r="A4" s="1"/>') +
      row(5, text('C5', 'HOST')),
  );
  const rows = listDataRows(xml, [], new Set([1]), 3);
  assert.deepEqual(rows, [
    { r: 3, vals: { A: '2026-09-03', D: 'SA3A-15' } },
    { r: 5, vals: { C: 'HOST' } },
  ]);
  assert.equal(lastDataRow(xml, 3), 5);
  assert.equal(lastDataRow(sheet(row(1, text('A1', 'h'))), 3), 2);
});

test('행 번호를 바꿔도 서식과 값은 그대로다', () => {
  const source = `<row r="7" spans="1:3" ht="20"><c r="A7" s="2"><v>1</v></c><c r="C7" t="inlineStr"><is><t>x</t></is></c></row>`;
  assert.equal(
    renumberRow(source, 4),
    `<row r="4" spans="1:3" ht="20"><c r="A4" s="2"><v>1</v></c><c r="C4" t="inlineStr"><is><t>x</t></is></c></row>`,
  );
});

test('셀을 교체하거나 열 순서에 맞춰 끼워 넣는다', () => {
  const base = row(3, `${num('A3', 1)}${num('D3', 4)}`);
  assert.equal(setCell(base, 'A', text('A3', '새')), row(3, `${text('A3', '새')}${num('D3', 4)}`));
  assert.equal(setCell(base, 'B', num('B3', 2)), row(3, `${num('A3', 1)}${num('B3', 2)}${num('D3', 4)}`));
  assert.equal(setCell(base, 'F', num('F3', 6)), row(3, `${num('A3', 1)}${num('D3', 4)}${num('F3', 6)}`));
  assert.equal(setCell('<row r="3"/>', 'B', num('B3', 2)), row(3, num('B3', 2)));
});

test('자동필터 범위는 늘리기만 하고 줄이지 않는다', () => {
  const xml = sheet('', { tail: '<autoFilter ref="A2:M10"/>' });
  assert.match(extendAutoFilter(xml, 15), /<autoFilter ref="A2:M15"\/>/);
  assert.match(extendAutoFilter(xml, 8), /<autoFilter ref="A2:M10"\/>/);
});

test('workbook.xml에 열 때 재계산 플래그를 켠다', () => {
  assert.equal(
    patchWorkbookForRecalc('<workbook><calcPr calcId="1" fullCalcOnLoad="0"/></workbook>'),
    '<workbook><calcPr fullCalcOnLoad="1" calcId="1"/></workbook>',
  );
  assert.equal(patchWorkbookForRecalc('<workbook/>'), '<workbook/>');
});

test('병합 범위 안 주소는 왼쪽 위 앵커로 바꾼다', () => {
  const merges = parseMerges('<mergeCells><mergeCell ref="O27:P28"/></mergeCells>');
  assert.deepEqual(merges, [{ col: 'O', row: 27, endCol: 'P', endRow: 28, ref: 'O27' }]);
  assert.equal(mergeAnchorOf('P28', merges), 'O27');
  assert.equal(mergeAnchorOf('o27', merges), 'O27');
  assert.equal(mergeAnchorOf('Q27', merges), 'Q27');
});

test('셀에 글을 쓰고, 비우면 서식만 남기고, 없는 행은 순서에 맞춰 만든다', () => {
  const xml = sheet(
    row(27, `${text('B27', '3A 구역')}${text('O27', '옛값', 5)}`) + row(30, text('B30', '3B 구역')),
    { tail: '<mergeCells count="1"><mergeCell ref="O27:P27"/></mergeCells>' },
  );
  const result = writeCells(xml, [
    { ref: 'P27', text: 'A-15(2),21' },
    { ref: 'O30', text: '' },
    { ref: 'O28', text: '중간' },
  ]);
  const rows = parseSheet(result).rows;
  assert.deepEqual(rows.map((r) => r.r), [27, 28, 30]);
  assert.match(rows[0].xml, /<c r="O27" s="5" t="inlineStr"><is><t xml:space="preserve">A-15\(2\),21<\/t><\/is><\/c>/);
  assert.match(rows[1].xml, /<c r="O28" t="inlineStr">/);
  assert.match(rows[2].xml, /<c r="O30"\/>/);
  assert.throws(() => writeCells(xml, [{ ref: '??', text: 'x' }]), /셀 주소/);
});

test('수식 셀의 계산 결과만 바꾸고 수식은 그대로 둔다', () => {
  const xml = sheet(
    row(2, `${text('B2', '3층')}<c r="C2"><f>COUNTIF(A:A,"*SA3*")</f><v>2</v></c>${num('D2', 9)}`),
  );
  const result = setCachedValues(xml, [
    { ref: 'C2', value: 5 },
    { ref: 'D2', value: 1 },
    { ref: 'Z9', value: 1 },
  ]);
  assert.match(result, /<c r="C2"><f>COUNTIF\(A:A,"\*SA3\*"\)<\/f><v>5<\/v><\/c>/);
  assert.match(result, /<c r="D2"><v>9<\/v><\/c>/);
});

test('목적지 시트에 선언되지 않은 접두사 속성을 지운다', () => {
  const rowXml = `<row r="3" x14ac:dyDescent="0.3" ht="15"><c r="A3" xr:uid="1"><v>1</v></c></row>`;
  const dest = `<worksheet ${NS} xmlns:xr="xr"><sheetData/></worksheet>`;
  assert.equal(
    stripUndeclaredPrefixes(rowXml, dest),
    `<row r="3" ht="15"><c r="A3" xr:uid="1"><v>1</v></c></row>`,
  );
});

test('마지막 데이터 행 아래에 서식을 이어받아 행을 추가한다', () => {
  const xml = sheet(
    row(2, text('A2', '머리글')) +
      row(3, `${num('A3', 46200, 1)}${text('D3', 'SA3A-1', 2)}${'<c r="M3" s="3"/>'}`) +
      row(4, `<c r="A4" s="1"/><c r="D4" s="2"/><c r="M4" s="3"/>`),
  );
  const result = appendRows(
    xml,
    [
      { A: 46268, D: 'SA3B-2', M: '○ 09/03' },
      { A: 46268, D: 'SA3C-3', I: '', M: null },
    ],
    { startRow: 3 },
  );
  assert.equal(result.firstRow, 4);
  assert.equal(result.lastRow, 5);
  const rows = parseSheet(result.xml).rows;
  assert.deepEqual(rows.map((r) => r.r), [2, 3, 4, 5]);
  assert.match(rows[2].xml, /<c r="A4" s="1"><v>46268<\/v><\/c>/);
  assert.match(rows[2].xml, /<c r="D4" s="2" t="inlineStr"><is><t xml:space="preserve">SA3B-2<\/t><\/is><\/c>/);
  assert.match(rows[3].xml, /<c r="A5" s="1"><v>46268<\/v><\/c>/);
  assert.match(rows[3].xml, /<c r="M5" s="3"\/>/);
  assert.match(result.xml, /<dimension ref="A1:D5"\/>/);
  assert.deepEqual(appendRows(xml, [], { startRow: 3 }), { xml, firstRow: 0, lastRow: 0, stylesXml: undefined });
});

test('정렬을 지정하면 styles.xml에 정렬만 바꾼 스타일을 만들어 쓴다', () => {
  const stylesXml = `<styleSheet><cellXfs count="2"><xf numFmtId="0" fontId="0"/><xf numFmtId="14" fontId="0" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf></cellXfs><cellStyles/></styleSheet>`;
  const xml = sheet(row(3, `${num('A3', 1, 1)}${text('C3', 'h', 0)}`));

  const result = appendRows(xml, [{ A: 46268, C: 'HOST' }], {
    startRow: 3,
    align: { A: 'center', C: 'left' },
    stylesXml,
  });

  const styles = parseStyles(result.stylesXml);
  assert.equal(styles.xfs.length, 4);
  assert.equal(
    styles.xfs[2],
    '<xf numFmtId="14" fontId="0" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>',
  );
  assert.equal(
    styles.xfs[3],
    '<xf numFmtId="0" fontId="0" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>',
  );
  assert.match(result.stylesXml, /<cellXfs count="4">/);
  assert.match(result.xml, /<c r="A4" s="2"><v>46268<\/v><\/c>/);
  assert.match(result.xml, /<c r="C4" s="3" t="inlineStr">/);

  const again = appendRows(result.xml, [{ A: 46269 }], {
    startRow: 3,
    align: { A: 'center' },
    stylesXml: result.stylesXml,
  });
  assert.equal(parseStyles(again.stylesXml).xfs.length, 4, '같은 정렬 스타일은 재사용한다');
});
