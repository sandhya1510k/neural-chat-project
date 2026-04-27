/**
 * services/api.js — Axios instance + all API calls
 * Automatically injects JWT from localStorage on every request
 */

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

// ─── Axios instance ────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally — clear token and reload
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth endpoints ────────────────────────────────────────────────────────
export const authAPI = {
  signup:  (data) => api.post('/auth/signup', data),
  login:   (data) => api.post('/auth/login', data),
  getMe:   ()     => api.get('/auth/me'),
};

// ─── Chat endpoints ────────────────────────────────────────────────────────
export const chatAPI = {
  createConversation: (title) => api.post('/chat/conversations', { title }),
  getConversations:   ()      => api.get('/chat/conversations'),
  deleteConversation: (id)    => api.delete(`/chat/conversations/${id}`),
  getMessages:        (id)    => api.get(`/chat/conversations/${id}/messages`),
  search:             (q)     => api.get('/chat/search', { params: { q } }),
};

export default api;
