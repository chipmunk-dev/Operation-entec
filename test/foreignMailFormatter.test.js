import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOREIGN_MAIL_FIELDS,
  formatForeignMail,
  parseForeignMailRows,
} from '../src/utils/foreignMailFormatter.js';

const LINE_DIVIDER = '-------------------------------------------------------';

const countLineDividers = (value) =>
  String(value || '')
    .split('\n')
    .filter((line) => line === LINE_DIVIDER).length;

test('표준 해외메일 입력을 파싱하고 메일 형식으로 변환한다', () => {
  const rows = parseForeignMailRows(
    [
      'HOST-01\tDisk warning\t2026-08-03 09:00:00\t10.0.0.1',
      'HOST-02\tCPU warning\t2026-08-03 09:10:00\t10.0.0.2',
    ].join('\n'),
  );
  const result = formatForeignMail(rows);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].data.message, 'Disk warning');
  assert.match(result, /Date\s+: 2026-08-03 09:00:00 \(Base On Korea Time\)/u);
  assert.match(result, /Host\s+: HOST-01/u);
  assert.match(result, /Message\s+: Disk warning/u);
  assert.match(result, /Host\s+: HOST-02/u);
  assert.equal(countLineDividers(result), 3);
  assert.doesNotMatch(result, /^\[ EVENT \d+ \/ TOTAL \d+ \]$/mu);
  assert.match(
    result,
    /Message\s+: Disk warning\n-{55}\nDate[\s\S]*Message\s+: CPU warning/u,
  );
  assert.doesNotMatch(result, /Message\s+: Disk warning\n\n+-{55}/u);
  assert.match(result, /Thank you\./u);
});

test('Message와 확인내역 내부의 탭·줄바꿈을 복구하고 다음 행을 분리한다', () => {
  const rows = parseForeignMailRows(
    [
      'HOST-01\tDisk\tusage warning [2026-08-03 10:00:00: 김철수',
      ' 책임\t메신저 확인 UserName: 정지운]\t2026-08-03 09:00:00\t10.0.0.1',
      'HOST-02\tCPU warning [2026-08-03 10:10:00: 이영희 선임 확인]\t2026-08-03 09:10:00\t10.0.0.2',
    ].join('\n'),
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].data.host, 'HOST-01');
  assert.equal(rows[0].data.message, 'Disk usage warning');
  assert.equal(rows[0].data.date, '2026-08-03 09:00:00');
  assert.equal(rows[0].data.ip, '10.0.0.1');
  assert.equal(rows[0].wasRecovered, true);
  assert.equal(rows[0].physicalLineCount, 2);
  assert.equal(rows[0].extraEventColumns, 2);
  assert.match(rows[0].confirmationText, /김철수 책임 메신저 확인/u);
  assert.equal(rows[1].data.host, 'HOST-02');
  assert.equal(rows[1].data.message, 'CPU warning');
});

test('Message가 마지막 열인 사용자 설정에서도 여러 줄 확인내역을 복구한다', () => {
  const order = ['date', 'ip', 'host', 'message'];
  const rows = parseForeignMailRows(
    [
      '2026-08-03 09:00:00\t10.0.0.1\tHOST-01\tDisk warning [2026-08-03 10:00:00: 김철수',
      ' 책임 메신저 확인]',
      '2026-08-03 09:10:00\t10.0.0.2\tHOST-02\tCPU warning [2026-08-03 10:10:00: 이영희 선임 확인]',
    ].join('\n'),
    order,
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].data.host, 'HOST-01');
  assert.equal(rows[0].data.message, 'Disk warning');
  assert.equal(rows[0].wasRecovered, true);
  assert.equal(rows[1].data.host, 'HOST-02');
  assert.equal(rows[1].data.message, 'CPU warning');
});

test('모든 필드를 마지막 열로 배치해도 확인내역 제거와 행 분리를 유지한다', () => {
  const values = {
    host: 'HOST-01',
    message:
      'Disk warning [2026-08-03 10:00:00: 김철수 책임 확인]',
    date: '2026-08-03 09:00:00',
    ip: '10.0.0.1',
  };

  FOREIGN_MAIL_FIELDS.forEach((lastField) => {
    const order = [
      ...FOREIGN_MAIL_FIELDS.filter((field) => field !== lastField),
      lastField,
    ];
    const input = `${order.map((field) => values[field]).join('\t')}\t\t`;
    const [row] = parseForeignMailRows(input, order);

    assert.equal(row.data.host, values.host, `${lastField} 마지막 Host`);
    assert.equal(row.data.message, 'Disk warning', `${lastField} 마지막 Message`);
    assert.equal(row.data.date, values.date, `${lastField} 마지막 Date`);
    assert.equal(row.data.ip, values.ip, `${lastField} 마지막 IP`);
  });
});

