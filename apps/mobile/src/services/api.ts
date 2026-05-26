import axios from 'axios';

// Replace with your computer's local IP (run: ipconfig | findstr IPv4)
const LOCAL_IP = '10.162.41.17';
const API_BASE_URL = __DEV__ ? `http://${LOCAL_IP}:3001/api/v1` : 'https://api.reportafrica.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const authAPI = {
  register: (data: { email: string; username: string; displayName: string; password: string; country: string; latitude?: number; longitude?: number }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
};

export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),
};

export const reportsAPI = {
  create: (data: any) => api.post('/reports', data),
  getFeed: (country: string, page = 1) => api.get(`/reports/feed?country=${country}&page=${page}`),
  getNearby: (lat: number, lng: number, radius = 10, page = 1) =>
    api.get(`/reports/nearby?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}`),
  getByCategory: (country: string, category: string, page = 1) =>
    api.get(`/reports/category/${category}?country=${country}&page=${page}`),
  getById: (id: string) => api.get(`/reports/${id}`),
  upvote: (id: string) => api.patch(`/reports/${id}/upvote`),
  downvote: (id: string) => api.patch(`/reports/${id}/downvote`),
};

export const donationsAPI = {
  campaignFeed: (country: string, page = 1) => api.get(`/donations/campaigns/feed?country=${country}&page=${page}`),
  emergency: (country: string) => api.get(`/donations/campaigns/emergency?country=${country}`),
  byCategory: (country: string, category: string, page = 1) => api.get(`/donations/campaigns/category/${category}?country=${country}&page=${page}`),
  getById: (id: string) => api.get(`/donations/campaigns/${id}`),
  getDonations: (id: string, page = 1) => api.get(`/donations/campaigns/${id}/donations?page=${page}`),
  create: (data: any) => api.post('/donations/campaigns', data),
  donate: (id: string, data: any) => api.post(`/donations/campaigns/${id}/donate`, data),
  verify: (reference: string) => api.get(`/donations/verify/${reference}`),
};

export default api;
