import axios from 'axios';

const CLIENT_CACHE_TTL_MS = 30000;
const requestCache = new Map();
const inflightRequests = new Map();

function parseJsonEnv(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function trimSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveApiBaseUrl() {
  const apiBase = trimSlash(import.meta.env.VITE_API_URL || '');
  const apiEndpoints = parseJsonEnv(import.meta.env.VITE_API_ENDPOINTS, {});
  const apiServiceEndpoint = apiEndpoints['api-service'];

  // Local development uses proxy/base URL directly; AWS uses CloudFront + /api/api-service.
  if (apiServiceEndpoint && apiBase && apiServiceEndpoint.startsWith('/api/')) {
    return `${apiBase}${apiServiceEndpoint}`;
  }

  return apiBase || 'http://localhost:3001/api';
}

const API = axios.create({
  baseURL: resolveApiBaseUrl(),
});

function stableStringify(value) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${key}:${stableStringify(value[key])}`).join(',')}}`;
}

function buildCacheKey(url, params) {
  return `${url}::${stableStringify(params || {})}`;
}

function getCachedResponse(cacheKey) {
  const cached = requestCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    requestCache.delete(cacheKey);
    return null;
  }
  return cached.response;
}

function setCachedResponse(cacheKey, response, ttlMs = CLIENT_CACHE_TTL_MS) {
  requestCache.set(cacheKey, {
    response,
    expiresAt: Date.now() + ttlMs,
  });
}

function invalidateClientCache(prefixes = []) {
  if (!prefixes.length) {
    requestCache.clear();
    inflightRequests.clear();
    return;
  }

  const normalizedPrefixes = prefixes.filter(Boolean);
  if (!normalizedPrefixes.length) return;

  for (const key of requestCache.keys()) {
    if (normalizedPrefixes.some((prefix) => key.startsWith(prefix))) {
      requestCache.delete(key);
    }
  }
  for (const key of inflightRequests.keys()) {
    if (normalizedPrefixes.some((prefix) => key.startsWith(prefix))) {
      inflightRequests.delete(key);
    }
  }
}

async function cachedGet(url, options = {}, ttlMs = CLIENT_CACHE_TTL_MS) {
  const cacheKey = buildCacheKey(url, options?.params);
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) return inflight;

  const promise = API.get(url, options)
    .then((response) => {
      setCachedResponse(cacheKey, response, ttlMs);
      return response;
    })
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, promise);
  return promise;
}

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const register = async (data) => {
  const response = await API.post('/auth/register', data);
  invalidateClientCache(['/employees', '/dashboard', '/notifications']);
  return response;
};
export const getMe = () => cachedGet('/auth/me', {}, 15000);

// Employees
export const getEmployees = (params) => cachedGet('/employees', { params });
export const getEmployee = (id) => cachedGet(`/employees/${id}`);
export const updateEmployee = async (id, data) => {
  const response = await API.put(`/employees/${id}`, data);
  invalidateClientCache(['/employees', '/dashboard', '/notifications']);
  return response;
};
export const getDepartments = () => cachedGet('/employees/departments');

// Reviews
export const getReviews = (params) => cachedGet('/reviews', { params });
export const getReview = (id) => cachedGet(`/reviews/${id}`);
export const createReview = async (data) => {
  const response = await API.post('/reviews', data);
  invalidateClientCache(['/reviews', '/dashboard', '/notifications']);
  return response;
};
export const updateReview = async (id, data) => {
  const response = await API.put(`/reviews/${id}`, data);
  invalidateClientCache(['/reviews', '/dashboard', '/notifications']);
  return response;
};
export const deleteReview = async (id) => {
  const response = await API.delete(`/reviews/${id}`);
  invalidateClientCache(['/reviews', '/dashboard', '/notifications']);
  return response;
};

