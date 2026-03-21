import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { TRADE_STATUS_CONFIG } from '../lib/constants';
import { Loader2, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#2B5B84', '#8BC53F', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#334155'];

export default function ReportsPage() {
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [s, t] = await Promise.all([api.get('/api/trades/stats/overview'), api.get('/api/trades')]);
        setStats(s.data); setTrades(t.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const statusData = Object.entries(stats?.statusDistribution || {}).map(([key, value]) => ({ name: TRADE_STATUS_CONFIG[key]?.label || key, value }));
  const commodityVolume = {};
  trades.forEach(t => { const n = t.commodityName || 'Unknown'; commodityVolume[n] = (commodityVolume[n] || 0) + (t.quantity || 0); });
  const commodityData = Object.entries(commodityVolume).map(([name, volume]) => ({ name, volume })).sort((a, b) => b.volume - a.volume);
  const totalVolume = trades.reduce((s, t) => s + (t.quantity || 0), 0);
  const totalValue = trades.reduce((s, t) => s + ((t.quantity || 0) * (t.pricePerMT || 0)), 0);
  const totalComm = trades.reduce((s, t) => s + (t.totalCommission || 0), 0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Reports</h1><p className="text-muted-foreground">Analyze your trading performance</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Trades</p><p className="text-3xl font-bold mt-1">{stats?.totalTrades || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Volume</p><p className="text-3xl font-bold mt-1">{totalVolume.toLocaleString()} MT</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Value</p><p className="text-3xl font-bold mt-1">${(totalValue / 1000000).toFixed(1)}M</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Commission</p><p className="text-3xl font-bold mt-1">${totalComm.toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-primary" />Trade Status</CardTitle><CardDescription>Current distribution</CardDescription></CardHeader>
          <CardContent>{statusData.length === 0 ? <p className="text-center py-8 text-muted-foreground">No data</p> : (
            <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">{statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
          )}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Volume by Commodity</CardTitle><CardDescription>Total quantity (MT)</CardDescription></CardHeader>
          <CardContent>{commodityData.length === 0 ? <p className="text-center py-8 text-muted-foreground">No data</p> : (
            <ResponsiveContainer width="100%" height={300}><BarChart data={commodityData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="volume" fill="#2B5B84" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
          )}</CardContent>
        </Card>
      </div>
    </div>
  );
}
