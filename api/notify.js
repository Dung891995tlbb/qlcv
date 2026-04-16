/**
 * Vercel Serverless Function — OneSignal Push Notification Proxy
 *
 * Endpoint: POST /api/notify
 * Body: { title: string, message: string }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── Read & sanitize secrets ──────────────────────────────────
  const APP_ID = (process.env.ONESIGNAL_APP_ID || '').trim();
  const REST_API_KEY = (process.env.ONESIGNAL_REST_API_KEY || '').trim();

  if (!APP_ID || !REST_API_KEY) {
    return res.status(500).json({
      error: 'Server configuration error',
      detail: 'Missing env vars.',
      debug: { APP_ID: APP_ID.length, REST_API_KEY: REST_API_KEY.length },
    });
  }

  const { title, message } = req.body || {};
  if (!title || !message) {
    return res.status(400).json({ error: 'Bad request', detail: 'Missing title or message' });
  }

  const payload = {
    app_id: APP_ID,
    included_segments: ['All'],
    headings: { en: title, vi: title },
    contents: { en: message, vi: message },
    android_accent_color: 'FF4ADE80',
    small_icon: 'ic_stat_onesignal_default',
  };

  // ─── Try BOTH v2 Basic and v1 Basic ───────────────────────────
  const attempts = [
    { url: 'https://api.onesignal.com/notifications', auth: `Basic ${REST_API_KEY}`, label: 'v2+Basic' },
    { url: 'https://onesignal.com/api/v1/notifications', auth: `Basic ${REST_API_KEY}`, label: 'v1+Basic' },
    { url: 'https://api.onesignal.com/notifications', auth: `Key ${REST_API_KEY}`, label: 'v2+Key' },
  ];

  const errors = [];

  for (const attempt of attempts) {
    try {
      console.log(`[notify] Trying ${attempt.label}...`);

      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': attempt.auth,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && !data.errors) {
        console.log(`[notify] ✅ ${attempt.label} SUCCESS — id: ${data.id}, recipients: ${data.recipients}`);
        return res.status(200).json({
          success: true,
          id: data.id,
          recipients: data.recipients,
          method: attempt.label,
        });
      }

      console.log(`[notify] ❌ ${attempt.label} failed (${response.status})`);
      errors.push({ method: attempt.label, status: response.status, detail: data.errors || data });
    } catch (e) {
      console.log(`[notify] ❌ ${attempt.label} network error: ${e.message}`);
      errors.push({ method: attempt.label, error: e.message });
    }
  }

  // All attempts failed
  return res.status(403).json({
    error: 'All OneSignal auth methods failed',
    attempts: errors,
    debug: {
      keyPrefix: REST_API_KEY.substring(0, 15),
      keyLength: REST_API_KEY.length,
      keySuffix: REST_API_KEY.substring(REST_API_KEY.length - 6),
      appIdPrefix: APP_ID.substring(0, 8),
    },
  });
}
