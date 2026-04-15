import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PlusCircle, Send } from 'lucide-react';

const TaskForm = ({ onToast }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    address: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const nameInputRef = useRef(null);

  // Auto-focus vào ô tên khi mở trang
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.content.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "tasks"), {
        customerName: formData.customerName.trim(),
        address: formData.address.trim(),
        content: formData.content.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setFormData({ customerName: '', address: '', content: '' });
      nameInputRef.current?.focus();
      onToast?.('success', 'Đã tạo công việc mới!');
    } catch (error) {
      console.error("Lỗi khi thêm task:", error);
      onToast?.('error', 'Không thể kết nối Firebase!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass glass-glow form-card">
      <h2 className="form-title">
        <PlusCircle size={20} />
        Nhập Task Mới
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="customerName">Tên khách hàng *</label>
          <input
            id="customerName"
            ref={nameInputRef}
            type="text"
            className="form-input"
            placeholder="VD: Anh Minh"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="address">Địa chỉ</label>
          <input
            id="address"
            type="text"
            className="form-input"
            placeholder="VD: 123 Nguyễn Huệ, Q1"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="content">Nội dung công việc *</label>
          <textarea
            id="content"
            rows="3"
            className="form-textarea"
            placeholder="Mô tả công việc cần làm..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            required
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-submit"
        >
          {loading ? (
            'Đang gửi...'
          ) : (
            <>
              <Send size={18} />
              LƯU CÔNG VIỆC
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TaskForm;
