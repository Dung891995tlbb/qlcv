import { useState } from 'react';
import { Check, Clock3, MapPin, MoreHorizontal, Pencil, Trash2, Zap, LoaderCircle, ArrowUpRight } from 'lucide-react';
import { differenceInMinutes, format } from 'date-fns';
import { toDate, formatProcessingTime } from '../lib/utils';

export default function TaskCard({ task, now, onComplete, onEdit, onDelete }) {
  const [busy, setBusy] = useState(false);
  const created = toDate(task.createdAt);
  const done = task.status === 'completed';
  const minutes = created ? Math.max(0, differenceInMinutes(now, created)) : 0;
  const wait = minutes < 1 ? 'Vừa nhận' : minutes < 60 ? `Chờ ${minutes} phút` : `Chờ ${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60}p` : ''}`;
  const time = done ? `Xử lý ${formatProcessingTime(created, toDate(task.completedAt)) || '—'}` : wait;
  const categories = task.categories || [];
  const details = task.details ?? task.content;
  const complete = async () => {
    setBusy(true);
    await onComplete(task);
    setBusy(false);
  };

  return (
    <article className={`task-card ${task.isUrgent && !done ? 'task-urgent' : ''} ${done ? 'task-done' : ''}`}>
      <div className="task-topline">
        <div className="category-tags">
          {task.isUrgent && !done && <span className="tag tag-urgent"><Zap size={12} fill="currentColor" /> Gấp</span>}
          {done && <span className="tag tag-done"><Check size={12} /> Đã xong</span>}
          {categories.map((category) => <span className={`tag category-${category === 'HSCV' ? 'document' : category === 'Mạng' ? 'network' : 'printer'}`} key={category}>{category}</span>)}
          {!categories.length && !done && !task.isUrgent && <span className="tag">Hỗ trợ khác</span>}
        </div>
        <details className="task-menu">
          <summary className="icon-button" aria-label={`Tùy chọn công việc của ${task.customerName}`}><MoreHorizontal size={21} /></summary>
          <div className="task-menu-options">
            <button onClick={(event) => { event.currentTarget.closest('details').open = false; onEdit(task); }}><Pencil size={16} /> Chỉnh sửa</button>
            <button className="danger-text" onClick={(event) => { event.currentTarget.closest('details').open = false; onDelete(task); }}><Trash2 size={16} /> Xóa công việc</button>
          </div>
        </details>
      </div>
      <h3>{task.customerName}</h3>
      {details && <p className="task-description">{details}</p>}
      <div className="task-bottomline">
        <div className="task-meta">
          {task.address && <a className="task-address" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address)}`} target="_blank" rel="noreferrer"><MapPin size={14} /><span>{task.address}</span><ArrowUpRight size={12} /></a>}
          <span className={`task-time ${!done && minutes >= 30 ? 'time-delayed' : ''}`}><Clock3 size={14} />{time}</span>
        </div>
        {done ? <span className="done-time">{toDate(task.completedAt) ? format(toDate(task.completedAt), 'HH:mm') : ''}<Check size={16} /></span> : <button className="complete-button" onClick={complete} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={17} />} {busy ? 'Đang lưu…' : 'Hoàn thành'}</button>}
      </div>
    </article>
  );
}
