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

  // ─── Startup Diagnostics ──────────────────────────────────────
  useEffect(() => {
    const log = window.log || console.log;
    log('═══════════════════════════════════════');
    log('🚀 QLCV App Loaded');
    log(`📅 ${new Date().toLocaleString('vi-VN')}`);
    log(`🌐 URL: ${window.location.href}`);
    log(`🔑 VITE_ONESIGNAL_APP_ID: ${import.meta.env.VITE_ONESIGNAL_APP_ID ? '✅ SET' : '❌ MISSING'}`);
    log(`📜 OneSignal SDK: ${typeof window.OneSignalDeferred !== 'undefined' || typeof window.OneSignal !== 'undefined' ? '✅ LOADED' : '❌ NOT LOADED'}`);

    log('📜 App Initialization Complete');
    log('═══════════════════════════════════════');
  }, []);

  // ─── OneSignal Initialization ─────────────────────────────────
  useEffect(() => {
    const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
    const log = window.log || console.log;

    if (!APP_ID) {
      log('⚠️ [OneSignal] VITE_ONESIGNAL_APP_ID chưa được cấu hình. Push notification sẽ không hoạt động.');
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      if (OneSignal.initialized) return; // Prevent double init

      try {
        await OneSignal.init({
          appId: APP_ID,
          allowLocalhostAsHTTP: true,
          notifyButton: {
            enable: false, // We use the custom Bell button in AppHeader instead
          },
        });
        log('🔔 [OneSignal] Initialized successfully');

        // Log current subscription status
        const isPushEnabled = await OneSignal.Notifications.permission;
        log(`📢 [OneSignal] Permission: ${isPushEnabled ? 'GRANTED ✅' : 'DENIED/NOT REQUESTED ❌'}`);

        OneSignal.User.PushSubscription.addEventListener("change", (event) => {
          log("🔄 [OneSignal] Subscription changed:", JSON.stringify({
            id: event.current?.id || 'N/A',
            optedIn: event.current?.optedIn,
          }));
        });

        const sub = await OneSignal.User.PushSubscription;
        log(`🆔 [OneSignal] Sub ID: ${sub.id || 'N/A'}`);
        log(`✅ [OneSignal] Opted In: ${sub.optedIn}`);
      } catch (err) {
        log(`❌ [OneSignal] Init error: ${err.message}`);
      }
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
