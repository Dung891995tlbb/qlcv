/**
 * OneSignal Utility Library
 * Gửi push notification thông qua serverless proxy /api/notify.
 * REST API Key được giữ an toàn trên server — frontend không cần biết.
 */

const PUSH_INIT_KEY = Symbol.for('qlcv.onesignal.init');
const PUSH_SITE_ORIGIN = import.meta.env.VITE_ONESIGNAL_SITE_ORIGIN || 'https://qlcv-bay.vercel.app';

export const getPushUnavailableReason = () => {
  if (import.meta.env.VITE_LOCAL_PREVIEW === 'true') return 'Bản xem thử không đăng ký nhận thông báo.';
  if (!import.meta.env.VITE_ONESIGNAL_APP_ID) return 'Chưa cấu hình thông báo trên thiết bị này.';
  if (window.location.origin !== PUSH_SITE_ORIGIN) return `Để nhận thông báo trên thiết bị, hãy mở ${PUSH_SITE_ORIGIN}.`;
  return null;
};

// A shared promise survives StrictMode remounts and Vite hot updates.
// Keep failures until a full page reload: the SDK cannot safely be reinitialized.
export const initializePushNotifications = () => {
  if (getPushUnavailableReason()) return Promise.resolve(null);
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  const existing = window[PUSH_INIT_KEY];
  if (existing) {
    if (existing.appId !== appId) return Promise.reject(new Error('Cấu hình thông báo đã thay đổi. Hãy tải lại trang.'));
    return existing.promise;
  }

  const state = { appId, promise: null };
  window[PUSH_INIT_KEY] = state;
  state.promise = new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({ appId, allowLocalhostAsHTTP: true, notifyButton: { enable: false } });
        resolve(OneSignal);
      } catch (error) { reject(error); }
    });
  });
  return state.promise;
};

/**
 * Send a push notification to all subscribed users via server proxy.
 * @param {string} title - Notification title (app name)
 * @param {string} message - Notification message body (task details)
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.urgent] - High priority (bypass DND, vibrate)
 * @param {string} [options.url] - URL to open when clicking notification
 * @returns {Promise<any>}
 */
export const sendAppNotification = async (title, message, options = {}) => {
  const log = window.log || console.log;
  log("🚀 [Noti] Preparing push notification...");
  log(`   📌 Title: "${title}"`);
  log(`   📝 Body: "${message}"`);

  const payload = { title, message };
  if (options.urgent) payload.urgent = true;
  if (options.url) payload.url = options.url;

  try {
    log("📤 [Noti] Sending to /api/notify...");

    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      log(`❌ [Noti] Server error ${response.status}:`, JSON.stringify(data));

      // ─── Retry once on 5xx ────────────────────────────────────
      if (response.status >= 500) {
        log("🔄 [Noti] Retrying in 2s...");
        await new Promise(r => setTimeout(r, 2000));

        const retry = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const retryData = await retry.json();

        if (!retry.ok) {
          log(`❌ [Noti] Retry failed ${retry.status}:`, JSON.stringify(retryData));
          return retryData;
        }

        log(`✅ [Noti] Retry success — id: ${retryData.id}`);
        return retryData;
      }

      return data;
    }

    log(`✅ [Noti] Sent! id: ${data.id}`);
    return data;
  } catch (error) {
    log(`❌ [Noti] Network Error: ${error.message}`);
    
    // ─── Retry once on network failure ──────────────────────────
    try {
      log("🔄 [Noti] Retrying in 2s...");
      await new Promise(r => setTimeout(r, 2000));

      const retry = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const retryData = await retry.json();

      if (retry.ok) {
        log(`✅ [Noti] Retry success — id: ${retryData.id}`);
        return retryData;
      }

      log(`❌ [Noti] Retry failed: ${retry.status}`);
      return retryData;
    } catch (retryErr) {
      log(`❌ [Noti] Retry also failed: ${retryErr.message}`);
      throw retryErr;
    }
  }
};

/**
 * Trigger the OneSignal native permission prompt.
 */
export const promptForPushNotifications = async () => {
  const reason = getPushUnavailableReason();
  if (reason) throw new Error(reason);
  const OneSignal = await initializePushNotifications();
  await OneSignal.Notifications.requestPermission();
  return OneSignal.Notifications.permission;
};
