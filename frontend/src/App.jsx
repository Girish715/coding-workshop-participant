import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import EmployeeDetailPage from './pages/EmployeeDetailPage.jsx';
import ReviewsPage from './pages/ReviewsPage.jsx';
import DevPlansPage from './pages/DevPlansPage.jsx';
import CompetenciesPage from './pages/CompetenciesPage.jsx';
import TrainingPage from './pages/TrainingPage.jsx';

const theme = createTheme({
  palette: {
    primary: { main: '#0f172a', light: '#334155', dark: '#020617' },
    secondary: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    background: { default: '#f1f5f9', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 800, fontSize: '1.625rem', lineHeight: 1.2, letterSpacing: '-0.025em' },
    h5: { fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.3, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.4, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 500, fontSize: '0.875rem', color: '#64748b' },
    body1: { fontSize: '0.875rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.55 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.01em' },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.08)',
    '0 4px 6px -1px rgb(0 0 0 / 0.07)',
    '0 10px 15px -3px rgb(0 0 0 / 0.08)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    ...Array(19).fill('0 25px 50px -12px rgb(0 0 0 / 0.15)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, padding: '9px 20px', fontSize: '0.8125rem' },
        contained: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          '&:hover': { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
        },
        containedSecondary: { color: '#fff' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
          border: '1px solid #e2e8f0',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.06)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, fontSize: '0.6875rem', borderRadius: 8, height: 24 } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase',
            letterSpacing: '0.06em', color: '#64748b', backgroundColor: '#f8fafc',
            borderBottom: '2px solid #e2e8f0', padding: '12px 16px',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: '#f8fafc' } },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderBottom: '1px solid #f1f5f9', padding: '14px 16px', fontSize: '0.8125rem' } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16, padding: 8 } },
    },
    MuiTextField: {
      styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', minHeight: 44 } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { height: 3, borderRadius: '3px 3px 0 0' } },
    },
  },
});

function FullPageLoader() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <CircularProgress size={40} />
    </Box>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeDetailPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="development-plans" element={<DevPlansPage />} />
        <Route path="competencies" element={<CompetenciesPage />} />
        <Route path="training" element={<TrainingPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
