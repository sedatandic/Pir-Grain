import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Mail, Phone, Pencil, Trash2, Loader2, Eye, Building2, User, MessageCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';

const TYPE_CONFIG = {
  seller: { label: 'Seller', color: 'bg-blue-100 text-blue-800' },
  buyer: { label: 'Buyer', color: 'bg-green-100 text-green-800' },
  'co-broker': { label: 'Co-Broker', color: 'bg-amber-100 text-amber-800' },
};

const emptyForm = { companyName: '', companyCode: '', contactPerson: '', address: '', city: '', country: '', email: '', phone: '', whatsapp: '', type: 'buyer', origins: '', notes: '' };

export default function PartnersPage({ filterType }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(filterType || 'all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [detailPartner, setDetailPartner] = useState(null);

  const fetchPartners = useCallback(async () => {
    try {
      const res = await api.get('/api/partners');
      setPartners(res.data);
    } catch (err) { toast.error('Failed to load partners'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);
  useEffect(() => { if (filterType) setTab(filterType); }, [filterType]);

  const filtered = useMemo(() => {
    let list = partners;
    if (tab !== 'all') list = list.filter(p => p.type === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.companyName?.toLowerCase().includes(q) || p.contactPerson?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.companyCode?.toLowerCase().includes(q));
    }
    return list;
  }, [partners, tab, search]);

  const counts = useMemo(() => ({
    all: partners.length,
    seller: partners.filter(p => p.type === 'seller').length,
    buyer: partners.filter(p => p.type === 'buyer').length,
    'co-broker': partners.filter(p => p.type === 'co-broker').length,
  }), [partners]);

  const openCreate = () => { setEditingPartner(null); setForm({ ...emptyForm, type: filterType || 'buyer' }); setDialogOpen(true); };
  const openEdit = (p) => {
    setEditingPartner(p);
    setForm({ companyName: p.companyName||'', companyCode: p.companyCode||'', contactPerson: p.contactPerson||'', address: p.address||'', city: p.city||'', country: p.country||'', email: p.email||'', phone: p.phone||'', whatsapp: p.whatsapp||'', type: p.type||'buyer', origins: (p.origins || []).join(', '), notes: p.notes||'' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, origins: form.origins ? form.origins.split(',').map(o => o.trim()).filter(Boolean) : [] };
      if (editingPartner) {
        await api.put(`/api/partners/${editingPartner.id}`, payload);
        toast.success('Partner updated');
      } else {
        await api.post('/api/partners', payload);
        toast.success('Partner created');
      }
      setDialogOpen(false); fetchPartners();
    } catch (err) { toast.error('Failed to save partner'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/api/partners/${id}`); toast.success('Deleted'); fetchPartners(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Counterparties</h1>
          <p className="text-muted-foreground">Manage your trading partners</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="partners-search-input" />
            </div>
            {!filterType && (
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                  <TabsTrigger value="seller">Sellers ({counts.seller})</TabsTrigger>
                  <TabsTrigger value="buyer">Buyers ({counts.buyer})</TabsTrigger>
                  <TabsTrigger value="co-broker">Co-Brokers ({counts['co-broker']})</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <div className="ml-auto">
              <Button onClick={openCreate} data-testid="partners-new-button"><Plus className="mr-2 h-4 w-4" />Add Counterparty</Button>
            </div>
          </div>

          {loading ? <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div> : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Origins</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No partners found</TableCell></TableRow>
                  ) : filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div><div className="font-medium">{p.companyName}</div>{p.companyCode && <div className="text-xs text-muted-foreground">{p.companyCode}</div>}</div>
                      </TableCell>
                      <TableCell className="text-sm">{p.contactPerson || '-'}</TableCell>
                      <TableCell className="text-sm">{p.email ? <a href={`mailto:${p.email}`} className="text-primary hover:underline flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</a> : '-'}</TableCell>
                      <TableCell className="text-sm">{p.phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span> : '-'}</TableCell>
                      <TableCell className="text-sm">{[p.city, p.country].filter(Boolean).join(', ') || '-'}</TableCell>
                      <TableCell className="text-sm">{p.origins && p.origins.length > 0 ? <div className="flex flex-wrap gap-1">{p.origins.map((o, i) => <Badge key={i} variant="outline" className="text-xs">{o}</Badge>)}</div> : '-'}</TableCell>
                      <TableCell><Badge className={TYPE_CONFIG[p.type]?.color || 'bg-muted'}>{TYPE_CONFIG[p.type]?.label || p.type}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailPartner(p)} data-testid={`partner-view-${p.id}`}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingPartner ? 'Edit Partner' : 'Add New Counterparty'}</DialogTitle><DialogDescription>Fill in the details below.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2"><Label>Company Name *</Label><Input value={form.companyName} onChange={(e) => setForm({...form, companyName: e.target.value})} /></div>
            <div className="space-y-2"><Label>Company Code</Label><Input value={form.companyCode} onChange={(e) => setForm({...form, companyCode: e.target.value})} placeholder="e.g. PIR" /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="co-broker">Co-Broker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={(e) => setForm({...form, contactPerson: e.target.value})} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
            <div className="space-y-2"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({...form, whatsapp: e.target.value})} /></div>
            <div className="col-span-2 space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} /></div>
            <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({...form, country: e.target.value})} /></div>
            <div className="col-span-2 space-y-2"><Label>Origins</Label><Input value={form.origins} onChange={(e) => setForm({...form, origins: e.target.value})} placeholder="e.g. Russia, Ukraine" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editingPartner ? 'Update' : 'Add Counterparty'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Business Card / Detail Dialog */}
      <Dialog open={!!detailPartner} onOpenChange={() => setDetailPartner(null)}>
        <DialogContent className="max-w-lg">
          {detailPartner && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                    {detailPartner.companyName?.charAt(0)}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{detailPartner.companyName}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      {detailPartner.companyCode && <Badge variant="outline" className="text-xs">{detailPartner.companyCode}</Badge>}
                      <Badge className={TYPE_CONFIG[detailPartner.type]?.color || 'bg-muted'}>{TYPE_CONFIG[detailPartner.type]?.label || detailPartner.type}</Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Main Contact */}
                {detailPartner.contactPerson && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium"><User className="h-4 w-4 text-primary" />Primary Contact</div>
                    <div className="text-sm font-semibold">{detailPartner.contactPerson}</div>
                    <div className="grid grid-cols-1 gap-1 text-sm text-muted-foreground">
                      {detailPartner.email && <a href={`mailto:${detailPartner.email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="h-3.5 w-3.5" />{detailPartner.email}</a>}
                      {detailPartner.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{detailPartner.phone}</span>}
                      {detailPartner.whatsapp && <span className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" />{detailPartner.whatsapp}</span>}
                    </div>
                  </div>
                )}

                {/* Location */}
                {(detailPartner.address || detailPartner.city || detailPartner.country) && (
                  <div className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4 text-primary" />Location</div>
                    <div className="text-sm text-muted-foreground">
                      {detailPartner.address && <div>{detailPartner.address}</div>}
                      <div>{[detailPartner.city, detailPartner.country].filter(Boolean).join(', ')}</div>
                    </div>
                  </div>
                )}

                {/* Origins */}
                {detailPartner.origins && detailPartner.origins.length > 0 && (
                  <div className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium"><Globe className="h-4 w-4 text-primary" />Origins</div>
                    <div className="flex flex-wrap gap-1">{detailPartner.origins.map((o, i) => <Badge key={i} variant="outline">{o}</Badge>)}</div>
                  </div>
                )}

                {/* Departments */}
                {detailPartner.departments && detailPartner.departments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Departments</div>
                    {detailPartner.departments.map((dept, di) => (
                      <div key={di} className="rounded-lg border p-3 space-y-2">
                        <div className="text-sm font-semibold">{dept.name}</div>
                        {dept.contacts && dept.contacts.map((c, ci) => (
                          <div key={ci} className="ml-2 text-sm border-l-2 border-primary/20 pl-3 py-1">
                            <div className="font-medium">{c.name} {c.role && <Badge variant="outline" className="text-[10px] ml-1">{c.role}</Badge>}</div>
                            <div className="text-muted-foreground space-y-0.5">
                              {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</div>}
                              {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {detailPartner.notes && (
                  <div className="rounded-lg border p-3 space-y-1">
                    <div className="text-sm font-medium">Notes</div>
                    <div className="text-sm text-muted-foreground">{detailPartner.notes}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
