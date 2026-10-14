# 운영 업무 보조기능 개선제안서 — 전체 기능 제2판

기존 3개 기능 보고서의 문체·국문 고딕·표 구성을 유지하고 현재 7개 기능을
업무 목적, 현행 방식, 개선 기능, 실제 입력 화면, 생성 결과, 개선효과로 정리합니다.
기존 3개 기능 PDF와 사용자 설명서는 변경하지 않습니다.

- `운영업무보조기능_개선제안서_전체기능_제2판.pdf`: 배포용 국문 PDF
- `op-improvement-proposal-all-services-v2.pdf`: 동일 내용의 영문 파일명 유지본
- `op-improvement-proposal-all-services-v2-bundle.zip`: PDF와 실습용 입력·결과 파일 10개
- `screenshots/`: 실제 기능 실행 후 캡처한 21개 화면
- `samples/`: 가상 입력 TXT, 연습 원본·실제 다운로드 XLSX, 백업 결과 TXT
- `evidence.json`: 실제 클립보드 결과·엑셀 셀값·기능 검증 기록
- `manifest.json`: 기능별 페이지 범위·시간 참고값·본문 넘침 검사 결과
- `verification.json`: PDF·실제 출력·샘플·ZIP 검증 결과

## 문서 구성과 표현 기준

23페이지: 표지·업무 개요·목차, 해외메일, G-EMS, 재전달,
자동 백업 에러, 아이체크 보고, 아이체크 내역 편집, 지속 메시지 엑셀 추출,
개선효과 종합 및 운영 적용 기준.
목차의 기능 이름으로 해당 장에 이동할 수 있습니다.
화면과 별도로 복사 가능한 실제 결과 문구·엑셀 주요 열을 본문에 수록합니다.

서비스·소스 저장소 주소와 작성일은 보고서에 표시하지 않습니다.
제안자·부서·부현장대리인·현장대리인·문의 연락처는 기존 지정값을 유지합니다.
서버·IP·담당자·장비는 가상 값이며 실제 발송이나 업무 데이터 업로드는 수행하지 않습니다.

시간은 사용자가 제공한 현업 참고값입니다. 해외메일 건당 1분 → 15초 미만,
G-EMS 10건 양식 정리 30초 이상 → 약 5초, 재전달 1시간 → 20분 미만,
백업 오류 보고 약 20분 → 5분 미만, 아이체크 보고 1분 미만,
지속 메시지 정리 1~2시간 이상 → 15분 미만으로 표기합니다.
아이체크 편집의 시간은 미측정으로 임의 단축시간을 제시하지 않습니다.
아이체크 보고의 기존 시간도 건수·담당자 수에 따른 차이를 설명하고 단일 값으로 추정하지 않습니다.
평균·보장값·절감률·인건비 효과를 계산하지 않습니다.

## 재생성

의존성, Playwright Chromium, 한글 Regular/Bold 폰트가 필요합니다.
로컬 서버를 실행한 상태에서 새 브라우저 컨텍스트로 캡처합니다.
아래 `/tmp` 경로는 현재 작업 환경이며 다른 환경에서는
`GUIDE_PLAYWRIGHT_MODULE`, `GUIDE_FONT_DIR`, `GUIDE_FONT`, `GUIDE_BOLD_FONT`,
`GUIDE_BASE_URL`, `GUIDE_PDFTOTEXT`, `PLAYWRIGHT_BROWSERS_PATH`, `LD_LIBRARY_PATH`를 지정합니다.

```bash
npm run dev -- --host 127.0.0.1
LD_LIBRARY_PATH=/tmp/operation-guide-libs/usr/lib/x86_64-linux-gnu PLAYWRIGHT_BROWSERS_PATH=/tmp/operation-guide-browsers node reports/proposal-all-services-v2/capture.mjs
LD_LIBRARY_PATH=/tmp/operation-guide-libs/usr/lib/x86_64-linux-gnu PLAYWRIGHT_BROWSERS_PATH=/tmp/operation-guide-browsers node reports/proposal-all-services-v2/generate.mjs
```

생성 스크립트는 이 디렉터리의 자체 생성물만 갱신합니다.
캡처 브라우저에서 파일 저장 대화상자는 실제 다운로드 대체 경로로 검증합니다.
연습 XLSX는 최소 시트 구성의 예시이며 운영 양식을 대체하지 않습니다.

## 검수

- 캡처 단계: 7개 기능의 실제 입력·복사·다운로드, 복수선택·미확정 차단,
  신규 2·소등 1·저장 후 원본 비교 유지, 중복 행 제외·담당자별 분리 확인
- 생성 단계: 이미지 로드·가로 넘침·꼬릿말 겹침 검사
- 실제 PDF: `pdftotext -layout`으로 `pdf-text.txt` 생성,
  `pdftoppm -r 100 -png`으로 `pdf-preview/page-01.png`~`page-23.png` 렌더링
- `verify.mjs`: 실제 문구·엑셀 셀값·필터·페이지·목차·폰트·ZIP 내용 일치 검사 및 검수용 모음 생성
- 최종 시각 검수: 모든 페이지의 글자·표·사진·예시·꼬릿말 확인

```bash
LD_LIBRARY_PATH=/tmp/operation-guide-libs/usr/lib/x86_64-linux-gnu PLAYWRIGHT_BROWSERS_PATH=/tmp/operation-guide-browsers node reports/proposal-all-services-v2/verify.mjs
```

HTML·미리보기·PDF 추출 텍스트는 Git에서 제외합니다. 애플리케이션 동작은 변경하지 않습니다.

최종 검수 완료: 7개 기능 실제 실행·21개 화면·23페이지 렌더링 시각 확인,
실제 문구·엑셀·목차 링크·ZIP 일치, 빌드 및 기존 단위 테스트 15개 파일 통과.
검수 중 담당자 카드 캡처 범위, 꼬릿말 겹침, 목차 열 너비,
긴 용어와 국문 단어 줄바꿈을 보완했습니다. 기존 보고서·사용 설명서는 수정하지 않았습니다.
