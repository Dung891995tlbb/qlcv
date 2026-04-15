import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import TaskCard from './TaskCard';
import { Search, Inbox } from 'lucide-react';

const TaskList = ({ onToast }) => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = [];
      querySnapshot.forEach((docSnap) => {
        tasksData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTasks(tasksData);
      setLoading(false);
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
            <TaskCard key={task.id} task={task} onToast={onToast} />
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
