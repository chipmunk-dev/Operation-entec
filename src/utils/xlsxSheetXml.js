/**
 * xlsx 워크시트 XML을 문자열 수준에서 읽고 고치는 범용 헬퍼.
 *
 * xlsx 압축을 푼 XML 문자열만 다루므로 브라우저와 Node 어디서든 같은 결과를 낸다.
 * 문자열은 inlineStr로 쓰고 기존 셀은 XML 조각째 옮기므로 sharedStrings를 고칠 일이 없다.
 */

/* ------------------------------------------------------------------ */
/* 문자열 / 좌표 / 날짜                                                   */
/* ------------------------------------------------------------------ */

export const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const xmlUnescape = (value) =>
  String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&');

/** 열 글자를 1부터 시작하는 번호로. A → 1, Z → 26, AA → 27 */
export const colToIndex = (col) => {
  let index = 0;
  for (const ch of col) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index;
};

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30); // 1900 날짜 체계
const DAY_MS = 86400000;

export const dateToSerial = (year, month, day) =>
  Math.round((Date.UTC(year, month - 1, day) - EXCEL_EPOCH_UTC) / DAY_MS);

export const isoToSerial = (iso) => {
  const [year, month, day] = String(iso).split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
  }
  return dateToSerial(year, month, day);
};

const pad2 = (value) => String(value).padStart(2, '0');

export const serialToISO = (serial) => {
  const date = new Date(EXCEL_EPOCH_UTC + Math.floor(Number(serial)) * DAY_MS);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

/** 하루 안의 소수 시각(0.5 = 12:00)을 시:분으로. */
export const serialToTime = (serial) => {
  const total = Math.round(Number(serial) * 24 * 60);
  return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
};

/* ------------------------------------------------------------------ */
/* 워크북 메타: 시트 이름 → 파일 경로, sharedStrings, 날짜 서식              */
/* ------------------------------------------------------------------ */

/** workbook.xml + workbook.xml.rels → { '점등장비': 'xl/worksheets/sheet4.xml', ... } */
export const resolveSheetPaths = (workbookXml, relsXml) => {
  const rels = {};
  for (const match of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(match[0])?.[1];
    const target = /\bTarget="([^"]+)"/.exec(match[0])?.[1];
    if (id && target) rels[id] = target;
  }

  const paths = {};
  for (const match of workbookXml.matchAll(/<sheet\b[^>]*>/g)) {
    const name = /\bname="([^"]*)"/.exec(match[0])?.[1];
    const rid = /\br:id="([^"]+)"/.exec(match[0])?.[1];
    if (!name || !rid || !rels[rid]) continue;
    const target = rels[rid];
    paths[xmlUnescape(name)] = target.startsWith('/')
      ? target.slice(1)
      : `xl/${target}`;
  }
  return paths;
};

/** sharedStrings.xml → 문자열 배열 (서식 런은 이어 붙이고, 발음 표기 rPh는 버린다) */
export const parseSharedStrings = (xml) => {
  const strings = [];
  if (!xml) return strings;
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)) {
    const inner = (match[1] || '').replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
    let text = '';
    for (const run of inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) text += run[1];
    strings.push(xmlUnescape(text));
  }
  return strings;
};

const BUILTIN_DATE_FMT_IDS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58,
]);

const looksLikeDateFormat = (code) =>
  /[ymd]/i.test(
    code
      .replace(/"[^"]*"/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\\./g, ''),
  );

/** styles.xml → 날짜/시간 서식인 cellXfs 인덱스 집합 (표시용) */
export const parseDateStyles = (stylesXml) => {
  const dateStyles = new Set();
  if (!stylesXml) return dateStyles;

  const customFormats = {};
  for (const match of stylesXml.matchAll(/<numFmt\b[^>]*>/g)) {
    const id = /\bnumFmtId="(\d+)"/.exec(match[0])?.[1];
    const code = /\bformatCode="([^"]*)"/.exec(match[0])?.[1];
    if (id && code !== undefined) customFormats[Number(id)] = xmlUnescape(code);
  }

  const block = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1] || '';
  let index = 0;
  for (const match of block.matchAll(/<xf\b[^>]*>/g)) {
    const id = Number(/\bnumFmtId="(\d+)"/.exec(match[0])?.[1] ?? 0);
    const custom = customFormats[id];
    if (
      BUILTIN_DATE_FMT_IDS.has(id) ||
      (custom !== undefined && looksLikeDateFormat(custom))
    ) {
      dateStyles.add(index);
    }
    index += 1;
  }
  return dateStyles;
};

