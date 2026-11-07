import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Plus, 
  RefreshCw, 
  Info,
  ShieldCheck,
  Send
} from 'lucide-react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';

export default function RemindersPage({ showNotification, onReminderUpdate, backendOnline }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [browserPermission, setBrowserPermission] = useState('default');

  // New reminder modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    message: '',
    reminder_type: 'General',
    trigger_date: '',
    trigger_time: '18:00',
  });

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const data = await api.getReminders(false);
      setReminders(data);
      if (onReminderUpdate) onReminderUpdate();
    } catch (err) {
      if (backendOnline !== null) {
        showNotification('error', `Failed to load reminders: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (backendOnline === true || backendOnline === undefined) {
      fetchReminders();
    }
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, [backendOnline]);

  const handleRequestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      showNotification('error', 'Browser does not support desktop notifications.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        new Notification('Academic Workload Optimizer', {
          body: 'Browser notification permissions enabled for active study sessions!',
          icon: '/vite.svg'
        });
        showNotification('success', 'Browser notifications enabled successfully.');
      } else {
        showNotification('warning', 'Notification permission was not granted.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleScanReminders = async () => {
    setScanning(true);
    try {
      const res = await api.scanReminders();
      showNotification('success', res.message);
      fetchReminders();
    } catch (err) {
      showNotification('error', `Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markReminderRead(id);
      setReminders(reminders.map(r => r.id === id ? { ...r, is_read: true } : r));
      if (onReminderUpdate) onReminderUpdate();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await api.dismissReminder(id);
      setReminders(reminders.filter(r => r.id !== id));
      showNotification('success', 'Reminder dismissed.');
      if (onReminderUpdate) onReminderUpdate();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.title.trim() || !newReminder.message.trim()) return;

    let triggerIso = new Date().toISOString();
    if (newReminder.trigger_date) {
      triggerIso = new Date(`${newReminder.trigger_date}T${newReminder.trigger_time || '18:00'}:00`).toISOString();
    }

    try {
      const created = await api.createReminder({
        title: newReminder.title.trim(),
        message: newReminder.message.trim(),
        reminder_type: newReminder.reminder_type,
        trigger_time: triggerIso,
      });
      setReminders([created, ...reminders]);
      showNotification('success', 'Custom reminder created and saved to SQLite.');
      setIsModalOpen(false);
      setNewReminder({
        title: '',
        message: '',
        reminder_type: 'General',
        trigger_date: '',
        trigger_time: '18:00',
      });
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Top Banner & Control Bar */}
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
              Academic Reminders & Notifications
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Automated alerts for deadlines, scheduled study sessions, and workload risks saved in SQLite.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleScanReminders}
              disabled={scanning}
              className="btn btn-secondary btn-sm"
              title="Triggers immediate scan of approaching deadlines"
            >
              {scanning ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
              <span>Scan Now</span>
            </button>

            {browserPermission !== 'granted' && (
              <button
                onClick={handleRequestBrowserPermission}
                className="btn btn-secondary btn-sm"
                title="Enable browser native notifications"
              >
                <Bell size={14} />
                <span>Enable Browser Alerts</span>
              </button>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              <span>New Reminder</span>
            </button>
          </div>
        </div>

        {/* Browser Notification Disclaimer Box */}
        <div style={{
          marginTop: '14px',
          padding: '10px 14px',
          background: '#f8fafc',
          borderRadius: '8px',
          borderLeft: '3px solid #64748b',
          fontSize: '0.78rem',
          color: '#475569',
          lineHeight: 1.45
        }}>
          <strong>Review Note:</strong> Browser Notifications API operates when this web application tab is open and browser permissions are granted. Reminders are persistently stored in SQLite and displayed directly in this in-app panel regardless of browser background permissions.
        </div>
      </div>

      {/* Reminders List Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: '#fafbfc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: '700', color: '#0f172a' }}>Active Reminders ({reminders.length})</h4>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {reminders.filter(r => !r.is_read).length} unread
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', color: '#2563eb' }} />
            <p>Loading persistent reminders...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Bell size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>No active reminders</h4>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
              All upcoming deadlines are safely paced, or no reminders have been triggered yet.
            </p>
            <button onClick={handleScanReminders} className="btn btn-secondary btn-sm">
              Trigger Deadline Scan
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {reminders.map((rem) => {
              const isOverdue = rem.reminder_type === 'OverdueWarning';
              return (
                <div
                  key={rem.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    background: rem.is_read ? '#ffffff' : '#f0f9ff',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isOverdue ? '#fee2e2' : (rem.reminder_type === 'Deadline' ? '#fef3c7' : '#eff6ff'),
                    color: isOverdue ? '#dc2626' : (rem.reminder_type === 'Deadline' ? '#d97706' : '#2563eb'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isOverdue ? <AlertTriangle size={16} /> : <Clock size={16} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: rem.is_read ? '600' : '700', color: '#0f172a' }}>
                        {rem.title}
                      </p>
                      <span className={`badge ${isOverdue ? 'badge-high' : 'badge-info'}`}>
                        {rem.reminder_type}
                      </span>
                      {!rem.is_read && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                      {rem.message}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                      {new Date(rem.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!rem.is_read && (
                      <button
                        onClick={() => handleMarkRead(rem.id)}
                        className="btn btn-secondary btn-sm"
                        title="Mark as read"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <Check size={13} />
                        <span>Read</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(rem.id)}
                      className="btn btn-secondary btn-sm"
                      title="Dismiss reminder"
                      style={{ padding: '4px 8px' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Reminder Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>Create Custom Reminder</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReminder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Reminder Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Valgrind Memory Profiling Check"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message Details *</label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Instructions or things to remember..."
                    value={newReminder.message}
                    onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    value={newReminder.reminder_type}
                    onChange={(e) => setNewReminder({ ...newReminder, reminder_type: e.target.value })}
                    className="form-control"
                  >
                    <option value="General">General</option>
                    <option value="Deadline">Deadline</option>
                    <option value="StudySession">Study Session</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Trigger Date</label>
                    <input
                      type="date"
                      value={newReminder.trigger_date}
                      onChange={(e) => setNewReminder({ ...newReminder, trigger_date: e.target.value })}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input
                      type="time"
                      value={newReminder.trigger_time}
                      onChange={(e) => setNewReminder({ ...newReminder, trigger_time: e.target.value })}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
