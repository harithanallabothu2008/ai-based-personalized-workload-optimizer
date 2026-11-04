import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Award, 
  RefreshCw, 
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';

export default function ProgressAnalyticsPage({ showNotification }) {
  const [analytics, setAnalytics] = useState(null);
  const [workHistory, setWorkHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [aData, hData] = await Promise.all([
        api.getProgressAnalytics(),
        api.getWorkHistory()
      ]);
      setAnalytics(aData);
      setWorkHistory(hData);
    } catch (err) {
      showNotification('error', `Failed to load analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={28} className="spin" style={{ margin: '0 auto 10px auto', color: '#2563eb' }} />
        <p>Loading workload analytics & work-speed calibration models...</p>
      </div>
    );
  }

  // Pie chart data for assignment statuses
  const statusPieData = [
    { name: 'Completed', value: analytics?.completed_assignments || 0, color: '#10b981' },
    { name: 'In Progress', value: analytics?.in_progress_assignments || 0, color: '#3b82f6' },
    { name: 'Pending', value: analytics?.pending_assignments || 0, color: '#f59e0b' },
    { name: 'Overdue', value: analytics?.overdue_assignments || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Bar chart data for hours comparison
  const hoursComparisonData = [
    {
      name: 'Total Workload',
      'Estimated Hours': analytics?.total_estimated_hours || 0,
      'Actual Hours Logged': analytics?.total_actual_hours_logged || 0,
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div className="card">
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Completion Rate</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981' }}>
              {analytics?.overall_completion_rate || 0}%
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              ({analytics?.completed_tasks || 0} / {analytics?.total_tasks || 0} tasks)
            </span>
          </div>
        </div>

        <div className="card">
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Estimated</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2563eb' }}>
              {analytics?.total_estimated_hours || 0}
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>hours workload</span>
          </div>
        </div>

        <div className="card">
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Actual Hours Logged</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#7c3aed' }}>
              {analytics?.total_actual_hours_logged || 0}
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>hours study done</span>
          </div>
        </div>

        <div className="card">
          <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Assignments Overdue</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: analytics?.overdue_assignments ? '#dc2626' : '#10b981' }}>
              {analytics?.overdue_assignments || 0}
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>at risk</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '20px' }}>
        {/* Hours Logged Bar Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
            Workload Comparison (Estimated vs Actual)
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '16px' }}>
            Compares initial planned task estimates with student-recorded actual hours
          </p>

          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis unit="h" />
                <Tooltip formatter={(value) => [`${value} hrs`]} />
                <Legend />
                <Bar dataKey="Estimated Hours" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Actual Hours Logged" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assignment Status Breakdown Pie */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
            Assignment Status Distribution
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '16px' }}>
            Current pipeline breakdown across all enrolled courses
          </p>

          <div style={{ width: '100%', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {statusPieData.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No assignments tracked yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Transparent Personal Work-Speed Estimation Formula Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: '#2563eb' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
              Personal Work-Speed Calibration (Transparent Formula)
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            Academic Formula: Speed Factor = (Actual Duration / Estimated Duration). The scheduler automatically adjusts upcoming task allocations using this weighted historical factor.
          </p>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Calibrated Factor</th>
                <th>Recorded Samples</th>
                <th>Algorithmic Status & Impact</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.category_speeds?.map((cat) => (
                <tr key={cat.category}>
                  <td style={{ fontWeight: '600' }}>{cat.category}</td>
                  <td>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: '700', 
                      color: cat.avg_speed_ratio > 1.1 ? '#dc2626' : (cat.avg_speed_ratio < 0.9 ? '#10b981' : '#2563eb')
                    }}>
                      {cat.avg_speed_ratio}x
                    </span>
                  </td>
                  <td>{cat.sample_count} completed tasks</td>
                  <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                    {cat.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Planning & Adaptive Rescheduling Events */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
            Recent Planning & Rescheduling Events Log
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Audit trail of timetable generation, adaptive shifts, and workload recalculations
          </p>
        </div>

        {(!analytics?.recent_events || analytics.recent_events.length === 0) ? (
          <p style={{ padding: '24px', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
            No planning events recorded yet.
          </p>
        ) : (
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analytics.recent_events.map((e) => (
              <div 
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.82rem'
                }}
              >
                <div>
                  <span className="badge badge-info" style={{ marginRight: '8px' }}>{e.event_type}</span>
                  <span style={{ color: '#334155' }}>{e.description}</span>
                </div>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
