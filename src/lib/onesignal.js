/**
 * OneSignal Utility Library
 * Handles sending push notifications to all subscribed devices.
 */

// OneSignal Config
const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || "433cb78d-2f07-43e7-869b-2bbc90800ba4";
const REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY || "os_v2_app_im6lpdjpa5b6pbu3fo6jbaaluq476uwdoaru5t4koaohuv5ctqf3tqyocj3yadl7c6zvrbaesaq3kijgpun3qprvxpfhrn4vpbvijsa";

/**
 * Send a push notification to all subscribed users.
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @returns {Promise<any>}
 */
export const sendAppNotification = async (title, message) => {
  console.log("🚀 [OneSignal] Starting notification trigger...");
  console.log("📍 [OneSignal] App ID:", APP_ID);
  
  const payload = {
    app_id: APP_ID,
    included_segments: ["All"],
    headings: { "en": title, "vi": title },
    contents: { "en": message, "vi": message },
    android_accent_color: "FF4ADE80",
    small_icon: "ic_stat_onesignal_default",
  };

  try {
    console.log("📤 [OneSignal] Sending payload:", JSON.stringify(payload, null, 2));
    
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    console.log("📥 [OneSignal] Response status:", response.status, response.statusText);
    
    const data = await response.json();
    console.log("🔔 [OneSignal] API Response:", data);

    if (data.errors) {
      console.error("❌ [OneSignal] API returned errors:", data.errors);
    }
    
    return data;
  } catch (error) {
    console.error("❌ [OneSignal] Network/Generic Error:", error);
    throw error;
  }
};

/**
 * Trigger the OneSignal native permission prompt.
 */
export const promptForPushNotifications = () => {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function(OneSignal) {
    console.log("🔔 Requesting push permission...");
    await OneSignal.Notifications.requestPermission();
  });
};
