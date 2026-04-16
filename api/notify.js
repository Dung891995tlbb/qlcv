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

  const keyInfo = REST_API_KEY
    ? `${REST_API_KEY.substring(0, 12)}... (length: ${REST_API_KEY.length})`
    : 'NOT SET';
  console.log(`[notify] APP_ID: ${APP_ID ? 'SET' : 'NOT SET'}, KEY: ${keyInfo}`);

  if (!APP_ID || !REST_API_KEY) {
    return res.status(500).json({
      error: 'Server configuration error',
      detail: 'OneSignal credentials not configured.',
      debug: { APP_ID: !!APP_ID, REST_API_KEY: !!REST_API_KEY },
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
  };

  // ─── Determine API version & auth based on key type ───────────
  const isV2Key = REST_API_KEY.startsWith('os_v2_');
  const apiUrl = isV2Key
    ? 'https://api.onesignal.com/notifications'          // v2 API
    : 'https://onesignal.com/api/v1/notifications';      // v1 API
  const authHeader = isV2Key
    ? `Key ${REST_API_KEY}`
    : `Basic ${REST_API_KEY}`;

  console.log(`[notify] Using ${isV2Key ? 'v2' : 'v1'} API: ${apiUrl}`);

  // ─── Send to OneSignal ────────────────────────────────────────
  try {
    console.log(`[notify] Sending: "${title}" -> All subscribers`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      console.error('[notify] OneSignal API error:', JSON.stringify(data));
      return res.status(response.status).json({
        error: 'OneSignal API error',
        detail: data.errors || data,
        status: response.status,
        debug: {
          apiVersion: isV2Key ? 'v2' : 'v1',
          apiUrl: apiUrl,
          authFormat: isV2Key ? 'Key' : 'Basic',
          keyPrefix: REST_API_KEY.substring(0, 12),
          keyLength: REST_API_KEY.length,
        },
      });
    }

    console.log(`[notify] Success id: ${data.id}, recipients: ${data.recipients}`);

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
