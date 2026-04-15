import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import Analytics from './components/Analytics';
import { LayoutDashboard, CheckCircle, AlertCircle, Smartphone, BarChart2 } from 'lucide-react';

const PersonnelView = ({ addToast }) => (
  <>
    <header className="app-header" style={{ marginBottom: '1rem', paddingBottom: '1rem' }}>
      <div className="header-left">
        <div className="header-icon" style={{ background: 'linear-gradient(135deg, #3B82F6, #10B981)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
          <Smartphone size={24} />
        </div>
        <div>
          <h1 className="header-title">QLCV Field</h1>
          <p className="header-subtitle">Nhân sự hỗ trợ</p>
        </div>
      </div>
      <div className="sync-status">
        <div className="sync-badge">
          <span className="sync-dot"></span>
          Real-time
        </div>
        <div className="sync-label">Online</div>
      </div>
    </header>

    <main>
      <TaskList onToast={addToast} isAdmin={false} />
    </main>
  </>
);

const AdminView = ({ addToast }) => (
  <>
    <header className="app-header">
      <div className="header-left">
        <div className="header-icon">
          <LayoutDashboard size={24} />
        </div>
        <div>
          <h1 className="header-title">QLCV Admin</h1>
          <div className="header-subtitle" style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
            <Link to="/admin" style={{ color: '#FF0080', textDecoration: 'none', fontWeight: 800 }}>● ĐIỀU PHỐI</Link>
            <Link to="/admin/report" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>THỐNG KÊ</Link>
          </div>
        </div>
      </div>
      <div className="sync-status">
        <div className="sync-badge">
          <span className="sync-dot"></span>
          Real-time
        </div>
        <div className="sync-label">Firestore Sync</div>
      </div>
    </header>

    <main className="main-grid">
      <section className="sidebar">
        <div className="sidebar-sticky">
          <TaskForm onToast={addToast} />
          <div className="glass tips-card" style={{ padding: '1.25rem', marginTop: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div className="tips-title" style={{ color: '#FF0080', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>Hướng dẫn quản trị</div>
            <ul className="tips-list" style={{ listStyle: 'none', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <li style={{ marginBottom: '0.5rem' }}>› Nhập khung bên, <strong>bấm Lưu</strong></li>
              <li style={{ marginBottom: '0.5rem' }}>› Tự động tính thời gian khách đợi</li>
              <li style={{ marginBottom: '0.5rem' }}>› Âm thanh báo khi có người chuyển trạng thái</li>
              <li>› Dữ liệu vĩnh viễn không mất khi F5</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Danh sách công việc</h2>
        <TaskList onToast={addToast} isAdmin={true} />
      </section>
    </main>
  </>
);

const ReportView = () => (
  <>
    <header className="app-header">
      <div className="header-left">
        <div className="header-icon" style={{ background: 'var(--bg-hover)' }}>
          <BarChart2 size={24} style={{ color: '#3B82F6' }} />
        </div>
        <div>
          <h1 className="header-title" style={{ color: '#fff' }}>Báo Cáo Phân Tích</h1>
          <div className="header-subtitle" style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
            <Link to="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>ĐIỀU PHỐI</Link>
            <Link to="/admin/report" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 800 }}>● THỐNG KÊ</Link>
          </div>
        </div>
      </div>
      <div className="sync-status">
        <div className="sync-badge">
          <span className="sync-dot"></span>
          Real-time
        </div>
      </div>
    </header>

    <main>
      <Analytics />
    </main>
  </>
);

function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <Router>
      <div className="app-container fade-in">
        <Routes>
          <Route path="/" element={<PersonnelView addToast={addToast} />} />
          <Route path="/admin" element={<AdminView addToast={addToast} />} />
          <Route path="/admin/report" element={<ReportView />} />
        </Routes>

        {/* Footer */}
        <footer className="app-footer" style={{ marginTop: '3rem', paddingTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          © 2026 QLCV System · Tối ưu Mobile & Desktop
        </footer>

        {/* Toast Notifications */}
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </Router>
  );
}

export default App;
