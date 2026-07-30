import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BACKUP_TRANSFER_TYPE,
  BACKUP_TRANSFER_VERSION,
  createBackupTransferFileName,
  parseBackupTransfer,
  serializeBackupTransfer,
} from '../src/utils/backupTransfer.js';

const zones = ['P-EUBKMST', 'NBUMASTER', 'EXTMASTER'];
const state = {
  inputs: {
    'P-EUBKMST': '',
    NBUMASTER: '11\tDone\t\t\t\tPOLICY_A\tJul 30, 2026, 8:00:11 PM',
    EXTMASTER: '',
  },
  columnPositions: { status: 1, policyName: 6, startTime: 7 },
  activeZone: 'NBUMASTER',
};

test('자동 백업 상태를 JSON으로 내보내고 동일하게 복원한다', () => {
  const exportedAt = new Date('2026-07-30T12:34:00.000Z');
  const serialized = serializeBackupTransfer(state, zones, exportedAt);
  const payload = JSON.parse(serialized);

  assert.equal(payload.type, BACKUP_TRANSFER_TYPE);
  assert.equal(payload.version, BACKUP_TRANSFER_VERSION);
  assert.equal(payload.exportedAt, exportedAt.toISOString());

  assert.deepEqual(parseBackupTransfer(serialized, zones), {
    state,
    exportedAt: exportedAt.toISOString(),
  });
});

test('메모장에서 저장한 BOM 포함 JSON도 읽는다', () => {
  const serialized = serializeBackupTransfer(state, zones);
  assert.deepEqual(parseBackupTransfer(`\uFEFF${serialized}`, zones).state, state);
});

test('다른 종류와 버전 또는 중복 열 설정의 JSON을 거부한다', () => {
  const payload = JSON.parse(serializeBackupTransfer(state, zones));

  assert.throws(
    () => parseBackupTransfer(
      JSON.stringify({ ...payload, type: 'unknown' }),
      zones,
    ),
    /자동 백업 공유 파일이 아닙니다/u,
  );
  assert.throws(
    () => parseBackupTransfer(
      JSON.stringify({ ...payload, version: 99 }),
      zones,
    ),
    /지원하지 않는/u,
  );
  assert.throws(
    () => parseBackupTransfer(
      JSON.stringify({
        ...payload,
        data: {
          ...payload.data,
          columnPositions: { status: 1, policyName: 1, startTime: 7 },
        },
      }),
      zones,
    ),
    /서로 다른 열/u,
  );
});

test('파일 이름에 로컬 내보내기 시각을 포함한다', () => {
  const date = new Date(2026, 6, 30, 21, 5);
  assert.equal(
    createBackupTransferFileName(date),
    'operation-entec-backup-2026-07-30-2105.json',
  );
});
