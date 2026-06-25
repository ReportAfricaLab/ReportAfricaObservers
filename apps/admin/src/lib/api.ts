const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.reportafrica.africa/api/v1';

async function adminFetch(endpoint: string, options: any = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const adminAPI = {
  login: (email: string, password: string) => adminFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  overview: () => adminFetch('/admin/overview'),

  // Users
  users: (page = 1, search?: string, role?: string, country?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (country) params.set('country', country);
    return adminFetch(`/admin/users?${params}`);
  },
  updateUser: (id: string, data: any) => adminFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  banUser: (id: string) => adminFetch(`/admin/users/${id}/ban`, { method: 'PATCH' }),

  // Reports
  reports: (page = 1, country?: string, flagged?: boolean) => {
    const params = new URLSearchParams({ page: String(page) });
    if (country) params.set('country', country);
    if (flagged) params.set('flagged', 'true');
    return adminFetch(`/admin/reports?${params}`);
  },
  deleteReport: (id: string) => adminFetch(`/admin/reports/${id}`, { method: 'DELETE' }),
  verifyReport: (id: string, level: string) => adminFetch(`/admin/reports/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ level }) }),

  // Campaigns
  campaigns: (page = 1, status?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    return adminFetch(`/admin/campaigns?${params}`);
  },
  approveCampaign: (id: string) => adminFetch(`/admin/campaigns/${id}/approve`, { method: 'PATCH' }),
  rejectCampaign: (id: string) => adminFetch(`/admin/campaigns/${id}/reject`, { method: 'PATCH' }),

  // Businesses
  businesses: (page = 1, search?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    return adminFetch(`/admin/businesses?${params}`);
  },
  updateBusiness: (id: string, data: any) => adminFetch(`/admin/businesses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Challenges
  challenges: () => adminFetch('/admin/challenges'),
  closeChallenge: (id: string) => adminFetch(`/admin/challenges/${id}/close`, { method: 'PATCH' }),

  // Livestreams
  livestreams: () => adminFetch('/admin/livestreams'),
  endLivestream: (id: string) => adminFetch(`/admin/livestreams/${id}/end`, { method: 'PATCH' }),

  // Elections
  elections: () => adminFetch('/admin/elections'),
  verifyObserver: (id: string) => adminFetch(`/admin/elections/${id}/verify-observer`, { method: 'PATCH' }),

  // Notifications
  sendNotification: (data: { target: string; country?: string; username?: string; title: string; body: string }) =>
    adminFetch('/admin/notifications/send', { method: 'POST', body: JSON.stringify(data) }),

  // Tips
  tips: () => adminFetch('/admin/tips'),

  // Moderation
  moderationQueue: (page = 1) => adminFetch(`/admin/moderation-queue?page=${page}`),

  // Revenue
  revenue: () => adminFetch('/admin/revenue'),

  // Team
  getTeam: () => adminFetch('/admin/team'),
  inviteAdmin: (email: string, role: string) => adminFetch('/admin/team/invite', { method: 'POST', body: JSON.stringify({ email, role }) }),
  changeRole: (id: string, role: string) => adminFetch(`/admin/team/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  revokeAccess: (id: string) => adminFetch(`/admin/team/${id}`, { method: 'DELETE' }),
  getMe: () => adminFetch('/admin/me'),

  // Courses (existing)
  getCourses: () => adminFetch('/admin/courses'),
  createCourse: (data: any) => adminFetch('/admin/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id: string, data: any) => adminFetch(`/admin/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCourse: (id: string) => adminFetch(`/admin/courses/${id}`, { method: 'DELETE' }),
  addLesson: (courseId: string, data: any) => adminFetch(`/admin/courses/${courseId}/lessons`, { method: 'POST', body: JSON.stringify(data) }),
  updateLesson: (id: string, data: any) => adminFetch(`/admin/courses/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLesson: (id: string) => adminFetch(`/admin/courses/lessons/${id}`, { method: 'DELETE' }),
  getEnrollments: () => adminFetch('/admin/courses/enrollments'),
  createModule: (data: any) => adminFetch('/admin/courses/modules', { method: 'POST', body: JSON.stringify(data) }),
  updateModule: (id: string, data: any) => adminFetch(`/admin/courses/modules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteModule: (id: string) => adminFetch(`/admin/courses/modules/${id}`, { method: 'DELETE' }),
  createQuiz: (data: any) => adminFetch('/admin/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuiz: (id: string, data: any) => adminFetch(`/admin/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuiz: (id: string) => adminFetch(`/admin/quizzes/${id}`, { method: 'DELETE' }),
  getQuizResults: (id: string) => adminFetch(`/admin/quizzes/${id}/results`),
  getAcademyAnalytics: () => adminFetch('/admin/courses/analytics'),
  getCourseAnalytics: (id: string) => adminFetch(`/admin/courses/analytics/course/${id}`),
};
