/**
 * TaskCard — Individual task display with real-time timer,
 * status badge, action buttons, and inline edit.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Clock, MapPin, User, CheckCircle, Trash2, Pencil, X, Save } from 'lucide-react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, TASK_STATUS, THRESHOLDS } from '../lib/constants';
import { toDate, formatDuration, formatProcessingTime } from '../lib/utils';
import { sendAppNotification } from '../lib/onesignal';

const TaskCard = ({ task, onToast, now, isAdmin }) => {
  const [completing, setCompleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [hiding, setHiding] = useState(false);

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
  const badgeText = isCompleted ? '✓ Đã xong' : task.isUrgent ? (
    <><span className="urgent-shake-icon inline-block">⚡</span> GẤP</>
  ) : '○ Chờ xử lý';

  // ─── Edit Handlers ──────────────────────────────────────────
  const startEdit = useCallback(() => {
    setEditData({
      customerName: task.customerName,
      address: task.address || '',
      content: task.content,
      isUrgent: task.isUrgent || false,
    });
    setEditing(true);
  }, [task]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditData({});
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editData.customerName?.trim() || !editData.content?.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.TASKS, task.id), {
        customerName: editData.customerName.trim(),
        address: editData.address.trim(),
        content: editData.content.trim(),
        isUrgent: editData.isUrgent,
      });
      onToast?.('success', 'Đã cập nhật công việc');
      setEditing(false);
    } catch (err) {
      console.error('Edit task error:', err);
      onToast?.('error', 'Lỗi cập nhật!');
    } finally {
      setSaving(false);
    }
  }, [task.id, editData, onToast]);

  const updateEditField = useCallback((field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  // ─── Complete Handler ───────────────────────────────────────
  const handleComplete = useCallback(async () => {
    setCompleting(true);
    setHiding(true); // Kích hoạt CSS biến mất mượt mà
    
    // Đợi 400ms cho animation chạy xong rồi mới update DB (tạo cảm giác task lướt đi)
    setTimeout(async () => {
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
      setHiding(false); // Rollback animation nếu lỗi
    } finally {
      setCompleting(false);
    }
    }, 400); // 400ms delay
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

  // ─── Render: Edit Mode ──────────────────────────────────────
  if (editing) {
    return (
      <div className={`glass task-card fade-in editing`}>
        <div className="task-header">
          <div className="task-badge badge-editing">✏️ Chỉnh sửa</div>
          <button className="btn-icon btn-cancel-edit" onClick={cancelEdit} title="Hủy">
            <X size={18} />
          </button>
        </div>

        <div className="edit-form">
          <div className="edit-group">
            <label className="form-label">Tên khách hàng</label>
            <input
              type="text"
              className="form-input"
              value={editData.customerName}
              onChange={(e) => updateEditField('customerName', e.target.value)}
              autoFocus
            />
          </div>
          <div className="edit-group">
            <label className="form-label">Địa chỉ</label>
            <input
              type="text"
              className="form-input"
              value={editData.address}
              onChange={(e) => updateEditField('address', e.target.value)}
            />
          </div>
          <div className="edit-group">
            <label className="form-label">Nội dung</label>
            <textarea
              rows="2"
              className="form-textarea"
              value={editData.content}
              onChange={(e) => updateEditField('content', e.target.value)}
            />
          </div>
          <div
            className={`urgent-toggle compact ${editData.isUrgent ? 'active' : ''}`}
            onClick={() => updateEditField('isUrgent', !editData.isUrgent)}
          >
            <input type="checkbox" checked={editData.isUrgent} readOnly className="urgent-checkbox" />
            <span className="urgent-title">GẤP</span>
          </div>
        </div>

        <div className="task-actions">
          <button onClick={saveEdit} disabled={saving} className="btn-complete">
            <Save size={18} />
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Normal Mode ────────────────────────────────────
  return (
    <div 
      className={`glass task-card fade-in ${statusClass} ${hiding ? 'hiding' : ''}`}
      id={`task-card-${task.id}`}
    >
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
          <>
            <button onClick={startEdit} className="btn-edit" title="Chỉnh sửa">
              <Pencil size={18} />
            </button>
            <button onClick={handleDelete} className="btn-delete" title="Xóa công việc">
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
