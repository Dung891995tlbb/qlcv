/**
 * Analytics — Performance dashboard with date-based history,
 * task detail table, and auto-cleanup of old data (>1 month).
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { differenceInSeconds, differenceInMinutes, format, startOfDay, endOfDay, subDays, addDays, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { COLLECTIONS, TASK_STATUS } from '../lib/constants';
import { toDate, formatProcessingTime } from '../lib/utils';
import { BarChart, Clock, Zap, Target, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-react';

// ─── Auto-cleanup: delete tasks older than 1 month ──────────────
const cleanupOldTasks = async () => {
  const log = window.log || console.log;
  try {
    const cutoff = subMonths(new Date(), 1);
    const cutoffTimestamp = Timestamp.fromDate(cutoff);

    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('createdAt', '<', cutoffTimestamp)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      log('🧹 [Cleanup] No tasks older than 1 month');
      return;
    }

    log(`🧹 [Cleanup] Found ${snapshot.size} tasks older than 1 month — deleting...`);
    const deletePromises = [];
    snapshot.forEach((docSnap) => {
      deletePromises.push(deleteDoc(doc(db, COLLECTIONS.TASKS, docSnap.id)));
    });
    await Promise.all(deletePromises);
    log(`🧹 [Cleanup] Deleted ${snapshot.size} old tasks ✅`);
  } catch (err) {
    log(`🧹 [Cleanup] Error: ${err.message}`);
  }
};

// ─── Stat cards config ──────────────────────────────────────────
const STAT_CARDS = [
  { key: 'total',       label: 'Tổng task',    colorClass: 'accent',  icon: Target },
  { key: 'completed',   label: 'Đã xong',      colorClass: 'success', icon: null },
  { key: 'pending',     label: 'Đang chờ',      colorClass: 'warning', icon: null },
  { key: 'avgWaitMins', label: 'TB xử lý (p)',  colorClass: 'info',    icon: Clock },
];

const Analytics = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Run cleanup once on mount ────────────────────────────────
  useEffect(() => {
    cleanupOldTasks();
  }, []);

  // ─── Load tasks for selected date ─────────────────────────────
  useEffect(() => {
    setLoading(true);
    const dayStart = Timestamp.fromDate(startOfDay(selectedDate));
    const dayEnd = Timestamp.fromDate(endOfDay(selectedDate));

    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('createdAt', '>=', dayStart),
      where('createdAt', '<=', dayEnd),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTasks(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  // ─── Date navigation ──────────────────────────────────────────
  const today = useMemo(() => startOfDay(new Date()), []);
  const minDate = useMemo(() => subMonths(today, 1), [today]);
  const isToday = useMemo(() => startOfDay(selectedDate).getTime() === today.getTime(), [selectedDate, today]);
  const isMinDate = useMemo(() => startOfDay(selectedDate).getTime() <= minDate.getTime(), [selectedDate, minDate]);

  const goBack = useCallback(() => {
    if (!isMinDate) setSelectedDate(prev => subDays(prev, 1));
  }, [isMinDate]);

  const goForward = useCallback(() => {
    if (!isToday) setSelectedDate(prev => addDays(prev, 1));
  }, [isToday]);

  const goToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // ─── Computed stats ───────────────────────────────────────────
  const stats = useMemo(() => {
    let total = tasks.length;
    let completed = 0, pending = 0;
    let totalWaitSecs = 0, fastestSecs = Infinity;

    tasks.forEach((task) => {
      if (task.status === TASK_STATUS.COMPLETED) {
        completed++;
        const created = toDate(task.createdAt);
        const done = toDate(task.completedAt);
        if (created && done) {
          const diff = differenceInSeconds(done, created);
          if (diff >= 0) {
            totalWaitSecs += diff;
            if (diff < fastestSecs) fastestSecs = diff;
          }
        }
      } else {
        pending++;
      }
    });

    return {
      total, completed, pending,
      avgWaitMins: completed > 0 ? Math.round((totalWaitSecs / completed) / 60) : 0,
      fastestMins: fastestSecs === Infinity ? 0 : Math.round(fastestSecs / 60),
    };
  }, [tasks]);

  // ─── Format date display ──────────────────────────────────────
  const dateDisplay = useMemo(() => {
    if (isToday) return 'Hôm nay';
    return format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi });
  }, [selectedDate, isToday]);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="fade-in">
      <h2 className="section-title">
        <BarChart size={24} className="text-gradient" />
        LỊCH SỬ & THỐNG KÊ
      </h2>

      {/* Date Picker */}
      <div className="glass date-picker-card">
        <button
          className="btn-icon date-nav-btn"
          onClick={goBack}
          disabled={isMinDate}
          title="Ngày trước"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="date-display" onClick={goToday}>
          <Calendar size={18} />
          <span className="date-text">{dateDisplay}</span>
          <span className="date-sub">{format(selectedDate, 'dd/MM/yyyy')}</span>
        </div>

        <button
          className="btn-icon date-nav-btn"
          onClick={goForward}
          disabled={isToday}
          title="Ngày sau"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="analytics-grid">
        {STAT_CARDS.map(({ key, label, colorClass, icon: Icon }) => (
          <div key={key} className="stat-item glass analytics-card">
            <div className={`stat-number ${colorClass}`}>{stats[key]}</div>
            <div className="stat-label">
              {Icon && <Icon size={16} />}
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Task History Table */}
      <div className="glass history-card">
        <h3 className="history-title">
          📋 Chi tiết công việc
          <span className="history-count">{tasks.length} task</span>
        </h3>

        {loading ? (
          <div className="skeleton skeleton-box" style={{ height: '200px', borderRadius: 'var(--radius-md)' }} />
        ) : tasks.length === 0 ? (
          <div className="history-empty">
            Không có công việc nào trong ngày này
          </div>
        ) : (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Trạng thái</th>
                  <th>Khách hàng</th>
                  <th>Địa chỉ</th>
                  <th>Nội dung</th>
                  <th>Giờ tạo</th>
                  <th>Xử lý</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const created = toDate(task.createdAt);
                  const completed = toDate(task.completedAt);
                  const isDone = task.status === TASK_STATUS.COMPLETED;
                  const processTime = isDone ? formatProcessingTime(created, completed) : null;

                  const handleDelete = async () => {
                    if (!window.confirm(`Xóa task "${task.customerName}"?`)) return;
                    try {
                      await deleteDoc(doc(db, COLLECTIONS.TASKS, task.id));
                    } catch (err) {
                      console.error('Delete error:', err);
                    }
                  };

                  return (
                    <tr key={task.id} className={isDone ? 'row-completed' : task.isUrgent ? 'row-urgent' : ''}>
                      <td>
                        <span className={`table-badge ${isDone ? 'tb-done' : task.isUrgent ? 'tb-urgent' : 'tb-pending'}`}>
                          {isDone ? '✓' : task.isUrgent ? '⚡' : '○'}
                        </span>
                      </td>
                      <td className="td-name">{task.customerName}</td>
                      <td className="td-addr">{task.address || '—'}</td>
                      <td className="td-content">{task.content}</td>
                      <td className="td-time">{created ? format(created, 'HH:mm') : '—'}</td>
                      <td className="td-process">{processTime || (isDone ? '—' : '...')}</td>
                      <td>
                        <button className="btn-table-delete" onClick={handleDelete} title="Xóa">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Insight */}
      {stats.total > 0 && (
        <div className="glass insight-card">
          <h3>💡 Tổng kết ngày</h3>
          <div className="insight-text">
            Tổng <span className="insight-highlight">{stats.total}</span> yêu cầu,{' '}
            hoàn thành <span className="insight-highlight">{stats.completed}</span>{' '}
            ({stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(0) : 0}%).
            {stats.pending > 0 && <> Còn <span className="insight-highlight">{stats.pending}</span> chưa xong.</>}
            {stats.avgWaitMins > 0 && (
              <> Thời gian xử lý trung bình <span className="insight-highlight">{stats.avgWaitMins} phút</span>.</>
            )}
            {stats.fastestMins > 0 && (
              <> Nhanh nhất <span className="insight-highlight">{stats.fastestMins} phút</span>.</>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
