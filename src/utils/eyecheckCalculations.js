/** 층별 점등·소등 계산. 파일과 셀 열 형식은 문서 어댑터에서 다룬다. */
import {
  buildLightLog,
  parseLightEdits,
  sectorText,
} from './lightLogFormatter.js';

/**
 * 장비 위치 문자열을 층·구역·번호로 나눈다.
 * "SA3A-15"와 "SA3-A-15" 두 표기를 모두 읽는다. 못 읽으면 null.
 */
export const parsePosition = (text) => {
  const match = /^SA(\d+)-?([A-Z]+)-(.+)$/i.exec(
    String(text ?? '')
      .replace(/\s+/g, '')
      .toUpperCase()
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

/** 점등장비 목록에서 고른 행 중 이 층의 것을 소등 입력 형식으로 만든다. 예: "A-15,C-07" */
export const offTextOf = (rows, selectedRows, floor) => {
  const selected = new Set([...(selectedRows ?? [])].map(Number));
  return rows
    .filter((row) => selected.has(row.r))
    .map((row) => parsePosition(row.position))
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
 * @param {Array<{r:number, position:string}>|null} input.moveRows 위치를 읽은 점등장비 목록
 * @param {Iterable<number>} input.selectedRows  소등으로 고른 행 번호
 * @param {number|null} input.dateSerial
 * @param {string}  input.content       내용 칸 시작 문구
 * @param {string}  input.shift, input.finder
 * @param {string}  input.lightType, input.lightOther  점등상태 기본값
 * @param {Object}  input.picks         자리별 점등상태 { key: { t, o } }
 * @param {boolean} input.addDevices    점등 입력을 점등장비 시트에 행으로 추가할지
 */
export const calculateFloorState = (floor, input) => {
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
    const sector = log?.sectors.find(
      (candidate) => candidate.group === zone.letter
    );
    return { ...zone, next: sector ? sectorText(sector) : '' };
  });
  const unmatched = log
    ? log.sectors
        .filter(
          (sector) =>
            sectorText(sector) &&
            !floor.zones.some((zone) => zone.letter === sector.group)
        )
        .map((sector) => sector.group)
    : [];
  // 사용자가 이 층을 건드렸을 때(기존 내역 수정, 점등 입력, 소등 선택)만 기록 대상으로 본다.
  // 손대지 않은 층은 칸의 표기가 정규 형태와 달라도 그대로 둔다.
  const touched =
    baseText !== String(floor.zoneText ?? '').trim() ||
    on.trim() !== '' ||
    off !== '';
  const dirty =
    touched &&
    zones.some((zone) => (zone.text ?? '').trim() !== (zone.next ?? '').trim());

  // 점등 입력 → 추가할 장비 데이터 (개수만큼 반복).
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
          dateSerial: input.dateSerial,
          position: item.pos,
          lightType: item.type,
          lightOther: item.other,
          shift: input.shift ?? '',
          finder: input.finder ?? '',
          content: input.content ?? '',
        }))
      )
    : [];

  // 저장하고 나면 이 층의 점등장비 시트에 몇 건이 남는지. 점검대상 칸 총계와 맞아야 한다.
  let deviceCount = null;
  if (input.moveRows) {
    const selected = new Set([...(input.selectedRows ?? [])].map(Number));
    const inFloor = (row) => parsePosition(row.position)?.floor === floor.floor;
    const current = input.moveRows.filter(inFloor).length;
    const goingOff = input.moveRows.filter(
      (row) => selected.has(row.r) && inFloor(row)
    ).length;
    deviceCount = current - goingOff + (input.addDevices ? devices.length : 0);
  }

  return {
    log,
    output,
    off,
    touched,
    dirty,
    zones,
    unmatched,
    items,
    devices,
    deviceCount,
  };
};
