import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();

  const menuItems = [
    { name: '해외메일 작성', path: '/foreign-mail' },
    { name: '자동 백업 에러 필터', path: '/auto-backup-error-filter' },
    { name: '재전달 작성', path: '/redirect' },
    { name: '작업 서버 필터', path: '/server-filter' },
  ];

  return (
    <nav className="w-full p-4 mx-auto max-w-screen-2xl">
      <ul className="flex justify-center gap-20 items-center">
        {menuItems.map((item) => (
          <li key={item.name} className="relative">
            <Link
              to={item.path}
              className={`px-2 py-1 inline-block
                ${location.pathname === item.path ? 'text-blue-500' : ''}
                hover:text-blue-300 transition-colors`}
            >
              {item.name}
              {location.pathname === item.path && (
                <span
                  className="absolute h-1 bg-blue-200 rounded-full shadow-lg 
                  left-0 bottom-0 w-full opacity-50"
                ></span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
