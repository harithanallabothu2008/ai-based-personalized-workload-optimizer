import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AlertBanner from './components/AlertBanner';

// Pages
import Dashboard from './pages/Dashboard';
import AssignmentsPage from './pages/AssignmentsPage';
import UploadDocumentPage from './pages/UploadDocumentPage';
import TaskBreakdownPage from './pages/TaskBreakdownPage';
import DailyTimetablePage from './pages/DailyTimetablePage';
import ProgressAnalyticsPage from './pages/ProgressAnalyticsPage';
import RemindersPage from './pages/RemindersPage';
import AssistantPage from './pages/AssistantPage';
import SettingsPage from './pages/SettingsPage';

import { api } from './services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  // Global status states
  const [backendOnline, setBackendOnline] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [remindersCount, setRemindersCount] = useState(0);
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Global Toast Alert
  const [toast, setToast] = useState(null);

  const showNotification = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  const checkSystemStatus = async () => {
    try {
      const health = await api.checkHealth();
      setBackendOnline(true);
      const status = await api.getAssistantStatus();
      setAiStatus(status);
      const reminders = await api.getReminders(false);
      const unread = reminders.filter(r => !r.is_read).length;
      setRemindersCount(unread);
    } catch (err) {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      const res = await api.loadDemoData();
      showNotification('success', res.message);
      checkSystemStatus();
      // Reload current view
      setCurrentPage('dashboard');
    } catch (err) {
      showNotification('error', `Failed to load demo data: ${err.message}`);
    } finally {
      setLoadingDemo(false);
    }
  };

  const pageTitles = {
    dashboard: { title: 'Academic Workload Dashboard', subtitle: 'Overview of assignments, timetable, and study metrics' },
    assignments: { title: 'Assignment Management', subtitle: 'Create, inspect, and update academic assignments in SQLite' },
    upload: { title: 'Document Upload & Parsing', subtitle: 'Extract assignments and deadlines from PDF and DOCX files' },
    tasks: { title: 'Task Breakdown & Milestones', subtitle: 'Sequential task decomposition with dependencies and work tracking' },
    timetable: { title: 'Personalized Daily Timetable', subtitle: 'Constraint-satisfaction study schedule with breaks and overload detection' },
    analytics: { title: 'Progress Analytics & Work Speed', subtitle: 'Completion rate, hours logged, and transparent calibration factors' },
    reminders: { title: 'Reminders & Notifications', subtitle: 'Persistent alerts for approaching deadlines and daily sessions' },
    assistant: { title: 'AI Academic Doubt Assistant', subtitle: 'Step-by-step conceptual explanations and assignment guidance' },
    settings: { title: 'Settings & Daily Availability', subtitle: 'Configure available study hours per day and system settings' },
  };

  const currentInfo = pageTitles[currentPage] || { title: 'Academic Workload Optimizer', subtitle: '' };

  return (
    <div className="app-layout">
      {/* Dark Navy Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        remindersCount={remindersCount} 
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar 
          title={currentInfo.title}
          subtitle={currentInfo.subtitle}
          backendOnline={backendOnline}
          aiStatus={aiStatus}
          remindersCount={remindersCount}
          setCurrentPage={setCurrentPage}
          onLoadDemo={handleLoadDemo}
          loadingDemo={loadingDemo}
        />

        <main className="content-container">
          {/* Notification Toast */}
          {toast && (
            <AlertBanner 
              type={toast.type} 
              message={toast.message} 
              onClose={() => setToast(null)} 
            />
          )}

          {!backendOnline && (
            <AlertBanner 
              type="error"
              message="Cannot connect to FastAPI backend server (https://ai-based-personalized-workload-optimizer-fq42.onrender.com). If Render is idle, it may take 30–60 seconds to spin up on cold start."
            />
          )}

          {/* Active Navigation Page */}
          {currentPage === 'dashboard' && (
            <Dashboard 
              setCurrentPage={setCurrentPage} 
              showNotification={showNotification} 
            />
          )}
          {currentPage === 'assignments' && (
            <AssignmentsPage 
              setCurrentPage={setCurrentPage} 
              setSelectedAssignmentId={setSelectedAssignmentId} 
              showNotification={showNotification} 
            />
          )}
          {currentPage === 'upload' && (
            <UploadDocumentPage 
              setCurrentPage={setCurrentPage} 
              setSelectedAssignmentId={setSelectedAssignmentId} 
              showNotification={showNotification} 
            />
          )}
          {currentPage === 'tasks' && (
            <TaskBreakdownPage 
              selectedAssignmentId={selectedAssignmentId} 
              setSelectedAssignmentId={setSelectedAssignmentId} 
              setCurrentPage={setCurrentPage} 
              showNotification={showNotification} 
            />
          )}
          {currentPage === 'timetable' && (
            <DailyTimetablePage 
              showNotification={showNotification} 
            />
          )}
          {currentPage === 'analytics' && (
            <ProgressAnalyticsPage 
              showNotification={showNotification} 
            />
          )}
          {currentPage === 'reminders' && (
            <RemindersPage 
              showNotification={showNotification} 
              onReminderUpdate={checkSystemStatus} 
            />
          )}
          {currentPage === 'assistant' && (
            <AssistantPage 
              showNotification={showNotification} 
            />
          )}
          {currentPage === 'settings' && (
            <SettingsPage 
              showNotification={showNotification} 
              onResetAll={checkSystemStatus} 
            />
          )}
        </main>
      </div>
    </div>
  );
}
