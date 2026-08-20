import { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Navbar from './components/Navbar';
import AppUpdateBanner from './components/AppUpdateBanner';
import ForeignMail from './pages/ForeignMail';
import GemsMessage from './pages/GemsMessage';
import AutoBackupErrorFilter from './pages/AutoBackupErrorFilter';
import PersistentRedirect from './pages/PersistentRedirect';
import ICheckReport from './pages/ICheckReport';
import PersistentEventExcel from './pages/PersistentEventExcel';
import LightLogEditor from './pages/LightLog';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(() =>
    typeof window === 'undefined'
      ? true
      : window.matchMedia('(min-width: 1024px)').matches,
  );

  return (
    <Router>
      <div className="app-canvas min-h-screen">
        <Navbar isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
        <div
          className={`app-content flex min-h-screen flex-col transition-[margin] duration-300 ${
            isMenuOpen ? 'ml-[92px] lg:ml-[276px]' : 'ml-[92px]'
          }`}
        >
          <AppUpdateBanner />
          <main className="relative z-10 flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/foreign-mail" replace />} />
              <Route path="/foreign-mail" element={<ForeignMail />} />
              <Route path="/gems-message" element={<GemsMessage />} />
              <Route path="/persistent-redirect" element={<PersistentRedirect />} />
              <Route path="/icheck-report" element={<ICheckReport />} />
              <Route path="/light-log" element={<LightLogEditor />} />
              <Route path="/persistent-event-excel" element={<PersistentEventExcel />} />
              <Route path="/auto-backup-error-filter" element={<AutoBackupErrorFilter />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="app-footer relative z-10 mx-4 mb-4 rounded-2xl border border-white/80 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-xl sm:mx-6 lg:mx-8">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-4 text-xs text-slate-500 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-700">
                  Operation CNS Elect
                  <span className="ml-2 font-normal text-slate-400">
                    LG CNS 전자팀의 반복 작업을 줄이기 위한 내부 업무 지원 도구
                  </span>
                </p>
                <p className="leading-5">
                  데이터 가공과 JSON 파일 공유는 브라우저에서 수행되며 외부 서버에
                  백업 데이터를 저장하지 않습니다.
                </p>
                <p className="text-slate-400">© 2026 Operation CNS Elect</p>
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
