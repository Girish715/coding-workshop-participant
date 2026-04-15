import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert, Stack,
  InputAdornment, IconButton, useTheme,
} from '@mui/material';
import { Visibility, VisibilityOff, TrendingUp, People, BarChart } from '@mui/icons-material';
import { login as apiLogin } from '../services/api.js';
import { useAuth } from '../AuthContext.jsx';

export default function LoginPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apiLogin({ email, password });
      login(data.token, data.user, data.employee);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <BarChart sx={{ fontSize: 20 }} />, title: 'Performance Analytics', desc: 'Track ratings, reviews and growth trends' },
    { icon: <People sx={{ fontSize: 20 }} />, title: 'Team Insights', desc: 'See how teams perform across departments' },
    { icon: <TrendingUp sx={{ fontSize: 20 }} />, title: 'Development Plans', desc: 'Monitor skill gaps, training and promotions' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left branding panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center',
        width: 480,
        flexShrink: 0,
        bgcolor: isDark ? '#0b0b0b' : '#fff4e8',
        color: isDark ? '#fff' : '#2b1b0f',
        px: 6,
        py: 8,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle background pattern */}
        <Box sx={{
          position: 'absolute', top: -100, right: -100, width: 300, height: 300,
          borderRadius: '50%', bgcolor: isDark ? 'rgba(255,122,26,0.15)' : 'rgba(255,122,26,0.22)',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -60, left: -60, width: 200, height: 200,
          borderRadius: '50%', bgcolor: isDark ? 'rgba(255,122,26,0.1)' : 'rgba(255,122,26,0.16)',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 6 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2.5, bgcolor: '#ff7a1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1c1207', fontWeight: 800, fontSize: 18,
            }}>A</Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>ACME Inc.</Typography>
          </Box>

          <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', mb: 2 }}>
            People analytics<br />for better decisions.
          </Typography>
          <Typography sx={{ fontSize: '0.9375rem', color: isDark ? '#f2dfcb' : '#7a4f2a', lineHeight: 1.7, mb: 5 }}>
            Track performance, identify growth opportunities, and make data-driven decisions about your team.
          </Typography>

          <Stack spacing={2.5}>
            {features.map((f) => (
              <Box key={f.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(255,122,26,0.14)' : 'rgba(255,122,26,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDark ? '#ff9a3d' : '#c86e1e',
                  flexShrink: 0,
                }}>{f.icon}</Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 0.25 }}>{f.title}</Typography>
                  <Typography sx={{ fontSize: '0.8125rem', color: isDark ? '#e4d1bd' : '#8a5a33', lineHeight: 1.5 }}>{f.desc}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Right form panel */}
      <Box sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'background.default', px: { xs: 3, sm: 6 }, py: 4,
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2, bgcolor: '#ff7a1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1c1207', fontWeight: 800, fontSize: 16,
            }}>A</Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'text.primary' }}>ACME Inc.</Typography>
          </Box>

          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'text.primary', letterSpacing: '-0.03em', mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 4 }}>
            Sign in to your account to continue.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>Email</Typography>
                <TextField
                  type="email" fullWidth required size="small" placeholder="you@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: isDark ? '#181818' : '#fff8f0' } }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>Password</Typography>
                <TextField
                  type={showPw ? 'text' : 'password'} fullWidth required size="small" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: isDark ? '#181818' : '#fff8f0' } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small" tabIndex={-1}>
                          {showPw ? <VisibilityOff sx={{ fontSize: 18, color: 'text.secondary' }} /> : <Visibility sx={{ fontSize: 18, color: 'text.secondary' }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Button
                type="submit" variant="contained" color="secondary" fullWidth disabled={loading}
                sx={{ py: 1.25, fontSize: '0.875rem', fontWeight: 700, mt: 1 }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </Stack>
          </form>

          <Box sx={{ mt: 4, pt: 3, borderTop: (themeObj) => `1px solid ${themeObj.palette.divider}` }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.5 }}>
              Quick access — demo accounts
            </Typography>
            <Stack spacing={0.75}>
              {[
                { role: 'Admin', email: 'admin@acme.com', pw: 'admin123', color: '#ff7a1a' },
                { role: 'Manager', email: 'mgr1@acme.com', pw: 'mgr123', color: '#ff9a3d' },
                { role: 'Employee', email: 'emp1@acme.com', pw: 'emp123', color: '#ffb84d' },
              ].map((c) => (
                <Box key={c.role}
                  onClick={() => { setEmail(c.email); setPassword(c.pw); }}
                  sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    px: 2, py: 1.25, borderRadius: 2.5, cursor: 'pointer',
                    bgcolor: isDark ? '#181818' : '#fff8f0',
                    border: isDark ? '1px solid #2a221a' : '1px solid #efcfb0',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: isDark ? '#1f1f1f' : '#ffeeda',
                      borderColor: isDark ? '#4a301b' : '#d99863',
                    },
                  }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color }} />
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>{c.role}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontFamily: 'monospace' }}>{c.email}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
