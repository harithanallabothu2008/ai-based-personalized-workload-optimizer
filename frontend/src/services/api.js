const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ai-based-personalized-workload-optimizer-pt3y.onrender.com';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {};

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      let errorDetail = `Request failed with status ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.detail) {
          if (Array.isArray(errJson.detail)) {
            errorDetail = errJson.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
          } else {
            errorDetail = errJson.detail;
          }
        }
      } catch (e) {
        // Fallback to text status
      }
      throw new Error(errorDetail);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to Backend API at ${API_BASE_URL}. If using Render free tier, please allow 30–60 seconds for the service to wake up.`);
    }
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => request('/health'),

  // Assignments
  getAssignments: () => request('/assignments'),
  getAssignment: (id) => request(`/assignments/${id}`),
  createAssignment: (data) => request('/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateAssignment: (id, data) => request(`/assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteAssignment: (id) => request(`/assignments/${id}`, {
    method: 'DELETE',
  }),

  // Document Upload
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/assignments/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Tasks
  generateAssignmentTasks: (assignmentId) => request(`/assignments/${assignmentId}/tasks`, {
    method: 'POST',
  }),
  getTasks: (assignmentId = null) => {
    const query = assignmentId ? `?assignment_id=${assignmentId}` : '';
    return request(`/tasks${query}`);
  },
  createTask: (data) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateTask: (id, data) => request(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteTask: (id) => request(`/tasks/${id}`, {
    method: 'DELETE',
  }),

  // Planner & Availability
  generateSchedule: (preserveCompleted = true, startDate = null) => {
    const params = new URLSearchParams({ preserve_completed: preserveCompleted });
    if (startDate) params.append('start_date', startDate);
    return request(`/planner/generate?${params.toString()}`, {
      method: 'POST',
    });
  },
  getTodaySchedule: () => request('/planner/today'),
  getAllSessions: (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return request(`/planner/sessions?${params.toString()}`);
  },
  reschedulePlan: (triggerTaskId = null, reason = '') => request('/planner/reschedule', {
    method: 'POST',
    body: JSON.stringify({ trigger_task_id: triggerTaskId, reason }),
  }),
  updateSession: (id, data) => request(`/planner/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteSession: (id) => request(`/planner/sessions/${id}`, {
    method: 'DELETE',
  }),
  getAvailability: () => request('/planner/availability'),
  updateAvailability: (list) => request('/planner/availability', {
    method: 'PUT',
    body: JSON.stringify({ availability: list }),
  }),

  // Reminders
  getReminders: (includeDismissed = false) => request(`/reminders?include_dismissed=${includeDismissed}&auto_scan=true`),
  createReminder: (data) => request('/reminders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  markReminderRead: (id) => request(`/reminders/${id}/read`, {
    method: 'PATCH',
  }),
  dismissReminder: (id) => request(`/reminders/${id}/dismiss`, {
    method: 'PATCH',
  }),
  scanReminders: () => request('/reminders/scan', {
    method: 'POST',
  }),

  // Analytics & History
  getProgressAnalytics: () => request('/analytics/progress'),
  getWorkHistory: () => request('/work-history'),
  logWorkHistory: (data) => request('/work-history', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Assistant
  askAssistant: (question, assignmentId = null, context = null) => request('/assistant/ask', {
    method: 'POST',
    body: JSON.stringify({ question, assignment_id: assignmentId, context }),
  }),
  getAssistantStatus: () => request('/assistant/status'),

  // Demo Data
  loadDemoData: () => request('/demo-data', { method: 'POST' }),
  clearAllData: () => request('/demo-data', { method: 'DELETE' }),
};
