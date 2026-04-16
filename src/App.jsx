import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import Analytics from './components/Analytics';
import AppHeader from './components/AppHeader';
import { LayoutDashboard, CheckCircle, AlertCircle, Smartphone, BarChart2 } from 'lucide-react';
import { THRESHOLDS } from './lib/constants';

// ─── Views ──────────────────────────────────────────────────────

const PersonnelView = ({ addToast }) => (
  <div className="fade-in">
    <AppHeader
      icon={<Smartphone size={22} />}
      title="QLCV Field"
      syncLabel="Online"
      variant="field"
    >
      <span className="nav-link active">Nhân sự hỗ trợ</span>
    </AppHeader>

    <main>
      <TaskList onToast={addToast} isAdmin={false} />
    </main>
  </div>
);

const AdminView = ({ addToast }) => (
  <div className="fade-in">
    <AppHeader
      icon={<LayoutDashboard size={24} />}
      title="QLCV Admin"
      syncLabel="Firestore Sync"
    >
      <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>ĐIỀU PHỐI</NavLink>
      <NavLink to="/admin/report" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>THỐNG KÊ</NavLink>
      <NavLink to="/" className="nav-link">FIELD VIEW</NavLink>
    </AppHeader>

    <main className="main-grid">
      <section className="sidebar">
        <div className="sidebar-sticky">
          <TaskForm onToast={addToast} />
          <div className="glass tips-card">
            <div className="tips-title">Quản trị viên</div>
            <ul className="tips-list">
              <li>Hoàn thành task để lưu lịch sử</li>
              <li>Sắp xếp tự động theo mức độ gấp</li>
              <li>Thông báo âm thanh thời gian thực</li>
              <li>Dữ liệu bảo mật trên Cloud</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Danh sách công việc</h2>
        <TaskList onToast={addToast} isAdmin={true} />
      </section>
    </main>
  </div>
);

const ReportView = () => (
  <div className="fade-in">
    <AppHeader
      icon={<BarChart2 size={22} />}
      title="Báo Cáo Phân Tích"
      syncLabel="System Sync"
      variant="report"
    >
      <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>ĐIỀU PHỐI</NavLink>
      <NavLink to="/admin/report" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>THỐNG KÊ</NavLink>
    </AppHeader>

    <main>
      <Analytics />
    </main>
  </div>
);

// ─── Root ───────────────────────────────────────────────────────

function App() {
  const [toasts, setToasts] = useState([]);

  // ─── OneSignal Initialization ─────────────────────────────────
  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({
        appId: "433cb78d-2f07-43e7-869b-2bbc90800ba4",
        safari_web_id: "web.onesignal.auto.109e320d-7f41-4560-9bc7-60e0a359b6c1", // Optional
        notifyButton: {
          enable: false, // We'll manage opt-in via prompt or settings later
        },
      });
      console.log('🔔 OneSignal Initialized');
    });
  }, []);

  const addToast = useCallback((type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, THRESHOLDS.TOAST_DURATION);
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<PersonnelView addToast={addToast} />} />
          <Route path="/admin" element={<AdminView addToast={addToast} />} />
          <Route path="/admin/report" element={<ReportView />} />
        </Routes>

        <footer className="app-footer">
          © 2026 QLCV PREMIUM SYSTEM · Dũng
        </footer>

        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </Router>
  );
}

export default App;
