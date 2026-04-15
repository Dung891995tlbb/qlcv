/**
 * Custom hook: useTasks
 *
 * Encapsulates the entire Firestore subscription lifecycle,
 * task filtering, archival logic, sorting, and real-time notifications.
 * Components only receive clean, derived data.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, TASK_STATUS } from '../lib/constants';
import { toDate, taskSortComparator, playNotificationSound } from '../lib/utils';

// ─── On-Screen Debug Logger (xem trực tiếp trên điện thoại) ────
const DEBUG = true;
let snapshotCount = 0;
const MAX_LOGS = 30;

// Create debug panel on page
const getPanel = () => {
  let panel = document.getElementById('__debug_panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = '__debug_panel';
    Object.assign(panel.style, {
      position: 'fixed', bottom: '0', left: '0', right: '0',
      maxHeight: '35vh', overflowY: 'auto',
      background: 'rgba(0,0,0,0.92)', color: '#4ADE80',
      fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.5',
      padding: '8px', zIndex: '99999',
      borderTop: '2px solid #4ADE80',
      display: 'none', // Ẩn mặc định, bấm nút để mở
    });
    document.body.appendChild(panel);

    // Toggle button
    const btn = document.createElement('div');
    btn.id = '__debug_btn';
    btn.textContent = '🐛 DEBUG';
    Object.assign(btn.style, {
      position: 'fixed', bottom: '8px', right: '8px',
      background: '#1a1a2e', color: '#4ADE80', border: '1px solid #4ADE80',
      padding: '4px 10px', borderRadius: '6px', zIndex: '100000',
      fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold',
      cursor: 'pointer',
    });
    btn.onclick = () => {
      const visible = panel.style.display === 'block';
      panel.style.display = visible ? 'none' : 'block';
      btn.style.bottom = visible ? '8px' : 'calc(35vh + 8px)';
    };
    document.body.appendChild(btn);
  }
  return panel;
};

const log = (...args) => {
  if (!DEBUG) return;
  const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  const msg = `[${time}] ${text}`;

  // Console
  console.log(`%c${msg}`, 'color: #4ADE80; font-weight: bold;');

  // On-screen panel
  const panel = getPanel();
  const line = document.createElement('div');
  line.textContent = msg;
  if (text.includes('❌') || text.includes('ERROR')) line.style.color = '#F87171';
  if (text.includes('➕')) line.style.color = '#60A5FA';
  if (text.includes('✅')) line.style.color = '#FCD34D';
  panel.appendChild(line);

  // Keep max lines
  while (panel.children.length > MAX_LOGS) panel.removeChild(panel.firstChild);
  panel.scrollTop = panel.scrollHeight;
};

/**
 * @param {Function} onToast - Toast callback (type, message)
 * @returns {{ tasks, loading, pendingCount, completedCount, filter, setFilter, filteredTasks }}
 */
const useTasks = (onToast) => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const attachCount = useRef(0);

  // Request notification permission on mount
  useEffect(() => {
    log('🚀 useTasks mounted');
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((p) => log('🔔 Notification permission:', p));
    }
  }, []);

  // Stable onToast ref to avoid re-subscribing
  const onToastRef = useRef(onToast);
  useEffect(() => { onToastRef.current = onToast; }, [onToast]);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      orderBy('createdAt', 'desc')
    );

    let unsubscribe = null;

    const attach = () => {
      // Detach previous listener if any
      if (unsubscribe) {
        log('🔌 Detaching previous listener');
        unsubscribe();
        unsubscribe = null;
      }

      attachCount.current++;
      const thisAttach = attachCount.current;
      log(`📡 Attaching Firestore listener #${thisAttach}`);

      unsubscribe = onSnapshot(
        q,
        { includeMetadataChanges: true },
        (snapshot) => {
          snapshotCount++;
          const fromCache = snapshot.metadata.fromCache;
          const hasPending = snapshot.metadata.hasPendingWrites;

          log(
            `📦 Snapshot #${snapshotCount} (listener #${thisAttach})`,
            `| docs: ${snapshot.size}`,
            `| fromCache: ${fromCache}`,
            `| hasPendingWrites: ${hasPending}`,
            `| changes: ${snapshot.docChanges().length}`
          );

          // Log each change
          snapshot.docChanges().forEach((change) => {
            const d = change.doc.data();
            log(
              `  ${change.type === 'added' ? '➕' : change.type === 'removed' ? '❌' : '✏️'}`,
              change.type.toUpperCase(),
              `"${d.customerName}"`,
              `status=${d.status}`,
              `id=${change.doc.id}`
            );
          });

          // Skip cache-only snapshots with no changes (metadata-only update)
          if (snapshot.docChanges().length === 0) {
            log('  ⏭️ Metadata-only update, skipping render');
            return;
          }

          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          // Filter out archived completed tasks (completed before today)
          const tasksData = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isPending = data.status === TASK_STATUS.PENDING;

            if (!isPending && data.completedAt) {
              const completedDate = toDate(data.completedAt);
              if (completedDate && completedDate < todayStart) return;
            }

            tasksData.push({ id: docSnap.id, ...data });
          });

          // Sort with multi-tier comparator
          tasksData.sort(taskSortComparator);

          // Notify on newly added pending tasks (skip initial load)
          let newCount = 0;
          snapshot.docChanges().forEach((change) => {
            if (
              !isInitialLoad.current &&
              change.type === 'added' &&
              change.doc.data().status === TASK_STATUS.PENDING
            ) {
              newCount++;
            }
          });

          // ⚡ RENDER FIRST — always update UI before doing anything else
          log(`✅ Rendering ${tasksData.length} tasks (${tasksData.filter(t => t.status === 'pending').length} pending)`);
          setTasks(tasksData);
          setLoading(false);
          isInitialLoad.current = false;

          // Notify AFTER render (best-effort, never block UI)
          if (newCount > 0) {
            log(`🔊 ${newCount} new tasks — playing notification`);
            try {
              playNotificationSound();
            } catch (e) {
              log('⚠️ Sound error:', e.message);
            }
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('QLCV Premium', {
                  body: `Có ${newCount} công việc mới!`,
                  icon: '/favicon.svg',
                });
              }
            } catch (e) {
              log('⚠️ Notification error:', e.message);
            }
          }
        },
        (error) => {
          log('❌ Firestore ERROR:', error.code, error.message);
          console.error('Firestore subscription error:', error);
          setLoading(false);
          onToastRef.current?.('error', 'Lỗi kết nối máy chủ!');
        }
      );
    };

    // Initial attach
    attach();

    // Re-attach when tab becomes visible (mobile wake-up fix)
    const handleVisibility = () => {
      log(`👁️ Visibility changed: ${document.visibilityState}`);
      if (document.visibilityState === 'visible') {
        attach();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      log('🧹 useTasks cleanup — detaching listener');
      if (unsubscribe) unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []); // Empty deps — subscribe once, never re-subscribe

  // ─── Derived data (memoized) ──────────────────────────────────
  const pendingCount = useMemo(
    () => tasks.filter((t) => t.status === TASK_STATUS.PENDING).length,
    [tasks]
  );

  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === TASK_STATUS.COMPLETED).length,
    [tasks]
  );

  const filteredTasks = useMemo(
    () => tasks.filter((t) => filter === 'all' || t.status === filter),
    [tasks, filter]
  );

  return { tasks, loading, pendingCount, completedCount, filter, setFilter, filteredTasks };
};

export default useTasks;
