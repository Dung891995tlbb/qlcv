/**
 * Vercel Serverless Function — OneSignal Push Notification Proxy
 *
 * Endpoint: POST /api/notify
 * Body: { title: string, message: string }
 *
 * Giữ REST API Key an toàn trên server, tránh lộ key trên frontend.
 * Frontend chỉ cần gọi /api/notify cùng domain → không bị CORS.
 */

export default async function handler(req, res) {
  // ─── Only allow POST ─────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── Read secrets from environment ────────────────────────────
  const APP_ID = process.env.ONESIGNAL_APP_ID;
  const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!APP_ID || !REST_API_KEY) {
    console.error('[notify] Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY env vars');
    return res.status(500).json({
      error: 'Server configuration error',
      detail: 'OneSignal credentials not configured. Add ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY to Vercel Environment Variables.',
    });
  }

  // ─── Validate request body ────────────────────────────────────
  const { title, message } = req.body || {};

  if (!title || !message) {
    return res.status(400).json({
      error: 'Bad request',
      detail: 'Missing required fields: title, message',
    });
  }

  // ─── Build OneSignal payload ──────────────────────────────────
  const payload = {
    app_id: APP_ID,
    included_segments: ['All'],
    headings: { en: title, vi: title },
    contents: { en: message, vi: message },
    android_accent_color: 'FF4ADE80',
    small_icon: 'ic_stat_onesignal_default',
    // Chrome on Android: custom notification sound (optional)
    // android_sound: "notification",
  };

  // ─── Send to OneSignal ────────────────────────────────────────
  try {
    console.log(`[notify] Sending: "${title}" → All subscribers`);

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      console.error('[notify] OneSignal API error:', data);
      return res.status(response.status).json({
        error: 'OneSignal API error',
        detail: data.errors || data,
        status: response.status,
      });
    }

    console.log(`[notify] ✅ Success — id: ${data.id}, recipients: ${data.recipients}`);

    return res.status(200).json({
      success: true,
      id: data.id,
      recipients: data.recipients,
    });
  } catch (error) {
    console.error('[notify] Network error:', error.message);
    return res.status(502).json({
      error: 'Failed to reach OneSignal',
      detail: error.message,
    });
  }
}
