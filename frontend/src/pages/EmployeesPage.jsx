import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, InputAdornment, Chip, Card, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, CircularProgress, MenuItem, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Autocomplete,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { getEmployees, register } from '../services/api.js';
import { useAuth } from '../AuthContext.jsx';

const statusCfg = {
  active: {
    color: '#16a34a',
    bg: '#f0fdf4',
    darkColor: '#7af2d8',
    darkBg: '#103a30',
    label: 'Active',
  },
  inactive: {
    color: '#6b7280',
    bg: '#f3f4f6',
    darkColor: '#d1d5db',
    darkBg: '#2a2a2a',
    label: 'Inactive',
  },
  on_leave: {
    color: '#ca8a04',
    bg: '#fefce8',
    darkColor: '#ffd089',
    darkBg: '#4b3416',
    label: 'On Leave',
  },
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [createEmployeePool, setCreateEmployeePool] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('full_name');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState('role');
  const [createLoading, setCreateLoading] = useState(false);
  const [managerLookupLoading, setManagerLookupLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [form, setForm] = useState({
    role: 'employee',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    employee_code: '',
    department: 'General',
    designation: '',
    hire_date: '',
    manager_id: '',
    status: 'active',
  });
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const loadEmployees = () => {
    setLoading(true);
    getEmployees({ search: search || undefined })
      .then(({ data }) => setEmployees(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmployees();
  }, [search]);

  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))].sort(), [employees]);
  const departmentOptions = useMemo(() => {
    const defaults = ['Engineering', 'Product', 'Design', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing', 'General'];
    return [...new Set([...defaults, ...departments])].sort();
  }, [departments]);
  const managerCandidates = useMemo(() => {
    return createEmployeePool
      .filter((e) => e.role === 'manager')
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [createEmployeePool]);
  const managerDropdownOptions = useMemo(
    () => [{ id: '', full_name: 'No Manager', employee_code: '' }, ...managerCandidates],
    [managerCandidates],
  );
  const selectedManager = useMemo(
    () => managerDropdownOptions.find((manager) => String(manager.id) === String(form.manager_id)) || null,
    [managerDropdownOptions, form.manager_id],
  );

  const filtered = useMemo(() => {
    let list = [...employees];
    if (deptFilter) list = list.filter((e) => e.department === deptFilter);
    if (statusFilter) list = list.filter((e) => e.status === statusFilter);
    list.sort((a, b) => {
      const av = (a[sortField] ?? '').toString().toLowerCase();
      const bv = (b[sortField] ?? '').toString().toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [employees, deptFilter, statusFilter, sortField, sortDir]);

  const handleSort = (field) => {
    setSortDir(sortField === field && sortDir === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const resetCreateForm = () => {
    setForm({
      role: 'employee',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      employee_code: '',
      department: 'General',
      designation: '',
      hire_date: '',
      manager_id: '',
      status: 'active',
    });
    setCreateError('');
  };

  const handleCreateOpen = () => {
    resetCreateForm();
    setCreateStep('role');
    setCreateSuccess('');
    setCreateOpen(true);
    if (isAdmin) {
      setManagerLookupLoading(true);
      getEmployees()
        .then(({ data }) => setCreateEmployeePool(data))
        .catch(() => setCreateEmployeePool([]))
        .finally(() => setManagerLookupLoading(false));
    }
  };

  const handleCreateClose = () => {
    if (createLoading) return;
    setCreateOpen(false);
    setCreateStep('role');
    setCreateError('');
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRolePick = (role) => {
    setForm((prev) => ({
      ...prev,
      role,
      manager_id: role === 'manager' ? '' : prev.manager_id,
    }));
    setCreateError('');
    setCreateStep('details');
  };

  const handleCreateSubmit = async () => {
    setCreateError('');

    const requiredFields = ['email', 'password', 'first_name', 'last_name', 'employee_code'];
    const missingField = requiredFields.find((field) => !form[field]?.trim());
    if (missingField) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    const payload = {
      role: form.role,
      email: form.email.trim(),
      password: form.password,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      employee_code: form.employee_code.trim(),
      department: form.department.trim() || 'General',
      designation: form.designation.trim() || (form.role === 'manager' ? 'Manager' : 'Associate'),
      hire_date: form.hire_date || undefined,
      manager_id: form.role === 'employee' && form.manager_id ? Number(form.manager_id) : null,
      status: form.status,
    };

    setCreateLoading(true);
    try {
      const { data } = await register(payload);
      setCreateSuccess(`Account created for ${data.employee.full_name}.`);
      setCreateOpen(false);
      setCreateStep('role');
      resetCreateForm();
      loadEmployees();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create account.');
    } finally {
      setCreateLoading(false);
    }
  };

  const cols = [
    { id: 'full_name', label: 'Name' },
    { id: 'department', label: 'Department' },
    { id: 'designation', label: 'Role' },
    { id: 'manager_name', label: 'Manager' },
    { id: 'status', label: 'Status' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Employees</Typography>
          <Typography sx={{ color: '#6b7280', mt: 0.5 }}>{filtered.length} of {employees.length} people</Typography>
          {createSuccess && <Alert severity="success" sx={{ mt: 1.25, py: 0.25 }}>{createSuccess}</Alert>}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {isAdmin && (
            <Button variant="contained" color="secondary" onClick={handleCreateOpen} sx={{ height: 40 }}>
              Create Account
            </Button>
          )}
          <TextField
            placeholder="Search by name or code..."
            size="small"
            sx={{ width: { xs: '100%', sm: 220 } }}
            value={search}
            onChange={(e) => { setLoading(true); setSearch(e.target.value); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9ca3af', fontSize: 20 }} /></InputAdornment> }}
          />
          <TextField select size="small" label="Department" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            sx={{ minWidth: 150 }} displayEmpty
          >
            <MenuItem value="">All Departments</MenuItem>
            {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {Object.entries(statusCfg).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </TextField>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={8}><CircularProgress size={28} /></Box>
      ) : filtered.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#9ca3af' }}>No employees found.</Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {cols.map((col) => (
                    <TableCell key={col.id}>
                      <TableSortLabel active={sortField === col.id} direction={sortField === col.id ? sortDir : 'asc'} onClick={() => handleSort(col.id)}>
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((emp) => {
                  const s = statusCfg[emp.status] || statusCfg.inactive;
                  return (
                    <TableRow
                      key={emp.id} hover
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 600, bgcolor: '#3b82f6' }}>
                            {emp.first_name[0]}{emp.last_name[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{emp.full_name}</Typography>
                            <Typography sx={{ fontSize: '0.6875rem', color: '#9ca3af', fontFamily: 'monospace' }}>{emp.employee_code}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.8125rem' }}>{emp.department}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.8125rem', color: '#6b7280' }}>{emp.designation}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.8125rem', color: '#6b7280' }}>{emp.manager_name || '—'}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          label={s.label}
                          size="small"
                          sx={{
                            bgcolor: (theme) => (theme.palette.mode === 'dark' ? s.darkBg : s.bg),
                            color: (theme) => (theme.palette.mode === 'dark' ? s.darkColor : s.color),
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Dialog open={createOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>{createStep === 'role' ? 'Choose Account Type' : `Create ${form.role === 'manager' ? 'Manager' : 'Employee'} Account`}</DialogTitle>
        <DialogContent>
          {createStep === 'role' ? (
            <Box sx={{ mt: 0.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <Card
                onClick={() => handleRolePick('manager')}
                sx={{ p: 2, cursor: 'pointer', border: '1px solid #e5e7eb', '&:hover': { borderColor: '#3b82f6' } }}
              >
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Manager</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>Can oversee direct reports and team progress.</Typography>
              </Card>
              <Card
                onClick={() => handleRolePick('employee')}
                sx={{ p: 2, cursor: 'pointer', border: '1px solid #e5e7eb', '&:hover': { borderColor: '#3b82f6' } }}
              >
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Employee</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>Can access personal goals, plans, and progress only.</Typography>
              </Card>
            </Box>
          ) : (
            <Box sx={{ mt: 0.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {createError && <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{createError}</Alert>}
              <TextField
                select label="Status" value={form.status}
                onChange={(e) => handleFormChange('status', e.target.value)}
                size="small"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="on_leave">On Leave</MenuItem>
              </TextField>
              <TextField
                label="First Name" value={form.first_name}
                onChange={(e) => handleFormChange('first_name', e.target.value)}
                size="small" required
              />
              <TextField
                label="Last Name" value={form.last_name}
                onChange={(e) => handleFormChange('last_name', e.target.value)}
                size="small" required
              />
              <TextField
                label="Email" type="email" value={form.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                size="small" required
              />
              <TextField
                label="Password" type="password" value={form.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                size="small" required
              />
              <TextField
                label="Employee Code" value={form.employee_code}
                onChange={(e) => handleFormChange('employee_code', e.target.value)}
                size="small" required
              />
              <TextField
                select label="Department" value={form.department}
                onChange={(e) => handleFormChange('department', e.target.value)}
                size="small"
              >
                {departmentOptions.map((department) => (
                  <MenuItem key={department} value={department}>{department}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Designation" value={form.designation}
                onChange={(e) => handleFormChange('designation', e.target.value)}
                size="small"
                helperText={form.role === 'manager' ? 'Defaults to Manager if left blank.' : 'Defaults to Associate if left blank.'}
              />
              <TextField
                label="Hire Date" type="date" value={form.hire_date}
                onChange={(e) => handleFormChange('hire_date', e.target.value)}
                size="small" InputLabelProps={{ shrink: true }}
              />
              {form.role === 'employee' && (
                <Autocomplete
                  options={managerDropdownOptions}
                  value={selectedManager}
                  onChange={(_, value) => handleFormChange('manager_id', value ? String(value.id) : '')}
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
                      helperText={managerLookupLoading ? 'Loading managers...' : managerCandidates.length === 0 ? 'No managers found yet.' : 'Search and select from dropdown'}
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
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {createStep === 'role' ? (
            <Button onClick={handleCreateClose} disabled={createLoading}>Cancel</Button>
          ) : (
            <>
              <Button onClick={() => setCreateStep('role')} disabled={createLoading}>Back</Button>
              <Button onClick={handleCreateClose} disabled={createLoading}>Cancel</Button>
              <Button variant="contained" color="secondary" onClick={handleCreateSubmit} disabled={createLoading}>
                {createLoading ? 'Creating...' : `Create ${form.role === 'manager' ? 'Manager' : 'Employee'}`}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
