import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, unzipSync } from 'fflate';
import {
  expandRowsForExcel,
  excludeRedirectSection,
  extractAdminCandidates,
  extractDbaAdminCandidates,
  extractMailAdminKeywords,
  extractMessengerAdminKeywords,
  parsePersistentEventRows,
  splitEventContent,
} from '../src/utils/persistentEventParser.js';
import { createPersistentEventWorkbook } from '../src/utils/xlsxExport.js';

test('처리 기록을 이벤트 내용에서 분리한다', () => {
  assert.deepEqual(
    splitEventContent(
      'Disk usage warning [2026-07-26 18:10:00: 정민규 책임 확인]',
    ),
    {
      cleanContent: 'Disk usage warning',
      confirmationText: '[2026-07-26 18:10:00: 정민규 책임 확인]',
    },
  );

  assert.deepEqual(splitEventContent('Disk warning 확인내역: 홍길동 선임 확인'), {
    cleanContent: 'Disk warning',
    confirmationText: '홍길동 선임 확인',
  });
});

test('공백 유무와 복수 담당자를 모두 추출한다', () => {
  assert.deepEqual(
    extractAdminCandidates(
      '[2026-07-26 18:10:00: 정민규 책임 / 홍길동선임 확인]',
    ).map(({ label }) => label),
    ['정민규 책임', '홍길동 선임'],
  );
});

test('마침표 바로 뒤의 담당자 이름도 추출한다', () => {
  assert.deepEqual(
    extractAdminCandidates(
      '[2025-12-30 16:40:20: .박상원 선임 문자 → 재전달 확인]',
    ).map(({ label }) => label),
    ['박상원 선임'],
  );
});

test('재전달 키워드가 같은 화살표 구간에 있을 때만 뒤쪽을 제외한다', () => {
  assert.deepEqual(
    excludeRedirectSection(
      '[2026-07-08 13:39:08: 이승규 선임 문자 → 4조 전예찬 사원 이승규 선임 메신저 재전달 확인]',
    ),
    {
      adminSourceText: '[2026-07-08 13:39:08: 이승규 선임 문자',
      ignoredRedirectText:
        '→ 4조 전예찬 사원 이승규 선임 메신저 재전달 확인]',
    },
  );

  assert.equal(
    excludeRedirectSection('김철수 과장 → 이영희 대리 확인').ignoredRedirectText,
    '',
  );

  assert.deepEqual(
    excludeRedirectSection(
      '김철수 과장 -> 이영희 대리 → 박민수 선임 메신저 재전달 확인',
    ),
    {
      adminSourceText: '김철수 과장 -> 이영희 대리',
      ignoredRedirectText: '→ 박민수 선임 메신저 재전달 확인',
    },
  );
});

test('재전달 제외 구간의 담당자는 후보에 포함하지 않는다', () => {
  const [row] = parsePersistentEventRows(
    '1일 16시간 57분\t하이엠솔루텍\tHIMSWHIRUN02V\t/logs001 (Filesystem) Utilization MAJOR occurred(80.02 %)[2026-07-08 13:39:08: 이승규 선임 문자 → 4조 전예찬 사원 7/9 14:20 이승규 선임 메신저 재전달 확인 UserName : 김도형 UserID : A81549]\t2026-07-08 13:22:28\t156.147.36.89',
  );

  assert.deepEqual(
    row.adminCandidates.map(({ label }) => label),
    ['이승규 선임'],
  );
  assert.equal(row.occurrenceAt, '2026-07-08 13:22:28');
  assert.equal(row.data.ip, '156.147.36.89');
});

test('기본 담당자 미검출 시 재전달 이력에서 담당자를 보조 추출한다', () => {
  const [row] = parsePersistentEventRows(
    '1일\t그룹\tHOST-FALLBACK\t경고 [2026-07-08 13:39:08: 확인 → 박상원 선임 메신저 재전달 확인]\t2026-07-08 13:22:28\t10.0.0.8',
  );

  assert.deepEqual(
    row.adminCandidates.map(({ label }) => label),
    ['박상원 선임'],
  );
  assert.deepEqual(row.selectedAdmins, ['박상원 선임']);
  assert.equal(row.usedRedirectFallback, true);
  assert.match(row.adminSourceText, /박상원 선임 메신저 재전달/u);
});

