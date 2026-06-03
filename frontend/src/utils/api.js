const API_URL = import.meta.env.VITE_API_URL || 'https://saas-appointment-manager.onrender.com';
const BASE = API_URL ? `${API_URL}/api` : '/api';
console.log('[ReminderFlow API] Base URL configured as:', BASE);

function getToken() {
  return localStorage.getItem('rf_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: () => request('/auth/me'),

  // Appointments
  getAppointments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/appointments${q ? `?${q}` : ''}`);
  },
  getStats: () => request('/appointments/stats'),
  getAppointment: (id) => request(`/appointments/${id}`),
  createAppointment: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
  sendReminder: (id) => request(`/appointments/${id}/send-reminder`, { method: 'POST' }),
  checkConflict: (data) => request('/appointments/check-conflict', { method: 'POST', body: JSON.stringify(data) }),

  // Messages
  getMessages: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/messages${q ? `?${q}` : ''}`);
  },
  getNotifications: () => request('/messages/notifications'),
  markNotificationsRead: () => request('/messages/notifications/mark-read', { method: 'PUT' }),

  // Customers (CRM)
  getCustomers: () => request('/customers'),
  getCustomerProfile: (phone) => request(`/customers/${encodeURIComponent(phone)}`),
  addCustomerNote: (phone, note, staff = 'Admin') =>
    request(`/customers/${encodeURIComponent(phone)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note, staff }),
    }),
  getCustomerNotes: (phone) => request(`/customers/${encodeURIComponent(phone)}/notes`),

  // Reports
  getReportsSummary: () => request('/reports/summary'),
  getReportAppointments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/appointments${q ? `?${q}` : ''}`);
  },

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
