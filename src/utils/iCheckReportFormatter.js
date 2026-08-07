export const ICHECK_COLUMN_COUNT = 16;

export const ICHECK_COLUMNS = [
  { key: 'checkedAt', label: '확인일' },
  { key: 'customer', label: '고객사' },
  { key: 'host', label: '호스트명(서버명)' },
  { key: 'location', label: '장비 위치' },
  { key: 'manufacturer', label: '제조사' },
  { key: 'type', label: '유형' },
  { key: 'model', label: '장비 모델명' },
  { key: 'etcValue', label: '기타값' },
  { key: 'status', label: '이상 상태' },
  { key: 'workerTeam', label: '확인 근무자 조' },
  { key: 'workerName', label: '확인 근무자 이름' },
  { key: 'serverAdmin', label: '서버 담당자(어드민)' },
  { key: 'unprocessed', label: '미처리' },
  { key: 'maintaining', label: '유지중' },
  { key: 'lightOff', label: '소등' },
  { key: 'history', label: '내역' },
];

const REQUIRED_REPORT_FIELDS = [
  { key: 'location', label: '장비 위치' },
  { key: 'host', label: '호스트명' },
  { key: 'status', label: '이상 상태' },
  { key: 'serverAdmin', label: '서버 담당자' },
];

const normalizeLineBreaks = (value) =>
  String(value || '').replace(/\r\n?/gu, '\n');

const normalizeCell = (value) =>
  normalizeLineBreaks(value)
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

const normalizeSingleLineCell = (value) =>
  normalizeCell(value).replace(/\s+/gu, ' ');

const parseTsvRecords = (rawInput) => {
  const source = normalizeLineBreaks(rawInput).replace(/^\uFEFF/u, '');
  const records = [];
  let fields = [];
  let field = '';
  let isQuoted = false;
  let lineNumber = 1;
  let recordLineNumber = 1;

  const pushRecord = () => {
    fields.push(field);
    if (fields.some((value) => value.trim())) {
      records.push({ fields, lineNumber: recordLineNumber });
    }
    fields = [];
    field = '';
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === '"') {
      if (isQuoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (isQuoted || field.length === 0) {
        isQuoted = !isQuoted;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '\t' && !isQuoted) {
      fields.push(field);
      field = '';
      continue;
    }

    if (character === '\n') {
      lineNumber += 1;
      if (isQuoted) {
        field += '\n';
      } else {
        pushRecord();
        recordLineNumber = lineNumber;
      }
      continue;
    }

    field += character;
  }

  if (field || fields.length > 0) {
    pushRecord();
  }

  return records;
};

const isHeaderRecord = (fields) => {
  const normalized = fields.map(normalizeSingleLineCell);
  return (
    normalized[0] === '확인일' &&
    normalized.some((value) => /호스트명|서버명/u.test(value)) &&
    normalized.some((value) => /서버 담당자|어드민/u.test(value))
  );
};

const createRow = ({ fields, lineNumber }, id) => {
  const normalizedFields = fields.map((value, index) =>
    index === ICHECK_COLUMNS.length - 1
      ? normalizeCell(value)
      : normalizeSingleLineCell(value),
  );
  const data = Object.fromEntries(
    ICHECK_COLUMNS.map(({ key }, index) => [key, normalizedFields[index] || '']),
  );
  const missingFields = REQUIRED_REPORT_FIELDS.filter(
    ({ key }) => !data[key],
  ).map(({ label }) => label);

  return {
    id,
    lineNumber,
    columnCount: fields.length,
    fields: normalizedFields,
    ...data,
    missingFields,
    isComplete:
      fields.length === ICHECK_COLUMN_COUNT && missingFields.length === 0,
  };
};

export const parseICheckReportRows = (rawInput) => {
  const records = parseTsvRecords(rawInput);
  const seenRows = new Set();
  const rows = [];
  let duplicateCount = 0;
  let headerCount = 0;

  records.forEach((record, recordIndex) => {
    if (isHeaderRecord(record.fields)) {
      headerCount += 1;
      return;
    }

    const row = createRow(record, recordIndex);
    const duplicateKey = JSON.stringify(row.fields);

    if (seenRows.has(duplicateKey)) {
      duplicateCount += 1;
      return;
    }

    seenRows.add(duplicateKey);
    rows.push(row);
  });

  return {
    rows,
    duplicateCount,
    headerCount,
  };
};

export const groupICheckReportsByAdmin = (rows) => {
  const groups = new Map();

  (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.isComplete)
    .forEach((row) => {
      const serverAdmin = normalizeSingleLineCell(row.serverAdmin);
      const existingGroup = groups.get(serverAdmin);

      if (existingGroup) {
        existingGroup.rows.push(row);
      } else {
        groups.set(serverAdmin, {
          serverAdmin,
          rows: [row],
        });
      }
    });

  return [...groups.values()];
};

export const formatICheckReport = (
  rows,
  { name = '', position = '사원' } = {},
) => {
  const reportRows = (Array.isArray(rows) ? rows : []).filter(
    (row) => row?.isComplete,
  );

  if (reportRows.length === 0) return '';

  const reporterName = normalizeSingleLineCell(name) || '(이름)';
  const reporterPosition = normalizeSingleLineCell(position) || '(직급)';
  const equipmentBlocks = reportRows
    .map(
      (row) => `위치: ${row.location}
서버: ${row.host}
상태: ${row.status}`,
    )
    .join('\n\n');

  return `안녕하세요 상암상황실 ${reporterName} ${reporterPosition}입니다.
서버실 장비 이상/점등건을 확인하여 보고드립니다.

${equipmentBlocks}`;
};
