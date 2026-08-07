import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEMS_REPORTER_RETENTION_MS,
  GEMS_REPORTER_STORAGE_KEY,
  loadGemsReporterName,
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
});
