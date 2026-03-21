import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, Ship } from 'lucide-react';
import { toast } from 'sonner';

const emptyVessel = { name: '', imo: '', flag: '', dwt: '', built: '', vesselType: '' };

export default function VesselsPage() {
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState(null);
  const [deletingVessel, setDeletingVessel] = useState(null);
  const [form, setForm] = useState(emptyVessel);
  const [saving, setSaving] = useState(false);

  const fetchVessels = useCallback(async () => {
    try {
      const params = search ? { search } : {};
      const res = await api.get('/api/vessels', { params });
      setVessels(res.data);
    } catch (err) {
      toast.error('Failed to load vessels');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchVessels(); }, [fetchVessels]);

  const openCreate = () => { setEditingVessel(null); setForm(emptyVessel); setDialogOpen(true); };
  const openEdit = (v) => {
    setEditingVessel(v);
    setForm({ name: v.name||'', imo: v.imo||'', flag: v.flag||'', dwt: v.dwt||'', built: v.built||'', vesselType: v.vesselType||'' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vessel name is required'); return; }
    setSaving(true);
    try {
      const data = { ...form, dwt: form.dwt ? parseFloat(form.dwt) : null };
      if (editingVessel) {
        await api.put(`/api/vessels/${editingVessel.id}`, data);
        toast.success('Vessel updated');
      } else {
        await api.post('/api/vessels', data);
        toast.success('Vessel created');
      }
      setDialogOpen(false); fetchVessels();
    } catch (err) { toast.error('Failed to save vessel'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deletingVessel) return;
    try {
      await api.delete(`/api/vessels/${deletingVessel.id}`);
      toast.success('Vessel deleted'); setDeleteDialogOpen(false); fetchVessels();
    } catch (err) { toast.error('Failed to delete vessel'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vessels</h1>
          <p className="text-slate-500 text-sm">Manage your fleet</p>
        </div>
        <Button onClick={openCreate} className="bg-[#0e7490] hover:bg-[#155e75]" data-testid="vessels-new-button">
          <Plus className="w-4 h-4 mr-2" /> Add Vessel
        </Button>
      </div>
      <Card className="shadow-sm"><CardContent className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search vessels..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </CardContent></Card>
      <div className="data-table">
        <Table>
          <TableHeader><TableRow className="bg-slate-50">
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">IMO</TableHead>
            <TableHead className="font-semibold">Flag</TableHead>
            <TableHead className="font-semibold">DWT</TableHead>
            <TableHead className="font-semibold">Built</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : vessels.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">
                <Ship className="w-8 h-8 mx-auto mb-2 text-slate-300" /> No vessels found
              </TableCell></TableRow>
            ) : vessels.map((v) => (
              <TableRow key={v.id} className="hover:bg-slate-50/70">
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="font-mono text-sm">{v.imo || '-'}</TableCell>
                <TableCell>{v.flag || '-'}</TableCell>
                <TableCell className="tabular-nums">{v.dwt ? v.dwt.toLocaleString() : '-'}</TableCell>
                <TableCell>{v.built || '-'}</TableCell>
                <TableCell>{v.vesselType || '-'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(v)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => { setDeletingVessel(v); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingVessel ? 'Edit Vessel' : 'New Vessel'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>IMO</Label><Input value={form.imo} onChange={(e) => setForm({...form, imo: e.target.value})} /></div>
            <div className="space-y-2"><Label>Flag</Label><Input value={form.flag} onChange={(e) => setForm({...form, flag: e.target.value})} /></div>
            <div className="space-y-2"><Label>DWT</Label><Input type="number" value={form.dwt} onChange={(e) => setForm({...form, dwt: e.target.value})} /></div>
            <div className="space-y-2"><Label>Built</Label><Input value={form.built} onChange={(e) => setForm({...form, built: e.target.value})} placeholder="e.g. 2020" /></div>
            <div className="col-span-2 space-y-2"><Label>Type</Label><Input value={form.vesselType} onChange={(e) => setForm({...form, vesselType: e.target.value})} placeholder="e.g. Bulk Carrier" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0e7490] hover:bg-[#155e75]">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingVessel ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Vessel</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {deletingVessel?.name}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
