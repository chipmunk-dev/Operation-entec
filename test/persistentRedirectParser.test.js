import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PERSISTENT_REDIRECT_ORDER,
  extractPersistentRedirectEvent,
  mergePersistentRedirectIds,
  parsePersistentRedirectMessages,
  parsePersistentRedirectRows,
  requiresPersistentRedirectReview,
  startsWithSConfirmationContent,
  toggleAllPersistentRedirectIds,
  togglePersistentRedirectId,
} from '../src/utils/persistentRedirectParser.js';

const makeRow = ({
  host = 'HOST-01',
  event = 'Disk warning',
  date = '2026-07-30 09:00:00',
  ip = '10.0.0.1',
} = {}) => [host, event, date, ip].join('\t');

test('s 필터는 앞쪽 공백을 제거한 뒤 독립된 ASCII s/S만 판독한다', async (t) => {
  const positiveCases = [
    ['소문자 s', 's 김경상 책임 메신저'],
    ['대문자 S', 'S 김경상 책임 메신저'],
    ['s 한 글자', 's'],
    ['앞쪽 일반 공백', '   s 선셋으로 인한 미운영 서버'],
    ['앞쪽 탭과 줄바꿈', '\t\n S 담당자'],
    ['앞쪽 NBSP', '\u00a0s 담당자'],
    ['앞쪽 narrow NBSP', '\u202fs 담당자'],
    ['탭 뒤의 내용', 's\t담당자'],
    ['줄바꿈 뒤의 내용', 'S\n담당자'],
  ];

  for (const [name, value] of positiveCases) {
    await t.test(name, () => {
      assert.equal(startsWithSConfirmationContent(value), true);
    });
  }

  const negativeCases = [
    ['빈 문자열', ''],
    ['공백만', ' \t\n '],
    ['null', null],
    ['undefined', undefined],
    ['숫자 0', 0],
    ['false', false],
    ['문장 중간의 s', '김경상 s 메신저'],
    ['대괄호 뒤의 s', '[s] 담당자'],
    ['server 영단어', 'server 미운영'],
    ['sunset 영단어', 'sunset 미운영'],
    ['service 영단어', 'service 점검'],
    ['공백 없이 이어진 S', 'S선셋 미운영'],
    ['skip은 독립 s 규칙 아님', 'skip 처리'],
    ['skip X도 독립 s 규칙 아님', 'skip X'],
    ['한글 스킵', '스킵 X 담당자'],
    ['전각 S', 'Ｓ 담당자'],
    ['악센트 s', 'ś 담당자'],
    ['유니코드 long s', 'ſ 담당자'],
  ];

  for (const [name, value] of negativeCases) {
    await t.test(name, () => {
      assert.equal(startsWithSConfirmationContent(value), false);
    });
  }
});

test('확인 필요 판독은 skip·스킵을 포함하고 x/X 부정 표기를 우선 제외한다', async (t) => {
  const reviewCases = [
    ['소문자 s 시작', 's 김경상 책임 메신저'],
    ['대문자 S 시작', 'S 선셋 미운영'],
    ['문장 중간 소문자 skip', '담당자 확인 후 skip 처리'],
    ['문장 중간 대문자 SKIP', '담당자 확인 후 SKIP 처리'],
    ['문장 중간 혼합 대소문자 Skip', '담당자 확인 후 Skip 처리'],
    ['문장 중간 한글 스킵', '담당자 확인 후 스킵 처리'],
    ['부정 표기 뒤 별도 skip', 'skip X 이후 실제 skip 처리'],
    ['한글 부정 표기 뒤 별도 SKIP', '스킵X 이후 실제 SKIP 처리'],
    ['x로 시작하는 영단어', '담당자 skip xylophone 처리'],
    ['X로 시작하는 영단어', '담당자 skip XML 처리'],
  ];

  for (const [name, value] of reviewCases) {
    await t.test(name, () => {
      assert.equal(requiresPersistentRedirectReview(value), true);
    });
  }

  const notReviewCases = [
    ['스킵X', '스킵X'],
    ['스킵 X', '스킵 X'],
    ['스킵x', '스킵x'],
    ['스킵 x', '스킵 x'],
    ['skip X', 'skip X'],
    ['skip x', 'skip x'],
    ['SKIP X', '담당자 SKIP X 처리'],
    ['Skip x', '담당자 Skip x 처리'],
    ['탭으로 구분한 x', '담당자 skip\tX 처리'],
    ['줄바꿈으로 구분한 x', '담당자 스킵\nx 처리'],
    ['s 시작보다 부정 표기 우선', 's 담당자 skip X'],
    ['S 시작보다 한글 부정 표기 우선', 'S 담당자 스킵 x'],
    ['일반 확인내용', '김경상 책임 메신저'],
    ['s로 시작하는 일반 영단어', 'server 미운영'],
    ['대문자 S로 시작하는 일반 영단어', 'Service 점검'],
    ['공백 없이 이어진 S', 'S선셋 미운영'],
    ['빈 문자열', ''],
  ];

  for (const [name, value] of notReviewCases) {
    await t.test(name, () => {
      assert.equal(requiresPersistentRedirectReview(value), false);
    });
  }
});