test('날짜형 확인내역이 없는 Message는 원문을 유지한다', () => {
  const [row] = parseForeignMailRows(
    'HOST-01\tDisk warning without history\t2026-08-03 09:00:00\t10.0.0.1',
  );

  assert.equal(row.data.message, 'Disk warning without history');
  assert.equal(row.confirmationText, '');
});

test('입력이 없으면 빈 메일 결과를 반환한다', () => {
  assert.deepEqual(parseForeignMailRows(''), []);
  assert.equal(formatForeignMail([]), '');
  assert.equal(formatForeignMail(), '');
  assert.equal(formatForeignMail(null), '');
});

test('재전달 해외메일은 상단 Resend 문구와 동일한 구분선 양식을 사용한다', () => {
  const result = formatForeignMail(
    [
      {
        data: {
          date: '2026-08-03 09:00:00',
          ip: '10.0.0.1',
          host: 'HOST-01',
          cleanEvent: 'Disk warning',
        },
      },
    ],
    { heading: '- Resend -' },
  );

  assert.match(result, /^- Resend -\n\nDear!\n/u);
  assert.match(
    result,
    /-{55}\nDate\s+: 2026-08-03 09:00:00 \(Base On Korea Time\)\nIP\s+: 10\.0\.0\.1\nHost\s+: HOST-01\nMessage\s+: Disk warning\n-{55}/u,
  );
  assert.equal(countLineDividers(result), 2);
  assert.doesNotMatch(result, /^\[ EVENT \d+ \/ TOTAL \d+ \]$/mu);
});

test('일반 해외메일과 재전달 해외메일은 Resend 머리말 외에 완전히 같은 본문을 사용한다', () => {
  const rows = [
    {
      data: {
        date: '2026-08-03 09:00:00',
        ip: '10.0.0.1',
        host: 'HOST-01',
        message: 'Disk warning',
      },
    },
    {
      data: {
        date: '2026-08-03 09:10:00',
        ip: '10.0.0.2',
        host: 'HOST-02',
        cleanEvent: 'CPU warning',
      },
    },
  ];
  const normalResult = formatForeignMail(rows);
  const resendResult = formatForeignMail(rows, { heading: '- Resend -' });

  assert.equal(resendResult, `- Resend -\n\n${normalResult}`);
  assert.match(
    resendResult,
    /Message\s+: Disk warning\n-{55}\nDate/u,
  );
  assert.equal(countLineDividers(normalResult), 3);
  assert.equal(countLineDividers(resendResult), 3);
  assert.doesNotMatch(resendResult, /Message\s+: Disk warning\n\n+-{55}/u);
});

test('100건을 넘어가도 모든 이벤트를 구분선으로 빠짐없이 분리한다', () => {
  const rows = Array.from({ length: 105 }, (_, index) => ({
    data: {
      date: `2026-08-03 09:${String(index % 60).padStart(2, '0')}:00`,
      ip: `10.0.0.${index + 1}`,
      host: `HOST-${index + 1}`,
      message: `Warning ${index + 1}`,
    },
  }));
  const result = formatForeignMail(rows);

  assert.equal(countLineDividers(result), 106);
  assert.match(result, /Host\s+: HOST-1\nMessage\s+: Warning 1/u);
  assert.match(result, /Host\s+: HOST-105\nMessage\s+: Warning 105/u);
  assert.doesNotMatch(result, /^\[ EVENT \d+ \/ TOTAL \d+ \]$/mu);
});

test('누락되거나 비정상적인 행도 undefined·null 노출 없이 안전하게 출력한다', () => {
  const result = formatForeignMail([
    null,
    {},
    { data: null },
    {
      data: {
        date: null,
        ip: undefined,
        host: null,
        cleanEvent: 'Fallback warning',
      },
    },
  ]);

  assert.equal(countLineDividers(result), 5);
  assert.match(result, /Message\s+: Fallback warning/u);
  assert.doesNotMatch(result, /undefined|null/u);
  assert.doesNotMatch(result, /^\[ EVENT \d+ \/ TOTAL \d+ \]$/mu);
});

test('한 건일 때 앞뒤 구분선과 특수문자를 보존한다', () => {
  const message = 'DB [PRIMARY] → CPU 99.9% / 확인: O&K <retry>';
  const result = formatForeignMail([
    {
      data: {
        date: '2026-08-03 23:59:59',
        ip: '2001:db8::1',
        host: 'HOST_한글-01',
        message,
      },
    },
  ]);

  assert.match(result, /-{55}\nDate/u);
  assert.match(result, /IP\s+: 2001:db8::1/u);
  assert.ok(result.includes(`Message : ${message}`));
  assert.equal(countLineDividers(result), 2);
  assert.doesNotMatch(result, /^\[ EVENT \d+ \/ TOTAL \d+ \]$/mu);
});