test('재전달 앞에 s, r, w만 있으면 재전달 구간에서 담당자를 추출한다', () => {
  const cases = [
    {
      marker: 's',
      redirectText: '→ 2조 정유희 사원 7/6 메신저 재전달 확인]',
      expectedAdmin: '정유희 사원',
    },
    {
      marker: 'r',
      redirectText: '-> LGEVH 메일 재전달 확인]',
      expectedAdmin: 'LGEVH',
    },
    {
      marker: 'w',
      redirectText: '> cicop 메신저 재전달 확인]',
      expectedAdmin: 'cicop',
    },
  ];

  cases.forEach(({ marker, redirectText, expectedAdmin }, index) => {
    const confirmationText =
      `[2026-07-08 13:39:08: ${marker} ${redirectText}`;
    const redirectResult = excludeRedirectSection(confirmationText);

    assert.equal(redirectResult.ignoredRedirectText, '');
    assert.equal(
      redirectResult.adminSourceText,
      redirectText.replace(/^(?:->|→|>)\s*/u, ''),
    );

    const [row] = parsePersistentEventRows(
      `1일\t그룹\tHOST-${index}\t경고 ${confirmationText}\t2026-07-08 13:22:28\t10.0.0.${index + 1}`,
    );

    assert.deepEqual(
      row.adminCandidates.map(({ label }) => label),
      [expectedAdmin],
    );
  });
});

test('영문 코드와 메일 조합을 해외 담당자로 우선 추출한다', () => {
  assert.deepEqual(
    extractMailAdminKeywords(
      '[2026-07-08 13:39:08: 이승규 선임 확인 후 LGERA 메일, LGMHP메일, LGERS 메일 전달]',
    ).map(({ label }) => label),
    ['LGERA', 'LGMHP', 'LGERS'],
  );

  const [row] = parsePersistentEventRows(
    '01:00:00\t해외법인\tHOST-02\tDisk warning [2026-07-26 18:10:00: 이승규 선임 확인 후 LGERA 메일 전달]\t2026-07-25 18:00:00\t10.0.0.2',
  );

  assert.deepEqual(
    row.adminCandidates.map(({ label }) => label),
    ['LGERA'],
  );
  assert.deepEqual(row.selectedAdmins, ['LGERA']);
});

test('이름과 직급 뒤의 문자 및 메신저 표기를 모두 허용한다', () => {
  assert.deepEqual(
    extractAdminCandidates(
      '김철수 선임 메신저, 이영희 책임 문자, 박민수 선임 문자/메신저',
    ).map(({ label }) => label),
    ['김철수 선임', '이영희 책임', '박민수 선임'],
  );
});

test('지정된 메신저 수신자 키워드를 근무자보다 우선 추출한다', () => {
  assert.deepEqual(
    extractMessengerAdminKeywords(
      '김철수 선임 확인 후 cicop, 해외클라우드 메신저, INFRA',
    ).map(({ label }) => label),
    ['cicop', '해외클라우드운영', 'infra'],
  );

  assert.deepEqual(
    extractMessengerAdminKeywords('cicop 확인, 해외클라우드운영 메신저, infra').map(
      ({ label }) => label,
    ),
    ['cicop', '해외클라우드운영', 'infra'],
  );

  const [row] = parsePersistentEventRows(
    '01:00:00\t해외법인\tHOST-03\tDisk warning [2026-07-26 18:10:00: 김철수 선임 확인 후 cicop]\t2026-07-25 18:00:00\t10.0.0.3',
  );

  assert.deepEqual(
    row.adminCandidates.map(({ label }) => label),
    ['cicop'],
  );
});

test('메일 담당자와 해외클라우드가 함께 있으면 해외클라우드를 제외한다', () => {
  const [row] = parsePersistentEventRows(
    '01:00:00\t해외법인\tHOST-05\tDisk warning [2026-07-26 18:10:00: 해외클라우드운영 메신저 및 LGMHP 메일 전달]\t2026-07-25 18:00:00\t10.0.0.5',
  );

  assert.deepEqual(
    row.adminCandidates.map(({ label }) => label),
    ['LGMHP'],
  );
});

test('해외 담당자 별칭을 TRAN VAN SON, Peter로 통일한다', () => {
  const aliases = [
    'TRAN VAN SON, Peter 메신저',
    'TRAN VAN SON 메신저',
    'NGUYEN DUC ANH 메신저',
  ];

  aliases.forEach((alias) => {
    assert.deepEqual(
      extractMessengerAdminKeywords(`담당자 ${alias} 전달`).map(
        ({ label }) => label,
      ),
      ['TRAN VAN SON, Peter'],
    );
  });

  assert.deepEqual(
    extractMessengerAdminKeywords(
      'TRAN VAN SON 메신저, NGUYEN DUC ANH 메신저',
    ).map(({ label }) => label),
    ['TRAN VAN SON, Peter'],
  );
});

