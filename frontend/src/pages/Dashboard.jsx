import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  FileUp, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Flame
} from 'lucide-react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';

export default function Dashboard({ setCurrentPage, showNotification, backendOnline }) {
  const [analytics, setAnalytics] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, todayData] = await Promise.all([
        api.getProgressAnalytics(),
        api.getTodaySchedule()
      ]);
      setAnalytics(analyticsData);
      setTodaySessions(todayData);
    } catch (err) {
      // If backend is still establishing connection, don't show noisy error yet
      if (backendOnline !== null) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (backendOnline === true || backendOnline === undefined) {
      fetchDashboardData();
    }
  }, [backendOnline]);

  const handleGenerateSchedule = async () => {
    setGenerating(true);
    try {
      const plan = await api.generateSchedule(true);
      showNotification('success', `Timetable successfully generated! ${plan.total_sessions} study blocks scheduled.`);
      fetchDashboardData();
    } catch (err) {
      showNotification('error', `Failed to generate timetable: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSessionComplete = async (session) => {
    try {
      await api.updateSession(session.id, { is_completed: !session.is_completed });
      fetchDashboardData();
      showNotification('success', `Session marked as ${!session.is_completed ? 'completed' : 'pending'}.`);
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '12px' }}>
        <RefreshCw size={28} className="spin" style={{ color: '#2563eb' }} />
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading academic dashboard...</p>
      </div>
    );
  }

  const todayStudyMinutes = todaySessions
    .filter(s => s.session_type === 'Study')
    .reduce((acc, s) => acc + s.duration_minutes, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && (
        <AlertBanner 
          type="error" 
          message={error} 
          onClose={() => setError(null)} 
          action={
            <button
              onClick={fetchDashboardData}
              className="btn btn-sm"
              style={{ background: '#dc2626', color: 'white', border: 'none', padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              Retry
            </button>
          }
        />
      )}

      {/* Top Banner with Quick Actions */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
        color: 'white',
        border: 'none',
        padding: '28px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600', marginBottom: '12px' }}>
            <Sparkles size={13} />
            <span>AI-Driven Optimization Active</span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: '800', lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Academic Workload & Timetable Hub
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#bfdbfe', lineHeight: 1.5, marginBottom: '20px' }}>
            Manage assignments, extract deadlines from syllabi/rubrics, and generate constraint-aware study schedules calibrated to your personal pace.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button 
              onClick={() => setCurrentPage('assignments')}
              className="btn btn-sm"
              style={{ background: 'white', color: '#1e3a8a', fontWeight: '700' }}
            >
              <Plus size={16} />
              <span>Add Assignment</span>
            </button>
            <button 
              onClick={() => setCurrentPage('upload')}
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', fontWeight: '600' }}
            >
              <FileUp size={16} />
              <span>Upload PDF/DOCX</span>
            </button>
            <button 
              onClick={handleGenerateSchedule}
              disabled={generating}
              className="btn btn-sm"
              style={{ background: '#10b981', color: 'white', border: 'none', fontWeight: '600' }}
            >
              {generating ? <RefreshCw size={15} className="spin" /> : <Calendar size={15} />}
              <span>{generating ? 'Scheduling...' : 'Generate Timetable'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Total Assignments */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Assignments</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>{analytics?.total_assignments || 0}</h3>
          </div>
        </div>

        {/* Pending & In Progress */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Pending / In Progress</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
              {(analytics?.pending_assignments || 0) + (analytics?.in_progress_assignments || 0)}
            </h3>
          </div>
        </div>

        {/* Completed */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Completed</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>{analytics?.completed_assignments || 0}</h3>
          </div>
        </div>

        {/* Overdue */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Overdue Deadlines</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: analytics?.overdue_assignments ? '#dc2626' : '#0f172a' }}>
              {analytics?.overdue_assignments || 0}
            </h3>
          </div>
        </div>

        {/* Today's Study Hours */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Today's Study Load</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
              {(todayStudyMinutes / 60).toFixed(1)} hrs
            </h3>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
        gap: '24px'
      }}>
        {/* Left Column: Today's Scheduled Sessions */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Today's Study Schedule</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Scheduled focus blocks and recovery breaks for today</p>
            </div>
            <button 
              onClick={() => setCurrentPage('timetable')} 
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              <span>Full Timetable</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {todaySessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
              <Calendar size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>No sessions scheduled for today</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>Click below to run the scheduling engine across your pending tasks.</p>
              <button onClick={handleGenerateSchedule} className="btn btn-primary btn-sm">
                Generate Schedule Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todaySessions.map((session) => (
                <div 
                  key={session.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: session.session_type === 'Break' ? '#f5f3ff' : (session.is_completed ? '#f8fafc' : '#ffffff'),
                    opacity: session.is_completed ? 0.75 : 1
                  }}
                >
                  {session.session_type === 'Study' ? (
                    <input 
                      type="checkbox"
                      checked={session.is_completed}
                      onChange={() => handleToggleSessionComplete(session)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                    />
                  ) : (
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#c4b5fd', display: 'inline-block' }} />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      fontSize: '0.88rem', 
                      fontWeight: '600', 
                      color: session.is_completed ? '#64748b' : '#0f172a',
                      textDecoration: session.is_completed ? 'line-through' : 'none'
                    }}>
                      {session.title}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {session.notes || `${session.session_type} Session`}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
                      {session.start_time} - {session.end_time}
                    </span>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {session.duration_minutes} min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Deadlines & Workload Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Upcoming Deadlines Card */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Upcoming Deadlines</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Immediate submission milestones</p>
              </div>
              <button 
                onClick={() => setCurrentPage('assignments')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                All
              </button>
            </div>

            {(!analytics?.upcoming_deadlines || analytics.upcoming_deadlines.length === 0) ? (
              <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '16px 0' }}>
                No active deadlines found.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analytics.upcoming_deadlines.slice(0, 4).map((item) => (
                  <div 
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      borderLeft: item.days_left < 1 ? '4px solid #ef4444' : (item.days_left < 3 ? '4px solid #f59e0b' : '4px solid #2563eb')
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f172a' }}>{item.title}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.subject}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${item.days_left < 1 ? 'badge-high' : (item.days_left < 3 ? 'badge-medium' : 'badge-low')}`}>
                        {item.days_left < 0 ? 'Overdue' : `${item.days_left}d left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Academic Assistant Teaser */}
          <div className="card" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} />
              </div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>Need help with code or concepts?</h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
              Ask the Academic Assistant questions regarding time complexity, deadlock proofs, SQL joins, or assignment instructions.
            </p>
            <button 
              onClick={() => setCurrentPage('assistant')} 
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
            >
              Open AI Academic Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
