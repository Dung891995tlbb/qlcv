/**
 * Custom hook: useTasks
 *
 * Encapsulates the entire Firestore subscription lifecycle,
 * task filtering, archival logic, sorting, and real-time notifications.
 * Components only receive clean, derived data.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, TASK_STATUS } from '../lib/constants';
import { toDate, taskSortComparator, playNotificationSound } from '../lib/utils';

/**
 * @param {Function} onToast - Toast callback (type, message)
 * @returns {{ tasks, loading, pendingCount, completedCount, filter, setFilter, filteredTasks }}
 */
const useTasks = (onToast) => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Force Firestore to re-sync when tab becomes visible again.
  // Mobile browsers aggressively throttle background WebSocket connections,
  // so we re-attach the listener when the user returns to the app.
  const listenerRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      orderBy('createdAt', 'desc')
    );

    const attach = () => {
      // Detach previous listener if any
      listenerRef.current?.();

      listenerRef.current = onSnapshot(
        q,
        (snapshot) => {
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

          if (newCount > 0) {
            playNotificationSound();
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('QLCV Premium', {
                body: `Có ${newCount} công việc mới!`,
                icon: '/favicon.svg',
              });
            }
          }

          setTasks(tasksData);
          setLoading(false);
          isInitialLoad.current = false;
        },
        (error) => {
          console.error('Firestore subscription error:', error);
          setLoading(false);
          onToast?.('error', 'Lỗi kết nối máy chủ!');
        }
      );
    };

    // Initial attach
    attach();

    // Re-attach when tab becomes visible (mobile wake-up fix)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        attach();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      listenerRef.current?.();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [onToast]);

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
