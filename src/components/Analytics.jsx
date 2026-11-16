import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Clock3, Inbox, TrendingUp, FileText, Wifi, Printer } from 'lucide-react';
import { addDays, differenceInMinutes, endOfDay, format, startOfDay, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toDate, formatProcessingTime } from '../lib/utils';
import { QUICK_TASKS } from '../lib/taskStore';

const icons = [FileText, Wifi, Printer];

export default function Analytics({ tasks, loading, error, now }) {
  const [selected, setSelected] = useState(() => format(now, 'yyyy-MM-dd'));
  const [range, setRange] = useState('day');
  const date = new Date(`${selected}T12:00:00`);
  const from = startOfDay(range === 'week' ? subDays(date, 6) : date);
  const to = endOfDay(date);
  const filtered = tasks.filter((task) => { const created = toDate(task.createdAt); return created && created >= from && created <= to; });
  const done = filtered.filter((task) => task.status === 'completed');
  const durations = done.map((task) => { const created = toDate(task.createdAt), completed = toDate(task.completedAt); return created && completed ? differenceInMinutes(completed, created) : -1; }).filter((minutes) => minutes >= 0);
  const average = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;
  const completionRate = filtered.length ? Math.round(done.length / filtered.length * 100) : 0;
  const today = format(now, 'yyyy-MM-dd');

  return <>
    <div className="page-heading"><div><p className="eyebrow">THEO DÕI HIỆU QUẢ HỖ TRỢ</p><h1>Thống kê<span className="heading-dot">.</span></h1><p className="page-description">Nhìn lại công việc, chủ động ngày tiếp theo.</p></div></div>
    <section className="report-date-card">
      <div className="report-range-tabs"><button className={range === 'day' ? 'active' : ''} onClick={() => setRange('day')}>Theo ngày</button><button className={range === 'week' ? 'active' : ''} onClick={() => setRange('week')}>7 ngày</button></div>
      <div className="date-navigation"><button className="icon-button" aria-label="Ngày trước" onClick={() => setSelected(format(subDays(date, 1), 'yyyy-MM-dd'))}><ChevronLeft size={20} /></button><label className="date-input-label"><CalendarDays size={18} /><input type="date" aria-label="Chọn ngày thống kê" value={selected} max={today} onChange={(event) => { if (event.target.value && event.target.value <= today) setSelected(event.target.value); }} /></label><button className="icon-button" aria-label="Ngày sau" disabled={selected >= today} onClick={() => setSelected(format(addDays(date, 1), 'yyyy-MM-dd'))}><ChevronRight size={20} /></button></div>
      <div className="report-date-note"><span>{range === 'week' ? `${format(from, 'dd/MM')} – ${format(to, 'dd/MM/yyyy')}` : selected === today ? 'Hôm nay' : format(date, 'EEEE', { locale: vi })}</span><button onClick={() => setSelected(today)}>Về hôm nay</button></div>
    </section>
    <div className="report-stats">{[
      { label: 'Tổng yêu cầu', value: filtered.length, icon: Inbox, color: 'blue' },
      { label: 'Đã hoàn thành', value: done.length, icon: CheckCircle2, color: 'green' },
      { label: 'Đang chờ', value: filtered.length - done.length, icon: Clock3, color: 'orange' },
      { label: 'TB xử lý', value: average === null ? '—' : average, suffix: average === null ? '' : 'phút', icon: TrendingUp, color: 'purple' },
    ].map(({ label, value, suffix, icon: Icon, color }) => <div className="report-stat" key={label}><span className={`summary-icon ${color}`}><Icon size={20} /></span><span className="report-stat-value">{loading || error ? '—' : value}<small>{suffix}</small></span><span>{label}</span></div>)}</div>
    {error ? <div className="empty-state"><h3>Chưa tải được thống kê</h3><p>Kiểm tra kết nối mạng rồi tải lại trang.</p></div> : loading ? <div className="skeleton-card"><span /><span /><span /></div> : <>
      <section className="report-panel"><div className="section-heading"><h2>Tiến độ xử lý</h2><span className="report-percentage">{completionRate}%</span></div><div className="progress-track"><div style={{ width: `${completionRate}%` }} /></div><p className="report-helper">{done.length} / {filtered.length} yêu cầu đã hoàn thành{range === 'week' ? ' trong 7 ngày' : ' trong ngày'}.</p></section>
      <section className="report-panel"><div className="section-heading"><h2>Nhóm công việc</h2><span className="muted">Số yêu cầu</span></div><div className="category-breakdown">{[...QUICK_TASKS, 'Khác'].map((category, index) => {
        const count = filtered.filter((task) => category === 'Khác' ? !task.categories?.length : task.categories?.includes(category)).length;
        const Icon = icons[index] || Inbox;
        return <div className="category-row" key={category}><span className="category-label"><Icon size={17} />{category}</span><div className="category-bar"><span style={{ width: `${filtered.length ? count / filtered.length * 100 : 0}%` }} /></div><strong>{count}</strong></div>;
      })}</div><p className="report-helper">Một yêu cầu có thể thuộc nhiều nhóm công việc.</p></section>
      <section className="report-history"><div className="section-heading"><h2>Chi tiết công việc</h2><span className="count-label">{filtered.length}</span></div>{filtered.length ? <div className="history-list">{filtered.map((task) => <article className="history-item" key={task.id}><span className={`history-status ${task.status === 'completed' ? 'is-done' : ''}`}>{task.status === 'completed' ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}</span><div><h3>{task.customerName}</h3><p>{task.content}</p><span>{toDate(task.createdAt) ? format(toDate(task.createdAt), 'HH:mm · dd/MM') : 'Đang lưu…'}</span></div><span className="history-duration">{task.status === 'completed' ? formatProcessingTime(toDate(task.createdAt), toDate(task.completedAt)) : 'Đang chờ'}</span></article>)}</div> : <div className="empty-state"><Inbox size={30} /><h3>Chưa có công việc</h3><p>Chọn ngày khác để xem lịch sử hỗ trợ.</p></div>}</section>
    </>}
    <p className="report-footnote">Thống kê theo ngày tạo yêu cầu.</p>
  </>;
}
