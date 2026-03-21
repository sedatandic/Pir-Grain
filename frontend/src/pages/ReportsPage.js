import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Loader2, BarChart3, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from 'recharts';
import { TRADE_STATUS_CONFIG } from '../lib/constants';

const COLORS = ['#0e7490', '#0ea5e9', '#334155', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#f97316'];

export default function ReportsPage() {
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, tradesRes] = await Promise.all([
          api.get('/api/trades/stats/overview'),
          api.get('/api/trades'),
        ]);
        setStats(statsRes.data);
        setTrades(tradesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  // Status distribution for pie chart
  const statusData = Object.entries(stats?.statusDistribution || {}).map(([key, value]) => ({
    name: TRADE_STATUS_CONFIG[key]?.label || key,
    value,
  }));

  // Commodity volume
  const commodityVolume = {};
  trades.forEach(t => {
    const name = t.commodityName || 'Unknown';
    commodityVolume[name] = (commodityVolume[name] || 0) + (t.quantity || 0);
  });
  const commodityData = Object.entries(commodityVolume).map(([name, volume]) => ({ name, volume })).sort((a, b) => b.volume - a.volume);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-slate-500 text-sm">Analyze your trading performance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5 text-teal-600" /> Trade Status Distribution</CardTitle>
            <CardDescription>Current status of all trades</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RPieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Commodity Volume */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-teal-600" /> Volume by Commodity</CardTitle>
            <CardDescription>Total quantity traded (MT)</CardDescription>
          </CardHeader>
          <CardContent>
            {commodityData.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={commodityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="volume" fill="#0e7490" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total Trades</p>
            <p className="text-3xl font-semibold tabular-nums mt-1">{stats?.totalTrades || 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Total Volume</p>
            <p className="text-3xl font-semibold tabular-nums mt-1">{trades.reduce((s, t) => s + (t.quantity || 0), 0).toLocaleString()} MT</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Avg Trade Value</p>
            <p className="text-3xl font-semibold tabular-nums mt-1">
              ${trades.length > 0 ? Math.round(trades.reduce((s, t) => s + ((t.quantity || 0) * (t.price || 0)), 0) / trades.length).toLocaleString() : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Completion Rate</p>
            <p className="text-3xl font-semibold tabular-nums mt-1">{stats?.completionRate || 0}%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
