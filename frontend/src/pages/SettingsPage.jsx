import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Clock, 
  Save, 
  RotateCcw, 
  Database, 
  ShieldAlert, 
  Info,
  CheckCircle2,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import AlertBanner from '../components/AlertBanner';

export default function SettingsPage({ showNotification, onResetAll }) {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [availData, health] = await Promise.all([
        api.getAvailability(),
        api.checkHealth()
      ]);
      setAvailability(availData);
      setSystemInfo(health);
    } catch (err) {
      showNotification('error', `Failed to load settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleAvailabilityChange = (index, field, value) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateAvailability(availability);
      showNotification('success', 'Study availability constraints saved to SQLite! Upcoming schedule generation will respect these hours.');
    } catch (err) {
      showNotification('error', `Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    try {
      await api.clearAllData();
      showNotification('success', 'All database records have been reset.');
      setIsResetModalOpen(false);
      if (onResetAll) onResetAll();
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Availability Constraints Form Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
              Daily Study Availability & Constraint Bounds
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Configure your daily study capacity for each day of the week. The scheduling engine strictly guarantees no sessions are scheduled outside these windows.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', color: '#2563eb' }} />
            <p>Loading constraints from SQLite...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveAvailability}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {availability.map((item, index) => (
                <div
                  key={item.day_of_week}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    background: item.is_active ? '#ffffff' : '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    opacity: item.is_active ? 1 : 0.6
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      onChange={(e) => handleAvailabilityChange(index, 'is_active', e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>
                      {daysOfWeek[item.day_of_week]}
                    </span>
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Capacity:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="14"
                      disabled={!item.is_active}
                      value={item.available_hours}
                      onChange={(e) => handleAvailabilityChange(index, 'available_hours', parseFloat(e.target.value) || 0)}
                      className="form-control"
                      style={{ width: '70px', height: '34px', padding: '4px 8px', fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>hrs</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Between:</span>
                    <input
                      type="time"
                      disabled={!item.is_active}
                      value={item.start_hour}
                      onChange={(e) => handleAvailabilityChange(index, 'start_hour', e.target.value)}
                      className="form-control"
                      style={{ width: '105px', height: '34px', padding: '4px 8px', fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>to</span>
                    <input
                      type="time"
                      disabled={!item.is_active}
                      value={item.end_hour}
                      onChange={(e) => handleAvailabilityChange(index, 'end_hour', e.target.value)}
                      className="form-control"
                      style={{ width: '105px', height: '34px', padding: '4px 8px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
                <span>{saving ? 'Saving...' : 'Save Availability Constraints'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* System Diagnostics & College Review Info */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>
              System Architecture & College Review Spec
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Underlying software components active in this environment
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div>
            <p style={{ color: '#64748b' }}>Frontend Stack:</p>
            <p style={{ fontWeight: '600', color: '#0f172a' }}>React 18 + Vite + Recharts + Lucide</p>
          </div>
          <div>
            <p style={{ color: '#64748b' }}>Backend Stack:</p>
            <p style={{ fontWeight: '600', color: '#0f172a' }}>Python 3.13 + FastAPI + Uvicorn</p>
          </div>
          <div>
            <p style={{ color: '#64748b' }}>Database Engine:</p>
            <p style={{ fontWeight: '600', color: '#0f172a' }}>SQLite (SQLAlchemy ORM + StaticPool)</p>
          </div>
          <div>
            <p style={{ color: '#64748b' }}>Document Processing:</p>
            <p style={{ fontWeight: '600', color: '#0f172a' }}>PyMuPDF (fitz) + python-docx</p>
          </div>
          <div>
            <p style={{ color: '#64748b' }}>Scheduling Engine:</p>
            <p style={{ fontWeight: '600', color: '#0f172a' }}>Deterministic Constraint Satisfaction + Adaptive Recalculation</p>
          </div>
          <div>
            <p style={{ color: '#64748b' }}>AI Service:</p>
            <p style={{ fontWeight: '600', color: '#0f172a' }}>External LLM API (Gemini) + Heuristic Fallback</p>
          </div>
        </div>
      </div>

      {/* Danger Zone / Database Reset */}
      <div className="card" style={{ border: '1px solid #fecaca', background: '#fff5f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#991b1b' }}>
              Reset Demonstration Database
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#b91c1c' }}>
              Clears all assignments, tasks, schedule sessions, and history records for a clean review presentation.
            </p>
          </div>
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="btn btn-danger btn-sm"
          >
            <RotateCcw size={14} />
            <span>Clear Database</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Reset All Database Records"
        message="Are you sure you want to delete all saved assignments, tasks, and scheduled sessions? You can reload sample demo data anytime with 1 click."
        confirmText="Confirm Reset"
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetModalOpen(false)}
        isDanger={true}
      />
    </div>
  );
}
