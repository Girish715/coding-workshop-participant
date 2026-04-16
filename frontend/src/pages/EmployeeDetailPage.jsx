import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, CircularProgress, Rating, Avatar, Breadcrumbs, Link, Button,
  TextField, MenuItem, Alert, Autocomplete,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import {
  getEmployee,
  getReviews,
  getDevPlans,
  getEmployeeCompetencies,
  getTraining,
  updateEmployee,
  getEmployees,
} from '../services/api.js';
import { useAuth } from '../AuthContext.jsx';

const statusCfg = {
  completed: { c: '#16a34a', b: '#f0fdf4' }, in_progress: { c: '#3b82f6', b: '#eff6ff' },
  not_started: { c: '#9ca3af', b: '#f9fafb' }, on_hold: { c: '#ca8a04', b: '#fefce8' },
  enrolled: { c: '#3b82f6', b: '#eff6ff' }, dropped: { c: '#dc2626', b: '#fef2f2' },
  draft: { c: '#9ca3af', b: '#f9fafb' }, submitted: { c: '#3b82f6', b: '#eff6ff' }, approved: { c: '#16a34a', b: '#f0fdf4' },
};
const sc = (s) => statusCfg[s] || { c: '#9ca3af', b: '#f9fafb' };

function TabPanel({ value, index, children }) {
  return value === index ? <Box mt={2}>{children}</Box> : null;
}

