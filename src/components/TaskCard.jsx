import React, { useState, useEffect, useMemo } from 'react';
import { differenceInMinutes, differenceInSeconds } from 'date-fns';
import { Clock, MapPin, User, CheckCircle, Trash2 } from 'lucide-react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const TaskCard = ({ task, onToast, now, isAdmin }) => {
  const [completing, setCompleting] = useState(false);

  // Lấy thời điểm tạo task
  const createdDate = useMemo(() => {
    if (!task.createdAt) return null;
    return task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
  }, [task.createdAt]);

  // Bộ đếm thời gian (MM:SS) theo thời gian thực
  const waitDisplay = useMemo(() => {
    if (!createdDate || !now) return 'Vừa tạo';
    const totalSec = differenceInSeconds(now, createdDate);
    if (totalSec < 0) return '00:00';
    
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    
    if (h > 0) return `${h}:${mStr}:${sStr}`;
    return `${mStr}:${sStr}`;
  }, [createdDate, now]);

  const waitMinutes = createdDate ? differenceInMinutes(now, createdDate) : 0;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const taskRef = doc(db, "tasks", task.id);
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: serverTimestamp()
      });
      onToast?.('success', `Đã hoàn thành: ${task.customerName}`);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      onToast?.('error', 'Lỗi khi cập nhật!');
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa task này?")) {
      try {
        await deleteDoc(doc(db, "tasks", task.id));
        onToast?.('success', 'Đã xóa công việc');
      } catch (error) {
        console.error("Lỗi xóa task:", error);
        onToast?.('error', 'Lỗi khi xóa!');
      }
    }
  };

  const isCompleted = task.status === 'completed';
  const isUrgent = !isCompleted && waitMinutes >= 30;

  // Tính thời gian hoàn thành
  const completedInfo = useMemo(() => {
    if (!isCompleted || !task.completedAt || !createdDate) return null;
    const completedDate = task.completedAt.toDate ? task.completedAt.toDate() : new Date(task.completedAt);
    const totalMins = differenceInMinutes(completedDate, createdDate);
    if (totalMins < 60) return `Xử lý trong ${totalMins} phút`;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `Xử lý trong ${h}h ${m}p`;
  }, [isCompleted, task.completedAt, createdDate]);

  return (
    <div className={`glass task-card fade-in ${isCompleted ? 'completed' : 'pending'}`}>
      <div className="task-header">
        <div className={`task-timer ${isUrgent ? 'timer-urgent' : ''}`}>
          <Clock size={14} />
          <span>{isCompleted ? (completedInfo || 'Đã xong') : `Đợi: ${waitDisplay}`}</span>
        </div>
        <div className={`task-badge ${isCompleted ? 'badge-completed' : 'badge-pending'}`}>
          {isCompleted ? '✓ Hoàn thành' : 'Đang chờ'}
        </div>
      </div>

      <div className="task-body">
        <div className="task-customer">
          <User size={16} />
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
          <button
            onClick={handleComplete}
            disabled={completing}
            className="btn-complete"
          >
            <CheckCircle size={16} />
            {completing ? 'Đang lưu...' : 'Đã xong'}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={handleDelete}
            className="btn-delete"
            title="Xóa công việc"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
