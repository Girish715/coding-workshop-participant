import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, InputAdornment, Chip, Card, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { getEmployees } from '../services/api.js';

const statusCfg = {
  active: { color: '#16a34a', bg: '#f0fdf4', label: 'Active' },
  inactive: { color: '#9ca3af', bg: '#f9fafb', label: 'Inactive' },
  on_leave: { color: '#ca8a04', bg: '#fefce8', label: 'On Leave' },
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getEmployees({ search: search || undefined })
      .then(({ data }) => setEmployees(data))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Employees</Typography>
          <Typography sx={{ color: '#6b7280', mt: 0.5 }}>{employees.length} people</Typography>
        </Box>
        <TextField
          placeholder="Search by name or code..."
          size="small"
          sx={{ width: { xs: '100%', sm: 280 } }}
          value={search}
          onChange={(e) => { setLoading(true); setSearch(e.target.value); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#9ca3af', fontSize: 20 }} /></InputAdornment> }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={8}><CircularProgress size={28} /></Box>
      ) : employees.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#9ca3af' }}>No employees found.</Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((emp) => {
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
                        <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 500 }} />
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