/* ------------------------------------------------------------------ */
/* 시트 XML 파싱                                                          */
/* ------------------------------------------------------------------ */

/** 시트 XML → { head, rows:[{r, xml}], tail } (head는 <sheetData>까지, tail은 </sheetData>부터) */
export const parseSheet = (xml) => {
  let head;
  let body;
  let tail;

  const selfClosing = /<sheetData\b[^>]*\/>/.exec(xml);
  if (selfClosing) {
    head = `${xml.slice(0, selfClosing.index)}<sheetData>`;
    body = '';
    tail = `</sheetData>${xml.slice(selfClosing.index + selfClosing[0].length)}`;
  } else {
    const open = /<sheetData\b[^>]*>/.exec(xml);
    const closeIndex = xml.indexOf('</sheetData>');
    if (!open || closeIndex < 0) {
      throw new Error('시트에서 sheetData를 찾을 수 없습니다.');
    }
    head = xml.slice(0, open.index + open[0].length);
    body = xml.slice(open.index + open[0].length, closeIndex);
    tail = xml.slice(closeIndex);
  }

  const rows = [];
  for (const match of body.matchAll(/<row\b[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g)) {
    rows.push({
      r: Number(/\br="(\d+)"/.exec(match[0])?.[1] ?? 0),
      xml: match[0],
    });
  }
  return { head, rows, tail };
};

/** 행 XML → 셀 목록 [{ xml, col, row, s, t, inner }] */
export const parseCells = (rowXml) => {
  const cells = [];
  const inner = rowXml
    .replace(/^<row\b[^>]*?(?:\/>|>)/, '')
    .replace(/<\/row>$/, '');
  for (const match of inner.matchAll(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)) {
    const tag = /^<c\b[^>]*?(?:\/>|>)/.exec(match[0])[0];
    const ref = /\br="([A-Z]+)(\d+)"/.exec(tag);
    cells.push({
      xml: match[0],
      col: ref?.[1] ?? '',
      row: Number(ref?.[2] ?? 0),
      s: /\bs="(\d+)"/.exec(tag)?.[1] ?? null,
      t: /\bt="([^"]+)"/.exec(tag)?.[1] ?? null,
      inner: match[0].endsWith('/>') ? '' : match[0].slice(tag.length, -4),
    });
  }
  return cells;
};

export const cellHasContent = (cell) => /<v\b|<is\b|<f\b/.test(cell.inner);

export const rowHasValue = (rowXml) => parseCells(rowXml).some(cellHasContent);

/** 셀 → 화면 표시용 문자열 */
export const cellText = (cell, sst, dateStyles) => {
  const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cell.inner)?.[1];
  switch (cell.t) {
    case 's':
      return sst[Number(value)] ?? '';
    case 'inlineStr': {
      const inlineXml = cell.inner.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
      let text = '';
      for (const run of inlineXml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
        text += run[1];
      }
      return xmlUnescape(text);
    }
    case 'str':
    case 'e':
      return value === undefined ? '' : xmlUnescape(value);
    case 'b':
      return value === '1' ? 'TRUE' : 'FALSE';
    case 'd':
      return value ?? '';
    default: {
      if (value === undefined) return '';
      if (cell.s !== null && dateStyles?.has(Number(cell.s))) {
        const number = Number(value);
        if (Number.isFinite(number)) {
          return number < 1 ? serialToTime(number) : serialToISO(number);
        }
      }
      return xmlUnescape(value);
    }
  }
};

