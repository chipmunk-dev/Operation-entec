import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBackupNotepadFileName,
  formatBackupNotepad,
} from '../src/utils/backupNotepad.js';

const zones = ['P-EUBKMST', 'NBUMASTER', 'EXTMASTER'];

test('백업존별 오류를 Policy, Start Time, Status 묶음으로 출력한다', () => {
  const result = formatBackupNotepad(
    {
      'P-EUBKMST': {
        errors: [
          {
            policyName: 'policy 1',
            startTime: '2026-09-01 01:00:00',
            errorCode: '2',
          },
          {
            policyName: 'policy 2',
            startTime: '2026-09-01 02:00:00',
            errorCode: '96',
          },
        ],
      },
      NBUMASTER: {
        errors: [
          {
            policyName: 'policy 3',
            startTime: '2026-09-01 03:00:00',
            errorCode: '5',
          },
        ],
      },
      EXTMASTER: { errors: [] },
    },
    zones,
  );

  assert.equal(
    result,
    `[P-EUBKMST]
policy 1
policy 2
-------------
2026-09-01 01:00:00
2026-09-01 02:00:00
-------------
Err: 2
Err: 96

[NBUMASTER]
policy 3
-------------
2026-09-01 03:00:00
-------------
Err: 5

[EXTMASTER]
에러 없음`,
  );
});

test('오류가 없는 모든 백업존도 에러 없음으로 표시한다', () => {
  const result = formatBackupNotepad({}, zones);

  assert.equal(
    result,
    `[P-EUBKMST]
에러 없음

[NBUMASTER]
에러 없음

[EXTMASTER]
에러 없음`,
  );
});

test('메모장 파일명에 로컬 생성 시각을 포함한다', () => {
  const fileName = createBackupNotepadFileName(
    new Date(2026, 8, 1, 9, 7, 0),
  );

  assert.equal(fileName, '자동백업_오류내역_20260901_0907.txt');
  assert.throws(
    () => createBackupNotepadFileName('invalid'),
    /생성 시각이 올바르지 않습니다/u,
  );
});
