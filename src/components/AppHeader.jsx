/**
 * AppHeader — Shared page header with icon, title, navigation, and sync status.
 * Supports variant prop for different icon backgrounds per view.
 */
import React from 'react';
import SyncBadge from './SyncBadge';
import { Bell } from 'lucide-react';
import { promptForPushNotifications } from '../lib/onesignal';

const AppHeader = ({ icon, title, syncLabel, variant, children }) => {
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
