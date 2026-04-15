import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { differenceInSeconds } from 'date-fns';
import { BarChart, Clock, Zap } from 'lucide-react';

const Analytics = () => {
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        avgWaitMins: 0,
        fastestMins: null,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Lấy tất cả dữ liệu báo cáo
        const q = query(collection(db, "tasks"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            let completed = 0;
            let pending = 0;
            let totalWaitSecs = 0;
            let fastestSecs = Infinity;

            snapshot.forEach(doc => {
                total++;
                const data = doc.data();
                if (data.status === 'completed') {
                    completed++;
                    if (data.createdAt && data.completedAt) {
                        const created = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                        const done = data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt);
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
                total,
                completed,
                pending,
                avgWaitMins: completed > 0 ? Math.round((totalWaitSecs / completed) / 60) : 0,
                fastestMins: fastestSecs === Infinity ? 0 : Math.round(fastestSecs / 60)
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>;

    return (
        <div className="fade-in">
            <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                <BarChart size={24} style={{ color: '#FF0080' }}/>
                Thống kê Toàn thời gian
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="stat-item glass" style={{ padding: '2rem' }}>
                    <div className="stat-number accent" style={{ fontSize: '3.5rem' }}>{stats.total}</div>
                    <div className="stat-label" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>Tổng luồng công việc</div>
                </div>
                 <div className="stat-item glass" style={{ padding: '2rem' }}>
                    <div className="stat-number success" style={{ fontSize: '3.5rem' }}>{stats.completed}</div>
                    <div className="stat-label" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>Đã hoàn thành</div>
                </div>
                <div className="stat-item glass" style={{ padding: '2rem' }}>
                    <div className="stat-number warning" style={{ fontSize: '3.5rem' }}>{stats.avgWaitMins}</div>
                    <div className="stat-label" style={{ fontSize: '1rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Clock size={16}/> Trung bình chờ (Phút)</div>
                </div>
                <div className="stat-item glass" style={{ padding: '2rem' }}>
                    <div className="stat-number" style={{ fontSize: '3.5rem', color: '#3B82F6', textShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}>{stats.fastestMins}</div>
                    <div className="stat-label" style={{ fontSize: '1rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}><Zap size={16}/> Kỷ lục nhanh (Phút)</div>
                </div>
            </div>
            
            <div className="glass" style={{ marginTop: '2rem', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
               <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>💡 Phân tích Hiệu suất</h3>
               <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1.1rem' }}>
                 Trong tổng số <strong>{stats.total}</strong> yêu cầu đã phát sinh, đội ngũ của bạn đã giải quyết thành công <strong>{stats.completed}</strong> việc (Đạt tỷ lệ {(stats.completed / (stats.total || 1) * 100).toFixed(1)}%). 
                 <br/><br/>
                 Trung bình mỗi đầu việc xử lý mất khoảng <strong>{stats.avgWaitMins} phút</strong> tính từ lúc bạn khởi tạo lệnh đến khi nhân sự báo xong. Kỷ lục xử lý nhanh nhất hiện tại của hệ thống là <strong>{stats.fastestMins} phút</strong>.
               </p>
            </div>
        </div>
    );
};

export default Analytics;
