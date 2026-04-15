/**
 * Application-wide constants.
 * Centralizes magic strings and configuration values.
 */

// ─── Task Status ────────────────────────────────────────────────
export const TASK_STATUS = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
});

// ─── Firestore ──────────────────────────────────────────────────
export const COLLECTIONS = Object.freeze({
  TASKS: 'tasks',
});

// ─── Notification ───────────────────────────────────────────────
export const NOTIFICATION = Object.freeze({
  TITLE: 'QLCV Premium',
  ICON: '/favicon.svg',
  SOUND_FREQUENCY: 783.99,  // G5 note
  SOUND_DURATION: 1.2,      // seconds
});

// ─── UI Thresholds ──────────────────────────────────────────────
export const THRESHOLDS = Object.freeze({
  DELAYED_MINUTES: 30,      // minutes before a task is flagged as delayed
  TOAST_DURATION: 4000,     // ms
});
