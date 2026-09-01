export const BACKUP_NOTEPAD_DIVIDER = '-------------';

const toText = (value) => String(value ?? '').trim();

const formatZone = (zone, rows) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (safeRows.length === 0) return `[${zone}]\n에러 없음`;

  const policies = safeRows.map((row) => toText(row?.policyName)).join('\n');
  const startTimes = safeRows.map((row) => toText(row?.startTime)).join('\n');
  const statuses = safeRows
    .map((row) => `Err: ${toText(row?.errorCode)}`)
    .join('\n');

  return `[${zone}]
${policies}
${BACKUP_NOTEPAD_DIVIDER}
${startTimes}
${BACKUP_NOTEPAD_DIVIDER}
${statuses}`;
};

export const formatBackupNotepad = (summaries, zones) =>
  (Array.isArray(zones) ? zones : [])
    .map((zone) => formatZone(zone, summaries?.[zone]?.errors))
    .join('\n\n');

export const createBackupNotepadFileName = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    throw new Error('메모장 파일의 생성 시각이 올바르지 않습니다.');
  }

  const pad = (number) => String(number).padStart(2, '0');
  const day = [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join('');
  const time = `${pad(value.getHours())}${pad(value.getMinutes())}`;

  return `자동백업_오류내역_${day}_${time}.txt`;
};