test('infra의 DBA 괄호 담당자를 실제 담당자로 사용한다', () => {
  assert.deepEqual(
    extractDbaAdminCandidates(
      'infra 확인 (DBA 김철수 선임, 이영희 책임)',
    ).map(({ label }) => label),
    ['김철수 선임', '이영희 책임'],
  );

  const [row] = parsePersistentEventRows(
    '01:00:00\tDB\tHOST-DB\tTablespace warning [2026-07-26 18:10:00: infra (dba 김철수 선임) 메신저 확인]\t2026-07-25 18:00:00\t10.0.0.10',
  );

  assert.deepEqual(
    row.adminCandidates.map(({ label }) => label),
    ['김철수 선임'],
  );
  assert.deepEqual(row.selectedAdmins, ['김철수 선임']);
});

test('재전달 제외 범위의 메신저 수신자 키워드는 무시한다', () => {
  const [row] = parsePersistentEventRows(
    '01:00:00\t해외법인\tHOST-04\tDisk warning [2026-07-26 18:10:00: 김철수 선임 문자 → cicop 메신저 재전달 확인]\t2026-07-25 18:00:00\t10.0.0.4',
  );

  assert.deepEqual(
    row.adminCandidates.map(({ label }) => label),
    ['김철수 선임'],
  );
});

test('내용 내부의 탭과 줄바꿈을 한 행으로 자동 복구한다', () => {
  const rows = parsePersistentEventRows(
    [
      '1일 16시간 57분\t하이엠솔루텍\tHOST-01\t/logs001\t(Filesystem) Utilization',
      'MAJOR occurred [2026-07-08 13:39:08: 이승규 선임 확인]\t2026-07-08 13:22:28\t156.147.36.89',
      '2일\t그룹2\tHOST-02\tCPU warning [2026-07-09 10:00:00: 김철수 책임 확인]\t2026-07-09 09:00:00\t10.0.0.2',
    ].join('\n'),
  );

  assert.equal(rows.length, 2);
  assert.equal(
    rows[0].cleanContent,
    '/logs001 (Filesystem) Utilization\nMAJOR occurred',
  );
  assert.equal(rows[0].occurrenceAt, '2026-07-08 13:22:28');
  assert.equal(rows[0].data.ip, '156.147.36.89');
  assert.equal(rows[0].wasRecovered, true);
  assert.equal(rows[0].physicalLineCount, 2);
  assert.equal(rows[0].extraContentColumns, 1);
  assert.equal(rows[1].wasRecovered, false);
});

test('IP 뒤의 빈 탭을 제거하고 줄바꿈이 있는 여러 행을 분리한다', () => {
  const rows = parsePersistentEventRows(
    [
      '4일 21시간 25분\tLG전자>LG전자상암>GROUP_B>EDW\tLGEDWDBSE5Q\t/p36data4 (Filesystem) Utilization MAJOR occurred(98.11 %)[2026-07-05 09:05:14: 김정원 책임 문자 → 2조 정유희 사원 7/6 14:43 김정원 책임 메신저 재전달',
      ' 확인 UserName : 김도형 UserID : A81549]\t2026-07-05 08:54:04\t165.243.166.85\t',
      '4일 19시간 34분\tLG전자>LG전자상암>CTOSW>EnCloud\tLGEACTOGIT4V\t/data001 Utilization MAJOR occurred(96.29 %)[2026-07-05 11:07:14: 전상용 책임 문자만 → 2조 정유희 사원 전상용 책임 문자 재전달',
      ' 확인 UserName : 전예찬 UserID : A103875]\t2026-07-05 10:44:56\t10.185.66.26\t',
    ].join('\n'),
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].data.host, 'LGEDWDBSE5Q');
  assert.equal(rows[0].occurrenceAt, '2026-07-05 08:54:04');
  assert.equal(rows[0].data.ip, '165.243.166.85');
  assert.deepEqual(
    rows[0].adminCandidates.map(({ label }) => label),
    ['김정원 책임'],
  );
  assert.equal(rows[1].data.host, 'LGEACTOGIT4V');
  assert.equal(rows[1].occurrenceAt, '2026-07-05 10:44:56');
  assert.equal(rows[1].data.ip, '10.185.66.26');
  assert.deepEqual(
    rows[1].adminCandidates.map(({ label }) => label),
    ['전상용 책임'],
  );
});

