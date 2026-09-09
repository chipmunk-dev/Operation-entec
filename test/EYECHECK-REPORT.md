# 아이체크 편집/보고 검증

## 자동 검사

`npm run test:eyecheck`, `npm run test:icheck-report`, `npm run lint`, `npm run build`

`test/eyecheckReport.test.js`는 원본 비교, 중복 장비 개수, 행 번호 변경,
저장 전후 보고 식별자, 필수값 누락, 담당자 분류, 원본 불변성을 검사합니다.

## 브라우저 검사

로컬 서버를 5173 포트에서 실행한 뒤 Playwright와 Chromium을 준비합니다.
프로젝트 의존성을 변경하지 않고 임시 도구 설치 경로를 지정할 수 있습니다.

```sh
npm install --prefix /tmp/eyecheck-ui-tools playwright
PLAYWRIGHT_BROWSERS_PATH=/tmp/eyecheck-browsers /tmp/eyecheck-ui-tools/node_modules/.bin/playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=/tmp/eyecheck-browsers EYECHECK_PLAYWRIGHT_MODULE=/tmp/eyecheck-ui-tools/node_modules/playwright/index.mjs npm run test:eyecheck-ui
```

Linux에서는 Chromium 실행용 시스템 라이브러리가 필요합니다.
한글 스크린샷은 `EYECHECK_TEST_FONT`에 로컬 한글 글꼴 경로를 지정할 수 있습니다.

가상 장비만 들어 있는 xlsx를 생성해 업로드, 신규/소등 선택, 입력 포커스,
검색 후 선택 유지, 필수값 누락 시 복사 차단, 클립보드, 다운로드 파일의 셀,
저장 후 원본 비교 유지, 신규 추가 후 제거, 기존 장비 재보고, 모바일 폭,
다른 파일 열기, 기존 보고 URL/붙여넣기 호환을 검사합니다.
덮어쓰기 실패/재시도는 파일 접근 API를 대체하여 검사하며, 잘못된 날짜와
삭제 후 재입력 시 이전 장비 정보 초기화도 검사합니다.

스크린샷: `/tmp/eyecheck-report-desktop.png`, `/tmp/eyecheck-report-mobile.png`

## 데이터 기준

보고 차이는 최초 점등장비 목록과 현재 편집 결과의 호스트·위치·점등상태·담당자를
중복 개수까지 비교합니다. 날짜/행 순서만 바뀐 경우는 보고하지 않습니다.
층별 점검대상 문구만 수정하고 장비 목록을 바꾸지 않은 경우에도 보고하지 않습니다.
신규 장비 저장 전 입력한 호스트/담당자는 엑셀에 반영하며, 기존 또는 이미 저장한
장비의 보고 탭 정보 보완은 보고 문구에만 반영합니다.
최초 비교 기준은 현재 페이지 세션 동안 유지되며 새 파일 열기나 새로고침 시 초기화됩니다.
