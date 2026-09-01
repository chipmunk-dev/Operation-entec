export const LIGHT_LOG_STORAGE_KEY = 'operation-entec:light-log:v1';
export const LIGHT_LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** 점검 대상 층. 탭 순서와 저장 구조의 기준이 된다. */
export const FLOOR_KEYS = ['3', '4', '5'];

const FLOOR_FIELDS = ['base', 'on', 'off'];

const getBrowserStorage = () => {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const emptyFloor = () => ({ base: '', on: '', off: '' });

/** 모든 층이 비어 있는 초기 상태. */
export const createEmptyState = () => {
  const floors = {};
  FLOOR_KEYS.forEach((key) => {
    floors[key] = emptyFloor();
  });
  return { active: FLOOR_KEYS[0], floors };
};

/**
 * 브라우저에 저장된 층별 입력을 불러온다.
 * 7일이 지났거나 형식이 깨진 저장분은 버리고 빈 상태로 시작한다.
 * 저장이 불가능한 환경(사생활 보호 모드 등)에서도 오류 없이 동작한다.
 */
export const loadLightLogState = (
  storage = getBrowserStorage(),
  now = Date.now(),
) => {
  try {
    const raw = storage?.getItem(LIGHT_LOG_STORAGE_KEY);
    if (!raw) return createEmptyState();

    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.savedAt !== 'number' ||
      now - parsed.savedAt > LIGHT_LOG_RETENTION_MS
    ) {
      storage?.removeItem(LIGHT_LOG_STORAGE_KEY);
      return createEmptyState();
    }

    const state = createEmptyState();
    if (FLOOR_KEYS.includes(parsed.active)) state.active = parsed.active;

    FLOOR_KEYS.forEach((key) => {
      const floor = parsed.floors?.[key];
      FLOOR_FIELDS.forEach((field) => {
        if (typeof floor?.[field] === 'string') {
          state.floors[key][field] = floor[field];
        }
      });
    });

    return state;
  } catch {
    return createEmptyState();
  }
};

/** 층별 입력을 브라우저에 저장한다. 저장할 때마다 보관 기한이 갱신된다. */
export const saveLightLogState = (state, storage = getBrowserStorage()) => {
  try {
    storage?.setItem(
      LIGHT_LOG_STORAGE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        active: state.active,
        floors: state.floors,
      }),
    );
  } catch {
    // 저장 불가 환경에서는 조용히 넘어간다. 화면 동작에는 영향이 없다.
  }
};
