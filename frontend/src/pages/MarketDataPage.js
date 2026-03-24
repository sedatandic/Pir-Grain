import { useState, useEffect, useMemo } from 'react';
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
  Send, Building2, Calendar, Package, Award, Trash2, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const COMMODITY_ICONS = {
  WHEAT: Wheat,
  CORN: Wheat,
  SOYBEAN: Droplets,
  BARLEY: Wheat,
  SUNFLOWER: Sun,
  GOLD: Circle,
  CRUDE_OIL: Fuel,
  EUR_USD: DollarSign,
  USD_RUB: DollarSign,
  USD_TRY: DollarSign,
};

const COMMODITY_COLORS = {
  WHEAT: '#F59E0B',
  CORN: '#EAB308',
  SOYBEAN: '#84CC16',
  BARLEY: '#D97706',
  SUNFLOWER: '#FBBF24',
  GOLD: '#FCD34D',
  CRUDE_OIL: '#1F2937',
  EUR_USD: '#3B82F6',
  USD_RUB: '#EF4444',
  USD_TRY: '#DC2626',
};

const NOTE_TAGS = [
  'Black Sea', 'Mersin Port', 'CPT', 'FOB', 'CIF', 'Russia', 'Ukraine', 'EU', 'Turkey',
  'Rumor', 'Traded Level', 'Bid', 'Offer', 'Basis', 'Spread'
];

export default function MarketDataPage() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [resultForm, setResultForm] = useState({ company: '', price: '', port: '', quantity: '' });
  const [selectedTenderForResult, setSelectedTenderForResult] = useState(null);
  
  // Telegram state
  const [telegramMessages, setTelegramMessages] = useState([]);
  const [telegramChannels, setTelegramChannels] = useState([]);

  // Active tab
  const [activeTab, setActiveTab] = useState('prices');

  useEffect(() => {
    fetchData();
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
      setTenderForm({ tenderDate: '', commodity: 'Wheat', quantities: {}, shipmentPeriodStart: '', shipmentPeriodEnd: '', status: 'open', results: [] });
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
        ...resultForm,
        price: parseFloat(resultForm.price),
        quantity: parseFloat(resultForm.quantity)
      });
      toast.success('Result added');
      setResultDialogOpen(false);
      setResultForm({ company: '', price: '', port: '', quantity: '' });
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
          <Button onClick={refreshPrices} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
            {/* Agricultural Commodities + Gold & Crude Oil */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wheat className="h-5 w-5 text-amber-600" />
                  Commodities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[...groupedPrices.agricultural, ...groupedPrices.commodities].map((item) => {
                    const Icon = COMMODITY_ICONS[item.symbol] || Circle;
                    const isSelected = selectedCommodity === item.symbol;
                    const isCurrency = item.symbol === 'GOLD' || item.symbol === 'CRUDE_OIL';
                    return (
                      <div
                        key={item.symbol}
                        onClick={() => setSelectedCommodity(item.symbol)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4" style={{ color: COMMODITY_COLORS[item.symbol] }} />
                          <span className="font-medium text-sm">{item.name}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold">{isCurrency ? '$' : ''}{item.price?.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">{item.unit}</span>
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${
                          item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {item.change > 0 ? <TrendingUp className="h-3 w-3" /> : item.change < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          <span>{item.change > 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%</span>
                        </div>
                        {item.isMock && <Badge variant="outline" className="text-[10px] mt-1">Demo</Badge>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Currency Rates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  Currency Rates (vs USD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {groupedPrices.currencies.map((item) => (
                    <div
                      key={item.symbol}
                      onClick={() => setSelectedCommodity(item.symbol)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedCommodity === item.symbol ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{item.name}</span>
                        {item.isLive ? (
                          <Badge variant="default" className="text-[10px] bg-green-600">Live</Badge>
                        ) : item.isMock ? (
                          <Badge variant="outline" className="text-[10px]">Demo</Badge>
                        ) : null}
                      </div>
                      <div className="text-lg font-bold">{item.price?.toFixed(4)}</div>
                      <div className={`text-xs ${item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : ''}`}>
                        {item.change > 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
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
              <h2 className="text-lg font-semibold">TMO Tender Tracking</h2>
              <Button onClick={() => { setTenderForm({ tenderDate: '', commodity: 'Wheat', quantities: {}, shipmentPeriodStart: '', shipmentPeriodEnd: '', status: 'open', results: [] }); setEditingTender(null); setTenderDialogOpen(true); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />New Tender
              </Button>
            </div>

            <Card>
              <CardContent className="pt-4">
                {tenders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No tenders recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Commodity</TableHead>
                        <TableHead>Shipment Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenders.map((tender) => (
                        <TableRow key={tender.id}>
                          <TableCell>{tender.tenderDate}</TableCell>
                          <TableCell className="font-medium">{tender.commodity}</TableCell>
                          <TableCell className="text-sm">
                            {tender.shipmentPeriodStart && tender.shipmentPeriodEnd 
                              ? `${tender.shipmentPeriodStart} - ${tender.shipmentPeriodEnd}` 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tender.status === 'awarded' ? 'default' : tender.status === 'closed' ? 'secondary' : 'outline'}>
                              {tender.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tender.results?.length > 0 ? (
                              <span className="text-sm">{tender.results.length} result(s)</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedTenderForResult(tender);
                              setResultDialogOpen(true);
                            }}>
                              <Award className="h-4 w-4 mr-1" />Result
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setEditingTender(tender);
                              setTenderForm(tender);
                              setTenderDialogOpen(true);
                            }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
                <Label>Tender Date</Label>
                <Input 
                  type="date" 
                  value={tenderForm.tenderDate} 
                  onChange={(e) => setTenderForm({ ...tenderForm, tenderDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Commodity</Label>
                <Select value={tenderForm.commodity} onValueChange={(v) => setTenderForm({ ...tenderForm, commodity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wheat">Wheat</SelectItem>
                    <SelectItem value="Corn">Corn</SelectItem>
                    <SelectItem value="Barley">Barley</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shipment Start</Label>
                <Input 
                  type="date" 
                  value={tenderForm.shipmentPeriodStart} 
                  onChange={(e) => setTenderForm({ ...tenderForm, shipmentPeriodStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Shipment End</Label>
                <Input 
                  type="date" 
                  value={tenderForm.shipmentPeriodEnd} 
                  onChange={(e) => setTenderForm({ ...tenderForm, shipmentPeriodEnd: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={tenderForm.status} onValueChange={(v) => setTenderForm({ ...tenderForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button onClick={handleSaveTender}>Save</Button>
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
            <div className="space-y-2">
              <Label>Winning Company</Label>
              <Input 
                value={resultForm.company} 
                onChange={(e) => setResultForm({ ...resultForm, company: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (USD/MT)</Label>
                <Input 
                  type="number" 
                  value={resultForm.price} 
                  onChange={(e) => setResultForm({ ...resultForm, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity (MT)</Label>
                <Input 
                  type="number" 
                  value={resultForm.quantity} 
                  onChange={(e) => setResultForm({ ...resultForm, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input 
                value={resultForm.port} 
                onChange={(e) => setResultForm({ ...resultForm, port: e.target.value })}
                placeholder="e.g., Mersin, Iskenderun"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddResult}>Add Result</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