test('IP 뒤의 예상하지 않은 값을 제외하고 다음 행을 정상 분리한다', () => {
  const rows = parsePersistentEventRows(
    [
      '8일 22시간 3분\tLG전자>LG전자해외>해외_생산>GMES>VH_베트남\tVHDGMES2\t/alt_inst/isc (Filesystem) Is Mounted MAJOR occurred("false")[2026-07-01 08:17:36: LGEVH 메일 확인]\t2026-07-01 08:16:14\t10.224.5.26\tfalse',
      '8일 21시간 43분\tLG전자>LG전자해외>해외_생산>해외_APIC>LGEIN\tINEPTE@LGEINMESJK1M\tINEPTE ORACLE_INEPTE (Oracle) Connected DOWN occurred("false")[2026-07-01 08:35:19: LGEIN 메일 확인]\t2026-07-01 08:36:41\t150.150.242.4',
    ].join('\n'),
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].occurrenceAt, '2026-07-01 08:16:14');
  assert.equal(rows[0].data.ip, '10.224.5.26');
  assert.equal(rows[0].ignoredTrailingColumns, 1);
  assert.equal(rows[0].wasRecovered, true);
  assert.equal(rows[1].data.host, 'INEPTE@LGEINMESJK1M');
  assert.equal(rows[1].occurrenceAt, '2026-07-01 08:36:41');
  assert.equal(rows[1].data.ip, '150.150.242.4');
});

test('변경된 열 순서에서도 내용 앞뒤의 안정 필드를 기준으로 복구한다', () => {
  const customOrder = [
    'group',
    'content',
    'ip',
    'duration',
    'occurredAt',
    'host',
  ];
  const [row] = parsePersistentEventRows(
    [
      '그룹1\tDisk warning\t추가 설명',
      '처리 계속 [2026-07-08 13:39:08: 김철수 책임 확인]\t10.0.0.1\t1일\t2026-07-08 13:22:28\tHOST-01',
    ].join('\n'),
    customOrder,
  );

  assert.equal(row.cleanContent, 'Disk warning 추가 설명\n처리 계속');
  assert.equal(row.data.host, 'HOST-01');
  assert.equal(row.data.ip, '10.0.0.1');
  assert.equal(row.occurrenceAt, '2026-07-08 13:22:28');
  assert.equal(row.wasRecovered, true);
});

test('직접 입력한 발생일시를 유지하고 복수 담당자를 행으로 펼친다', () => {
  const [row] = parsePersistentEventRows(
    '01:00:00\tWAS\tHOST-01\tDisk warning [2026-07-26 18:10:00: 정민규 책임 / 홍길동 선임 확인]\t2026-07-25 18:00:00\t10.0.0.1',
  );

  assert.equal(row.occurrenceAt, '2026-07-25 18:00:00');
  assert.equal(row.cleanContent, 'Disk warning');
  assert.deepEqual(row.selectedAdmins, []);

  row.selectedAdmins = row.adminCandidates.map(({ label }) => label);
  assert.deepEqual(expandRowsForExcel([row]), [
    {
      no: 1,
      occurredAt: '2026-07-25 18:00:00',
      duration: '01:00:00',
      admin: '정민규 책임',
      host: 'HOST-01',
      content: 'Disk warning',
      ip: '10.0.0.1',
      group: 'WAS',
    },
    {
      no: 2,
      occurredAt: '2026-07-25 18:00:00',
      duration: '01:00:00',
      admin: '홍길동 선임',
      host: 'HOST-01',
      content: 'Disk warning',
      ip: '10.0.0.1',
      group: 'WAS',
    },
  ]);
});

test('엑셀 제외로 지정한 행은 출력 데이터에서 제거한다', () => {
  const [row] = parsePersistentEventRows(
    '01:00:00\tWAS\tHOST-EXCLUDED\tDisk warning [2026-07-26 18:10:00: 김철수 책임 확인]\t2026-07-25 18:00:00\t10.0.0.9',
  );
  row.excluded = true;

  assert.deepEqual(expandRowsForExcel([row]), []);
});

test('생성한 XLSX에 자동 필터와 데이터가 포함된다', () => {
  const workbook = createPersistentEventWorkbook([
    {
      no: 1,
      occurredAt: '2026-07-26 18:00:00',
      duration: '2일 3시간',
      admin: '정민규 책임',
      host: 'HOST-01',
      content: 'Disk & CPU warning',
      ip: '10.0.0.1',
      group: 'WAS',
    },
  ]);
  const files = unzipSync(workbook);
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);

  assert.match(sheet, /<autoFilter ref="A1:H2"\/>/);
  assert.match(sheet, /정민규 책임/u);
  assert.match(sheet, /Disk &amp; CPU warning/u);
});
