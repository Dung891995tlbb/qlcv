/**
 * Analytics — All-time performance dashboard.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { differenceInSeconds } from 'date-fns';
import { COLLECTIONS, TASK_STATUS } from '../lib/constants';
import { toDate } from '../lib/utils';
import { BarChart, Clock, Zap, Target } from 'lucide-react';

const STAT_CARDS = [
  { key: 'total',      label: 'Tổng luồng việc', colorClass: 'accent',  icon: Target },
  { key: 'completed',  label: 'Đã hoàn tất',     colorClass: 'success', icon: null },
  { key: 'avgWaitMins',label: 'Trung bình (m)',   colorClass: 'warning', icon: Clock },
  { key: 'fastestMins',label: 'Kỷ lục (m)',       colorClass: 'info',    icon: Zap },
];

const Analytics = () => {
  const [stats, setStats] = useState({
    total: 0, completed: 0, pending: 0,
    avgWaitMins: 0, fastestMins: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.TASKS));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0, completed = 0, pending = 0;
      let totalWaitSecs = 0, fastestSecs = Infinity;

      snapshot.forEach((docSnap) => {
        total++;
        const data = docSnap.data();

        if (data.status === TASK_STATUS.COMPLETED) {
          completed++;
          const created = toDate(data.createdAt);
          const done = toDate(data.completedAt);
          if (created && done) {
            const diff = differenceInSeconds(done, created);
            if (diff >= 0) {
              totalWaitSecs += diff;
              if (diff < fastestSecs) fastestSecs = diff;
            }
          }
        } else {
          pending++;
        }
      });

      setStats({
        total, completed, pending,
        avgWaitMins: completed > 0 ? Math.round((totalWaitSecs / completed) / 60) : 0,
        fastestMins: fastestSecs === Infinity ? 0 : Math.round(fastestSecs / 60),
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const completionRate = useMemo(
    () => (stats.completed / (stats.total || 1) * 100).toFixed(1),
    [stats.completed, stats.total]
  );

  if (loading) {
    return (
      <div className="empty-state">
        <div className="skeleton skeleton-box" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <h2 className="section-title">
        <BarChart size={24} className="text-gradient" />
        HIỆU SUẤT HỆ THỐNG
      </h2>

      <div className="analytics-grid">
        {STAT_CARDS.map(({ key, label, colorClass, icon: Icon }) => (
          <div key={key} className="stat-item glass analytics-card">
            <div className={`stat-number ${colorClass}`}>{stats[key]}</div>
            <div className="stat-label">
              {Icon && <Icon size={16} />}
              {key === 'completed' && '✓ '}{label}
            </div>
          </div>
        ))}
      </div>

      <div className="glass insight-card">
        <h3>💡 Phân tích Hiệu suất</h3>
        <div className="insight-text">
          Trong tổng số <span className="insight-highlight">{stats.total}</span> yêu cầu đã phát sinh,{' '}
          đội ngũ đã giải quyết thành công <span className="insight-highlight">{stats.completed}</span> việc.{' '}
          Tỷ lệ hoàn thành đạt <span className="insight-highlight">{completionRate}%</span>.
          <br /><br />
          Thời gian xử lý trung bình là <span className="insight-highlight">{stats.avgWaitMins} phút</span> tính từ lúc khởi tạo lệnh.{' '}
          Kỷ lục nhanh nhất hiện tại là <span className="insight-highlight">{stats.fastestMins} phút</span>.
        </div>
      </div>
    </div>
  );
};

export default Analytics;
