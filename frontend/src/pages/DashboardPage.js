import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { StatusBadge } from '../components/shared/StatusBadge';
import {
  ShoppingCart, Clock, CheckCircle2, BarChart3,
  CalendarDays, ArrowRight, TrendingUp, AlertCircle, Plus
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, eventsRes, tradesRes] = await Promise.all([
          api.get('/api/trades/stats/overview'),
          api.get('/api/events'),
          api.get('/api/trades'),
        ]);
        setStats(statsRes.data);
        setEvents(eventsRes.data);
        setRecentTrades(tradesRes.data.slice(0, 5));
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const upcomingEvents = events.filter(e => {
    try {
      return isAfter(parseISO(e.date), new Date());
    } catch {
      return false;
    }
  }).slice(0, 4);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="dashboard-welcome">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}!
          </h1>
          <p className="text-slate-500 mt-1">Here is your trading overview.</p>
        </div>
        <Button
          onClick={() => navigate('/trades')}
          className="bg-[#0e7490] hover:bg-[#155e75]"
          data-testid="dashboard-new-trade-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Trade
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="kpi-active-trades-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Trades</CardTitle>
            <ShoppingCart className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{stats?.activeTrades || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              <TrendingUp className="w-3 h-3 inline mr-1 text-emerald-500" />
              In progress
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="kpi-pending-trades-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Trades</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{stats?.pendingTrades || 0}</div>
            <p className="text-xs text-slate-500 mt-1">
              <AlertCircle className="w-3 h-3 inline mr-1 text-amber-500" />
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="kpi-completed-trades-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Completed Trades</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{stats?.completedTrades || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Overall completion</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow" data-testid="trade-progress-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Trade Progress</CardTitle>
            <BarChart3 className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{stats?.completionRate || 0}%</div>
            <Progress value={stats?.completionRate || 0} className="mt-2 h-2" />
            <p className="text-xs text-slate-500 mt-1">Overall completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Trades */}
        <div className="lg:col-span-8">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Trades</CardTitle>
                <CardDescription>Latest trading activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/trades')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentTrades.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No trades yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTrades.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-teal-700">{trade.tradeRef}</span>
                          <StatusBadge status={trade.status} />
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 truncate">
                          {trade.buyerName || 'N/A'} ← {trade.sellerName || 'N/A'} | {trade.commodityName || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-sm font-medium">{trade.quantity?.toLocaleString()} {trade.unit}</p>
                        <p className="text-xs text-slate-500">${trade.price}/{trade.priceUnit?.replace('USD/', '') || 'MT'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <div className="lg:col-span-4">
          <Card className="shadow-sm" data-testid="upcoming-events-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Upcoming Events</CardTitle>
                <CardDescription>Deadlines and meetings</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
                View Calendar
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const typeColors = {
                      meeting: 'bg-blue-100 text-blue-700',
                      deadline: 'bg-amber-100 text-amber-700',
                      payment: 'bg-emerald-100 text-emerald-700',
                      vessel: 'bg-cyan-100 text-cyan-700',
                      general: 'bg-slate-100 text-slate-700',
                    };
                    return (
                      <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${event.type === 'meeting' ? 'bg-blue-500' : event.type === 'deadline' ? 'bg-amber-500' : event.type === 'payment' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <p className="text-xs text-slate-500">
                            {(() => {
                              try {
                                return format(parseISO(event.date), 'MMM d, yyyy');
                              } catch {
                                return event.date;
                              }
                            })()}
                            {event.time ? ` at ${event.time}` : ''}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[event.type] || typeColors.general}`}>
                          {event.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
