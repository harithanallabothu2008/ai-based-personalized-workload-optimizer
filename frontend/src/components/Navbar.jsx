import React from 'react';
import { Bell, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';

export default function Navbar({ 
  title, 
  subtitle, 
  backendOnline, 
  aiStatus, 
  remindersCount, 
  setCurrentPage, 
  onLoadDemo, 
  loadingDemo 
}) {
  return (
    <header style={{
      height: '70px',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 36px',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Backend status pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: '600',
          background: backendOnline ? '#ecfdf5' : '#fef2f2',
          color: backendOnline ? '#047857' : '#b91c1c',
          border: `1px solid ${backendOnline ? '#a7f3d0' : '#fecaca'}`
        }}>
          {backendOnline ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          <span>{backendOnline ? 'FastAPI & SQLite Online' : 'Backend Disconnected'}</span>
        </div>

        {/* AI mode pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: '600',
          background: aiStatus?.is_ai_configured ? '#f5f3ff' : '#f0f9ff',
          color: aiStatus?.is_ai_configured ? '#6d28d9' : '#0369a1',
          border: `1px solid ${aiStatus?.is_ai_configured ? '#ddd6fe' : '#bae6fd'}`
        }}>
          <Sparkles size={13} />
          <span>{aiStatus?.is_ai_configured ? 'Gemini AI Active' : 'Rule-Based Fallback'}</span>
        </div>

        {/* Load Demo Data Button */}
        <button
          onClick={onLoadDemo}
          disabled={loadingDemo}
          className="btn btn-secondary btn-sm"
          title="Seed realistic college assignments and timetable for presentation demonstration"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {loadingDemo ? <RefreshCw size={14} className="spin" /> : <Database size={14} />}
          <span>Demo Data</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setCurrentPage('reminders')}
          style={{
            position: 'relative',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#475569'
          }}
          title="View Reminders"
        >
          <Bell size={18} />
          {remindersCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: '700',
              borderRadius: '999px',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white'
            }}>
              {remindersCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
