import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, MenuItem, Button, TableSortLabel, useTheme,
} from '@mui/material';
import {
  Close, People, Star, RateReview, TrendingUp, School,
  Warning, CheckCircle, Search,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  getDashboardStats, getRatingDistribution, getDeptPerformance,
  getPromotionReadyEmployees, getHighAttritionRiskEmployees, getActiveEmployees,
  getTrainingCompletedEmployees, getActiveDevPlanEmployees, getTeamPerformance,
} from '../services/api.js';
import { useAuth } from '../AuthContext.jsx';

const PIE_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#3b82f6'];
const DEPT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const EMPTY_STATS = {
  total_employees: 0,
  avg_rating: 0,
  total_reviews: 0,
  promotion_ready: 0,
  training_completed: 0,
  high_attrition_risk: 0,
  active_development_plans: 0,
};

export default function DashboardPage() {
  const { employee } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const tooltipStyle = {
    borderRadius: 12,
    border: isDark ? '1px solid #5a3a23' : '1px solid #e2e8f0',
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    color: isDark ? '#fff3e4' : '#1f2937',
    fontSize: '0.8125rem',
    boxShadow: isDark ? '0 8px 16px -8px rgb(0 0 0 / 0.75)' : '0 4px 6px -1px rgb(0 0 0 / 0.07)',
  };
  const navigate = useNavigate();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [ratingDist, setRatingDist] = useState([]);
  const [deptPerf, setDeptPerf] = useState([]);
  const [teamPerf, setTeamPerf] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState('');
  const [drillData, setDrillData] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillCols, setDrillCols] = useState([]);
  const [drillSearch, setDrillSearch] = useState('');
  const [drillDeptFilter, setDrillDeptFilter] = useState('');
  const [drillStatusFilter, setDrillStatusFilter] = useState('');
  const [drillSortField, setDrillSortField] = useState('full_name');
  const [drillSortDir, setDrillSortDir] = useState('asc');

  useEffect(() => {
    Promise.all([getDashboardStats(), getRatingDistribution(), getDeptPerformance(), getTeamPerformance()])
      .then(([s, r, d, t]) => {
        setStats(s.data || EMPTY_STATS);
        setRatingDist(r.data.map(item => ({ ...item, label: `${item.rating} star` })));
        setDeptPerf(d.data);
        setTeamPerf(t.data);
      })
      .catch(() => {
        setStats(EMPTY_STATS);
        setRatingDist([]);
        setDeptPerf([]);
        setTeamPerf([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const openDrill = async (title, fetcher, cols) => {
    setDrillTitle(title);
    setDrillCols(cols);
    setDrillSearch('');
    setDrillDeptFilter('');
    setDrillStatusFilter('');
    setDrillSortField(cols.find((col) => col.key === 'full_name') ? 'full_name' : (cols[0]?.key || 'full_name'));
    setDrillSortDir('asc');
    setDrillOpen(true);
    setDrillLoading(true);
    try {
      const { data } = await fetcher();
      setDrillData(data);
    } catch { setDrillData([]); }
    finally { setDrillLoading(false); }
  };

  const drillDepartments = useMemo(() => {
    const values = drillData
      .map((row) => row.department)
      .filter((value) => typeof value === 'string' && value.trim().length > 0);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [drillData]);

  const drillStatuses = useMemo(() => {
    const values = drillData
      .map((row) => row.status)
      .filter((value) => typeof value === 'string' && value.trim().length > 0);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [drillData]);

  const getSortableValue = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const asNumber = Number(value);
      if (!Number.isNaN(asNumber) && value.trim() !== '') return asNumber;
      const asTime = Date.parse(value);
      if (!Number.isNaN(asTime)) return asTime;
      return value.toLowerCase();
    }
    return '';
  };

  const filteredDrillData = useMemo(() => {
    let list = [...drillData];

    if (drillSearch.trim()) {
      const needle = drillSearch.trim().toLowerCase();
      list = list.filter((row) => drillCols.some((col) => `${row[col.key] ?? ''}`.toLowerCase().includes(needle)));
    }
    if (drillDeptFilter) {
      list = list.filter((row) => row.department === drillDeptFilter);
    }
    if (drillStatusFilter) {
      list = list.filter((row) => row.status === drillStatusFilter);
    }

    list.sort((a, b) => {
      const av = getSortableValue(a[drillSortField]);
      const bv = getSortableValue(b[drillSortField]);
      if (typeof av === 'number' && typeof bv === 'number') {
        return drillSortDir === 'asc' ? av - bv : bv - av;
      }
      return drillSortDir === 'asc'
        ? `${av}`.localeCompare(`${bv}`)
        : `${bv}`.localeCompare(`${av}`);
    });

    return list;
  }, [drillData, drillSearch, drillDeptFilter, drillStatusFilter, drillSortField, drillSortDir, drillCols]);

  const handleDrillSort = (field) => {
    setDrillSortDir((prev) => (drillSortField === field && prev === 'asc' ? 'desc' : 'asc'));
    setDrillSortField(field);
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress size={32} /></Box>;

  const tiles = [
    {
      label: 'Employees', value: stats.total_employees, icon: <People />, color: '#3b82f6', bg: '#eff6ff',
      onClick: () => openDrill('Active employees', getActiveEmployees, [
        { key: 'full_name', label: 'Name' }, { key: 'department', label: 'Dept' }, { key: 'designation', label: 'Role' },
      ]),
    },
    { label: 'Avg rating', value: stats.avg_rating, sub: '/5', icon: <Star />, color: '#f59e0b', bg: '#fffbeb', onClick: null },
    { label: 'Reviews', value: stats.total_reviews, icon: <RateReview />, color: '#8b5cf6', bg: '#f5f3ff', onClick: () => navigate('/reviews') },
    {
      label: 'Promotion ready', value: stats.promotion_ready, icon: <CheckCircle />, color: '#10b981', bg: '#ecfdf5',
      onClick: () => openDrill('Promotion-ready employees', getPromotionReadyEmployees, [
        { key: 'full_name', label: 'Name' }, { key: 'department', label: 'Dept' }, { key: 'latest_rating', label: 'Rating' }, { key: 'review_period', label: 'Period' },
      ]),
    },
    {
      label: 'Training done', value: stats.training_completed, icon: <School />, color: '#0ea5e9', bg: '#f0f9ff',
      onClick: () => openDrill('Employees who completed training', getTrainingCompletedEmployees, [
        { key: 'full_name', label: 'Name' }, { key: 'department', label: 'Dept' }, { key: 'completed_trainings', label: 'Completed' },
      ]),
    },
    {
      label: 'High risk', value: stats.high_attrition_risk, icon: <Warning />, color: '#ef4444', bg: '#fef2f2',
      onClick: () => openDrill('High attrition risk employees', getHighAttritionRiskEmployees, [
        { key: 'full_name', label: 'Name' }, { key: 'department', label: 'Dept' }, { key: 'latest_rating', label: 'Rating' }, { key: 'review_period', label: 'Period' },
      ]),
    },
    {
      label: 'Dev plans', value: stats.active_development_plans, icon: <TrendingUp />, color: '#14b8a6', bg: '#f0fdfa',
      onClick: () => openDrill('Employees with active dev plans', getActiveDevPlanEmployees, [
        { key: 'full_name', label: 'Name' }, { key: 'department', label: 'Dept' }, { key: 'active_plans', label: 'Plans' },
      ]),
    },
  ];

  // Build scatter data for correlation chart: Avg Rating (x) vs Trainings per Employee (y)
  const scatterData = teamPerf.map((row, i) => ({
    department: row.department,
    avgRating: parseFloat(row.avg_rating) || 0,
    trainingPerEmp: row.employee_count > 0 ? +(row.trainings_completed / row.employee_count).toFixed(1) : 0,
    employees: row.employee_count,
    fill: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">{employee?.first_name ? `Welcome back, ${employee.first_name}` : 'Dashboard'}</Typography>
        <Typography sx={{ color: '#64748b', mt: 0.5 }}>Here's what's happening with your team today.</Typography>
      </Box>

      {/* Stat tiles */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {tiles.map((t) => (
          <Grid item xs={6} sm={4} md={3} lg key={t.label}>
            <Card
              onClick={t.onClick || undefined}
              sx={{
                cursor: t.onClick ? 'pointer' : 'default', height: '100%',
                '&:hover': t.onClick ? {
                  borderColor: isDark ? '#ff9a3d' : t.color,
                  backgroundColor: isDark ? 'rgba(255, 122, 26, 0.08)' : 'inherit',
                  transform: 'translateY(-2px)',
                  boxShadow: isDark ? '0 14px 24px -14px rgb(255 122 26 / 0.5)' : '0 10px 15px -3px rgb(0 0 0 / 0.08)',
                } : {},
                transition: 'all 0.2s ease',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2.5,
                    bgcolor: isDark ? 'rgba(255, 122, 26, 0.2)' : t.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isDark ? '#ffbf87' : t.color,
                    '& .MuiSvgIcon-root': { fontSize: 20 },
                  }}>{t.icon}</Box>
                  {t.onClick && (
                    <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', fontWeight: 600 }}>View →</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>{t.value}</Typography>
                  {t.sub && <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>{t.sub}</Typography>}
                </Box>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>{t.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 0.25 }}>Rating by department</Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8', mb: 2.5 }}>Average performance scores across {deptPerf.length} departments</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deptPerf} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: isDark ? '#ffe4c7' : '#1f2937' }}
                    labelStyle={{ color: isDark ? '#ffbf87' : '#1f2937', fontWeight: 700 }}
                    cursor={{ fill: isDark ? 'rgba(255,122,26,0.16)' : 'rgba(59,130,246,0.04)' }}
                  />
                  <Bar dataKey="avg_rating" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 0.25 }}>Rating distribution</Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8', mb: 2.5 }}>How ratings are spread across all reviews</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={ratingDist} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={105} innerRadius={55}
                    strokeWidth={2} stroke="#fff"
                    label={({ label, value }) => `${label}: ${value}`} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}>
                    {ratingDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: isDark ? '#ffe4c7' : '#1f2937' }}
                    labelStyle={{ color: isDark ? '#ffbf87' : '#1f2937', fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance–Training Correlation Scatter */}
      {scatterData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
              <Box>
                <Typography variant="h6">Performance vs Training Investment</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8', mt: 0.25 }}>
                  How each team's average rating correlates with training effort per employee.
                  Larger bubbles = more employees.
                </Typography>
              </Box>
            </Box>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="avgRating" name="Avg Rating" type="number" domain={[0, 5]}
                  tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false}
                  label={{ value: 'Avg Rating', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#94a3b8', fontWeight: 600 } }}
                />
                <YAxis dataKey="trainingPerEmp" name="Trainings/Emp" type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}
                  label={{ value: 'Trainings per Employee', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#94a3b8', fontWeight: 600 } }}
                />
                <ZAxis dataKey="employees" range={[80, 500]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: isDark ? '#ffe4c7' : '#1f2937' }}
                  labelStyle={{ color: isDark ? '#ffbf87' : '#1f2937', fontWeight: 700 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <Box
                        sx={{
                          bgcolor: isDark ? '#1a1a1a' : '#fff',
                          border: isDark ? '1px solid #5a3a23' : '1px solid #e2e8f0',
                          borderRadius: 3,
                          p: 1.5,
                          minWidth: 160,
                        }}
                      >
                        <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', mb: 0.5, color: isDark ? '#ffbf87' : '#1f2937' }}>{d.department}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: isDark ? '#ffe4c7' : '#64748b' }}>Rating: {d.avgRating}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: isDark ? '#ffe4c7' : '#64748b' }}>Training/emp: {d.trainingPerEmp}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: isDark ? '#ffe4c7' : '#64748b' }}>Team size: {d.employees}</Typography>
                      </Box>
                    );
                  }}
                />
                <Scatter data={scatterData} shape="circle">
                  {scatterData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.8} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              {scatterData.map((d, i) => (
                <Box key={d.department} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.fill }} />
                  <Typography sx={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 500 }}>{d.department}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Team performance correlation table */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 0.25 }}>Team Performance Breakdown</Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8', mb: 2.5 }}>
            Detailed view: how each department's rating relates to training, promotions, and attrition risk.
          </Typography>
          {teamPerf.length === 0 ? (
            <Typography sx={{ color: '#94a3b8', py: 4, textAlign: 'center' }}>No data yet.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Department</TableCell>
                    <TableCell align="right">People</TableCell>
                    <TableCell align="right">Reviews</TableCell>
                    <TableCell align="right">Avg Rating</TableCell>
                    <TableCell align="right">Trainings</TableCell>
                    <TableCell align="right">Promo Ready</TableCell>
                    <TableCell align="right">High Risk</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamPerf.map((row, i) => (
                    <TableRow key={row.department} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255, 122, 26, 0.12)' : 'rgba(255, 122, 26, 0.06)' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                          <Typography sx={{ fontWeight: 600 }}>{row.department}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{row.employee_count}</TableCell>
                      <TableCell align="right">{row.review_count}</TableCell>
                      <TableCell align="right">
                        <Chip label={row.avg_rating} size="small"
                          sx={{
                            bgcolor: isDark
                              ? (row.avg_rating >= 4 ? '#103a30' : row.avg_rating >= 3 ? '#4b3416' : '#4b1f24')
                              : (row.avg_rating >= 4 ? '#ecfdf5' : row.avg_rating >= 3 ? '#fffbeb' : '#fef2f2'),
                            color: isDark
                              ? (row.avg_rating >= 4 ? '#7af2d8' : row.avg_rating >= 3 ? '#ffd089' : '#ff9aa8')
                              : (row.avg_rating >= 4 ? '#10b981' : row.avg_rating >= 3 ? '#f59e0b' : '#ef4444'),
                            fontWeight: 700, minWidth: 42,
                          }} />
                      </TableCell>
                      <TableCell align="right">{row.trainings_completed}</TableCell>
                      <TableCell align="right">
                        {row.promotion_ready > 0 ? (
                          <Chip
                            label={row.promotion_ready}
                            size="small"
                            sx={{
                              bgcolor: isDark ? '#103a30' : '#ecfdf5',
                              color: isDark ? '#7af2d8' : '#10b981',
                              fontWeight: 700,
                            }}
                          />
                        ) : '0'}
                      </TableCell>
                      <TableCell align="right">
                        {row.high_risk > 0 ? (
                          <Chip
                            label={row.high_risk}
                            size="small"
                            sx={{
                              bgcolor: isDark ? '#4b1f24' : '#fef2f2',
                              color: isDark ? '#ff9aa8' : '#ef4444',
                              fontWeight: 700,
                            }}
                          />
                        ) : '0'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Drill-down dialog */}
      <Dialog open={drillOpen} onClose={() => setDrillOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{drillTitle}</Typography>
          <IconButton size="small" onClick={() => setDrillOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {drillLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : drillData.length === 0 ? (
            <Typography sx={{ color: '#94a3b8', py: 4, textAlign: 'center' }}>No employees found.</Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search employees..."
                  value={drillSearch}
                  onChange={(event) => setDrillSearch(event.target.value)}
                  sx={{ minWidth: 220, flex: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                {drillDepartments.length > 0 && (
                  <TextField
                    select
                    size="small"
                    label="Department"
                    value={drillDeptFilter}
                    onChange={(event) => setDrillDeptFilter(event.target.value)}
                    sx={{ minWidth: 170 }}
                  >
                    <MenuItem value="">All departments</MenuItem>
                    {drillDepartments.map((department) => (
                      <MenuItem key={department} value={department}>{department}</MenuItem>
                    ))}
                  </TextField>
                )}
                {drillStatuses.length > 0 && (
                  <TextField
                    select
                    size="small"
                    label="Status"
                    value={drillStatusFilter}
                    onChange={(event) => setDrillStatusFilter(event.target.value)}
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="">All statuses</MenuItem>
                    {drillStatuses.map((status) => (
                      <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>{status.replace('_', ' ')}</MenuItem>
                    ))}
                  </TextField>
                )}
                <Button
                  size="small"
                  onClick={() => {
                    setDrillSearch('');
                    setDrillDeptFilter('');
                    setDrillStatusFilter('');
                    setDrillSortField(drillCols.find((col) => col.key === 'full_name') ? 'full_name' : (drillCols[0]?.key || 'full_name'));
                    setDrillSortDir('asc');
                  }}
                  sx={{ px: 1.5, fontWeight: 600, textTransform: 'none' }}
                >
                  Reset
                </Button>
              </Box>

              {filteredDrillData.length === 0 ? (
                <Typography sx={{ color: '#94a3b8', py: 4, textAlign: 'center' }}>No employees match your filters.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {drillCols.map((c) => (
                          <TableCell key={c.key}>
                            <TableSortLabel
                              active={drillSortField === c.key}
                              direction={drillSortField === c.key ? drillSortDir : 'asc'}
                              onClick={() => handleDrillSort(c.key)}
                            >
                              {c.label}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDrillData.map((row, i) => (
                        <TableRow
                          key={row.id || i}
                          hover
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: isDark ? 'rgba(255, 122, 26, 0.14)' : 'rgba(255, 122, 26, 0.08)' },
                          }}
                          onClick={() => { setDrillOpen(false); navigate(`/employees/${row.id}`); }}
                        >
                          {drillCols.map((c) => (
                            <TableCell key={c.key} sx={{ fontWeight: c.key === 'full_name' ? 600 : 400 }}>{row[c.key] ?? '—'}</TableCell>
                          ))}
                          <TableCell><Typography sx={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>View →</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1.5, fontWeight: 500 }}>{filteredDrillData.length} of {drillData.length} employee{drillData.length !== 1 ? 's' : ''}</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
