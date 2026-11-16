import { useState } from 'react';
import { Bell, Check, Layers2 } from 'lucide-react';
import SyncBadge from './SyncBadge';
import { isLocalPreview } from '../firebase';

export default function AppHeader({ sync, onToast }) {
  const [subscribed, setSubscribed] = useState(false);
  const handleBellClick = () => {
    if (isLocalPreview) { onToast('info', 'Bản local không gửi thông báo thật.'); return; }
    if (!import.meta.env.VITE_ONESIGNAL_APP_ID) { onToast('error', 'Chưa cấu hình thông báo trên thiết bị này.'); return; }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        const enabled = OneSignal.Notifications.permission;
        setSubscribed(enabled);
        onToast(enabled ? 'success' : 'info', enabled ? 'Đã bật thông báo trên thiết bị' : 'Cho phép thông báo trong cài đặt trình duyệt để nhận việc mới.');
      } catch { onToast('error', 'Chưa bật được thông báo. Vui lòng thử lại.'); }
    });
  };
  return <header className="app-header"><div className="header-inner"><a href="/" className="brand" aria-label="QLCV · Trang công việc"><span className="brand-mark"><Layers2 size={22} strokeWidth={2} /></span><span>qlcv<span className="brand-period">.</span></span></a><div className="header-right"><SyncBadge sync={sync} /><button className={`icon-button notification-button ${subscribed ? 'subscribed' : ''}`} onClick={handleBellClick} aria-label={subscribed ? 'Đã bật thông báo' : 'Bật thông báo'}>{subscribed ? <Check size={20} /> : <Bell size={20} />}</button></div></div></header>;
}
