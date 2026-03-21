import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { TRADE_STATUS_CONFIG } from '../lib/constants';
import {
  ArrowUpRight, TrendingUp, Plus, CheckCircle2, Clock, AlertCircle,
  Ship, CalendarDays, DollarSign, Users, Building, Box
} from 'lucide-react';
import { format, isAfter, startOfDay, parseISO } from 'date-fns';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [trades, setTrades] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, eventsRes, tradesRes, invoicesRes] = await Promise.all([
          api.get('/api/trades/stats/overview'),
          api.get('/api/events'),
          api.get('/api/trades'),
          api.get('/api/invoices'),
        ]);
        setStats(statsRes.data);
        setEvents(eventsRes.data);
        setTrades(tradesRes.data);
        setInvoices(invoicesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return events.filter(e => {
      try {
        const d = parseISO(e.date);
        return isAfter(d, today) || format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      } catch { return false; }
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events]);

  const pendingInvoices = useMemo(() => {
    return invoices.filter(i => i.status === 'pending').sort((a, b) => {
      try { return new Date(a.dueDate) - new Date(b.dueDate); } catch { return 0; }
    });
  }, [invoices]);

  const upcomingItems = useMemo(() => {
    const items = [];
    pendingInvoices.forEach(inv => {
      items.push({ id: inv.id, type: 'invoice', title: `Invoice ${inv.invoiceNumber} - ${inv.vendorName}`, subtitle: `${inv.currency} ${inv.amount?.toLocaleString()}`, date: inv.dueDate, icon: 'payment' });
    });
    upcomingEvents.forEach(evt => {
      items.push({ id: evt.id, type: 'event', title: evt.title, subtitle: evt.type, date: evt.date, icon: evt.type });
    });
    items.sort((a, b) => { try { return new Date(a.date) - new Date(b.date); } catch { return 0; } });
    return items;
  }, [pendingInvoices, upcomingEvents]);

  const completionRate = stats ? stats.completionRate : 0;
  const recentTrades = trades.slice(0, 5);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6" data-testid="dashboard-page">

      {/* KPI Cards */}
      <div className="flex justify-end gap-4">
        <Card className="relative overflow-hidden w-64" data-testid="kpi-ongoing-trades">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ongoing Trades</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
              <Ship className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeTrades || 0}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-secondary"><TrendingUp className="h-3 w-3" /><span>In transit</span></div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden w-64" data-testid="kpi-pending-trades">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Trades</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.pendingTrades || 0}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><AlertCircle className="h-3 w-3" /><span>Awaiting confirmation</span></div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden w-64" data-testid="kpi-completed-trades">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Trades</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.completedTrades || 0}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-secondary"><TrendingUp className="h-3 w-3" /><span>Increased from last month</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments & Events Detail */}
      <Card data-testid="upcoming-payments-events">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Upcoming Payments & Events</CardTitle>
              <CardDescription>Due invoices, meetings, and conferences</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/calendar')}>View Calendar <ArrowUpRight className="ml-1 h-3 w-3" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming payments or events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    item.icon === 'payment' || item.type === 'invoice' ? 'bg-green-100' :
                    item.icon === 'meeting' ? 'bg-blue-100' :
                    item.icon === 'conference' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    {item.icon === 'payment' || item.type === 'invoice' ? <DollarSign className="h-5 w-5 text-green-600" /> :
                     item.icon === 'meeting' ? <Users className="h-5 w-5 text-blue-600" /> :
                     item.icon === 'conference' ? <Building className="h-5 w-5 text-purple-600" /> :
                     <CalendarDays className="h-5 w-5 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.type === 'invoice' ? `Due payment - ${item.subtitle}` : item.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      item.type === 'invoice' ? 'border-green-200 text-green-700 bg-green-50' :
                      item.icon === 'meeting' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                      item.icon === 'conference' ? 'border-purple-200 text-purple-700 bg-purple-50' :
                      'border-gray-200 text-gray-700 bg-gray-50'
                    }>
                      {item.type === 'invoice' ? 'Invoice' : item.subtitle}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium">{(() => { try { return format(parseISO(item.date), 'MMM d'); } catch { return ''; }})()}</p>
                      <p className="text-xs text-muted-foreground">{(() => { try { return format(parseISO(item.date), 'yyyy'); } catch { return ''; }})()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade Progress */}
      <Card data-testid="trade-progress">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Trade Progress</CardTitle>
              <CardDescription>Overall completion rate</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/trades')}>View All <ArrowUpRight className="ml-1 h-3 w-3" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{completionRate}% Trades Completed</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            <div className="mt-4 flex gap-6">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-secondary" /><span className="text-sm text-muted-foreground">Completed</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-primary" /><span className="text-sm text-muted-foreground">In Progress</span></div>
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-amber-400" /><span className="text-sm text-muted-foreground">Pending</span></div>
            </div>
          </div>
          <div className="space-y-3">
            {recentTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Box className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No trades yet</p>
              </div>
            ) : (
              recentTrades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/trades')}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Box className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-medium">{trade.commodityName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">Due: {(() => { try { return format(parseISO(trade.shipmentWindowEnd), 'MMM d, yyyy'); } catch { return '-'; } })()}</p>
                    </div>
                  </div>
                  <Badge className={TRADE_STATUS_CONFIG[trade.status]?.color || 'bg-slate-100 text-slate-600'}>
                    {TRADE_STATUS_CONFIG[trade.status]?.label || trade.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
