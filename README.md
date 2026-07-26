# Operation Entec

운영 업무에서 반복되는 데이터 정리와 전달 문구 작성을 빠르게 처리하기 위한
**브라우저 기반 업무 보조 도구**입니다.

탭으로 구분된 데이터를 붙여넣으면 해외 메일, 지속 이벤트 재전달 문구,
백업 오류 목록 등 필요한 형식으로 변환할 수 있습니다.

> 대부분의 데이터 가공은 브라우저에서 처리됩니다. 자동 백업 에러 보고의 임시
> 데이터는 현재 브라우저에 최대 7일 동안 저장되며, 사용자가 공유 저장을 선택한
> 경우에만 백업 입력과 열 설정이 Cloudflare D1으로 전송됩니다.

## 주요 기능

### 해외메일 작성

- Host, Message, Date, IP가 포함된 데이터를 영문 장애 알림 메일로 변환
- 입력 데이터의 열 순서 변경 지원
- 완성된 메일 내용을 클립보드로 복사

### 자동 백업 에러 필터

- `P-EUBKMST`, `NBUMASTER`, `EXTMASTER` 백업 존별 데이터 처리
- Status 코드가 `0` 또는 `1`이 아닌 백업 작업만 추출
- 정책 이름, 백업 시작 시간, 에러 코드를 구분하여 표시 및 복사
- 한국어와 영어 형식의 백업 시작 시간 지원

### 지속 이벤트 재전달

- 이벤트 원문과 처리 기록을 분리하여 표시
- 전달 대기 및 확인 완료 상태 관리
- 국내 메신저, 해외 메신저, 해외메일 문구 생성
- 괄호가 포함된 처리 내용의 원본/괄호 제외 문구 제공

## 시작하기

### 요구 사항

- Node.js 18 이상
- npm

### 설치 및 실행

```bash
npm ci
npm run dev
```

개발 서버가 시작되면 터미널에 표시된 주소로 접속합니다. 기본 주소는
일반적으로 `http://localhost:5173`입니다.

### 사용할 수 있는 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 생성 |
| `npm run preview` | 프로덕션 빌드 미리보기 |
| `npm run lint` | ESLint 코드 검사 |
| `npm run worker:test` | Worker 데이터 검증 테스트 |
| `npm run worker:migrate:local` | 로컬 D1 마이그레이션 적용 |
| `npm run worker:dev` | 로컬 Worker API 실행 |

## 입력 데이터 형식

대부분의 기능은 엑셀이나 운영 도구에서 복사한 **탭 구분 데이터**를
입력으로 사용합니다. 한 줄은 하나의 작업 또는 이벤트를 나타냅니다.

### 해외메일 및 지속 이벤트

기본 열 순서는 다음과 같습니다.

```text
Host    Message/Event    Date    IP
```

화면의 입력 순서 설정에서 각 열의 의미를 변경할 수 있습니다.

### 자동 백업 에러 필터

최소 9개의 열이 필요하며 다음 위치의 값을 사용합니다.

| 위치 | 필드 | 용도 |
| ---: | --- | --- |
| 1번째 열 | Status | 오류 여부 판단 |
| 6번째 열 | Job Policy | 정책 이름 표시 |
| 7번째 열 | Start Time | 백업 시작 시간 표시 |

권장 열 순서:

```text
Status    State    Operation    State Details    Job Schedule
Job Policy    Start Time
```

화면의 열 순서 설정에서 각 필드의 위치를 입력 데이터에 맞게 변경할 수 있습니다.

## 데이터 처리 및 보안

- 메시지 파싱과 결과 생성은 브라우저에서 수행합니다.
- 공유 저장을 선택하지 않으면 입력 데이터는 외부 API로 전송되지 않습니다.
- 자동 백업 에러 보고의 원본과 열 설정은 현재 브라우저에 최대 7일 동안
  임시 저장되며, 나머지 화면 상태는 새로고침하면 사라집니다.
- 결과 복사 기능을 사용할 때만 브라우저 Clipboard API에 접근합니다.

Cloudflare Worker 연결 전에는 공유 저장 버튼이 비활성화됩니다. 연결 후 사용자가
명시적으로 `현재 데이터를 공유 저장`을 누른 경우에만 백업존 원본 입력과 열 설정이
공유 D1 데이터베이스로 전송됩니다. 파싱 결과는 저장하지 않습니다.

운영 Worker API:

```text
https://operation-entec-api.devquokkajeong.workers.dev
```

Netlify에는 다음 환경변수를 등록해야 합니다.

```text
VITE_SHARED_API_URL=https://operation-entec-api.devquokkajeong.workers.dev
```

## 공유 저장 로컬 개발

공유 저장 API는 Cloudflare Worker와 D1으로 구성되어 있습니다.

```bash
npm run worker:migrate:local
npm run worker:dev
```

별도 터미널에서 프런트엔드를 실행합니다.

```bash
cp .env.example .env.local
npm run dev
```

로컬 Worker는 기본적으로 `http://localhost:8787`, Vite는
`http://localhost:5173`에서 실행됩니다.

공유 데이터는 항상 최신 스냅샷 하나만 유지합니다. 저장과 가져오기는 각각 독립적으로
10초에 한 번만 가능하며, 저장 실패 시 기존 공유 데이터는 유지됩니다.

민감한 운영 데이터를 다루는 경우에도 배포 환경과 브라우저 확장 프로그램의
보안 정책은 별도로 확인해 주세요.

## 기술 구성

- React 18
- Vite 5
- React Router
- Tailwind CSS
- React Icons
- ESLint 9

## 프로젝트 구조

```text
src/
├── components/
│   ├── Modal.jsx
│   └── Navbar.jsx
├── pages/
│   ├── AutoBackupErrorFilter/
│   ├── ForeignMail/
│   ├── PersistentRedirect/
│   └── Redirect/
├── App.jsx
├── index.css
└── main.jsx
```

라우팅과 공통 레이아웃은 `src/App.jsx`에서 관리하며, 각 업무 기능은
`src/pages` 아래에 분리되어 있습니다.

## 품질 확인

변경사항을 반영하기 전 다음 검사를 권장합니다.

```bash
npm run lint
npm run build
```

## 문의

서비스 사용 중 특이사항이나 개선 제안은 아래 주소로 전달해 주세요.

- `wldns0622@cnspartner.com`

---

Operation Entec는 OP 업무의 반복 작업을 줄이고 입력 실수를 예방하기 위해
만든 내부 업무 보조 도구입니다.
