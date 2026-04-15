import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  Close, People, Star, RateReview, TrendingUp, School,
  Warning, CheckCircle,
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

export default function DashboardPage() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [ratingDist, setRatingDist] = useState([]);
  const [deptPerf, setDeptPerf] = useState([]);
  const [teamPerf, setTeamPerf] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState('');
  const [drillData, setDrillData] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillCols, setDrillCols] = useState([]);

  useEffect(() => {
    Promise.all([getDashboardStats(), getRatingDistribution(), getDeptPerformance(), getTeamPerformance()])
      .then(([s, r, d, t]) => {
        setStats(s.data);
        setRatingDist(r.data.map(item => ({ ...item, label: `${item.rating} star` })));
        setDeptPerf(d.data);
        setTeamPerf(t.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const openDrill = async (title, fetcher, cols) => {
    setDrillTitle(title);
    setDrillCols(cols);
    setDrillOpen(true);
    setDrillLoading(true);
    try {
      const { data } = await fetcher();
      setDrillData(data);
    } catch { setDrillData([]); }
    finally { setDrillLoading(false); }
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
                '&:hover': t.onClick ? { borderColor: t.color, transform: 'translateY(-2px)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)' } : {},
                transition: 'all 0.2s ease',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2.5, bgcolor: t.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: t.color, '& .MuiSvgIcon-root': { fontSize: 20 },
                  }}>{t.icon}</Box>
                  {t.onClick && (
                    <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600 }}>View →</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{t.value}</Typography>
                  {t.sub && <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{t.sub}</Typography>}
                </Box>
                <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.5, fontWeight: 500 }}>{t.label}</Typography>
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
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.8125rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }}
                    cursor={{ fill: 'rgba(59,130,246,0.04)' }}
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
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.8125rem' }} />
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
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.8125rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <Box sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 3, p: 1.5, minWidth: 160 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', mb: 0.5 }}>{d.department}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>Rating: {d.avgRating}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>Training/emp: {d.trainingPerEmp}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>Team size: {d.employees}</Typography>
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
                    <TableRow key={row.department}>
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
                            bgcolor: row.avg_rating >= 4 ? '#ecfdf5' : row.avg_rating >= 3 ? '#fffbeb' : '#fef2f2',
                            color: row.avg_rating >= 4 ? '#10b981' : row.avg_rating >= 3 ? '#f59e0b' : '#ef4444',
                            fontWeight: 700, minWidth: 42,
                          }} />
                      </TableCell>
                      <TableCell align="right">{row.trainings_completed}</TableCell>
                      <TableCell align="right">
                        {row.promotion_ready > 0 ? (
                          <Chip label={row.promotion_ready} size="small" sx={{ bgcolor: '#ecfdf5', color: '#10b981', fontWeight: 700 }} />
                        ) : '0'}
                      </TableCell>
                      <TableCell align="right">
                        {row.high_risk > 0 ? (
                          <Chip label={row.high_risk} size="small" sx={{ bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 700 }} />
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
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {drillCols.map((c) => <TableCell key={c.key}>{c.label}</TableCell>)}
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drillData.map((row, i) => (
                    <TableRow key={row.id || i} hover sx={{ cursor: 'pointer' }} onClick={() => { setDrillOpen(false); navigate(`/employees/${row.id}`); }}>
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
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1.5, fontWeight: 500 }}>{drillData.length} employee{drillData.length !== 1 ? 's' : ''}</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
