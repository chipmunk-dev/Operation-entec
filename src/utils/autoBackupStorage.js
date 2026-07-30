const STORAGE_KEY = 'operation-entec:auto-backup-report:v1';
const SCHEMA_VERSION = 1;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ZONE_LENGTH = 1_000_000;
const MAX_STORAGE_SIZE = 4 * 1024 * 1024;

export const DEFAULT_COLUMN_POSITIONS = {
  status: 1,
  policyName: 6,
  startTime: 7,
};

const isValidColumn = (value) =>
  Number.isInteger(value) && value >= 1 && value <= 40;

export const createDefaultBackupState = (zones) => ({
  inputs: Object.fromEntries(zones.map((zone) => [zone, ''])),
  columnPositions: { ...DEFAULT_COLUMN_POSITIONS },
  activeZone: zones[0],
});

export const sanitizeBackupState = (candidate, zones) => {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('저장 데이터가 올바른 객체 형식이 아닙니다.');
  }

  const source = candidate.data && typeof candidate.data === 'object'
    ? candidate.data
    : candidate;
  const defaults = createDefaultBackupState(zones);
  const inputs = {};

  for (const zone of zones) {
    const value = source.inputs?.[zone];
    if (value === undefined) {
      inputs[zone] = '';
    } else if (typeof value !== 'string') {
      throw new Error(`${zone} 입력 데이터가 문자열 형식이 아닙니다.`);
    } else if (value.length > MAX_ZONE_LENGTH) {
      throw new Error(`${zone} 입력 데이터가 허용 크기를 초과했습니다.`);
    } else {
      inputs[zone] = value;
    }
  }

  const positions = source.columnPositions;
  if (
    !positions ||
    !isValidColumn(positions.status) ||
    !isValidColumn(positions.policyName) ||
    !isValidColumn(positions.startTime)
  ) {
    throw new Error('열 위치 설정이 올바르지 않습니다.');
  }
  if (new Set([
    positions.status,
    positions.policyName,
    positions.startTime,
  ]).size !== 3) {
    throw new Error('각 필드는 서로 다른 열을 사용해야 합니다.');
  }

  return {
    inputs,
    columnPositions: {
      status: positions.status,
      policyName: positions.policyName,
      startTime: positions.startTime,
    },
    activeZone: zones.includes(source.activeZone)
      ? source.activeZone
      : defaults.activeZone,
  };
};

export const loadBackupDraft = (zones) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: createDefaultBackupState(zones), restoredAt: null };
    if (raw.length > MAX_STORAGE_SIZE) {
      localStorage.removeItem(STORAGE_KEY);
      throw new Error('저장 데이터가 허용 크기를 초과해 삭제되었습니다.');
    }

    const parsed = JSON.parse(raw);
    if (parsed.version !== SCHEMA_VERSION || typeof parsed.savedAt !== 'string') {
      localStorage.removeItem(STORAGE_KEY);
      throw new Error('지원하지 않는 이전 저장 형식이어서 초기화되었습니다.');
    }

    const savedAt = new Date(parsed.savedAt);
    if (Number.isNaN(savedAt.getTime())) {
      localStorage.removeItem(STORAGE_KEY);
      throw new Error('저장 시각이 올바르지 않아 초기화되었습니다.');
    }
    if (Date.now() - savedAt.getTime() > RETENTION_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return {
        state: createDefaultBackupState(zones),
        restoredAt: null,
        notice: '7일이 지난 임시 저장 데이터는 자동으로 삭제되었습니다.',
      };
    }

    return {
      state: sanitizeBackupState(parsed, zones),
      restoredAt: parsed.savedAt,
    };
  } catch (error) {
    return {
      state: createDefaultBackupState(zones),
      restoredAt: null,
      notice:
        error instanceof Error
          ? error.message
          : '저장 데이터를 복원하지 못해 초기화했습니다.',
    };
  }
};

export const saveBackupDraft = (state) => {
  const payload = {
    kind: 'operation-entec-auto-backup-report',
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + RETENTION_MS).toISOString(),
    data: state,
  };
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_STORAGE_SIZE) {
    throw new Error('입력 데이터가 너무 커서 브라우저에 저장할 수 없습니다.');
  }
  localStorage.setItem(STORAGE_KEY, serialized);
  return payload.savedAt;
};

export const clearBackupDraft = () => {
  localStorage.removeItem(STORAGE_KEY);
};
