const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchAPI(endpoint: string, options: FetchOptions = {}) {
  const { token, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...fetchOpts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const api = {
  auth: {
    register: (body: { email: string; username: string; displayName: string; password: string; country: string }) =>
      fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  },
  users: {
    me: (token: string) => fetchAPI('/users/me', { token }),
  },
  reports: {
    feed: (country: string, page = 1) => fetchAPI(`/reports/feed?country=${country}&page=${page}`),
    nearby: (lat: number, lng: number, radius = 10) => fetchAPI(`/reports/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
    byCategory: (country: string, category: string, page = 1) => fetchAPI(`/reports/category/${category}?country=${country}&page=${page}`),
    getById: (id: string) => fetchAPI(`/reports/${id}`),
    create: (token: string, body: any) => fetchAPI('/reports', { method: 'POST', body: JSON.stringify(body), token }),
    upvote: (token: string, id: string) => fetchAPI(`/reports/${id}/upvote`, { method: 'PATCH', token }),
    downvote: (token: string, id: string) => fetchAPI(`/reports/${id}/downvote`, { method: 'PATCH', token }),
  },
  donations: {
    campaignFeed: (country: string, page = 1) => fetchAPI(`/donations/campaigns/feed?country=${country}&page=${page}`),
    emergency: (country: string) => fetchAPI(`/donations/campaigns/emergency?country=${country}`),
    byCategory: (country: string, category: string, page = 1) => fetchAPI(`/donations/campaigns/category/${category}?country=${country}&page=${page}`),
    getById: (id: string) => fetchAPI(`/donations/campaigns/${id}`),
    getDonations: (id: string, page = 1) => fetchAPI(`/donations/campaigns/${id}/donations?page=${page}`),
    create: (token: string, body: any) => fetchAPI('/donations/campaigns', { method: 'POST', body: JSON.stringify(body), token }),
    donate: (token: string, id: string, body: any) => fetchAPI(`/donations/campaigns/${id}/donate`, { method: 'POST', body: JSON.stringify(body), token }),
    verify: (reference: string) => fetchAPI(`/donations/verify/${reference}`),
  },
};
