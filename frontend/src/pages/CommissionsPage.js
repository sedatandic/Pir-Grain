import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { TRADE_STATUS_CONFIG, PENDING_STATUSES, ONGOING_STATUSES, COMPLETED_STATUSES } from '../lib/constants';
import { DollarSign, TrendingUp, Clock, CheckCircle, Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CommissionsPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get('/api/trades'); setTrades(res.data); } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const categorized = useMemo(() => ({
    ongoing: trades.filter(t => ONGOING_STATUSES.includes(t.status)),
    pending: trades.filter(t => PENDING_STATUSES.includes(t.status)),
    completed: trades.filter(t => COMPLETED_STATUSES.includes(t.status) || t.status === 'cancelled' || t.status === 'washout' || t.status === 'wash-out'),
  }), [trades]);

  const applySearch = (list) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(t => (t.referenceNumber||'').toLowerCase().includes(q) || (t.commodityName||'').toLowerCase().includes(q) || (t.sellerName||'').toLowerCase().includes(q) || (t.buyerName||'').toLowerCase().includes(q));
  };

  const stats = useMemo(() => ({
    total: trades.reduce((s, t) => s + (t.totalCommission || 0), 0),
    ongoing: categorized.ongoing.reduce((s, t) => s + (t.totalCommission || 0), 0),
    pending: categorized.pending.reduce((s, t) => s + (t.totalCommission || 0), 0),
    completed: categorized.completed.reduce((s, t) => s + (t.totalCommission || 0), 0),
  }), [trades, categorized]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const fmtQty = (q) => `${(q||0).toLocaleString()} MT`;

  const renderTable = (list, empty) => {
    const filtered = applySearch(list);
    if (filtered.length === 0) return <div className="text-center py-6 text-muted-foreground text-sm">{empty}</div>;
    return (
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Contract No</TableHead><TableHead>Commodity</TableHead><TableHead>Seller</TableHead><TableHead>Buyer</TableHead>
            <TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Rate/MT</TableHead><TableHead className="text-right">Commission</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-primary">{t.referenceNumber}</TableCell>
                <TableCell className="text-sm">{t.commodityName||'-'}</TableCell>
                <TableCell className="text-sm">{t.sellerCode||t.sellerName||'-'}</TableCell>
                <TableCell className="text-sm">{t.buyerCode||t.buyerName||'-'}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmtQty(t.quantity)}</TableCell>
                <TableCell className="text-right font-mono text-sm">${t.brokeragePerMT||0}</TableCell>
                <TableCell className="text-right font-mono text-sm font-medium">{fmt(t.totalCommission||0)}</TableCell>
                <TableCell><Badge className={TRADE_STATUS_CONFIG[t.status]?.color||'bg-muted'}>{TRADE_STATUS_CONFIG[t.status]?.label||t.status}</Badge></TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell colSpan={6} className="text-right">Total:</TableCell>
              <TableCell className="text-right font-mono">{fmt(filtered.reduce((s,t)=>s+(t.totalCommission||0),0))}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Brokerage & Commissions</h1><p className="text-muted-foreground">Track your brokerage earnings across all trades</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle><DollarSign className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(stats.total)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ongoing</CardTitle><TrendingUp className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{fmt(stats.ongoing)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle><Clock className="h-4 w-4 text-amber-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{fmt(stats.pending)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle><CheckCircle className="h-4 w-4 text-slate-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-slate-600">{fmt(stats.completed)}</div></CardContent></Card>
      </div>

      <div className="relative max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      <div className="space-y-4">
        <Card className="border-l-4 border-l-green-500"><CardHeader className="pb-3"><CardTitle className="text-lg text-green-800">Ongoing ({categorized.ongoing.length})</CardTitle></CardHeader><CardContent>{renderTable(categorized.ongoing, 'No ongoing trades')}</CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardHeader className="pb-3"><CardTitle className="text-lg text-blue-800">Pending ({categorized.pending.length})</CardTitle></CardHeader><CardContent>{renderTable(categorized.pending, 'No pending trades')}</CardContent></Card>
        <Card className="border-l-4 border-l-slate-400"><CardHeader className="pb-3"><CardTitle className="text-lg text-slate-700">Completed ({categorized.completed.length})</CardTitle></CardHeader><CardContent>{renderTable(categorized.completed, 'No completed trades')}</CardContent></Card>
      </div>
    </div>
  );
}
