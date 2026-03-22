import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { TRADE_STATUS_CONFIG } from '../lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, BarChart3, TrendingUp, Users, Wheat, Globe, Anchor, DollarSign, Ship } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#1B7A3D', '#C4A54D', '#2563EB', '#DC2626', '#7C3AED', '#059669', '#D97706', '#0891B2', '#BE185D', '#65A30D'];
const GREEN = '#1B7A3D';
const GOLD = '#C4A54D';

function fmt(n) { return typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'; }
function fmtUsd(n) { return `$${typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}`; }

function KpiCard({ label, value, icon: Icon, color = 'text-primary' }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-muted`}><Icon className={`h-4 w-4 ${color}`} /></div>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
      </CardContent>
    </Card>
  );
}

function TopChart({ title, description, data, dataKey, nameKey = 'name', fill = GREEN, formatter, icon: Icon }) {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg p-2 shadow-lg text-sm">
        <p className="font-medium">{d.fullName || d[nameKey]}</p>
        <p className="text-muted-foreground">{formatter ? formatter(payload[0].value) : payload[0].value.toLocaleString()}</p>
      </div>
    );
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">{Icon && <Icon className="h-4 w-4 text-primary" />}{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No data</p> : (
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatter || ((v) => v.toLocaleString())} />
              <YAxis type="category" dataKey={nameKey} tick={{ fontSize: 11 }} width={140} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={dataKey} fill={fill} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// Map name fields to their code counterparts
const CODE_MAP = {
  sellerName: 'sellerCode', buyerName: 'buyerCode', brokerName: 'brokerCode',
  coBrokerName: 'coBrokerCode', commodityName: 'commodityCode',
};

function buildTop10(trades, field, valueField = 'quantity') {
  const codeField = CODE_MAP[field];
  const agg = {};
  trades.forEach(t => {
    const key = t[field] || 'Unknown';
    if (key === 'Unknown') return;
    const label = (codeField && t[codeField]) ? t[codeField] : key;
    if (!agg[key]) agg[key] = { name: label, fullName: key, quantity: 0, value: 0, commission: 0, count: 0 };
    const qty = t.blQuantity || t.quantity || 0;
    agg[key].quantity += qty;
    agg[key].value += qty * (t.pricePerMT || 0);
    agg[key].commission += t.totalCommission || 0;
    agg[key].count += 1;
  });
  const arr = Object.values(agg);
  arr.sort((a, b) => b[valueField] - a[valueField]);
  return arr.slice(0, 10);
}

function DetailBreakdown({ trades, filterField, codeField, label, breakdowns }) {
  const [selected, setSelected] = useState('');
  const uniqueItems = useMemo(() => {
    const seen = {};
    trades.forEach(t => {
      const val = t[filterField];
      if (val && !seen[val]) {
        seen[val] = (codeField && t[codeField]) ? t[codeField] : val;
      }
    });
    return Object.entries(seen).sort((a, b) => a[1].localeCompare(b[1]));
  }, [trades, filterField, codeField]);

  const filtered = useMemo(() => selected ? trades.filter(t => t[filterField] === selected) : [], [trades, selected, filterField]);

  const totalQty = filtered.reduce((s, t) => s + (t.blQuantity || t.quantity || 0), 0);
  const totalVal = filtered.reduce((s, t) => s + ((t.blQuantity || t.quantity || 0) * (t.pricePerMT || 0)), 0);
  const totalComm = filtered.reduce((s, t) => s + (t.totalCommission || 0), 0);

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold">Detailed report for:</span>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
          <SelectContent>{uniqueItems.map(([val, code]) => <SelectItem key={val} value={val}>{code}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {selected && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Quantity" value={`${fmt(totalQty)} Mts`} icon={Ship} color="text-blue-600" />
            <KpiCard label="Trade Value" value={fmtUsd(totalVal)} icon={DollarSign} color="text-green-600" />
            <KpiCard label="Commission" value={fmtUsd(totalComm)} icon={TrendingUp} color="text-amber-600" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {breakdowns.map(({ title, field, fill, icon }) => (
              <TopChart key={title} title={title} description="Quantity (Mts)" data={buildTop10(filtered, field, 'quantity')} dataKey="quantity" fill={fill} formatter={fmt} icon={icon} />
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Trade List</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50">
                    <TableHead>Contract</TableHead><TableHead>Commodity</TableHead><TableHead>Seller</TableHead><TableHead>Buyer</TableHead>
                    <TableHead>Origin</TableHead><TableHead>Destination</TableHead><TableHead className="text-right">Qty (Mts)</TableHead><TableHead className="text-right">Value ($)</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filtered.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-xs">{t.pirContractNumber || t.referenceNumber}</TableCell>
                        <TableCell className="text-xs">{t.commodityName || '-'}</TableCell>
                        <TableCell className="text-xs">{t.sellerCode || t.sellerName || '-'}</TableCell>
                        <TableCell className="text-xs">{t.buyerCode || t.buyerName || '-'}</TableCell>
                        <TableCell className="text-xs">{t.originName || '-'}</TableCell>
                        <TableCell className="text-xs">{t.dischargePortName || '-'}</TableCell>
                        <TableCell className="text-right text-xs">{fmt(t.blQuantity || t.quantity || 0)}</TableCell>
                        <TableCell className="text-right text-xs">{fmtUsd((t.blQuantity || t.quantity || 0) * (t.pricePerMT || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      {selected && filtered.length === 0 && <p className="text-muted-foreground text-sm py-4">No trades found.</p>}
    </div>
  );
}

export default function ReportsPage() {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [metricType, setMetricType] = useState('quantity');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [s, t] = await Promise.all([api.get('/api/trades/stats/overview'), api.get('/api/trades')]);
        setStats(s.data); setTrades(t.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const totalVolume = useMemo(() => trades.reduce((s, t) => s + (t.blQuantity || t.quantity || 0), 0), [trades]);
  const totalValue = useMemo(() => trades.reduce((s, t) => s + ((t.blQuantity || t.quantity || 0) * (t.pricePerMT || 0)), 0), [trades]);
  const totalComm = useMemo(() => trades.reduce((s, t) => s + (t.totalCommission || 0), 0), [trades]);

  const topSellers = useMemo(() => buildTop10(trades, 'sellerName', metricType), [trades, metricType]);
  const topBuyers = useMemo(() => buildTop10(trades, 'buyerName', metricType), [trades, metricType]);
  const topCommodities = useMemo(() => buildTop10(trades, 'commodityName', metricType), [trades, metricType]);
  const topOrigins = useMemo(() => buildTop10(trades, 'originName', metricType), [trades, metricType]);
  const topDischPorts = useMemo(() => buildTop10(trades, 'dischargePortName', metricType), [trades, metricType]);
  const topCoBrokers = useMemo(() => buildTop10(trades, 'coBrokerName', metricType), [trades, metricType]);
  const topBrokers = useMemo(() => buildTop10(trades, 'brokerName', metricType), [trades, metricType]);
  const topLoadPorts = useMemo(() => buildTop10(trades, 'loadingPortName', metricType), [trades, metricType]);

  const statusData = useMemo(() => Object.entries(stats?.statusDistribution || {}).map(([key, value]) => ({ name: TRADE_STATUS_CONFIG[key]?.label || key, value })), [stats]);

  const metricLabel = metricType === 'quantity' ? 'Quantity (Mts)' : metricType === 'value' ? 'Trade Value ($)' : metricType === 'commission' ? 'Commission ($)' : 'Trades';
  const metricFormatter = metricType === 'value' || metricType === 'commission' ? fmtUsd : fmt;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Reports</h1><p className="text-muted-foreground">Analyze your trading performance</p></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Trades" value={stats?.totalTrades || 0} icon={BarChart3} />
        <KpiCard label="Total Volume" value={`${fmt(totalVolume)} Mts`} icon={Ship} color="text-blue-600" />
        <KpiCard label="Total Value" value={fmtUsd(totalValue)} icon={DollarSign} color="text-green-600" />
        <KpiCard label="Total Commission" value={fmtUsd(totalComm)} icon={TrendingUp} color="text-amber-600" />
      </div>

      {/* Metric Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Compare by:</span>
        <Select value={metricType} onValueChange={setMetricType}>
          <SelectTrigger className="w-[180px]" data-testid="metric-selector"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="quantity">Quantity (Mts)</SelectItem>
            <SelectItem value="value">Trade Value ($)</SelectItem>
            <SelectItem value="commission">Commission ($)</SelectItem>
            <SelectItem value="count">Number of Trades</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sellers">Sellers</TabsTrigger>
          <TabsTrigger value="buyers">Buyers</TabsTrigger>
          <TabsTrigger value="commodities">Commodities</TabsTrigger>
          <TabsTrigger value="brokers">Brokers</TabsTrigger>
          <TabsTrigger value="origins">Origins</TabsTrigger>
          <TabsTrigger value="ports">Ports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Trade Status Distribution</CardTitle></CardHeader>
              <CardContent>{statusData.length === 0 ? <p className="text-center py-8 text-muted-foreground text-sm">No data</p> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart>
                </ResponsiveContainer>
              )}</CardContent>
            </Card>
            <TopChart title="Top 10 Commodities" description={metricLabel} data={topCommodities} dataKey={metricType} fill={GREEN} formatter={metricFormatter} icon={Wheat} />
            <TopChart title="Top 10 Sellers" description={metricLabel} data={topSellers} dataKey={metricType} fill="#2563EB" formatter={metricFormatter} icon={Users} />
            <TopChart title="Top 10 Buyers" description={metricLabel} data={topBuyers} dataKey={metricType} fill={GOLD} formatter={metricFormatter} icon={Users} />
          </div>
        </TabsContent>

        <TabsContent value="sellers">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopChart title="Top 10 Sellers by Quantity" description="Mts" data={buildTop10(trades, 'sellerName', 'quantity')} dataKey="quantity" fill="#2563EB" formatter={fmt} icon={Users} />
            <TopChart title="Top 10 Sellers by Trade Value" description="USD" data={buildTop10(trades, 'sellerName', 'value')} dataKey="value" fill={GREEN} formatter={fmtUsd} icon={DollarSign} />
            <TopChart title="Top 10 Sellers by Commission" description="USD" data={buildTop10(trades, 'sellerName', 'commission')} dataKey="commission" fill={GOLD} formatter={fmtUsd} icon={TrendingUp} />
            <TopChart title="Top 10 Sellers by Trade Count" description="Trades" data={buildTop10(trades, 'sellerName', 'count')} dataKey="count" fill="#7C3AED" formatter={fmt} icon={BarChart3} />
          </div>
          <DetailBreakdown trades={trades} filterField="sellerName" codeField="sellerCode" label="Seller" breakdowns={[
            { title: 'By Commodity', field: 'commodityName', fill: GREEN, icon: Wheat },
            { title: 'By Origin', field: 'originName', fill: '#2563EB', icon: Globe },
            { title: 'By Discharge Port', field: 'dischargePortName', fill: GOLD, icon: Anchor },
            { title: 'By Buyer', field: 'buyerName', fill: '#DC2626', icon: Users },
          ]} />
        </TabsContent>

        <TabsContent value="buyers">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopChart title="Top 10 Buyers by Quantity" description="Mts" data={buildTop10(trades, 'buyerName', 'quantity')} dataKey="quantity" fill={GOLD} formatter={fmt} icon={Users} />
            <TopChart title="Top 10 Buyers by Trade Value" description="USD" data={buildTop10(trades, 'buyerName', 'value')} dataKey="value" fill={GREEN} formatter={fmtUsd} icon={DollarSign} />
            <TopChart title="Top 10 Buyers by Commission" description="USD" data={buildTop10(trades, 'buyerName', 'commission')} dataKey="commission" fill="#DC2626" formatter={fmtUsd} icon={TrendingUp} />
            <TopChart title="Top 10 Buyers by Trade Count" description="Trades" data={buildTop10(trades, 'buyerName', 'count')} dataKey="count" fill="#7C3AED" formatter={fmt} icon={BarChart3} />
          </div>
          <DetailBreakdown trades={trades} filterField="buyerName" codeField="buyerCode" label="Buyer" breakdowns={[
            { title: 'By Commodity', field: 'commodityName', fill: GREEN, icon: Wheat },
            { title: 'By Origin', field: 'originName', fill: '#2563EB', icon: Globe },
            { title: 'By Load Port', field: 'loadingPortName', fill: GOLD, icon: Anchor },
            { title: 'By Seller', field: 'sellerName', fill: '#DC2626', icon: Users },
          ]} />
        </TabsContent>

        <TabsContent value="commodities">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopChart title="Top 10 Commodities by Quantity" description="Mts" data={buildTop10(trades, 'commodityName', 'quantity')} dataKey="quantity" fill={GREEN} formatter={fmt} icon={Wheat} />
            <TopChart title="Top 10 Commodities by Trade Value" description="USD" data={buildTop10(trades, 'commodityName', 'value')} dataKey="value" fill="#2563EB" formatter={fmtUsd} icon={DollarSign} />
            <TopChart title="Top 10 Commodities by Commission" description="USD" data={buildTop10(trades, 'commodityName', 'commission')} dataKey="commission" fill={GOLD} formatter={fmtUsd} icon={TrendingUp} />
            <TopChart title="Top 10 Commodities by Trade Count" description="Trades" data={buildTop10(trades, 'commodityName', 'count')} dataKey="count" fill="#7C3AED" formatter={fmt} icon={BarChart3} />
          </div>
        </TabsContent>

        <TabsContent value="brokers">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopChart title="Top 10 Brokers by Commission" description="USD" data={buildTop10(trades, 'brokerName', 'commission')} dataKey="commission" fill={GREEN} formatter={fmtUsd} icon={TrendingUp} />
            <TopChart title="Top 10 Co-Brokers by Commission" description="USD" data={buildTop10(trades, 'coBrokerName', 'commission')} dataKey="commission" fill={GOLD} formatter={fmtUsd} icon={TrendingUp} />
            <TopChart title="Top 10 Brokers by Trade Count" description="Trades" data={buildTop10(trades, 'brokerName', 'count')} dataKey="count" fill="#2563EB" formatter={fmt} icon={BarChart3} />
            <TopChart title="Top 10 Co-Brokers by Quantity" description="Mts" data={buildTop10(trades, 'coBrokerName', 'quantity')} dataKey="quantity" fill="#7C3AED" formatter={fmt} icon={Ship} />
          </div>
        </TabsContent>

        <TabsContent value="origins">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopChart title="Top 10 Origins by Quantity" description="Mts" data={buildTop10(trades, 'originName', 'quantity')} dataKey="quantity" fill={GREEN} formatter={fmt} icon={Globe} />
            <TopChart title="Top 10 Origins by Trade Value" description="USD" data={buildTop10(trades, 'originName', 'value')} dataKey="value" fill="#2563EB" formatter={fmtUsd} icon={DollarSign} />
            <TopChart title="Top 10 Origins by Commission" description="USD" data={buildTop10(trades, 'originName', 'commission')} dataKey="commission" fill={GOLD} formatter={fmtUsd} icon={TrendingUp} />
            <TopChart title="Top 10 Origins by Trade Count" description="Trades" data={buildTop10(trades, 'originName', 'count')} dataKey="count" fill="#7C3AED" formatter={fmt} icon={BarChart3} />
          </div>
          <DetailBreakdown trades={trades} filterField="originName" codeField={null} label="Origin" breakdowns={[
            { title: 'By Seller', field: 'sellerName', fill: '#2563EB', icon: Users },
            { title: 'By Buyer', field: 'buyerName', fill: GOLD, icon: Users },
            { title: 'By Commodity', field: 'commodityName', fill: GREEN, icon: Wheat },
            { title: 'By Discharge Port', field: 'dischargePortName', fill: '#DC2626', icon: Anchor },
          ]} />
        </TabsContent>

        <TabsContent value="ports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopChart title="Top 10 Load Ports by Quantity" description="Mts" data={buildTop10(trades, 'loadingPortName', 'quantity')} dataKey="quantity" fill={GREEN} formatter={fmt} icon={Anchor} />
            <TopChart title="Top 10 Discharge Ports by Quantity" description="Mts" data={buildTop10(trades, 'dischargePortName', 'quantity')} dataKey="quantity" fill="#2563EB" formatter={fmt} icon={Anchor} />
            <TopChart title="Top 10 Load Ports by Trade Value" description="USD" data={buildTop10(trades, 'loadingPortName', 'value')} dataKey="value" fill={GOLD} formatter={fmtUsd} icon={DollarSign} />
            <TopChart title="Top 10 Discharge Ports by Trade Value" description="USD" data={buildTop10(trades, 'dischargePortName', 'value')} dataKey="value" fill="#DC2626" formatter={fmtUsd} icon={DollarSign} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