test('확인 로그를 Event 본문과 처리내용으로 정확히 분리한다', async (t) => {
  await t.test('표준 로그', () => {
    assert.deepEqual(
      extractPersistentRedirectEvent(
        'Disk warning [2026-07-30 10:11:12: s 김경상 책임 메신저 확인 UserName: 정지운]',
      ),
      {
        cleanEvent: 'Disk warning',
        processingLog:
          '[2026-07-30 10:11:12: s 김경상 책임 메신저 확인 UserName: 정지운]',
        processingContent: 's 김경상 책임 메신저',
      },
    );
  });

  await t.test('날짜 구분자 / 및 한 자리 월·일', () => {
    const result = extractPersistentRedirectEvent(
      'CPU warning [2026/7/3 01:02:03: S 담당자 확인 UserName: 정지운]',
    );

    assert.equal(result.cleanEvent, 'CPU warning');
    assert.equal(result.processingContent, 'S 담당자');
  });

  await t.test('날짜 구분자 . 및 내용 내부 콜론', () => {
    const result = extractPersistentRedirectEvent(
      'DB warning [2026.07.30 01:02:03: s DB: WAS 담당자 확인 UserName: 정지운]',
    );

    assert.equal(result.processingContent, 's DB: WAS 담당자');
  });

  await t.test('여러 줄 처리내용', () => {
    const result = extractPersistentRedirectEvent(
      'Network warning [2026-07-30 01:02:03: s 1차 확인\n2차 메신저 확인 UserName: 정지운]',
    );

    assert.equal(result.cleanEvent, 'Network warning');
    assert.equal(result.processingContent, 's 1차');
  });

  await t.test('확인이라는 단어가 여러 번이면 첫 확인 앞까지만 처리내용이다', () => {
    const result = extractPersistentRedirectEvent(
      'Memory warning [2026-07-30 01:02:03: s 담당자 확인 후 재확인 UserName: 정지운]',
    );

    assert.equal(result.processingContent, 's 담당자');
  });

  await t.test('내용이 s 한 글자인 최소 경계', () => {
    const result = extractPersistentRedirectEvent(
      'Process warning [2026-07-30 01:02:03: s 확인 UserName: 정지운]',
    );

    assert.equal(result.processingContent, 's');
    assert.equal(
      startsWithSConfirmationContent(result.processingContent),
      true,
    );
  });

  await t.test('처리내용이 비어 있는 최소 로그', () => {
    const result = extractPersistentRedirectEvent(
      'Process warning [2026-07-30 01:02:03: 확인 UserName: 정지운]',
    );

    assert.equal(result.processingContent, '');
    assert.equal(
      startsWithSConfirmationContent(result.processingContent),
      false,
    );
  });

  await t.test('확인 문구가 없어도 날짜 대괄호 로그 자체는 분리한다', () => {
    const result = extractPersistentRedirectEvent(
      'Process warning [2026-07-30 01:02:03: s 담당자]',
    );

    assert.equal(result.cleanEvent, 'Process warning');
    assert.equal(result.processingContent, '');
    assert.notEqual(result.processingLog, '');
  });
});

test('불완전하거나 위치가 잘못된 확인 로그는 Event를 훼손하지 않는다', async (t) => {
  const unchangedCases = [
    ['날짜 대괄호 없음', 'Disk warning'],
    [
      '날짜 대괄호가 문자열 끝이 아님',
      'Disk [2026-07-30 01:02:03: s 확인] trailing',
    ],
    ['닫는 대괄호 없음', 'Disk [2026-07-30 01:02:03: s 확인'],
    ['지원 범위 밖 연도 1899', 'Disk [1899-07-30 01:02:03: s 확인]'],
    ['지원 범위 밖 연도 2100', 'Disk [2100-07-30 01:02:03: s 확인]'],
    ['다른 종류의 괄호', 'Disk (2026-07-30 01:02:03: s 확인)'],
    ['빈 문자열', ''],
  ];

  for (const [name, event] of unchangedCases) {
    await t.test(name, () => {
      assert.deepEqual(extractPersistentRedirectEvent(event), {
        cleanEvent: event,
        processingLog: '',
        processingContent: '',
      });
    });
  }
});

