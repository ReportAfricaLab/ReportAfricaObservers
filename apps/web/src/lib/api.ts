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
    oauth: (provider: string, token: string, country?: string) =>
      fetchAPI('/auth/oauth', { method: 'POST', body: JSON.stringify({ provider, token, country }) }),
  },
  users: {
    me: (token: string) => fetchAPI('/users/me', { token }),
  },
  reports: {
    feed: (country: string, page = 1, lat?: number, lng?: number) => {
      let url = `/reports/feed?country=${country}&page=${page}`;
      if (lat && lng) url += `&lat=${lat}&lng=${lng}`;
      return fetchAPI(url);
    },
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
  licensing: {
    request: (token: string, body: any) => fetchAPI('/media-licensing/request', { method: 'POST', body: JSON.stringify(body), token }),
    myRequests: (token: string, page = 1) => fetchAPI(`/media-licensing/my-requests?page=${page}`, { token }),
    incoming: (token: string, page = 1) => fetchAPI(`/media-licensing/incoming?page=${page}`, { token }),
    respond: (token: string, id: string, action: string) => fetchAPI(`/media-licensing/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ action }), token }),
    pay: (token: string, id: string, body: any) => fetchAPI(`/media-licensing/${id}/pay`, { method: 'POST', body: JSON.stringify(body), token }),
  },
  earnings: {
    list: (token: string, page = 1) => fetchAPI(`/earnings?page=${page}`, { token }),
    stats: (token: string) => fetchAPI('/earnings/stats', { token }),
  },
  livestream: {
    create: (token: string, body: any) => fetchAPI('/livestream/create', { method: 'POST', body: JSON.stringify(body), token }),
    goLive: (token: string, id: string) => fetchAPI(`/livestream/${id}/go-live`, { method: 'PATCH', token }),
    end: (token: string, id: string) => fetchAPI(`/livestream/${id}/end`, { method: 'PATCH', token }),
    getLive: (country: string, page = 1) => fetchAPI(`/livestream/live?country=${country}&page=${page}`),
    getRecordings: (country: string, page = 1) => fetchAPI(`/livestream/recordings?country=${country}&page=${page}`),
    getById: (id: string) => fetchAPI(`/livestream/${id}`),
    myStreams: (token: string) => fetchAPI('/livestream/my/streams', { token }),
  },
  upload: {
    getPresignedUrl: (token: string, fileType: string, contentType: string) =>
      fetchAPI('/upload/presigned-url', { method: 'POST', body: JSON.stringify({ fileType, contentType }), token }),
  },
  search: {
    reports: (query: string, country?: string, page = 1) => fetchAPI(`/search/reports?query=${encodeURIComponent(query)}&country=${country || 'NG'}&page=${page}`),
    trending: (country: string) => fetchAPI(`/search/trending?country=${country}`),
    suggestions: (query: string, country?: string) => fetchAPI(`/search/suggestions?query=${encodeURIComponent(query)}&country=${country || 'NG'}`),
  },
  elections: {
    feed: (country: string, election?: string, page = 1) => fetchAPI(`/elections/feed?country=${country}&election=${encodeURIComponent(election || '')}&page=${page}`),
    incidents: (country: string, page = 1) => fetchAPI(`/elections/incidents?country=${country}&page=${page}`),
    results: (country: string, election: string, state?: string) => fetchAPI(`/elections/results?country=${country}&election=${encodeURIComponent(election)}${state ? `&state=${state}` : ''}`),
    hotspots: (country: string, election: string) => fetchAPI(`/elections/hotspots?country=${country}&election=${encodeURIComponent(election)}`),
    submit: (token: string, body: any) => fetchAPI('/elections/report', { method: 'POST', body: JSON.stringify(body), token }),
    live: (country: string, election?: string) => fetchAPI(`/elections/live?country=${country}${election ? `&election=${encodeURIComponent(election)}` : ''}`),
  },
};