// Development Plans
export const getDevPlans = (params) => cachedGet('/development-plans', { params });
export const getDevPlan = (id) => cachedGet(`/development-plans/${id}`);
export const createDevPlan = async (data) => {
  const response = await API.post('/development-plans', data);
  invalidateClientCache(['/development-plans', '/dashboard', '/notifications']);
  return response;
};
export const updateDevPlan = async (id, data) => {
  const response = await API.put(`/development-plans/${id}`, data);
  invalidateClientCache(['/development-plans', '/dashboard', '/notifications']);
  return response;
};
export const deleteDevPlan = async (id) => {
  const response = await API.delete(`/development-plans/${id}`);
  invalidateClientCache(['/development-plans', '/dashboard', '/notifications']);
  return response;
};

// Competencies
export const getCompetencyCatalog = () => cachedGet('/competencies/catalog');
export const createCompetency = async (data) => {
  const response = await API.post('/competencies/catalog', data);
  invalidateClientCache(['/competencies', '/dashboard']);
  return response;
};
export const getEmployeeCompetencies = (params) => cachedGet('/competencies', { params });
export const createEmployeeCompetency = async (data) => {
  const response = await API.post('/competencies', data);
  invalidateClientCache(['/competencies', '/dashboard']);
  return response;
};
export const updateEmployeeCompetency = async (id, data) => {
  const response = await API.put(`/competencies/${id}`, data);
  invalidateClientCache(['/competencies', '/dashboard']);
  return response;
};
export const deleteEmployeeCompetency = async (id) => {
  const response = await API.delete(`/competencies/${id}`);
  invalidateClientCache(['/competencies', '/dashboard']);
  return response;
};

// Training
export const getTraining = (params) => cachedGet('/training', { params });
export const getTrainingRecord = (id) => cachedGet(`/training/${id}`);
export const createTraining = async (data) => {
  const response = await API.post('/training', data);
  invalidateClientCache(['/training', '/dashboard', '/notifications']);
  return response;
};
export const updateTraining = async (id, data) => {
  const response = await API.put(`/training/${id}`, data);
  invalidateClientCache(['/training', '/dashboard', '/notifications']);
  return response;
};
export const deleteTraining = async (id) => {
  const response = await API.delete(`/training/${id}`);
  invalidateClientCache(['/training', '/dashboard', '/notifications']);
  return response;
};

// Dashboard
export const getDashboardStats = () => cachedGet('/dashboard/stats', {}, 20000);
export const getRatingDistribution = () => cachedGet('/dashboard/rating-distribution', {}, 20000);
export const getDeptPerformance = () => cachedGet('/dashboard/department-performance', {}, 20000);
export const getSkillGaps = () => cachedGet('/dashboard/skill-gaps', {}, 20000);
export const getPromotionReadyEmployees = () => cachedGet('/dashboard/employees/promotion-ready', {}, 20000);
export const getHighAttritionRiskEmployees = () => cachedGet('/dashboard/employees/high-attrition-risk', {}, 20000);
export const getActiveEmployees = () => cachedGet('/dashboard/employees/active', {}, 20000);
export const getTrainingCompletedEmployees = () => cachedGet('/dashboard/employees/training-completed', {}, 20000);
export const getActiveDevPlanEmployees = () => cachedGet('/dashboard/employees/active-dev-plans', {}, 20000);
export const getTeamPerformance = () => cachedGet('/dashboard/team-performance', {}, 20000);

// Notifications
export const getNotifications = (params) => cachedGet('/notifications', { params }, 12000);
export const markNotificationRead = async (id) => {
  const response = await API.put(`/notifications/${id}/read`);
  invalidateClientCache(['/notifications']);
  return response;
};
export const markAllNotificationsRead = async () => {
  const response = await API.put('/notifications/read-all');
  invalidateClientCache(['/notifications']);
  return response;
};

// Bulk Upload
export const previewBulkUpload = (formData) => API.post('/bulk-upload/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const confirmBulkUpload = async (data) => {
  const response = await API.post('/bulk-upload/confirm', data);
  invalidateClientCache(['/employees', '/dashboard', '/notifications']);
  return response;
};

export const clearApiCache = () => invalidateClientCache();

// Chatbot
export const askChatbot = (message) => API.post('/chatbot', { message });

export default API;
