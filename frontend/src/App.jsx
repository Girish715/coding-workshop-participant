import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';

const LoginPage = React.lazy(() => import('./pages/LoginPage.jsx'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage.jsx'));
const EmployeesPage = React.lazy(() => import('./pages/EmployeesPage.jsx'));
const EmployeeDetailPage = React.lazy(() => import('./pages/EmployeeDetailPage.jsx'));
const ReviewsPage = React.lazy(() => import('./pages/ReviewsPage.jsx'));
const DevPlansPage = React.lazy(() => import('./pages/DevPlansPage.jsx'));
const CompetenciesPage = React.lazy(() => import('./pages/CompetenciesPage.jsx'));
const TrainingPage = React.lazy(() => import('./pages/TrainingPage.jsx'));

const COLOR_MODE_STORAGE_KEY = 'acme-color-mode';

function getInitialColorMode() {
  const savedMode = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  return savedMode === 'light' ? 'light' : 'dark';
}

function buildTheme(mode) {
  const isDark = mode === 'dark';
  return createTheme({
  palette: {
    mode,
    primary: { main: '#ff7a1a', light: '#ff9a3d', dark: '#cc5a00' },
    secondary: { main: '#ffb84d', light: '#ffd28a', dark: '#d08d2a' },
    success: { main: '#2dd4bf' },
    warning: { main: '#fb923c' },
    error: { main: '#ef4444' },
    background: isDark ? { default: '#050505', paper: '#121212' } : { default: '#fff7ed', paper: '#ffffff' },
    text: isDark ? { primary: '#fff7ef', secondary: '#e2cdb6' } : { primary: '#1a120a', secondary: '#5d4a38' },
    divider: isDark ? '#3a2d21' : '#ecd7c4',
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h4: { fontWeight: 800, fontSize: '1.625rem', lineHeight: 1.2, letterSpacing: '-0.025em' },
    h5: { fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.3, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.4, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 500, fontSize: '0.875rem', color: isDark ? '#e2cdb6' : '#5d4a38' },
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
          boxShadow: '0 0 0 1px rgb(255 122 26 / 0.25), 0 8px 18px -8px rgb(255 122 26 / 0.45)',
          '&:hover': { boxShadow: '0 0 0 1px rgb(255 122 26 / 0.5), 0 10px 24px -8px rgb(255 122 26 / 0.55)' },
        },
        containedSecondary: { color: '#1c1207' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: isDark ? '0 12px 24px -16px rgb(0 0 0 / 0.9)' : '0 8px 18px -14px rgb(120 76 29 / 0.28)',
          border: isDark ? '1px solid #3a2d21' : '1px solid #ecd7c4',
          backgroundImage: isDark ? 'linear-gradient(180deg, #171717 0%, #121212 100%)' : 'linear-gradient(180deg, #fffdfb 0%, #fff7ed 100%)',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: isDark ? '0 16px 30px -16px rgb(0 0 0 / 1)' : '0 10px 22px -14px rgb(120 76 29 / 0.35)',
            borderColor: isDark ? '#5a3a23' : '#dfb894',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.6875rem',
          borderRadius: 8,
          height: 24,
          backgroundColor: isDark ? '#2b2016' : '#fff0e1',
          color: isDark ? '#ffd7b0' : '#8a5525',
          border: isDark ? '1px solid #4a321e' : '1px solid #e6c2a0',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isDark ? '#ffd2a8' : '#8a5a2d',
            backgroundColor: isDark ? '#1b1b1b' : '#fff2e3',
            borderBottom: isDark ? '2px solid #3a2d21' : '2px solid #ecd7c4',
            padding: '12px 16px',
          },
          '& .MuiTableCell-head .MuiInputBase-input, & .MuiTableCell-head .MuiSelect-select': {
            textTransform: 'none',
            letterSpacing: 'normal',
            color: isDark ? '#e2cdb6' : '#5d4a38',
          },
          '& .MuiTableCell-head .MuiInputBase-input::placeholder': {
            textTransform: 'none',
            letterSpacing: 'normal',
            color: isDark ? '#c4ae97' : '#8a6f53',
            opacity: 1,
          },
          '& .MuiTableCell-head .MuiInputLabel-root': {
            textTransform: 'none',
            letterSpacing: 'normal',
            color: isDark ? '#c4ae97' : '#8a6f53',
          },
          '& .MuiTableCell-head .MuiInputLabel-root.Mui-focused': {
            color: '#ff9a3d',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: isDark ? '#1a1a1a' : '#fff3e8' } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: isDark ? '1px solid #3a2d21' : '1px solid #ecd7c4',
          padding: '14px 16px',
          fontSize: '0.8125rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          padding: 8,
          backgroundColor: isDark ? '#141414' : '#fffaf5',
          border: isDark ? '1px solid #3a2d21' : '1px solid #ecd7c4',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: isDark ? '#181818' : '#fff8f0',
            '& fieldset': { borderColor: isDark ? '#4b3522' : '#d8b697' },
            '&:hover fieldset': { borderColor: '#ff7a1a' },
            '&.Mui-focused fieldset': { borderColor: '#ff9a3d' },
          },
          '& .MuiInputBase-input::placeholder': { color: isDark ? '#c4ae97' : '#8a6f53', opacity: 1 },
        },
      },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', minHeight: 44 } },
    },
    MuiTabs: {
      styleOverrides: { indicator: { height: 3, borderRadius: '3px 3px 0 0', backgroundColor: '#ff7a1a' } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: isDark ? '#050505' : '#fff7ed',
          backgroundImage: isDark
            ? 'radial-gradient(circle at 20% 0%, rgba(255, 122, 26, 0.13), transparent 40%), radial-gradient(circle at 100% 100%, rgba(255, 122, 26, 0.1), transparent 35%)'
            : 'radial-gradient(circle at 20% 0%, rgba(255, 122, 26, 0.2), transparent 45%), radial-gradient(circle at 100% 100%, rgba(255, 184, 77, 0.18), transparent 35%)',
        },
        '::selection': {
          backgroundColor: 'rgba(255, 122, 26, 0.35)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: 'inherit',
        },
      },
    },
  },
});
}

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

