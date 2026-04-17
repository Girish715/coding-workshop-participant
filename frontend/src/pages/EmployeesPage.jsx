import React, { useEffect, useState, useMemo, useCallback, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Chip, Card, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination,
  CircularProgress, MenuItem, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Autocomplete,
  InputAdornment, IconButton,
} from '@mui/material';
import { ArrowDownward, ArrowUpward, UploadFile, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { getEmployees, register, previewBulkUpload, confirmBulkUpload } from '../services/api.js';
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
  const [columnFilters, setColumnFilters] = useState({
    full_name: '',
    department: '',
    designation: '',
    manager_name: '',
    status: '',
  });
  const deferredFilters = useDeferredValue(columnFilters);
  const [sortField, setSortField] = useState('full_name');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState('role');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState('');
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
  const isHr = user?.role === 'hr';
  const canManageAccounts = isAdmin || isHr;
  const canExportPdf = ['admin', 'hr', 'manager'].includes(user?.role || '');

  const loadEmployees = () => {
    setLoading(true);
    getEmployees()
      .then(({ data }) => setEmployees(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))].sort(), [employees]);
  const departmentOptions = useMemo(() => {
    const defaults = ['Engineering', 'Product', 'Design', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing', 'General'];
    return [...new Set([...defaults, ...departments])].sort();
  }, [departments]);
  const managerCandidates = useMemo(() => {
    return employees
      .filter((e) => e.role === 'manager')
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [employees]);
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
    if (deferredFilters.full_name) {
      const q = deferredFilters.full_name.toLowerCase();
      list = list.filter((e) => e.full_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q));
    }
    if (deferredFilters.department) {
      const q = deferredFilters.department.toLowerCase();
      list = list.filter((e) => e.department.toLowerCase().includes(q));
    }
    if (deferredFilters.designation) {
      const q = deferredFilters.designation.toLowerCase();
      list = list.filter((e) => (e.designation || '').toLowerCase().includes(q));
    }
    if (deferredFilters.manager_name) {
      const q = deferredFilters.manager_name.toLowerCase();
      list = list.filter((e) => (e.manager_name || '').toLowerCase().includes(q));
    }
    if (deferredFilters.status) {
      list = list.filter((e) => e.status === deferredFilters.status);
    }
    list.sort((a, b) => {
      const av = (a[sortField] ?? '').toString().toLowerCase();
      const bv = (b[sortField] ?? '').toString().toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [employees, deferredFilters, sortField, sortDir]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [columnFilters, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir('asc');
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

  const handleCreateOpen = useCallback(() => {
    resetCreateForm();
    setCreateStep('role');
    setCreateSuccess('');
    setCreateOpen(true);
  }, []);

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

    const requiredFields = ['email', 'first_name', 'last_name', 'employee_code'];
    if (form.role !== 'employee') {
      requiredFields.push('password');
    }
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
      designation: form.designation.trim() || (form.role === 'manager' ? 'Manager' : form.role === 'hr' ? 'HR Business Partner' : 'Associate'),
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

  const formatStatusLabel = (value) => {
    const key = String(value || '').toLowerCase();
    if (statusCfg[key]?.label) return statusCfg[key].label;
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const downloadEmployeesPdf = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF({ orientation: 'landscape' });
    const generatedAt = new Date().toLocaleString();

    doc.setFontSize(16);
    doc.text('Employee Directory', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${generatedAt}`, 14, 21);
    doc.text(`Rows: ${filtered.length}`, 14, 27);

    autoTable(doc, {
      startY: 32,
      head: [['Name', 'Code', 'Department', 'Designation', 'Manager', 'Status']],
      body: filtered.map((employee) => [
        employee.full_name,
        employee.employee_code,
        employee.department,
        employee.designation,
        employee.manager_name || 'N/A',
        statusCfg[employee.status]?.label || employee.status,
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [34, 45, 67],
      },
    });

    doc.save('employee-directory.pdf');
  };

  const renderHeaderFilter = (field, placeholder, width = 170) => (
    <TextField
      size="small"
      placeholder={placeholder}
      value={columnFilters[field]}
      onChange={(e) => setColumnFilters((prev) => ({ ...prev, [field]: e.target.value }))}
      sx={{ minWidth: width }}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => handleSort(field)}>
              {sortField === field && sortDir === 'asc' ? <ArrowUpward sx={{ fontSize: 16 }} /> : <ArrowDownward sx={{ fontSize: 16 }} />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Employees</Typography>
          <Typography sx={{ color: '#6b7280', mt: 0.5 }}>{filtered.length} of {employees.length} people</Typography>
          {createSuccess && <Alert severity="success" sx={{ mt: 1.25, py: 0.25 }}>{createSuccess}</Alert>}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {canManageAccounts && (
            <Button variant="contained" color="secondary" onClick={handleCreateOpen} sx={{ height: 40 }}>
              Create Account
            </Button>
          )}
          {isAdmin && (
            <Button variant="contained" color="primary" startIcon={<UploadFile />}
              onClick={() => { setBulkOpen(true); setBulkFile(null); setBulkPreview(null); setBulkResult(null); setBulkError(''); }}
              sx={{ height: 40 }}>
              Import CSV/Excel
            </Button>
          )}
          {canExportPdf && (
            <Button variant="outlined" color="secondary" onClick={downloadEmployeesPdf} sx={{ height: 40 }}>
              Download PDF
            </Button>
          )}
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
                  <TableCell>
                    <Typography sx={{ mb: 0.75, fontWeight: 700 }}>Name</Typography>
                    {renderHeaderFilter('full_name', 'Search name or code', 200)}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ mb: 0.75, fontWeight: 700 }}>Department</Typography>
                    {renderHeaderFilter('department', 'Search department')}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ mb: 0.75, fontWeight: 700 }}>Role</Typography>
                    {renderHeaderFilter('designation', 'Search role')}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ mb: 0.75, fontWeight: 700 }}>Manager</Typography>
                    {renderHeaderFilter('manager_name', 'Search manager')}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ mb: 0.75, fontWeight: 700 }}>Status</Typography>
                    <TextField
                      select
                      size="small"
                      placeholder="Status"
                      value={columnFilters.status}
                      onChange={(e) => setColumnFilters((prev) => ({ ...prev, status: e.target.value }))}
                      sx={{ minWidth: 120 }}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => value ? statusCfg[value]?.label || value : 'All Statuses',
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => handleSort('status')}>
                              {sortField === 'status' && sortDir === 'asc' ? <ArrowUpward sx={{ fontSize: 16 }} /> : <ArrowDownward sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      {Object.entries(statusCfg).map(([key, value]) => <MenuItem key={key} value={key}>{value.label}</MenuItem>)}
                    </TextField>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.map((emp) => {
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
          <TablePagination
            component="div"
            count={filtered.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Card>
      )}

      <Dialog open={createOpen} onClose={handleCreateClose} maxWidth="sm" fullWidth>
        <DialogTitle>{createStep === 'role' ? 'Choose Account Type' : `Create ${form.role === 'manager' ? 'Manager' : form.role === 'hr' ? 'HR' : 'Employee'} Account`}</DialogTitle>
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
                onClick={() => handleRolePick('hr')}
                sx={{ p: 2, cursor: 'pointer', border: '1px solid #e5e7eb', '&:hover': { borderColor: '#3b82f6' } }}
              >
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>HR</Typography>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>Can manage workforce records, plans, reviews, and training data.</Typography>
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
              {form.role !== 'employee' && (
                <TextField
                  label="Password" type="password" value={form.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  size="small" required
                />
              )}
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
                helperText={form.role === 'manager' ? 'Defaults to Manager if left blank.' : form.role === 'hr' ? 'Defaults to HR Business Partner if left blank.' : 'Defaults to Associate if left blank.'}
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
                      helperText={managerCandidates.length === 0 ? 'No managers found yet.' : 'Search and select from dropdown'}
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
                {createLoading ? 'Creating...' : `Create ${form.role === 'manager' ? 'Manager' : form.role === 'hr' ? 'HR' : 'Employee'}`}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkOpen} onClose={() => { if (!bulkLoading) setBulkOpen(false); }} maxWidth="md" fullWidth>
        <DialogTitle>Import Employees from CSV / Excel</DialogTitle>
        <DialogContent>
          {bulkResult ? (
            <Box sx={{ mt: 1 }}>
              <Alert severity={bulkResult.created > 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                {bulkResult.created} employee(s) created successfully.
                {bulkResult.failed > 0 && ` ${bulkResult.failed} failed.`}
              </Alert>
              {bulkResult.employees?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', mb: 1 }}>Created:</Typography>
                  {bulkResult.employees.map((e, i) => (
                    <Typography key={i} sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      <CheckCircle sx={{ fontSize: 14, color: '#16a34a', mr: 0.5, verticalAlign: 'text-bottom' }} />
                      {e.full_name} ({e.employee_code})
                    </Typography>
                  ))}
                </Box>
              )}
              {bulkResult.errors?.length > 0 && (
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', mb: 1, color: '#ef4444' }}>Errors:</Typography>
                  {bulkResult.errors.map((e, i) => (
                    <Typography key={i} sx={{ fontSize: '0.8125rem', color: '#ef4444' }}>
                      <ErrorIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                      Row {e.row}: {e.errors?.join(', ')}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          ) : bulkPreview ? (
            <Box sx={{ mt: 1 }}>
              <Alert severity={bulkPreview.invalid > 0 ? 'warning' : 'info'} sx={{ mb: 2 }}>
                {bulkPreview.total} row(s) found: {bulkPreview.valid} valid, {bulkPreview.invalid} with errors.
              </Alert>
              <TableContainer sx={{ maxHeight: 340 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem' }}>Row</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem' }}>Code</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem' }}>Dept</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.6875rem' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bulkPreview.rows.map((r, i) => (
                      <TableRow key={i} sx={{ bgcolor: r.errors?.length ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.row}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.first_name} {r.last_name}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.email}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{r.employee_code}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.department}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.role}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {r.errors?.length ? (
                            <Typography sx={{ fontSize: '0.6875rem', color: '#ef4444' }}>{r.errors.join(', ')}</Typography>
                          ) : (
                            <Chip label={formatStatusLabel(r.status)} size="small" sx={{ fontSize: '0.625rem', height: 20 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Box sx={{ mt: 1 }}>
              {bulkError && <Alert severity="error" sx={{ mb: 2 }}>{bulkError}</Alert>}
              <Box sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(255,122,26,0.04)' },
                transition: 'all 0.2s',
              }}
                onClick={() => document.getElementById('bulk-file-input').click()}
              >
                <input
                  id="bulk-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => { setBulkFile(e.target.files[0]); setBulkError(''); }}
                />
                <UploadFile sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {bulkFile ? bulkFile.name : 'Click to select CSV or Excel file'}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                  Required columns: email, first_name, last_name, employee_code
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  Optional: department, designation, hire_date, manager_code, status, role
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {bulkResult ? (
            <Button onClick={() => { setBulkOpen(false); loadEmployees(); }}>
              Close
            </Button>
          ) : bulkPreview ? (
            <>
              <Button onClick={() => { setBulkPreview(null); setBulkFile(null); }} disabled={bulkLoading}>Back</Button>
              <Button onClick={() => setBulkOpen(false)} disabled={bulkLoading}>Cancel</Button>
              <Button
                variant="contained" color="secondary" disabled={bulkLoading || bulkPreview.valid === 0}
                onClick={async () => {
                  setBulkLoading(true);
                  setBulkError('');
                  try {
                    const validRows = bulkPreview.rows.filter((r) => !r.errors?.length);
                    const { data } = await confirmBulkUpload({ rows: validRows });
                    setBulkResult(data);
                  } catch (err) {
                    setBulkError(err.response?.data?.error || 'Import failed.');
                  } finally {
                    setBulkLoading(false);
                  }
                }}
              >
                {bulkLoading ? 'Importing...' : `Import ${bulkPreview.valid} Employee(s)`}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setBulkOpen(false)} disabled={bulkLoading}>Cancel</Button>
              <Button
                variant="contained" color="secondary" disabled={!bulkFile || bulkLoading}
                onClick={async () => {
                  setBulkLoading(true);
                  setBulkError('');
                  try {
                    const fd = new FormData();
                    fd.append('file', bulkFile);
                    const { data } = await previewBulkUpload(fd);
                    setBulkPreview(data);
                  } catch (err) {
                    setBulkError(err.response?.data?.error || 'Failed to parse file.');
                  } finally {
                    setBulkLoading(false);
                  }
                }}
              >
                {bulkLoading ? 'Parsing...' : 'Preview & Validate'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
