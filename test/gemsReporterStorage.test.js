import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_GEMS_OUTPUT_MODE,
  GEMS_OUTPUT_MODE_STORAGE_KEY,
  GEMS_REPORTER_RETENTION_MS,
  GEMS_REPORTER_STORAGE_KEY,
  loadGemsOutputMode,
  loadGemsReporterName,
  saveGemsOutputMode,
  saveGemsReporterName,
} from '../src/utils/gemsReporterStorage.js';

const createMemoryStorage = () => {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

test('저장한 보고자 이름을 12시간 안에는 복원한다', () => {
  const storage = createMemoryStorage();
  const savedAt = Date.parse('2026-08-07T00:00:00.000Z');
  const payload = saveGemsReporterName('  홍길동  ', storage, savedAt);

  assert.equal(payload.name, '홍길동');
  assert.equal(payload.expiresAt, savedAt + 12 * 60 * 60 * 1000);
  assert.equal(
    loadGemsReporterName(
      storage,
      savedAt + GEMS_REPORTER_RETENTION_MS - 1,
    ),
    '홍길동',
  );
});

test('12시간이 지난 보고자 이름은 자동으로 삭제한다', () => {
  const storage = createMemoryStorage();
  const savedAt = Date.parse('2026-08-07T00:00:00.000Z');
  saveGemsReporterName('홍길동', storage, savedAt);

  assert.equal(
    loadGemsReporterName(storage, savedAt + GEMS_REPORTER_RETENTION_MS),
    '',
  );
  assert.equal(storage.getItem(GEMS_REPORTER_STORAGE_KEY), null);
});

test('이름을 비우거나 저장 데이터가 손상되면 저장값을 제거한다', () => {
  const storage = createMemoryStorage();
  saveGemsReporterName('홍길동', storage, 0);
  saveGemsReporterName('  ', storage, 1);
  assert.equal(storage.getItem(GEMS_REPORTER_STORAGE_KEY), null);

  storage.setItem(GEMS_REPORTER_STORAGE_KEY, '{invalid json');
  assert.equal(loadGemsReporterName(storage, 2), '');
  assert.equal(storage.getItem(GEMS_REPORTER_STORAGE_KEY), null);
});

test('브라우저 저장소 접근이 차단되어도 화면용 기본값을 안전하게 반환한다', () => {
  const blockedStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  };

  assert.equal(loadGemsReporterName(blockedStorage, 0), '');
  assert.equal(saveGemsReporterName('홍길동', blockedStorage, 0), null);
  assert.equal(loadGemsOutputMode(blockedStorage, 0), DEFAULT_GEMS_OUTPUT_MODE);
  assert.equal(saveGemsOutputMode('report', blockedStorage, 0), null);
});

test('선택한 출력 방식을 12시간 안에는 복원한다', () => {
  const storage = createMemoryStorage();
  const savedAt = Date.parse('2026-09-01T00:00:00.000Z');
  const payload = saveGemsOutputMode('report', storage, savedAt);

  assert.equal(payload.mode, 'report');
  assert.equal(payload.expiresAt, savedAt + GEMS_REPORTER_RETENTION_MS);
  assert.equal(
    loadGemsOutputMode(
      storage,
      savedAt + GEMS_REPORTER_RETENTION_MS - 1,
    ),
    'report',
  );
});

test('출력 방식 저장값이 만료되거나 잘못되면 기본 방식으로 되돌린다', () => {
  const storage = createMemoryStorage();
  const savedAt = Date.parse('2026-09-01T00:00:00.000Z');
  saveGemsOutputMode('report', storage, savedAt);

  assert.equal(
    loadGemsOutputMode(storage, savedAt + GEMS_REPORTER_RETENTION_MS),
    DEFAULT_GEMS_OUTPUT_MODE,
  );
  assert.equal(storage.getItem(GEMS_OUTPUT_MODE_STORAGE_KEY), null);

  storage.setItem(
    GEMS_OUTPUT_MODE_STORAGE_KEY,
    JSON.stringify({ version: 1, mode: 'unknown', expiresAt: savedAt + 1000 }),
  );
  assert.equal(loadGemsOutputMode(storage, savedAt), DEFAULT_GEMS_OUTPUT_MODE);
  assert.equal(storage.getItem(GEMS_OUTPUT_MODE_STORAGE_KEY), null);
});
