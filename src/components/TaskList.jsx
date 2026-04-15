import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import TaskCard from './TaskCard';
import { Search, Inbox, BellRing } from 'lucide-react';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    // Tiếng chuông êm tai hơn (G5)
    osc.frequency.setValueAtTime(783.99, ctx.currentTime);
    
    // Tăng âm lượng mượt mà và giảm dần từ từ
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {
    console.error("Audio error", e);
  }
};

const TaskList = ({ onToast }) => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [globalNow, setGlobalNow] = useState(new Date());
  const isInitialLoad = useRef(true);

  // Bộ đếm thời gian dùng chung (tick mỗi 1 giây)
  useEffect(() => {
    const timer = setInterval(() => setGlobalNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Xin quyền thông báo ngay khi mở
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") setNotificationsEnabled(true);
        });
      }
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = [];
      let newPendingTasksCount = 0;

      querySnapshot.forEach((docSnap) => {
        tasksData.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Kiểm tra xem có task nào MỚI được thêm vào không (chỉ check sau lần load đầu tiên)
      querySnapshot.docChanges().forEach((change) => {
        if (!isInitialLoad.current && change.type === "added" && change.doc.data().status === 'pending') {
          newPendingTasksCount++;
        }
      });

      if (newPendingTasksCount > 0) {
        playNotificationSound();
        if (Notification.permission === 'granted') {
          new Notification("QLCV Hub", { 
            body: `Có ${newPendingTasksCount} công việc mới!`,
            icon: '/favicon.svg'
          });
        }
      }

      setTasks(tasksData);
      setLoading(false);
      isInitialLoad.current = false;
    }, (error) => {
      console.error("Lỗi Real-time:", error);
      setLoading(false);
      onToast?.('error', 'Lỗi kết nối Firestore!');
    });

    return () => unsubscribe();
  }, [onToast]);

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  const filteredTasks = tasks.filter(task => {
    const matchFilter = filter === 'all' || task.status === filter;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      (task.customerName && task.customerName.toLowerCase().includes(term)) ||
      (task.address && task.address.toLowerCase().includes(term)) ||
      (task.content && task.content.toLowerCase().includes(term));
    return matchFilter && matchSearch;
  });

  return (
    <div>
      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-number accent">{tasks.length}</div>
          <div className="stat-label">Tổng</div>
        </div>
        <div className="stat-item">
          <div className="stat-number warning">{pendingCount}</div>
          <div className="stat-label">Chờ xử lý</div>
        </div>
        <div className="stat-item">
          <div className="stat-number success">{completedCount}</div>
          <div className="stat-label">Hoàn thành</div>
        </div>
      </div>

      {/* Search */}
      <div className="search-wrapper">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          placeholder="Tìm theo tên, địa chỉ, nội dung..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div 
          className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-1 ${notificationsEnabled ? 'text-accent bg-accent-glow border border-accent/20 rounded-md' : 'text-text-muted'} transition-all`}
          style={{ pointerEvents: 'none' }}
        >
          <BellRing size={12} />
          {notificationsEnabled ? 'Thông báo ON' : 'Thông báo OFF'}
        </div>
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tất cả ({tasks.length})
        </button>
        <button
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Chờ xử lý ({pendingCount})
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Hoàn thành ({completedCount})
        </button>
      </div>

      {/* Task List */}
      <div>
        {loading ? (
          <>
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-card">
                <div className="skeleton-header">
                  <div className="skeleton skeleton-line"></div>
                  <div className="skeleton skeleton-badge"></div>
                </div>
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-text"></div>
                <div className="skeleton skeleton-box"></div>
                <div className="skeleton skeleton-btn"></div>
              </div>
            ))}
          </>
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} onToast={onToast} now={globalNow} />
          ))
        ) : (
          <div className="glass empty-state">
            <div className="empty-icon">
              <Inbox size={48} />
            </div>
            <div className="empty-title">
              {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có công việc nào'}
            </div>
            <div className="empty-desc">
              {searchTerm ? 'Thử từ khóa khác nhé' : 'Nhập task mới ở form bên trái để bắt đầu'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
