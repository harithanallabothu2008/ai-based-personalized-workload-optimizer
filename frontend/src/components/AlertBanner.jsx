import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function AlertBanner({ type = 'info', message, onClose, action }) {
  if (!message) return null;

  const styles = {
    success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: CheckCircle2, iconColor: '#059669' },
    error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: XCircle, iconColor: '#dc2626' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: AlertTriangle, iconColor: '#d97706' },
    info: { bg: '#f0f9ff', border: '#bae6fd', text: '#075985', icon: Info, iconColor: '#0284c7' },
  }[type] || { bg: '#f0f9ff', border: '#bae6fd', text: '#075985', icon: Info, iconColor: '#0284c7' };

  const Icon = styles.icon;

  return (
    <div style={{
      background: styles.bg,
      border: `1px solid ${styles.border}`,
      color: styles.text,
      padding: '12px 16px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <Icon size={18} style={{ color: styles.iconColor, flexShrink: 0 }} />
        <div style={{ fontSize: '0.875rem', lineHeight: 1.45, fontWeight: '500' }}>
          {message}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {action}
        {onClose && (
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: styles.text, opacity: 0.7 }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
