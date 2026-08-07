import assert from 'node:assert/strict';
import test from 'node:test';
import { getAppVersion, hasAppVersionChanged } from '../src/utils/appVersion.js';

test('버전 매니페스트의 유효한 버전 문자열을 정리해 반환한다', () => {
  assert.equal(getAppVersion({ version: '  commit-a  ' }), 'commit-a');
});

test('버전 매니페스트가 잘못되면 업데이트로 판단하지 않는다', () => {
  assert.equal(getAppVersion(null), null);
  assert.equal(getAppVersion({}), null);
  assert.equal(getAppVersion({ version: '' }), null);
  assert.equal(hasAppVersionChanged('commit-a', { version: null }), false);
});

test('현재 빌드와 배포 빌드가 다를 때만 업데이트로 판단한다', () => {
  assert.equal(hasAppVersionChanged('commit-a', { version: 'commit-a' }), false);
  assert.equal(hasAppVersionChanged('commit-a', { version: 'commit-b' }), true);
  assert.equal(hasAppVersionChanged('', { version: 'commit-b' }), false);
});
