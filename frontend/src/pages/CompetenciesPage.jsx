import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Card, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, CircularProgress, Stack, Tabs, Tab, TableSortLabel, useTheme,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import {
  getCompetencyCatalog, createCompetency, getEmployeeCompetencies,
  createEmployeeCompetency, deleteEmployeeCompetency, getEmployees,
} from '../services/api.js';


export default function CompetenciesPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [catalog, setCatalog] = useState([]);
  const [empComps, setEmpComps] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tab, setTab] = useState(0);
  const [openCat, setOpenCat] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', category: '', description: '' });
  const [assignForm, setAssignForm] = useState({ employee_id: '', competency_id: '', current_level: 1, target_level: 3 });
  const [loading, setLoading] = useState(true);
  const [assessmentFilters, setAssessmentFilters] = useState({
    employee_name: '',
    competency_name: '',
    gap: '',
  });
  const [sortField, setSortField] = useState('employee_name');
  const [sortDir, setSortDir] = useState('asc');

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

  const filteredAssessments = useMemo(() => {
    let list = [...empComps];
    if (assessmentFilters.employee_name) {
      const q = assessmentFilters.employee_name.toLowerCase();
      list = list.filter((ec) => ec.employee_name?.toLowerCase().includes(q));
    }
    if (assessmentFilters.competency_name) {
      const q = assessmentFilters.competency_name.toLowerCase();
      list = list.filter((ec) => ec.competency_name?.toLowerCase().includes(q));
    }
    if (assessmentFilters.gap === 'met') list = list.filter((ec) => ec.gap === 0);
    if (assessmentFilters.gap === 'minor') list = list.filter((ec) => ec.gap === 1);
    if (assessmentFilters.gap === 'major') list = list.filter((ec) => ec.gap >= 2);
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
  }, [empComps, assessmentFilters, sortField, sortDir]);

  const handleSort = (field) => {
    setSortDir(sortField === field && sortDir === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

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
                        <TableCell>
                          <Chip
                            label={c.category}
                            size="small"
                            sx={{
                              bgcolor: isDark ? '#2a2a2a' : '#f9fafb',
                              color: isDark ? '#d1d5db' : '#6b7280',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          />
                        </TableCell>
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
          <Typography sx={{ color: '#6b7280', mb: 1.25 }}>{filteredAssessments.length} of {empComps.length} assessments</Typography>
          <Button variant="contained" color="secondary" startIcon={<Add />} sx={{ mb: 2 }} onClick={() => setOpenAssign(true)}>Assign Competency</Button>
          {filteredAssessments.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: '#9ca3af' }}>{empComps.length === 0 ? 'No assessments found.' : 'No assessments match your filters.'}</Typography>
            </Card>
          ) : (
            <Card>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell><TableSortLabel active={sortField === 'employee_name'} direction={sortField === 'employee_name' ? sortDir : 'asc'} onClick={() => handleSort('employee_name')}>Employee</TableSortLabel></TableCell>
                    <TableCell><TableSortLabel active={sortField === 'competency_name'} direction={sortField === 'competency_name' ? sortDir : 'asc'} onClick={() => handleSort('competency_name')}>Competency</TableSortLabel></TableCell>
                    <TableCell><TableSortLabel active={sortField === 'current_level'} direction={sortField === 'current_level' ? sortDir : 'asc'} onClick={() => handleSort('current_level')}>Current</TableSortLabel></TableCell>
                    <TableCell><TableSortLabel active={sortField === 'target_level'} direction={sortField === 'target_level' ? sortDir : 'asc'} onClick={() => handleSort('target_level')}>Target</TableSortLabel></TableCell>
                    <TableCell><TableSortLabel active={sortField === 'gap'} direction={sortField === 'gap' ? sortDir : 'asc'} onClick={() => handleSort('gap')}>Gap</TableSortLabel></TableCell>
                    <TableCell width={60}></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="Employee"
                        value={assessmentFilters.employee_name}
                        onChange={(e) => setAssessmentFilters((prev) => ({ ...prev, employee_name: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        placeholder="Competency"
                        value={assessmentFilters.competency_name}
                        onChange={(e) => setAssessmentFilters((prev) => ({ ...prev, competency_name: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={assessmentFilters.gap}
                        onChange={(e) => setAssessmentFilters((prev) => ({ ...prev, gap: e.target.value }))}
                        sx={{ minWidth: 130 }}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="met">Met</MenuItem>
                        <MenuItem value="minor">Minor</MenuItem>
                        <MenuItem value="major">Major</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell />
                  </TableRow></TableHead>
                  <TableBody>
                    {filteredAssessments.map((ec) => (
                      <TableRow key={ec.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{ec.employee_name}</TableCell>
                        <TableCell>{ec.competency_name}</TableCell>
                        <TableCell>{ec.current_level}</TableCell>
                        <TableCell>{ec.target_level}</TableCell>
                        <TableCell>
                          <Chip
                            label={ec.gap === 0 ? 'Met' : `-${ec.gap}`}
                            size="small"
                            sx={{
                              bgcolor: isDark
                                ? (ec.gap >= 2 ? '#4b1f24' : ec.gap >= 1 ? '#4b3416' : '#103a30')
                                : (ec.gap >= 2 ? '#fef2f2' : ec.gap >= 1 ? '#fefce8' : '#f0fdf4'),
                              color: isDark
                                ? (ec.gap >= 2 ? '#ff9aa8' : ec.gap >= 1 ? '#ffd089' : '#7af2d8')
                                : (ec.gap >= 2 ? '#dc2626' : ec.gap >= 1 ? '#ca8a04' : '#16a34a'),
                              fontWeight: 600,
                            }}
                          />
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
          )}
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
