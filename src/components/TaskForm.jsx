import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, FileText, Wifi, Printer, Plus, ArrowUpRight, Zap, LoaderCircle } from 'lucide-react';
import { createTask, editTask, QUICK_TASKS } from '../lib/taskStore';
import { isLocalPreview } from '../firebase';
import { sendAppNotification } from '../lib/onesignal';

const emptyForm = { customerName: '', address: '', categories: [], details: '', isUrgent: false };
const icons = [FileText, Wifi, Printer];
const DRAFT_KEY = 'qlcv.task-draft.v1';

function getInitialForm(task) {
  if (task) return { customerName: task.customerName, address: task.address || '', categories: task.categories || [], details: task.details ?? task.content, isUrgent: !!task.isUrgent };
  try { return { ...emptyForm, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') }; }
  catch { return { ...emptyForm }; }
}

export default function TaskForm({ task, onToast, onClose, inline = false }) {
  const formId = useId();
  const [form, setForm] = useState(() => getInitialForm(task));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const detailsRef = useRef(null);

  useLayoutEffect(() => {
    const textarea = detailsRef.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight + 2, 172)}px`;
  }, [form.details]);

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    setError('');
    setSavedMessage('');
    if (!task) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.categories.length && !form.details.trim()) {
      setError('Chọn ít nhất một công việc hoặc nhập nội dung khác.');
      return;
    }
    const formElement = event.currentTarget;
    const keepOpen = inline || event.nativeEvent.submitter?.value === 'continue';
    setSaving(true);
    const data = {
      customerName: form.customerName.trim(), address: form.address.trim(), categories: form.categories,
      details: form.details.trim(), isUrgent: form.isUrgent,
      content: [form.categories.join(' · '), form.details.trim()].filter(Boolean).join(' — '),
    };
    if (!data.customerName) { setError('Vui lòng nhập tên người cần hỗ trợ.'); setSaving(false); return; }
    try {
      if (task) await editTask(task.id, data);
      else await createTask({ ...data, status: 'pending' });
      if (!task) sessionStorage.removeItem(DRAFT_KEY);
      onToast('success', task ? 'Đã lưu thay đổi' : 'Đã giao công việc mới');
      if (!task && !isLocalPreview) {
        void sendAppNotification(data.isUrgent ? '🚨 QLCV · Việc gấp' : 'QLCV · Công việc mới', `${data.customerName} — ${data.content}`, { urgent: data.isUrgent, url: '/' })
          .then((result) => { if (result?.error) onToast('error', 'Đã lưu việc, nhưng chưa gửi được thông báo.'); })
          .catch(() => onToast('error', 'Đã lưu việc, nhưng chưa gửi được thông báo.'));
      }
      if (keepOpen) {
        setForm({ ...emptyForm });
        setSavedMessage('Đã giao việc. Bạn có thể nhập công việc tiếp theo.');
        requestAnimationFrame(() => formElement.querySelector('input')?.focus());
      } else onClose();
    } catch {
      setError('Chưa lưu được công việc. Kiểm tra kết nối và thử lại.');
    } finally { setSaving(false); }
  };

  return (
    <form className={`task-form ${inline ? 'inline-task-form' : ''}`} onSubmit={submit}>
      <div className="sheet-content">
        {savedMessage && <p className="form-success" role="status"><Check size={16} />{savedMessage}</p>}
        <div className="field-group">
          <label htmlFor={`${formId}-customer-name`}>Người cần hỗ trợ <span className="required">*</span></label>
          <input id={`${formId}-customer-name`} placeholder="Ví dụ: Chị Hà, phòng Hành chính" value={form.customerName} onChange={(event) => update('customerName', event.target.value)} required maxLength={120} autoComplete="name" disabled={saving} />
        </div>
        <div className="field-group">
          <label htmlFor={`${formId}-task-address`}>Địa chỉ / Phòng ban <span className="optional">Không bắt buộc</span></label>
          <input id={`${formId}-task-address`} placeholder="Phòng ban, tầng hoặc địa chỉ…" value={form.address} onChange={(event) => update('address', event.target.value)} maxLength={250} disabled={saving} />
        </div>
        <fieldset className="quick-fieldset" disabled={saving}>
          <legend>Công việc <span className="optional">Có thể chọn nhiều</span></legend>
          <div className="quick-options">
            {QUICK_TASKS.map((label, index) => {
              const Icon = icons[index];
              const selected = form.categories.includes(label);
              return <label className={`quick-option category-${label === 'HSCV' ? 'document' : label === 'Mạng' ? 'network' : 'printer'} ${selected ? 'selected' : ''}`} key={label}>
                <input type="checkbox" checked={selected} onChange={() => update('categories', selected ? form.categories.filter((value) => value !== label) : [...form.categories, label])} />
                <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
                <span className="quick-check" aria-hidden="true">{selected && <Check size={11} strokeWidth={3} />}</span>
              </label>;
            })}
          </div>
        </fieldset>
        <div className="field-group">
          <label htmlFor={`${formId}-task-details`}>Chi tiết / Công việc khác</label>
          <textarea ref={detailsRef} id={`${formId}-task-details`} placeholder="Chi tiết hoặc công việc khác…" value={form.details} onChange={(event) => update('details', event.target.value)} rows={1} maxLength={2000} disabled={saving} aria-describedby={error ? `${formId}-form-error` : undefined} />
        </div>
        <label className={`urgent-option ${form.isUrgent ? 'selected' : ''}`}>
          <span className="urgent-option-icon"><Zap size={17} /></span>
          <span className="urgent-option-text"><strong>Việc gấp</strong></span>
          <input type="checkbox" role="switch" checked={form.isUrgent} onChange={(event) => update('isUrgent', event.target.checked)} disabled={saving} />
          <span className="switch-track" aria-hidden="true" />
        </label>
        {error && <p id={`${formId}-form-error`} className="form-error" role="alert">{error}</p>}
      </div>
      <div className="sheet-footer">
        {!task && !inline && <button className="button button-secondary" type="submit" value="continue" disabled={saving}><Plus size={17} /> Giao & nhập tiếp</button>}
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={19} /> : <ArrowUpRight size={19} />}{saving ? 'Đang lưu…' : task ? 'Lưu thay đổi' : 'Giao việc'}</button>
      </div>
    </form>
  );
}
