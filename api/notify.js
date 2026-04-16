/**
 * Vercel Serverless Function — OneSignal Push Notification Proxy
 *
 * Endpoint: POST /api/notify
 * Body: { title, message, urgent?, url? }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const APP_ID = (process.env.ONESIGNAL_APP_ID || '').trim();
  const REST_API_KEY = (process.env.ONESIGNAL_REST_API_KEY || '').trim();
  const SITE_URL = (process.env.SITE_URL || 'https://qlcv-bay.vercel.app').trim();

  if (!APP_ID || !REST_API_KEY) {
    return res.status(500).json({
      error: 'Server configuration error',
      detail: 'Missing env vars.',
    });
  }

  const { title, message, urgent, url } = req.body || {};
  if (!title || !message) {
    return res.status(400).json({ error: 'Bad request', detail: 'Missing title or message' });
  }

  // ─── Build professional notification payload ──────────────────
  const payload = {
    app_id: APP_ID,
    included_segments: ['All'],
    headings: { en: title, vi: title },
    contents: { en: message, vi: message },

    // ─── Appearance ──────────────────────────────────────────────
    android_accent_color: urgent ? 'FFEF4444' : 'FF4ADE80',
    small_icon: 'ic_stat_onesignal_default',
    chrome_web_icon: `${SITE_URL}/favicon.svg`,

    // ─── Click action → open specific page ───────────────────────
    ...(url && { url: `${SITE_URL}${url}` }),

    // ─── Priority (urgent = bypass DND) ──────────────────────────
    ...(urgent && {
      priority: 10,
      android_channel_id: undefined, // Use default high-priority channel
    }),

    // ─── Web push action button ──────────────────────────────────
    web_buttons: [
      { id: 'open', text: 'Xem ngay', url: `${SITE_URL}${url || '/'}` },
    ],
  };

  // ─── Send to OneSignal v2 API ─────────────────────────────────
  try {
    console.log(`[notify] Sending: "${title}" | "${message}" | urgent=${!!urgent}`);

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      console.error('[notify] OneSignal error:', JSON.stringify(data));
      return res.status(response.status).json({
        error: 'OneSignal API error',
        detail: data.errors || data,
        status: response.status,
      });
    }

    console.log(`[notify] ✅ Success id=${data.id}`);
    return res.status(200).json({
      success: true,
      id: data.id,
      recipients: data.recipients,
    });
  } catch (error) {
    console.error('[notify] Network error:', error.message);
    return res.status(502).json({ error: 'Network error', detail: error.message });
  }
}