test('Event 내부 탭과 줄바꿈을 복구하고 다음 데이터 행을 분리한다', () => {
  const rows = parsePersistentRedirectRows(
    [
      'HOST-01\tDisk\tusage warning',
      'continued [2026-07-26 10:00:00: 김철수 선임 확인]\t2026-07-26 09:00:00\t10.0.0.1',
      'HOST-02\tCPU warning\t2026-07-26 09:30:00\t10.0.0.2',
    ].join('\n'),
    DEFAULT_PERSISTENT_REDIRECT_ORDER,
  );

  assert.equal(rows.length, 2);
  assert.equal(
    rows[0].data.event,
    'Disk usage warning continued [2026-07-26 10:00:00: 김철수 선임 확인]',
  );
  assert.equal(rows[0].data.date, '2026-07-26 09:00:00');
  assert.equal(rows[0].data.ip, '10.0.0.1');
  assert.equal(rows[0].wasRecovered, true);
  assert.equal(rows[0].extraEventColumns, 1);
  assert.equal(rows[0].physicalLineCount, 2);
  assert.equal(rows[1].data.host, 'HOST-02');
  assert.equal(rows[1].wasRecovered, false);
});

test('Event 위치가 처음·중간·마지막인 모든 열 순서를 복구한다', async (t) => {
  await t.test('Event가 마지막 열', () => {
    const order = ['host', 'date', 'ip', 'event'];
    const rows = parsePersistentRedirectRows(
      [
        'HOST-01\t2026-07-26 09:00:00\t10.0.0.1\tDisk warning',
        'continued event',
        'HOST-02\t2026-07-26 09:30:00\t10.0.0.2\tCPU warning',
      ].join('\n'),
      order,
    );

    assert.equal(rows.length, 2);
    assert.equal(rows[0].data.event, 'Disk warning continued event');
    assert.equal(rows[1].data.event, 'CPU warning');
  });

  await t.test('Event가 첫 열', () => {
    const order = ['event', 'host', 'date', 'ip'];
    const rows = parsePersistentRedirectRows(
      [
        'Disk warning',
        'continued event\tHOST-01\t2026-07-26 09:00:00\t10.0.0.1',
        'CPU warning\tHOST-02\t2026-07-26 09:30:00\t10.0.0.2',
      ].join('\n'),
      order,
    );

    assert.equal(rows.length, 2);
    assert.equal(rows[0].data.event, 'Disk warning continued event');
    assert.equal(rows[0].data.host, 'HOST-01');
    assert.equal(rows[1].data.host, 'HOST-02');
  });

  await t.test('Event가 세 번째 열', () => {
    const order = ['host', 'date', 'event', 'ip'];
    const rows = parsePersistentRedirectRows(
      [
        'HOST-01\t2026-07-26 09:00:00\tDisk\twarning\t10.0.0.1',
        'HOST-02\t2026-07-26 09:30:00\tCPU warning\t10.0.0.2',
      ].join('\n'),
      order,
    );

    assert.equal(rows.length, 2);
    assert.equal(rows[0].data.event, 'Disk warning');
    assert.equal(rows[0].extraEventColumns, 1);
  });
});

test('빈 줄·CRLF·후행 탭·후행 불필요 열 경계를 안전하게 처리한다', () => {
  const rows = parsePersistentRedirectRows(
    [
      '',
      '   ',
      `${makeRow({ host: 'HOST-01' })}\t\t`,
      `${makeRow({ host: 'HOST-02' })}\tIGNORED`,
      '',
    ].join('\r\n'),
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 2);
  assert.equal(rows[0].lineNumber, 3);
  assert.equal(rows[0].ignoredTrailingColumns, 0);
  assert.equal(rows[1].id, 3);
  assert.equal(rows[1].ignoredTrailingColumns, 1);
  assert.equal(rows[1].data.ip, '10.0.0.1');
  assert.equal(rows[1].wasRecovered, true);
});

