/**
 * Custom hook: useTimer
 *
 * Provides a shared `now` value that ticks every second.
 * Used by TaskCard for real-time wait-time display.
 */
import { useState, useEffect } from 'react';

const useTimer = (intervalMs = 1000) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
};

export default useTimer;
