export const EYECHECK_STORAGE_KEY = 'operation-entec:eyecheck-light-log:v2';
export const EYECHECK_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const getBrowserStorage = () => {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

/**
 * 브라우저에 남기는 설정. 점등 입력과 자리별 점등상태는 저장하지 않는다.
 * 지난 내용이 남아 다음 파일에 잘못 반영되는 것을 막기 위해서다.
 */
export const createEmptyEyecheckSettings = () => ({
  active: null,
  addDevices: true,
  shift: '',
  finder: '',
  lightType: '주황',
  lightOther: '',
  overwrite: true,
  backup: true,
  lastSaved: null,
});

const STRING_FIELDS = ['shift', 'finder', 'lightType', 'lightOther'];
const BOOLEAN_FIELDS = ['addDevices', 'overwrite', 'backup'];

const sanitizeLastSaved = (candidate) => {
  if (!candidate || typeof candidate !== 'object') return null;
  if (typeof candidate.at !== 'string') return null;
  const floors = {};
  for (const [floor, text] of Object.entries(candidate.floors ?? {})) {
    if (typeof text === 'string') floors[floor] = text;
  }
  let counts = null;
  if (candidate.counts && typeof candidate.counts === 'object') {
    counts = {};
    for (const [key, value] of Object.entries(candidate.counts)) {
      if (Number.isFinite(value)) counts[key] = value;
    }
  }
  return { at: candidate.at, floors, counts };
};

/**
 * 저장된 설정을 불러온다. 7일이 지났거나 형식이 깨진 저장분은 버리고 초기값으로 시작한다.
 * 저장이 불가능한 환경(사생활 보호 모드 등)에서도 오류 없이 동작한다.
 */
export const loadEyecheckSettings = (
  storage = getBrowserStorage(),
  now = Date.now(),
) => {
  try {
    const raw = storage?.getItem(EYECHECK_STORAGE_KEY);
    if (!raw) return createEmptyEyecheckSettings();

    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.savedAt !== 'number' ||
      now - parsed.savedAt > EYECHECK_RETENTION_MS
    ) {
      storage?.removeItem(EYECHECK_STORAGE_KEY);
      return createEmptyEyecheckSettings();
    }

    const settings = createEmptyEyecheckSettings();
    if (typeof parsed.active === 'string') settings.active = parsed.active;
    for (const field of STRING_FIELDS) {
      if (typeof parsed[field] === 'string') settings[field] = parsed[field];
    }
    for (const field of BOOLEAN_FIELDS) {
      if (typeof parsed[field] === 'boolean') settings[field] = parsed[field];
    }
    settings.lastSaved = sanitizeLastSaved(parsed.lastSaved);
    return settings;
  } catch {
    return createEmptyEyecheckSettings();
  }
};

/** 설정을 브라우저에 저장한다. 저장할 때마다 보관 기한이 갱신된다. */
export const saveEyecheckSettings = (
  settings,
  storage = getBrowserStorage(),
  now = Date.now(),
) => {
  try {
    const { floors, picks, ...keep } = settings; // eslint-disable-line no-unused-vars
    storage?.setItem(
      EYECHECK_STORAGE_KEY,
      JSON.stringify({ ...keep, savedAt: now }),
    );
  } catch {
    // 저장 불가 환경에서는 조용히 넘어간다. 화면 동작에는 영향이 없다.
  }
};

const pad2 = (value) => String(value).padStart(2, '0');

export const formatSavedAt = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

/**
 * 저장한 내용과 개수를 기억해 둔다. 다음에 파일을 열 때 최신인지 비교하는 데 쓴다.
 * 층별 점검대상 내용은 저장 시점의 전체 스냅샷으로 바꾸고(예전 층 기록을 섞지 않는다),
 * 개수는 새 값이 없으면 이전 값을 유지한다.
 */
export const mergeLastSaved = (previous, savedFloors, counts, now = new Date()) => ({
  at: formatSavedAt(now),
  floors: Object.fromEntries(
    (savedFloors ?? []).map(({ floor, zoneText }) => [floor, zoneText]),
  ),
  counts: counts ?? previous?.counts ?? null,
});
