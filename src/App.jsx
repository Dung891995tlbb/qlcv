import React, { useState, useCallback } from 'react';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import { LayoutDashboard, CheckCircle, AlertCircle } from 'lucide-react';

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
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-icon">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="header-title">QLCV Hub</h1>
            <p className="header-subtitle">Dispatcher Control</p>
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

      {/* Main */}
      <main className="main-grid">
        <section className="sidebar">
          <div className="sidebar-sticky">
            <TaskForm onToast={addToast} />
            <div className="glass tips-card">
              <div className="tips-title">Hướng dẫn nhanh</div>
              <ul className="tips-list">
                <li>Nhập thông tin khách và nội dung rồi bấm <strong>Lưu</strong></li>
                <li>Hệ thống tự động tính <strong>thời gian khách đợi</strong></li>
                <li>Nhân sự bấm <strong>Đã xong</strong> trên điện thoại</li>
                <li>Task chờ quá <strong>30 phút</strong> sẽ nhấp nháy đỏ</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-title">Danh sách công việc</h2>
          <TaskList onToast={addToast} />
        </section>
      </main>

      {/* Footer */}
      <footer className="app-footer">
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
  );
}

export default App;
