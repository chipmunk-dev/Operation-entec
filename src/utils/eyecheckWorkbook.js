/**
 * Eye Check 통합 문서(xlsx)를 읽고 점등내역·소등 처리를 반영하는 코어.
 *
 * 다루는 시트: 점등장비, 소등장비, 층별갯수, 전자_Eyecheck.
 * 건드리는 것: 위 네 시트의 XML, workbook.xml의 calcPr(열 때 재계산 플래그), 정렬 스타일이 필요할 때 styles.xml.
 * 건드리지 않는 것: 다른 시트, 도형, 메모, 외부링크, sharedStrings. 나머지 파트는 바이트 그대로 다시 압축한다.
 *
 * 왜 행을 delete/insert 하지 않고 "값이 든 행 XML을 번호만 바꿔서 위로 당기는가":
 *   층별갯수 시트와 전자_Eyecheck의 개수 수식이 점등장비!D3, D4, ... 처럼 행 번호를 고정으로 참조한다.
 *   행 번호를 다시 매겨 채워 넣으면 그 수식들이 그대로 새 내용을 읽으므로 손댈 필요가 없다.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import {
  buildLightLog,
  parseLightEdits,
  sectorText,
} from './lightLogFormatter.js';
import {
  appendRows,
  buildNumberCell,
  cellHasContent,
  cellText,
  colToIndex,
  extendAutoFilter,
  lastDataRow,
  listDataRows,
  mergeAnchorOf,
  parseCells,
  parseDateStyles,
  parseMerges,
  parseSharedStrings,
  parseSheet,
  patchWorkbookForRecalc,
  rebuildSheet,
  renumberRow,
  resolveSheetPaths,
  rowHasValue,
  setCachedValues,
  setCell,
  stripUndeclaredPrefixes,
  writeCells,
} from './xlsxSheetXml.js';

export const ON_SHEET = '점등장비';
export const OFF_SHEET = '소등장비';
export const COUNT_SHEET = '층별갯수';
export const EYE_SHEET = '전자_Eyecheck';
export const DATA_START_ROW = 3; // 1~2행은 병합 머리글
export const DATE_COL = 'A'; // Check Date
export const POSITION_COL = 'D'; // 위치 (SA3A-15)
export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** 점등장비 목록 화면에 보여주는 열 */
export const MOVE_COLUMNS = [
  ['A', 'Check Date'],
  ['B', '고객사'],
  ['C', 'Hostname'],
  ['D', '위치'],
  ['G', '장비'],
  ['I', '점등상태'],
  ['M', '내용'],
];
export const SEARCH_COLS = ['B', 'C', 'D', 'G', 'M'];
export const LIGHT_TYPES = ['주황', '빨강', '!', '디스크', '기타'];
/** 점등장비 시트에 새로 넣는 행의 정렬. Hostname·Vendor·구분·장비·점등상태·내용만 왼쪽, 나머지는 가운데. */
export const ON_ALIGN = {
  A: 'center',
  B: 'center',
  C: 'left',
  D: 'center',
  E: 'left',
  F: 'left',
  G: 'left',
  H: 'center',
  I: 'left',
  J: 'center',
  K: 'center',
  L: 'center',
  M: 'left',
};

const ZONE_LABEL = /^(\d+)\s*([A-Z]+)\s*구역$/;
const NOTE_HEADER = /점\s*검\s*내\s*역/;
const TARGET_HEADER = /^점\s*검\s*대\s*상$/;
const FLOOR_LABEL = /^(\d+)\s*층$/;
const TOTAL_LABEL = /^총\s*(합|계)$/;

/* ------------------------------------------------------------------ */
/* 위치·정렬·문구                                                         */
/* ------------------------------------------------------------------ */

/**
 * 점등장비 D열의 위치 문자열을 층·구역·번호로 나눈다.
 * "SA3A-15"와 "SA3-A-15" 두 표기를 모두 읽는다. 못 읽으면 null.
 */
export const parsePosition = (text) => {
  const match = /^SA(\d+)-?([A-Z]+)-(.+)$/i.exec(
    String(text ?? '')
      .replace(/\s+/g, '')
      .toUpperCase(),
  );
  return match ? { floor: match[1], group: match[2], num: match[3] } : null;
};

