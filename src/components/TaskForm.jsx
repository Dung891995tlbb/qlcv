/**
 * TaskForm — Create new task form with urgent toggle.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, TASK_STATUS } from '../lib/constants';
import { PlusCircle, Send } from 'lucide-react';
import { sendAppNotification } from '../lib/onesignal';

const INITIAL_FORM = Object.freeze({
  customerName: '',
  address: '',
  content: '',
  isUrgent: false,
});

const TaskForm = ({ onToast }) => {
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [loading, setLoading] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Controlled field updater
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const name = formData.customerName.trim();
    const content = formData.content.trim();
    if (!name || !content) return;

    setLoading(true);
    try {
      await addDoc(collection(db, COLLECTIONS.TASKS), {
        customerName: name,
        address: formData.address.trim(),
        content,
        status: TASK_STATUS.PENDING,
        isUrgent: formData.isUrgent,
        createdAt: serverTimestamp(),
      });

      setFormData({ ...INITIAL_FORM });
      nameInputRef.current?.focus();
      onToast?.('success', 'Khởi tạo công việc thành công!');

      // ─── Trigger OneSignal Push Notification ────────────────────
      try {
        const log = window.log || console.log;
        log("📝 [TaskForm] Preparing push notification...");
        const title = formData.isUrgent ? '🆘 LỆNH GẤP: ' + name : '📌 Công việc mới: ' + name;
        const body = `📍 ${formData.address || 'Không có địa chỉ'}\n📝 Nội dung: ${content}`;
        
        const result = await sendAppNotification(title, body);
        log("✅ [TaskForm] Notification sent:", result);
      } catch (e) {
        (window.log || console.error)('❌ [TaskForm] OneSignal Error:', e);
      }
    } catch (err) {
      console.error('Add task error:', err);
      onToast?.('error', 'Lỗi kết nối cơ sở dữ liệu!');
    } finally {
      setLoading(false);
    }
  }, [formData, onToast]);

  const toggleUrgent = useCallback(() => {
    setFormData((prev) => ({ ...prev, isUrgent: !prev.isUrgent }));
  }, []);

  return (
    <div className="glass form-card fade-in">
      <h2 className="form-title">
        <PlusCircle size={22} className="text-gradient" />
        <span>Giao Việc Mới</span>
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Tên khách hàng</label>
          <input
            ref={nameInputRef}
            type="text"
            className="form-input"
            placeholder="Nhập tên khách..."
            value={formData.customerName}
            onChange={(e) => updateField('customerName', e.target.value)}
            required
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Địa chỉ</label>
          <input
            type="text"
            className="form-input"
            placeholder="Khu vực / Số nhà..."
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Yêu cầu chi tiết</label>
          <textarea
            rows="3"
            className="form-textarea"
            placeholder="Nội dung công việc cần xử lý..."
            value={formData.content}
            onChange={(e) => updateField('content', e.target.value)}
            required
          />
        </div>

        <div
          className={`urgent-toggle ${formData.isUrgent ? 'active' : ''}`}
          onClick={toggleUrgent}
        >
          <input
            type="checkbox"
            checked={formData.isUrgent}
            readOnly
            className="urgent-checkbox"
          />
          <div className="urgent-label">
            <span className="urgent-title">CHẾ ĐỘ ƯU TIÊN (GẤP)</span>
            <span className="urgent-subtitle">Đẩy lệnh lên đầu danh sách</span>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-submit">
          {loading ? (
            'Đang khởi tạo...'
          ) : (
            <>
              <Send size={18} />
              <span>GỬI LỆNH ĐIỀU PHỐI</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TaskForm;
