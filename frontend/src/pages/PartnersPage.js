import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyPartner = {
  companyName: '', contactPerson: '', address: '', city: '',
  country: '', email: '', phone: '', type: 'buyer',
};

const typeLabels = {
  buyer: 'Buyer', seller: 'Seller', 'co-broker': 'Co-Broker',
};
const typeColors = {
  buyer: 'bg-blue-100 text-blue-800',
  seller: 'bg-emerald-100 text-emerald-800',
  'co-broker': 'bg-purple-100 text-purple-800',
};

export default function PartnersPage({ type: propType }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [deletingPartner, setDeletingPartner] = useState(null);
  const [form, setForm] = useState({ ...emptyPartner, type: propType || 'buyer' });
  const [saving, setSaving] = useState(false);

  const location = useLocation();
  const filterType = propType || null;

  const pageTitle = filterType ? typeLabels[filterType] + 's' : 'All Counterparties';

  const fetchPartners = useCallback(async () => {
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (search) params.search = search;
      const res = await api.get('/api/partners', { params });
      setPartners(res.data);
    } catch (err) {
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [filterType, search]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const openCreate = () => {
    setEditingPartner(null);
    setForm({ ...emptyPartner, type: filterType || 'buyer' });
    setDialogOpen(true);
  };

  const openEdit = (partner) => {
    setEditingPartner(partner);
    setForm({
      companyName: partner.companyName || '',
      contactPerson: partner.contactPerson || '',
      address: partner.address || '',
      city: partner.city || '',
      country: partner.country || '',
      email: partner.email || '',
      phone: partner.phone || '',
      type: partner.type || 'buyer',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingPartner) {
        await api.put(`/api/partners/${editingPartner.id}`, form);
        toast.success('Partner updated');
      } else {
        await api.post('/api/partners', form);
        toast.success('Partner created');
      }
      setDialogOpen(false);
      fetchPartners();
    } catch (err) {
      toast.error('Failed to save partner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPartner) return;
    try {
      await api.delete(`/api/partners/${deletingPartner.id}`);
      toast.success('Partner deleted');
      setDeleteDialogOpen(false);
      fetchPartners();
    } catch (err) {
      toast.error('Failed to delete partner');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
          <p className="text-slate-500 text-sm">Manage your trading partners</p>
        </div>
        <Button onClick={openCreate} className="bg-[#0e7490] hover:bg-[#155e75]" data-testid="partners-new-button">
          <Plus className="w-4 h-4 mr-2" /> Add Partner
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              data-testid="partners-search-input"
              placeholder="Search partners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="data-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              {!filterType && <TableHead className="font-semibold">Type</TableHead>}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : partners.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No partners found</TableCell></TableRow>
            ) : (
              partners.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/70">
                  <TableCell className="font-medium">{p.companyName}</TableCell>
                  <TableCell className="text-sm">{p.contactPerson || '-'}</TableCell>
                  <TableCell className="text-sm">{p.email || '-'}</TableCell>
                  <TableCell className="text-sm">{p.phone || '-'}</TableCell>
                  <TableCell className="text-sm">{[p.city, p.country].filter(Boolean).join(', ') || '-'}</TableCell>
                  {!filterType && (
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[p.type] || 'bg-slate-100 text-slate-700'}`}>
                        {typeLabels[p.type] || p.type}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => { setDeletingPartner(p); setDeleteDialogOpen(true); }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Edit Partner' : 'New Partner'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Company Name *</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Company name" />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="co-broker">Co-Broker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0e7490] hover:bg-[#155e75]">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingPartner ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Partner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingPartner?.companyName}?
            </AlertDialogDescription>
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
