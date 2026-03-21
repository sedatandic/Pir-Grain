import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { TRADE_STATUS_CONFIG, TRADE_STATUSES } from '../lib/constants';
import { StatusBadge } from '../components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const emptyTrade = {
  buyerId: '', sellerId: '', brokerId: '', commodityId: '',
  origin: '', quantity: '', unit: 'MT', price: '', priceUnit: 'USD/MT',
  currency: 'USD', contractNumber: '', contractDate: '',
  shipmentWindowStart: '', shipmentWindowEnd: '',
  loadingPort: '', dischargePort: '', vesselId: '',
  surveyorId: '', brokerage: '', brokerageUnit: 'USD/MT',
  paymentTerms: '', notes: '', status: 'pending',
};

export default function TradesPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [deletingTrade, setDeletingTrade] = useState(null);
  const [form, setForm] = useState(emptyTrade);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [partners, setPartners] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [ports, setPorts] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [surveyors, setSurveyors] = useState([]);

  const fetchTrades = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get('/api/trades', { params });
      setTrades(res.data);
    } catch (err) {
      toast.error('Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [partnersRes, commRes, portsRes, vesselsRes, surveyorsRes] = await Promise.all([
        api.get('/api/partners'),
        api.get('/api/commodities'),
        api.get('/api/ports'),
        api.get('/api/vessels'),
        api.get('/api/surveyors'),
      ]);
      setPartners(partnersRes.data);
      setCommodities(commRes.data);
      setPorts(portsRes.data);
      setVessels(vesselsRes.data);
      setSurveyors(surveyorsRes.data);
    } catch (err) {
      console.error('Failed to load reference data', err);
    }
  }, []);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);
  useEffect(() => { fetchReferenceData(); }, [fetchReferenceData]);

  const openCreate = () => {
    setEditingTrade(null);
    setForm(emptyTrade);
    setDialogOpen(true);
  };

  const openEdit = (trade) => {
    setEditingTrade(trade);
    setForm({
      buyerId: trade.buyerId || '',
      sellerId: trade.sellerId || '',
      brokerId: trade.brokerId || '',
      commodityId: trade.commodityId || '',
      origin: trade.origin || '',
      quantity: trade.quantity || '',
      unit: trade.unit || 'MT',
      price: trade.price || '',
      priceUnit: trade.priceUnit || 'USD/MT',
      currency: trade.currency || 'USD',
      contractNumber: trade.contractNumber || '',
      contractDate: trade.contractDate ? trade.contractDate.split('T')[0] : '',
      shipmentWindowStart: trade.shipmentWindowStart ? trade.shipmentWindowStart.split('T')[0] : '',
      shipmentWindowEnd: trade.shipmentWindowEnd ? trade.shipmentWindowEnd.split('T')[0] : '',
      loadingPort: trade.loadingPort || '',
      dischargePort: trade.dischargePort || '',
      vesselId: trade.vesselId || '',
      surveyorId: trade.surveyorId || '',
      brokerage: trade.brokerage || '',
      brokerageUnit: trade.brokerageUnit || 'USD/MT',
      paymentTerms: trade.paymentTerms || '',
      notes: trade.notes || '',
      status: trade.status || 'pending',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...form,
        quantity: form.quantity ? parseFloat(form.quantity) : null,
        price: form.price ? parseFloat(form.price) : null,
        brokerage: form.brokerage ? parseFloat(form.brokerage) : null,
      };
      if (editingTrade) {
        await api.put(`/api/trades/${editingTrade.id}`, data);
        toast.success('Trade updated successfully');
      } else {
        await api.post('/api/trades', data);
        toast.success('Trade created successfully');
      }
      setDialogOpen(false);
      fetchTrades();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save trade');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTrade) return;
    try {
      await api.delete(`/api/trades/${deletingTrade.id}`);
      toast.success('Trade deleted');
      setDeleteDialogOpen(false);
      setDeletingTrade(null);
      fetchTrades();
    } catch (err) {
      toast.error('Failed to delete trade');
    }
  };

  const buyers = partners.filter(p => p.type === 'buyer');
  const sellers = partners.filter(p => p.type === 'seller');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trades</h1>
          <p className="text-slate-500 text-sm">Manage your commodity trades</p>
        </div>
        <Button onClick={openCreate} className="bg-[#0e7490] hover:bg-[#155e75]" data-testid="trades-new-trade-button">
          <Plus className="w-4 h-4 mr-2" /> New Trade
        </Button>
      </div>

      {/* Toolbar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                data-testid="trades-search-input"
                placeholder="Search trades..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="trades-status-filter-select">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {TRADE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{TRADE_STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="data-table" data-testid="trades-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Trade Ref</TableHead>
              <TableHead className="font-semibold">Buyer</TableHead>
              <TableHead className="font-semibold">Seller</TableHead>
              <TableHead className="font-semibold">Commodity</TableHead>
              <TableHead className="font-semibold text-right">Quantity</TableHead>
              <TableHead className="font-semibold text-right">Price</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </TableCell>
              </TableRow>
            ) : trades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  No trades found
                </TableCell>
              </TableRow>
            ) : (
              trades.map((trade) => (
                <TableRow key={trade.id} className="hover:bg-slate-50/70">
                  <TableCell className="font-mono text-sm font-medium text-teal-700">{trade.tradeRef}</TableCell>
                  <TableCell className="text-sm">{trade.buyerName || '-'}</TableCell>
                  <TableCell className="text-sm">{trade.sellerName || '-'}</TableCell>
                  <TableCell className="text-sm">{trade.commodityName || '-'}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">
                    {trade.quantity ? `${trade.quantity.toLocaleString()} ${trade.unit || 'MT'}` : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">
                    {trade.price ? `$${trade.price}` : '-'}
                  </TableCell>
                  <TableCell><StatusBadge status={trade.status} /></TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {trade.createdAt ? (() => { try { return format(parseISO(trade.createdAt), 'MMM d, yyyy'); } catch { return '-'; } })() : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="trade-row-actions-menu-button">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem data-testid="trade-row-edit-menu-item" onClick={() => openEdit(trade)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          data-testid="trade-row-delete-menu-item"
                          className="text-red-600"
                          onClick={() => { setDeletingTrade(trade); setDeleteDialogOpen(true); }}
                        >
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrade ? 'Edit Trade' : 'New Trade'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Buyer</Label>
              <Select value={form.buyerId} onValueChange={(v) => setForm({ ...form, buyerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select buyer" /></SelectTrigger>
                <SelectContent>
                  {buyers.map((b) => <SelectItem key={b.id} value={b.id}>{b.companyName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seller</Label>
              <Select value={form.sellerId} onValueChange={(v) => setForm({ ...form, sellerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select seller" /></SelectTrigger>
                <SelectContent>
                  {sellers.map((s) => <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commodity</Label>
              <Select value={form.commodityId} onValueChange={(v) => setForm({ ...form, commodityId: v })}>
                <SelectTrigger><SelectValue placeholder="Select commodity" /></SelectTrigger>
                <SelectContent>
                  {commodities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origin</Label>
              <Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Turkey" />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex gap-2">
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" className="flex-1" />
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-20" placeholder="MT" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <div className="flex gap-2">
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="flex-1" />
                <Input value={form.priceUnit} onChange={(e) => setForm({ ...form, priceUnit: e.target.value })} className="w-24" placeholder="USD/MT" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contract Number</Label>
              <Input value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} placeholder="CNT-0000" />
            </div>
            <div className="space-y-2">
              <Label>Contract Date</Label>
              <Input type="date" value={form.contractDate} onChange={(e) => setForm({ ...form, contractDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Shipment Window Start</Label>
              <Input type="date" value={form.shipmentWindowStart} onChange={(e) => setForm({ ...form, shipmentWindowStart: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Shipment Window End</Label>
              <Input type="date" value={form.shipmentWindowEnd} onChange={(e) => setForm({ ...form, shipmentWindowEnd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Loading Port</Label>
              <Input value={form.loadingPort} onChange={(e) => setForm({ ...form, loadingPort: e.target.value })} placeholder="e.g. Mersin" />
            </div>
            <div className="space-y-2">
              <Label>Discharge Port</Label>
              <Input value={form.dischargePort} onChange={(e) => setForm({ ...form, dischargePort: e.target.value })} placeholder="e.g. Mumbai" />
            </div>
            <div className="space-y-2">
              <Label>Vessel</Label>
              <Select value={form.vesselId} onValueChange={(v) => setForm({ ...form, vesselId: v })}>
                <SelectTrigger><SelectValue placeholder="Select vessel" /></SelectTrigger>
                <SelectContent>
                  {vessels.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Surveyor</Label>
              <Select value={form.surveyorId} onValueChange={(v) => setForm({ ...form, surveyorId: v })}>
                <SelectTrigger><SelectValue placeholder="Select surveyor" /></SelectTrigger>
                <SelectContent>
                  {surveyors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brokerage</Label>
              <div className="flex gap-2">
                <Input type="number" value={form.brokerage} onChange={(e) => setForm({ ...form, brokerage: e.target.value })} placeholder="0.00" className="flex-1" />
                <Input value={form.brokerageUnit} onChange={(e) => setForm({ ...form, brokerageUnit: e.target.value })} className="w-24" placeholder="USD/MT" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="e.g. LC at sight" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRADE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{TRADE_STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="modal-cancel-button">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0e7490] hover:bg-[#155e75]" data-testid="modal-save-button">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingTrade ? 'Update Trade' : 'Create Trade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete trade {deletingTrade?.tradeRef}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="trade-delete-confirm-button">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
