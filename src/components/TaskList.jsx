/**
 * TaskList — Displays stats, filters, and the task feed.
 * Pure presentation component; data comes from useTasks hook.
 */
import React from 'react';
import TaskCard from './TaskCard';
import useTasks from '../hooks/useTasks';
import useTimer from '../hooks/useTimer';
import { Inbox } from 'lucide-react';

const FILTERS = [
  { key: 'all',       label: 'Tổng lệnh',  colorClass: 'accent' },
  { key: 'pending',   label: 'Đang chờ',    colorClass: 'warning' },
  { key: 'completed', label: 'Đã xong',     colorClass: 'success' },
];

const TaskList = ({ onToast, isAdmin }) => {
  const { tasks, loading, pendingCount, completedCount, filter, setFilter, filteredTasks } = useTasks(onToast);
  const now = useTimer();

  const counts = {
    all: tasks.length,
    pending: pendingCount,
    completed: completedCount,
  };

  return (
    <div className="fade-in">
      {/* Stats & Filter */}
      <div className="stats-bar">
        {FILTERS.map(({ key, label, colorClass }) => (
          <div
            key={key}
            className={`stat-item ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            <div className={`stat-number ${colorClass}`}>{counts[key]}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Task Feed */}
      <div>
        {loading ? (
          <SkeletonList />
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onToast={onToast} now={now} isAdmin={isAdmin} />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────

const SkeletonList = () => (
  <>
    {[1, 2, 3].map((n) => (
      <div key={n} className="skeleton-card">
        <div className="skeleton skeleton-box" style={{ height: '120px', borderRadius: 'var(--radius-md)' }} />
      </div>
    ))}
  </>
);

const EmptyState = () => (
  <div className="glass empty-state">
    <div className="empty-icon"><Inbox size={64} /></div>
    <div className="empty-title">Trình quản lý đang trống</div>
    <div className="empty-desc">Hệ thống sẵn sàng cho các lệnh điều phối mới.</div>
  </div>
);

export default TaskList;