/** 값이 있는 데이터 행 목록 → [{ r, vals: { A:'2026-09-01', C:'...', ... } }] */
export const listDataRows = (sheetXml, sst, dateStyles, startRow = 1) => {
  const rows = [];
  for (const row of parseSheet(sheetXml).rows) {
    if (row.r < startRow) continue;
    const cells = parseCells(row.xml).filter(cellHasContent);
    if (cells.length === 0) continue;
    const vals = {};
    for (const cell of cells) vals[cell.col] = cellText(cell, sst, dateStyles);
    rows.push({ r: row.r, vals });
  }
  return rows;
};

/** 값이 있는 마지막 행 번호 (없으면 startRow - 1) */
export const lastDataRow = (sheetXml, startRow = 1) => {
  let last = startRow - 1;
  for (const row of parseSheet(sheetXml).rows) {
    if (row.r >= startRow && rowHasValue(row.xml)) last = Math.max(last, row.r);
  }
  return last;
};

/* ------------------------------------------------------------------ */
/* 시트 XML 편집                                                          */
/* ------------------------------------------------------------------ */

/** 행 XML의 행 번호(row r, 각 셀의 r)를 newR로 바꾼다. 서식·값은 그대로. */
export const renumberRow = (rowXml, newR) =>
  rowXml
    .replace(/^(<row\b[^>]*?)\br="\d+"/, `$1r="${newR}"`)
    .replace(/(<c\b[^>]*?)\br="([A-Z]+)\d+"/g, `$1r="$2${newR}"`);

/** 행 XML에서 col 열 셀을 newCellXml로 교체. 없으면 열 순서에 맞춰 끼워 넣는다. */
export const setCell = (rowXml, col, newCellXml) => {
  const pattern = new RegExp(
    `<c\\b[^>]*?\\br="${col}\\d+"[^>]*?(?:\\/>|>[\\s\\S]*?<\\/c>)`,
  );
  if (pattern.test(rowXml)) return rowXml.replace(pattern, () => newCellXml);
  if (rowXml.endsWith('/>')) {
    return `${rowXml.slice(0, -2)}>${newCellXml}</row>`;
  }
  const index = colToIndex(col);
  const after = parseCells(rowXml).find((cell) => colToIndex(cell.col) > index);
  if (after) return rowXml.replace(after.xml, () => newCellXml + after.xml);
  return rowXml.replace(/<\/row>$/, () => `${newCellXml}</row>`);
};

const styleAttr = (s) => (s !== null && s !== undefined ? ` s="${s}"` : '');

export const buildNumberCell = (ref, s, number) =>
  `<c r="${ref}"${styleAttr(s)}><v>${number}</v></c>`;

