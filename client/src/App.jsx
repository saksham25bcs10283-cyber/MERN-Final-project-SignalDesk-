import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar  from './components/Sidebar';
import Topbar   from './components/Topbar';
import Overview from './pages/Overview';
import Inbox    from './pages/Inbox';
import Insights from './pages/Insights';
import Actions  from './pages/Actions';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <Topbar />
          <Routes>
            <Route path="/"         element={<Overview />} />
            <Route path="/inbox"    element={<Inbox />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/actions"  element={<Actions />} />
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
