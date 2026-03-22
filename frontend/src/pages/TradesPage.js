import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { TRADE_STATUS_CONFIG, STATUS_OPTIONS, COMPLETED_STATUSES, WASHOUT_STATUSES, CANCELLED_STATUSES } from '../lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Plus, Search, Ship, Clock, CheckCircle, Filter, X, AlertTriangle, Ban, Loader2, Pencil, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function TradesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [trades, setTrades] = useState([]);
  const [partners, setPartners] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCommodity, setFilterCommodity] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterBuyer, setFilterBuyer] = useState('all');
  const [filterVessel, setFilterVessel] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCoBroker, setFilterCoBroker] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState(null); // { type: 'seller'|'buyer'|'broker', name: '...', code: '...' }

  const fetchAll = useCallback(async () => {
    try {
      const [tr, pa, co, or, ve] = await Promise.all([
        api.get('/api/trades'),
        api.get('/api/partners'),
        api.get('/api/commodities'),
        api.get('/api/origins'),
        api.get('/api/vessels'),
      ]);
      setTrades(tr.data);
      setPartners(pa.data);
      setCommodities(co.data);
      setOrigins(or.data);
      setVessels(ve.data);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Scroll to section when navigating from dashboard
  useEffect(() => {
    if (location.state?.scrollTo && !loading) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
      // Clear state so refresh doesn't re-scroll
      window.history.replaceState({}, '');
    }
  }, [location.state, loading]);

  const hasActiveFilters = search || filterCommodity !== 'all' || filterSeller !== 'all' || filterBuyer !== 'all' || filterVessel !== 'all' || filterOrigin !== 'all' || filterStatus !== 'all' || filterCoBroker !== 'all' || filterYear !== new Date().getFullYear().toString();
  const clearFilters = () => { setSearch(''); setFilterCommodity('all'); setFilterSeller('all'); setFilterBuyer('all'); setFilterVessel('all'); setFilterOrigin('all'); setFilterStatus('all'); setFilterCoBroker('all'); setFilterYear(new Date().getFullYear().toString()); };

  const getTradeYear = useCallback((trade) => {
    const d = trade.contractDate || trade.createdAt || '';
    const slashMatch = d.match(/^\d{2}\/\d{2}\/(\d{4})$/);
    if (slashMatch) return slashMatch[1];
    if (d.length >= 4) return d.substring(0, 4);
    return '';
  }, []);

  const currentYear = new Date().getFullYear().toString();
  const yearFilteredTrades = useMemo(() => {
    return trades.filter(t => {
      const tradeYear = getTradeYear(t);
      if (tradeYear === filterYear) return true;
      // When viewing current year, also include older trades that are NOT yet completed/cancelled/washout
      if (filterYear === currentYear) {
        const isIncomplete = !COMPLETED_STATUSES.includes(t.status) &&
                             !CANCELLED_STATUSES.includes(t.status) &&
                             !WASHOUT_STATUSES.includes(t.status);
        return isIncomplete;
      }
      return false;
    });
  }, [trades, filterYear, currentYear, getTradeYear]);

  const sellers = useMemo(() => partners.filter(p => p.type === 'seller'), [partners]);
  const buyers = useMemo(() => partners.filter(p => p.type === 'buyer'), [partners]);
  const uniqueVessels = useMemo(() => [...new Set(trades.filter(t => t.vesselName).map(t => t.vesselName))].sort(), [trades]);
  const uniqueCoBrokers = useMemo(() => {
    const map = new Map();
    trades.forEach(t => { if (t.coBrokerId && t.coBrokerName) map.set(t.coBrokerId, t.coBrokerName); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [trades]);

  const entityTrades = useMemo(() => {
    if (!entityFilter) return [];
    return trades.filter(t => {
      if (entityFilter.type === 'seller') return t.sellerName === entityFilter.name;
      if (entityFilter.type === 'buyer') return t.buyerName === entityFilter.name;
      if (entityFilter.type === 'broker') return t.brokerName === entityFilter.name || t.coBrokerName === entityFilter.name;
      return false;
    });
  }, [trades, entityFilter]);

  const applyFilters = useCallback((list) => {
    let result = list;
    if (filterCommodity !== 'all') result = result.filter(t => t.commodityId === filterCommodity);
    if (filterSeller !== 'all') result = result.filter(t => t.sellerId === filterSeller);
    if (filterBuyer !== 'all') result = result.filter(t => t.buyerId === filterBuyer);
    if (filterVessel !== 'all') result = result.filter(t => t.vesselName === filterVessel);
    if (filterOrigin !== 'all') result = result.filter(t => t.originId === filterOrigin);
    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    if (filterCoBroker !== 'all') result = result.filter(t => t.coBrokerId === filterCoBroker);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        (t.referenceNumber || '').toLowerCase().includes(q) ||
        (t.sellerName || '').toLowerCase().includes(q) ||
        (t.buyerName || '').toLowerCase().includes(q) ||
        (t.commodityName || '').toLowerCase().includes(q) ||
        (t.vesselName || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [filterCommodity, filterSeller, filterBuyer, filterVessel, filterOrigin, filterStatus, filterCoBroker, search]);

  const categorized = useMemo(() => ({
    ongoing: yearFilteredTrades.filter(t => !['completed', 'cancelled', 'washout'].includes(t.status) && t.vesselName),
    pending: yearFilteredTrades.filter(t => !['completed', 'cancelled', 'washout'].includes(t.status) && !t.vesselName),
    completed: yearFilteredTrades.filter(t => COMPLETED_STATUSES.includes(t.status)),
    washout: yearFilteredTrades.filter(t => WASHOUT_STATUSES.includes(t.status)),
    cancelled: yearFilteredTrades.filter(t => CANCELLED_STATUSES.includes(t.status)),
  }), [yearFilteredTrades]);

  const filtered = useMemo(() => ({
    ongoing: applyFilters(categorized.ongoing),
    pending: applyFilters(categorized.pending),
    completed: applyFilters(categorized.completed),
    washout: applyFilters(categorized.washout),
    cancelled: applyFilters(categorized.cancelled),
  }), [categorized, applyFilters]);

  const handleStatusChange = async (tradeId, newStatus) => {
    try {
      await api.patch(`/api/trades/${tradeId}/status`, { status: newStatus });
      setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: newStatus } : t));
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const formatDate = (d) => { if (!d) return '-'; if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d; try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return '-'; } };
  const formatShipmentDate = (d) => { if (!d) return ''; const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) return d; try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; } };
  const formatQty = (q) => q ? `${q.toLocaleString()} MT` : '-';

  const handleVesselUpdate = async (tradeId, vesselName) => {
    try {
      await api.put(`/api/trades/${tradeId}`, { vesselName: vesselName || '' });
      setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, vesselName } : t));
      toast.success('Vessel updated');
    } catch { toast.error('Failed to update vessel'); }
  };

  const VesselPicker = ({ trade }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const ref = useRef(null);

    useEffect(() => {
      const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      if (open) document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const sorted = useMemo(() => {
      const list = vessels.map(v => v.name).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'));
      if (!q) return list;
      return list.filter(n => n.toLowerCase().includes(q.toLowerCase()));
    }, [q]);

    if (!open) {
      return (
        <button
          data-testid={`vessel-picker-${trade.id}`}
          className="w-full text-center text-sm uppercase cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
          onClick={(e) => { e.stopPropagation(); setOpen(true); setQ(''); }}
        >
          {trade.vesselName || <span className="text-muted-foreground">-</span>}
        </button>
      );
    }

    return (
      <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
        <Input
          autoFocus
          data-testid={`vessel-search-${trade.id}`}
          className="h-7 text-xs"
          placeholder="Search vessel..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="absolute z-50 mt-1 w-48 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md text-sm">
          {trade.vesselName && (
            <button className="w-full text-left px-3 py-1.5 hover:bg-muted text-destructive text-xs" onClick={() => { handleVesselUpdate(trade.id, ''); setOpen(false); }}>
              Clear vessel
            </button>
          )}
          {sorted.length === 0 && <div className="px-3 py-2 text-muted-foreground text-xs">No vessels found</div>}
          {sorted.map(name => (
            <button
              key={name}
              className={`w-full text-left px-3 py-1.5 hover:bg-muted text-xs uppercase ${name === trade.vesselName ? 'bg-muted font-medium' : ''}`}
              onClick={() => { handleVesselUpdate(trade.id, name); setOpen(false); }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderTable = (list, empty) => {
    if (list.length === 0) return <div className="text-center py-8 text-muted-foreground text-sm">{search || hasActiveFilters ? 'No trades match your search or filters' : empty}</div>;
    return (
      <div className="overflow-x-auto border rounded-lg">
        <Table className="trade-table">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Contract Date</TableHead>
              <TableHead className="text-center">Contract No</TableHead>
              <TableHead className="text-center">Seller</TableHead>
              <TableHead className="text-center">Buyer</TableHead>
              <TableHead className="text-center">Broker</TableHead>
              <TableHead className="text-center">Commodity</TableHead>
              <TableHead className="text-center">Origin</TableHead>
              <TableHead className="text-center">Quantity<br/><span className="text-xs font-normal text-muted-foreground">(Mts)</span></TableHead>
              <TableHead className="text-center">Delivery Term</TableHead>
              <TableHead className="text-center whitespace-nowrap">Unit Price</TableHead>
              <TableHead className="text-center">Shipment Period</TableHead>
              <TableHead className="text-center">Vessel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((trade) => (
              <TableRow key={trade.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/trades/${trade.id}`)}>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Select value={trade.status} onValueChange={(v) => handleStatusChange(trade.id, v)}>
                    <SelectTrigger className="w-full h-8 justify-center border-0 shadow-none focus:ring-0">
                      <Badge className={`${TRADE_STATUS_CONFIG[trade.status]?.color || 'bg-muted text-muted-foreground'} status-badge truncate`}>
                        {(TRADE_STATUS_CONFIG[trade.status]?.label || trade.status).toUpperCase()}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center text-sm">{formatDate(trade.contractDate || trade.createdAt)}</TableCell>
                <TableCell className="text-center">
                  <Link to={`/trades/${trade.id}`} className="font-medium text-primary hover:underline cursor-pointer text-sm">
                    {trade.pirContractNumber || trade.contractNumber || trade.referenceNumber}
                  </Link>
                  {trade.sellerContractNumber && trade.sellerContractNumber !== 'N/A' && (
                    <div className="text-xs text-muted-foreground">{trade.sellerContractNumber}</div>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm whitespace-nowrap"><span className="cursor-pointer text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setEntityFilter({ type: 'seller', name: trade.sellerName, code: trade.sellerCode || trade.sellerName }); }}>{trade.sellerCode || trade.sellerName || '-'}</span></TableCell>
                <TableCell className="text-center text-sm whitespace-nowrap"><span className="cursor-pointer text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setEntityFilter({ type: 'buyer', name: trade.buyerName, code: trade.buyerCode || trade.buyerName }); }}>{trade.buyerCode || trade.buyerName || '-'}</span></TableCell>
                <TableCell className="text-center text-sm whitespace-nowrap">{(trade.brokerCode || trade.brokerName) ? (
                  trade.coBrokerName ? (
                    <div className="flex flex-col items-center">
                      <span className="cursor-pointer text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setEntityFilter({ type: 'broker', name: trade.brokerName, code: trade.brokerCode || trade.brokerName }); }}>{trade.brokerCode || trade.brokerName}</span>
                      <hr className="w-full border-t border-border my-0.5" />
                      <span className="cursor-pointer text-orange-600 hover:underline" onClick={(e) => { e.stopPropagation(); setEntityFilter({ type: 'broker', name: trade.coBrokerName, code: trade.coBrokerCode || trade.coBrokerName }); }}>{trade.coBrokerCode || trade.coBrokerName}</span>
                    </div>
                  ) : <span className="cursor-pointer text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setEntityFilter({ type: 'broker', name: trade.brokerName, code: trade.brokerCode || trade.brokerName }); }}>{trade.brokerCode || trade.brokerName}</span>
                ) : '-'}</TableCell>
                <TableCell className="text-center text-sm max-w-[160px]">{trade.commodityName || '-'}</TableCell>
                <TableCell className="text-center text-sm whitespace-nowrap">{trade.originName || '-'}</TableCell>
                <TableCell className="text-center font-mono text-sm">{trade.quantity ? trade.quantity.toLocaleString() : '-'}</TableCell>
                <TableCell className="text-center text-sm whitespace-nowrap">{(() => {
                  const port = trade.basePortName || trade.loadingPortName || '';
                  const term = trade.deliveryTerm || '';
                  const baseTerm = port && port.toLowerCase().startsWith(term.toLowerCase()) ? port : [term, port].filter(Boolean).join(' ') || '-';
                  const pvs = trade.portVariations || [];
                  if (pvs.length === 0) return baseTerm;
                  return (
                    <div className="flex flex-col items-center">
                      <span>{baseTerm}</span>
                      {pvs.map((pv, i) => (
                        <span key={i}><hr className="w-full border-t border-border my-0.5" /><span className="text-muted-foreground">{term} {pv.portName}</span></span>
                      ))}
                    </div>
                  );
                })()}</TableCell>
                <TableCell className="text-center font-mono text-sm whitespace-nowrap">{(() => {
                  const basePrice = trade.pricePerMT;
                  const currency = trade.currency || 'USD';
                  if (!basePrice) return '-';
                  const pvs = trade.portVariations || [];
                  if (pvs.length === 0) return `${basePrice.toLocaleString()} ${currency}`;
                  return (
                    <div className="flex flex-col items-center">
                      <span>{basePrice.toLocaleString()} {currency}</span>
                      {pvs.map((pv, i) => {
                        const adjusted = basePrice + Number(pv.difference || 0);
                        return (
                          <span key={i}><hr className="w-full border-t border-border my-0.5" /><span className="text-muted-foreground">{adjusted.toLocaleString()} {currency}</span></span>
                        );
                      })}
                    </div>
                  );
                })()}</TableCell>
                <TableCell className="text-center text-sm">{trade.shipmentWindowStart || trade.shipmentWindowEnd ? <div>{formatShipmentDate(trade.shipmentWindowStart) && <div>{formatShipmentDate(trade.shipmentWindowStart)}</div>}{formatShipmentDate(trade.shipmentWindowEnd) && <div>{formatShipmentDate(trade.shipmentWindowEnd)}</div>}</div> : '-'}</TableCell>
                <TableCell className="text-center text-sm whitespace-nowrap"><VesselPicker trade={trade} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trades</h1>
        <p className="text-muted-foreground">Manage all your commodity trades</p>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 overflow-x-auto">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input data-testid="trades-search-input" placeholder="Search trades..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-[200px]" />
            </div>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-destructive hover:text-destructive" data-testid="trades-clear-filter"><X className="h-4 w-4 mr-1" />Clear Filter</Button>}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[100px] shrink-0" data-testid="trades-year-filter"><CalendarDays className="h-3.5 w-3.5 mr-1 text-muted-foreground" /><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCommodity} onValueChange={setFilterCommodity}>
              <SelectTrigger className="w-[160px] shrink-0"><SelectValue placeholder="Commodity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commodities</SelectItem>
                {commodities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterOrigin} onValueChange={setFilterOrigin}>
              <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Origin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Origins</SelectItem>
                {origins.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSeller} onValueChange={setFilterSeller}>
              <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Seller" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sellers</SelectItem>
                {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBuyer} onValueChange={setFilterBuyer}>
              <SelectTrigger className="w-[130px] shrink-0"><SelectValue placeholder="Buyer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buyers</SelectItem>
                {buyers.map(b => <SelectItem key={b.id} value={b.id}>{b.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCoBroker} onValueChange={setFilterCoBroker}>
              <SelectTrigger className="w-[140px] shrink-0"><SelectValue placeholder="Co-Broker" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Co-Brokers</SelectItem>
                {uniqueCoBrokers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto shrink-0">
              <Button onClick={() => navigate('/trades/new')} data-testid="trades-new-trade-button"><Plus className="mr-2 h-4 w-4" />New Trade</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ongoing */}
      <Card id="trades-ongoing" className="border-l-4 border-l-emerald-500 bg-emerald-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2"><Ship className="h-5 w-5 text-emerald-600" /><CardTitle className="text-emerald-800">Ongoing Trades</CardTitle><Badge variant="secondary" className="bg-emerald-100 text-emerald-800">{filtered.ongoing.length}</Badge></div>
          <CardDescription className="text-emerald-700">Trades with vessel details</CardDescription>
        </CardHeader>
        <CardContent>{renderTable(filtered.ongoing, 'No ongoing contracts')}</CardContent>
      </Card>

      {/* Pending */}
      <Card id="trades-pending" className="border-l-4 border-l-amber-400 bg-amber-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2"><Clock className="h-5 w-5 text-amber-600" /><CardTitle className="text-amber-800">Pending Trades</CardTitle><Badge variant="secondary" className="bg-amber-100 text-amber-800">{filtered.pending.length}</Badge></div>
          <CardDescription className="text-amber-700">Waiting for vessel nomination</CardDescription>
        </CardHeader>
        <CardContent>{renderTable(filtered.pending, 'No pending contracts')}</CardContent>
      </Card>

      {/* Completed */}
      <Card id="trades-completed" className="border-l-4 border-l-slate-400 bg-slate-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-slate-500" /><CardTitle className="text-slate-700">Completed Trades</CardTitle><Badge variant="secondary" className="bg-slate-200 text-slate-700">{filtered.completed.length}</Badge></div>
          <CardDescription className="text-slate-600">Successfully completed trades</CardDescription>
        </CardHeader>
        <CardContent>{renderTable(filtered.completed, 'No completed contracts')}</CardContent>
      </Card>

      {/* Washout */}
      <Card className="border-l-4 border-l-amber-500 bg-amber-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><CardTitle className="text-amber-800">Washout Trades</CardTitle><Badge variant="secondary" className="bg-amber-100 text-amber-800">{filtered.washout.length}</Badge></div>
          <CardDescription className="text-amber-700">Trades settled by washout</CardDescription>
        </CardHeader>
        <CardContent>{renderTable(filtered.washout, 'No washout contracts')}</CardContent>
      </Card>

      {/* Cancelled */}
      <Card className="border-l-4 border-l-red-400 bg-red-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2"><Ban className="h-5 w-5 text-red-500" /><CardTitle className="text-red-700">Cancelled Trades</CardTitle><Badge variant="secondary" className="bg-red-100 text-red-700">{filtered.cancelled.length}</Badge></div>
          <CardDescription className="text-red-600">Cancelled or terminated trades</CardDescription>
        </CardHeader>
        <CardContent>{renderTable(filtered.cancelled, 'No cancelled contracts')}</CardContent>
      </Card>

      {/* Trade Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto [&>button.absolute]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-center gap-3">
              <DialogTitle className="text-2xl">{selectedTrade?.pirContractNumber || selectedTrade?.referenceNumber || 'Trade Details'}</DialogTitle>
              {selectedTrade && <Badge className={TRADE_STATUS_CONFIG[selectedTrade.status]?.color || ''}>{TRADE_STATUS_CONFIG[selectedTrade.status]?.label}</Badge>}
            </div>
          </DialogHeader>
          {selectedTrade && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contract Information */}
                <div className="border rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-base">Contract Information</h4>
                  <div className="space-y-5 text-base">
                    <div className="flex justify-between"><span className="text-muted-foreground">Reference Number</span><span className="font-medium">{selectedTrade.referenceNumber || '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Contract Number</span><span className="font-medium">{selectedTrade.pirContractNumber || selectedTrade.contractNumber || '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Contract Date</span><span className="font-medium">{formatDate(selectedTrade.contractDate)}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Commodity</span><span className="font-medium">{selectedTrade.commodityName || '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Origin</span><span className="font-medium">{selectedTrade.originName || '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span className="font-medium">{selectedTrade.quantity ? `${selectedTrade.quantity.toLocaleString()} MT` : '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium">{selectedTrade.pricePerMT ? `${selectedTrade.currency || 'USD'} ${selectedTrade.pricePerMT.toLocaleString()}/MT` : '-'}</span></div>
                  </div>
                </div>
                {/* Trade Terms */}
                <div className="border rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-base">Trade Terms</h4>
                  <div className="space-y-5 text-base">
                    <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span className="font-medium">{selectedTrade.sellerName || '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span className="font-medium">{selectedTrade.buyerName || '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Broker</span><span className="font-medium">{selectedTrade.brokerName || '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Delivery Term</span><span className="font-medium">{(() => { const port = selectedTrade.basePortName || selectedTrade.loadingPortName || ''; const term = selectedTrade.deliveryTerm || ''; if (port && port.toLowerCase().startsWith(term.toLowerCase())) return port; return [term, port].filter(Boolean).join(' ') || '-'; })()}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Terms</span><span className="font-medium">{selectedTrade.paymentTerms || '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Shipment Period</span><span className="font-medium">{formatShipmentDate(selectedTrade.shipmentWindowStart) && formatShipmentDate(selectedTrade.shipmentWindowEnd) ? `${formatShipmentDate(selectedTrade.shipmentWindowStart)} - ${formatShipmentDate(selectedTrade.shipmentWindowEnd)}` : '-'}</span></div>
                    <hr />
                    <div className="flex justify-between"><span className="text-muted-foreground">Vessel</span><span className="font-medium uppercase">{selectedTrade.vesselName || '-'}</span></div>
                  </div>
                </div>
              </div>
              {selectedTrade.notes && (
                <div className="border rounded-lg p-4 text-sm">
                  <h4 className="font-semibold text-sm mb-2">Notes</h4>
                  <p className="text-muted-foreground">{selectedTrade.notes}</p>
                </div>
              )}
              {(selectedTrade.blNumber || selectedTrade.blDate || selectedTrade.blQuantity || selectedTrade.sellerSurveyor || selectedTrade.buyerSurveyor || selectedTrade.dischargeQuantity) && (
                <div className="border rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-base">B/L Details</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-base">
                    <div className="flex justify-between"><span className="text-muted-foreground">B/L Number</span><span className="font-medium">{selectedTrade.blNumber || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">B/L Date</span><span className="font-medium">{selectedTrade.blDate || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">B/L Quantity</span><span className="font-medium">{selectedTrade.blQuantity ? `${Number(selectedTrade.blQuantity).toLocaleString()} MT` : '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Discharge Quantity</span><span className="font-medium">{selectedTrade.dischargeQuantity ? `${Number(selectedTrade.dischargeQuantity).toLocaleString()} MT` : '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Load Port</span><span className="font-medium">{selectedTrade.loadingPortName || selectedTrade.basePortName || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Discharge Port</span><span className="font-medium">{selectedTrade.dischargePortName || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Seller Surveyor</span><span className="font-medium">{selectedTrade.sellerSurveyor || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Buyer Surveyor</span><span className="font-medium">{selectedTrade.buyerSurveyor || '-'}</span></div>
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Entity Trades Dialog */}
      <Dialog open={!!entityFilter} onOpenChange={(open) => { if (!open) setEntityFilter(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {entityFilter && (
            <>
              <DialogHeader>
                <DialogTitle className="capitalize">{entityFilter.type}: {entityFilter.code || entityFilter.name} — All Trades ({entityTrades.length})</DialogTitle>
              </DialogHeader>
              <div className="overflow-x-auto border rounded-lg">
                <Table className="trade-table">
                  <TableHeader><TableRow className="bg-muted/50">
                    <TableHead>Status</TableHead><TableHead>Contract</TableHead><TableHead>Commodity</TableHead>
                    <TableHead>Seller</TableHead><TableHead>Buyer</TableHead><TableHead>Quantity</TableHead>
                    <TableHead>Price/MT</TableHead><TableHead>Vessel</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {entityTrades.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No trades found</TableCell></TableRow> :
                    entityTrades.map(t => {
                      const sc = TRADE_STATUS_CONFIG[t.status] || {};
                      return (
                        <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEntityFilter(null); navigate(`/trades/${t.id}`); }}>
                          <TableCell><Badge className={`text-xs ${sc.color || 'bg-muted'}`}>{sc.label || t.status}</Badge></TableCell>
                          <TableCell className="font-medium text-sm">{t.pirContractNumber || t.referenceNumber}</TableCell>
                          <TableCell className="text-sm max-w-[150px]">{t.commodityName || '-'}</TableCell>
                          <TableCell className="text-sm">{t.sellerCode || t.sellerName || '-'}</TableCell>
                          <TableCell className="text-sm">{t.buyerCode || t.buyerName || '-'}</TableCell>
                          <TableCell className="text-sm">{t.quantity ? `${t.quantity.toLocaleString()} Mts` : '-'}</TableCell>
                          <TableCell className="text-sm">{t.pricePerMT ? `$${t.pricePerMT}` : '-'}</TableCell>
                          <TableCell className="text-sm">{t.vesselName || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
