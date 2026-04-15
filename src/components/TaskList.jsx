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

const TaskList = ({ onToast, isAdmin }) => {
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

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isPending = data.status === 'pending';
        let include = true;

        if (!isPending && data.completedAt) {
          const completedDate = data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt);
          // Nếu hoàn thành trước ngày hôm nay -> Archive (ẩn)
          if (completedDate < todayStart) {
            include = false;
          }
        }

        if (include) {
          tasksData.push({ id: docSnap.id, ...data });
        }
      });

      // Hàm helper để lấy timestamp an toàn
      const getTime = (t) => {
        if (!t) return Date.now();
        return t.toMillis ? t.toMillis() : new Date(t).getTime();
      };

      // Áp dụng thuật toán sắp xếp đa tầng
      tasksData.sort((a, b) => {
        // Tầng 1: Đổi trạng thái -> Pending nổi lên trên, Completed chìm xuống đáy
        if (a.status === 'pending' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'pending') return 1;

        // Tầng 1.5: Khách VIP (GẤP) đưa lên trên cùng của Cùng 1 nhóm Đang Chờ
        if (a.status === 'pending' && b.status === 'pending') {
           if (a.isUrgent && !b.isUrgent) return -1;
           if (!a.isUrgent && b.isUrgent) return 1;
           // Tầng 2: Nếu cả hai đều Pending (cùng mức Gấp hoặc cùng mức Thường) 
           // -> Ưu tiên đứa đợi lâu nhất (createdAt nhỏ nhất) lên đầu
           return getTime(a.createdAt) - getTime(b.createdAt);
        }

        // Tầng 3: Nếu cả hai đều Completed -> Ưu tiên đưa thẻ MỚI hoàn thành gần đây nhất lên trên
        if (a.status === 'completed' && b.status === 'completed') {
          const timeA = getTime(a.completedAt || a.createdAt);
          const timeB = getTime(b.completedAt || b.createdAt);
          return timeB - timeA;
        }
        return 0;
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
            <TaskCard key={task.id} task={task} onToast={onToast} now={globalNow} isAdmin={isAdmin} />
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