test('불완전한 단일 행도 손실 없이 반환하고 진단 상태를 남긴다', () => {
  const rows = parsePersistentRedirectRows('HOST-ONLY\tEVENT-ONLY');

  assert.equal(rows.length, 1);
  assert.equal(rows[0].hasEnoughColumns, false);
  assert.equal(rows[0].data.host, 'HOST-ONLY');
  assert.equal(rows[0].data.event, 'EVENT-ONLY');
  assert.equal(rows[0].data.date, '');
  assert.equal(rows[0].data.ip, '');
});

test('파싱부터 확인 필요 판독까지 전체 데이터 흐름을 통합 검증한다', () => {
  const input = [
    makeRow({
      host: 'HOST-S',
      event:
        'Disk warning [2026-07-30 10:00:00: s 김경상 책임 메신저 확인 UserName: 정지운]',
    }),
    makeRow({
      host: 'HOST-UPPER-S',
      event:
        'CPU warning [2026-07-30 10:01:00: S 선셋 미운영 확인 UserName: 정지운]',
    }),
    makeRow({
      host: 'HOST-NORMAL',
      event:
        'Memory warning [2026-07-30 10:02:00: 김철수 선임 확인 UserName: 정지운]',
    }),
    makeRow({
      host: 'HOST-MIDDLE-SKIP',
      event:
        'Network warning [2026-07-30 10:03:00: 담당자 skip 확인 UserName: 정지운]',
    }),
    makeRow({
      host: 'HOST-KOREAN-SKIP',
      event:
        'Process warning [2026-07-30 10:04:00: 담당자 스킵 처리 확인 UserName: 정지운]',
    }),
    makeRow({
      host: 'HOST-NOT-SKIP',
      event:
        'Batch warning [2026-07-30 10:05:00: skip X 확인 UserName: 정지운]',
    }),
    makeRow({
      host: 'HOST-NO-LOG',
      event: 'Plain event without confirmation',
    }),
  ].join('\n');

  const messages = parsePersistentRedirectMessages(input);
  const filteredHosts = messages
    .filter((message) => message.requiresReview)
    .map((message) => message.data.host);

  assert.equal(messages.length, 7);
  assert.deepEqual(filteredHosts, [
    'HOST-S',
    'HOST-UPPER-S',
    'HOST-MIDDLE-SKIP',
    'HOST-KOREAN-SKIP',
  ]);
  assert.equal(messages[0].data.cleanEvent, 'Disk warning');
  assert.equal(
    messages[0].data.processingContent,
    's 김경상 책임 메신저',
  );
  assert.equal(messages[2].requiresReview, false);
  assert.equal(messages[3].requiresReview, true);
  assert.equal(messages[4].requiresReview, true);
  assert.equal(messages[5].requiresReview, false);
  assert.equal(messages[6].data.processingLog, '');
});

test('복구된 Event 안의 확인 필요 내용도 최종 필터 대상으로 유지한다', () => {
  const input = [
    'HOST-01\tDisk\twarning continued',
    '[2026-07-30 10:00:00: s 김경상 책임 메신저 확인 UserName: 정지운]\t2026-07-30 09:00:00\t10.0.0.1',
    makeRow({
      host: 'HOST-02',
      event:
        'CPU warning [2026-07-30 10:01:00: 정상 담당자 확인 UserName: 정지운]',
    }),
  ].join('\n');

  const messages = parsePersistentRedirectMessages(input);

  assert.equal(messages.length, 2);
  assert.equal(messages[0].wasRecovered, true);
  assert.equal(messages[0].physicalLineCount, 2);
  assert.equal(messages[0].extraEventColumns, 1);
  assert.equal(messages[0].data.cleanEvent, 'Disk warning continued');
  assert.equal(messages[0].requiresReview, true);
  assert.equal(messages[1].requiresReview, false);
});

test('개별 선택 토글은 다른 선택을 보존하며 재선택 시 해당 ID만 제거한다', () => {
  assert.deepEqual(togglePersistentRedirectId([], 0), [0]);
  assert.deepEqual(togglePersistentRedirectId([0, 2], 1), [0, 2, 1]);
  assert.deepEqual(togglePersistentRedirectId([0, 2, 1], 2), [0, 1]);
  assert.deepEqual(togglePersistentRedirectId([3, 3, 4], 3), [4]);
});

