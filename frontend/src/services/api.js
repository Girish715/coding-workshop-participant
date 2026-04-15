import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

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
export const register = (data) => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');

// Employees
export const getEmployees = (params) => API.get('/employees', { params });
export const getEmployee = (id) => API.get(`/employees/${id}`);
export const updateEmployee = (id, data) => API.put(`/employees/${id}`, data);
export const getDepartments = () => API.get('/employees/departments');

// Reviews
export const getReviews = (params) => API.get('/reviews', { params });
export const getReview = (id) => API.get(`/reviews/${id}`);
export const createReview = (data) => API.post('/reviews', data);
export const updateReview = (id, data) => API.put(`/reviews/${id}`, data);
export const deleteReview = (id) => API.delete(`/reviews/${id}`);

// Development Plans
export const getDevPlans = (params) => API.get('/development-plans', { params });
export const getDevPlan = (id) => API.get(`/development-plans/${id}`);
export const createDevPlan = (data) => API.post('/development-plans', data);
export const updateDevPlan = (id, data) => API.put(`/development-plans/${id}`, data);
export const deleteDevPlan = (id) => API.delete(`/development-plans/${id}`);

// Competencies
export const getCompetencyCatalog = () => API.get('/competencies/catalog');
export const createCompetency = (data) => API.post('/competencies/catalog', data);
export const getEmployeeCompetencies = (params) => API.get('/competencies', { params });
export const createEmployeeCompetency = (data) => API.post('/competencies', data);
export const updateEmployeeCompetency = (id, data) => API.put(`/competencies/${id}`, data);
export const deleteEmployeeCompetency = (id) => API.delete(`/competencies/${id}`);

// Training
export const getTraining = (params) => API.get('/training', { params });
export const getTrainingRecord = (id) => API.get(`/training/${id}`);
export const createTraining = (data) => API.post('/training', data);
export const updateTraining = (id, data) => API.put(`/training/${id}`, data);
export const deleteTraining = (id) => API.delete(`/training/${id}`);

// Dashboard
export const getDashboardStats = () => API.get('/dashboard/stats');
export const getRatingDistribution = () => API.get('/dashboard/rating-distribution');
export const getDeptPerformance = () => API.get('/dashboard/department-performance');
export const getSkillGaps = () => API.get('/dashboard/skill-gaps');
export const getPromotionReadyEmployees = () => API.get('/dashboard/employees/promotion-ready');
export const getHighAttritionRiskEmployees = () => API.get('/dashboard/employees/high-attrition-risk');
export const getActiveEmployees = () => API.get('/dashboard/employees/active');
export const getTrainingCompletedEmployees = () => API.get('/dashboard/employees/training-completed');
export const getActiveDevPlanEmployees = () => API.get('/dashboard/employees/active-dev-plans');
export const getTeamPerformance = () => API.get('/dashboard/team-performance');

export default API;
