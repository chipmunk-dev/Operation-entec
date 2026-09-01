import PropTypes from 'prop-types';
import {
  MdBackup,
  MdBolt,
  MdEmail,
  MdHistory,
  MdMenu,
  MdFactCheck,
  MdOutlineChevronLeft,
  MdOutlineLightbulb,
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
    name: 'G-EMS 메세지 담당자 제거\n메신저 보고양식 자동완성',
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
    name: '아이체크 보고',
    description: 'I-Check Report',
    path: '/icheck-report',
    icon: MdFactCheck,
  },
  {
    name: '점등 내역 편집',
    description: 'Light Log Editor',
    path: '/light-log',
    icon: MdOutlineLightbulb,
  },
  {
    name: '지속 메시지 엑셀 추출',
    description: 'Event Excel Report',
    path: '/persistent-event-excel',
    icon: FaFileExcel,
  },
];

const changeLogItems = [
  {
    date: '2026.09',
    title: '입력 양식·화면 개선',
    detail: `아이체크 13열 입력·G-EMS 설정 저장
백업 데이터 관리·TXT 내보내기 개선
공통 헤더·입력 영역·작업 안내 간소화
입력 예시 근무자명 통일`,
  },
  {
    date: '2026.08',
    title: '업무 양식·신규 도구',
    detail: `해외메일·재전달·G-EMS 개선
아이체크 보고·점등 내역 편집 추가
사용방법·배포 알림·화면 개선`,
  },
  {
    date: '2026.07',
    title: '운영 화면·이벤트 처리',
    detail: `백업 JSON·엑셀 보고 추가
담당자 판독·Event 처리 개선`,
  },
  {
    date: '2026.01',
    title: '해외메일 개선',
    detail: '본문 간격·출력 형식 개선',
  },
  {
    date: '2025.12',
    title: '지속 이벤트 재전달',
    detail: '대기·확인 관리 및 국내·해외 전달 문구 추가',
  },
  {
    date: '2025.07',
    title: '백업 오류 판독',
    detail: 'Context Error Code 판독 개선',
  },
  {
    date: '2025.05',
    title: '업무 도구 시작',
    detail: '해외메일·백업 오류 필터 추가',
  },
];

const Navbar = ({ isOpen, setIsOpen }) => (
  <aside
    className={`fixed bottom-3 left-3 top-3 z-40 flex flex-col rounded-[28px] border border-white/10 bg-slate-950/95 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl transition-[width] duration-300 ${
      isOpen ? 'w-[252px]' : 'w-[68px]'
    }`}
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]"
    >
      <span className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
      <span className="absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />
      <span className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),transparent_38%)]" />
    </div>

    <div className="relative z-10 flex h-20 items-center justify-between border-b border-white/10 px-3.5">
      <div className={`min-w-0 items-center gap-3 ${isOpen ? 'flex' : 'hidden'}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-950/40 ring-1 ring-white/20">
          <MdBolt size={23} aria-hidden="true" />
        </span>
        <div className="min-w-0">
        {isOpen && (
          <>
              <p className="truncate text-sm font-bold tracking-tight text-white">
                Operation CNS Elect
              </p>
              <p className="mt-1 text-[10px] font-bold tracking-[0.16em] text-blue-300/70">
                ELECT TEAM
              </p>
          </>
        )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/5 bg-white/5 text-slate-400 transition hover:border-white/10 hover:bg-white/10 hover:text-white"
        aria-label={isOpen ? '메뉴 접기' : '메뉴 펼치기'}
      >
        {isOpen ? <MdOutlineChevronLeft size={22} /> : <MdMenu size={22} />}
      </button>
    </div>

    <nav className="relative z-10 flex-1 space-y-2 overflow-x-hidden overflow-y-auto px-2.5 py-4">
      {menuItems.map(({ name, description, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          title={!isOpen ? name : undefined}
          className={({ isActive }) =>
            `group flex min-h-[58px] items-center rounded-2xl border py-2 transition-all duration-200 ${
              isActive
                ? 'border-blue-400/30 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-950/40'
                : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.07] hover:text-white'
            } ${isOpen ? 'gap-3 px-3' : 'justify-center px-0'}`
          }
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-lg ring-1 ring-white/[0.06] transition group-hover:bg-white/10">
            <Icon />
          </span>
          {isOpen && (
            <span className="min-w-0">
              <span className="block whitespace-pre-line text-[13px] font-semibold leading-4">
                {name}
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-medium tracking-wide text-slate-400 transition group-hover:text-slate-300">
                {description}
              </span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>

    {isOpen && (
      <div className="relative z-10 mx-3 mb-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.06] p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Local processing
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-400">
          입력 데이터는 외부 서버로 전송되지 않습니다.
        </p>
      </div>
    )}

    <div className="group relative z-10 flex justify-center px-3 pb-3">
      <button
        type="button"
        className={`flex h-9 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus:border-blue-400 focus:text-white focus:outline-none ${isOpen ? 'w-full px-3' : 'w-9'}`}
        aria-label="간략 변경 내역"
        aria-describedby="operation-change-log"
      >
        <MdHistory size={17} />
        {isOpen && <span className="text-[11px] font-semibold">히스토리</span>}
      </button>

      <div
        id="operation-change-log"
        role="tooltip"
        className={`pointer-events-none fixed bottom-3 z-50 max-h-[calc(100vh-1.5rem)] w-[min(18rem,calc(100vw-7rem))] translate-x-1 overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/95 p-3.5 opacity-0 shadow-2xl shadow-slate-950/50 backdrop-blur-2xl transition duration-150 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 ${
          isOpen ? 'left-[276px]' : 'left-[92px]'
        }`}
      >
        <div className="mb-2.5 flex items-center justify-between border-b border-white/10 px-1 pb-3">
          <p className="text-sm font-bold text-white">업데이트 히스토리</p>
          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[9px] font-bold tracking-wider text-blue-300">
            최신순
          </span>
        </div>

        <ol className="space-y-1.5">
          {changeLogItems.map(({ date, title, detail }) => (
            <li
              key={`${date}-${title}`}
              className="grid grid-cols-[3.25rem_1fr] gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[0.05]"
            >
              <span className="mt-0.5 h-fit rounded-lg bg-white/[0.06] px-1.5 py-1 text-center text-[9px] font-bold text-blue-300">
                {date}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-slate-200">
                  {title}
                </span>
                <span className="mt-1 block whitespace-pre-line text-[10px] leading-4 text-slate-500">
                  {detail}
                </span>
              </span>
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
