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
import { Plus, Search, Trash2, Pencil, Loader2, DollarSign, CheckCircle, Clock, Receipt, FileText, FileDown, ArrowDownLeft, ArrowUpRight, CalendarDays, X, Upload, Download } from 'lucide-react';
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

function InvoiceTable({ invoices, search, onEdit, onDelete, direction, tradeMap, onPaymentDate, onDownloadInvoice }) {
  const filtered = search ? invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || i.vendorName?.toLowerCase().includes(search.toLowerCase())) : invoices;
  const fmtAmt = (n, cur) => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0)} ${cur || 'USD'}`;
  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table className="trade-table">
        <TableHeader><TableRow className="bg-muted/50">
          <TableHead>Status</TableHead><TableHead>Invoice Date</TableHead><TableHead>Invoice No</TableHead><TableHead>{direction === 'incoming' ? 'Invoice To' : 'Vendor'}</TableHead><TableHead>Commodity</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Due Date</TableHead><TableHead className="text-center">Invoice</TableHead><TableHead>Payment Date</TableHead><TableHead className="w-[80px]">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow> :
          filtered.map(inv => {
            const trade = tradeMap?.[inv.tradeId];
            const commodityName = trade?.commodityName || '-';
            const invoiceDate = inv.createdAt ? (() => { try { return format(parseISO(inv.createdAt), 'dd/MM/yyyy'); } catch { return '-'; }})() : '-';
            return (
            <TableRow key={inv.id}>
              <TableCell><Badge className={STATUS_CONFIG[inv.status]?.color||'bg-muted'}>{STATUS_CONFIG[inv.status]?.label||inv.status?.toUpperCase()}</Badge></TableCell>
              <TableCell className="text-sm">{invoiceDate}</TableCell>
              <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
              <TableCell>{inv.vendorCode || inv.vendorName}</TableCell>
              <TableCell className="text-sm max-w-[150px]">{commodityName}</TableCell>
              <TableCell><Badge variant="secondary" className="capitalize">{inv.category || 'Commission Payment'}</Badge></TableCell>
              <TableCell className="text-right font-medium">{fmtAmt(inv.amount, inv.currency)}</TableCell>
              <TableCell className="text-sm">{inv.dueDate ? (() => { try { return format(parseISO(inv.dueDate), 'dd/MM/yyyy'); } catch { return inv.dueDate; }})() : '-'}</TableCell>
              <TableCell className="text-center">
                {inv.tradeId ? (
                  <Button variant="outline" size="sm" onClick={() => onDownloadInvoice && onDownloadInvoice(inv)} data-testid={`invoice-pdf-${inv.id}`}>
                    <FileDown className="h-3.5 w-3.5 mr-1" />PDF
                  </Button>
                ) : '-'}
              </TableCell>
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
  const [stmtFile, setStmtFile] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));

  const fetchData = async () => {
    try {
      const [invRes, stmtRes, bankRes, partnersRes, vendorsRes, tradesRes] = await Promise.all([
        api.get('/api/invoices'), api.get('/api/bank-statements'), api.get('/api/bank-accounts'), api.get('/api/partners'), api.get('/api/vendors'), api.get('/api/trades')
      ]);
      setInvoices(invRes.data);
      setTrades(tradesRes.data);
      setBankStatements(stmtRes.data);
      setBankAccounts(bankRes.data);
      setSellers((partnersRes.data || []).map(p => p.companyName).filter(Boolean).sort());
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

  const getInvoiceYM = (inv) => {
    const d = inv.createdAt || inv.dueDate || '';
    try {
      const dt = parseISO(d);
      return { y: dt.getFullYear().toString(), m: (dt.getMonth() + 1).toString() };
    } catch { return { y: '', m: '' }; }
  };

  const filterByYM = (list) => {
    let result = list;
    if (filterYear !== 'all') result = result.filter(i => getInvoiceYM(i).y === filterYear);
    if (filterMonth !== 'all') result = result.filter(i => getInvoiceYM(i).m === filterMonth);
    return result;
  };

  const filteredIncoming = useMemo(() => filterByYM(incoming), [incoming, filterYear, filterMonth]);
  const filteredOutgoing = useMemo(() => filterByYM(outgoing), [outgoing, filterYear, filterMonth]);
  const filteredBankStatements = useMemo(() => {
    let result = bankStatements;
    if (filterYear !== 'all') result = result.filter(s => String(s.year) === filterYear);
    if (filterMonth !== 'all') result = result.filter(s => String(s.month) === filterMonth);
    return result;
  }, [bankStatements, filterYear, filterMonth]);

  const availableYears = useMemo(() => {
    const years = new Set(['2024', '2025', '2026']);
    invoices.forEach(i => { const y = getInvoiceYM(i).y; if (y) years.add(y); });
    bankStatements.forEach(s => { if (s.year) years.add(String(s.year)); });
    return Array.from(years).sort().reverse();
  }, [invoices, bankStatements]);

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const currentMonth = String(new Date().getMonth() + 1);
  const hasActiveTimeFilter = filterYear !== new Date().getFullYear().toString() || filterMonth !== currentMonth;
  const clearTimeFilters = () => { setFilterYear(new Date().getFullYear().toString()); setFilterMonth(currentMonth); };

  const stats = {
    inTotal: filteredIncoming.reduce((s, i) => s + (i.amount || 0), 0),
    inPending: filteredIncoming.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0),
    outTotal: filteredOutgoing.reduce((s, i) => s + (i.amount || 0), 0),
    outPending: filteredOutgoing.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount || 0), 0),
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
    const cleanAmount = String(form.amount).replace(/,/g, '');
    if (!form.invoiceNumber || !form.vendorName || !cleanAmount || isNaN(parseFloat(cleanAmount))) { toast.error('Invoice number, vendor, and amount required'); return; }
    setSaving(true);
    try {
      const data = { ...form, amount: parseFloat(cleanAmount) };
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

  const handleDownloadInvoice = async (inv) => {
    if (!inv.tradeId) return;
    try {
      const res = await api.get(`/api/commission-invoice/${inv.tradeId}?account=seller`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${inv.invoiceNumber || inv.tradeId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch { toast.error('Failed to download invoice'); }
  };

  const handleSaveStmt = async () => {
    setSaving(true);
    try {
      if (stmtFile) {
        const formData = new FormData();
        formData.append('file', stmtFile);
        formData.append('month', stmtForm.month);
        formData.append('year', stmtForm.year);
        formData.append('description', stmtForm.description || '');
        formData.append('bankAccountId', stmtForm.bankAccountId || '');
        await api.post('/api/bank-statements/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/api/bank-statements', stmtForm);
      }
      toast.success('Bank statement added');
      setStmtDialogOpen(false);
      setStmtFile(null);
      fetchData();
    } catch (err) { toast.error('Failed'); } finally { setSaving(false); }
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

      {/* Year & Month Filter */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); }} data-testid="accounting-year-filter">
              <SelectTrigger className="w-[110px] shrink-0" data-testid="accounting-year-filter"><CalendarDays className="h-3.5 w-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveTimeFilter && <Button variant="ghost" size="sm" onClick={clearTimeFilters} className="shrink-0 text-destructive hover:text-destructive" data-testid="accounting-clear-filter"><X className="h-4 w-4 mr-1" />Clear</Button>}
            <div className="flex items-center gap-1 flex-wrap">
              <Button variant={filterMonth === 'all' ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-2.5" onClick={() => setFilterMonth('all')} data-testid="accounting-month-all">All</Button>
              {MONTH_LABELS.map((m, i) => (
                <Button key={i} variant={filterMonth === String(i + 1) ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-2.5" onClick={() => setFilterMonth(String(i + 1))} data-testid={`accounting-month-${i+1}`}>{m}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming"><ArrowDownLeft className="h-3.5 w-3.5 mr-1" />Incoming Payments ({filteredIncoming.filter(i => i.status === 'paid').length})</TabsTrigger>
          <TabsTrigger value="outgoing"><ArrowUpRight className="h-3.5 w-3.5 mr-1" />Outgoing Payments ({filteredOutgoing.length})</TabsTrigger>
          <TabsTrigger value="bank-statements"><FileText className="h-3.5 w-3.5 mr-1" />Bank Statements ({filteredBankStatements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative max-w-xs flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search incoming..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
                <div className="ml-auto"><Button onClick={() => openCreate('incoming')}><Plus className="mr-2 h-4 w-4" />Add Incoming</Button></div>
              </div>
              <InvoiceTable invoices={filteredIncoming.filter(i => i.status === 'paid')} search={search} onEdit={openEdit} onDelete={handleDelete} direction="incoming" tradeMap={tradeMap} onPaymentDate={handlePaymentDate} onDownloadInvoice={handleDownloadInvoice} />
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
              <h3 className="font-semibold text-sm mb-2 text-amber-700">Pending ({filteredOutgoing.filter(i => i.status !== 'paid').length})</h3>
              <InvoiceTable invoices={filteredOutgoing.filter(i => i.status !== 'paid')} search={search} onEdit={openEdit} onDelete={handleDelete} direction="outgoing" tradeMap={tradeMap} onPaymentDate={handlePaymentDate} onDownloadInvoice={handleDownloadInvoice} />
              {filteredOutgoing.filter(i => i.status === 'paid').length > 0 && (
                <>
                  <h3 className="font-semibold text-sm mt-6 mb-2 text-green-700">Paid ({filteredOutgoing.filter(i => i.status === 'paid').length})</h3>
                  <InvoiceTable invoices={filteredOutgoing.filter(i => i.status === 'paid')} search={search} onEdit={openEdit} onDelete={handleDelete} direction="outgoing" tradeMap={tradeMap} onPaymentDate={handlePaymentDate} onDownloadInvoice={handleDownloadInvoice} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank-statements">
          {bankAccounts.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground py-12">No bank accounts configured. Add bank accounts in Settings.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map(bank => {
              const stmts = filteredBankStatements.filter(s => s.bankAccountId === bank.id);
                return (
                  <Card key={bank.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{bank.accountName || bank.beneficiary}</h3>
                          <p className="text-xs text-muted-foreground">{bank.bankName} {bank.currency ? `(${bank.currency})` : ''} — {bank.iban}</p>
                        </div>
                        <Button size="sm" onClick={() => { setStmtForm({ month: new Date().getMonth()+1, year: new Date().getFullYear(), description: '', fileName: '', bankAccountId: bank.id }); setStmtFile(null); setStmtDialogOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" />Add Statement</Button>
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
                                <TableCell>{s.fileName ? <a href={`${process.env.REACT_APP_BACKEND_URL}/api/bank-statements/${s.id}/download`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><Download className="h-3 w-3" />{s.fileName}</a> : '-'}</TableCell>
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
              {filteredBankStatements.filter(s => !s.bankAccountId).length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 text-muted-foreground">Unassigned Statements</h3>
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/50">
                          <TableHead>Period</TableHead><TableHead>Description</TableHead><TableHead>File</TableHead><TableHead>Uploaded</TableHead><TableHead className="w-[60px]">Actions</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {filteredBankStatements.filter(s => !s.bankAccountId).map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{MONTHS[(s.month||1)-1]} {s.year}</TableCell>
                              <TableCell>{s.description || '-'}</TableCell>
                              <TableCell>{s.fileName ? <a href={`${process.env.REACT_APP_BACKEND_URL}/api/bank-statements/${s.id}/download`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><Download className="h-3 w-3" />{s.fileName}</a> : '-'}</TableCell>
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
            <div className="col-span-2 space-y-2">
              <Label>Attach Bank Statement</Label>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className={cn("flex items-center gap-2 border rounded-md px-3 py-2 text-sm hover:bg-muted/50 transition-colors", stmtFile ? "border-primary" : "border-input")}>
                    <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={stmtFile ? "text-foreground" : "text-muted-foreground"}>{stmtFile ? stmtFile.name : "Choose file..."}</span>
                  </div>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" onChange={(e) => { if (e.target.files?.[0]) setStmtFile(e.target.files[0]); }} data-testid="stmt-file-input" />
                </label>
                {stmtFile && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setStmtFile(null)}><X className="h-4 w-4" /></Button>}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setStmtDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveStmt} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle className="text-center">{editingInvoice ? 'Edit Invoice' : `New ${form.direction === 'incoming' ? 'Incoming' : 'Outgoing'} Payment`}</DialogTitle><DialogDescription className="text-center">Fill in the payment details.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Invoice Number *</Label><Input value={form.invoiceNumber} onChange={(e) => setForm({...form, invoiceNumber: e.target.value})} placeholder="INV-001" /></div>
            <div className="space-y-2"><Label>{form.direction === 'incoming' ? 'Invoice To' : 'Vendor'} *</Label>
              <Select value={form.vendorName} onValueChange={(v) => setForm(f => ({...f, vendorName: v}))}>
                <SelectTrigger><SelectValue placeholder={`Select ${form.direction === 'incoming' ? 'company' : 'vendor'}`} /></SelectTrigger>
                <SelectContent>
                  {(form.direction === 'incoming' ? sellers : vendors).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Amount *</Label><Input type="text" inputMode="decimal" value={form.amount} onChange={(e) => setForm(f => ({...f, amount: e.target.value}))} placeholder="0.00" /></div>
            <div className="space-y-2"><Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({...form, currency: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !form.dueDate && 'text-muted-foreground')}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {form.dueDate ? (() => { try { const [y,m,d] = form.dueDate.split('-'); return d && m && y ? `${d}/${m}/${y}` : form.dueDate; } catch { return form.dueDate; } })() : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.dueDate ? (() => { try { return parseISO(form.dueDate); } catch { return undefined; } })() : undefined} onSelect={(d) => { if (d) setForm({...form, dueDate: format(d, 'yyyy-MM-dd')}); }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
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
