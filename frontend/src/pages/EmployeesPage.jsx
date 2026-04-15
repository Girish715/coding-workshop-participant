import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, InputAdornment, Chip, Card, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, CircularProgress, MenuItem,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { getEmployees } from '../services/api.js';

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
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('full_name');
  const [sortDir, setSortDir] = useState('asc');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getEmployees({ search: search || undefined })
      .then(({ data }) => setEmployees(data))
      .finally(() => setLoading(false));
  }, [search]);

  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))].sort(), [employees]);

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
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
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
    </Box>
  );
}
