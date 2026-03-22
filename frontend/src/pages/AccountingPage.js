import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Plus, Search, Trash2, Pencil, Loader2, DollarSign, CheckCircle, Clock, Receipt, FileText, ArrowDownLeft, ArrowUpRight, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { cn } from '../lib/utils';

const CATEGORIES = ['Commission Payment', 'Salary Payment', 'Pension Payment', 'Accountant Payment', 'Other Payments'];
const INCOMING_CATEGORIES = ['Commission Payment', 'Other Payments'];
const OUTGOING_CATEGORIES = ['Salary Payment', 'Pension Payment', 'Accountant Payment', 'Other Payments'];
const STATUS_CONFIG = {
  pending: { label: 'PENDING', color: 'bg-amber-100 text-amber-800' },
  paid: { label: 'PAID', color: 'bg-green-100 text-green-800' },
  overdue: { label: 'OVERDUE', color: 'bg-red-100 text-red-800' },
};

function InvoiceTable({ invoices, search, onEdit, onDelete, direction, tradeMap, onPaymentDate }) {
  const filtered = search ? invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || i.vendorName?.toLowerCase().includes(search.toLowerCase())) : invoices;
  const fmtAmt = (n, cur) => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0)} ${cur || 'USD'}`;
  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table className="trade-table">
        <TableHeader><TableRow className="bg-muted/50">
          <TableHead>Status</TableHead><TableHead>Invoice Date</TableHead><TableHead>Invoice No</TableHead><TableHead>{direction === 'incoming' ? 'Invoice To' : 'Vendor'}</TableHead><TableHead>Commodity</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Due Date</TableHead><TableHead>Payment Date</TableHead><TableHead className="w-[80px]">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow> :
          filtered.map(inv => {
            const trade = tradeMap?.[inv.tradeId];
            const commodityName = trade?.commodityName || '-';
            const invoiceDate = inv.createdAt ? (() => { try { return format(parseISO(inv.createdAt), 'dd/MM/yyyy'); } catch { return '-'; }})() : '-';
            return (
            <TableRow key={inv.id}>
              <TableCell><Badge className={STATUS_CONFIG[inv.status]?.color||'bg-muted'}>{STATUS_CONFIG[inv.status]?.label||inv.status?.toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm">{invoiceDate}</TableCell>
              <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
              <TableCell>{inv.vendorName}</TableCell>
              <TableCell className="text-sm max-w-[150px]">{commodityName}</TableCell>
              <TableCell><Badge variant="secondary" className="capitalize">{inv.category || 'Commission Payment'}</Badge></TableCell>
              <TableCell className="text-right font-medium">{fmtAmt(inv.amount, inv.currency)}</TableCell>
              <TableCell className="text-sm">{inv.dueDate ? (() => { try { return format(parseISO(inv.dueDate), 'dd/MM/yyyy'); } catch { return inv.dueDate; }})() : '-'}</TableCell>
              <TableCell className="text-sm">
                <div className="flex items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className={cn('text-xs whitespace-nowrap', !inv.paymentDate && 'text-muted-foreground')}>
                        <CalendarDays className="h-3.5 w-3.5 mr-1" />
                        {inv.paymentDate || 'Set date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar mode="single" selected={inv.paymentDate ? (() => { try { const [dd,mm,yyyy] = inv.paymentDate.split('/'); return new Date(yyyy, mm-1, dd); } catch { return undefined; } })() : undefined} onSelect={(d) => { if (d) onPaymentDate(inv.id, format(d, 'dd/MM/yyyy')); }} initialFocus />
                    </PopoverContent>
                  </Popover>
                  {inv.paymentDate && <button className="text-destructive hover:text-destructive/80 text-xs p-0.5" onClick={() => onPaymentDate(inv.id, '')} title="Clear date">&times;</button>}
                </div>
              </TableCell>
              <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(inv)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(inv.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
            </TableRow>
          );})}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AccountingPage() {
  const [invoices, setInvoices] = useState([]);
  const [trades, setTrades] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ invoiceNumber: '', vendorName: '', amount: '', currency: 'USD', dueDate: '', category: 'Commission Payment', description: '', status: 'pending', direction: 'outgoing' });
  const [saving, setSaving] = useState(false);
  const [stmtDialogOpen, setStmtDialogOpen] = useState(false);
  const [stmtForm, setStmtForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), description: '', fileName: '', bankAccountId: '' });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [vendors, setVendors] = useState([]);

  const fetchData = async () => {
    try {
      const [invRes, stmtRes, bankRes, partnersRes, vendorsRes, tradesRes] = await Promise.all([
        api.get('/api/invoices'), api.get('/api/bank-statements'), api.get('/api/bank-accounts'), api.get('/api/partners'), api.get('/api/vendors'), api.get('/api/trades')
      ]);
      setInvoices(invRes.data);
      setTrades(tradesRes.data);
      setBankStatements(stmtRes.data);
      setBankAccounts(bankRes.data);
      setSellers((partnersRes.data || []).filter(p => p.type === 'seller' || p.type === 'both').map(p => p.companyName).filter(Boolean));
      setVendors((vendorsRes.data || []).map(v => v.name).filter(Boolean));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const tradeMap = useMemo(() => {
    const m = {};
    trades.forEach(t => { m[t.id] = t; });
    return m;
  }, [trades]);

  const incoming = invoices.filter(i => i.direction === 'incoming');
  const outgoing = invoices.filter(i => i.direction !== 'incoming');

  const stats = {
    inTotal: incoming.reduce((s, i) => s + (i.amount || 0), 0),
    inPending: incoming.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0),
    outTotal: outgoing.reduce((s, i) => s + (i.amount || 0), 0),
    outPending: outgoing.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0),
  };

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

  const openCreate = (direction) => {
    setEditingInvoice(null);
    setForm({ invoiceNumber: '', vendorName: '', amount: '', currency: 'USD', dueDate: '', category: direction === 'incoming' ? 'Commission Payment' : 'Salary Payment', description: '', status: 'pending', direction });
    setDialogOpen(true);
  };
  const openEdit = (inv) => {
    setEditingInvoice(inv);
    setForm({ invoiceNumber: inv.invoiceNumber||'', vendorName: inv.vendorName||'', amount: inv.amount||'', currency: inv.currency||'USD', dueDate: inv.dueDate?.split('T')[0]||'', category: inv.category||'Commission Payment', description: inv.description||'', status: inv.status||'pending', direction: inv.direction||'outgoing' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.invoiceNumber || !form.vendorName || !form.amount) { toast.error('Invoice number, vendor, and amount required'); return; }
    setSaving(true);
    try {
      const data = { ...form, amount: parseFloat(form.amount) };
      if (editingInvoice) { await api.put(`/api/invoices/${editingInvoice.id}`, data); toast.success('Invoice updated'); }
      else { await api.post('/api/invoices', data); toast.success('Invoice created'); }
      setDialogOpen(false); fetchData();
    } catch (err) { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/api/invoices/${id}`); toast.success('Deleted'); fetchData(); } catch (err) { toast.error('Failed'); }
  };

  const handlePaymentDate = async (invoiceId, dateStr) => {
    try {
      await api.patch(`/api/invoices/${invoiceId}/payment-date`, { paymentDate: dateStr });
      toast.success(dateStr ? 'Payment date saved' : 'Payment date cleared');
      fetchData();
    } catch { toast.error('Failed to update payment date'); }
  };

  const handleSaveStmt = async () => {
    setSaving(true);
    try { await api.post('/api/bank-statements', stmtForm); toast.success('Bank statement added'); setStmtDialogOpen(false); fetchData(); }
    catch (err) { toast.error('Failed'); } finally { setSaving(false); }
  };

  const handleDeleteStmt = async (id) => {
    try { await api.delete(`/api/bank-statements/${id}`); toast.success('Deleted'); fetchData(); } catch { toast.error('Failed'); }
  };

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
        <p className="text-muted-foreground">Manage incoming and outgoing payments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Incoming Total</CardTitle><ArrowDownLeft className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{fmt(stats.inTotal)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Incoming Pending</CardTitle><Clock className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{fmt(stats.inPending)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Outgoing Total</CardTitle><ArrowUpRight className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{fmt(stats.outTotal)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Outgoing Pending</CardTitle><Clock className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{fmt(stats.outPending)}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming"><ArrowDownLeft className="h-3.5 w-3.5 mr-1" />Incoming Payments ({incoming.length})</TabsTrigger>
          <TabsTrigger value="outgoing"><ArrowUpRight className="h-3.5 w-3.5 mr-1" />Outgoing Payments ({outgoing.length})</TabsTrigger>
          <TabsTrigger value="bank-statements"><FileText className="h-3.5 w-3.5 mr-1" />Bank Statements ({bankStatements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative max-w-xs flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search incoming..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
                <div className="ml-auto"><Button onClick={() => openCreate('incoming')}><Plus className="mr-2 h-4 w-4" />Add Incoming</Button></div>
              </div>
              <InvoiceTable invoices={incoming} search={search} onEdit={openEdit} onDelete={handleDelete} direction="incoming" tradeMap={tradeMap} onPaymentDate={handlePaymentDate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative max-w-xs flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search outgoing..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
                <div className="ml-auto"><Button onClick={() => openCreate('outgoing')}><Plus className="mr-2 h-4 w-4" />Add Outgoing</Button></div>
              </div>
              <InvoiceTable invoices={outgoing} search={search} onEdit={openEdit} onDelete={handleDelete} direction="outgoing" tradeMap={tradeMap} onPaymentDate={handlePaymentDate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank-statements">
          {bankAccounts.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground py-12">No bank accounts configured. Add bank accounts in Settings.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map(bank => {
                const stmts = bankStatements.filter(s => s.bankAccountId === bank.id);
                return (
                  <Card key={bank.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{bank.accountName || bank.beneficiary}</h3>
                          <p className="text-xs text-muted-foreground">{bank.bankName} {bank.currency ? `(${bank.currency})` : ''} — {bank.iban}</p>
                        </div>
                        <Button size="sm" onClick={() => { setStmtForm({ month: new Date().getMonth()+1, year: new Date().getFullYear(), description: '', fileName: '', bankAccountId: bank.id }); setStmtDialogOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" />Add Statement</Button>
                      </div>
                      <div className="overflow-x-auto border rounded-lg">
                        <Table>
                          <TableHeader><TableRow className="bg-muted/50">
                            <TableHead>Period</TableHead><TableHead>Description</TableHead><TableHead>File</TableHead><TableHead>Uploaded</TableHead><TableHead className="w-[60px]">Actions</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {stmts.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No statements for this account yet</TableCell></TableRow> :
                            stmts.map(s => (
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
                );
              })}
              {/* Unassigned statements */}
              {bankStatements.filter(s => !s.bankAccountId).length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 text-muted-foreground">Unassigned Statements</h3>
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/50">
                          <TableHead>Period</TableHead><TableHead>Description</TableHead><TableHead>File</TableHead><TableHead>Uploaded</TableHead><TableHead className="w-[60px]">Actions</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {bankStatements.filter(s => !s.bankAccountId).map(s => (
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
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={stmtDialogOpen} onOpenChange={setStmtDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle className="text-center">Add Bank Statement</DialogTitle><DialogDescription className="text-center">Upload monthly bank statement.</DialogDescription></DialogHeader>
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
        <DialogContent><DialogHeader><DialogTitle className="text-center">{editingInvoice ? 'Edit Invoice' : `New ${form.direction === 'incoming' ? 'Incoming' : 'Outgoing'} Payment`}</DialogTitle><DialogDescription className="text-center">Fill in the payment details.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Invoice Number *</Label><Input value={form.invoiceNumber} onChange={(e) => setForm({...form, invoiceNumber: e.target.value})} placeholder="INV-001" /></div>
            <div className="space-y-2"><Label>{form.direction === 'incoming' ? 'Invoice To' : 'Vendor'} *</Label>
              <Select value={form.vendorName} onValueChange={(v) => setForm({...form, vendorName: v})}>
                <SelectTrigger><SelectValue placeholder={`Select ${form.direction === 'incoming' ? 'company' : 'vendor'}`} /></SelectTrigger>
                <SelectContent>
                  {(form.direction === 'incoming' ? sellers : vendors).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} /></div>
            <div className="space-y-2"><Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({...form, currency: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Due Date</Label><Input 
              placeholder="dd/mm/yyyy"
              value={form.dueDate ? (() => { const [y,m,d] = form.dueDate.split('-'); return d && m && y ? `${d}/${m}/${y}` : form.dueDate; })() : ''} 
              onChange={(e) => {
                let v = e.target.value.replace(/[^\d/]/g, '');
                if (v.length === 2 && !v.includes('/')) v += '/';
                if (v.length === 5 && v.split('/').length === 2) v += '/';
                if (v.length > 10) v = v.slice(0, 10);
                const parts = v.split('/');
                if (parts.length === 3 && parts[2].length === 4) {
                  setForm({...form, dueDate: `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`});
                } else {
                  setForm({...form, dueDate: v});
                }
              }}
            /></div>
            <div className="space-y-2"><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(form.direction === 'incoming' ? INCOMING_CATEGORIES : OUTGOING_CATEGORIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
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
