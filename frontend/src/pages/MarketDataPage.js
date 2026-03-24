import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { 
  TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Plus, 
  Wheat, Droplets, Sun, Circle, DollarSign, Fuel, PenLine, X, Tag,
  Send, Building2, Calendar, Package, Trash2, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const COMMODITY_ICONS = {
  WHEAT: Wheat,
  CORN: Wheat,
  SOYBEAN: Droplets,
  GOLD: Circle,
  CRUDE_OIL: Fuel,
  EUR_USD: DollarSign,
  USD_RUB: DollarSign,
  USD_TRY: DollarSign,
  USD_UAH: DollarSign,
};

const COMMODITY_COLORS = {
  WHEAT: '#F59E0B',
  CORN: '#EAB308',
  SOYBEAN: '#84CC16',
  GOLD: '#FCD34D',
  CRUDE_OIL: '#1F2937',
  EUR_USD: '#3B82F6',
  USD_RUB: '#EF4444',
  USD_TRY: '#DC2626',
  USD_UAH: '#10B981',
};

// Auto-refresh interval (15 minutes)
const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000;

const NOTE_TAGS = [
  'Black Sea', 'Mersin Port', 'CPT', 'FOB', 'CIF', 'Russia', 'Ukraine', 'EU', 'Turkey',
  'Rumor', 'Traded Level', 'Bid', 'Offer', 'Basis', 'Spread'
];

export default function MarketDataPage() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState([]);
  const [notePeriod, setNotePeriod] = useState('daily');
  const [noteCommodity, setNoteCommodity] = useState('WHEAT');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ content: '', tags: [] });
  const [editingNote, setEditingNote] = useState(null);
  
  // Turkish exchange state
  const [turkishPrices, setTurkishPrices] = useState([]);
  const [turkishDialogOpen, setTurkishDialogOpen] = useState(false);
  const [turkishForm, setTurkishForm] = useState({ exchange: 'KTB', product: '', price: '', unit: 'TRY/KG', date: '', category: '' });
  const [scrapingKTB, setScrapingKTB] = useState(false);
  
  // TMO Tenders state
  const [tenders, setTenders] = useState([]);
  const [tenderDialogOpen, setTenderDialogOpen] = useState(false);
  const [tenderForm, setTenderForm] = useState({ 
    tenderDate: '', commodity: 'Wheat', quantities: {}, 
    shipmentPeriodStart: '', shipmentPeriodEnd: '', status: 'open', results: []
  });
  const [editingTender, setEditingTender] = useState(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultForm, setResultForm] = useState({ port: '', company: '', quantity: '', cifPrice: '', exwPrice: '' });
  const [selectedTenderForResult, setSelectedTenderForResult] = useState(null);
  
  // Telegram state
  const [telegramMessages, setTelegramMessages] = useState([]);
  const [telegramChannels, setTelegramChannels] = useState([]);

  // Active tab
  const [activeTab, setActiveTab] = useState('prices');

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 15 minutes
    const interval = setInterval(() => {
      refreshPrices();
    }, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedCommodity) {
      fetchChartData(selectedCommodity, chartPeriod);
    }
  }, [selectedCommodity, chartPeriod]);

  useEffect(() => {
    fetchNotes();
  }, [noteCommodity, notePeriod]);

  const fetchData = async () => {
    try {
      const [pricesRes, turkishRes, tendersRes, telegramRes, channelsRes] = await Promise.all([
        api.get('/api/market/prices'),
        api.get('/api/market/turkish-exchanges'),
        api.get('/api/market/tenders'),
        api.get('/api/market/telegram/messages').catch(() => ({ data: { messages: [] } })),
        api.get('/api/market/telegram/channels').catch(() => ({ data: [] })),
      ]);
      setPrices(pricesRes.data);
      setTurkishPrices(turkishRes.data);
      setTenders(tendersRes.data);
      setTelegramMessages(telegramRes.data.messages || []);
      setTelegramChannels(channelsRes.data);
      setLastUpdated(new Date());
      if (pricesRes.data.length > 0 && !selectedCommodity) {
        setSelectedCommodity(pricesRes.data[0].symbol);
      }
    } catch (err) {
      toast.error('Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async (symbol, period) => {
    setChartLoading(true);
    try {
      const res = await api.get(`/api/market/prices/${symbol}/history?period=${period}`);
      setChartData(res.data.history || []);
    } catch (err) {
      console.error('Failed to load chart data');
    } finally {
      setChartLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await api.get(`/api/market/notes?commodity=${noteCommodity}&period=${notePeriod}`);
      setNotes(res.data);
    } catch (err) {
      console.error('Failed to load notes');
    }
  };

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/market/prices');
      setPrices(res.data);
      setLastUpdated(new Date());
      toast.success('Prices refreshed');
    } catch (err) {
      toast.error('Failed to refresh prices');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteForm.content.trim()) {
      toast.error('Note content is required');
      return;
    }
    try {
      const data = { commodity: noteCommodity, period: notePeriod, ...noteForm };
      if (editingNote) {
        await api.put(`/api/market/notes/${editingNote.id}`, data);
        toast.success('Note updated');
      } else {
        await api.post('/api/market/notes', data);
        toast.success('Note created');
      }
      setNoteDialogOpen(false);
      setNoteForm({ content: '', tags: [] });
      setEditingNote(null);
      fetchNotes();
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/api/market/notes/${noteId}`);
      toast.success('Note deleted');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  const handleSaveTurkishPrice = async () => {
    try {
      await api.post('/api/market/turkish-exchanges', {
        ...turkishForm,
        price: parseFloat(turkishForm.price),
        date: turkishForm.date || new Date().toISOString().split('T')[0]
      });
      toast.success('Price added');
      setTurkishDialogOpen(false);
      setTurkishForm({ exchange: 'KTB', product: '', price: '', unit: 'TRY/KG', date: '', category: '' });
      const res = await api.get('/api/market/turkish-exchanges');
      setTurkishPrices(res.data);
    } catch (err) {
      toast.error('Failed to add price');
    }
  };

  const handleScrapeKTB = async () => {
    setScrapingKTB(true);
    try {
      const res = await api.get('/api/market/turkish-exchanges/scrape');
      toast.success(`Fetched ${res.data.ktb?.length || 0} prices from KTB`);
      const pricesRes = await api.get('/api/market/turkish-exchanges');
      setTurkishPrices(pricesRes.data);
    } catch (err) {
      toast.error('Failed to fetch KTB prices');
    } finally {
      setScrapingKTB(false);
    }
  };

  const handleSaveTender = async () => {
    try {
      if (editingTender) {
        await api.put(`/api/market/tenders/${editingTender.id}`, tenderForm);
        toast.success('Tender updated');
      } else {
        await api.post('/api/market/tenders', tenderForm);
        toast.success('Tender created');
      }
      setTenderDialogOpen(false);
      setTenderForm({ tenderDate: '', commodity: 'Feed Barley', totalQuantity: 0, shipmentPeriodStart: '', shipmentPeriodEnd: '', status: 'open', results: [] });
      setEditingTender(null);
      const res = await api.get('/api/market/tenders');
      setTenders(res.data);
    } catch (err) {
      toast.error('Failed to save tender');
    }
  };

  const handleAddResult = async () => {
    if (!selectedTenderForResult) return;
    try {
      await api.post(`/api/market/tenders/${selectedTenderForResult.id}/results`, {
        port: resultForm.port,
        company: resultForm.company,
        quantity: parseFloat(resultForm.quantity) || 0,
        cifPrice: resultForm.cifPrice ? parseFloat(resultForm.cifPrice) : null,
        exwPrice: resultForm.exwPrice ? parseFloat(resultForm.exwPrice) : null,
      });
      toast.success('Result added');
      setResultDialogOpen(false);
      setResultForm({ port: '', company: '', quantity: '', cifPrice: '', exwPrice: '' });
      setSelectedTenderForResult(null);
      const res = await api.get('/api/market/tenders');
      setTenders(res.data);
    } catch (err) {
      toast.error('Failed to add result');
    }
  };

  const groupedPrices = useMemo(() => {
    return {
      agricultural: prices.filter(p => p.type === 'agricultural'),
      commodities: prices.filter(p => p.type === 'commodity'),
      currencies: prices.filter(p => p.type === 'currency'),
    };
  }, [prices]);

  const selectedPrice = prices.find(p => p.symbol === selectedCommodity);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Main Content */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Market Data</h1>
            <p className="text-muted-foreground">Live commodity prices, notes, and tender tracking</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-sm text-muted-foreground">
                Last Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <div className="flex flex-col items-end">
              <Button onClick={refreshPrices} disabled={refreshing} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Now
              </Button>
              <span className="text-xs text-muted-foreground mt-1">Auto-refreshes every 15 minutes</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="prices">Prices</TabsTrigger>
            <TabsTrigger value="turkish">Turkish Exchanges</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="tenders">TMO Tenders</TabsTrigger>
          </TabsList>

          {/* PRICES TAB */}
          <TabsContent value="prices" className="space-y-4 mt-4">
            {/* Live Market Prices Table */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Live Market Prices
                  </CardTitle>
                  {lastUpdated && (
                    <span className="text-sm text-muted-foreground">
                      Updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Market</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">% Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* CBOT Commodities */}
                    {groupedPrices.agricultural.map((item) => (
                      <TableRow 
                        key={item.symbol} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCommodity(item.symbol)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Wheat className="h-4 w-4 text-amber-600" />
                            CBOT - {item.name}
                            {item.source === 'Barchart' && (
                              <Badge variant="default" className="text-[10px] bg-green-600 ml-1">Live</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          ${item.price?.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.change >= 0 ? '+' : ''}{item.change?.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Gold & Crude Oil */}
                    {groupedPrices.commodities.map((item) => (
                      <TableRow 
                        key={item.symbol} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCommodity(item.symbol)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.symbol === 'GOLD' ? (
                              <Circle className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Fuel className="h-4 w-4 text-gray-700" />
                            )}
                            {item.name}
                            {item.source === 'Barchart' && (
                              <Badge variant="default" className="text-[10px] bg-green-600 ml-1">Live</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          ${item.price?.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.change >= 0 ? '+' : ''}{item.change?.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Currency Rates */}
                    {groupedPrices.currencies.map((item) => (
                      <TableRow 
                        key={item.symbol} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCommodity(item.symbol)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                            {item.name}
                            {item.source === 'Barchart' && (
                              <Badge variant="default" className="text-[10px] bg-green-600 ml-1">Live</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {item.price?.toFixed(4)}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.change >= 0 ? '+' : ''}{item.change?.toFixed(4)}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Price Chart */}
            {selectedCommodity && selectedPrice && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedPrice.name} Price Chart</CardTitle>
                    <div className="flex gap-1">
                      {['daily', 'monthly', 'yearly'].map((period) => (
                        <Button
                          key={period}
                          size="sm"
                          variant={chartPeriod === period ? 'default' : 'outline'}
                          onClick={() => setChartPeriod(period)}
                          className="capitalize"
                        >
                          {period}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {chartLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COMMODITY_COLORS[selectedCommodity] || '#1B7A3D'} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COMMODITY_COLORS[selectedCommodity] || '#1B7A3D'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke={COMMODITY_COLORS[selectedCommodity] || '#1B7A3D'} 
                          fillOpacity={1} 
                          fill="url(#colorPrice)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TURKISH EXCHANGES TAB */}
          <TabsContent value="turkish" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Turkish Commodity Exchange Prices</h2>
              <div className="flex gap-2">
                <Button onClick={handleScrapeKTB} disabled={scrapingKTB} size="sm" variant="outline">
                  {scrapingKTB ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Fetch from KTB
                </Button>
                <Button onClick={() => setTurkishDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />Add Price
                </Button>
              </div>
            </div>

            {/* KTB Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Konya Ticaret Borsasi (KTB)
                </CardTitle>
                <CardDescription>Source: ktb.org.tr</CardDescription>
              </CardHeader>
              <CardContent>
                {turkishPrices.filter(p => p.exchange === 'KTB').length === 0 ? (
                  <div className="text-center py-6">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No prices recorded</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Fetch from KTB" to get daily prices</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Min</TableHead>
                        <TableHead className="text-right">Max</TableHead>
                        <TableHead className="text-right">Avg</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {turkishPrices.filter(p => p.exchange === 'KTB').slice(0, 15).map((price, idx) => (
                        <TableRow key={price.id || idx}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{price.product}</span>
                              {price.productEn && price.productEn !== price.product && (
                                <span className="text-xs text-muted-foreground ml-2">({price.productEn})</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {price.minPrice?.toFixed(4) || price.price?.toLocaleString()} {price.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {price.maxPrice?.toFixed(4) || '-'} {price.maxPrice ? price.unit : ''}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium">
                            {price.avgPrice?.toFixed(4) || '-'} {price.avgPrice ? price.unit : ''}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{price.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* GTB Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Gaziantep Ticaret Borsasi (GTB)
                </CardTitle>
                <CardDescription>Manual entry</CardDescription>
              </CardHeader>
              <CardContent>
                {turkishPrices.filter(p => p.exchange === 'GTB').length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No prices recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {turkishPrices.filter(p => p.exchange === 'GTB').slice(0, 10).map((price) => (
                        <TableRow key={price.id}>
                          <TableCell className="font-medium">{price.product}</TableCell>
                          <TableCell>{price.price?.toLocaleString()} {price.unit}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{price.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Select value={noteCommodity} onValueChange={setNoteCommodity}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedPrices.agricultural.map((c) => (
                      <SelectItem key={c.symbol} value={c.symbol}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  {['daily', 'monthly', 'yearly'].map((period) => (
                    <Button
                      key={period}
                      size="sm"
                      variant={notePeriod === period ? 'default' : 'outline'}
                      onClick={() => setNotePeriod(period)}
                      className="capitalize"
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={() => { setNoteForm({ content: '', tags: [] }); setEditingNote(null); setNoteDialogOpen(true); }} size="sm">
                <PenLine className="h-4 w-4 mr-2" />Add Note
              </Button>
            </div>

            <Card>
              <CardContent className="pt-4">
                {notes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No notes for this commodity/period. Add your first note!</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            {note.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {note.tags.map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    <Tag className="h-3 w-3 mr-1" />{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {note.createdBy} • {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setEditingNote(note);
                              setNoteForm({ content: note.content, tags: note.tags || [] });
                              setNoteDialogOpen(true);
                            }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteNote(note.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TMO TENDERS TAB */}
          <TabsContent value="tenders" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-green-600">TMO / TURKISH GRAIN BOARD</h2>
                <p className="text-sm text-muted-foreground">Tender Finals & Results</p>
              </div>
              <Button data-testid="new-tender-btn" onClick={() => { 
                setTenderForm({ 
                  tenderDate: '', 
                  commodity: 'Feed Barley', 
                  totalQuantity: 0,
                  shipmentPeriodStart: '', 
                  shipmentPeriodEnd: '', 
                  status: 'open', 
                  results: [] 
                }); 
                setEditingTender(null); 
                setTenderDialogOpen(true); 
              }} size="sm">
                <Plus className="h-4 w-4 mr-2" />New Tender
              </Button>
            </div>

            {tenders.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">No tenders recorded yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {tenders.map((tender) => {
                  const totalQty = tender.results?.reduce((sum, r) => sum + (parseFloat(r.quantity) || parseFloat(r.sizeKMT) || 0), 0) || 0;
                  return (
                  <Card key={tender.id} className="overflow-hidden border-2 border-gray-300" data-testid={`tender-card-${tender.id}`}>
                    {/* Title Header - PIR GRAIN & PULSES */}
                    <div className="bg-gray-100 border-b-2 border-gray-300 px-4 py-2 text-center">
                      <h3 className="font-bold text-lg tracking-wide">PIR GRAIN & PULSES</h3>
                    </div>
                    {/* Tender Info Row */}
                    <div className="bg-gray-50 border-b-2 border-gray-300 px-4 py-2 text-center">
                      <p className="font-bold text-base">
                        {tender.tenderDate} TMO {tender.commodity} TENDER
                        {tender.shipmentPeriodStart && tender.shipmentPeriodEnd 
                          ? ` (${tender.shipmentPeriodStart}-${tender.shipmentPeriodEnd})` 
                          : ''} Shipment
                      </p>
                    </div>
                    
                    {/* Results Table */}
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                            <TableHead className="font-bold text-black text-sm">PORT</TableHead>
                            <TableHead className="font-bold text-black text-sm">COMPANY</TableHead>
                            <TableHead className="font-bold text-black text-sm text-right">QUANTITY</TableHead>
                            <TableHead className="font-bold text-red-600 text-sm text-right">CIF</TableHead>
                            <TableHead className="font-bold text-black text-sm text-right">EXW</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tender.results?.length > 0 ? (
                            <>
                              {tender.results.map((result, idx) => (
                                <TableRow key={idx} className="border-b border-gray-200">
                                  <TableCell className="font-medium">{result.port}</TableCell>
                                  <TableCell>{result.company || result.winner}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {((parseFloat(result.quantity) || parseFloat(result.sizeKMT) || 0) * 1000).toLocaleString('de-DE', { minimumFractionDigits: 0 })}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-bold text-red-600">
                                    {result.cifPrice != null ? parseFloat(result.cifPrice).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {result.exwPrice != null ? `$${parseFloat(result.exwPrice).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {/* Empty separator row */}
                              <TableRow className="border-b border-gray-200">
                                <TableCell colSpan={5}>&nbsp;</TableCell>
                              </TableRow>
                              {/* Total Row */}
                              <TableRow className="border-t-2 border-gray-300 font-bold">
                                <TableCell className="font-bold text-base">TOTAL</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right font-mono font-bold text-base">
                                  {(totalQty * 1000).toLocaleString('de-DE', { minimumFractionDigits: 0 })}
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                No results added yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                    
                    {/* Actions */}
                    <div className="px-4 py-2 bg-muted/20 flex items-center justify-between border-t">
                      <Badge 
                        variant={tender.status === 'awarded' ? 'default' : 'secondary'} 
                        className={tender.status === 'awarded' ? 'bg-green-600 text-white' : ''}
                      >
                        {tender.status?.toUpperCase()}
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" data-testid={`add-result-btn-${tender.id}`} onClick={() => {
                          setSelectedTenderForResult(tender);
                          setResultForm({ port: '', company: '', quantity: '', cifPrice: '', exwPrice: '' });
                          setResultDialogOpen(true);
                        }}>
                          <Plus className="h-4 w-4 mr-1" />Add Result
                        </Button>
                        <Button variant="ghost" size="sm" data-testid={`edit-tender-btn-${tender.id}`} onClick={() => {
                          setEditingTender(tender);
                          setTenderForm(tender);
                          setTenderDialogOpen(true);
                        }}>
                          <Pencil className="h-4 w-4 mr-1" />Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" data-testid={`delete-tender-btn-${tender.id}`} onClick={async () => {
                          try {
                            await api.delete(`/api/market/tenders/${tender.id}`);
                            toast.success('Tender deleted');
                            const res = await api.get('/api/market/tenders');
                            setTenders(res.data);
                          } catch (err) {
                            toast.error('Failed to delete tender');
                          }
                        }}>
                          <Trash2 className="h-4 w-4 mr-1" />Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Telegram Sidebar */}
      <div className="w-80 border-l pl-4 hidden lg:block">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              Telegram Feed
            </CardTitle>
            <CardDescription>
              {telegramChannels.length} channel(s) configured
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            {telegramMessages.length === 0 ? (
              <div className="text-center py-8">
                <Send className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">Configure Telegram bot token in settings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {telegramMessages.map((msg, i) => (
                  <div key={i} className="p-2 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium text-xs text-blue-600 mb-1">{msg.channelName}</p>
                    <p className="text-muted-foreground">{msg.text?.slice(0, 200)}{msg.text?.length > 200 ? '...' : ''}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {msg.date ? new Date(msg.date * 1000).toLocaleString() : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Add Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea 
                value={noteForm.content} 
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                rows={5}
                placeholder="Market rumors, traded levels, origin pricing..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1">
                {NOTE_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={noteForm.tags?.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const tags = noteForm.tags || [];
                      if (tags.includes(tag)) {
                        setNoteForm({ ...noteForm, tags: tags.filter(t => t !== tag) });
                      } else {
                        setNoteForm({ ...noteForm, tags: [...tags, tag] });
                      }
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNote}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Turkish Price Dialog */}
      <Dialog open={turkishDialogOpen} onOpenChange={setTurkishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Turkish Exchange Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Exchange</Label>
                <Select value={turkishForm.exchange} onValueChange={(v) => setTurkishForm({ ...turkishForm, exchange: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KTB">Konya (KTB)</SelectItem>
                    <SelectItem value="GTB">Gaziantep (GTB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={turkishForm.date} 
                  onChange={(e) => setTurkishForm({ ...turkishForm, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Input 
                value={turkishForm.product} 
                onChange={(e) => setTurkishForm({ ...turkishForm, product: e.target.value })}
                placeholder="e.g., Bugday, Misir"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input 
                  type="number" 
                  value={turkishForm.price} 
                  onChange={(e) => setTurkishForm({ ...turkishForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={turkishForm.unit} onValueChange={(v) => setTurkishForm({ ...turkishForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY/KG">TRY/KG</SelectItem>
                    <SelectItem value="TRY/TON">TRY/TON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Input 
                value={turkishForm.category} 
                onChange={(e) => setTurkishForm({ ...turkishForm, category: e.target.value })}
                placeholder="e.g., Ekmeklik, Makarnalk"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTurkishDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTurkishPrice}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tender Dialog */}
      <Dialog open={tenderDialogOpen} onOpenChange={setTenderDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTender ? 'Edit Tender' : 'New TMO Tender'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tender Date (dd/mm/yyyy)</Label>
                <Input 
                  data-testid="tender-date-input"
                  value={tenderForm.tenderDate} 
                  onChange={(e) => setTenderForm({ ...tenderForm, tenderDate: e.target.value })}
                  placeholder="e.g., 12/01/2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Commodity</Label>
                <Select value={tenderForm.commodity} onValueChange={(v) => setTenderForm({ ...tenderForm, commodity: v })}>
                  <SelectTrigger data-testid="tender-commodity-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feed Barley">Feed Barley</SelectItem>
                    <SelectItem value="Wheat">Wheat</SelectItem>
                    <SelectItem value="Milling Wheat">Milling Wheat</SelectItem>
                    <SelectItem value="Corn">Corn</SelectItem>
                    <SelectItem value="Barley">Barley</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity (Mts)</Label>
              <Input 
                data-testid="tender-quantity-input"
                type="number"
                value={tenderForm.totalQuantity || ''} 
                onChange={(e) => setTenderForm({ ...tenderForm, totalQuantity: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 220000"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shipment Start (dd/mm)</Label>
                <Input 
                  data-testid="tender-shipment-start"
                  value={tenderForm.shipmentPeriodStart} 
                  onChange={(e) => setTenderForm({ ...tenderForm, shipmentPeriodStart: e.target.value })}
                  placeholder="e.g., 01/02"
                />
              </div>
              <div className="space-y-2">
                <Label>Shipment End (dd/mm/yyyy)</Label>
                <Input 
                  data-testid="tender-shipment-end"
                  value={tenderForm.shipmentPeriodEnd} 
                  onChange={(e) => setTenderForm({ ...tenderForm, shipmentPeriodEnd: e.target.value })}
                  placeholder="e.g., 15/03/2026"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={tenderForm.status} onValueChange={(v) => setTenderForm({ ...tenderForm, status: v })}>
                <SelectTrigger data-testid="tender-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="awarded">Awarded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTenderDialogOpen(false)}>Cancel</Button>
            <Button data-testid="save-tender-btn" onClick={handleSaveTender}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tender Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Port</Label>
                <Input 
                  data-testid="result-port-input"
                  value={resultForm.port} 
                  onChange={(e) => setResultForm({ ...resultForm, port: e.target.value })}
                  placeholder="e.g., Iskenderun, Mersin"
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input 
                  data-testid="result-company-input"
                  value={resultForm.company} 
                  onChange={(e) => setResultForm({ ...resultForm, company: e.target.value })}
                  placeholder="e.g., Arion, Bunge"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity (KMT)</Label>
              <Input 
                data-testid="result-quantity-input"
                type="number" 
                step="0.1"
                value={resultForm.quantity} 
                onChange={(e) => setResultForm({ ...resultForm, quantity: e.target.value })}
                placeholder="e.g., 25 (for 25 KMT)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CIF Price (USD/MT)</Label>
                <Input 
                  data-testid="result-cif-input"
                  type="number" 
                  step="0.01"
                  value={resultForm.cifPrice} 
                  onChange={(e) => setResultForm({ ...resultForm, cifPrice: e.target.value })}
                  placeholder="e.g., 326.70"
                />
              </div>
              <div className="space-y-2">
                <Label>EXW Price (USD/MT)</Label>
                <Input 
                  data-testid="result-exw-input"
                  type="number" 
                  step="0.01"
                  value={resultForm.exwPrice} 
                  onChange={(e) => setResultForm({ ...resultForm, exwPrice: e.target.value })}
                  placeholder="e.g., 329.50"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Fill in CIF or EXW price (or both). Leave blank if not applicable.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>Cancel</Button>
            <Button data-testid="add-result-submit-btn" onClick={handleAddResult}>Add Result</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
