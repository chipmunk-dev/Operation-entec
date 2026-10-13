# 사용자 설명서

- `operation-cns-elect-user-guide.pdf`: 30페이지 서비스별 사용자 설명서
- `operation-cns-elect-user-guide-bundle.zip`: PDF와 실습용 파일 9개
- `samples/`: 실제 형식의 가상 입력 TXT, 아이체크 연습 원본 및 실제 다운로드 결과 XLSX
- `screenshots/`: 로컬 서비스에서 예시를 실행하여 캡처한 화면
- `results.json`: 클립보드 결과와 검증 항목
- `services.mjs`: 서비스별 목적·입출력·기능·차이점·주의사항 정의
- `manifest.json`: 생성된 페이지 수와 서비스별 페이지 범위

7개 서비스마다 독립된 기능 안내 페이지가 있으며, 모든 상세 페이지에
서비스명·색상·작업 단계·챕터 내 위치가 표시됩니다. 목차에서 챕터로 이동할 수 있습니다.

기준: 2026.10.14, 최신 dev `c34f643`·main `b6cdd3f`의 아이체크 메뉴 변경을 반영한
설명서 브랜치. 배포 완료를 의미하지 않습니다. 두 원격 브랜치의 코드 내용은 동일합니다.

아이체크 보고(`/icheck-report`)의 독립 메뉴 복원을 반영했으며,
아이체크 내역 편집은 파일 편집·원본 대비 변경 보고 기능으로 구분합니다.
본문 15px, 표 14px, 결과 예시 13px로 확대하고 표의 열 너비를 내용에 맞게 조정했습니다.
공통 안내·문제 해결을 분리하고 신규 정보 입력·개별 보고 카드를 확대 캡처했습니다.
서버·IP·담당자는 모두 가상 값입니다. 기존 개선활동 보고서는 수정하지 않습니다.
`eyecheck-practice.xlsx`는 최소 시트 구성의 연습용 파일이며 운영 서식의 대체물이 아닙니다.

## 재생성

Node.js, 프로젝트 의존성, Playwright Chromium, 한글 폰트가 필요합니다.
실행 전에 별도 터미널에서 `npm run dev -- --host 127.0.0.1`을 실행하세요.
기존 서버가 5173 포트에서 실행 중이면 재사용합니다.

```bash
GUIDE_PLAYWRIGHT_MODULE=/절대경로/playwright/index.mjs \
GUIDE_FONT=/절대경로/NotoSansCJK-Regular.ttc \
PLAYWRIGHT_BROWSERS_PATH=/브라우저/캐시 \
node reports/user-guide/capture.mjs

GUIDE_PLAYWRIGHT_MODULE=/절대경로/playwright/index.mjs \
GUIDE_FONT=/절대경로/NotoSansCJK-Regular.ttc \
PLAYWRIGHT_BROWSERS_PATH=/브라우저/캐시 \
node reports/user-guide/generate.mjs
```

필요한 환경에서는 `LD_LIBRARY_PATH`에 Chromium 공유 라이브러리 경로를 지정합니다.
서비스 포트 변경 시 캡처 명령에 `GUIDE_BASE_URL=http://127.0.0.1:포트`를 지정하세요.
기본 모듈·폰트 경로는 이 작업에서 사용한 `/tmp/operation-guide-*` 환경입니다.

캡처 스크립트는 새 브라우저 컨텍스트에서만 예시를 처리하므로 사용자의 브라우저
저장 데이터를 변경하지 않습니다. 실제 메일·메신저는 발송하지 않습니다.
캡처·생성 스크립트는 이 디렉터리의 자체 생성물만 다시 생성합니다.

## 검수

1. `capture.mjs`: 메뉴 순서, 이벤트 복구·이력 제거, 재전달 복수선택,
   백업 오류 제외 규칙, 담당자 미확정 추출 차단, XLSX 다운로드,
   아이체크 신규 2·소등 1 및 저장 후 원본 비교 유지, 13열 보고를 검증합니다.
2. `generate.mjs`: 모든 이미지 로드, 30개 페이지의 본문·꼬릿말 겹침과 가로 넘침을 검사합니다.
3. `pdfinfo`, `pdftotext`, `pdffonts`로 실제 PDF 30페이지·한글 추출·폰트 포함을 확인합니다.
4. `pdftoppm`으로 실제 PDF를 렌더링하여 페이지별 잘림·글자 표시를 시각 검수합니다.

텍스트 추출 파일을 `pdf-text.txt`, 렌더링 파일을 `pdf-preview/page-01.png`~
`page-30.png`로 준비한 뒤 `node reports/user-guide/verify.mjs`를 실행하면
manifest 기준 페이지 수·서비스 구분·한글·페이지 번호·엑셀 4행·필터·ZIP 내용 일치 여부를 검사하고
전체 페이지 검수용 모음을 생성합니다. Playwright 환경 변수는 위와 같습니다.

2026.10.14 검수 완료: 빌드·린트·기존 테스트 15개 파일 및 7개 메뉴의 브라우저 실습 통과.
독립 아이체크 보고·편집의 전체 흐름, PDF 30페이지·한글·목차 링크·ZIP 일치를 확인했습니다.
본문 확대 후 발견한 꼬릿말 겹침을 수정하고 모든 페이지를 실제 PDF 렌더링으로 검토했습니다.

생성 HTML과 미리보기는 크기가 크므로 Git에서 제외합니다. 배포물은 PDF·ZIP이며
문서를 수정할 때는 `generate.mjs`를 수정하고 다시 생성하세요.
