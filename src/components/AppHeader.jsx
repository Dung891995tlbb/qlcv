import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import SyncBadge from './SyncBadge';
import { getPushUnavailableReason, promptForPushNotifications } from '../lib/onesignal';

export default function AppHeader({ sync, onToast }) {
  const [subscribed, setSubscribed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const handleBellClick = () => {
    const reason = getPushUnavailableReason();
    if (reason) { onToast('info', reason); return; }
    setRequesting(true);
    void promptForPushNotifications()
      .then((enabled) => {
        setSubscribed(enabled);
        onToast(enabled ? 'success' : 'info', enabled ? 'Đã bật thông báo trên thiết bị' : 'Cho phép thông báo trong cài đặt trình duyệt để nhận việc mới.');
      })
      .catch(() => onToast('error', 'Chưa bật được thông báo. Vui lòng tải lại trang rồi thử lại.'))
      .finally(() => setRequesting(false));
  };
  return <header className="app-header"><div className="header-inner"><a href="/" className="brand" aria-label="QLCV · Trang công việc"><img className="brand-mark" src="/favicon.svg?v=2" alt="" width={44} height={44} /></a><div className="header-right"><SyncBadge sync={sync} /><button className={`icon-button notification-button ${subscribed ? 'subscribed' : ''}`} onClick={handleBellClick} disabled={requesting} aria-label={subscribed ? 'Đã bật thông báo' : 'Bật thông báo'}>{subscribed ? <Check size={20} /> : <Bell size={20} />}</button></div></div></header>;
}
