# OP 업무 보조기능 개선제안 보고서 — 3개 기능

상부 보고 대상: 해외메일 작성, 해외 자동 백업 오류 정리, 지속 이벤트 재전달.
기존 개선활동 보고서와 전체 서비스 사용 설명서는 보존하고 별도 파일로 작성합니다.

- `운영보고업무자동화_개선제안서_2026.10.pdf`: 9페이지 상부 보고용 PDF
- `op-improvement-proposal-three-services.pdf`: 같은 내용의 기존 파일명 유지본
- `op-improvement-proposal-three-services-bundle.zip`: PDF, 세 기능의 가상 입력 TXT, 실제 백업 오류 결과 TXT
- `screenshots/`: 세 기능의 입력·결과 화면 6개
- `evidence.json`: 실제 클립보드 결과와 기능 검증 내용
- `manifest.json`: 기능 구성·페이지 수·서체·결과 예시·시간 수치의 근거

개정본은 「운영 보고 업무 자동화 개선제안서」로 구성합니다.
추진 배경·현행 업무·개선 기능·개선효과 중심의 보고 문체와 국문 고딕 Regular/Bold를 적용합니다.
영문 메일 본문(실제 결과 1건 발췌), 백업 오류 보고 표(2건), 재전달 문구(2건)를
스크린샷 외에 검색·복사 가능한 본문 예시로 수록합니다.

소요시간은 사용자가 제공한 현업 참고값을 사용하며, 평균·보장 수치로 표현하지 않습니다.
해외메일 건당 15~25초 → 5~10초, 백업 오류 보고 약 20분 → 5분 미만,
지속 이벤트 재전달 40~60분 → 20분 미만입니다. 일별 환산·절감률·인건비 효과는 추정하지 않습니다.

“해외 자동 백업”은 백업 오류 추출·보고 작성 자동화를 의미하며, 백업 자체를 실행하는 기능으로 설명하지 않습니다.
제안자·부서·부현장대리인·현장대리인·연락처는 사용자가 기존 보고서에 지정한 표기를 사용합니다.
서버명·IP·담당자 등 캡처에 사용한 업무 데이터는 모두 가상 값입니다.

## 재생성

프로젝트 의존성과 Playwright Chromium, 한글 폰트가 필요합니다.
로컬 서비스(기본 `http://127.0.0.1:5173`)가 실행 중일 때 캡처하고 PDF를 생성합니다.

```bash
LD_LIBRARY_PATH=/tmp/operation-guide-libs/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=/tmp/operation-guide-browsers \
node reports/proposal-three-services/capture.mjs

LD_LIBRARY_PATH=/tmp/operation-guide-libs/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=/tmp/operation-guide-browsers \
node reports/proposal-three-services/generate.mjs
```

다른 환경에서는 `GUIDE_PLAYWRIGHT_MODULE`, `GUIDE_FONT`, `GUIDE_BOLD_FONT`, `GUIDE_FONT_DIR`, `GUIDE_BASE_URL`을 지정하세요.
캡처는 새로운 브라우저 컨텍스트에서 수행되며 실제 메시지를 발송하지 않습니다.
백업 TXT는 파일 저장 대화상자가 없는 환경에서 사용하는 서비스의 다운로드 경로로 검증합니다.

## 검수

`capture.mjs`는 해외메일 2건·확인 이력 제거, Status 0·1 제외와 58·84 추출,
Outlook 복사·TXT 생성, 재전달 3건 중 2건 선택 및 보류 1건 미포함을 확인합니다.
`generate.mjs`는 이미지 누락, 페이지 잘림, 표 내부 넘침, 꼬릿말 겹침을 검사합니다.
실제 PDF는 `pdfinfo`·`pdftotext`·`pdffonts`로 한글·페이지·폰트를 확인하고,
`pdftoppm`으로 렌더링한 모든 페이지를 시각 검수합니다.

2026.10.14 검수 완료: 세 기능 실습, 9페이지·캡처 6개, 한글·폰트 포함,
잘림·꼬릿말 겹침 없음, 보고 대상 외 기능 미포함, PDF와 ZIP 일치 확인.
재전달 결과 영역의 캡처 환경 한글 폰트 누락을 보완하고 결과 화면을 다시 확인했습니다.

생성 HTML과 검수 미리보기는 Git에서 제외합니다. 애플리케이션 코드는 수정하지 않습니다.
