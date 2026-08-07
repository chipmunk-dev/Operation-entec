export const GEMS_REPORTER_STORAGE_KEY =
  'operation-entec:gems-reporter-name:v1';
export const GEMS_REPORTER_RETENTION_MS = 12 * 60 * 60 * 1000;

const STORAGE_VERSION = 1;
const MAX_NAME_LENGTH = 50;

const getBrowserStorage = () => {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const removeStoredName = (storage) => {
  try {
    storage?.removeItem(GEMS_REPORTER_STORAGE_KEY);
  } catch {
    // 저장소 접근이 제한된 환경에서는 메모리 상태만 유지합니다.
  }
};

export const loadGemsReporterName = (
  storage = getBrowserStorage(),
  now = Date.now(),
) => {
  try {
    const raw = storage?.getItem(GEMS_REPORTER_STORAGE_KEY);
    if (!raw) return '';

    const payload = JSON.parse(raw);
    const isValidPayload =
      payload?.version === STORAGE_VERSION &&
      typeof payload.name === 'string' &&
      payload.name.length > 0 &&
      payload.name.length <= MAX_NAME_LENGTH &&
      Number.isFinite(payload.expiresAt);

    if (!isValidPayload || now >= payload.expiresAt) {
      removeStoredName(storage);
      return '';
    }

    return payload.name;
  } catch {
    removeStoredName(storage);
    return '';
  }
};

export const saveGemsReporterName = (
  value,
  storage = getBrowserStorage(),
  now = Date.now(),
) => {
  const name = String(value || '').trim();

  if (!name) {
    removeStoredName(storage);
    return null;
  }

  if (!storage || name.length > MAX_NAME_LENGTH) return null;

  const payload = {
    version: STORAGE_VERSION,
    name,
    savedAt: now,
    expiresAt: now + GEMS_REPORTER_RETENTION_MS,
  };

  try {
    storage.setItem(GEMS_REPORTER_STORAGE_KEY, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
};
