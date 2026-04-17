import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Card, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, CircularProgress, Stack, TableSortLabel, useTheme,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { getTraining, createTraining, updateTraining, deleteTraining, getEmployees } from '../services/api.js';

const EMPTY = { employee_id: '', training_name: '', provider: '', training_type: 'course', start_date: '', end_date: '', status: 'enrolled', score: '' };
const TYPES = ['course', 'workshop', 'certification', 'mentoring'];
const STATUSES = ['enrolled', 'in_progress', 'completed', 'dropped'];
const statusCfg = {
  enrolled: { c: '#3b82f6', b: '#eff6ff', dc: '#9fcbff', db: '#1f304b' },
  in_progress: { c: '#3b82f6', b: '#eff6ff', dc: '#9fcbff', db: '#1f304b' },
  completed: { c: '#10b981', b: '#ecfdf5', dc: '#7af2d8', db: '#103a30' },
  dropped: { c: '#ef4444', b: '#fef2f2', dc: '#ff9aa8', db: '#4b1f24' },
};

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}


export default function TrainingPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    employee_name: '',
    training_name: '',
    provider: '',
    training_type: '',
    status: '',
  });
  const [sortField, setSortField] = useState('employee_name');
  const [sortDir, setSortDir] = useState('asc');

  const load = () => {
    setLoading(true);
    Promise.all([getTraining(), getEmployees()])
      .then(([t, e]) => { setRecords(t.data); setEmployees(e.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleOpen = (rec = null) => {
    if (rec) { setEditId(rec.id); setForm({ ...rec }); }
    else { setEditId(null); setForm(EMPTY); }
    setOpen(true);
  };
  const handleSave = async () => {
    const payload = { ...form, score: form.score ? parseFloat(form.score) : null };
    if (editId) await updateTraining(editId, payload);
    else await createTraining(payload);
    setOpen(false); load();
  };
  const handleDelete = async (id) => { if (window.confirm('Delete?')) { await deleteTraining(id); load(); } };
  const f = (field) => ({ value: form[field] ?? '', onChange: (e) => setForm({ ...form, [field]: e.target.value }) });

  const filtered = useMemo(() => {
    let list = [...records];
    if (columnFilters.employee_name) {
      const q = columnFilters.employee_name.toLowerCase();
      list = list.filter((r) => r.employee_name?.toLowerCase().includes(q));
    }
    if (columnFilters.training_name) {
      const q = columnFilters.training_name.toLowerCase();
      list = list.filter((r) => r.training_name?.toLowerCase().includes(q));
    }
    if (columnFilters.provider) {
      const q = columnFilters.provider.toLowerCase();
      list = list.filter((r) => (r.provider || '').toLowerCase().includes(q));
    }
    if (columnFilters.training_type) list = list.filter((r) => r.training_type === columnFilters.training_type);
    if (columnFilters.status) list = list.filter((r) => r.status === columnFilters.status);
    list.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? `${av ?? ''}`.localeCompare(`${bv ?? ''}`)
        : `${bv ?? ''}`.localeCompare(`${av ?? ''}`);
    });
    return list;
  }, [records, columnFilters, sortField, sortDir]);

  const handleSort = (field) => {
    setSortDir(sortField === field && sortDir === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress size={28} /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Training</Typography>
          <Typography sx={{ color: '#6b7280', mt: 0.5 }}>{filtered.length} of {records.length} record{records.length !== 1 ? 's' : ''}</Typography>
        </Box>
        <Button variant="contained" color="secondary" startIcon={<Add />} onClick={() => handleOpen()}>New Record</Button>
      </Box>

      {filtered.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#9ca3af' }}>{records.length === 0 ? 'No training records yet.' : 'No records match your filters.'}</Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead><TableRow>
                <TableCell><TableSortLabel active={sortField === 'employee_name'} direction={sortField === 'employee_name' ? sortDir : 'asc'} onClick={() => handleSort('employee_name')}>Employee</TableSortLabel></TableCell>
                <TableCell><TableSortLabel active={sortField === 'training_name'} direction={sortField === 'training_name' ? sortDir : 'asc'} onClick={() => handleSort('training_name')}>Training</TableSortLabel></TableCell>
                <TableCell><TableSortLabel active={sortField === 'provider'} direction={sortField === 'provider' ? sortDir : 'asc'} onClick={() => handleSort('provider')}>Provider</TableSortLabel></TableCell>
                <TableCell><TableSortLabel active={sortField === 'training_type'} direction={sortField === 'training_type' ? sortDir : 'asc'} onClick={() => handleSort('training_type')}>Type</TableSortLabel></TableCell>
                <TableCell><TableSortLabel active={sortField === 'status'} direction={sortField === 'status' ? sortDir : 'asc'} onClick={() => handleSort('status')}>Status</TableSortLabel></TableCell>
                <TableCell><TableSortLabel active={sortField === 'score'} direction={sortField === 'score' ? sortDir : 'asc'} onClick={() => handleSort('score')}>Score</TableSortLabel></TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Employee"
                    value={columnFilters.employee_name}
                    onChange={(e) => setColumnFilters((prev) => ({ ...prev, employee_name: e.target.value }))}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Training"
                    value={columnFilters.training_name}
                    onChange={(e) => setColumnFilters((prev) => ({ ...prev, training_name: e.target.value }))}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    placeholder="Provider"
                    value={columnFilters.provider}
                    onChange={(e) => setColumnFilters((prev) => ({ ...prev, provider: e.target.value }))}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={columnFilters.training_type}
                    onChange={(e) => setColumnFilters((prev) => ({ ...prev, training_type: e.target.value }))}
                    sx={{ minWidth: 130 }}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) => value ? toTitleCase(value) : 'All Types',
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    {TYPES.map((type) => <MenuItem key={type} value={type}>{toTitleCase(type)}</MenuItem>)}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    value={columnFilters.status}
                    onChange={(e) => setColumnFilters((prev) => ({ ...prev, status: e.target.value }))}
                    sx={{ minWidth: 130 }}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (value) => value ? toTitleCase(value) : 'All Statuses',
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    {STATUSES.map((status) => <MenuItem key={status} value={status}>{toTitleCase(status)}</MenuItem>)}
                  </TextField>
                </TableCell>
                <TableCell />
                <TableCell />
              </TableRow></TableHead>
              <TableBody>
                {filtered.map((r) => {
                  const stc = statusCfg[r.status] || statusCfg.enrolled;
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.employee_name}</TableCell>
                      <TableCell>{r.training_name}</TableCell>
                      <TableCell sx={{ color: '#6b7280' }}>{r.provider || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.training_type}
                          size="small"
                          sx={{
                            bgcolor: isDark ? '#2a2a2a' : '#f9fafb',
                            color: isDark ? '#d1d5db' : '#6b7280',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.status.replace('_', ' ')}
                          size="small"
                          sx={{
                            bgcolor: isDark ? stc.db : stc.b,
                            color: isDark ? stc.dc : stc.c,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {r.score != null ? (
                          <Typography sx={{ fontWeight: 600, color: r.score >= 90 ? '#16a34a' : r.score >= 70 ? '#ca8a04' : '#dc2626' }}>{r.score}%</Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => handleOpen(r)}><Edit fontSize="small" /></IconButton>
                          <IconButton size="small" onClick={() => handleDelete(r.id)} sx={{ color: '#dc2626' }}><Delete fontSize="small" /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>{editId ? 'Edit training' : 'New training'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Employee" {...f('employee_id')} size="small">
              {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
            </TextField>
            <TextField label="Training Name" {...f('training_name')} size="small" />
            <TextField label="Provider" {...f('provider')} size="small" />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField select label="Type" {...f('training_type')} size="small" fullWidth>
                {TYPES.map((t) => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
              </TextField>
              <TextField select label="Status" {...f('status')} size="small" fullWidth>
                {STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Start Date" type="date" InputLabelProps={{ shrink: true }} {...f('start_date')} size="small" fullWidth />
              <TextField label="End Date" type="date" InputLabelProps={{ shrink: true }} {...f('end_date')} size="small" fullWidth />
            </Box>
            <TextField label="Score (%)" type="number" inputProps={{ min: 0, max: 100 }} {...f('score')} size="small" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
