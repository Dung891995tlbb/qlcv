import { useState } from 'react';
import { Search, SlidersHorizontal, X, ClipboardCheck, ArrowDownWideNarrow, WifiOff, SearchX, Zap } from 'lucide-react';
import { startOfDay } from 'date-fns';
import { toDate } from '../lib/utils';
import { QUICK_TASKS } from '../lib/taskStore';
import TaskCard from './TaskCard';

export default function TaskList({ tasks, loading, error, now, onComplete, onEdit, onDelete }) {
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const today = startOfDay(now);
  const pending = tasks.filter((task) => task.status === 'pending');
  const completed = tasks.filter((task) => task.status === 'completed' && toDate(task.completedAt) >= today);
  const normalize = (value) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const list = (tab === 'pending' ? pending : completed).filter((task) => {
    const matchesSearch = normalize(`${task.customerName} ${task.address || ''} ${task.content}`).includes(normalize(search.trim()));
    return matchesSearch && (category === 'all' || task.categories?.includes(category) || (!task.categories?.length && task.content?.includes(category))) && (!urgentOnly || task.isUrgent);
  });
  const filtered = search || category !== 'all' || urgentOnly;

  return <section className="work-section" aria-label="Danh sách công việc">
    <div className="list-tabs" role="tablist" aria-label="Trạng thái công việc">
      <button role="tab" aria-selected={tab === 'pending'} aria-controls="task-feed" id="pending-tab" className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>Đang chờ <span>{pending.length}</span></button>
      <button role="tab" aria-selected={tab === 'completed'} aria-controls="task-feed" id="completed-tab" className={tab === 'completed' ? 'active' : ''} onClick={() => setTab('completed')}>Đã xong hôm nay <span>{completed.length}</span></button>
    </div>
    <div className="search-toolbar">
      <div className="search-input"><Search size={19} /><input aria-label="Tìm công việc" type="search" placeholder="Tìm tên, phòng ban, nội dung…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button className="icon-button" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm"><X size={17} /></button>}</div>
      <button className={`filter-button ${showFilters || category !== 'all' || urgentOnly ? 'active' : ''}`} aria-label="Lọc công việc" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={20} /></button>
    </div>
    {showFilters && <div className="filter-options" aria-label="Bộ lọc công việc">{['all', ...QUICK_TASKS].map((value) => <button key={value} className={`filter-chip ${category === value ? 'active' : ''}`} aria-pressed={category === value} onClick={() => setCategory(value)}>{value === 'all' ? 'Tất cả' : value}</button>)}<button className={`filter-chip ${urgentOnly ? 'active' : ''}`} aria-pressed={urgentOnly} onClick={() => setUrgentOnly(!urgentOnly)}><Zap size={13} /> Chỉ việc gấp</button></div>}
    <div className="list-caption"><span>{loading ? 'Đang tải công việc…' : `${list.length} công việc${filtered ? ' phù hợp' : ''}`}</span><span><ArrowDownWideNarrow size={14} />{tab === 'pending' ? 'Gấp trước · Chờ lâu trước' : 'Hoàn thành gần nhất'}</span></div>
    <div id="task-feed" role="tabpanel" aria-labelledby={tab === 'pending' ? 'pending-tab' : 'completed-tab'} aria-busy={loading}>
      {error ? <div className="empty-state"><WifiOff size={32} /><h3>Chưa kết nối được</h3><p>Kiểm tra kết nối mạng rồi tải lại trang.</p><button className="button button-secondary" onClick={() => window.location.reload()}>Thử lại</button></div> : loading ? <div className="task-grid">{[1, 2, 3].map((key) => <div className="skeleton-card" key={key}><span /><span /><span /></div>)}</div> : list.length ? <div className="task-grid">{list.map((task) => <TaskCard key={task.id} task={task} now={now} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />)}</div> : <div className="empty-state"><span className="empty-icon">{filtered ? <SearchX size={30} /> : <ClipboardCheck size={30} />}</span><h3>{filtered ? 'Chưa tìm thấy công việc' : tab === 'pending' ? 'Mọi việc đã được xử lý' : 'Chưa có việc hoàn thành hôm nay'}</h3><p>{filtered ? 'Thử từ khóa khác hoặc bỏ bớt bộ lọc.' : tab === 'pending' ? 'Khi có yêu cầu mới, công việc sẽ xuất hiện tại đây.' : 'Các công việc hoàn thành sẽ được lưu ở đây.'}</p>{filtered && <button className="button button-secondary" onClick={() => { setSearch(''); setCategory('all'); setUrgentOnly(false); }}>Xóa bộ lọc</button>}</div>}
    </div>
  </section>;
}
