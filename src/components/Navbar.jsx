import PropTypes from 'prop-types';
import { MdBackup, MdEmail, MdMenu, MdOutlineChevronLeft } from 'react-icons/md';
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
            <p className="truncate text-base font-bold tracking-tight">Operation Entec</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">OP WORKSPACE</p>
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

    <nav className="flex-1 space-y-2 overflow-hidden px-3 py-5">
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
  </aside>
);

Navbar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  setIsOpen: PropTypes.func.isRequired,
};

export default Navbar;
