import { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Navbar from './components/Navbar';
import ForeignMail from './pages/ForeignMail';
import AutoBackupErrorFilter from './pages/AutoBackupErrorFilter';
import PersistentRedirect from './pages/PersistentRedirect';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Navbar isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
        <div
          className={`flex min-h-screen flex-col transition-[margin] duration-300 ${
            isMenuOpen ? 'ml-64' : 'ml-[72px]'
          }`}
        >
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/foreign-mail" replace />} />
              <Route path="/foreign-mail" element={<ForeignMail />} />
              <Route path="/persistent-redirect" element={<PersistentRedirect />} />
              <Route path="/auto-backup-error-filter" element={<AutoBackupErrorFilter />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="border-t border-slate-200 bg-white px-6 py-5">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                데이터는 외부 서버로 전송되지 않으며, 일부 임시 보고는 현재 브라우저에만
                저장됩니다.
              </p>
              <a
                href="mailto:wldns0622@cnspartner.com"
                className="font-medium text-slate-600 hover:text-blue-600"
              >
                문의 · wldns0622@cnspartner.com
              </a>
            </div>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
