/**
 * OneSignal Utility Library
 * Gửi push notification thông qua serverless proxy /api/notify.
 * REST API Key được giữ an toàn trên server — frontend không cần biết.
 */

/**
 * Send a push notification to all subscribed users via server proxy.
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @returns {Promise<any>}
 */
export const sendAppNotification = async (title, message) => {
  const log = window.log || console.log;
  log("🚀 [Noti] Preparing push notification...");
  log(`   📌 Title: "${title}"`);
  log(`   📝 Body: "${message}"`);

  try {
    log("📤 [Noti] Sending to /api/notify...");

    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message }),
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
          body: JSON.stringify({ title, message }),
        });
        const retryData = await retry.json();

        if (!retry.ok) {
          log(`❌ [Noti] Retry failed ${retry.status}:`, JSON.stringify(retryData));
          return retryData;
        }

        log(`✅ [Noti] Retry success — id: ${retryData.id}, recipients: ${retryData.recipients}`);
        return retryData;
      }

      return data;
    }

    log(`✅ [Noti] Sent! id: ${data.id}, recipients: ${data.recipients}`);
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
        body: JSON.stringify({ title, message }),
      });
      const retryData = await retry.json();

      if (retry.ok) {
        log(`✅ [Noti] Retry success — id: ${retryData.id}, recipients: ${retryData.recipients}`);
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
export const promptForPushNotifications = () => {
  const log = window.log || console.log;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function(OneSignal) {
    log("🔔 [Noti] Requesting push permission...");
    await OneSignal.Notifications.requestPermission();
    const permission = await OneSignal.Notifications.permission;
    log(`🔔 [Noti] Permission result: ${permission ? 'GRANTED ✅' : 'DENIED ❌'}`);
  });
};
