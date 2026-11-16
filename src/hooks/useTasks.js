import { useEffect, useRef, useState } from 'react';
import { subscribeTasks } from '../lib/taskStore';
import { playNotificationSound, taskSortComparator } from '../lib/utils';
import { isLocalPreview } from '../firebase';

export default function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sync, setSync] = useState('connecting');
  const knownIds = useRef(null);

  useEffect(() => subscribeTasks((data, metadata) => {
    setTasks([...data].sort(taskSortComparator));
    setLoading(false);
    setError(null);
    setSync(metadata.hasPendingWrites ? 'pending' : metadata.fromCache ? 'cached' : 'synced');
    if (!isLocalPreview && !metadata.fromCache && !metadata.hasPendingWrites) {
      if (knownIds.current && data.some((task) => task.status === 'pending' && !knownIds.current.has(task.id))) playNotificationSound();
      knownIds.current = new Set(data.map((task) => task.id));
    }
  }, (failure) => {
    setError(failure);
    setLoading(false);
    setSync('error');
  }), []);

  return { tasks, loading, error, sync };
}
