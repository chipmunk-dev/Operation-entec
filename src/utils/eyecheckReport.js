const clean = (value) =>
  String(value ?? '')
    .replace(/\s+/gu, ' ')
    .trim();

// 행 번호는 소등/저장 시 바뀐다. 보고에 쓰는 장비 정보와 중복 개수로 비교한다.
const identity = (vals) =>
  JSON.stringify(['C', 'D', 'I', 'L'].map((col) => clean(vals[col])));

export function prepareReportDevices(devices, details = {}) {
  const counts = new Map();
  return devices.map((vals) => {
    const position = clean(vals.D);
    const occurrence = counts.get(position) ?? 0;
    counts.set(position, occurrence + 1);
    const key = JSON.stringify([position, occurrence]);
    return { key, vals: { ...vals, ...details[key] } };
  });
}

export function compareReportRows(original, current) {
  const pool = new Map();
  original.forEach((row) => {
    const key = identity(row.vals);
    if (!pool.has(key)) pool.set(key, []);
    pool.get(key).push(row);
  });
  const changes = [];
  const occurrences = new Map();
  current.forEach((row) => {
    const key = identity(row.vals);
    const matches = pool.get(key);
    if (matches?.length) matches.shift();
    else {
      const position = clean(row.vals.D);
      const n = occurrences.get(position) ?? 0;
      occurrences.set(position, n + 1);
      changes.push({
        ...row,
        kind: 'on',
        id: `on:${JSON.stringify([position, n])}`,
      });
    }
  });
  for (const [key, rows] of pool) {
    rows.forEach((row, n) =>
      changes.push({ ...row, kind: 'off', id: `off:${key}:${n}` })
    );
  }
  return changes;
}

export const reportMissingFields = (row) =>
  [
    ['C', '호스트명'],
    ['D', '위치'],
    ['I', '점등상태'],
    ['L', '서버 담당자'],
  ]
    .filter(([col]) => !clean(row.vals[col]))
    .map(([, label]) => label);

export function groupChangeReports(rows) {
  const groups = new Map();
  rows
    .filter((row) => reportMissingFields(row).length === 0)
    .forEach((row) => {
      const admin = clean(row.vals.L);
      if (!groups.has(admin)) groups.set(admin, { admin, rows: [] });
      groups.get(admin).rows.push(row);
    });
  return [...groups.values()];
}

export function formatChangeReport(rows, name, position) {
  if (
    !clean(name) ||
    !rows.length ||
    rows.some((row) => reportMissingFields(row).length)
  )
    return '';
  return `안녕하세요 상암상황실 ${clean(name)} ${clean(position)}입니다.\n서버실 장비 점등·소등 변경내역을 확인하여 보고드립니다.\n\n${rows
    .map(
      (row) =>
        `[${row.kind === 'off' ? '소등' : row.kind === 'existing' ? '기존 점등 재보고' : '신규 점등'}]\n위치: ${clean(row.vals.D)}\n서버: ${clean(row.vals.C)}\n상태: ${row.kind === 'off' ? `소등 (기존: ${clean(row.vals.I)})` : clean(row.vals.I)}`
    )
    .join('\n\n')}`;
}
