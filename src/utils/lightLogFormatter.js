const NUM_IN_PAREN = /([(（]\s*)(\d+)(\s*(?:ea|개)?\s*[)）])/i;
const SECTOR_SPLIT = /[/／]/;
const TOKEN_SPLIT = /[,，;\s\t]+/;
const EDIT_SPLIT = /[,，;\n\r\t]+/;
const ONLY_PAREN = /^[(（](\d+)[)）]$/;
const TRAILING_PAREN = /^(.*?)[(（](\d+)[)）]$/;
const TRAILING_DOT = /[.。]+$/;
const STARTS_WITH_LETTER = /^[A-Za-z가-힣]/;
const BARE_NUMBER = /^[0-9]+(-[0-9]+)*$/;
const BARE_LABEL_COUNT = /(\d+)(\s*(?:ea|개))/i;

/**
 * 엑셀 셀을 통째로 복사하면 줄바꿈이 있는 셀은 전체가 큰따옴표("...")로
 * 감싸지고 내부 따옴표는 두 번("")으로 들어온다. 이 래핑을 풀어 원래
 * 내용으로 되돌린다. 짝이 맞지 않는 따옴표는 데이터로 보고 건드리지 않는다.
 */
function normalizeExcelPaste(raw) {
  const text = String(raw ?? '').replace(/\r\n?/g, '\n');
  const trimmed = text.trim();

  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const inner = trimmed.slice(1, -1);
    if (!inner.replace(/""/g, '').includes('"')) {
      return inner.replace(/""/g, '"');
    }
  }
  return text;
}

/**
 * 머리말과 데이터를 나눈다.
 * "08/19 09:00 점등(95ea) : A-15(3)" 처럼 앞에 시각이 있어도 되도록
 * 첫 콜론이 아니라 개수 표기("(95ea)" 또는 괄호 없는 "95ea", "95개") 뒤의
 * 콜론을 기준으로 자른다.
 */
export function splitLabel(line) {
  const paren = line.match(NUM_IN_PAREN) ?? line.match(BARE_LABEL_COUNT);
  const from = paren ? paren.index + paren[0].length : 0;
  const offset = line.slice(from).search(/[:：]/);

  if (offset > -1) {
    const index = from + offset;
    if (line.slice(index + 1).trim()) {
      const rest = line.slice(index);
      const [, gap, data] = rest.match(/^([:：]\s*)([\s\S]*)$/);
      return { label: line.slice(0, index), gap, data };
    }
  }
  return { label: null, gap: '', data: line };
}

