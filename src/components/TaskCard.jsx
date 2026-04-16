/**
 * TaskCard — Individual task display with real-time timer,
 * status badge, and action buttons.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Clock, MapPin, User, CheckCircle, Trash2 } from 'lucide-react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, TASK_STATUS, THRESHOLDS } from '../lib/constants';
import { toDate, formatDuration, formatProcessingTime } from '../lib/utils';
import { sendAppNotification } from '../lib/onesignal';

const TaskCard = ({ task, onToast, now, isAdmin }) => {
  const [completing, setCompleting] = useState(false);

  // ─── Derived values ─────────────────────────────────────────
  const createdDate = useMemo(() => toDate(task.createdAt), [task.createdAt]);
  const isCompleted = task.status === TASK_STATUS.COMPLETED;
  const waitMinutes = createdDate ? differenceInMinutes(now, createdDate) : 0;
  const isDelayed = !isCompleted && waitMinutes >= THRESHOLDS.DELAYED_MINUTES;

  const timerText = useMemo(() => {
    if (isCompleted) {
      const completedDate = toDate(task.completedAt);
      const time = formatProcessingTime(createdDate, completedDate);
      return `Xử lý trong ${time || '...'}`;
    }
    return `Khách đã đợi: ${formatDuration(createdDate, now)}`;
  }, [isCompleted, createdDate, task.completedAt, now]);

  const statusClass = isCompleted ? 'completed' : task.isUrgent ? 'urgent' : 'pending';
  const badgeClass = isCompleted ? 'badge-completed' : task.isUrgent ? 'badge-urgent' : 'badge-pending';
  const badgeText = isCompleted ? '✓ Đã xong' : task.isUrgent ? '⚡ GẤP' : 'Chờ xử lý';

  // ─── Handlers ───────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    setCompleting(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.TASKS, task.id), {
        status: TASK_STATUS.COMPLETED,
        completedAt: serverTimestamp(),
      });
      onToast?.('success', `Hoàn thành: ${task.customerName}`);

      // ─── Push noti khi hoàn thành task ───────────────────────
      try {
        const addr = task.address ? ` · ${task.address}` : '';
        const title = 'QLCV · Hoàn thành ✓';
        const body = `${task.customerName}${addr} — ${task.content}`;
        await sendAppNotification(title, body, { url: '/' });
      } catch (notiErr) {
        (window.log || console.error)('❌ [TaskCard] Noti error:', notiErr.message);
      }
    } catch (err) {
      console.error('Complete task error:', err);
      onToast?.('error', 'Lỗi cập nhật trạng thái!');
    } finally {
      setCompleting(false);
    }
  }, [task.id, task.customerName, task.address, task.content, onToast]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Xác nhận xóa vĩnh viễn công việc này?')) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.TASKS, task.id));
      onToast?.('success', 'Đã xóa dữ liệu');
    } catch (err) {
      console.error('Delete task error:', err);
      onToast?.('error', 'Lỗi khi xóa!');
    }
  }, [task.id, onToast]);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className={`glass task-card fade-in ${statusClass}`}>
      <div className="task-header">
        <div className={`task-timer ${isDelayed ? 'timer-urgent' : ''}`}>
          <Clock size={14} />
          <span>{timerText}</span>
        </div>
        <div className={`task-badge ${badgeClass}`}>{badgeText}</div>
      </div>

      <div className="task-body">
        <div className="task-customer">
          <User size={18} />
          <span>{task.customerName}</span>
        </div>

        {task.address && (
          <div className="task-address">
            <MapPin size={14} />
            <span>{task.address}</span>
          </div>
        )}

        <div className="task-content">{task.content}</div>
      </div>

      <div className="task-actions">
        {!isCompleted && (
          <button onClick={handleComplete} disabled={completing} className="btn-complete">
            <CheckCircle size={18} />
            <span>{completing ? 'Đang lưu...' : 'Đã hoàn thành'}</span>
          </button>
        )}

        {isAdmin && (
          <button onClick={handleDelete} className="btn-delete" title="Xóa công việc">
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
