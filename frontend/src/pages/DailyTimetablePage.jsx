import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Coffee, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  X,
  ChevronRight,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';

export default function DailyTimetablePage({ showNotification, backendOnline }) {
  const [sessions, setSessions] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [selectedDate, setSelectedDate] = useState('ALL');

  // Adjust session modal
  const [adjustingSession, setAdjustingSession] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    session_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    notes: '',
  });

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const data = await api.getAllSessions();
      setSessions(data);
    } catch (err) {
      if (backendOnline !== null) {
        showNotification('error', `Failed to load sessions: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (backendOnline === true || backendOnline === undefined) {
      fetchTimetable();
    }
  }, [backendOnline]);

  const handleGenerateSchedule = async () => {
    setGenerating(true);
    try {
      const plan = await api.generateSchedule(true);
      setSessions(plan.sessions);
      setWarnings(plan.warnings);
      setExplanation(plan.explanation);
      showNotification('success', `Schedule generated! ${plan.total_sessions} sessions allocated.`);
    } catch (err) {
      showNotification('error', `Scheduling engine error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleAdaptiveReschedule = async () => {
    setRescheduling(true);
    try {
      const plan = await api.reschedulePlan(null, 'Student triggered adaptive rescheduling');
      setSessions(plan.sessions);
      setWarnings(plan.warnings);
      setExplanation(plan.explanation);
      showNotification('success', 'Adaptive rescheduling complete! Uncompleted tasks shifted forward.');
    } catch (err) {
      showNotification('error', `Rescheduling error: ${err.message}`);
    } finally {
      setRescheduling(false);
    }
  };

  const handleToggleComplete = async (session) => {
    try {
      const updated = await api.updateSession(session.id, { is_completed: !session.is_completed });
      setSessions(sessions.map(s => s.id === session.id ? updated : s));
      showNotification('success', `Session marked as ${!session.is_completed ? 'completed' : 'pending'}.`);
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleOpenAdjust = (session) => {
    setAdjustForm({
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: session.duration_minutes,
      notes: session.notes || '',
    });
    setAdjustingSession(session);
  };

  const handleSaveAdjust = async (e) => {
    e.preventDefault();
    if (!adjustingSession) return;
    try {
      const updated = await api.updateSession(adjustingSession.id, adjustForm);
      setSessions(sessions.map(s => s.id === adjustingSession.id ? updated : s));
      showNotification('success', 'Session adjusted and saved to SQLite.');
      setAdjustingSession(null);
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.deleteSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      showNotification('success', 'Session removed from schedule.');
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  // Group sessions by date
  const groupedSessions = {};
  sessions.forEach(s => {
    if (!groupedSessions[s.session_date]) {
      groupedSessions[s.session_date] = [];
    }
    groupedSessions[s.session_date].push(s);
  });

  const uniqueDates = Object.keys(groupedSessions).sort();

  const filteredDates = selectedDate === 'ALL' ? uniqueDates : [selectedDate];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Action Header */}
      <div className="card" style={{ padding: '18px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              Personalized Academic Study Timetable
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Automated timetable calculated using constraint satisfaction, student availability, dependencies, and deadlines.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleAdaptiveReschedule}
              disabled={rescheduling}
              className="btn btn-secondary btn-sm"
              title="Shifts incomplete tasks forward while preserving completed work"
            >
              {rescheduling ? <RefreshCw size={14} className="spin" /> : <RotateCcw size={14} />}
              <span>Adaptive Reschedule</span>
            </button>
            <button
              onClick={handleGenerateSchedule}
              disabled={generating}
              className="btn btn-primary btn-sm"
              title="Recalculate full schedule from scratch using availability constraints"
            >
              {generating ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
              <span>Recalculate Schedule</span>
            </button>
          </div>
        </div>

        {explanation && (
          <div style={{ marginTop: '14px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #2563eb', fontSize: '0.82rem', color: '#334155' }}>
            <strong>Engine Note:</strong> {explanation}
          </div>
        )}
      </div>

      {/* Overload & Deadline Feasibility Warnings */}
      {warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {warnings.map((w, idx) => (
            <div 
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: w.severity === 'danger' ? '#fef2f2' : (w.severity === 'warning' ? '#fffbeb' : '#f0f9ff'),
                border: `1px solid ${w.severity === 'danger' ? '#fecaca' : (w.severity === 'warning' ? '#fde68a' : '#bae6fd')}`,
                color: w.severity === 'danger' ? '#991b1b' : (w.severity === 'warning' ? '#92400e' : '#075985')
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: '700' }}>{w.title}</p>
                <p style={{ fontSize: '0.8rem', lineHeight: 1.45 }}>{w.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Date Filter Tabs */}
      {uniqueDates.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedDate('ALL')}
            className={`btn btn-sm ${selectedDate === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem' }}
          >
            All Dates ({uniqueDates.length} days)
          </button>
          {uniqueDates.map(dateStr => {
            const d = new Date(dateStr + 'T00:00:00');
            const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`btn btn-sm ${selectedDate === dateStr ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                {formatted}
              </button>
            );
          })}
        </div>
      )}

      {/* Timetable Session Cards */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', color: '#2563eb' }} />
          <p>Loading study sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <CalendarIcon size={40} style={{ color: '#94a3b8', margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>No study sessions generated yet</h4>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            Run the scheduling algorithm to calculate timetable slots based on your pending tasks and configured study availability.
          </p>
          <button onClick={handleGenerateSchedule} className="btn btn-primary btn-sm">
            <Sparkles size={14} />
            <span>Generate Schedule</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filteredDates.map((dateStr) => {
            const daySessions = groupedSessions[dateStr] || [];
            const d = new Date(dateStr + 'T00:00:00');
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

            const studyTime = daySessions
              .filter(s => s.session_type === 'Study')
              .reduce((acc, s) => acc + s.duration_minutes, 0);

            return (
              <div key={dateStr} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{
                  padding: '14px 20px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarIcon size={16} style={{ color: '#2563eb' }} />
                    <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>{dayName}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                    {(studyTime / 60).toFixed(1)} hrs study scheduled • {daySessions.length} blocks
                  </span>
                </div>

                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {daySessions.map((session) => (
                    <div
                      key={session.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: session.session_type === 'Break' ? '#f5f3ff' : (session.is_completed ? '#f8fafc' : '#ffffff'),
                        opacity: session.is_completed ? 0.75 : 1
                      }}
                    >
                      {/* Completion check or break icon */}
                      {session.session_type === 'Study' ? (
                        <input
                          type="checkbox"
                          checked={session.is_completed}
                          onChange={() => handleToggleComplete(session)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                          title="Mark study session completed"
                        />
                      ) : (
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#e9d5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Coffee size={14} />
                        </div>
                      )}

                      {/* Time Slot */}
                      <div style={{ minWidth: '110px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: session.session_type === 'Break' ? '#7c3aed' : '#2563eb', fontFamily: 'var(--font-mono)' }}>
                          {session.start_time} - {session.end_time}
                        </span>
                        <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {session.duration_minutes} mins
                        </p>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <p style={{
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            color: session.is_completed ? '#64748b' : '#0f172a',
                            textDecoration: session.is_completed ? 'line-through' : 'none'
                          }}>
                            {session.title}
                          </p>
                          {session.session_type === 'Break' ? (
                            <span className="badge badge-break">Break</span>
                          ) : (
                            <span className={`badge badge-${session.priority.toLowerCase()}`}>{session.priority}</span>
                          )}
                          {session.is_manually_adjusted && (
                            <span className="badge badge-info" title="Manually adjusted by student">Adjusted</span>
                          )}
                        </div>
                        {session.notes && (
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {session.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenAdjust(session)}
                          className="btn btn-secondary btn-sm"
                          title="Manually adjust time or notes"
                          style={{ padding: '4px 8px' }}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="btn btn-danger btn-sm"
                          title="Remove session"
                          style={{ padding: '4px 8px' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Adjust Session Modal */}
      {adjustingSession && (
        <div className="modal-overlay" onClick={() => setAdjustingSession(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Adjust Scheduled Session
              </h3>
              <button onClick={() => setAdjustingSession(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '14px', fontWeight: '600' }}>
                  {adjustingSession.title}
                </p>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    required
                    value={adjustForm.session_date}
                    onChange={(e) => setAdjustForm({ ...adjustForm, session_date: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      required
                      value={adjustForm.start_time}
                      onChange={(e) => setAdjustForm({ ...adjustForm, start_time: e.target.value })}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      required
                      value={adjustForm.end_time}
                      onChange={(e) => setAdjustForm({ ...adjustForm, end_time: e.target.value })}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Goals for Session</label>
                  <textarea
                    rows="2"
                    value={adjustForm.notes}
                    onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setAdjustingSession(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
