import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  const menuItems = [
    { name: '해외메일 작성', nameEn: 'Foreign Mail', path: '/foreign-mail' },
    { name: '자동 백업 에러 필터', nameEn: 'Auto Backup Error Filter', path: '/auto-backup-error-filter' },
    { name: '지속 이벤트 재전달', nameEn: 'Persistent Event Redirect', path: '/persistent-redirect' },
  ];

  return (
    <nav
      className={`min-h-screen bg-gray-800 text-white fixed left-0 top-0 transition-all duration-300 z-40 overflow-hidden ${
        isOpen ? 'w-64' : 'w-16'
      }`}
    >
      {/* 햄버거 버튼 - 우측 상단 */}
      <div className="p-4 flex justify-end">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          aria-label="Toggle menu"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* 메뉴 항목들 */}
      <div className="overflow-hidden">
        <div className={`p-6 pt-0 transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li 
                key={item.path}
                className="overflow-hidden"
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                }}
              >
                <Link
                  to={item.path}
                  className={`block px-4 py-3 rounded-lg transition-colors relative
                    ${
                      location.pathname === item.path
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  <div className="flex flex-col">
                    <span className={`transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                      {item.name}
                    </span>
                    <span className={`text-xs text-gray-400 mt-1 transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                      {item.nameEn}
                    </span>
                  </div>
                  {location.pathname === item.path && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-r"></span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
