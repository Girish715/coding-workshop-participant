import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Grid, Chip, LinearProgress, IconButton,
  CircularProgress, Stack,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { getDevPlans, createDevPlan, updateDevPlan, deleteDevPlan, getEmployees } from '../services/api.js';

const EMPTY = { employee_id: '', title: '', description: '', goal_type: 'skill', target_date: '', status: 'not_started', progress_pct: 0 };
const GOAL_TYPES = ['career', 'skill', 'leadership', 'technical'];
const STATUSES = ['not_started', 'in_progress', 'completed', 'on_hold'];
const statusCfg = { completed: { c: '#16a34a', b: '#f0fdf4' }, in_progress: { c: '#3b82f6', b: '#eff6ff' }, not_started: { c: '#9ca3af', b: '#f9fafb' }, on_hold: { c: '#ca8a04', b: '#fefce8' } };

export default function DevPlansPage() {
  const [plans, setPlans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getDevPlans(), getEmployees()])
      .then(([p, e]) => { setPlans(p.data); setEmployees(e.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleOpen = (plan = null) => {
    if (plan) { setEditId(plan.id); setForm({ ...plan }); }
    else { setEditId(null); setForm(EMPTY); }
    setOpen(true);
  };
  const handleSave = async () => {
    if (editId) await updateDevPlan(editId, form);
    else await createDevPlan(form);
    setOpen(false); load();
  };
  const handleDelete = async (id) => { if (window.confirm('Delete this plan?')) { await deleteDevPlan(id); load(); } };
  const f = (field) => ({ value: form[field] ?? '', onChange: (e) => setForm({ ...form, [field]: e.target.value }) });

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress size={28} /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4">Dev Plans</Typography>
          <Typography sx={{ color: '#6b7280', mt: 0.5 }}>{plans.length} plan{plans.length !== 1 ? 's' : ''}</Typography>
        </Box>
        <Button variant="contained" color="secondary" startIcon={<Add />} onClick={() => handleOpen()}>New Plan</Button>
      </Box>

      {plans.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#9ca3af' }}>No plans yet.</Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {plans.map((p) => {
            const stc = statusCfg[p.status] || statusCfg.not_started;
            return (
              <Grid item xs={12} sm={6} lg={4} key={p.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>{p.title}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.3 }}>
                        <IconButton size="small" onClick={() => handleOpen(p)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(p.id)} sx={{ color: '#dc2626' }}><Delete sx={{ fontSize: 16 }} /></IconButton>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', mb: 0.5 }}>{p.employee_name}</Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#6b7280', mb: 1.5, lineHeight: 1.5 }}>{p.description}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                      <Chip label={p.goal_type} size="small" sx={{ bgcolor: '#f9fafb', textTransform: 'capitalize' }} />
                      <Chip label={p.status.replace('_', ' ')} size="small" sx={{ bgcolor: stc.b, color: stc.c, fontWeight: 500, textTransform: 'capitalize' }} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>Progress</Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{p.progress_pct}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={p.progress_pct} sx={{ height: 4, borderRadius: 2, bgcolor: '#f3f4f6' }} />
                    {p.target_date && <Typography sx={{ fontSize: '0.6875rem', color: '#9ca3af', mt: 1 }}>Target: {p.target_date}</Typography>}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>{editId ? 'Edit plan' : 'New plan'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Employee" {...f('employee_id')} size="small">
              {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
            </TextField>
            <TextField label="Title" {...f('title')} size="small" />
            <TextField label="Description" multiline rows={2} {...f('description')} size="small" />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField select label="Goal Type" {...f('goal_type')} size="small" fullWidth>
                {GOAL_TYPES.map((g) => <MenuItem key={g} value={g} sx={{ textTransform: 'capitalize' }}>{g}</MenuItem>)}
              </TextField>
              <TextField select label="Status" {...f('status')} size="small" fullWidth>
                {STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Target Date" type="date" InputLabelProps={{ shrink: true }} {...f('target_date')} size="small" fullWidth />
              <TextField label="Progress %" type="number" inputProps={{ min: 0, max: 100 }} {...f('progress_pct')} size="small" fullWidth />
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
