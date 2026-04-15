import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Rating, IconButton, CircularProgress, Stack,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { getReviews, createReview, updateReview, deleteReview, getEmployees } from '../services/api.js';

const EMPTY = {
  employee_id: '', reviewer_id: '', review_period: '', overall_rating: 3,
  strengths: '', areas_for_improvement: '', goals_met: '', comments: '',
  status: 'draft', promotion_ready: false, attrition_risk: 'low',
};
const riskCfg = { high: { c: '#dc2626', b: '#fef2f2' }, medium: { c: '#ca8a04', b: '#fefce8' }, low: { c: '#16a34a', b: '#f0fdf4' } };
const statusCfg = { draft: { c: '#9ca3af', b: '#f9fafb' }, submitted: { c: '#3b82f6', b: '#eff6ff' }, approved: { c: '#16a34a', b: '#f0fdf4' } };

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getReviews(), getEmployees()])
      .then(([r, e]) => { setReviews(r.data); setEmployees(e.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Reviews</Typography>
          <Typography sx={{ color: '#6b7280', mt: 0.5 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Typography>
        </Box>
        <Button variant="contained" color="secondary" startIcon={<Add />} onClick={() => handleOpen()}>New Review</Button>
      </Box>

      {reviews.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#9ca3af' }}>No reviews yet.</Typography>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead><TableRow>
                <TableCell>Employee</TableCell><TableCell>Period</TableCell><TableCell>Rating</TableCell>
                <TableCell>Reviewer</TableCell><TableCell>Status</TableCell><TableCell>Risk</TableCell><TableCell width={100}>Actions</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {reviews.map((r) => {
                  const rc = riskCfg[r.attrition_risk] || riskCfg.low;
                  const sc = statusCfg[r.status] || statusCfg.draft;
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.employee_name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', color: '#6b7280' }}>{r.review_period}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 700 }}>{r.overall_rating}</Typography>
                          <Rating value={r.overall_rating} precision={0.1} readOnly size="small" />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: '#6b7280' }}>{r.reviewer_name}</TableCell>
                      <TableCell><Chip label={r.status} size="small" sx={{ bgcolor: sc.b, color: sc.c, fontWeight: 500, textTransform: 'capitalize' }} /></TableCell>
                      <TableCell><Chip label={r.attrition_risk} size="small" sx={{ bgcolor: rc.b, color: rc.c, fontWeight: 500, textTransform: 'capitalize' }} /></TableCell>
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
