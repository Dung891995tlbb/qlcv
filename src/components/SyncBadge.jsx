import { useEffect, useState } from 'react';
import { isLocalPreview } from '../firebase';

export default function SyncBadge({ sync }) {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOnline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOnline); };
  }, []);
  const good = isLocalPreview || (online && sync === 'synced');
  const text = isLocalPreview ? 'Bản xem thử' : !online ? 'Mất kết nối' : sync === 'synced' ? 'Đã đồng bộ' : sync === 'pending' ? 'Đang gửi…' : sync === 'cached' ? 'Dữ liệu đã lưu' : sync === 'error' ? 'Lỗi kết nối' : 'Đang kết nối…';
  return <span className={`sync-indicator ${good ? 'is-connected' : ''}`} role="status"><span />{text}</span>;
}
