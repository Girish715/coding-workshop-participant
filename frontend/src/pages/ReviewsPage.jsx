import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Card, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Chip, Rating, IconButton, CircularProgress, Stack, useTheme,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { getReviews, createReview, updateReview, deleteReview, getEmployees } from '../services/api.js';

const EMPTY = {
  employee_id: '', reviewer_id: '', review_period: '', overall_rating: 3,
  strengths: '', areas_for_improvement: '', goals_met: '', comments: '',
  status: 'draft', promotion_ready: false, attrition_risk: 'low',
};
const riskCfg = {
  high: { c: '#dc2626', b: '#fef2f2', dc: '#ff9aa8', db: '#4b1f24' },
  medium: { c: '#ca8a04', b: '#fefce8', dc: '#ffd089', db: '#4b3416' },
  low: { c: '#16a34a', b: '#f0fdf4', dc: '#7af2d8', db: '#103a30' },
};
const statusCfg = {
  draft: { c: '#6b7280', b: '#f3f4f6', dc: '#d1d5db', db: '#2a2a2a' },
  submitted: { c: '#3b82f6', b: '#eff6ff', dc: '#9fcbff', db: '#1f304b' },
  approved: { c: '#16a34a', b: '#f0fdf4', dc: '#7af2d8', db: '#103a30' },
};

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ReviewsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState({
    employee_name: '',
    review_period: '',
    reviewer_name: '',
    status: '',
    attrition_risk: '',
  });
  const [sortField, setSortField] = useState('review_period');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([getReviews(), getEmployees()])
      .then(([r, e]) => { setReviews(r.data); setEmployees(e.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filteredByDetail = useMemo(() => {
    let list = [...reviews];
    if (columnFilters.review_period) {
      const q = columnFilters.review_period.toLowerCase();
      list = list.filter((r) => r.review_period?.toLowerCase().includes(q));
    }
    if (columnFilters.reviewer_name) {
      const q = columnFilters.reviewer_name.toLowerCase();
      list = list.filter((r) => r.reviewer_name?.toLowerCase().includes(q));
    }
    if (columnFilters.status) list = list.filter((r) => r.status === columnFilters.status);
    if (columnFilters.attrition_risk) list = list.filter((r) => r.attrition_risk === columnFilters.attrition_risk);
    list.sort((a, b) => {
      const av = (a[sortField] ?? '').toString().toLowerCase();
      const bv = (b[sortField] ?? '').toString().toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [reviews, columnFilters.review_period, columnFilters.reviewer_name, columnFilters.status, columnFilters.attrition_risk, sortField, sortDir]);

  const employeeGroups = useMemo(() => {
    const map = new Map();
    filteredByDetail.forEach((review) => {
      const name = review.employee_name || 'Unknown';
      if (!map.has(name)) map.set(name, { count: 0, ratingSum: 0 });
      const next = map.get(name);
      next.count += 1;
      next.ratingSum += Number(review.overall_rating || 0);
      map.set(name, next);
    });

    const q = columnFilters.employee_name.trim().toLowerCase();
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgRating: data.count ? Number((data.ratingSum / data.count).toFixed(2)) : 0,
      }))
      .filter((entry) => !q || entry.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredByDetail, columnFilters.employee_name]);

  useEffect(() => {
    if (employeeGroups.length === 0) {
      setSelectedEmployeeName('');
      return;
    }
    if (!employeeGroups.some((entry) => entry.name === selectedEmployeeName)) {
      setSelectedEmployeeName(employeeGroups[0].name);
    }
  }, [employeeGroups, selectedEmployeeName]);

  const filtered = useMemo(() => {
    if (!selectedEmployeeName) return [];
    return filteredByDetail.filter((review) => (review.employee_name || 'Unknown') === selectedEmployeeName);
  }, [filteredByDetail, selectedEmployeeName]);

  const handleSort = (field) => {
    setSortDir(sortField === field && sortDir === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const handleOpen = (review = null) => {
    if (review) { setEditId(review.id); setForm({ ...review }); }
    else { setEditId(null); setForm(EMPTY); }
    setOpen(true);
  };
  const handleSave = async () => {
    if (editId) await updateReview(editId, form);
    else await createReview(form);
    setOpen(false); load();
  };
  const handleDelete = async (id) => { if (window.confirm('Delete this review?')) { await deleteReview(id); load(); } };
  const f = (field) => ({ value: form[field] ?? '', onChange: (e) => setForm({ ...form, [field]: e.target.value }) });

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress size={28} /></Box>;

  const cols = [
    { id: 'review_period', label: 'Period' },
    { id: 'overall_rating', label: 'Rating' }, { id: 'reviewer_name', label: 'Reviewer' },
    { id: 'status', label: 'Status' }, { id: 'attrition_risk', label: 'Risk' },
  ];

  const selectedEmployeeMeta = employeeGroups.find((entry) => entry.name === selectedEmployeeName);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Reviews</Typography>
          <Typography sx={{ color: '#6b7280', mt: 0.5 }}>
            {selectedEmployeeName ? `${filtered.length} review${filtered.length !== 1 ? 's' : ''} for ${selectedEmployeeName}` : 'Select an employee to view reviews'}
          </Typography>
        </Box>
        <Button variant="contained" color="secondary" startIcon={<Add />} onClick={() => handleOpen()}>New Review</Button>
      </Box>

      {employeeGroups.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#9ca3af' }}>No reviews found for current filters.</Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' } }}>
          <Card sx={{ p: 2, height: 'fit-content' }}>
            <Typography sx={{ fontWeight: 700, mb: 1.25 }}>Employees</Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search employee name"
              value={columnFilters.employee_name}
              onChange={(e) => setColumnFilters((prev) => ({ ...prev, employee_name: e.target.value }))}
              sx={{ mb: 1.25 }}
            />
            <Box sx={{ maxHeight: 460, overflowY: 'auto', border: (themeObj) => `1px solid ${themeObj.palette.divider}`, borderRadius: 2 }}>
              {employeeGroups.map((entry) => (
                <Button
                  key={entry.name}
                  onClick={() => setSelectedEmployeeName(entry.name)}
                  variant="text"
                  color="inherit"
                  sx={{
                    width: '100%',
                    justifyContent: 'space-between',
                    borderRadius: 0,
                    px: 1.5,
                    py: 1.2,
                    textTransform: 'none',
                    borderBottom: (themeObj) => `1px solid ${themeObj.palette.divider}`,
                    bgcolor: selectedEmployeeName === entry.name ? (themeObj) => (themeObj.palette.mode === 'dark' ? 'rgba(255,122,26,0.12)' : 'rgba(255,122,26,0.08)') : 'transparent',
                  }}
                >
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{entry.name}</Typography>
                    <Typography sx={{ color: '#6b7280', fontSize: '0.75rem' }}>{entry.count} reviews</Typography>
                  </Box>
                  <Chip label={`Avg ${entry.avgRating}`} size="small" />
                </Button>
              ))}
            </Box>
          </Card>

          <Card>
            <Box sx={{ px: 2, pt: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{selectedEmployeeName}</Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.8125rem', mt: 0.25 }}>
                {selectedEmployeeMeta ? `${selectedEmployeeMeta.count} review${selectedEmployeeMeta.count !== 1 ? 's' : ''} · average rating ${selectedEmployeeMeta.avgRating}` : ''}
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead><TableRow>
                  {cols.map((col) => (
                    <TableCell key={col.id}>
                      <TableSortLabel active={sortField === col.id} direction={sortField === col.id ? sortDir : 'asc'} onClick={() => handleSort(col.id)}>
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell width={100}>Actions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="Search review period"
                      value={columnFilters.review_period}
                      onChange={(e) => setColumnFilters((prev) => ({ ...prev, review_period: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="Search reviewer name"
                      value={columnFilters.reviewer_name}
                      onChange={(e) => setColumnFilters((prev) => ({ ...prev, reviewer_name: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={columnFilters.status}
                      onChange={(e) => setColumnFilters((prev) => ({ ...prev, status: e.target.value }))}
                      sx={{ minWidth: 120 }}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => value ? toTitleCase(value) : 'All Statuses',
                      }}
                    >
                      <MenuItem value="">All</MenuItem>
                        {Object.keys(statusCfg).map((status) => <MenuItem key={status} value={status}>{toTitleCase(status)}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      size="small"
                      value={columnFilters.attrition_risk}
                      onChange={(e) => setColumnFilters((prev) => ({ ...prev, attrition_risk: e.target.value }))}
                      sx={{ minWidth: 110 }}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (value) => value ? toTitleCase(value) : 'All Risks',
                      }}
                    >
                      <MenuItem value="">All</MenuItem>
                        {Object.keys(riskCfg).map((risk) => <MenuItem key={risk} value={risk}>{toTitleCase(risk)}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell />
                </TableRow></TableHead>
                <TableBody>
                  {filtered.map((r) => {
                  const rc = riskCfg[r.attrition_risk] || riskCfg.low;
                  const sc = statusCfg[r.status] || statusCfg.draft;
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', color: '#6b7280' }}>{r.review_period}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 700 }}>{r.overall_rating}</Typography>
                          <Rating value={r.overall_rating} precision={0.1} readOnly size="small" />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#6b7280' }}>{r.reviewer_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.status}
                          size="small"
                          sx={{
                            bgcolor: isDark ? sc.db : sc.b,
                            color: isDark ? sc.dc : sc.c,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.attrition_risk}
                          size="small"
                          sx={{
                            bgcolor: isDark ? rc.db : rc.b,
                            color: isDark ? rc.dc : rc.c,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        />
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
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>{editId ? 'Edit review' : 'New review'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Employee" {...f('employee_id')} size="small">
              {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
            </TextField>
            <TextField select label="Reviewer" {...f('reviewer_id')} size="small">
              {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
            </TextField>
            <TextField label="Review Period" placeholder="e.g. 2025-H1" {...f('review_period')} size="small" />
            <TextField label="Overall Rating (1-5)" type="number" inputProps={{ min: 1, max: 5, step: 0.1 }} {...f('overall_rating')} size="small" />
            <TextField label="Strengths" multiline rows={2} {...f('strengths')} size="small" />
            <TextField label="Areas for Improvement" multiline rows={2} {...f('areas_for_improvement')} size="small" />
            <TextField label="Goals Met" multiline rows={2} {...f('goals_met')} size="small" />
            <TextField label="Comments" multiline rows={2} {...f('comments')} size="small" />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField select label="Status" {...f('status')} size="small" fullWidth>
                {['draft', 'submitted', 'approved'].map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
              </TextField>
              <TextField select label="Attrition Risk" {...f('attrition_risk')} size="small" fullWidth>
                {['low', 'medium', 'high'].map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>)}
              </TextField>
            </Box>
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
