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
import PersistentEventExcel from './pages/PersistentEventExcel';

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
              <Route path="/persistent-event-excel" element={<PersistentEventExcel />} />
              <Route path="/auto-backup-error-filter" element={<AutoBackupErrorFilter />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="border-t border-slate-200 bg-white px-6 py-6">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-4 text-xs text-slate-500 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-700">
                  Operation Entec
                  <span className="ml-2 font-normal text-slate-400">
                    OP 업무의 반복 작업을 줄이기 위한 내부 업무 지원 도구
                  </span>
                </p>
                <p className="leading-5">
                  데이터 가공과 JSON 파일 공유는 브라우저에서 수행되며 외부 서버에
                  백업 데이터를 저장하지 않습니다.
                </p>
                <p className="text-slate-400">© 2026 Operation Entec</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-medium">
                <a
                  href="https://github.com/chipmunk-dev/Operation-entec"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-600 transition hover:text-blue-600"
                >
                  GitHub
                </a>
                <a
                  href="mailto:wldns0622@cnspartner.com"
                  className="text-slate-600 transition hover:text-blue-600"
                >
                  문의 · wldns0622@cnspartner.com
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
