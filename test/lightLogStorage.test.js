import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOOR_KEYS,
  LIGHT_LOG_RETENTION_MS,
  LIGHT_LOG_STORAGE_KEY,
  createEmptyState,
  loadLightLogState,
  saveLightLogState,
} from '../src/utils/lightLogStorage.js';

const createMockStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    has: (key) => store.has(key),
  };
};

test('저장된 값이 없으면 3·4·5층이 비어 있는 초기 상태를 만든다', () => {
  const state = loadLightLogState(createMockStorage());

  assert.equal(state.active, FLOOR_KEYS[0]);
  assert.deepEqual(Object.keys(state.floors), FLOOR_KEYS);
  FLOOR_KEYS.forEach((key) => {
    assert.deepEqual(state.floors[key], { base: '', on: '', off: '' });
  });
});

test('저장한 층별 입력과 선택된 층을 그대로 되살린다', () => {
  const storage = createMockStorage();
  const state = createEmptyState();
  state.active = '4';
  state.floors['4'] = { base: '점등(1ea) : A-1', on: 'A-2', off: '' };

  saveLightLogState(state, storage);
  const restored = loadLightLogState(storage);

  assert.equal(restored.active, '4');
  assert.deepEqual(restored.floors['4'], {
    base: '점등(1ea) : A-1',
    on: 'A-2',
    off: '',
  });
  assert.deepEqual(restored.floors['3'], { base: '', on: '', off: '' });
});

test('7일이 지난 저장분은 버리고 저장소에서도 지운다', () => {
  const storage = createMockStorage();
  saveLightLogState(createEmptyState(), storage);

  const future = Date.now() + LIGHT_LOG_RETENTION_MS + 1;
  const restored = loadLightLogState(storage, future);

  assert.deepEqual(restored, createEmptyState());
  assert.equal(storage.has(LIGHT_LOG_STORAGE_KEY), false);
});

test('형식이 깨진 저장분은 무시하고 빈 상태로 시작한다', () => {
  const storage = createMockStorage();
  storage.setItem(LIGHT_LOG_STORAGE_KEY, '{잘못된 JSON');

  assert.deepEqual(loadLightLogState(storage), createEmptyState());
});

test('저장 구조가 다르면 안전한 값만 골라 되살린다', () => {
  const storage = createMockStorage();
  storage.setItem(
    LIGHT_LOG_STORAGE_KEY,
    JSON.stringify({
      savedAt: Date.now(),
      active: '99',
      floors: { 3: { base: '점등(1ea) : A-1', on: 123 }, 99: { base: 'x' } },
    }),
  );

  const restored = loadLightLogState(storage);

  assert.equal(restored.active, FLOOR_KEYS[0]);
  assert.equal(restored.floors['3'].base, '점등(1ea) : A-1');
  assert.equal(restored.floors['3'].on, '');
  assert.equal('99' in restored.floors, false);
});

test('저장소가 없는 환경에서도 오류 없이 동작한다', () => {
  assert.deepEqual(loadLightLogState(null), createEmptyState());
  assert.doesNotThrow(() => saveLightLogState(createEmptyState(), null));
});
