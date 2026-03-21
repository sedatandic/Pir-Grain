import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Plus, Search, Trash2, Pencil, Loader2, DollarSign, AlertCircle, CheckCircle, Clock, Receipt, FileText, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const CATEGORIES = ['freight', 'port_charges', 'surveyor', 'broker_commission', 'insurance', 'fumigation', 'other'];
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800' },
};

export default function AccountingPage() {
  const [invoices, setInvoices] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ invoiceNumber: '', vendorName: '', amount: '', currency: 'USD', dueDate: '', category: 'other', description: '', status: 'pending' });
  const [saving, setSaving] = useState(false);
  const [stmtDialogOpen, setStmtDialogOpen] = useState(false);
  const [stmtForm, setStmtForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), description: '', fileName: '' });

  const fetch = async () => {
    try {
      const [invRes, stmtRes] = await Promise.all([
        api.get('/api/invoices'),
        api.get('/api/bank-statements'),
      ]);
      setInvoices(invRes.data);
      setBankStatements(stmtRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const stats = {
    total: invoices.reduce((s, i) => s + (i.amount || 0), 0),
    pending: invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0),
  };

  const filtered = search ? invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || i.vendorName?.toLowerCase().includes(search.toLowerCase())) : invoices;

  const openCreate = () => { setEditingInvoice(null); setForm({ invoiceNumber: '', vendorName: '', amount: '', currency: 'USD', dueDate: '', category: 'other', description: '', status: 'pending' }); setDialogOpen(true); };
  const openEdit = (inv) => { setEditingInvoice(inv); setForm({ invoiceNumber: inv.invoiceNumber||'', vendorName: inv.vendorName||'', amount: inv.amount||'', currency: inv.currency||'USD', dueDate: inv.dueDate?.split('T')[0]||'', category: inv.category||'other', description: inv.description||'', status: inv.status||'pending' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.invoiceNumber || !form.vendorName || !form.amount) { toast.error('Invoice number, vendor, and amount required'); return; }
    setSaving(true);
    try {
      const data = { ...form, amount: parseFloat(form.amount) };
      if (editingInvoice) { await api.put(`/api/invoices/${editingInvoice.id}`, data); toast.success('Invoice updated'); }
      else { await api.post('/api/invoices', data); toast.success('Invoice created'); }
      setDialogOpen(false); fetch();
    } catch (err) { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/api/invoices/${id}`); toast.success('Deleted'); fetch(); } catch (err) { toast.error('Failed'); }
  };

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

  const handleSaveStmt = async () => {
    setSaving(true);
    try {
      await api.post('/api/bank-statements', stmtForm);
      toast.success('Bank statement added');
      setStmtDialogOpen(false);
      fetch();
    } catch (err) { toast.error('Failed'); } finally { setSaving(false); }
  };

  const handleDeleteStmt = async (id) => {
    try { await api.delete(`/api/bank-statements/${id}`); toast.success('Deleted'); fetch(); } catch { toast.error('Failed'); }
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
        <p className="text-muted-foreground">Manage invoices, expenses, and bank statements</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle><Receipt className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(stats.total)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle><Clock className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{fmt(stats.pending)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{fmt(stats.paid)}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices"><Receipt className="h-3.5 w-3.5 mr-1" />Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="bank-statements"><FileText className="h-3.5 w-3.5 mr-1" />Bank Statements ({bankStatements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative max-w-xs flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
                <div className="ml-auto"><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Invoice</Button></div>
              </div>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead>Invoice #</TableHead><TableHead>Vendor</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow> :
                filtered.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.vendorName}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{(inv.category||'other').replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-right font-mono font-medium">{fmt(inv.amount)}</TableCell>
                    <TableCell className="text-sm">{inv.dueDate ? (() => { try { return format(parseISO(inv.dueDate), 'MMM d, yyyy'); } catch { return inv.dueDate; }})() : '-'}</TableCell>
                    <TableCell><Badge className={STATUS_CONFIG[inv.status]?.color||'bg-muted'}>{STATUS_CONFIG[inv.status]?.label||inv.status}</Badge></TableCell>
                    <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(inv)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(inv.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="bank-statements">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Monthly Bank Statements</h3>
              <Button size="sm" onClick={() => { setStmtForm({ month: new Date().getMonth()+1, year: new Date().getFullYear(), description: '', fileName: '' }); setStmtDialogOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" />Add Statement</Button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead>Period</TableHead><TableHead>Description</TableHead><TableHead>File</TableHead><TableHead>Uploaded</TableHead><TableHead className="w-[60px]">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {bankStatements.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No bank statements uploaded yet</TableCell></TableRow> :
                  bankStatements.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{MONTHS[(s.month||1)-1]} {s.year}</TableCell>
                      <TableCell>{s.description || '-'}</TableCell>
                      <TableCell>{s.fileName ? <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />{s.fileName}</Badge> : '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.createdAt ? (() => { try { return format(parseISO(s.createdAt), 'dd/MM/yyyy'); } catch { return '-'; }})() : '-'}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteStmt(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>

      {/* Bank Statement Dialog */}
      <Dialog open={stmtDialogOpen} onOpenChange={setStmtDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Bank Statement</DialogTitle><DialogDescription>Upload monthly bank statement.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Month</Label>
              <Select value={String(stmtForm.month)} onValueChange={(v) => setStmtForm({...stmtForm, month: parseInt(v)})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((m,i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Year</Label><Input type="number" value={stmtForm.year} onChange={(e) => setStmtForm({...stmtForm, year: parseInt(e.target.value)})} /></div>
            <div className="col-span-2 space-y-2"><Label>Description</Label><Input value={stmtForm.description} onChange={(e) => setStmtForm({...stmtForm, description: e.target.value})} placeholder="e.g. March 2026 statement" /></div>
            <div className="col-span-2 space-y-2"><Label>File Name</Label><Input value={stmtForm.fileName} onChange={(e) => setStmtForm({...stmtForm, fileName: e.target.value})} placeholder="statement_march_2026.pdf" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setStmtDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveStmt} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingInvoice ? 'Edit Invoice' : 'New Invoice'}</DialogTitle><DialogDescription>Fill in the invoice details.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Invoice Number *</Label><Input value={form.invoiceNumber} onChange={(e) => setForm({...form, invoiceNumber: e.target.value})} placeholder="INV-001" /></div>
            <div className="space-y-2"><Label>Vendor *</Label><Input value={form.vendorName} onChange={(e) => setForm({...form, vendorName: e.target.value})} /></div>
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} /></div>
            <div className="space-y-2"><Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({...form, currency: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} /></div>
            <div className="space-y-2"><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_',' ')}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select>
            </div>
            <div className="col-span-2 space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editingInvoice ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
