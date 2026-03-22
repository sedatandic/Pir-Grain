import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Trash2, Pencil, Camera, Upload, User, Building2, Mail, Phone, Globe, MapPin, Tag, StickyNote, X } from 'lucide-react';

export default function BusinessCardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', title: '', company: '', email: '', phone: '', mobile: '', website: '', address: '', city: '', country: '', keywords: '', notes: '' });
  const [detailCard, setDetailCard] = useState(null);
  const fileRef = useRef();

  const fetchCards = async () => {
    try { const res = await api.get('/api/business-cards'); setCards(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchCards(); }, []);

  const filtered = cards.filter(c => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (c.name||'').toLowerCase().includes(q) || (c.company||'').toLowerCase().includes(q) ||
           (c.email||'').toLowerCase().includes(q) || (c.keywords||[]).some(k => k.toLowerCase().includes(q)) ||
           (c.notes||'').toLowerCase().includes(q);
  });

  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', '');
      formData.append('keywords', '');
      formData.append('notes', '');
      const res = await api.post('/api/business-cards', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCards(prev => [res.data, ...prev]);
      toast.success('Business card scanned & saved!');
      setDetailCard(res.data);
    } catch (err) {
      toast.error('Failed to scan card');
    } finally { setScanning(false); e.target.value = ''; }
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ name: '', title: '', company: '', email: '', phone: '', mobile: '', website: '', address: '', city: '', country: '', keywords: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (card) => {
    setEditId(card.id);
    setForm({
      name: card.name || '', title: card.title || '', company: card.company || '',
      email: card.email || '', phone: card.phone || '', mobile: card.mobile || '',
      website: card.website || '', address: card.address || '', city: card.city || '',
      country: card.country || '', keywords: (card.keywords || []).join(', '), notes: card.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...form, keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean) };
    try {
      if (editId) {
        const res = await api.put(`/api/business-cards/${editId}`, payload);
        setCards(prev => prev.map(c => c.id === editId ? res.data : c));
        if (detailCard?.id === editId) setDetailCard(res.data);
        toast.success('Card updated');
      } else {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, Array.isArray(v) ? v.join(',') : v));
        const res = await api.post('/api/business-cards', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setCards(prev => [res.data, ...prev]);
        toast.success('Card added');
      }
      setDialogOpen(false);
    } catch (err) { toast.error('Failed to save'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/business-cards/${id}`);
      setCards(prev => prev.filter(c => c.id !== id));
      if (detailCard?.id === id) setDetailCard(null);
      toast.success('Card deleted');
    } catch (err) { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold tracking-tight">Business Cards</h1><p className="text-muted-foreground">Scan, organize and search your contacts</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={scanning} data-testid="scan-card-btn">
            {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
            {scanning ? 'Scanning...' : 'Scan Card'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
          <Button onClick={openAdd} data-testid="add-card-btn"><Plus className="h-4 w-4 mr-1" />Add Manually</Button>
        </div>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name, company, keywords..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="search-cards" /></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cards grid */}
        <div className="lg:col-span-2">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No business cards yet. Scan or add one to get started.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(card => (
                <Card key={card.id} className={`cursor-pointer hover:shadow-md transition-shadow ${detailCard?.id === card.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setDetailCard(card)} data-testid={`card-${card.id}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      {card.imageUrl ? (
                        <img src={`${process.env.REACT_APP_BACKEND_URL}${card.imageUrl}`} alt="" className="w-14 h-14 rounded-lg object-cover border flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><User className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{card.name || 'Unknown'}</p>
                        {card.title && <p className="text-xs text-muted-foreground truncate">{card.title}</p>}
                        {card.company && <p className="text-xs text-primary truncate">{card.company}</p>}
                      </div>
                    </div>
                    {card.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {card.keywords.slice(0, 3).map((k, i) => <Badge key={i} variant="secondary" className="text-xs py-0">{k}</Badge>)}
                        {card.keywords.length > 3 && <Badge variant="outline" className="text-xs py-0">+{card.keywords.length - 3}</Badge>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div>
          {detailCard ? (
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Contact Details</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(detailCard)} data-testid="edit-detail-btn"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(detailCard.id)} data-testid="delete-detail-btn"><Trash2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailCard(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {detailCard.imageUrl && (
                  <img src={`${process.env.REACT_APP_BACKEND_URL}${detailCard.imageUrl}`} alt="" className="w-full rounded-lg border object-contain max-h-48" />
                )}
                <div className="space-y-2">
                  <InfoRow icon={User} label="Name" value={detailCard.name} />
                  {detailCard.title && <InfoRow icon={User} label="Title" value={detailCard.title} />}
                  <InfoRow icon={Building2} label="Company" value={detailCard.company} />
                  <InfoRow icon={Mail} label="Email" value={detailCard.email} link={detailCard.email ? `mailto:${detailCard.email}` : null} />
                  <InfoRow icon={Phone} label="Phone" value={detailCard.phone} />
                  {detailCard.mobile && <InfoRow icon={Phone} label="Mobile" value={detailCard.mobile} />}
                  {detailCard.website && <InfoRow icon={Globe} label="Website" value={detailCard.website} link={detailCard.website?.startsWith('http') ? detailCard.website : `https://${detailCard.website}`} />}
                  <InfoRow icon={MapPin} label="Location" value={[detailCard.address, detailCard.city, detailCard.country].filter(Boolean).join(', ')} />
                </div>
                {detailCard.keywords?.length > 0 && (
                  <div><p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Tag className="h-3 w-3" />Keywords</p>
                    <div className="flex flex-wrap gap-1">{detailCard.keywords.map((k, i) => <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>)}</div>
                  </div>
                )}
                {detailCard.notes && (
                  <div><p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><StickyNote className="h-3 w-3" />Notes</p>
                    <p className="text-sm bg-muted/50 rounded-lg p-2 whitespace-pre-wrap">{detailCard.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Select a card to view details</CardContent></Card>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Business Card</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
            <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. CEO, Manager" /></div>
            <div className="col-span-2 space-y-1"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
            <div className="space-y-1"><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} /></div>
            <div className="space-y-1"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} /></div>
            <div className="col-span-2 space-y-1"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
            <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} /></div>
            <div className="space-y-1"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({...form, country: e.target.value})} /></div>
            <div className="col-span-2 space-y-1"><Label>Keywords</Label><Input value={form.keywords} onChange={(e) => setForm({...form, keywords: e.target.value})} placeholder="e.g. wheat, Istanbul conference, logistics" /></div>
            <div className="col-span-2 space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} placeholder="Meeting notes, follow-ups..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} data-testid="save-card-btn">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, link }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{value}</a> : <p className="text-sm break-all">{value}</p>}
      </div>
    </div>
  );
}
