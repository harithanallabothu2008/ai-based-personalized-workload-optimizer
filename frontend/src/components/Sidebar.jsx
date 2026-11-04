import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileUp, 
  CheckSquare, 
  Calendar, 
  BarChart3, 
  Bell, 
  Sparkles, 
  Settings,
  GraduationCap
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, remindersCount = 0 }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assignments', label: 'Assignments', icon: BookOpen },
    { id: 'upload', label: 'Upload Documents', icon: FileUp },
    { id: 'tasks', label: 'Task Breakdown', icon: CheckSquare },
    { id: 'timetable', label: 'Daily Timetable', icon: Calendar },
    { id: 'analytics', label: 'Progress Analytics', icon: BarChart3 },
    { id: 'reminders', label: 'Reminders', icon: Bell, badge: remindersCount > 0 ? remindersCount : null },
    { id: 'assistant', label: 'AI Doubt Assistant', icon: Sparkles, highlight: true },
    { id: 'settings', label: 'Settings & Hours', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '38px', 
          height: '38px', 
          borderRadius: '10px', 
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
        }}>
          <GraduationCap size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            OptiAcademic
          </h2>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
            Workload Optimizer
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#2563eb' : (item.highlight && !isActive ? 'rgba(139, 92, 246, 0.12)' : 'transparent'),
                color: isActive ? '#ffffff' : (item.highlight ? '#c084fc' : '#94a3b8'),
                fontSize: '0.875rem',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#1e293b';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = item.highlight ? 'rgba(139, 92, 246, 0.12)' : 'transparent';
              }}
            >
              <Icon size={18} style={{ color: isActive ? '#ffffff' : (item.highlight ? '#a855f7' : '#94a3b8') }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '999px',
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Student Profile Card Footer */}
      <div style={{ padding: '16px', borderTop: '1px solid #1e293b', background: '#080e1f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#1e293b',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            fontSize: '0.8rem',
            fontWeight: '700'
          }}>
            CSE
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              B.Tech CSE Review
            </p>
            <p style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Academic Year 2026
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