export const buildTextCell = (ref, s, text) =>
  `<c r="${ref}"${styleAttr(s)} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;

export const buildEmptyCell = (ref, s) => `<c r="${ref}"${styleAttr(s)}/>`;

/** 목적지 시트 루트에 선언되지 않은 접두사(x14ac: 등) 속성을 행/셀 태그에서 제거 */
export const stripUndeclaredPrefixes = (rowXml, destSheetXml) => {
  const rootTag = /<worksheet\b[^>]*>/.exec(destSheetXml)?.[0] ?? '';
  return rowXml.replace(/<(row|c)\b([^>]*?)(\/?>)/g, (whole, tag, attrs, close) => {
    const cleaned = attrs.replace(
      /\s+([A-Za-z0-9_]+):[A-Za-z0-9_]+="[^"]*"/g,
      (attr, prefix) => (rootTag.includes(`xmlns:${prefix}=`) ? attr : ''),
    );
    return `<${tag}${cleaned}${close}`;
  });
};

/** 파싱한 시트를 행 목록으로 다시 조립하고 dimension 범위를 맞춘다. */
export const rebuildSheet = (parsed, rows) => {
  const xml = parsed.head + rows.map((row) => row.xml).join('') + parsed.tail;
  const maxRow = rows.reduce((max, row) => Math.max(max, row.r), 1);
  return xml.replace(
    /<dimension\b[^>]*\bref="([A-Z]+)\d*(?::([A-Z]+)\d+)?"[^>]*\/>/,
    (whole, startCol, endCol) =>
      `<dimension ref="${startCol}1:${endCol || startCol}${maxRow}"/>`,
  );
};

/** 자동필터 범위를 lastRow까지 늘린다(줄이지는 않는다). */
export const extendAutoFilter = (sheetXml, lastRow) =>
  sheetXml.replace(
    /(<autoFilter\b[^>]*\bref=")([A-Z]+\d+):([A-Z]+)(\d+)(")/,
    (whole, prefix, start, endCol, endRow, suffix) =>
      Number(endRow) >= lastRow
        ? whole
        : `${prefix}${start}:${endCol}${lastRow}${suffix}`,
  );

/** workbook.xml: 파일을 열 때 모든 수식을 다시 계산하도록 표시 */
export const patchWorkbookForRecalc = (workbookXml) => {
  if (!/<calcPr\b/.test(workbookXml)) return workbookXml;
  return workbookXml
    .replace(/(<calcPr\b[^>]*?)\s+fullCalcOnLoad="[^"]*"/, '$1')
    .replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"');
};

/* ------------------------------------------------------------------ */
/* 병합 셀                                                               */
/* ------------------------------------------------------------------ */

export const parseMerges = (sheetXml) => {
  const merges = [];
  for (const match of sheetXml.matchAll(
    /<mergeCell\b[^>]*\bref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g,
  )) {
    merges.push({
      col: match[1],
      row: Number(match[2]),
      endCol: match[3],
      endRow: Number(match[4]),
      ref: `${match[1]}${match[2]}`,
    });
  }
  return merges;
};

/**
 * 병합 범위 안의 주소를 왼쪽 위 앵커로 바꾼다.
 * 병합된 칸은 앵커에 쓴 값만 엑셀에 보이므로, 쓰기 전에 반드시 거쳐야 한다.
 */
export const mergeAnchorOf = (ref, merges) => {
  const match = /^([A-Z]+)(\d+)$/.exec(String(ref).trim().toUpperCase());
  if (!match) return String(ref).trim().toUpperCase();
  const col = colToIndex(match[1]);
  const row = Number(match[2]);
  const hit = merges.find(
    (merge) =>
      row >= merge.row &&
      row <= merge.endRow &&
      col >= colToIndex(merge.col) &&
      col <= colToIndex(merge.endCol),
  );
  return hit ? hit.ref : `${match[1]}${row}`;
};

/* ------------------------------------------------------------------ */
/* 셀 쓰기                                                               */
/* ------------------------------------------------------------------ */

const findOrInsertRow = (rows, r, createXml) => {
  let row = rows.find((candidate) => candidate.r === r);
  if (row) return row;
  row = { r, xml: createXml() };
  const position = rows.findIndex((candidate) => candidate.r > r);
  if (position >= 0) rows.splice(position, 0, row);
  else rows.push(row);
  return row;
};

/**
 * 수식 셀의 마지막 계산 결과(<v>)만 바꾼다. 수식은 그대로 둔다.
 * 저장 직후에도 파일 안이 서로 맞도록 하기 위한 것이고, 엑셀은 열 때 어차피 다시 계산한다.
 */
export const setCachedValues = (sheetXml, updates) => {
  const parsed = parseSheet(sheetXml);
  const { rows } = parsed;
  for (const { ref, value } of updates) {
    const match = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!match) continue;
    const row = rows.find((candidate) => candidate.r === Number(match[2]));
    if (!row) continue;
    const cell = parseCells(row.xml).find((candidate) => candidate.col === match[1]);
    if (!cell || !/<f\b/.test(cell.inner)) continue;
    const inner = /<v\b[^>]*>[\s\S]*?<\/v>/.test(cell.inner)
      ? cell.inner.replace(/<v\b[^>]*>[\s\S]*?<\/v>/, `<v>${value}</v>`)
      : `${cell.inner}<v>${value}</v>`;
    const tag = /^<c\b[^>]*?(?:\/>|>)/.exec(cell.xml)[0].replace(/\/>$/, '>');
    row.xml = setCell(row.xml, match[1], `${tag}${inner}</c>`);
  }
  return rebuildSheet(parsed, rows);
};

/**
 * 셀 여러 개에 문자열을 쓴다. text가 비어 있으면 값만 지우고 서식은 남긴다.
 * @param {Array<{ ref: string, text: string }>} writes
 */
export const writeCells = (sheetXml, writes) => {
  const parsed = parseSheet(sheetXml);
  const { rows } = parsed;
  const merges = parseMerges(sheetXml);

  for (const { ref: rawRef, text } of writes) {
    const ref = mergeAnchorOf(rawRef, merges);
    const match = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!match) throw new Error(`셀 주소가 올바르지 않습니다: ${rawRef}`);
    const col = match[1];
    const r = Number(match[2]);
    const row = findOrInsertRow(rows, r, () => `<row r="${r}"></row>`);
    const style = parseCells(row.xml).find((cell) => cell.col === col)?.s ?? null;
    const cell = text
      ? buildTextCell(ref, style, text)
      : buildEmptyCell(ref, style);
    row.xml = setCell(row.xml, col, cell);
  }

  return rebuildSheet(parsed, rows);
};

/* ------------------------------------------------------------------ */
/* 셀 정렬 (styles.xml의 cellXfs 다루기)                                   */
/* ------------------------------------------------------------------ */

/** styles.xml의 cellXfs를 통째로 파싱한다. 정렬을 바꾼 스타일을 새로 만들 때 쓴다. */
export const parseStyles = (stylesXml) => {
  const match = /(<cellXfs\b[^>]*>)([\s\S]*?)(<\/cellXfs>)/.exec(stylesXml);
  if (!match) throw new Error('styles.xml에서 cellXfs를 찾을 수 없습니다.');
  const xfs = match[2].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g) ?? [];
  return {
    open: match[1],
    xfs,
    before: stylesXml.slice(0, match.index),
    after: stylesXml.slice(match.index + match[0].length),
  };
};

/** 파싱한 스타일을 다시 styles.xml 문자열로 만든다. */
export const buildStyles = (styles) => {
  const open = styles.open
    .replace(/\scount="\d+"/, '')
    .replace(/^<cellXfs\b/, `<cellXfs count="${styles.xfs.length}"`);
  return `${styles.before}${open}${styles.xfs.join('')}</cellXfs>${styles.after}`;
};

/** xf 하나에 가로 정렬을 적용한 새 xf 문자열. 세로 정렬은 원래 값을 유지하고 없으면 center. */
export const xfWithAlignment = (xf, horizontal) => {
  const tag = /^<xf\b[^>]*?(?:\/>|>)/.exec(xf)[0];
  const inner = xf.endsWith('/>') ? '' : xf.slice(tag.length, -'</xf>'.length);
  const oldAlign = /<alignment\b[^>]*\/>/.exec(inner)?.[0] ?? '';
  const vertical = /\bvertical="([^"]*)"/.exec(oldAlign)?.[1] ?? 'center';
  const wrap = /\bwrapText="1"/.test(oldAlign) ? ' wrapText="1"' : '';
  const rest = inner.replace(/<alignment\b[^>]*\/>/, '');
  const attrs = tag
    .replace(/^<xf/, '')
    .replace(/\/?>$/, '')
    .replace(/\s+applyAlignment="[^"]*"/, '');
  return `<xf${attrs} applyAlignment="1"><alignment horizontal="${horizontal}" vertical="${vertical}"${wrap}/>${rest}</xf>`;
};

/**
 * 스타일 인덱스에 가로 정렬을 적용한 인덱스를 돌려준다.
 * 같은 xf가 이미 있으면 그 인덱스를 재사용하고, 없을 때만 새로 추가한다.
 */
export const styleWithAlignment = (styles, index, horizontal) => {
  const base = styles.xfs[index];
  if (base === undefined) return index;
  const next = xfWithAlignment(base, horizontal);
  if (next === base) return index;
  const found = styles.xfs.indexOf(next);
  if (found >= 0) return found;
  styles.xfs.push(next);
  return styles.xfs.length - 1;
};

/** 행 XML에서 한 셀의 스타일 인덱스(s)를 바꾼다. */
export const setCellStyle = (rowXml, col, styleIndex) => {
  const pattern = new RegExp(`(<c\\b[^>]*?\\br="${col}\\d+")([^>]*?)(/?>)`);
  return rowXml.replace(
    pattern,
    (whole, head, attrs, close) =>
      `${head}${attrs.replace(/\s+s="\d+"/g, '')} s="${styleIndex}"${close}`,
  );
};

/* ------------------------------------------------------------------ */
/* 행 추가                                                               */
/* ------------------------------------------------------------------ */

/** 행 XML에서 값을 모두 비우고 서식(r, s)만 남긴다. */
export const stripRowValues = (rowXml) =>
  rowXml.replace(/<c\b([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g, (whole, attrs) => {
    const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
    const style = /\bs="(\d+)"/.exec(attrs)?.[1];
    return `<c r="${ref}"${style !== undefined ? ` s="${style}"` : ''}/>`;
  });

/**
 * 값이 있는 마지막 행 아래에 행을 순서대로 추가한다.
 * 미리 서식이 잡힌 빈 행이 있으면 그 칸에 쓰고, 없으면 마지막 데이터 행의 서식을 복제해 이어 붙인다.
 * @param {Array<Object<string, string|number>>} rowsData 예: [{ A: 46268, D: 'SA3A-15' }]
 *   숫자는 숫자 셀(날짜 시리얼 포함), 문자열은 inlineStr로 쓴다.
 * @param {{ startRow?: number, align?: Object<string,string>, stylesXml?: string }} opts
 * @returns {{ xml: string, firstRow: number, lastRow: number, stylesXml?: string }}
 */
export const appendRows = (sheetXml, rowsData, opts = {}) => {
  const startRow = opts.startRow ?? 1;
  const parsed = parseSheet(sheetXml);
  const { rows } = parsed;
  if (!rowsData.length) {
    return { xml: sheetXml, firstRow: 0, lastRow: 0, stylesXml: opts.stylesXml };
  }
  // 정렬을 지정하면 styles.xml에 정렬만 바꾼 스타일을 만들어 새 행에 적용한다.
  const styles = opts.align && opts.stylesXml ? parseStyles(opts.stylesXml) : null;

  let last = startRow - 1;
  for (const row of rows) {
    if (row.r >= startRow && rowHasValue(row.xml)) last = Math.max(last, row.r);
  }

  const template =
    rows.find((row) => row.r === last) ?? rows[rows.length - 1] ?? null;
  const first = last + 1;

  rowsData.forEach((data, offset) => {
    const r = first + offset;
    const row = findOrInsertRow(rows, r, () =>
      template ? stripRowValues(renumberRow(template.xml, r)) : `<row r="${r}"></row>`,
    );
    if (styles) {
      for (const cell of parseCells(row.xml)) {
        const horizontal = opts.align[cell.col];
        if (!horizontal || cell.s === null) continue;
        const next = styleWithAlignment(styles, Number(cell.s), horizontal);
        if (next !== Number(cell.s)) row.xml = setCellStyle(row.xml, cell.col, next);
      }
    }
    const cells = parseCells(row.xml);
    for (const [col, value] of Object.entries(data)) {
      if (value === null || value === undefined || value === '') continue;
      const style = cells.find((cell) => cell.col === col)?.s ?? null;
      const cell =
        typeof value === 'number'
          ? buildNumberCell(`${col}${r}`, style, value)
          : buildTextCell(`${col}${r}`, style, String(value));
      row.xml = setCell(row.xml, col, cell);
    }
  });

  return {
    xml: rebuildSheet(parsed, rows),
    firstRow: first,
    lastRow: first + rowsData.length - 1,
    stylesXml: styles ? buildStyles(styles) : opts.stylesXml,
  };
};
