import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, CircularProgress, Stack, Tabs, Tab,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import {
  getCompetencyCatalog, createCompetency, getEmployeeCompetencies,
  createEmployeeCompetency, deleteEmployeeCompetency, getEmployees,
} from '../services/api.js';


export default function CompetenciesPage() {
  const [catalog, setCatalog] = useState([]);
  const [empComps, setEmpComps] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tab, setTab] = useState(0);
  const [openCat, setOpenCat] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', category: '', description: '' });
  const [assignForm, setAssignForm] = useState({ employee_id: '', competency_id: '', current_level: 1, target_level: 3 });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getCompetencyCatalog(), getEmployeeCompetencies(), getEmployees()])
      .then(([c, ec, e]) => { setCatalog(c.data); setEmpComps(ec.data); setEmployees(e.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const saveCat = async () => { await createCompetency(catForm); setOpenCat(false); setCatForm({ name: '', category: '', description: '' }); load(); };
  const saveAssign = async () => { await createEmployeeCompetency(assignForm); setOpenAssign(false); load(); };
  const handleDeleteEC = async (id) => { if (window.confirm('Remove?')) { await deleteEmployeeCompetency(id); load(); } };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress size={28} /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h4">Competencies</Typography>
        <Typography sx={{ color: '#6b7280', mt: 0.5 }}>Skill catalog and employee assessments</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="secondary" indicatorColor="secondary" sx={{
        mb: 2, borderBottom: '1px solid #e2e8f0',
      }}>
        <Tab label={`Catalog (${catalog.length})`} />
        <Tab label={`Assessments (${empComps.length})`} />
      </Tabs>

      {tab === 0 && (
        <>
          <Button variant="contained" color="secondary" startIcon={<Add />} sx={{ mb: 2 }} onClick={() => setOpenCat(true)}>Add Competency</Button>
          {catalog.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#9ca3af' }}>No competencies defined yet.</Typography>
            </Card>
          ) : (
            <Card>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell>Name</TableCell><TableCell>Category</TableCell><TableCell>Description</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {catalog.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                        <TableCell><Chip label={c.category} size="small" sx={{ bgcolor: '#f9fafb', textTransform: 'capitalize' }} /></TableCell>
                        <TableCell sx={{ color: '#6b7280' }}>{c.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      )}

      {tab === 1 && (
        <>
          <Button variant="contained" color="secondary" startIcon={<Add />} sx={{ mb: 2 }} onClick={() => setOpenAssign(true)}>Assign Competency</Button>
          <Card>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>Employee</TableCell><TableCell>Competency</TableCell><TableCell>Current</TableCell>
                  <TableCell>Target</TableCell><TableCell>Gap</TableCell><TableCell width={60}></TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {empComps.map((ec) => (
                    <TableRow key={ec.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{ec.employee_name}</TableCell>
                      <TableCell>{ec.competency_name}</TableCell>
                      <TableCell>{ec.current_level}</TableCell>
                      <TableCell>{ec.target_level}</TableCell>
                      <TableCell>
                        <Chip label={ec.gap === 0 ? 'Met' : `-${ec.gap}`} size="small" sx={{
                          bgcolor: ec.gap >= 2 ? '#fef2f2' : ec.gap >= 1 ? '#fefce8' : '#f0fdf4',
                          color: ec.gap >= 2 ? '#dc2626' : ec.gap >= 1 ? '#ca8a04' : '#16a34a', fontWeight: 600,
                        }} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleDeleteEC(ec.id)} sx={{ color: '#dc2626' }}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      <Dialog open={openCat} onClose={() => setOpenCat(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>Add competency</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField label="Name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} size="small" />
            <TextField label="Category" value={catForm.category} onChange={(e) => setCatForm({ ...catForm, category: e.target.value })} size="small" placeholder="e.g. technical, leadership" />
            <TextField label="Description" multiline rows={2} value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} size="small" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCat(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={saveCat}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, pb: 0 }}>Assign competency</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Employee" value={assignForm.employee_id} onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })} size="small">
              {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
            </TextField>
            <TextField select label="Competency" value={assignForm.competency_id} onChange={(e) => setAssignForm({ ...assignForm, competency_id: e.target.value })} size="small">
              {catalog.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Current Level (1-5)" type="number" inputProps={{ min: 1, max: 5 }} value={assignForm.current_level} onChange={(e) => setAssignForm({ ...assignForm, current_level: parseInt(e.target.value) })} size="small" fullWidth />
              <TextField label="Target Level (1-5)" type="number" inputProps={{ min: 1, max: 5 }} value={assignForm.target_level} onChange={(e) => setAssignForm({ ...assignForm, target_level: parseInt(e.target.value) })} size="small" fullWidth />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAssign(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={saveAssign}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
