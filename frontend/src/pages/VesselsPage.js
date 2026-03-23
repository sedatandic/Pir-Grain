import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Pencil, Trash2, Loader2, Ship, Anchor, X } from 'lucide-react';
import { toast } from 'sonner';

export default function VesselsPage() {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState(null);
  const [form, setForm] = useState({ name: '', imoNumber: '', flag: '', builtYear: new Date().getFullYear(), vesselType: 'Bulk Carrier' });
  const [saving, setSaving] = useState(false);

  const fetchVessels = useCallback(async () => {
    try { const res = await api.get('/api/vessels'); setVessels(res.data); } catch (err) { toast.error('Failed to load vessels'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVessels(); }, [fetchVessels]);

  const filtered = useMemo(() => {
    if (!search) return vessels;
    const q = search.toLowerCase();
    return vessels.filter(v => v.name?.toLowerCase().includes(q) || v.imoNumber?.includes(q) || v.flag?.toLowerCase().includes(q));
  }, [vessels, search]);

  const stats = useMemo(() => {
    const ages = vessels.filter(v => v.builtYear).map(v => new Date().getFullYear() - v.builtYear);
    return {
      total: vessels.length,
      avgAge: ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0,
      flags: new Set(vessels.filter(v => v.flag).map(v => v.flag)).size,
    };
  }, [vessels]);

  const openCreate = () => { setEditingVessel(null); setForm({ name: '', imoNumber: '', flag: '', builtYear: new Date().getFullYear(), vesselType: 'Bulk Carrier' }); setDialogOpen(true); };
  const openEdit = (v) => { setEditingVessel(v); setForm({ name: v.name||'', imoNumber: v.imoNumber||'', flag: v.flag||'', builtYear: v.builtYear || new Date().getFullYear(), vesselType: v.vesselType||'Bulk Carrier' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.imoNumber) { toast.error('Name and IMO are required'); return; }
    setSaving(true);
    try {
      const data = { ...form, builtYear: parseInt(form.builtYear) || null };
      if (editingVessel) { await api.put(`/api/vessels/${editingVessel.id}`, data); toast.success('Vessel updated'); }
      else { await api.post('/api/vessels', data); toast.success('Vessel created'); }
      setDialogOpen(false); fetchVessels();
    } catch (err) { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/api/vessels/${id}`); toast.success('Deleted'); fetchVessels(); } catch (err) { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Vessels</h1><p className="text-muted-foreground">Manage your fleet of vessels</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Ship className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Vessels</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100"><Anchor className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{stats.avgAge} yrs</p><p className="text-xs text-muted-foreground">Average Age</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100"><span className="text-green-600 text-lg">🏳️</span></div><div><p className="text-2xl font-bold">{stats.flags}</p><p className="text-xs text-muted-foreground">Unique Flags</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search vessels..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
            {search && <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="text-destructive hover:text-destructive" data-testid="vessels-clear-filter"><X className="h-4 w-4 mr-1" />Clear</Button>}
            <div className="ml-auto"><Button onClick={openCreate} data-testid="vessels-new-button"><Plus className="mr-2 h-4 w-4" />Add Vessel</Button></div>
          </div>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead>Vessel Name</TableHead><TableHead>IMO Number</TableHead><TableHead>Type</TableHead><TableHead>Flag</TableHead><TableHead>Built Year</TableHead><TableHead>Vessel Age</TableHead><TableHead className="w-[80px]">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No vessels found</TableCell></TableRow> :
                filtered.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="font-mono text-sm">{v.imoNumber || '-'}</TableCell>
                    <TableCell><Badge variant="secondary">{v.vesselType || '-'}</Badge></TableCell>
                    <TableCell>{v.flag || '-'}</TableCell>
                    <TableCell>{v.builtYear || '-'}</TableCell>
                    <TableCell>{v.builtYear ? new Date().getFullYear() - v.builtYear : '-'}</TableCell>
                    <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingVessel ? 'Edit Vessel' : 'Add Vessel'}</DialogTitle><DialogDescription>Fill in the vessel details.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2"><Label>Vessel Name *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>IMO Number *</Label><Input value={form.imoNumber} onChange={(e) => setForm({...form, imoNumber: e.target.value})} /></div>
            <div className="space-y-2"><Label>Type</Label><Input value={form.vesselType} onChange={(e) => setForm({...form, vesselType: e.target.value})} /></div>
            <div className="space-y-2"><Label>Flag</Label><Input value={form.flag} onChange={(e) => setForm({...form, flag: e.target.value})} /></div>
            <div className="space-y-2"><Label>Built Year</Label><Input type="number" value={form.builtYear} onChange={(e) => setForm({...form, builtYear: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editingVessel ? 'Update' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