export default function EmployeeDetailPage({ employeeIdOverride = null, initialTab = 0 }) {
  const { id } = useParams();
  const resolvedEmployeeId = employeeIdOverride ?? id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [emp, setEmp] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [plans, setPlans] = useState([]);
  const [comps, setComps] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    employee_code: '',
    department: 'General',
    designation: '',
    status: 'active',
    hire_date: '',
    manager_id: '',
  });
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const managerDropdownOptions = useMemo(
    () => [{ id: '', full_name: 'No Manager', employee_code: '' }, ...managerOptions],
    [managerOptions],
  );
  const selectedManagerOption = managerDropdownOptions.find(
    (manager) => String(manager.id) === String(editForm.manager_id),
  ) || null;

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!resolvedEmployeeId) {
      setLoading(false);
      return;
    }

    const baseRequests = [
      getEmployee(resolvedEmployeeId),
      getReviews({ employee_id: resolvedEmployeeId }),
      getDevPlans({ employee_id: resolvedEmployeeId }),
      getEmployeeCompetencies({ employee_id: resolvedEmployeeId }),
      getTraining({ employee_id: resolvedEmployeeId }),
    ];

    if (isAdmin) {
      baseRequests.push(getEmployees());
    }

    Promise.all(baseRequests).then((results) => {
      const [e, r, d, c, t, allEmployeesResponse] = results;
      setEmp(e.data);
      setReviews(r.data);
      setPlans(d.data);
      setComps(c.data);
      setTrainings(t.data);

      setEditForm({
        first_name: e.data.first_name || '',
        last_name: e.data.last_name || '',
        employee_code: e.data.employee_code || '',
        department: e.data.department || 'General',
        designation: e.data.designation || '',
        status: e.data.status || 'active',
        hire_date: e.data.hire_date || '',
        manager_id: e.data.manager_id ? String(e.data.manager_id) : '',
      });

      if (isAdmin && allEmployeesResponse?.data) {
        const allEmployees = allEmployeesResponse.data;
        const managers = allEmployees
          .filter((employee) => employee.role === 'manager' && employee.id !== e.data.id)
          .sort((a, b) => a.full_name.localeCompare(b.full_name));
        setManagerOptions(managers);

        const defaults = ['Engineering', 'Product', 'Design', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing', 'General'];
        const existing = allEmployees.map((employee) => employee.department).filter(Boolean);
        const mergedDepartments = [...new Set([...defaults, ...existing])].sort();
        setDepartmentOptions(mergedDepartments);
      }
    }).finally(() => setLoading(false));
  }, [resolvedEmployeeId]);

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStartEdit = () => {
    setEditError('');
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditError('');
    setEditForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      employee_code: emp.employee_code || '',
      department: emp.department || 'General',
      designation: emp.designation || '',
      status: emp.status || 'active',
      hire_date: emp.hire_date || '',
      manager_id: emp.manager_id ? String(emp.manager_id) : '',
    });
    setEditMode(false);
  };

  const handleSaveEdit = async () => {
    const requiredFields = ['first_name', 'last_name', 'employee_code', 'department', 'designation', 'hire_date'];
    const missing = requiredFields.find((field) => !editForm[field]?.trim());
    if (missing) {
      setEditError('Please fill in all required fields before saving.');
      return;
    }

    const payload = {
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      employee_code: editForm.employee_code.trim(),
      department: editForm.department.trim(),
      designation: editForm.designation.trim(),
      status: editForm.status,
      hire_date: editForm.hire_date,
      manager_id: editForm.manager_id ? Number(editForm.manager_id) : null,
    };

    setSaving(true);
    setEditError('');
    try {
      const { data } = await updateEmployee(resolvedEmployeeId, payload);
      setEmp(data);
      setEditMode(false);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update employee details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress size={28} /></Box>;
  if (!emp) return <Typography>Employee not found.</Typography>;

  const latestRating = reviews.length > 0 ? reviews[0].overall_rating : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button size="small" startIcon={<ArrowBack />} onClick={() => navigate(-1)}
          sx={{ color: '#64748b', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#f1f5f9' } }}>
          Back
        </Button>
        <Breadcrumbs sx={{ fontSize: '0.8125rem' }}>
          <Link underline="hover" color="inherit" onClick={() => navigate('/employees')} sx={{ cursor: 'pointer' }}>Employees</Link>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{emp.full_name}</Typography>
        </Breadcrumbs>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, alignItems: 'center' }}>
            <Avatar sx={{ width: 64, height: 64, fontSize: 22, fontWeight: 700, bgcolor: '#3b82f6' }}>
              {emp.first_name[0]}{emp.last_name[0]}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="h5">{emp.full_name}</Typography>
                <Chip label={emp.status} size="small" sx={{
                  bgcolor: emp.status === 'active' ? '#f0fdf4' : '#f9fafb',
                  color: emp.status === 'active' ? '#16a34a' : '#9ca3af', fontWeight: 500,
                }} />
              </Box>
              <Typography sx={{ color: '#6b7280', mt: 0.25 }}>{emp.designation}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5, fontSize: '0.8125rem', color: '#6b7280' }}>
                <span>{emp.employee_code}</span>
                <span>{emp.department}</span>
                <span>Hired {emp.hire_date}</span>
                {emp.manager_name && <span>Reports to {emp.manager_name}</span>}
              </Box>
            </Box>
            {isAdmin && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {editMode ? (
                  <>
                    <Button onClick={handleCancelEdit} disabled={saving}>Cancel</Button>
                    <Button variant="contained" color="secondary" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button variant="contained" color="secondary" onClick={handleStartEdit}>Edit Employee</Button>
                )}
              </Box>
            )}
            {latestRating && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Latest rating</Typography>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>{latestRating}</Typography>
                <Rating value={latestRating} precision={0.1} readOnly size="small" />
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {isAdmin && editMode && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Edit Employee Details</Typography>
            {editError && <Alert severity="error" sx={{ mb: 1.5 }}>{editError}</Alert>}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                label="First Name" value={editForm.first_name}
                onChange={(e) => handleEditChange('first_name', e.target.value)}
                size="small" required
              />
              <TextField
                label="Last Name" value={editForm.last_name}
                onChange={(e) => handleEditChange('last_name', e.target.value)}
                size="small" required
              />
              <TextField
                label="Employee Code" value={editForm.employee_code}
                onChange={(e) => handleEditChange('employee_code', e.target.value)}
                size="small" required
              />
              <TextField
                select label="Department" value={editForm.department}
                onChange={(e) => handleEditChange('department', e.target.value)}
                size="small" required
              >
                {departmentOptions.map((department) => (
                  <MenuItem key={department} value={department}>{department}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Designation" value={editForm.designation}
                onChange={(e) => handleEditChange('designation', e.target.value)}
                size="small" required
              />
              <TextField
                select label="Status" value={editForm.status}
                onChange={(e) => handleEditChange('status', e.target.value)}
                size="small"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="on_leave">On Leave</MenuItem>
              </TextField>
              <TextField
                label="Hire Date" type="date" value={editForm.hire_date}
                onChange={(e) => handleEditChange('hire_date', e.target.value)}
                size="small" required InputLabelProps={{ shrink: true }}
              />
              <Autocomplete
                options={managerDropdownOptions}
                value={selectedManagerOption}
                onChange={(_, value) => handleEditChange('manager_id', value ? String(value.id) : '')}
                getOptionLabel={(option) => (option.employee_code ? `${option.full_name} (${option.employee_code})` : option.full_name)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText="No managers found"
                openOnFocus
                autoHighlight
                clearOnEscape
                sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Manager"
                    size="small"
                    placeholder="Search manager by name or code"
                    helperText={managerOptions.length === 0 ? 'No managers found yet.' : 'Search and select from dropdown'}
                  />
                )}
                filterOptions={(options, { inputValue }) => {
                  const query = inputValue.trim().toLowerCase();
                  if (!query) return options;
                  return options.filter((option) => {
                    const fullName = option.full_name?.toLowerCase() || '';
                    const employeeCode = option.employee_code?.toLowerCase() || '';
                    return fullName.includes(query) || employeeCode.includes(query);
                  });
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="secondary" indicatorColor="secondary" sx={{
        borderBottom: '1px solid #e2e8f0',
      }}>
        <Tab label={`Reviews (${reviews.length})`} />
        <Tab label={`Dev Plans (${plans.length})`} />
        <Tab label={`Competencies (${comps.length})`} />
        <Tab label={`Training (${trainings.length})`} />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Period</TableCell><TableCell>Rating</TableCell><TableCell>Reviewer</TableCell>
                <TableCell>Status</TableCell><TableCell>Promo ready</TableCell><TableCell>Risk</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {reviews.map((r) => {
                  const stc = sc(r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{r.review_period}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 700 }}>{r.overall_rating}</Typography>
                          <Rating value={r.overall_rating} precision={0.1} readOnly size="small" />
                        </Box>
                      </TableCell>
                      <TableCell>{r.reviewer_name}</TableCell>
                      <TableCell><Chip label={r.status} size="small" sx={{ bgcolor: stc.b, color: stc.c, fontWeight: 500, textTransform: 'capitalize' }} /></TableCell>
                      <TableCell>{r.promotion_ready ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <Chip label={r.attrition_risk} size="small" sx={{
                          bgcolor: r.attrition_risk === 'high' ? '#fef2f2' : r.attrition_risk === 'medium' ? '#fefce8' : '#f0fdf4',
                          color: r.attrition_risk === 'high' ? '#dc2626' : r.attrition_risk === 'medium' ? '#ca8a04' : '#16a34a',
                          fontWeight: 500, textTransform: 'capitalize',
                        }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Grid container spacing={1.5}>
          {plans.map((p) => {
            const stc = sc(p.status);
            return (
              <Grid item xs={12} md={6} key={p.id}>
                <Card>
                  <CardContent sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{p.title}</Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#6b7280', mb: 1.5, lineHeight: 1.5 }}>{p.description}</Typography>
                    <Box display="flex" gap={0.5} mb={1.5}>
                      <Chip label={p.goal_type} size="small" sx={{ bgcolor: '#f9fafb', textTransform: 'capitalize' }} />
                      <Chip label={p.status.replace('_', ' ')} size="small" sx={{ bgcolor: stc.b, color: stc.c, fontWeight: 500, textTransform: 'capitalize' }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>Progress</Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{p.progress_pct}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={p.progress_pct} sx={{ height: 4, borderRadius: 2, bgcolor: '#f3f4f6' }} />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Competency</TableCell><TableCell>Category</TableCell>
                <TableCell>Current</TableCell><TableCell>Target</TableCell><TableCell>Gap</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {comps.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{c.competency_name}</TableCell>
                    <TableCell><Chip label={c.competency_category} size="small" sx={{ bgcolor: '#f9fafb', textTransform: 'capitalize' }} /></TableCell>
                    <TableCell>{c.current_level}</TableCell>
                    <TableCell>{c.target_level}</TableCell>
                    <TableCell>
                      <Chip label={c.gap === 0 ? 'Met' : `-${c.gap}`} size="small" sx={{
                        bgcolor: c.gap >= 2 ? '#fef2f2' : c.gap >= 1 ? '#fefce8' : '#f0fdf4',
                        color: c.gap >= 2 ? '#dc2626' : c.gap >= 1 ? '#ca8a04' : '#16a34a', fontWeight: 600,
                      }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Training</TableCell><TableCell>Provider</TableCell><TableCell>Type</TableCell>
                <TableCell>Status</TableCell><TableCell>Score</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {trainings.map((t) => {
                  const stc = sc(t.status);
                  return (
                    <TableRow key={t.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{t.training_name}</TableCell>
                      <TableCell sx={{ color: '#6b7280' }}>{t.provider}</TableCell>
                      <TableCell><Chip label={t.training_type} size="small" sx={{ bgcolor: '#f9fafb', textTransform: 'capitalize' }} /></TableCell>
                      <TableCell><Chip label={t.status.replace('_', ' ')} size="small" sx={{ bgcolor: stc.b, color: stc.c, fontWeight: 500, textTransform: 'capitalize' }} /></TableCell>
                      <TableCell>
                        {t.score != null ? (
                          <Typography sx={{ fontWeight: 600, color: t.score >= 90 ? '#16a34a' : t.score >= 70 ? '#ca8a04' : '#dc2626' }}>{t.score}%</Typography>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </TabPanel>
    </Box>
  );
}