function ManagerRoute({ children }) {
  const { user, employee, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'employee') {
    const fallbackId = employee?.id;
    return fallbackId ? <Navigate to={`/employees/${fallbackId}`} replace /> : <Navigate to="/" replace />;
  }
  return children;
}

function EmployeeDetailRoute({ children }) {
  const { user, employee, loading } = useAuth();
  const { id } = useParams();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'employee' && employee?.id && Number(id) !== Number(employee.id)) {
    return <Navigate to={`/employees/${employee.id}`} replace />;
  }
  return children;
}

function EmployeeOnlyRoute({ children }) {
  const { user, employee, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'employee') return <Navigate to="/" replace />;
  return employee?.id ? children : <Navigate to="/" replace />;
}

function AppRoutes({ colorMode, onToggleColorMode }) {
  const { user, employee, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  const withSuspense = (element) => (
    <React.Suspense fallback={<FullPageLoader />}>
      {element}
    </React.Suspense>
  );

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : withSuspense(<LoginPage />)} />
      <Route path="/" element={<PrivateRoute><Layout colorMode={colorMode} onToggleColorMode={onToggleColorMode} /></PrivateRoute>}>
        <Route index element={withSuspense(<DashboardPage />)} />
        <Route path="employees" element={<ManagerRoute>{withSuspense(<EmployeesPage />)}</ManagerRoute>} />
        <Route path="employees/:id" element={<EmployeeDetailRoute>{withSuspense(<EmployeeDetailPage />)}</EmployeeDetailRoute>} />
        <Route path="my-progress/profile" element={<EmployeeOnlyRoute>{withSuspense(<EmployeeDetailPage employeeIdOverride={employee?.id} />)}</EmployeeOnlyRoute>} />
        <Route path="my-progress/reviews" element={<EmployeeOnlyRoute>{withSuspense(<EmployeeDetailPage employeeIdOverride={employee?.id} initialTab={0} />)}</EmployeeOnlyRoute>} />
        <Route path="my-progress/development-plans" element={<EmployeeOnlyRoute>{withSuspense(<EmployeeDetailPage employeeIdOverride={employee?.id} initialTab={1} />)}</EmployeeOnlyRoute>} />
        <Route path="my-progress/competencies" element={<EmployeeOnlyRoute>{withSuspense(<EmployeeDetailPage employeeIdOverride={employee?.id} initialTab={2} />)}</EmployeeOnlyRoute>} />
        <Route path="my-progress/training" element={<EmployeeOnlyRoute>{withSuspense(<EmployeeDetailPage employeeIdOverride={employee?.id} initialTab={3} />)}</EmployeeOnlyRoute>} />
        <Route path="reviews" element={<ManagerRoute>{withSuspense(<ReviewsPage />)}</ManagerRoute>} />
        <Route path="development-plans" element={<ManagerRoute>{withSuspense(<DevPlansPage />)}</ManagerRoute>} />
        <Route path="competencies" element={<ManagerRoute>{withSuspense(<CompetenciesPage />)}</ManagerRoute>} />
        <Route path="training" element={<ManagerRoute>{withSuspense(<TrainingPage />)}</ManagerRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [colorMode, setColorMode] = React.useState(getInitialColorMode);
  const theme = React.useMemo(() => buildTheme(colorMode), [colorMode]);

  React.useEffect(() => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode]);

  const toggleColorMode = React.useCallback(() => {
    setColorMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppRoutes colorMode={colorMode} onToggleColorMode={toggleColorMode} />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
