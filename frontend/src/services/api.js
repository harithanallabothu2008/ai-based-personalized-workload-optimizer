const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ai-based-personalized-workload-optimizer-pt3y.onrender.com';

const CANDIDATE_URLS = [
  DEFAULT_API_BASE_URL,
  'https://ai-based-personalized-workload-optimizer-pt3y.onrender.com',
  'https://ai-based-personalized-workload-optimizer-fq42.onrender.com',
  ...(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? ['http://127.0.0.1:8000'] : [])
].filter(Boolean);

const UNIQUE_URLS = [...new Set(CANDIDATE_URLS)];

let activeApiBase = UNIQUE_URLS[0] || 'https://ai-based-personalized-workload-optimizer-pt3y.onrender.com';

async function request(endpoint, options = {}) {
  const url = `${activeApiBase}${endpoint}`;
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
      throw new Error(`Cannot connect to Backend API at ${activeApiBase}. If using Render free tier, please allow 30–60 seconds for the service to wake up.`);
    }
    throw err;
  }
}

export const api = {
  // Health with multi-service automatic discovery
  checkHealth: async () => {
    const urlsToTry = [activeApiBase, ...UNIQUE_URLS.filter((u) => u !== activeApiBase)];
    let lastErr = null;
    for (const baseUrl of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(baseUrl + "/health", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          activeApiBase = baseUrl;
          return await res.json();
        }
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error(`Cannot connect to Backend API (${activeApiBase}). If using Render free tier, please allow 30–60 seconds for the service to wake up.`);
  },
  getActiveUrl: () => activeApiBase,

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
