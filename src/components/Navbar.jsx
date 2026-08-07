import PropTypes from 'prop-types';
import {
  MdBackup,
  MdEmail,
  MdHistory,
  MdMenu,
  MdOutlineChevronLeft,
  MdOutlineMessage,
} from 'react-icons/md';
import { FaArrowsRotate, FaFileExcel } from 'react-icons/fa6';
import { NavLink } from 'react-router-dom';

const menuItems = [
  {
    name: '해외메일 작성',
    description: 'Foreign Mail',
    path: '/foreign-mail',
    icon: MdEmail,
  },
  {
    name: '담당자 제거·메신저 최적화',
    description: 'G-EMS Message Helper',
    path: '/gems-message',
    icon: MdOutlineMessage,
  },
  {
    name: '자동 백업 에러',
    description: 'Backup Error Filter',
    path: '/auto-backup-error-filter',
    icon: MdBackup,
  },
  {
    name: '지속 이벤트 재전달',
    description: 'Event Redirect',
    path: '/persistent-redirect',
    icon: FaArrowsRotate,
  },
  {
    name: '지속 메시지 엑셀',
    description: 'Event Excel Report',
    path: '/persistent-event-excel',
    icon: FaFileExcel,
  },
];

const changeLogItems = [
  {
    date: '2025.05',
    title: '업무 변환 도구 시작',
    detail: '해외메일 작성 및 자동 백업 오류 필터·열 설정 추가',
  },
  {
    date: '2025.07',
    title: '백업 오류 판독 보강',
    detail: 'Context Error Code 형식 반영 및 오류 추출 정확도 개선',
  },
  {
    date: '2025.12',
    title: '지속 이벤트 재전달 개선',
    detail: `대기·확인 관리 및 국내·해외 전달 문구 생성 추가
시간 표시·괄호 제외 문구·해외 담당자 전달 방식 보강`,
  },
  {
    date: '2026.01',
    title: '해외메일 형식 개선',
    detail: '메일 본문 줄 간격 및 출력 형식 개선',
  },
  {
    date: '2026.07',
    title: '운영 화면·이벤트 처리 개선',
    detail: `전체 UI·직접 경로 접속 개선 및 백업 JSON 파일 공유 추가
엑셀 보고서·담당자 판독·Event 탭·줄바꿈 자동 정리 추가
s 확인내용 일괄 제외 및 지속 메시지 앞·뒤 빈 탭 자동 정리 추가`,
  },
  {
    date: '2026.08',
    title: '업무 양식·사용 흐름 개선',
    detail: `해외메일 파싱 및 재전달 Resend 출력 개선
G-EMS 확인 담당자 제거 및 기본·보고용 전달 문구 생성 추가
해외메일 작성·재전달에 하이픈 구분선·아웃룩 정렬용 공백 적용
G-EMS 보고자 정보·출력 방식 한 줄형 설정으로 간소화
G-EMS 보고자 이름 브라우저 12시간 임시 저장
전체 메뉴 작업 순서 안내 추가 및 기능별 상태·버튼 명칭 정리
새 배포 감지 및 상단 새로고침 안내 추가
서비스 표시명 Operation CNS Elect로 변경`,
  },
];

const Navbar = ({ isOpen, setIsOpen }) => (
  <aside
    className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-950 text-white transition-[width] duration-300 ${
      isOpen ? 'w-64' : 'w-[72px]'
    }`}
  >
    <div className="flex h-20 items-center justify-between border-b border-slate-800 px-4">
      <div className={`min-w-0 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
        {isOpen && (
          <>
            <p className="truncate text-base font-bold tracking-tight">Operation CNS Elect</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">LG CNS ELECT TEAM</p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
        aria-label={isOpen ? '메뉴 접기' : '메뉴 펼치기'}
      >
        {isOpen ? <MdOutlineChevronLeft size={22} /> : <MdMenu size={22} />}
      </button>
    </div>

    <nav className="flex-1 space-y-2 overflow-x-hidden overflow-y-auto px-3 py-5">
      {menuItems.map(({ name, description, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          title={!isOpen ? name : undefined}
          className={({ isActive }) =>
            `group flex h-14 items-center rounded-xl transition ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            } ${isOpen ? 'gap-3 px-3' : 'justify-center'}`
          }
        >
          <Icon className="shrink-0 text-xl" />
          {isOpen && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-400 group-[.active]:text-blue-100">
                {description}
              </span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>

    {isOpen && (
      <div className="m-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Local processing
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
          입력 데이터는 외부 서버로 전송되지 않습니다.
        </p>
      </div>
    )}

    <div className="group relative flex justify-center px-3 pb-3">
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-500 transition hover:border-slate-700 hover:text-slate-200 focus:border-blue-500 focus:text-white focus:outline-none"
        aria-label="간략 변경 내역"
        aria-describedby="operation-change-log"
      >
        <MdHistory size={17} />
      </button>

      <div
        id="operation-change-log"
        role="tooltip"
        className={`pointer-events-none fixed bottom-3 z-50 max-h-[calc(100vh-1.5rem)] w-80 translate-x-1 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950/95 p-4 opacity-0 shadow-2xl shadow-slate-950/50 backdrop-blur transition duration-150 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 ${
          isOpen ? 'left-[268px]' : 'left-[84px]'
        }`}
      >
        <div className="mb-3 border-b border-slate-800 pb-3">
          <p className="text-sm font-bold text-white">Operation CNS Elect 히스토리</p>
          <p className="mt-1 text-[11px] text-slate-500">
            2025년 이후 주요 기능·커밋 기준
          </p>
        </div>

        <ol className="space-y-3">
          {changeLogItems.map(({ date, title, detail }, index) => (
            <li
              key={`${date}-${title}`}
              className="relative pl-4 before:absolute before:left-0 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-blue-500"
            >
              {index < changeLogItems.length - 1 && (
                <span className="absolute left-[2.5px] top-3.5 h-[calc(100%+0.25rem)] w-px bg-slate-800" />
              )}
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 text-[10px] font-bold text-blue-400">
                  {date}
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  {title}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-4 text-slate-500">
                {detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </aside>
);

Navbar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
};

export default Navbar;