test('전체 선택 토글은 현재 노출된 ID만 추가·해제한다', async (t) => {
  await t.test('일부 선택 상태면 누락된 노출 ID를 모두 추가한다', () => {
    assert.deepEqual(
      toggleAllPersistentRedirectIds([1, 99], [1, 2, 3]),
      [1, 99, 2, 3],
    );
  });

  await t.test('모두 선택 상태면 노출 ID만 해제하고 다른 ID는 보존한다', () => {
    assert.deepEqual(
      toggleAllPersistentRedirectIds([99, 3, 1, 2], [1, 2, 3]),
      [99],
    );
  });

  await t.test('노출 목록이 비어 있으면 기존 선택을 변경하지 않는다', () => {
    assert.deepEqual(toggleAllPersistentRedirectIds([1, 99], []), [1, 99]);
  });

  await t.test('중복 ID가 입력되어도 결과에는 중복이 생기지 않는다', () => {
    assert.deepEqual(toggleAllPersistentRedirectIds([1], [1, 2, 2]), [
      1,
      2,
    ]);
  });
});

test('개별·일괄 제외 병합은 기존 확인 상태를 보존하고 중복을 제거한다', () => {
  assert.deepEqual(mergePersistentRedirectIds([], [0]), [0]);
  assert.deepEqual(mergePersistentRedirectIds([0, 7], [1, 2]), [0, 7, 1, 2]);
  assert.deepEqual(
    mergePersistentRedirectIds([0, 0, 7], [7, 1, 1]),
    [0, 7, 1],
  );
  assert.deepEqual(mergePersistentRedirectIds([0, 7], []), [0, 7]);
});

test('선택→일괄 제외→확인됨 이동→복구 흐름의 상태 불변식을 검증한다', () => {
  const messages = parsePersistentRedirectMessages(
    [
      makeRow({
        host: 'HOST-0',
        event:
          'A [2026-07-30 10:00:00: 일반 담당자 확인 UserName: 정지운]',
      }),
      makeRow({
        host: 'HOST-1',
        event:
          'B [2026-07-30 10:01:00: s 담당자 확인 UserName: 정지운]',
      }),
      makeRow({
        host: 'HOST-2',
        event:
          'C [2026-07-30 10:02:00: S 선셋 확인 UserName: 정지운]',
      }),
    ].join('\n'),
  );
  const sIds = messages
    .filter((message) => message.requiresReview)
    .map((message) => message.id);

  assert.deepEqual(sIds, [1, 2]);

  const selectedIds = toggleAllPersistentRedirectIds([], sIds);
  const confirmedIds = mergePersistentRedirectIds([0], selectedIds);
  const pendingIds = messages
    .filter((message) => !confirmedIds.includes(message.id))
    .map((message) => message.id);
  const confirmedListIds = messages
    .filter((message) => confirmedIds.includes(message.id))
    .map((message) => message.id);

  assert.deepEqual(selectedIds, [1, 2]);
  assert.deepEqual(confirmedIds, [0, 1, 2]);
  assert.deepEqual(pendingIds, []);
  assert.deepEqual(confirmedListIds, [0, 1, 2]);

  const restoredConfirmedIds = confirmedIds.filter((id) => id !== 1);
  const restoredSIds = messages
    .filter(
      (message) =>
        message.requiresReview && !restoredConfirmedIds.includes(message.id),
    )
    .map((message) => message.id);

  assert.deepEqual(restoredConfirmedIds, [0, 2]);
  assert.deepEqual(restoredSIds, [1]);
});

test('대량 입력에서도 행 순서·고유 ID·필터 개수를 안정적으로 유지한다', () => {
  const rowCount = 1000;
  const input = Array.from({ length: rowCount }, (_, index) => {
    const isFiltered = index % 4 === 0;
    const eventColumns =
      index % 10 === 0
        ? ['Disk', 'warning']
        : ['Disk warning'];
    const event = `${eventColumns.join('\t')} [2026-07-30 10:00:00: ${
      isFiltered ? 's 담당자' : '일반 담당자'
    } 확인 UserName: 정지운]`;

    return makeRow({
      host: `HOST-${String(index).padStart(4, '0')}`,
      event,
      ip: `10.0.${Math.floor(index / 250)}.${(index % 250) + 1}`,
    });
  }).join('\n');

  const messages = parsePersistentRedirectMessages(input);
  const filteredMessages = messages.filter(
    (message) => message.requiresReview,
  );

  assert.equal(messages.length, rowCount);
  assert.equal(new Set(messages.map((message) => message.id)).size, rowCount);
  assert.deepEqual(
    messages.map((message) => message.id),
    Array.from({ length: rowCount }, (_, index) => index),
  );
  assert.equal(filteredMessages.length, rowCount / 4);
  assert.equal(messages[0].wasRecovered, true);
  assert.equal(messages[10].extraEventColumns, 1);
  assert.equal(messages[999].data.host, 'HOST-0999');
});
