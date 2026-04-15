/**
 * Shared utility functions.
 * Pure functions with no side effects — easy to test and reuse.
 */
import { differenceInMinutes, differenceInSeconds } from 'date-fns';

// ─── Firestore Helpers ──────────────────────────────────────────

/** Safely convert a Firestore Timestamp (or date string) to a JS Date. */
export const toDate = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
};

/** Get epoch ms from a Firestore Timestamp, falling back to Date.now(). */
export const toMillis = (timestamp) => {
  if (!timestamp) return Date.now();
  return timestamp.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime();
};

// ─── Time Display ───────────────────────────────────────────────

/**
 * Format a duration between two dates as HH:MM:SS or MM:SS.
 * @param {Date} from - Start date
 * @param {Date} to   - End date (typically `now`)
 * @returns {string}   Formatted duration string
 */
export const formatDuration = (from, to) => {
  if (!from || !to) return '--:--';
  const totalSec = differenceInSeconds(to, from);
  if (totalSec < 0) return '00:00';

  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => n.toString().padStart(2, '0');

  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/**
 * Format a completed task's processing time as a readable string.
 * @param {Date} createdDate    - Task creation date
 * @param {Date} completedDate  - Task completion date
 * @returns {string|null}
 */
export const formatProcessingTime = (createdDate, completedDate) => {
  if (!createdDate || !completedDate) return null;
  const totalMins = differenceInMinutes(completedDate, createdDate);
  if (totalMins < 60) return `${totalMins} phút`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}p`;
};

// ─── Audio ──────────────────────────────────────────────────────

/** Play a gentle notification chime using the Web Audio API. */
export const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(783.99, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.error('Audio playback failed:', err);
  }
};

// ─── Sorting ────────────────────────────────────────────────────

/**
 * Multi-tier sorting comparator for tasks.
 *
 * Priority order:
 *  1. Pending tasks float above Completed
 *  2. Among Pending: Urgent first, then FIFO (oldest first)
 *  3. Among Completed: most recently completed first
 */
export const taskSortComparator = (a, b) => {
  const { PENDING, COMPLETED } = { PENDING: 'pending', COMPLETED: 'completed' };

  // Tier 1: status
  if (a.status === PENDING && b.status === COMPLETED) return -1;
  if (a.status === COMPLETED && b.status === PENDING) return 1;

  // Tier 2: within pending — urgent first, then FIFO
  if (a.status === PENDING && b.status === PENDING) {
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return toMillis(a.createdAt) - toMillis(b.createdAt);
  }

  // Tier 3: within completed — newest first
  if (a.status === COMPLETED && b.status === COMPLETED) {
    return toMillis(b.completedAt || b.createdAt) - toMillis(a.completedAt || a.createdAt);
  }

  return 0;
};
