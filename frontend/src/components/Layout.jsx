import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Box, IconButton, Avatar, Menu, MenuItem, Divider, Badge,
  Popover, CircularProgress, Button,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, People, RateReview, TrendingUp,
  School, Psychology, Logout, Notifications, Settings, HelpOutline, DarkMode, LightMode,
  ChevronLeft, ChevronRight, DoneAll, Circle,
} from '@mui/icons-material';
import { useAuth } from '../AuthContext.jsx';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api.js';
import ChatbotWidget from './ChatbotWidget.jsx';

const DRAWER_WIDTH = 230;
const COLLAPSED_DRAWER_WIDTH = 74;
const TOPBAR_HEIGHT = 52;
const SIDEBAR_COLLAPSE_STORAGE_KEY = 'acme-sidebar-collapsed';
const NAV = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/' },
  { label: 'Employees', icon: <People />, path: '/employees' },
  { label: 'Reviews', icon: <RateReview />, path: '/reviews' },
  { label: 'Dev Plans', icon: <TrendingUp />, path: '/development-plans' },
  { label: 'Competencies', icon: <Psychology />, path: '/competencies' },
  { label: 'Training', icon: <School />, path: '/training' },
];

export default function Layout({ colorMode, onToggleColorMode }) {
  const { user, employee, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 900 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === 'true');

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await getNotifications({ limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotifOpen = (e) => {
    setNotifAnchorEl(e.currentTarget);
    fetchNotifications();
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    setNotifLoading(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
    setNotifLoading(false);
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };
  const isEmployee = user?.role === 'employee';
  const employeeNav = employee?.id
    ? [
      { label: 'Dashboard', icon: <Dashboard />, path: '/' },
      { label: 'My Profile', icon: <People />, path: '/my-progress/profile' },
      { label: 'My Reviews', icon: <RateReview />, path: '/my-progress/reviews' },
      { label: 'My Dev Plans', icon: <TrendingUp />, path: '/my-progress/development-plans' },
      { label: 'My Competencies', icon: <Psychology />, path: '/my-progress/competencies' },
      { label: 'My Training', icon: <School />, path: '/my-progress/training' },
    ]
    : [{ label: 'Dashboard', icon: <Dashboard />, path: '/' }];
  const navItems = isEmployee
    ? employeeNav
    : NAV;
  const drawerWidth = sidebarCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prevCollapsed) => {
      const nextCollapsed = !prevCollapsed;
      localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, String(nextCollapsed));
      return nextCollapsed;
    });
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.paper' }}>
      {/* User info at top */}
      <Box sx={{ px: sidebarCollapsed ? 1 : 2.5, pt: 2.5, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
        <Avatar sx={{ width: 38, height: 38, fontSize: 13, fontWeight: 700, bgcolor: 'primary.main', color: '#1c1207' }}>
          {employee ? `${employee.first_name[0]}${employee.last_name[0]}` : 'U'}
        </Avatar>
        {!sidebarCollapsed && (
          <Box sx={{ overflow: 'hidden', flex: 1 }}>
            <Typography sx={{
              fontSize: '0.875rem', fontWeight: 700, color: 'primary.main',
              whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
            }}>
              {employee?.designation || employee?.full_name || 'User'}
            </Typography>
            <Typography sx={{
              fontSize: '0.5625rem', fontWeight: 700, color: 'text.secondary',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Enterprise HR Portal
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* Navigation */}
      <List sx={{ px: 0, py: 1, flexGrow: 1 }}>
        {navItems.map((item) => {
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
              sx={{
                py: 1, px: sidebarCollapsed ? 1.25 : 2.5,
                borderLeft: isActive ? '3px solid' : '3px solid transparent',
                borderLeftColor: isActive ? 'primary.main' : 'transparent',
                bgcolor: isActive ? 'rgba(255, 122, 26, 0.16)' : 'transparent',
                color: isActive ? 'primary.light' : 'text.secondary',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                '&:hover': {
                  bgcolor: isActive ? 'rgba(255, 122, 26, 0.24)' : 'rgba(255, 122, 26, 0.14)',
                  color: isActive ? 'primary.light' : 'text.primary',
                },
                '& .MuiListItemIcon-root': { color: isActive ? 'primary.main' : 'text.secondary' },
                transition: 'all 0.15s ease',
              }}
            >
              <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 'auto' : 34, mr: sidebarCollapsed ? 0 : 0, '& .MuiSvgIcon-root': { fontSize: 20 } }}>{item.icon}</ListItemIcon>
              {!sidebarCollapsed && (
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: isActive ? 600 : 500 }} />
              )}
            </ListItemButton>
          );
        })}
      </List>

      {/* Bottom actions */}
      <Box sx={{ px: sidebarCollapsed ? 0.5 : 1, pb: 2 }}>
        <ListItemButton sx={{ py: 0.75, px: sidebarCollapsed ? 1 : 2, borderRadius: 2, color: 'text.secondary', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', '&:hover': { bgcolor: 'rgba(255, 122, 26, 0.14)', color: 'text.primary' } }}>
          <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 'auto' : 34, color: 'inherit' }}><HelpOutline sx={{ fontSize: 20 }} /></ListItemIcon>
          {!sidebarCollapsed && <ListItemText primary="Support" primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }} />}
        </ListItemButton>
        <ListItemButton
          onClick={() => { logout(); navigate('/login'); }}
          sx={{ py: 0.75, px: sidebarCollapsed ? 1 : 2, borderRadius: 2, color: '#ff7d7d', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.16)' } }}
        >
          <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 'auto' : 34, color: 'inherit' }}><Logout sx={{ fontSize: 20 }} /></ListItemIcon>
          {!sidebarCollapsed && <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 600 }} />}
        </ListItemButton>
      </Box>
    </Box>
  );

  const permanentDrawerSx = {
    '& .MuiDrawer-paper': {
      width: drawerWidth, bgcolor: 'background.paper', borderRight: (theme) => `1px solid ${theme.palette.divider}`,
      top: TOPBAR_HEIGHT, height: `calc(100% - ${TOPBAR_HEIGHT}px)`,
      transition: 'width 0.2s ease',
      overflowX: 'hidden',
    },
  };
  const mobileDrawerSx = {
    '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: 'background.paper', borderRight: (theme) => `1px solid ${theme.palette.divider}` },
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Dark top navbar — full width */}
      <AppBar position="fixed" elevation={0} sx={{
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0b0b0b' : '#fff4e8'),
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        height: TOPBAR_HEIGHT,
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}>
        <Toolbar sx={{ minHeight: TOPBAR_HEIGHT + 'px !important', px: { xs: 2, md: 3 } }}>
          {isMobile && (
            <IconButton edge="start" color="inherit" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          {!isMobile && (
            <IconButton edge="start" color="inherit" onClick={toggleSidebarCollapsed} sx={{ mr: 1 }}>
              {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          )}
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mr: 4, letterSpacing: '-0.01em', cursor: 'pointer' }} onClick={() => navigate('/')}>
            ACME Inc.
          </Typography>
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 3.5 }}>
            <Typography
              onClick={() => navigate('/')}
              sx={{ fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', color: 'text.secondary', transition: 'color 0.15s', '&:hover': { color: 'primary.main' } }}
            >Overview</Typography>
            {!isEmployee && (
              <Typography
                onClick={() => navigate('/employees')}
                sx={{ fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', color: 'text.secondary', transition: 'color 0.15s', '&:hover': { color: 'primary.main' } }}
              >Directory</Typography>
            )}
            {isEmployee && employee?.id && (
              <Typography
                onClick={() => navigate('/my-progress/profile')}
                sx={{ fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', color: 'text.secondary', transition: 'color 0.15s', '&:hover': { color: 'primary.main' } }}
              >My Progress</Typography>
            )}
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={onToggleColorMode}
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(255, 122, 26, 0.12)' } }}
            >
              {colorMode === 'dark' ? <LightMode sx={{ fontSize: 20 }} /> : <DarkMode sx={{ fontSize: 20 }} />}
            </IconButton>
            <IconButton size="small" onClick={handleNotifOpen} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              <Badge badgeContent={unreadCount} color="error" max={99}
                sx={{ '& .MuiBadge-badge': { fontSize: '0.625rem', minWidth: 16, height: 16, padding: '0 4px' } }}>
                <Notifications sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
            <IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
              <Settings sx={{ fontSize: 20 }} />
            </IconButton>
            <Avatar
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: 'primary.main', color: '#1c1207', cursor: 'pointer', ml: 0.5 }}
            >
              {employee ? `${employee.first_name[0]}${employee.last_name[0]}` : 'U'}
            </Avatar>
          </Box>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
            PaperProps={{
              sx: {
                mt: 1.5,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                boxShadow: (theme) => (theme.palette.mode === 'dark' ? '0 10px 15px -3px rgb(0 0 0 / 0.4)' : '0 10px 15px -3px rgb(120 76 29 / 0.25)'),
                minWidth: 220,
                borderRadius: 3,
                bgcolor: 'background.paper',
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{employee?.full_name}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{user?.email}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate('/login'); }}
              sx={{ mx: 1, borderRadius: 2, mt: 0.5, mb: 0.5, color: '#ff7d7d', fontSize: '0.8125rem', fontWeight: 600 }}>
              <Logout fontSize="small" sx={{ mr: 1.5 }} /> Sign out
            </MenuItem>
          </Menu>

          {/* Notification popover */}
          <Popover
            open={Boolean(notifAnchorEl)}
            anchorEl={notifAnchorEl}
            onClose={() => setNotifAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                width: 380, maxHeight: 480, mt: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                bgcolor: 'background.paper',
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Notifications</Typography>
              {unreadCount > 0 && (
                <Button size="small" startIcon={<DoneAll sx={{ fontSize: 14 }} />} onClick={handleMarkAllRead} disabled={notifLoading}
                  sx={{ fontSize: '0.6875rem', textTransform: 'none' }}>
                  Mark all read
                </Button>
              )}
            </Box>
            <Box sx={{ overflowY: 'auto', maxHeight: 400 }}>
              {notifications.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>No notifications yet</Typography>
                </Box>
              ) : (
                notifications.map((n) => (
                  <Box
                    key={n.id}
                    onClick={() => { if (!n.is_read) handleMarkRead(n.id); }}
                    sx={{
                      px: 2, py: 1.25, cursor: n.is_read ? 'default' : 'pointer',
                      bgcolor: n.is_read ? 'transparent' : (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,122,26,0.06)' : 'rgba(255,122,26,0.04)'),
                      borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                      '&:hover': { bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,122,26,0.1)' : 'rgba(255,122,26,0.07)') },
                      transition: 'background 0.15s',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      {!n.is_read && <Circle sx={{ fontSize: 8, color: 'primary.main', mt: 0.7, flexShrink: 0 }} />}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.8125rem', lineHeight: 1.4 }}>{n.title}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.4, mt: 0.25,
                          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {n.message}
                        </Typography>
                        <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary', mt: 0.5 }}>{formatTimeAgo(n.created_at)}</Typography>
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Popover>
        </Toolbar>
      </AppBar>

      {/* Sidebar + Content below top bar */}
      <Box sx={{ display: 'flex', pt: `${TOPBAR_HEIGHT}px` }}>
        {isMobile ? (
          <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={mobileDrawerSx}>{drawerContent}</Drawer>
        ) : (
          <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, ...permanentDrawerSx }}>{drawerContent}</Drawer>
        )}

        <Box sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3.5 }, maxWidth: 1320, mx: 'auto', width: '100%' }}>
          <Outlet />
        </Box>
      </Box>
      <ChatbotWidget />
    </Box>
  );
}
