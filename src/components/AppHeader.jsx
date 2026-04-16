/**
 * AppHeader — Shared page header with icon, title, navigation, and sync status.
 * Supports variant prop for different icon backgrounds per view.
 */
import React, { useState } from 'react';
import SyncBadge from './SyncBadge';
import { Bell, Send } from 'lucide-react';
import { promptForPushNotifications, sendAppNotification } from '../lib/onesignal';

const AppHeader = ({ icon, title, syncLabel, variant, children }) => {
  const [testing, setTesting] = useState(false);

  const handleBellClick = async () => {
    const log = window.log || console.log;
    log('─── 🔔 BELL BUTTON PRESSED ───');
    
    // Step 1: Request permission
    promptForPushNotifications();
    
    // Step 2: Log OneSignal status
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        const permission = await OneSignal.Notifications.permission;
        const sub = await OneSignal.User.PushSubscription;
        log(`🔔 [Bell] Permission: ${permission ? 'GRANTED ✅' : 'DENIED ❌'}`);
        log(`🔔 [Bell] Sub ID: ${sub?.id || 'N/A'}`);
        log(`🔔 [Bell] Opted In: ${sub?.optedIn}`);
      });
    } catch (e) {
      log(`❌ [Bell] OneSignal check error: ${e.message}`);
    }
  };

  const handleTestNotification = async () => {
    const log = window.log || console.log;
    setTesting(true);
    log('─── 🧪 TEST NOTIFICATION START ───');
    
    try {
      const result = await sendAppNotification(
        '🧪 Test Notification',
        'Đây là thông báo thử nghiệm từ QLCV!'
      );
      log('🧪 [Test] Result:', JSON.stringify(result));
      
      if (result?.success) {
        log(`🧪 [Test] ✅ Thành công! Gửi đến ${result.recipients} thiết bị`);
      } else {
        log(`🧪 [Test] ❌ Thất bại:`, JSON.stringify(result));
      }
    } catch (e) {
      log(`🧪 [Test] ❌ Error: ${e.message}`);
    } finally {
      setTesting(false);
      log('─── 🧪 TEST NOTIFICATION END ───');
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className={`header-icon ${variant ? `header-icon--${variant}` : ''}`}>
          {icon}
        </div>
        <div>
          <h1 className="header-title">{title}</h1>
          {children && <nav className="nav-links">{children}</nav>}
        </div>
      </div>
      
      <div className="header-right">
        <button 
          className="btn-icon bell-btn" 
          onClick={handleTestNotification}
          disabled={testing}
          title="Gửi thông báo thử nghiệm"
          style={testing ? { opacity: 0.5 } : {}}
        >
          <Send size={18} />
        </button>
        <button 
          className="btn-icon bell-btn" 
          onClick={handleBellClick}
          title="Bật thông báo"
        >
          <Bell size={20} />
        </button>
        <SyncBadge label={syncLabel} />
      </div>
    </header>
  );
};

export default React.memo(AppHeader);
