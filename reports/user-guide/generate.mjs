import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';
import { services } from './services.mjs';

const root = fileURLToPath(new URL('./', import.meta.url));
const { results } = JSON.parse(await readFile(`${root}results.json`, 'utf8'));
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const p = text => `<p>${text}</p>`;
const h = text => `<h3>${text}</h3>`;
const steps = items => `<ol>${items.map(x => `<li>${x}</li>`).join('')}</ol>`;
const note = text => `<aside>${text}</aside>`;
const code = text => `<pre>${esc(text)}</pre>`;
const table = (heads, rows) => `<table><thead><tr>${heads.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const shot = (file, caption, height = 380) => `<figure><img src="screenshots/${file}.png" style="max-height:${height}px" alt="${esc(caption)}"><figcaption>${caption} · 로컬 서비스 실제 실행 화면 / 가상 데이터</figcaption></figure>`;
let pages = [];
const add = (chapter, title, intro, content) => pages.push({ chapter, title, intro, content });
add('USER GUIDE · 2026.09', '반복 업무를 줄이는<br>운영 지원 서비스', 'Operation CNS Elect 사용자 설명서',
  `<div class="cover-block">입력 → 확인 → 복사·파일 저장</div>` +
  p('모니터링 메시지 정리부터 메일 작성, 백업 오류 추출, 아이체크 편집·보고까지.<br>처음 사용하는 팀원도 예시를 따라 실행할 수 있도록 구성했습니다.') +
  table(['대상', '안내'], [['사용 부서', 'LG CNS 전자/제조시스템 OP팀(엔텍정보통신)'], ['문서 기준', '2026.09.09 · 메뉴 순서 변경 반영 로컬 코드'], ['포함 범위', '현재 메뉴의 6개 기능 / 입력·결과 예시 / 실제 화면'], ['데이터 처리', '이 설명서의 6개 기능은 브라우저에서 데이터를 가공합니다. 입력 데이터를 처리·보관하는 별도 서버·DB를 사용하지 않습니다.'], ['접속', '<a href="https://stupendous-stardust-bd8168.netlify.app/">stupendous-stardust-bd8168.netlify.app</a>'], ['소스 코드', '<a href="https://github.com/chipmunk-dev/Operation-entec">github.com/chipmunk-dev/Operation-entec</a>']]) +
  note('웹사이트 접속에는 호스팅 서버가 사용됩니다. 브라우저 임시 저장과 사용자가 내려받은 파일은 남을 수 있습니다. 본 문서는 로컬 검증본이며 배포 반영 여부는 별도 확인하세요.') +
  p('<small>실제 운영 로그·개인정보는 수록하지 않았습니다. 모든 예시의 서버·IP·담당자는 가상 값입니다.<br>문의: wldns0622@cnspartner.com</small>'));

add('시작하기', '어떤 메뉴를 사용하면 되나요?', '필요한 결과물에 따라 메뉴를 선택하세요.',
  table(['메뉴 순서', '사용 목적', '설명 페이지'], [
    ['1. 해외메일 작성', '이벤트 여러 건을 영문 안내 메일로 정리', '4–5'],
    ['2. G-EMS 메세지', '확인 이력 제거 또는 메신저 보고 양식 생성', '6–7'],
    ['3. 지속 이벤트 재전달', '지속 중인 이벤트를 골라 재전달 문구 생성', '8–10'],
    ['4. 자동 백업 에러', '백업존별 오류만 추출하여 Outlook 표·TXT 생성', '11–12'],
    ['5. 아이체크 내역 편집/보고', '점등·소등 엑셀 편집 및 담당자별 보고', '13–16'],
    ['6. 지속 메시지 엑셀 추출', '담당자를 검토해 정리된 엑셀 내려받기', '17–18'],
    ['공통 입력·저장 안내', '탭 구분, 줄바꿈, 저장 및 개인정보 주의', '3'],
    ['문제 해결 / 실습 파일', '결과가 다를 때 확인할 항목 / 연습 자료', '19–20']]) +
  h('메뉴 변경 안내') + p('지속 이벤트 재전달이 자동 백업 에러보다 위에 배치됩니다. 점등 내역 편집은 별도 메뉴가 아니라 아이체크 통합 화면에서 사용합니다.') +
  h('공통 작업 흐름') + steps(['필요한 메뉴를 열고 상단의 <b>사용방법</b>을 확인합니다.', '원본의 열 순서를 확인한 뒤 데이터 범위를 복사하여 붙여넣습니다.', '입력 건수·경고·미리보기·담당자를 확인합니다.', '결과를 복사해 업무 도구에 붙여넣거나 파일로 저장합니다.']) +
  note('복사·전달 완료 버튼은 실제 메일이나 메신저를 보내지 않습니다. 대상과 내용을 확인한 후 업무 도구에서 직접 발송하세요.'));

add('공통 사용법', '입력 형식과 저장 범위를 먼저 확인', '복사한 표의 열 구분은 탭(Tab), 여러 행의 구분은 줄바꿈입니다.',
  table(['기능', '기본 입력 열 순서'], [['해외메일', 'Host → Message → Date → IP (4열)'], ['G-EMS', 'Host → Message (2열)'], ['지속 이벤트 재전달', 'Host → Event → Date → IP (4열)'], ['자동 백업 에러', 'Status 1열 / Policy 6열 / Start Time 7열'], ['아이체크 붙여넣기', 'A~M 13열 전체 (15페이지 이후 설명 참고)'], ['지속 메시지 엑셀', '지속시간 → 그룹명 → 호스트 → 내용 → 발생일시 → IP (6열)']]) +
  h('줄바꿈·탭이 들어간 이벤트') + p('해외메일과 지속 이벤트 재전달은 Message/Event 안에 섞인 탭·줄바꿈을 복구하여 한 줄로 정리합니다. 복구 안내와 Host·Date·IP를 반드시 확인하세요. 임의의 손상된 입력까지 모두 복구되는 것은 아닙니다.') +
  p('G-EMS 입력은 줄 단위로 처리합니다. 메시지 안의 실제 줄바꿈이 있으면 붙여넣기 전에 한 이벤트를 한 줄로 정리하세요. 화면 폭 때문에 자동으로 꺾여 보이는 줄은 실제 줄바꿈과 다릅니다.') +
  h('브라우저에 남는 정보') + table(['구분', '기억되는 내용 / 주의'], [['G-EMS', '보고자 이름·출력 모드는 12시간 보관됩니다.'], ['백업 오류', '백업존 입력·열 설정 등 초안은 7일 임시 보관됩니다.'], ['아이체크', '일부 화면 설정은 7일 보관되지만 업로드 파일·편집 중 데이터는 별도 저장해야 합니다.'], ['그 외 작업', '이동·새로고침 전에 결과를 복사하거나 파일로 저장하세요. 임시 저장을 업무 기록 보관소로 사용하지 마세요.']]) +
  note('PDF에서 복사하면 탭이 공백으로 변할 수 있습니다. 정확한 실습에는 함께 제공한 samples/*.txt를 UTF-8로 열어 전체 복사하세요. 실제 로그는 회사의 보안·반출 기준에 맞게 취급하세요.'));

add('01 · 해외메일 작성', '이벤트를 영문 메일로 변환', '수동으로 Host·IP·발생시각을 재조립하지 않고 여러 건을 한 번에 정리합니다.',
  steps(['모니터링 표에서 Host, Message, Date, IP를 복사합니다.', '필요하면 <b>열 순서 설정</b>에서 실제 원본 순서로 맞춥니다.', '<b>mail.txt</b>의 전체 내용을 원본 입력란에 붙여넣습니다.', '2건이 인식되고 두 서버·IP가 대응하는지 확인합니다.']) +
  shot('02-mail-order-panel-0', '열 순서 설정 및 데이터 입력', 480) +
  note('예시의 두 번째 Message에는 실제 줄바꿈과 탭이 있습니다. 결과는 “/data (Filesystem) Utilization MAJOR occurred(92 %)” 한 줄이어야 합니다.'));

add('01 · 해외메일 작성', '결과 확인 후 메일에 붙여넣기', '확인 이력·담당자 메모는 빠지고 이벤트 본문과 4개 필드가 남습니다.',
  h('입력 예시 · 1건 (→는 열 구분 표시)') + code('DEMO-WEB-01 → CPU Utilization MAJOR occurred(91 %)\n  [2026-09-09 09:00:00: 김예시 책임 문자 확인 UserName : 홍예시 UserID : DEMO]\n→ 2026-09-09 09:00:00 → 192.0.2.10') +
  h('실제 복사 결과 · 2건') + code(results.mail) +
  steps(['<b>메일 전체 복사</b>를 누릅니다.', '메일 본문에 붙여넣고 수신자·제목·서버를 검토합니다.', 'Date의 “Base On Korea Time” 표기를 확인하고 발송합니다.']) +
  note('메일 주소나 제목은 자동으로 지정되지 않습니다. 출력의 한국시간 안내 문구가 입력 시간을 변환해 주는 것은 아니므로 원본 시각 기준을 확인하세요.'));

add('02 · G-EMS 메세지', '불필요한 확인 이력을 제거', '메시지 전달 전에 담당자 메모를 하나씩 지우는 작업을 줄입니다.',
  steps(['Host와 Message 두 열을 복사합니다. 한 이벤트는 한 줄이어야 합니다.', '<b>gems.txt</b>를 붙여넣습니다.', '<b>확인 내역만 제거</b> 모드를 선택합니다.', 'Host와 이벤트는 남고 날짜로 시작하는 확인 로그가 제거되는지 확인합니다.']) +
  shot('03-gems-clean-panel-1', 'Host·Message 두 열 입력', 240) + shot('03-gems-clean-panel-2', '확인 내역 제거 결과', 260) +
  note('본문의 일반 대괄호 문구가 모두 삭제되는 기능은 아닙니다. 결과에 담당자나 UserName 등이 남아 있다면 원본 확인 로그 형식과 결과를 직접 검토하세요.'));

add('02 · G-EMS 메세지', '보고자 인사말까지 자동 완성', '같은 데이터로 팀원 간 메신저 보고 양식을 맞춥니다.',
  steps(['<b>메신저 보고 양식 자동완성</b> 모드를 선택합니다.', '보고자 이름을 홍예시, 직급을 사원으로 지정합니다.', '인사말·서버별 본문을 확인한 뒤 결과를 복사합니다.']) +
  shot('04-gems-report-panel-0', '보고 양식 모드·보고자 설정', 280) +
  h('실제 결과') + code(results.gems) +
  note('보고 모드에서 이름이 비어 있으면 복사할 수 없습니다. 저장된 이전 근무자의 이름이 남아 있지 않은지 확인하세요.'));

add('03 · 지속 이벤트 재전달', '재전달할 이벤트를 골라 담기', '원본 목록에서 전달 대상과 보류 대상을 구분합니다.',
  steps(['보고자 이름·조·직급을 입력하고 원본의 4열 순서를 맞춥니다.', '<b>redirect.txt</b>를 원본 데이터에 붙여넣습니다.', 'DEMO-WEB-01과 DEMO-DB-01 카드의 <b>전달 추가</b>를 각각 누릅니다.', '두 카드가 선택된 상태를 유지하고 <b>추가 취소</b>로 바뀌는지 확인합니다.', 'DEMO-HOLD-01은 s / skip 메모가 있으므로 업무 기준에 따라 보류 여부를 검토합니다.']) +
  shot('05-redirect-panel-4', '서버명을 확인하여 두 건 선택', 440) +
  note('표시 순서에만 의존하지 말고 서버명을 보고 선택하세요. 원본을 다시 입력하거나 열 순서를 바꾸면 선택·처리 상태가 초기화됩니다.'));

add('03 · 지속 이벤트 재전달', '국내·해외 전달 양식 선택', '선택한 이벤트만 현재 전달 형식에 맞게 출력합니다.',
  table(['전달 형식', '사용처'], [['국내 메신저', '한국어 인사말 + 서버·내용'], ['해외 메신저', 'Resend 표기 + host·message'], ['해외메일', '영문 안내문 + Date·IP·Host·Message']]) +
  shot('06-redirect-output', '국내 메신저 출력 패널', 330) +
  h('실제 복사 결과') + code(results.redirect) +
  p('<b>전체 복사</b>를 누른 뒤 실제 메신저에 붙여넣습니다. 수신자는 자동 지정되지 않습니다.'));

add('03 · 지속 이벤트 재전달', '확인 완료와 전달 완료의 차이', '상태는 작업 관리용이며 외부 시스템의 처리 상태와 자동 연동되지 않습니다.',
  table(['조작', '화면에서 일어나는 일'], [['전달 추가 / 추가 취소', '전달 문구에 포함하거나 제외합니다.'], ['확인 완료', '확인된 목록으로 이동하고 현재 전달 출력에서 빠집니다.'], ['전달 완료 / 완료 취소', '확인된 목록에서 완료 표시를 바꿉니다. 실제 발송은 하지 않습니다.'], ['대기로 복구', '확인된 항목을 대기 목록으로 되돌립니다.'], ['특이사항 제외', '검토 후 선택한 보류 항목을 처리합니다. s/skip 발견만으로 자동 삭제되지는 않습니다.']]) +
  shot('07-redirect-mail', '해외메일 출력 예시', 400) +
  h('처리 이력 복사 시 주의') + p('확인된 항목의 이력에는 입력한 조·이름·직급과 작업 시점의 날짜가 사용됩니다. 원본 포함/괄호 제거 결과가 보이면 각각 내용을 읽고 필요한 문구만 복사하세요.') +
  note('s, r, w 같은 약어만으로 장애 해소나 재전달 가능 여부를 판단하지 마세요. 실제 담당자의 지시와 보류 조건을 확인해야 합니다.'));

add('04 · 자동 백업 에러', '백업존별 오류 행만 모으기', '수동으로 Status를 확인하고 정책명·시각을 옮기는 작업을 줄입니다.',
  steps(['실제 데이터를 가져온 백업존을 선택합니다: P-EUBKMST / NBUMASTER / EXTMASTER.', '<b>backup.txt</b>를 입력합니다. 기본값은 Status 1열, Policy 6열, Start Time 7열입니다.', '정상 제외·오류·입력 오류 건수를 확인합니다.', '다른 백업존도 같은 방법으로 입력합니다. 각 존의 입력은 분리됩니다.']) +
  table(['Status', 'Policy', '이 예시의 처리'], [['0', 'DEMO_SUCCESS', '오류 목록에서 제외'], ['1', 'DEMO_PARTIAL', '오류 목록에서 제외'], ['58', 'DEMO_DB_DAILY', '오류 목록에 포함'], ['84', 'DEMO_WEB_DAILY', '오류 목록에 포함']]) +
  shot('08-backup-panel-2', '4건 입력 후 오류 2건 추출', 360) +
  note('이 서비스는 Status 0과 1을 제외합니다. 특히 1을 업무상 별도 확인해야 하는 경우에는 원본에서 확인하세요. 빈 입력의 “에러 없음”은 백업 성공을 증명하지 않습니다.'));

add('04 · 자동 백업 에러', 'Outlook 보고와 TXT 보관', '오류 정책명·발생시각·Status를 일관된 순서로 전달합니다.',
  h('원본 9열 예시 · 열 번호로 읽기') + table(['열', '값'], [['1 / 2 / 3', '58 / Backup / Done'], ['4 / 5', 'DEMO-CLIENT / Full'], ['6', 'DEMO_DB_DAILY'], ['7', '2026-09-09 오전 9:00:00'], ['8 / 9', '00:03:00 / DEMO']]) +
  h('실제 복사 결과 · 텍스트 표현') + code(results.backup) +
  steps(['<b>Outlook 행 복사</b>를 눌러 보고 표에 붙여넣습니다. 지원 환경에서는 표 서식이 함께 복사됩니다.', '표가 맞지 않으면 Policy·RIC 시간·특이사항의 <b>묶음 복사</b>를 각각 사용합니다.', '보관이 필요하면 <b>메모장으로 내보내기</b>로 세 백업존의 오류를 TXT로 저장합니다.', '공용 PC에서는 작업 후 데이터 관리 영역의 삭제 기능을 확인합니다.']) +
  note('기본 설정에서는 최소 7열이 필요합니다. 열을 변경했다면 지정한 가장 뒤쪽 열까지 포함해야 합니다. 잘못된 행이나 인식되지 않은 시간 경고가 있으면 원본과 대조하세요.'));

add('05 · 아이체크 내역 편집/보고', '파일 편집과 보고를 한 화면에서', '기존 엑셀을 기준으로 새 점등·소등 차이를 계산합니다.',
  steps(['원본 엑셀을 복사해 백업합니다. 먼저 <b>eyecheck-practice.xlsx</b>로 연습하세요.', '통합 화면에서 파일을 엽니다. 이 실습 파일은 최소 구성의 가상 연습용 파일입니다.', '<b>내역 편집</b> 탭에서 기존 내역과 점등장비를 확인합니다.', '업무 파일은 전자_Eyecheck·점등장비·소등장비 등 필요한 시트와 인식 상태를 확인합니다. 경고를 무시하고 저장하지 마세요.']) +
  shot('11-eyecheck-open', '연습 엑셀을 연 초기 상태', 470) +
  note('연습 파일은 운영 양식의 완전한 대체물이 아닙니다. 파일 비교의 기준은 최초로 연 원본입니다. 아직 편집하지 않았다면 변경 보고는 0건입니다.'));

add('05 · 아이체크 내역 편집/보고', '신규 점등 2건, 소등 1건 입력', '층별 입력과 소등 행 선택을 함께 사용합니다.',
  steps(['3층의 새로 켜진 자리에 <b>A-3(2)</b>를 입력합니다. 동일 위치의 장비 2건을 뜻합니다.', '소등 목록에서 <b>3행 / TEST-HOST-01 / SA3A-1</b>을 선택합니다.', '미리보기에서 기존 2건 + 신규 2건 − 소등 1건 = 최종 3건인지 확인합니다.', '<b>담당자 보고</b> 탭으로 이동합니다. 신규 2 · 소등 1 · 보고 선택 3이 기대값입니다.']) +
  shot('12-eyecheck-edit-panel-4', '신규 위치 A-3(2) 입력', 280) + shot('12-eyecheck-edit-panel-5', '기존 장비 소등 선택', 210) +
  note('A-1,2,3은 A-1·A-2·A-3입니다. 소등은 기존 장비 목록에서 정확한 행을 고르세요. 층별 텍스트만 바꾸는 작업과 장비 데이터의 실제 변경 보고는 같지 않습니다.'));

add('05 · 아이체크 내역 편집/보고', '누락 정보 보완 → 보고 → 저장', '담당자별 문구를 생성한 후 엑셀 반영 결과까지 확인합니다.',
  steps(['보고자 이름을 <b>홍예시</b>로 지정합니다.', '신규 두 장비의 호스트를 NEW-HOST-01, NEW-HOST-02로 입력합니다. 담당자는 모두 <b>테스트 책임</b>으로 입력합니다.', '신규·소등이 올바른 담당자에게 묶였는지 확인하고 <b>문구 복사</b>를 누릅니다.', '<b>새 파일로 내려받기</b>로 저장하고 원본과 비교합니다. 실습 결과 파일은 eyecheck-result.xlsx입니다.']) +
  `<div style="display:flex;gap:12px;align-items:flex-start">${shot('13-eyecheck-fields', '신규 정보 보완', 410)}${shot('13-eyecheck-output', '담당자별 실제 보고 결과', 410)}</div>` +
  note('저장 전 신규 장비의 호스트·담당자 보완은 엑셀 C/L열에 반영됩니다. 기존 장비나 저장 후 장비의 보고용 수정은 원본 엑셀 수정과 다릅니다. 보고 문구 수정만으로 원본 값이 바뀌었다고 생각하지 마세요.') +
  p('저장 후에도 최초 원본 대비 신규 2·소등 1 비교가 유지됩니다. 다른 파일을 열면 비교 기준이 초기화됩니다. 변경 없는 기존 장비는 “변경 없는 기존 장비도 표시”에서 재보고 대상으로 별도 선택할 수 있습니다.'));

add('05 · 아이체크 내역 편집/보고', '파일 없이 보고 문구만 만들기', '“붙여넣기로 보고”는 파일 차이 계산이 아니라 붙여넣은 행으로 보고합니다.',
  steps(['<b>담당자 보고 → 붙여넣기로 보고</b>를 선택합니다.', '<b>icheck.txt</b>의 13열 데이터를 붙여넣습니다.', '보고자 이름·직급을 확인하고 담당자별 결과를 복사합니다. 이 예시는 장비 2건·담당자 2명입니다.']) +
  table(['열', '필드 / 예시'], [['A·B', '확인일 2026-09-09 / 고객사 DEMO'], ['C·D', '호스트 DEMO-WEB-01 / 위치 SA3A-1'], ['E·F·G·H', '제조사 DEMO / 유형 Server / 모델 MODEL-A / 기타값 -'], ['I·J·K', '점등상태 주황 점등 / 근무조 1조 / 확인근무자 홍예시'], ['L·M', '서버담당자 김예시 책임 / 내역 확인 요청']]) +
  shot('14-eyecheck-paste-panel-2', '13열 데이터에서 담당자별 보고 생성', 370) +
  note('필수 확인 열은 C 호스트·D 위치·I 상태·L 담당자입니다. 중간의 빈 열을 삭제하지 말고 A~M 전체를 복사하세요. 완전히 동일한 중복 행은 보고에서 중복 제거될 수 있습니다.'));

add('06 · 지속 메시지 엑셀 추출', '담당자를 자동 판독하고 검토', '오래된 메시지를 담당자·서버 기준으로 정리해 엑셀로 추출합니다.',
  steps(['6열 순서를 확인하고 <b>persistent.txt</b>를 붙여넣습니다.', '1행은 김예시 책임이 자동 판독됩니다.', '2행의 후보 <b>김예시 책임</b>과 <b>이예시 선임</b>을 모두 선택한 후 <b>선택 완료</b>를 누릅니다.', '3행 담당자 직접 입력에 <b>박예시 책임</b>을 적고 Enter 또는 <b>담당자 확정</b>을 누릅니다.']) +
  shot('09-excel-review-panel-1', '복수 담당자·미검출 항목 검토', 400) +
  note('입력란에 이름만 적어 두면 반영되지 않습니다. 반드시 확정하세요. 복수선택은 모두 고른 뒤 선택 완료를 눌러야 합니다. 자동 판독 후보가 실제 담당자와 맞는지도 직접 확인하세요.'));

add('06 · 지속 메시지 엑셀 추출', '입력 3건이 출력 4행이 되는 이유', '여러 담당자를 선택한 메시지는 담당자별로 한 행씩 확장됩니다.',
  table(['입력', '호스트', '확정 담당자', '출력 행 수'], [['1행', 'DEMO-SRV-01', '김예시 책임', '1'], ['2행', 'DEMO-SRV-02', '김예시 책임 + 이예시 선임', '2'], ['3행', 'DEMO-SRV-03', '박예시 책임', '1'], ['합계', '원본 3건', '담당자별 확장', '4']]) +
  shot('10-excel-result-panel-2', '검토 완료 후 엑셀 미리보기', 320) +
  steps(['미해결 담당자·복수선택 미확정·입력 오류가 없는지 확인합니다.', '<b>엑셀 파일 추출</b>을 눌러 저장합니다.', 'No.·발생일시·지속시간·어드민·호스트명·내용·IP·그룹명 8열을 확인합니다.']) +
  note('“입력 건수 − 제외 건수”가 항상 최종 엑셀 행 수와 같지는 않습니다. 복수 담당자 확장이 있기 때문입니다. 특이사항 일괄 제외를 누르기 전에 제외 대상부터 확인하세요.'));

add('문제 해결', '결과가 예상과 다를 때', '자동 결과를 그대로 보내기 전에 아래 항목을 점검하세요.',
  table(['증상', '확인 및 조치'], [
    ['입력 건수가 다름', '헤더·빈 줄 포함 여부와 실제 탭 구분을 확인합니다. Message/Event의 복구 안내도 확인합니다.'],
    ['Host·IP·Date가 뒤섞임', '원본의 열 순서와 화면 설정을 맞춥니다. PDF 복사 대신 동봉 TXT 또는 엑셀 범위를 사용합니다.'],
    ['복사가 안 됨', '보고자 이름·선택 대상·필수 정보 누락을 확인합니다. 브라우저 클립보드 권한을 확인하거나 결과를 직접 선택해 복사합니다.'],
    ['재전달 선택이 초기화됨', '작업 도중 원본을 다시 입력하거나 열 순서를 변경했는지 확인합니다. 입력을 확정한 후 대상 선택을 시작합니다.'],
    ['담당자가 없거나 틀림', '확인 이력의 이름·직급과 판독 범위를 확인합니다. 점(.) 앞 문구나 재전달 이력도 원본과 대조하고 직접 확정합니다.'],
    ['엑셀 추출 버튼이 비활성', '담당자 미해결·복수선택 미확정·입력 오류를 해결합니다. 전부 제외한 경우에도 추출할 수 없습니다.'],
    ['아이체크 보고가 0건', '원본과 실제 장비 차이가 있는지 확인합니다. 층별 문자열·날짜만 수정한 경우 장비 변경 보고가 없을 수 있습니다.'],
    ['아이체크 보고 정보 누락', '신규 장비의 호스트·담당자를 채웁니다. 보고자 이름과 보고 선택 상태를 확인합니다.'],
    ['원본 덮어쓰기를 못 함', '파일 접근 방식·브라우저 권한을 확인합니다. 불가능하면 새 파일로 내려받기를 사용하세요.'],
    ['백업 오류가 0건', '맞는 백업존인지, 입력이 비어 있지 않은지, Status 위치와 오류·정상 제외 건수를 확인합니다.'],
    ['백업 시간이 이상함', 'Start Time 열과 원본 날짜 형식을 확인합니다. 시간 경고가 있다면 보고 전에 수동으로 대조합니다.'],
    ['이전 화면과 다름', '배포 버전과 이 문서 기준을 확인합니다. 작업을 저장한 후 새로고침하세요.']]) +
  note('문의할 때 메뉴명·실행 순서·기대 결과·실제 결과를 함께 알려주세요. 원본 대신 서버명·IP·개인정보를 치환한 최소 예시를 전달하면 재현에 도움이 됩니다.'));

add('실습 및 마무리', '동봉 파일로 한 번씩 연습하기', '운영 데이터 없이 입력부터 결과 저장까지 확인할 수 있습니다.',
  table(['파일 (samples/)', '연습 내용 / 기대 결과'], [['mail.txt', '4열 / 이벤트 내부 탭·줄바꿈 포함 / 영문 메일 2건'], ['gems.txt', '2열 / 확인 로그 제거 / 메신저 문구 2건'], ['redirect.txt', '4열 / 3건 중 WEB·DB 2건 선택 / HOLD 검토'], ['backup.txt', '9열 / Status 0·1 제외 / 오류 2건'], ['eyecheck-practice.xlsx', '최소 구성 연습용 원본 / 기존 점등장비 2건'], ['eyecheck-result.xlsx', '실습 저장 결과 / 점등장비 3건 / 신규 정보 반영'], ['icheck.txt', 'A~M 13열 / 붙여넣기 보고 2건'], ['persistent.txt', '6열 / 단일·복수·미검출 담당자 각 1건'], ['persistent-result.xlsx', '검토 후 내려받은 실제 결과 / 데이터 4행']]) +
  h('발송·저장 전 최종 확인') + steps(['입력 건수와 제외·확장 후 결과 건수를 비교합니다.', '담당자·서버·IP·발생시각이 일치하는지 확인합니다.', '작업 보류·재전달 금지 문구가 있는지 확인합니다.', '보고자 이름·직급·조와 최종 수신자를 확인합니다.', '파일을 저장하고 업무 도구에 붙여넣은 최종 형태까지 확인합니다.']) +
  note('사용 설명서와 예시는 현재 로컬 코드로 검증했습니다. 실습 파일은 업무 원본에 덮어쓰지 마세요. 기능의 자동화는 내용 정리를 돕는 것이며 최종 판단·발송 책임을 대신하지 않습니다.') +
  p('<small>Operation CNS Elect · 사용자 설명서 2026.09<br>LG CNS 전자/제조시스템팀 · 문의 wldns0622@cnspartner.com</small>'));

// 각 서비스에 독립적인 기능 안내 페이지를 추가하고 모든 상세 페이지에
// 서비스명·색상·작업 단계·챕터 내 위치를 반복 표시합니다.
const expanded = [];
for (const entry of pages) {
  const service = services.find(item => item.chapter === entry.chapter);
  if (service && !expanded.some(item => item.service === service)) {
    expanded.push({
      chapter: service.chapter, title: service.name, intro: service.purpose, service, overview: true,
      content: h('01 · 언제 사용하는 페이지인가요?') + p(service.purpose) +
        table(['준비할 입력', '완성되는 결과'], [[service.input, service.output]]) +
        h('02 · 화면에서 제공하는 주요 기능') + table(['기능·조작 영역', '무엇을 하는 기능인가요?'], service.features) +
        h('03 · 비슷한 서비스와의 차이') + p(service.difference) +
        h('04 · 실습과 사용 시 주의사항') + p(`<b>실습 파일·기대 결과:</b> ${service.sample}`) + note(service.caution) +
        `<p class="service-route">메뉴 경로: ${service.name}<br>접속 경로: <a href="https://stupendous-stardust-bd8168.netlify.app${service.path}">${service.path}</a></p>`,
    });
  }
  expanded.push({ ...entry, service });
}
pages = expanded;
const chapters = services.map(service => {
  const indexes = pages.flatMap((entry, i) => entry.service === service ? [i] : []);
  indexes.forEach((index, localIndex) => {
    pages[index].stage = localIndex === 0 ? '기능 한눈에 보기' : service.stages[localIndex - 1];
    pages[index].chapterPage = `${localIndex + 1} / ${indexes.length}`;
  });
  return { number: service.number, name: service.name, start: indexes[0] + 1, end: indexes.at(-1) + 1 };
});
pages[1].content = table(['서비스 메뉴', '어떤 결과가 필요한가요?', '설명 페이지'], chapters.map((chapter, i) => [
  `<a href="#page-${chapter.start}">${chapter.number}. ${chapter.name}</a>`,
  services[i].output,
  `<a href="#page-${chapter.start}">${chapter.start}–${chapter.end}</a>`,
])) + h('서비스별로 읽는 순서') + p('각 서비스는 <b>기능 한눈에 보기 → 입력·조작 → 실제 결과·주의사항</b> 순서로 구성했습니다. 모든 페이지 상단에 서비스명과 현재 설명 단계를 표시합니다.') +
  h('서로 다른 업무를 구분하세요') + table(['업무 목적', '선택할 서비스'], [
    ['영문 메일 / 국내 메시지 정리', '해외메일 작성 / G-EMS 메세지'],
    ['지속 중인 건 재전달 / 장기 내역 파일 정리', '지속 이벤트 재전달 / 지속 메시지 엑셀 추출'],
    ['백업 오류 보고 / 서버실 점등·소등 기록', '자동 백업 에러 / 아이체크 내역 편집·보고'],
  ]) + p(`<b>공통 입력·저장 안내:</b> 3페이지 · <b>문제 해결·실습 파일:</b> ${pages.length - 1}–${pages.length}페이지`) +
  note('목차의 서비스명·페이지 번호를 클릭하면 해당 챕터로 이동합니다. 메뉴 순서는 지속 이벤트 재전달 다음 자동 백업 에러이며, 점등 내역 편집은 아이체크 통합 화면에서 사용합니다.');
const pastePage = pages.findIndex(entry => entry.title === '파일 없이 보고 문구만 만들기') + 1;
pages[2].content = pages[2].content.replace('15페이지 이후 설명 참고', `${pastePage}페이지 설명 참고`);
await writeFile(`${root}manifest.json`, JSON.stringify({ pageCount: pages.length, chapters }, null, 2));
const renderPage = (entry, index) => `<section class="page ${entry.service ? 'service-page' : ''}" style="--accent:${entry.service?.color || '#087a8d'}" id="page-${index + 1}">
  <header>${entry.service ? `<div class="service-heading"><span class="service-number">${entry.service.number}</span><strong>${entry.service.name}</strong><a href="#page-2">목차</a></div><div class="stage"><span>${entry.stage}</span><span>서비스 안내 ${entry.chapterPage}</span></div>` : entry.chapter}</header>
  <main><h1>${entry.title}</h1><p class="intro">${entry.intro}</p>${entry.content}</main><footer><span>LG CNS 전자/제조시스템팀 · 사용자 설명서</span><span>${String(index + 1).padStart(2, '0')} / ${pages.length}</span></footer></section>`;

const regular = (await readFile(process.env.GUIDE_FONT || '/tmp/eyecheck-browser-libs/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')).toString('base64');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Operation CNS Elect 사용자 설명서</title><style>
@font-face{font-family:Guide;src:url(data:font/ttf;base64,${regular})}*{box-sizing:border-box}body{margin:0;background:#e8edf3;color:#192b40;font-family:Guide,sans-serif;font-size:13px;line-height:1.65}.page{width:210mm;height:297mm;padding:15mm 16mm 17mm;margin:8mm auto;background:white;position:relative;break-after:page}.page:last-child{break-after:auto}header{font-size:10px;letter-spacing:1.4px;color:#087a8d;border-bottom:2px solid #1491a2;padding-bottom:7px;margin-bottom:20px}h1{font-size:27px;line-height:1.35;letter-spacing:-.6px;margin:0 0 12px}h3{font-size:15px;margin:18px 0 8px}.intro{color:#587185;margin:0 0 20px;font-size:14px}p{margin:10px 0}ol{padding-left:23px;margin:12px 0}li{padding:3px 0}b{color:#0a6980}table{width:100%;border-collapse:collapse;font-size:12px;margin:14px 0;table-layout:fixed}th{background:#eaf4f6;text-align:left;color:#096c7d}th,td{padding:8px 10px;border-bottom:1px solid #dce5ed;vertical-align:top;overflow-wrap:anywhere}aside{background:#fff5df;border-left:3px solid #dc9a23;padding:11px 14px;font-size:12px;margin:16px 0}pre{font-family:Guide,sans-serif;background:#f3f6fa;border:1px solid #dbe4ef;border-radius:6px;padding:12px;font-size:11px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0}figure{margin:18px 0 12px;text-align:center}figure img{max-width:100%;width:auto;height:auto;object-fit:contain;border:1px solid #dce5ed;border-radius:7px}figcaption{font-size:9px;color:#63798c;margin-top:5px}footer{position:absolute;bottom:9mm;left:16mm;right:16mm;border-top:1px solid #dce5ed;padding-top:6px;display:flex;justify-content:space-between;color:#657a8e;font-size:9px}a{color:#076e89;text-decoration:none}small{font-size:11px}.cover-block{background:#123246;color:#a6eced;border-radius:10px;padding:38px 24px;font-size:25px;margin:26px 0}.page:first-child h1{font-size:38px}.page:first-child .intro{font-size:20px}@page{size:A4;margin:0}@media print{body{background:white}.page{margin:0}}
.service-page{border-top:5px solid var(--accent);padding-top:10mm}.service-page header{border-color:var(--accent);letter-spacing:0;margin-bottom:16px}.service-heading{display:flex;align-items:center;gap:12px;color:var(--accent);font-size:19px;line-height:1.3}.service-number{padding:5px 9px;background:var(--accent);color:white;border-radius:5px;font-size:16px}.service-heading a{margin-left:auto;font-size:10px;color:var(--accent)}.stage{display:flex;justify-content:space-between;margin-top:9px;font-size:10px;color:#586e80}.service-page h1{font-size:24px}.service-page h3,.service-page b,.service-page a{color:var(--accent)}.service-route{font-size:11px;color:#52697c}
</style></head><body>${pages.map(renderPage).join('')}</body></html>`;
await writeFile(`${root}user-guide.html`, html);
const { chromium } = await import(process.env.GUIDE_PLAYWRIGHT_MODULE || '/tmp/eyecheck-ui-tools/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  await page.goto(new URL('./user-guide.html', import.meta.url).href);
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  const issues = await page.evaluate(() => Array.from(document.querySelectorAll('.page')).flatMap((el, i) => {
    const main = el.querySelector('main').getBoundingClientRect();
    const footer = el.querySelector('footer').getBoundingClientRect();
    const bad = main.bottom > footer.top - 10 || el.scrollWidth > el.clientWidth;
    return bad ? [{ page: i + 1, mainBottom: main.bottom, footerTop: footer.top }] : [];
  }));
  assert.deepEqual(issues, [], 'PDF 페이지 넘침');
  assert.equal(await page.locator('img').evaluateAll(imgs => imgs.every(img => img.complete && img.naturalWidth > 0)), true);
  await page.pdf({ path: `${root}operation-cns-elect-user-guide.pdf`, printBackground: true, preferCSSPageSize: true, tagged: true });
  await mkdir(`${root}preview`, { recursive: true });
  for (let i = 0; i < pages.length; i++) await page.locator('.page').nth(i).screenshot({ path: `${root}preview/page-${String(i + 1).padStart(2, '0')}.png` });
  console.log(`PDF 생성 완료: ${pages.length}페이지 / 레이아웃 넘침·누락 이미지 없음`);
} finally { await browser.close(); }
const sampleFiles = ['mail.txt', 'gems.txt', 'redirect.txt', 'backup.txt', 'persistent.txt', 'icheck.txt', 'eyecheck-practice.xlsx', 'eyecheck-result.xlsx', 'persistent-result.xlsx'];
const archive = {};
for (const file of sampleFiles) archive[`samples/${file}`] = new Uint8Array(await readFile(`${root}samples/${file}`));
archive['operation-cns-elect-user-guide.pdf'] = new Uint8Array(await readFile(`${root}operation-cns-elect-user-guide.pdf`));
await writeFile(`${root}operation-cns-elect-user-guide-bundle.zip`, zipSync(archive));
