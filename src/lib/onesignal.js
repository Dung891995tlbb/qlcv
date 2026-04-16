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
  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: APP_ID,
        included_segments: ["All"], // Send to all subscribed users
        headings: { "en": title, "vi": title },
        contents: { "en": message, "vi": message },
        android_accent_color: "FF4ADE80", // Green accent for Android
        small_icon: "ic_stat_onesignal_default",
      })
    });

    const data = await response.json();
    console.log("🔔 OneSignal response:", data);
    return data;
  } catch (error) {
    console.error("❌ OneSignal error:", error);
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
