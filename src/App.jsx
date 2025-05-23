import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Navbar from './components/Navbar';
import ServerFilter from './pages/ServerFilter';
import ForeignMail from './pages/ForeignMail';
import Redirect from './pages/Redirect';
import AutoBackupErrorFilter from './pages/AutoBackupErrorFilter';

function App() {
  return (
    <Router>
      <div className="w-full min-h-screen">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/foreign-mail" replace />} />
          <Route path="/server-filter" element={<ServerFilter />} />
          <Route path="/foreign-mail" element={<ForeignMail />} />
          <Route path="/redirect" element={<Redirect />} />
          <Route path="/auto-backup-error-filter" element={<AutoBackupErrorFilter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <footer className="w-full p-6 bg-gray-800">
        <span className="font-bold text-gray-300">
          ※ 해당 서비스는{' '}
          <strong className="text-red-400">서버가 존재하지 않으며</strong>,
          데이터베이스를 사용하지 않아{' '}
          <strong className="text-red-400">
            입력되는 데이터들은 로컬 스토리지(사용자의 개인 컴퓨터) 말고는 일체
            저장하지 않습니다.
          </strong>{' '}
          <br />
          OP 업무의 편의성을 높이고자 만든 서비스이며,{' '}
          <strong className="text-red-400">
            문제시 호스팅을 중지하겠습니다.
          </strong>{' '}
          <br />
          특이사항은 wldns0622@cnspartner.com로 문의주시면 감사하겠습니다.
        </span>
      </footer>
    </Router>
  );
}

export default App;
