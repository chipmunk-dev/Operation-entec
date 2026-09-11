import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EYECHECK_RETENTION_MS,
  EYECHECK_STORAGE_KEY,
  createEmptyEyecheckSettings,
  formatSavedAt,
  loadEyecheckSettings,
  mergeLastSaved,
  saveEyecheckSettings,
} from '../src/utils/eyecheckStorage.js';

const createMockStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    has: (key) => store.has(key),
  };
};

test('저장된 값이 없으면 초기 설정으로 시작한다', () => {
  assert.deepEqual(loadEyecheckSettings(createMockStorage()), createEmptyEyecheckSettings());
  assert.equal(createEmptyEyecheckSettings().lightType, '주황');
});

test('설정은 되살리지만 층별 입력과 자리별 점등상태는 저장하지 않는다', () => {
  const storage = createMockStorage();
  const settings = {
    ...createEmptyEyecheckSettings(),
    active: '4',
    shift: '2조',
    finder: '주상돈',
    lightType: '기타',
    lightOther: '팬 점멸',
    overwrite: false,
    floors: { 3: { base: 'A-1', on: 'A-2' } },
    picks: { '3|A-2|0': { t: '빨강', o: '' } },
  };

  saveEyecheckSettings(settings, storage, 1000);
  const raw = JSON.parse(storage.getItem(EYECHECK_STORAGE_KEY));
  assert.equal('floors' in raw, false);
  assert.equal('picks' in raw, false);
  assert.equal(raw.savedAt, 1000);

  const restored = loadEyecheckSettings(storage, 2000);
  assert.equal(restored.active, '4');
  assert.equal(restored.finder, '주상돈');
  assert.equal(restored.lightType, '기타');
  assert.equal(restored.overwrite, false);
  assert.equal(restored.backup, true);
});

test('7일이 지난 저장분은 버리고 저장소에서도 지운다', () => {
  const storage = createMockStorage();
  saveEyecheckSettings(createEmptyEyecheckSettings(), storage, 0);
  const restored = loadEyecheckSettings(storage, EYECHECK_RETENTION_MS + 1);
  assert.deepEqual(restored, createEmptyEyecheckSettings());
  assert.equal(storage.has(EYECHECK_STORAGE_KEY), false);
});

test('형식이 깨졌거나 타입이 다른 값은 무시한다', () => {
  const storage = createMockStorage();
  storage.setItem(EYECHECK_STORAGE_KEY, '{깨진');
  assert.deepEqual(loadEyecheckSettings(storage), createEmptyEyecheckSettings());

  storage.setItem(
    EYECHECK_STORAGE_KEY,
    JSON.stringify({
      savedAt: Date.now(),
      active: 3,
      addDevices: 'yes',
      shift: 5,
      lastSaved: { at: '2026-09-03 10:00', floors: { 3: 'A-1', 4: 7 }, counts: { 3: 1, total: 'x' } },
    }),
  );
  const restored = loadEyecheckSettings(storage);
  assert.equal(restored.active, null);
  assert.equal(restored.addDevices, true);
  assert.equal(restored.shift, '');
  assert.deepEqual(restored.lastSaved, { at: '2026-09-03 10:00', floors: { 3: 'A-1' }, counts: { 3: 1 } });
});

test('저장소가 없는 환경에서도 오류 없이 동작한다', () => {
  assert.deepEqual(loadEyecheckSettings(null), createEmptyEyecheckSettings());
  assert.doesNotThrow(() => saveEyecheckSettings(createEmptyEyecheckSettings(), null));
});

test('저장 기록은 저장 시점의 층별 내용으로 바꾸고 개수는 새 값이 없으면 유지한다', () => {
  const now = new Date(2026, 8, 3, 9, 5);
  assert.equal(formatSavedAt(now), '2026-09-03 09:05');

  const previous = { at: '2026-09-01 08:00', floors: { 3: 'A-1', 4: 'B-2' }, counts: { 3: 1, 4: 1, total: 2 } };
  const merged = mergeLastSaved(previous, [{ floor: '3', zoneText: 'A-1,2' }], null, now);
  assert.deepEqual(merged, {
    at: '2026-09-03 09:05',
    floors: { 3: 'A-1,2' },
    counts: { 3: 1, 4: 1, total: 2 },
  });

  const fresh = mergeLastSaved(null, [], { 3: 5, total: 5 }, now);
  assert.deepEqual(fresh.floors, {});
  assert.deepEqual(fresh.counts, { 3: 5, total: 5 });
});