/** 위치 문자열 정규화 — 비교용 (공백 제거, 대문자). */
export const normalizePosition = (text) =>
  String(text ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();

/** 층·구역 글자·번호로 점등장비 위치 문자열을 만든다. 예: ('3', 'A', '15') → 'SA3A-15' */
export const positionOf = (floor, group, num) => `SA${floor}${group}-${num}`;

/** 층별 점등장비 개수. 엑셀의 COUNTIF("*SA3*")와 같은 기준으로 센다. */
export const countByFloor = (rows, floors, col = POSITION_COL) => {
  const counts = { total: 0 };
  for (const floor of floors) counts[floor] = 0;
  for (const row of rows) {
    const position = normalizePosition(row.vals[col]);
    if (!position) continue;
    counts.total += 1;
    for (const floor of floors) {
      if (position.includes(`SA${floor}`)) counts[floor] += 1;
    }
  }
  return counts;
};

/**
 * 점등·소등 입력 항목의 정렬 순서. 구역 글자 먼저, 그다음 번호를 자연 순서로 본다.
 * "36-1" < "36-2" < "38" 처럼 하이픈으로 이어진 번호도 마디별로 비교한다.
 */
export const compareEntries = (a, b) => {
  if (a.group !== b.group) return a.group < b.group ? -1 : 1;
  const left = String(a.num).split('-').map(Number);
  const right = String(b.num).split('-').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const x = left[i] ?? -1;
    const y = right[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
};

/** 내용 칸에 넣을 시작 문구. "○ 09/03"까지만 채우고 나머지는 사람이 적는다. */
export const contentText = (iso) => {
  const [, month, day] = String(iso).split('-');
  return month && day ? `○ ${month}/${day}` : '';
};

/** 점등상태 칸에 들어갈 문자열. 색·종류는 뒤에 "점등"을 붙이고, 기타는 적은 그대로 쓴다. */
export const lightValue = (type, other) =>
  type === '기타' ? String(other ?? '').trim() : `${type} 점등`;

const stripXlsx = (fileName) => String(fileName).replace(/\.xlsx$/i, '');

export const outputName = (fileName, iso) =>
  `${stripXlsx(fileName)}_${String(iso).replace(/-/g, '')}.xlsx`;

export const backupName = (fileName, iso) =>
  `${stripXlsx(fileName)}_백업_${String(iso).replace(/-/g, '')}.xlsx`;

/* ------------------------------------------------------------------ */
/* 전자_Eyecheck: 층 블록·구역 행 찾기                                      */
/* ------------------------------------------------------------------ */

/**
 * 전자_Eyecheck 시트에서 층 블록을 찾는다.
 * - 구역 행: B열의 "3A 구역" 같은 라벨
 * - 점검대상 칸: 머리글 행의 두 번째 "점검대상" 열 x 구역 행 (3층이면 O27, O30, ... O60)
 *   칸이 병합돼 있으면 왼쪽 위 앵커 주소를 쓴다. 값은 앵커에만 있기 때문이다.
 * "점 검 내 역" 머리글은 층 블록의 시작을 찾는 데만 쓰고, 그 칸은 읽지도 쓰지도 않는다.
 * @returns {{ floors: Array<{ floor, targetCol, zoneText, zones: Array<{ label, letter, row, ref, text }> }> }}
 */
export const scanEyecheck = (sheetXml, sst, dateStyles) => {
  const { rows } = parseSheet(sheetXml);
  const merges = parseMerges(sheetXml);
  const headers = [];
  const zones = [];
  const textAt = {};

  for (const row of rows) {
    let header = null;
    for (const cell of parseCells(row.xml)) {
      if (!cellHasContent(cell)) continue;
      const text = cellText(cell, sst, dateStyles);
      const trimmed = text.trim();
      textAt[`${cell.col}${row.r}`] = text;
      const zone = ZONE_LABEL.exec(trimmed.toUpperCase());
      if (zone) {
        zones.push({ floor: zone[1], letter: zone[2], row: row.r, labelCol: cell.col });
      } else if (NOTE_HEADER.test(trimmed)) {
        header = header || { row: row.r, noteCol: null, targetCols: [] };
        header.noteCol = cell.col;
      } else if (TARGET_HEADER.test(trimmed)) {
        header = header || { row: row.r, noteCol: null, targetCols: [] };
        header.targetCols.push(cell.col);
      }
    }
    if (header && header.noteCol) headers.push(header);
  }

  const byFloor = new Map();
  for (const zone of zones) {
    if (!byFloor.has(zone.floor)) byFloor.set(zone.floor, []);
    byFloor.get(zone.floor).push(zone);
  }

  const floors = [];
  for (const [floor, list] of byFloor) {
    list.sort((a, b) => a.row - b.row);
    const first = list[0];
    const header = headers.filter((candidate) => candidate.row < first.row).pop();
    if (!header) continue;
    const targetCol =
      header.targetCols.find((col) => col !== first.labelCol) ?? null;
    const zoneList = list.map((zone) => {
      const ref = targetCol ? mergeAnchorOf(`${targetCol}${zone.row}`, merges) : null;
      return {
        label: `${zone.floor}${zone.letter}`,
        letter: zone.letter,
        row: zone.row,
        ref,
        text: ref ? (textAt[ref] ?? '') : '',
      };
    });
    floors.push({
      floor,
      targetCol,
      zones: zoneList,
      // 구역별 칸을 한 줄로 이어 붙인 것. 점등내역 편집의 기존 내역이 된다.
      zoneText: zoneList
        .map((zone) => zone.text.trim())
        .filter(Boolean)
        .join('/'),
    });
  }
  floors.sort((a, b) => Number(a.floor) - Number(b.floor));
  return { floors };
};

/**
 * 층별갯수 시트에서 층별·총합 개수 칸을 찾는다.
 * "3층"/"총합" 같은 라벨 바로 오른쪽 칸이 개수다. 값은 수식의 마지막 계산 결과를 읽는다.
 * @returns {{ [floor: string]: { ref, value }, total?: { ref, value } }}
 */
export const scanFloorCounts = (sheetXml, sst) => {
  const found = {};
  for (const row of parseSheet(sheetXml).rows) {
    const cells = parseCells(row.xml);
    cells.forEach((cell, index) => {
      const label = cellText(cell, sst ?? [], null).trim();
      const next = cells[index + 1];
      if (!next || colToIndex(next.col) !== colToIndex(cell.col) + 1) return;
      const value = Number(/<v\b[^>]*>([\s\S]*?)<\/v>/.exec(next.inner)?.[1]);
      if (!Number.isFinite(value)) return;
      const floor = FLOOR_LABEL.exec(label);
      if (floor) found[floor[1]] = { ref: `${next.col}${row.r}`, value };
      else if (TOTAL_LABEL.test(label)) {
        found.total = { ref: `${next.col}${row.r}`, value };
      }
    });
  }
  return found;
};

/* ------------------------------------------------------------------ */
/* 점등장비 → 소등장비                                                     */
/* ------------------------------------------------------------------ */

const lastValueRow = (rows) => {
  let last = DATA_START_ROW - 1;
  for (const row of rows) {
    if (row.r >= DATA_START_ROW && rowHasValue(row.xml)) last = Math.max(last, row.r);
  }
  return last;
};

/**
 * @param {object} p
 * @param {string}   p.onXml         점등장비 시트 XML
 * @param {string}   p.offXml        소등장비 시트 XML
 * @param {number[]} p.selectedRows  점등장비에서 뺄 행 번호(엑셀 행 번호)
 * @param {number}   p.dateSerial    소등장비 A열에 넣을 날짜(엑셀 시리얼)
 * @returns {{ onXml, offXml, movedRows:number[], targetRows:number[], onRemaining:number, offLastRow:number }}
 */
export const moveRows = ({ onXml, offXml, selectedRows, dateSerial }) => {
  const selected = new Set((selectedRows || []).map(Number));
  const on = parseSheet(onXml);
  const off = parseSheet(offXml);

  const moved = on.rows.filter(
    (row) => selected.has(row.r) && row.r >= DATA_START_ROW && rowHasValue(row.xml),
  );
  if (moved.length === 0) {
    throw new Error('이동할 행이 없습니다. 값이 있는 행을 골라 주세요.');
  }
  const movedSet = new Set(moved.map((row) => row.r));

  // 1) 점등장비: 고른 행을 빼고, 그 아래 행은 번호를 다시 매겨 위로 당긴다.
  const kept = [];
  let removedAbove = 0;
  for (const row of on.rows) {
    if (movedSet.has(row.r)) {
      removedAbove += 1;
      continue;
    }
    kept.push(
      removedAbove === 0
        ? row
        : { r: row.r - removedAbove, xml: renumberRow(row.xml, row.r - removedAbove) },
    );
  }
  const newOnXml = rebuildSheet(on, kept);
  const onRemaining = kept.filter(
    (row) => row.r >= DATA_START_ROW && rowHasValue(row.xml),
  ).length;

  // 2) 소등장비: 값이 있는 마지막 행 다음부터 순서대로 붙인다.
  //    행 XML을 통째로 가져가므로 셀 서식은 점등장비 쪽 것을 따라간다(잘라내기-붙여넣기와 같음).
  //    A열(Check Date)만 소등 날짜로 바꾼다. 나머지 열은 그대로.
  const offRows = off.rows.slice();
  const last = lastValueRow(offRows);
  const targetRows = [];

  moved.forEach((source, index) => {
    const newR = last + 1 + index;
    let xml = stripUndeclaredPrefixes(renumberRow(source.xml, newR), offXml);
    const existing = offRows.find((row) => row.r === newR);
    const sourceStyle =
      parseCells(xml).find((cell) => cell.col === DATE_COL)?.s ?? null;
    const destStyle = existing
      ? (parseCells(existing.xml).find((cell) => cell.col === DATE_COL)?.s ?? null)
      : null;
    xml = setCell(
      xml,
      DATE_COL,
      buildNumberCell(`${DATE_COL}${newR}`, sourceStyle ?? destStyle, dateSerial),
    );
    if (existing) {
      offRows[offRows.indexOf(existing)] = { r: newR, xml };
    } else {
      const position = offRows.findIndex((row) => row.r > newR);
      if (position >= 0) offRows.splice(position, 0, { r: newR, xml });
      else offRows.push({ r: newR, xml });
    }
    targetRows.push(newR);
  });

  const offLastRow = last + moved.length;
  const newOffXml = extendAutoFilter(rebuildSheet(off, offRows), offLastRow);

  return {
    onXml: newOnXml,
    offXml: newOffXml,
    movedRows: moved.map((row) => row.r),
    targetRows,
    onRemaining,
    offLastRow,
  };
};

/* ------------------------------------------------------------------ */
/* 층별 계산                                                             */
/* ------------------------------------------------------------------ */

/** 점등장비 목록에서 고른 행 중 이 층의 것을 소등 입력 형식으로 만든다. 예: "A-15,C-07" */
export const offTextOf = (rows, selectedRows, floor) => {
  const selected = new Set([...(selectedRows ?? [])].map(Number));
  return rows
    .filter((row) => selected.has(row.r))
    .map((row) => parsePosition(row.vals[POSITION_COL]))
    .filter((position) => position && position.floor === floor)
    .map((position) => `${position.group}-${position.num}`)
    .join(',');
};

/**
 * 한 층의 계산 결과. 구역별 칸에는 머리말이 없으므로 붙이지 않는다.
 * 소등은 입력칸 대신 점등장비 목록에서 고른 행에서 뽑는다.
 *
 * @param {object} floor        scanEyecheck가 돌려준 층 하나
 * @param {object} input
 * @param {string}  input.base          기존 내역 (점검대상 칸을 이어 붙인 것)
 * @param {string}  input.on            점등 입력
 * @param {Array|null} input.moveRows   점등장비 목록 (없으면 null)
 * @param {Iterable<number>} input.selectedRows  소등으로 고른 행 번호
 * @param {number|null} input.dateSerial
 * @param {string}  input.content       내용 칸 시작 문구
 * @param {string}  input.shift, input.finder
 * @param {string}  input.lightType, input.lightOther  점등상태 기본값
 * @param {Object}  input.picks         자리별 점등상태 { key: { t, o } }
 * @param {boolean} input.addDevices    점등 입력을 점등장비 시트에 행으로 추가할지
 */
export const calculateFloor = (floor, input) => {
  const off = input.moveRows
    ? offTextOf(input.moveRows, input.selectedRows, floor.floor)
    : '';
  const baseText = String(input.base ?? '').trim();
  const on = String(input.on ?? '');
  // 점검대상 칸이 비어 있는 새 시트에서도 점등·소등을 반영해야 하므로 빈 기존 내역을 허용한다.
  const log =
    baseText || on.trim() || off
      ? buildLightLog(baseText, on, off, { allowEmptyBase: true })
      : null;
  const output = log ? log.output : String(input.base ?? '');

  const zones = floor.zones.map((zone) => {
    const sector = log?.sectors.find((candidate) => candidate.group === zone.letter);
    return { ...zone, next: sector ? sectorText(sector) : '' };
  });
  const unmatched = log
    ? log.sectors
        .filter(
          (sector) =>
            sectorText(sector) &&
            !floor.zones.some((zone) => zone.letter === sector.group),
        )
        .map((sector) => sector.group)
    : [];
  // 사용자가 이 층을 건드렸을 때(기존 내역 수정, 점등 입력, 소등 선택)만 기록 대상으로 본다.
  // 손대지 않은 층은 칸의 표기가 정규 형태와 달라도 그대로 둔다.
  const touched =
    baseText !== String(floor.zoneText ?? '').trim() || on.trim() !== '' || off !== '';
  const dirty =
    touched &&
    zones.some((zone) => (zone.text ?? '').trim() !== (zone.next ?? '').trim());

  // 점등 입력 → 점등장비 시트에 추가할 행 (개수만큼 반복).
  // 넣은 순서가 아니라 구역 글자 > 번호 순으로 정렬해 시트에 넣는다.
  const onList = parseLightEdits(on).list.slice().sort(compareEntries);
  // 점등 입력의 항목마다 점등상태를 따로 고를 수 있다. 안 고른 항목은 기본값을 따른다.
  const seen = new Map();
  const items = onList.map((entry) => {
    const base = `${floor.floor}|${entry.group}-${entry.num}`;
    const ordinal = seen.get(base) ?? 0;
    seen.set(base, ordinal + 1);
    const key = `${base}|${ordinal}`;
    const pick = input.picks?.[key];
    const type = pick?.t ?? input.lightType;
    const other = pick ? (pick.o ?? '') : (input.lightOther ?? '');
    return {
      key,
      pos: positionOf(floor.floor, entry.group, entry.num),
      count: entry.count,
      type,
      other,
      own: Boolean(pick),
    };
  });
  const devices = input.moveRows
    ? items.flatMap((item) =>
        Array.from({ length: item.count }, () => ({
          A: input.dateSerial,
          D: item.pos,
          I: lightValue(item.type, item.other),
          J: input.shift ?? '',
          K: input.finder ?? '',
          M: input.content ?? '',
        })),
      )
    : [];

  // 저장하고 나면 이 층의 점등장비 시트에 몇 건이 남는지. 점검대상 칸 총계와 맞아야 한다.
  let deviceCount = null;
  if (input.moveRows) {
    const selected = new Set([...(input.selectedRows ?? [])].map(Number));
    const inFloor = (row) => parsePosition(row.vals[POSITION_COL])?.floor === floor.floor;
    const current = input.moveRows.filter(inFloor).length;
    const goingOff = input.moveRows.filter(
      (row) => selected.has(row.r) && inFloor(row),
    ).length;
    deviceCount = current - goingOff + (input.addDevices ? devices.length : 0);
  }

  return { log, output, off, touched, dirty, zones, unmatched, items, devices, deviceCount };
};

/**
 * 저장 직후 파일의 층별 점검대상 내용. 기록한 층은 새 값, 나머지 층은 파일에 있던 값 그대로.
 * 다음에 파일을 열 때 "지난 저장과 같은가"를 층마다 정확히 비교하기 위한 스냅샷이다.
 */
export const snapshotFloors = (floors, saved) =>
  floors.map((floor) => ({
    floor: floor.floor,
    zoneText:
      saved.find((item) => item.floor === floor.floor)?.zoneText ?? floor.zoneText,
  }));

/**
 * 저장할 작업 목록.
 * @param {object} doc
 * @param {Array<{ floor, calc }>} calcs
 */
export const collectPendingWork = (doc, calcs, selectedCount, addDevices) => {
  const floors = calcs
    .filter(({ floor, calc }) => calc.dirty && floor.targetCol)
    .map(({ floor }) => floor);
  const devices =
    doc.move && addDevices ? calcs.flatMap(({ calc }) => calc.devices) : [];
  return { floors, moveCount: doc.move ? selectedCount : 0, devices };
};

/** 지금 연 파일의 층별 점등장비 개수. 엑셀 머리말의 COUNTIF와 같은 기준. */
export const floorCounts = (doc) =>
  doc.move && doc.eye
    ? countByFloor(doc.move.rows, doc.eye.floors.map((floor) => floor.floor))
    : null;

/**
 * 연 파일에 이상이 없는지 두 가지를 본다.
 *  1) 파일 안이 서로 맞는가 — 층별갯수 시트의 개수와 점등장비 시트의 실제 개수, 점검대상 칸의 자리 수
 *  2) 지난번 저장한 내용과 같은가 — 점검대상 칸과 층별 개수
 * 파일 이름은 보지 않는다. 백업본처럼 이름이 달라도 옛날 내용이면 잡아야 하기 때문이다.
 * @returns {{ diffs: string[], stale: boolean, headline: string, advice: string } | null}
 */
export const checkWorkbookConsistency = (doc, lastSaved) => {
  if (!doc.eye) return null;
  const now = floorCounts(doc);
  const diffs = [];
  let stale = false;

  const sheet = doc.counts?.cells;
  if (now && sheet) {
    for (const floor of doc.eye.floors) {
      const cell = sheet[floor.floor];
      if (cell && cell.value !== now[floor.floor]) {
        diffs.push(
          `${COUNT_SHEET} ${floor.floor}층 (${cell.ref}: ${cell.value} → 점등장비 실제 ${now[floor.floor]})`,
        );
      }
    }
    if (sheet.total && sheet.total.value !== now.total) {
      diffs.push(
        `${COUNT_SHEET} 총합 (${sheet.total.ref}: ${sheet.total.value} → 점등장비 실제 ${now.total})`,
      );
    }
  }

  if (now) {
    for (const floor of doc.eye.floors) {
      if (!floor.zoneText.trim()) continue;
      const total = buildLightLog(floor.zoneText, '', '')?.total;
      if (total !== undefined && total !== now[floor.floor]) {
        diffs.push(`${floor.floor}층 점검대상 칸 ${total}개 ↔ 점등장비 ${now[floor.floor]}건`);
      }
    }
  }

  if (lastSaved) {
    for (const floor of doc.eye.floors) {
      const saved = lastSaved.floors?.[floor.floor];
      if (saved !== undefined && saved !== floor.zoneText) {
        diffs.push(`${floor.floor}층 점검대상 칸`);
        stale = true;
      }
    }
    if (now && lastSaved.counts) {
      for (const floor of doc.eye.floors) {
        const saved = lastSaved.counts[floor.floor];
        if (saved !== undefined && saved !== now[floor.floor]) {
          diffs.push(
            `${floor.floor}층 점등장비 개수 (저장 ${saved} → 파일 ${now[floor.floor]})`,
          );
          stale = true;
        }
      }
      if (
        lastSaved.counts.total !== undefined &&
        lastSaved.counts.total !== now.total
      ) {
        diffs.push(`점등장비 총 개수 (저장 ${lastSaved.counts.total} → 파일 ${now.total})`);
        stale = true;
      }
    }
  }

  if (!diffs.length) return null;
  return {
    diffs,
    stale,
    headline: stale
      ? `${lastSaved.at}에 저장한 내용과 다릅니다.`
      : '이 파일 안의 개수가 서로 맞지 않습니다.',
    advice: stale
      ? '백업본이나 덮어쓰기 전 파일을 연 것은 아닌지, 이 파일이 최신인지 확인해 주세요.'
      : '엑셀에서 한 번 열어 다시 계산되게 하거나, 이 파일이 최신인지 확인해 주세요.',
  };
};

/* ------------------------------------------------------------------ */
/* 파일 열기 / 저장 (fflate)                                               */
/* ------------------------------------------------------------------ */

// 한셀처럼 요소에 접두사를 붙여 저장한 파일도 읽을 수 있게, 파트를 읽을 때 표준 형태로 맞춘다.
const readPart = (entries, path) =>
  path && entries[path] ? strFromU8(entries[path]) : null;

/**
 * xlsx 바이트를 풀어 작업에 필요한 시트를 읽는다.
 * @param {Uint8Array|ArrayBuffer} bytes
 * @param {string} fileName
 */
export const openEyecheckWorkbook = (bytes, fileName) => {
  if (!/\.xlsx$/i.test(fileName)) {
    throw new Error('xlsx 파일만 열 수 있습니다. (xls, xlsm은 지원하지 않음)');
  }
  let entries;
  try {
    entries = unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  } catch {
    throw new Error('압축을 풀 수 없습니다. 올바른 xlsx 파일인지 확인해 주세요.');
  }

  const workbookXml = readPart(entries, 'xl/workbook.xml');
  const relsXml = readPart(entries, 'xl/_rels/workbook.xml.rels');
  if (!workbookXml || !relsXml) {
    throw new Error('엑셀 통합 문서 구조를 찾을 수 없습니다.');
  }
  // 한셀 등 일부 프로그램은 모든 태그에 접두사(x:)를 붙여 저장한다. 이 도구는 엑셀이 저장한 형식만 지원한다.
  if (/<[A-Za-z_][A-Za-z0-9_.-]*:workbook[ >]/.test(workbookXml)) {
    throw new Error(
      '엑셀에서 저장한 xlsx만 열 수 있습니다. 한셀 등 다른 프로그램으로 저장한 파일은 엑셀에서 열어 다시 저장한 뒤 시도하세요.',
    );
  }
  const paths = resolveSheetPaths(workbookXml, relsXml);
  const sst = parseSharedStrings(readPart(entries, 'xl/sharedStrings.xml') ?? '');
  const stylesXml = readPart(entries, 'xl/styles.xml') ?? '';
  const dateStyles = parseDateStyles(stylesXml);

  const doc = {
    fileName,
    entries,
    paths,
    workbookXml,
    sst,
    stylesXml,
    dateStyles,
    move: null,
    counts: null,
    eye: null,
  };

  const onXml = readPart(entries, paths[ON_SHEET]);
  const offXml = readPart(entries, paths[OFF_SHEET]);
  if (onXml && offXml) {
    doc.move = {
      onXml,
      offXml,
      rows: listDataRows(onXml, sst, dateStyles, DATA_START_ROW),
      offLast: lastDataRow(offXml, DATA_START_ROW),
    };
  }
  const countXml = readPart(entries, paths[COUNT_SHEET]);
  if (countXml) doc.counts = { xml: countXml, cells: scanFloorCounts(countXml, sst) };

  const eyeXml = readPart(entries, paths[EYE_SHEET]);
  if (eyeXml) {
    const scan = scanEyecheck(eyeXml, sst, dateStyles);
    if (scan.floors.length) doc.eye = { xml: eyeXml, floors: scan.floors };
  }

  if (!doc.move && !doc.eye) {
    throw new Error(
      `'${ON_SHEET}'·'${OFF_SHEET}' 시트나 '${EYE_SHEET}' 시트를 찾지 못했습니다. (현재: ${Object.keys(paths).join(', ')})`,
    );
  }
  return doc;
};

/**
 * 변경 사항을 시트 XML에 반영하고 새 xlsx 바이트를 만든다. doc은 바꾸지 않는다.
 * @param {object} doc          openEyecheckWorkbook 결과
 * @param {object} changes
 * @param {Array}  changes.floors        기록할 층 (collectPendingWork의 floors)
 * @param {Object} changes.calcByFloor   { [floor]: calculateFloor 결과 }
 * @param {number[]} changes.selectedRows  소등장비로 옮길 점등장비 행 번호
 * @param {number|null} changes.dateSerial
 * @param {Array}  changes.devices       점등장비 시트에 추가할 행
 * @returns {{ bytes: Uint8Array, done: string[], saved: Array<{ floor, zoneText }>, finalCounts: object|null }}
 */
export const applyEyecheckChanges = (
  doc,
  { floors = [], calcByFloor = {}, selectedRows = [], dateSerial = null, devices = [] },
) => {
  const entries = { ...doc.entries };
  const put = (path, xml) => {
    entries[path] = strToU8(xml);
  };
  const done = [];
  let saved = [];
  let finalCounts = null;

  if (floors.length) {
    const writes = [];
    for (const floor of floors) {
      for (const zone of calcByFloor[floor.floor].zones) {
        writes.push({ ref: zone.ref, text: zone.next });
      }
    }
    put(doc.paths[EYE_SHEET], writeCells(doc.eye.xml, writes));
    saved = floors.map((floor) => ({
      floor: floor.floor,
      zoneText: calcByFloor[floor.floor].zones
        .map((zone) => zone.next.trim())
        .filter(Boolean)
        .join('/'),
    }));
    done.push(`점등내역 ${floors.map((floor) => `${floor.floor}층`).join('·')} 기록`);
  }

  const moveCount = doc.move ? selectedRows.length : 0;
  if (moveCount || devices.length) {
    let onXml = doc.move.onXml;
    if (moveCount) {
      if (dateSerial === null) throw new Error('점검 날짜가 올바르지 않습니다.');
      const result = moveRows({
        onXml,
        offXml: doc.move.offXml,
        selectedRows,
        dateSerial,
      });
      onXml = result.onXml;
      put(doc.paths[OFF_SHEET], result.offXml);
      const targets = result.targetRows;
      done.push(
        `${result.movedRows.length}건 이동 (${ON_SHEET} ${result.onRemaining}건 남음, ${OFF_SHEET} ${targets[0]}~${targets[targets.length - 1]}행)`,
      );
    }
    if (devices.length) {
      if (devices.some((device) => device.A === null || device.A === undefined)) {
        throw new Error('점검 날짜가 올바르지 않습니다.');
      }
      const added = appendRows(onXml, devices, {
        startRow: DATA_START_ROW,
        align: ON_ALIGN,
        stylesXml: doc.stylesXml,
      });
      onXml = added.xml;
      if (added.stylesXml && added.stylesXml !== doc.stylesXml) {
        put('xl/styles.xml', added.stylesXml);
      }
      done.push(`${ON_SHEET} ${added.firstRow}~${added.lastRow}행에 ${devices.length}행 추가`);
    }
    put(doc.paths[ON_SHEET], onXml);
    finalCounts = countByFloor(
      listDataRows(onXml, doc.sst, doc.dateStyles, DATA_START_ROW),
      doc.eye?.floors.map((floor) => floor.floor) ?? [],
    );
    if (doc.counts) {
      // 층별갯수 시트의 수식 결과도 새 개수로 맞춰 둔다. 수식은 그대로 두고 값만 바꾼다.
      const updates = [];
      for (const [key, cell] of Object.entries(doc.counts.cells)) {
        const value = key === 'total' ? finalCounts.total : finalCounts[key];
        if (value !== undefined) updates.push({ ref: cell.ref, value });
      }
      if (updates.length) {
        put(doc.paths[COUNT_SHEET], setCachedValues(doc.counts.xml, updates));
      }
    }
  }

  put('xl/workbook.xml', patchWorkbookForRecalc(doc.workbookXml));
  return { bytes: zipSync(entries, { level: 6 }), done, saved, finalCounts };
};
