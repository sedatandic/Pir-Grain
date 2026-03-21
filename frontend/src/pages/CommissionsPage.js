import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { StatusBadge } from '../components/shared/StatusBadge';
import { DollarSign, Loader2, Calculator } from 'lucide-react';

export default function CommissionsPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get('/api/trades');
        setTrades(res.data.filter(t => t.brokerage && t.brokerage > 0));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, []);

  const totalBrokerage = trades.reduce((sum, t) => {
    const qty = t.quantity || 0;
    const rate = t.brokerage || 0;
    return sum + (qty * rate);
  }, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Brokerage & Commissions</h1>
        <p className="text-slate-500 text-sm">Track your brokerage earnings</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Brokerage</CardTitle>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">${totalBrokerage.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Trades with Brokerage</CardTitle>
            <Calculator className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{trades.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Rate</CardTitle>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              ${trades.length > 0 ? (trades.reduce((s, t) => s + (t.brokerage || 0), 0) / trades.length).toFixed(2) : '0.00'}/MT
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brokerage Table */}
      <div className="data-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Trade Ref</TableHead>
              <TableHead className="font-semibold">Commodity</TableHead>
              <TableHead className="font-semibold">Buyer</TableHead>
              <TableHead className="font-semibold">Seller</TableHead>
              <TableHead className="font-semibold text-right">Quantity</TableHead>
              <TableHead className="font-semibold text-right">Rate</TableHead>
              <TableHead className="font-semibold text-right">Total</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">No brokerage data</TableCell></TableRow>
            ) : trades.map((t) => (
              <TableRow key={t.id} className="hover:bg-slate-50/70">
                <TableCell className="font-mono text-sm font-medium text-teal-700">{t.tradeRef}</TableCell>
                <TableCell>{t.commodityName || '-'}</TableCell>
                <TableCell>{t.buyerName || '-'}</TableCell>
                <TableCell>{t.sellerName || '-'}</TableCell>
                <TableCell className="text-right tabular-nums">{t.quantity?.toLocaleString() || 0} MT</TableCell>
                <TableCell className="text-right tabular-nums">${t.brokerage || 0}/{t.brokerageUnit?.replace('USD/', '') || 'MT'}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">${((t.quantity || 0) * (t.brokerage || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell><StatusBadge status={t.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
