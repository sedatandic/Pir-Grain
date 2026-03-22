import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { TRADE_STATUS_CONFIG } from '../lib/constants';
import { DollarSign, Clock, CheckCircle, Search, Loader2, FileDown, Building2, Pencil, CalendarDays } from 'lucide-react';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function CommissionsPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [editDialog, setEditDialog] = useState({ open: false, trade: null });
  const [editForm, setEditForm] = useState({ brokeragePerMT: 0, brokerageCurrency: 'USD' });
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState(null);

  const openEdit = (t) => {
    setEditForm({ brokeragePerMT: t.brokeragePerMT || 0, brokerageCurrency: t.brokerageCurrency || 'USD' });
    setEditDialog({ open: true, trade: t });
  };

  const saveEdit = async () => {
    if (!editDialog.trade) return;
    try {
      const res = await api.put(`/api/trades/${editDialog.trade.id}`, {
        brokeragePerMT: parseFloat(editForm.brokeragePerMT) || 0,
        brokerageCurrency: editForm.brokerageCurrency,
      });
      setTrades(prev => prev.map(t => t.id === editDialog.trade.id ? { ...t, ...res.data } : t));
      toast.success('Brokerage updated');
      setEditDialog({ open: false, trade: null });
    } catch { toast.error('Failed to update'); }
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const [tradesRes, banksRes] = await Promise.all([api.get('/api/trades'), api.get('/api/bank-accounts')]);
        setTrades(tradesRes.data);
        setBankAccounts(banksRes.data);
        if (banksRes.data.length > 0) setSelectedBankIds(banksRes.data.map(b => b.id));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const categorized = useMemo(() => ({
    pending: trades.filter(t => !t.invoicePaid),
    paid: trades.filter(t => t.invoicePaid),
  }), [trades]);

  const applySearch = (list) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(t => (t.referenceNumber||'').toLowerCase().includes(q) || (t.commodityName||'').toLowerCase().includes(q) || (t.sellerName||'').toLowerCase().includes(q) || (t.buyerName||'').toLowerCase().includes(q));
  };

  const stats = useMemo(() => {
    const calcComm = (t) => (t.blQuantity || t.quantity || 0) * (t.brokeragePerMT || 0);
    return {
      total: trades.reduce((s, t) => s + calcComm(t), 0),
      pending: categorized.pending.reduce((s, t) => s + calcComm(t), 0),
      paid: categorized.paid.reduce((s, t) => s + calcComm(t), 0),
    };
  }, [trades, categorized]);

  const fmt = (n) => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)} USD`;
  const fmtQty = (q) => `${(q||0).toLocaleString()} Mts`;
  const getBlCommission = (t) => (t.blQuantity || t.quantity || 0) * (t.brokeragePerMT || 0);

  const toggleInvoiceStatus = async (tradeId, currentPaid) => {
    try {
      await api.put(`/api/trades/${tradeId}`, { invoicePaid: !currentPaid });
      setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, invoicePaid: !currentPaid } : t));
      toast.success(!currentPaid ? 'Marked as PAID' : 'Marked as PENDING');
    } catch { toast.error('Failed to update status'); }
  };

  const savePaymentDate = async (tradeId, dateStr) => {
    try {
      await api.put(`/api/trades/${tradeId}`, { buyerPaymentDate: dateStr });
      setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, buyerPaymentDate: dateStr } : t));
      toast.success('Payment date saved');
    } catch { toast.error('Failed to save payment date'); }
  };

  const openInvoiceDialog = (tradeId, account) => {
    setPendingInvoice({ tradeId, account: account || 'seller' });
    setBankDialogOpen(true);
  };

  const toggleBankId = (id) => {
    setSelectedBankIds(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const downloadInvoice = async () => {
    if (!pendingInvoice) return;
    const { tradeId, account } = pendingInvoice;
    try {
      const bankParam = selectedBankIds.length > 0 ? `&bankIds=${selectedBankIds.join(',')}` : '';
      const res = await api.get(`/api/commission-invoice/${tradeId}?account=${account}${bankParam}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Commission_Invoice_${tradeId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error('Failed to generate invoice');
    }
    setBankDialogOpen(false);
    setPendingInvoice(null);
  };

  const renderTable = (list, empty, showInvoice = false) => {
    const filtered = applySearch(list).sort((a, b) => {
      const dateA = a.buyerPaymentDate || '';
      const dateB = b.buyerPaymentDate || '';
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      // Parse dd/MM/yyyy for comparison
      const [dA, mA, yA] = dateA.split('/');
      const [dB, mB, yB] = dateB.split('/');
      return (yB + mB + dB).localeCompare(yA + mA + dA);
    });
    if (filtered.length === 0) return <div className="text-center py-6 text-muted-foreground text-sm">{empty}</div>;
    return (
      <div className="overflow-x-auto border rounded-lg">
        <Table className="trade-table">
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Status</TableHead><TableHead>Invoice Date</TableHead><TableHead>Invoice No</TableHead><TableHead>Contract No</TableHead><TableHead>Commodity</TableHead>
            <TableHead className="text-center">Seller<hr className="my-0.5 border-muted-foreground/30"/>Buyer</TableHead>
            <TableHead className="text-center">Vessel<hr className="my-0.5 border-muted-foreground/30"/>B/L Qty</TableHead>
            <TableHead className="text-center">Loading Port<hr className="my-0.5 border-muted-foreground/30"/>Discharge Port</TableHead>
            <TableHead>Rate/MT<hr className="my-0.5 border-muted-foreground/30"/>Commission</TableHead>
            {showInvoice && <TableHead className="text-center">Invoice</TableHead>}
            <TableHead className="text-center">Payment Date</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((t, idx) => {
              const invoiceStatus = t.invoicePaid ? 'PAID' : 'PENDING';
              const invDate = t.buyerPaymentDate ? t.buyerPaymentDate : (t.createdAt ? (() => { try { return new Date(t.createdAt).toLocaleDateString('en-GB'); } catch { return '-'; }})() : '-');
              const invNo = `COMM-${t.pirContractNumber || t.referenceNumber || ''}`;
              return (
              <TableRow key={t.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                <TableCell><Badge className={`cursor-pointer select-none ${invoiceStatus === 'PAID' ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'}`} onClick={() => toggleInvoiceStatus(t.id, t.invoicePaid)} data-testid={`toggle-invoice-status-${t.id}`}>{invoiceStatus}</Badge></TableCell>
                <TableCell className="text-sm whitespace-nowrap">{invDate}</TableCell>
                <TableCell className="text-sm font-mono whitespace-nowrap">{invNo}</TableCell>
                <TableCell className="font-medium text-primary"><Link to={`/trades/${t.id}`}>{(() => { const cn = t.pirContractNumber || t.referenceNumber || ''; return cn.length > 10 ? <>{cn.substring(0, cn.lastIndexOf(' ') > 0 ? cn.lastIndexOf(' ') : Math.ceil(cn.length/2))}<br/>{cn.substring(cn.lastIndexOf(' ') > 0 ? cn.lastIndexOf(' ') + 1 : Math.ceil(cn.length/2))}</> : cn; })()}</Link></TableCell>
                <TableCell className="text-sm max-w-[160px]">
                  <div>{t.commodityName||'-'}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{t.sellerCode||t.sellerName||'-'}</div>
                  <hr className="my-0.5 border-muted-foreground/20"/>
                  <div>{t.buyerCode||t.buyerName||'-'}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{t.vesselName||'-'}</div>
                  <hr className="my-0.5 border-muted-foreground/20"/>
                  <div>{t.blQuantity ? `${Number(t.blQuantity).toLocaleString()} Mts` : fmtQty(t.quantity)}</div>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  <div>{t.loadingPortName ? `${t.loadingPortName}${t.loadingPortCountry ? ', ' + t.loadingPortCountry : ''}` : '-'}</div>
                  <hr className="my-0.5 border-muted-foreground/20"/>
                  <div>{t.dischargePortName ? `${t.dischargePortName}${t.dischargePortCountry ? ', ' + t.dischargePortCountry : ''}` : '-'}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="cursor-pointer hover:text-primary hover:underline" onClick={() => openEdit(t)} data-testid={`edit-rate-${t.id}`}>{t.brokeragePerMT||0} {t.brokerageCurrency || 'USD'}</div>
                  <hr className="my-0.5 border-muted-foreground/20"/>
                  <div className="font-medium">{fmt(getBlCommission(t))}</div>
                </TableCell>
                {showInvoice && <TableCell className="text-center">
                  <Button variant="outline" size="sm" onClick={() => openInvoiceDialog(t.id, t.brokerageAccount)} data-testid={`download-invoice-${t.id}`}>
                    <FileDown className="h-3.5 w-3.5 mr-1" />PDF
                  </Button>
                </TableCell>}
                <TableCell className="text-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className={cn('text-xs whitespace-nowrap', !t.buyerPaymentDate && 'text-muted-foreground')}>
                        <CalendarDays className="h-3.5 w-3.5 mr-1" />
                        {t.buyerPaymentDate || 'Set date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar mode="single" selected={t.buyerPaymentDate ? (() => { try { const [dd,mm,yyyy] = t.buyerPaymentDate.split('/'); return new Date(yyyy, mm-1, dd); } catch { return undefined; } })() : undefined} onSelect={(d) => { if (d) savePaymentDate(t.id, format(d, 'dd/MM/yyyy')); }} initialFocus />
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            );
            })}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell colSpan={showInvoice ? 10 : 9} className="text-right">Total:</TableCell>
              <TableCell className="text-right font-mono">{fmt(filtered.reduce((s,t)=>s+getBlCommission(t),0))}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Brokerage Invoices</h1><p className="text-muted-foreground">Track your brokerage earnings across all trades</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle><DollarSign className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(stats.total)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle><Clock className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{fmt(stats.pending)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{fmt(stats.paid)}</div></CardContent></Card>
      </div>

      <div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      <div className="space-y-4">
        <Card className="border-l-4 border-l-amber-500"><CardHeader className="pb-3"><CardTitle className="text-lg text-amber-800">Pending ({categorized.pending.length})</CardTitle></CardHeader><CardContent>{renderTable(categorized.pending, 'No pending invoices', true)}</CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardHeader className="pb-3"><CardTitle className="text-lg text-green-800">Paid ({categorized.paid.length})</CardTitle></CardHeader><CardContent>{renderTable(categorized.paid, 'No paid invoices', true)}</CardContent></Card>
      </div>

      {/* Bank Account Selection Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Select Bank Accounts</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Choose which bank account(s) to include in the invoice:</p>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {bankAccounts.map(bank => (
              <label key={bank.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors" data-testid={`bank-select-${bank.id}`}>
                <Checkbox checked={selectedBankIds.includes(bank.id)} onCheckedChange={() => toggleBankId(bank.id)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{bank.accountName || bank.beneficiary}</div>
                  <div className="text-xs text-muted-foreground">{bank.bankName} {bank.currency ? `(${bank.currency})` : ''}</div>
                  <div className="text-xs text-muted-foreground font-mono">{bank.iban}</div>
                </div>
              </label>
            ))}
            {bankAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No bank accounts found. Default will be used.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankDialogOpen(false)}>Cancel</Button>
            <Button onClick={downloadInvoice} data-testid="confirm-download-invoice"><FileDown className="h-4 w-4 mr-1" />Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Brokerage Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => !o && setEditDialog({ open: false, trade: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" />Edit Brokerage</DialogTitle>
          </DialogHeader>
          {editDialog.trade && <p className="text-sm text-muted-foreground">{editDialog.trade.pirContractNumber || editDialog.trade.referenceNumber}</p>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rate per MT</Label>
              <Input type="number" step="0.01" value={editForm.brokeragePerMT} onChange={(e) => setEditForm(f => ({ ...f, brokeragePerMT: e.target.value }))} data-testid="edit-brokerage-rate" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={editForm.brokerageCurrency} onValueChange={(v) => setEditForm(f => ({ ...f, brokerageCurrency: v }))}>
                <SelectTrigger data-testid="edit-brokerage-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, trade: null })}>Cancel</Button>
            <Button onClick={saveEdit} data-testid="save-brokerage-btn">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