/** 번호 자연 정렬. "36-1" < "36-2" < "38" */
function compareNumbers(a, b) {
  const left = a.split('-').map(Number);
  const right = b.split('-').map(Number);

  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const x = left[i] ?? -1;
    const y = right[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}

/**
 * 한 구역을 항목 단위로 읽는다.
 * - "(3)" 은 그 자리 점등 개수. 개수는 1 이상만 유효하다
 * - "B-01-3" 은 범위가 아니라 번호 하나
 * - 콤마 뒤 맨숫자는 앞의 접두사를 이어받는다
 * - "A-" 처럼 번호가 없거나 숫자가 아니면 반영하지 않고 남긴다
 */
function parseSector(text) {
  const items = [];
  const unread = [];
  let group = null;
  let last = null;

  text.split(TOKEN_SPLIT).forEach((token) => {
    if (!token) return;

    const standalone = token.match(ONLY_PAREN);
    if (standalone) {
      const count = Number(standalone[1]);
      if (!last || count < 1) unread.push(token);
      else last.count = count;
      return;
    }

    const withParen = token.match(TRAILING_PAREN);
    const count = withParen ? Number(withParen[2]) : 1;
    const body = (withParen ? withParen[1] : token).replace(TRAILING_DOT, '').trim();

    if (!body || count < 1) {
      unread.push(token);
      return;
    }

    if (STARTS_WITH_LETTER.test(body)) {
      const cut = body.indexOf('-');
      const num = cut > -1 ? body.slice(cut + 1) : '';

      if (!BARE_NUMBER.test(num)) {
        unread.push(token);
        return;
      }

      group = body.slice(0, cut).toUpperCase();
      last = { num, count };
    } else if (BARE_NUMBER.test(body)) {
      if (!group) {
        unread.push(token);
        return;
      }
      last = { num: body, count };
    } else {
      unread.push(token);
      return;
    }

    items.push(last);
  });

  return { group, items, unread };
}

/**
 * 붙여넣은 기존 내역을 읽는다.
 * 엑셀 셀 복사로 생긴 따옴표 래핑을 먼저 풀고, 줄 구조와 줄 끝 "/" 를
 * 그대로 기억해 나중에 원문 모양으로 되돌릴 수 있게 한다.
 */
function parseBase(raw) {
  const source = normalizeExcelPaste(raw)
    .split('\n')
    .filter((line) => line.trim());

  if (!source.length) return null;

  const head = splitLabel(source[0]);
  const unread = [];

  const lines = source.map((line, index) => {
    const body = index === 0 ? head.data : line;
    const sectors = [];

    body.split(SECTOR_SPLIT).forEach((chunk) => {
      if (!chunk.trim()) return;
      const sector = parseSector(chunk);
      sector.unread.forEach((token) => unread.push(token));
      if (sector.group) sectors.push({ group: sector.group, items: sector.items });
    });

    return { sectors, trailing: /[/／]\s*$/.test(body) };
  });

  return { label: head.label, gap: head.gap, lines, unread };
}

/**
 * 점등·소등 입력을 읽는다.
 * 기존 내역과 같은 규칙으로, 콤마·줄바꿈 뒤 맨숫자는 앞에 나온 구역 글자를
 * 이어받는다 ("A-1,2,3" → A-1, A-2, A-3). 슬래시(/)는 이어받기를 끊는다.
 * 앞에 구역 글자가 없는 맨숫자, 번호 없는 조각("A-"), 개수 0은 반영하지 않는다.
 */
export function parseLightEdits(raw) {
  const list = [];
  const unread = [];

  normalizeExcelPaste(raw)
    .split(SECTOR_SPLIT)
    .forEach((chunk) => {
      let group = null;

      chunk.split(EDIT_SPLIT).forEach((token) => {
        const text = token.trim();
        if (!text) return;

        const withParen = text.match(TRAILING_PAREN);
        const count = withParen ? Number(withParen[2]) : 1;
        const body = (withParen ? withParen[1] : text).trim();

        if (!body || count < 1) {
          unread.push(text);
          return;
        }

        if (STARTS_WITH_LETTER.test(body)) {
          const cut = body.indexOf('-');
          const num = cut > -1 ? body.slice(cut + 1) : '';

          if (!BARE_NUMBER.test(num)) {
            unread.push(text);
            return;
          }

          group = body.slice(0, cut).toUpperCase();
          list.push({ group, num, count });
        } else if (BARE_NUMBER.test(body)) {
          if (!group) {
            unread.push(text);
            return;
          }
          list.push({ group, num: body, count });
        } else {
          unread.push(text);
        }
      });
    });

  return { list, unread };
}

function findSector(base, group) {
  for (const line of base.lines) {
    const hit = line.sectors.find((sector) => sector.group === group);
    if (hit) return hit;
  }
  return null;
}

/**
 * 새 구역을 알파벳 순서에 맞는 자리에 만든다.
 * 기존 구역들의 순서는 건드리지 않고, 처음으로 순서가 뒤인 구역 앞에 끼워 넣는다.
 * 들어갈 자리가 없으면(가장 뒤 순서면) 마지막 줄 끝에 붙인다.
 */
function insertSector(base, group) {
  const sector = { group, items: [] };

  for (const line of base.lines) {
    for (let i = 0; i < line.sectors.length; i += 1) {
      if (line.sectors[i].group > group) {
        line.sectors.splice(i, 0, sector);
        return sector;
      }
    }
  }

  base.lines[base.lines.length - 1].sectors.push(sector);
  return sector;
}

/**
 * 점등·소등을 반영한다.
 * 이미 있는 자리는 개수만 오르내리고, 0 이하가 되면 목록에서 빠진다.
 * 없던 구역이면 알파벳 순서에 맞는 자리에 새로 만든다.
 */
function applyEdits(base, ons, offs) {
  const missing = [];

  ons.forEach(({ group, num, count }) => {
    let sector = findSector(base, group);

    if (!sector) sector = insertSector(base, group);

    const hit = sector.items.find((item) => item.num === num);
    if (hit) {
      hit.count += count;
      hit.mark = 'changed';
      return;
    }

    sector.items.push({ num, count, mark: 'added' });
    sector.items.sort((a, b) => compareNumbers(a.num, b.num));
  });

  offs.forEach(({ group, num, count }) => {
    const sector = findSector(base, group);
    const hit = sector?.items.find((item) => item.num === num);

    if (!hit) {
      missing.push(`${group}-${num}`);
      return;
    }

    hit.count -= count;
    if (hit.count <= 0) {
      hit.removed = true;
      hit.mark = 'removed';
    } else {
      hit.mark = 'changed';
    }
  });

  return { missing };
}

function countTotal(base) {
  return base.lines.reduce(
    (sum, line) =>
      sum +
      line.sectors.reduce(
        (inner, sector) =>
          inner + sector.items.reduce((n, item) => n + (item.removed ? 0 : item.count), 0),
        0,
      ),
    0,
  );
}

/** 한 구역을 원래 표기법으로 되돌린다. 첫 항목만 구역 글자를 달고 나머지는 번호만 쓴다. */
function sectorText(sector) {
  const live = sector.items.filter((item) => !item.removed);
  if (!live.length) return '';

  return live
    .map((item, index) => {
      const head = index === 0 ? `${sector.group}${item.num ? `-${item.num}` : ''}` : item.num;
      return head + (item.count > 1 ? `(${item.count})` : '');
    })
    .join(',');
}

/** 원문 줄 구조를 유지한 채 다시 한 줄 형태로 만든다. */
function rebuild(base) {
  const total = countTotal(base);

  return base.lines
    .map((line, index) => {
      const body =
        line.sectors.map(sectorText).filter(Boolean).join('/') + (line.trailing ? '/' : '');

      if (index === 0 && base.label !== null) {
        let label = base.label;
        if (NUM_IN_PAREN.test(label)) {
          label = label.replace(
            NUM_IN_PAREN,
            (match, open, digits, close) => `${open}${total}${close}`,
          );
        } else if (BARE_LABEL_COUNT.test(label)) {
          label = label.replace(BARE_LABEL_COUNT, (match, digits, unit) => `${total}${unit}`);
        }
        return label + base.gap + body;
      }
      return body;
    })
    .join('\n');
}

/**
 * 기존 내역에 점등·소등을 반영한 결과 한 벌.
 * 화면에서 필요한 값을 모두 담아 돌려준다.
 */
export function buildLightLog(rawBase, rawOn, rawOff) {
  const base = parseBase(rawBase);
  if (!base) return null;

  const before = countTotal(base);
  const on = parseLightEdits(rawOn);
  const off = parseLightEdits(rawOff);
  const { missing } = applyEdits(base, on.list, off.list);

  return {
    sectors: base.lines.flatMap((line) => line.sectors),
    output: rebuild(base),
    total: countTotal(base),
    before,
    missing,
    unread: [...base.unread, ...on.unread, ...off.unread],
    hasHead:
      base.label !== null &&
      (NUM_IN_PAREN.test(base.label) || BARE_LABEL_COUNT.test(base.label)),
  };
}

