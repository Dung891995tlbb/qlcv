import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowUpRight, BarChart3, Check, CheckCircle2, ClipboardList, Plus, X, Zap, Clock3, AlertCircle, Info, Trash2 } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import AppHeader from './components/AppHeader';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import Analytics from './components/Analytics';
import Sheet from './components/Sheet';
import useTasks from './hooks/useTasks';
import useTimer from './hooks/useTimer';
import { completeTask, editTask, removeTask } from './lib/taskStore';
import { createId, toDate } from './lib/utils';
import { isLocalPreview } from './firebase';
import { sendAppNotification } from './lib/onesignal';

function AppContent() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const workPath = isAdmin ? '/admin' : '/';
  const reportPath = isAdmin ? '/admin/report' : '/report';
  const { tasks, loading, error, sync } = useTasks();
  const now = useTimer(30000);
  const [sheet, setSheet] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef(new Map());

  useEffect(() => {
    const timers = toastTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const dismissToast = useCallback((id) => {
    clearTimeout(toastTimers.current.get(id));
    toastTimers.current.delete(id);
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback((type, message, action) => {
    const id = createId();
    setToasts((items) => [...items.slice(-1), { id, type, message, action }]);
    toastTimers.current.set(id, setTimeout(() => dismissToast(id), action ? 7000 : 5000));
  }, [dismissToast]);

  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (isLocalPreview || !appId) return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      if (OneSignal.initialized) return;
      try { await OneSignal.init({ appId, allowLocalhostAsHTTP: true, notifyButton: { enable: false } }); }
      catch (failure) { console.error('Notification initialization failed:', failure); }
    });
  }, []);

  const handleComplete = async (task) => {
    try {
      await completeTask(task.id);
      addToast('success', `Đã hoàn thành việc của ${task.customerName}`, {
        label: 'Hoàn tác',
        run: async () => {
          try { await editTask(task.id, { status: 'pending', completedAt: null }); addToast('success', 'Đã đưa về danh sách đang chờ'); }
          catch { addToast('error', 'Chưa hoàn tác được. Vui lòng thử lại.'); }
        },
      });
      if (!isLocalPreview) {
        void sendAppNotification('QLCV · Hoàn thành ✓', `${task.customerName} — ${task.content}`, { url: '/' })
          .then((result) => { if (result?.error) addToast('error', 'Đã lưu trạng thái, nhưng chưa gửi được thông báo.'); })
          .catch(() => addToast('error', 'Đã lưu trạng thái, nhưng chưa gửi được thông báo.'));
      }
    } catch { addToast('error', 'Chưa hoàn thành được công việc. Vui lòng thử lại.'); }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try { await removeTask(sheet.task.id); setSheet(null); addToast('success', 'Đã xóa công việc'); }
    catch { addToast('error', 'Chưa xóa được công việc. Vui lòng thử lại.'); }
    finally { setDeleting(false); }
  };

  const pending = tasks.filter((task) => task.status === 'pending');
  const urgent = pending.filter((task) => task.isUrgent).length;
  const completed = tasks.filter((task) => task.status === 'completed' && toDate(task.completedAt) >= startOfDay(now)).length;
  const workPage = <>
    {isAdmin ? <section className="admin-create" aria-label="Giao công việc">
      <div className="admin-create-heading"><p className="eyebrow">{format(now, 'EEEE, dd MMMM yyyy', { locale: vi })}</p></div>
      <TaskForm inline onToast={addToast} />
    </section> : <div className="page-heading"><div><p className="eyebrow">{format(now, 'EEEE, dd MMMM', { locale: vi })}</p><h1>Công việc<span className="heading-dot">.</span></h1><p className="page-description">Nắm rõ từng việc. Hỗ trợ kịp thời.</p></div><button className="button button-primary desktop-create" onClick={() => setSheet({ type: 'create' })}><Plus size={19} /> Giao việc mới</button></div>}
    <div className={isAdmin ? 'work-overview compact-overview' : 'work-overview'}>
    {isAdmin && <h2 className="work-overview-title">Danh sách công việc</h2>}
    <div className="summary-grid" aria-label="Tổng quan công việc">
      <div className="summary-card"><span className="summary-icon blue"><Clock3 size={19} /></span><strong>{loading ? '—' : pending.length}</strong><span>Đang chờ</span></div>
      <div className={`summary-card ${urgent ? 'has-urgent' : ''}`}><span className="summary-icon orange"><Zap size={19} /></span><strong>{loading ? '—' : urgent}</strong><span>Việc gấp</span></div>
      <div className="summary-card"><span className="summary-icon green"><CheckCircle2 size={19} /></span><strong>{loading ? '—' : completed}</strong><span>Xong hôm nay</span></div>
    </div>
    </div>
    <TaskList tasks={tasks} loading={loading} error={error} now={now} onComplete={handleComplete} onEdit={(task) => setSheet({ type: 'edit', task })} onDelete={(task) => setSheet({ type: 'delete', task })} />
    {!loading && !error && <div className="feed-end"><span /><Check size={13} /> Đã hiển thị tất cả công việc<span /></div>}
  </>;

  return <>
    <AppHeader sync={sync} onToast={addToast} />
    <main className="main-content"><Routes><Route path="/" element={workPage} /><Route path="/admin" element={workPage} /><Route path="/report" element={<Analytics tasks={tasks} loading={loading} error={error} now={now} />} /><Route path="/admin/report" element={<Analytics tasks={tasks} loading={loading} error={error} now={now} />} /><Route path="*" element={<div className="empty-state"><h1>Không tìm thấy trang</h1><NavLink className="button button-primary" to="/">Về công việc <ArrowUpRight size={18} /></NavLink></div>} /></Routes></main>
    {pathname !== '/admin' && <button className="floating-create" onClick={() => setSheet({ type: 'create' })}><Plus size={22} strokeWidth={2.5} /> Giao việc</button>}
    <nav className="bottom-nav" aria-label="Điều hướng chính"><NavLink to={workPath} end className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}><ClipboardList size={21} /><span>Công việc</span></NavLink><NavLink to={reportPath} className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}><BarChart3 size={21} /><span>Thống kê</span></NavLink></nav>
    {sheet && <Sheet key={sheet.type + (sheet.task?.id || '')} title={sheet.type === 'delete' ? 'Xóa công việc?' : sheet.type === 'edit' ? 'Chỉnh sửa công việc' : 'Giao việc mới'} subtitle={sheet.type === 'create' ? 'Chọn nhanh công việc, giao ngay cho đội ngũ.' : sheet.type === 'edit' ? 'Cập nhật thông tin yêu cầu hỗ trợ.' : undefined} onClose={() => { if (!deleting) setSheet(null); }}>
      {sheet.type === 'delete' ? <div className="delete-content"><span className="delete-icon"><Trash2 size={26} /></span><p>Công việc của <strong>{sheet.task.customerName}</strong> sẽ bị xóa vĩnh viễn. Bạn muốn tiếp tục?</p><div className="delete-actions"><button className="button button-secondary" disabled={deleting} onClick={() => setSheet(null)}>Giữ lại</button><button className="button button-danger" disabled={deleting} onClick={handleDelete}>{deleting ? 'Đang xóa…' : 'Xóa công việc'}</button></div></div> : <TaskForm task={sheet.task} onToast={addToast} onClose={() => setSheet(null)} />}
    </Sheet>}
    <div className="toast-container" aria-live="polite" aria-atomic="false">{toasts.map((toast) => <div className={`toast toast-${toast.type}`} key={toast.id}>{toast.type === 'success' ? <CheckCircle2 size={19} /> : toast.type === 'error' ? <AlertCircle size={19} /> : <Info size={19} />}<span>{toast.message}</span>{toast.action && <button className="toast-action" onClick={() => { dismissToast(toast.id); void toast.action.run(); }}>{toast.action.label}</button>}<button className="toast-close" aria-label="Đóng thông báo" onClick={() => dismissToast(toast.id)}><X size={16} /></button></div>)}</div>
  </>;
}

export default function App() { return <BrowserRouter><AppContent /></BrowserRouter>; }
