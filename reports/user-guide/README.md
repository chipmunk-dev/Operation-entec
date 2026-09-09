# 사용자 설명서

- `operation-cns-elect-user-guide.pdf`: 26페이지 서비스별 사용자 설명서
- `operation-cns-elect-user-guide-bundle.zip`: PDF와 실습용 파일 9개
- `samples/`: 실제 형식의 가상 입력 TXT, 아이체크 연습 원본 및 실제 다운로드 결과 XLSX
- `screenshots/`: 로컬 서비스에서 예시를 실행하여 캡처한 화면
- `results.json`: 클립보드 결과와 검증 항목
- `services.mjs`: 서비스별 목적·입출력·기능·차이점·주의사항 정의
- `manifest.json`: 생성된 페이지 수와 서비스별 페이지 범위

6개 서비스마다 독립된 기능 안내 페이지가 있으며, 모든 상세 페이지에
서비스명·색상·작업 단계·챕터 내 위치가 표시됩니다. 목차에서 챕터로 이동할 수 있습니다.

기준: 2026.09.09, 메뉴 순서 변경 반영 로컬 코드. 배포 완료를 의미하지 않습니다.
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
기본 모듈·폰트 경로는 이 작업에서 사용한 `/tmp/eyecheck-*` 환경입니다.

캡처 스크립트는 새 브라우저 컨텍스트에서만 예시를 처리하므로 사용자의 브라우저
저장 데이터를 변경하지 않습니다. 실제 메일·메신저는 발송하지 않습니다.
캡처·생성 스크립트는 이 디렉터리의 자체 생성물만 다시 생성합니다.

## 검수

1. `capture.mjs`: 메뉴 순서, 이벤트 복구·이력 제거, 재전달 복수선택,
   백업 오류 제외 규칙, 담당자 미확정 추출 차단, XLSX 다운로드,
   아이체크 신규 2·소등 1 및 저장 후 원본 비교 유지, 13열 보고를 검증합니다.
2. `generate.mjs`: 모든 이미지 로드, 26개 페이지의 본문·꼬릿말 겹침과 가로 넘침을 검사합니다.
3. `pdfinfo`, `pdftotext`, `pdffonts`로 실제 PDF 26페이지·한글 추출·폰트 포함을 확인합니다.
4. `pdftoppm`으로 실제 PDF를 렌더링하여 페이지별 잘림·글자 표시를 시각 검수합니다.

텍스트 추출 파일을 `pdf-text.txt`, 렌더링 파일을 `pdf-preview/page-01.png`~
`page-26.png`로 준비한 뒤 `node reports/user-guide/verify.mjs`를 실행하면
manifest 기준 페이지 수·서비스 구분·한글·페이지 번호·엑셀 4행·필터·ZIP 내용 일치 여부를 검사하고
전체 페이지 검수용 모음을 생성합니다. Playwright 환경 변수는 위와 같습니다.

2026.09.09 검수 결과: 빌드·린트·기존 테스트 15개 파일 통과,
6개 기능의 브라우저 실습 통과(초판), 개정 PDF 26페이지·한글 텍스트·폰트 포함 확인,
전체 페이지 렌더링 시각 검수 및 주요 화면 확대 확인 완료.

생성 HTML과 미리보기는 크기가 크므로 Git에서 제외합니다. 배포물은 PDF·ZIP이며
문서를 수정할 때는 `generate.mjs`를 수정하고 다시 생성하세요.
