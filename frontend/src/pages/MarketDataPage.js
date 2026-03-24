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
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
import { format, parse } from 'date-fns';
import { 
  TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Plus, 
  Wheat, Droplets, Sun, Circle, DollarSign, Fuel, PenLine, X, Tag,
  Send, Building2, Calendar as CalendarIcon, Package, Trash2, Pencil, ChevronDown, ChevronRight
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

const TMO_PORTS = [
  'İskenderun', 'Bandırma', 'Tekirdağ', 'Karasu', 'İzmir', 'Samsun', 'Mersin', 'Adana', 'Trabzon'
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
  
  // Market News state
  const [marketNews, setMarketNews] = useState({ Wheat: [], Corn: [], Barley: [], Others: [] });
  const [newsInput, setNewsInput] = useState({ Wheat: '', Corn: '', Barley: '', Others: '' });
  const [newsPeriod, setNewsPeriod] = useState('daily');
  const [archiveYears, setArchiveYears] = useState([]);
  
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
  const [editingResultIndex, setEditingResultIndex] = useState(null);
  const [expandedTenders, setExpandedTenders] = useState({});
  
  // Telegram state
  const [telegramMessages, setTelegramMessages] = useState([]);
  const [telegramChannels, setTelegramChannels] = useState([]);

  // Active tab
  const [activeTab, setActiveTab] = useState('news');

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
    fetchMarketNews();
    fetchArchiveYears();
  }, [newsPeriod]);

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

  const fetchMarketNews = async (period) => {
    const p = period || newsPeriod;
    try {
      const categories = ['Wheat', 'Corn', 'Barley', 'Others'];
      const results = {};
      for (const cat of categories) {
        const res = await api.get(`/api/market/notes?commodity=${cat}&period=${p}`);
        results[cat] = res.data;
      }
      setMarketNews(results);
    } catch (err) {
      console.error('Failed to load market news');
    }
  };

  const fetchArchiveYears = async () => {
    try {
      const res = await api.get('/api/market/notes/years');
      setArchiveYears(res.data);
    } catch (err) {
      console.error('Failed to load archive years');
    }
  };

  const handlePostComment = async (category) => {
    const content = newsInput[category]?.trim();
    if (!content) return;
    try {
      await api.post('/api/market/notes', { commodity: category, period: newsPeriod, content, tags: [] });
      setNewsInput(prev => ({ ...prev, [category]: '' }));
      fetchMarketNews();
    } catch (err) {
      toast.error('Failed to post comment');
    }
  };

  const handleDeleteComment = async (noteId) => {
    try {
      await api.delete(`/api/market/notes/${noteId}`);
      toast.success('Comment deleted');
      fetchMarketNews();
    } catch (err) {
      toast.error('Failed to delete comment');
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

  const handleScrapeExchanges = async () => {
    setScrapingKTB(true);
    try {
      const res = await api.get('/api/market/turkish-exchanges/scrape');
      toast.success(`Fetched ${res.data.ktb?.length || 0} KTB + ${res.data.gtb?.length || 0} GTB prices`);
      const pricesRes = await api.get('/api/market/turkish-exchanges');
      setTurkishPrices(pricesRes.data);
    } catch (err) {
      toast.error('Failed to fetch exchange prices');
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
      setTenderForm({ tenderDate: '', commodity: 'Feed Barley', totalQuantity: 0, tenderType: 'Import', shipmentPeriodStart: '', shipmentPeriodEnd: '', status: 'open', results: [] });
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
      const payload = {
        port: resultForm.port,
        company: resultForm.company,
        quantity: parseFloat(resultForm.quantity) || 0,
        cifPrice: resultForm.cifPrice ? parseFloat(resultForm.cifPrice) : null,
        exwPrice: resultForm.exwPrice ? parseFloat(resultForm.exwPrice) : null,
      };
      if (editingResultIndex !== null) {
        await api.put(`/api/market/tenders/${selectedTenderForResult.id}/results/${editingResultIndex}`, payload);
        toast.success('Result updated');
      } else {
        await api.post(`/api/market/tenders/${selectedTenderForResult.id}/results`, payload);
        toast.success('Result added');
      }
      setResultDialogOpen(false);
      setResultForm({ port: '', company: '', quantity: '', cifPrice: '', exwPrice: '' });
      setSelectedTenderForResult(null);
      setEditingResultIndex(null);
      const res = await api.get('/api/market/tenders');
      setTenders(res.data);
    } catch (err) {
      toast.error('Failed to save result');
    }
  };

  const handleDeleteResult = async (tender, resultIdx) => {
    try {
      await api.delete(`/api/market/tenders/${tender.id}/results/${resultIdx}`);
      toast.success('Result deleted');
      const res = await api.get('/api/market/tenders');
      setTenders(res.data);
    } catch (err) {
      toast.error('Failed to delete result');
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
            <TabsTrigger value="news">Market News</TabsTrigger>
            <TabsTrigger value="prices">Prices</TabsTrigger>
            <TabsTrigger value="turkish">Turkish Exchanges</TabsTrigger>
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
                <Button onClick={handleScrapeExchanges} disabled={scrapingKTB} size="sm" variant="outline">
                  {scrapingKTB ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Fetch Prices
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
                    <p className="text-xs text-muted-foreground mt-1">Click "Fetch Prices" to get daily prices</p>
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
                <CardDescription>Source: gtb.org.tr - Salon Satis Fiyatlari</CardDescription>
              </CardHeader>
              <CardContent>
                {turkishPrices.filter(p => p.exchange === 'GTB').length === 0 ? (
                  <div className="text-center py-6">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No prices recorded</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Fetch Prices" to get daily prices</p>
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
                      {turkishPrices.filter(p => p.exchange === 'GTB').slice(0, 15).map((price, idx) => (
                        <TableRow key={price.id || idx}>
                          <TableCell className="font-medium">{price.product}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {price.minPrice?.toFixed(3)} {price.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {price.maxPrice?.toFixed(3)} {price.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium">
                            {price.avgPrice?.toFixed(3)} {price.unit}
                          </TableCell>
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
          {/* MARKET NEWS TAB */}
          <TabsContent value="news" className="space-y-4 mt-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-green-600">MARKET NEWS</h2>
              <p className="text-sm text-muted-foreground">
                {newsPeriod === 'daily' ? 'Daily' : newsPeriod === 'monthly' ? 'Monthly' : newsPeriod} Market Commentary
              </p>
            </div>

            {/* Period Tabs */}
            <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
              <Button
                size="sm"
                variant={newsPeriod === 'daily' ? 'default' : 'outline'}
                onClick={() => setNewsPeriod('daily')}
                data-testid="news-period-daily"
              >
                Daily
              </Button>
              <Button
                size="sm"
                variant={newsPeriod === 'monthly' ? 'default' : 'outline'}
                onClick={() => setNewsPeriod('monthly')}
                data-testid="news-period-monthly"
              >
                Monthly
              </Button>
              {/* Current year always shown */}
              {!archiveYears.includes(String(new Date().getFullYear())) && (
                <Button
                  size="sm"
                  variant={newsPeriod === String(new Date().getFullYear()) ? 'default' : 'outline'}
                  onClick={() => setNewsPeriod(String(new Date().getFullYear()))}
                  data-testid={`news-period-${new Date().getFullYear()}`}
                >
                  {new Date().getFullYear()}
                </Button>
              )}
              {archiveYears.map((year) => (
                <Button
                  key={year}
                  size="sm"
                  variant={newsPeriod === year ? 'default' : 'outline'}
                  onClick={() => setNewsPeriod(year)}
                  data-testid={`news-period-${year}`}
                >
                  {year}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Wheat', 'Corn', 'Barley', 'Others'].map((category) => (
                <Card key={category} className="border" data-testid={`news-card-${category.toLowerCase()}`}>
                  <div className="bg-gray-100 px-4 py-2 border-b">
                    <h3 className="font-bold text-base">{category}</h3>
                  </div>
                  <CardContent className="p-3 space-y-3">
                    {/* Existing comments */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(marketNews[category] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">No comments yet</p>
                      ) : (
                        (marketNews[category] || []).map((note) => (
                          <div key={note.id} className="p-2 bg-muted/30 rounded-md group">
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-muted-foreground">
                                {note.createdBy} &bull; {new Date(note.createdAt).toLocaleDateString('en-GB')} {new Date(note.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteComment(note.id)}>
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {/* Inline comment input */}
                    <div className="flex gap-2">
                      <Input
                        data-testid={`news-input-${category.toLowerCase()}`}
                        placeholder="Type your commentary..."
                        value={newsInput[category] || ''}
                        onChange={(e) => setNewsInput(prev => ({ ...prev, [category]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(category); }}
                        className="text-sm"
                      />
                      <Button size="sm" data-testid={`news-send-${category.toLowerCase()}`} onClick={() => handlePostComment(category)}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TMO TENDERS TAB */}
          <TabsContent value="tenders" className="space-y-4 mt-4">
            <div className="flex flex-col items-center gap-2 mb-12">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-green-600">TMO / TURKISH GRAIN BOARD</h2>
                <p className="text-sm text-muted-foreground">Tenders & Results</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button data-testid="new-tender-btn" onClick={() => { 
                setTenderForm({ 
                  tenderDate: '', 
                  commodity: 'Feed Barley', 
                  totalQuantity: 0,
                  tenderType: 'Import',
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
                {[...tenders].sort((a, b) => {
                  const parseDate = (d) => {
                    if (!d) return 0;
                    const parts = d.split('/');
                    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
                    return 0;
                  };
                  return parseDate(b.tenderDate) - parseDate(a.tenderDate);
                }).map((tender) => {
                  const totalQty = tender.results?.reduce((sum, r) => sum + (parseFloat(r.quantity) || parseFloat(r.sizeKMT) || 0), 0) || 0;
                  return (
                  <Card key={tender.id} className="overflow-hidden border-2 border-gray-300" data-testid={`tender-card-${tender.id}`}>
                    {/* Clickable Header */}
                    <div 
                      className="cursor-pointer select-none"
                      onClick={() => setExpandedTenders(prev => ({ ...prev, [tender.id]: !prev[tender.id] }))}
                    >
                      {/* Tender Title Row */}
                      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center">
                        {expandedTenders[tender.id] 
                          ? <ChevronDown className="h-5 w-5 mr-2 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-5 w-5 mr-2 text-muted-foreground shrink-0" />
                        }
                        <h3 className="font-bold text-lg tracking-wide text-center flex-1">
                          {(tender.totalQuantity || 0).toLocaleString('en-US')} Mts {tender.commodity} {tender.tenderType || 'Import'} Tender - Dated: {tender.tenderDate}
                        </h3>
                      </div>
                      {/* Shipment Period Row */}
                      <div className="bg-gray-50 border-b border-gray-300 px-4 py-1.5 text-center">
                        <p className="font-medium text-sm text-muted-foreground">
                          {tender.shipmentPeriodStart && tender.shipmentPeriodEnd 
                            ? `Shipment Period: ${tender.shipmentPeriodStart} - ${tender.shipmentPeriodEnd}` 
                            : 'Shipment Period: TBD'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Expandable Content */}
                    {expandedTenders[tender.id] && (
                      <>
                    {/* Results Table */}
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                            <TableHead className="font-bold text-black text-sm">COMPANY</TableHead>
                            <TableHead className="font-bold text-black text-sm">PORT</TableHead>
                            <TableHead className="font-bold text-black text-sm text-right">QUANTITY</TableHead>
                            <TableHead className="font-bold text-red-600 text-sm text-right">CIF</TableHead>
                            <TableHead className="font-bold text-black text-sm text-right">EXW</TableHead>
                            <TableHead className="font-bold text-black text-sm text-center w-20"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tender.results?.length > 0 ? (
                            <>
                              {tender.results.map((result, idx) => (
                                <TableRow key={idx} className="border-b border-gray-200">
                                  <TableCell className="font-medium">{result.company || result.winner}</TableCell>
                                  <TableCell>{result.port}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {(parseFloat(result.quantity) || parseFloat(result.sizeKMT) || 0).toLocaleString('de-DE')}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-bold text-red-600">
                                    {result.cifPrice != null ? parseFloat(result.cifPrice).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {result.exwPrice != null ? `$${parseFloat(result.exwPrice).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                                        setSelectedTenderForResult(tender);
                                        setEditingResultIndex(idx);
                                        setResultForm({
                                          port: result.port || '',
                                          company: result.company || result.winner || '',
                                          quantity: String(result.quantity || result.sizeKMT || ''),
                                          cifPrice: result.cifPrice != null ? String(result.cifPrice) : '',
                                          exwPrice: result.exwPrice != null ? String(result.exwPrice) : '',
                                        });
                                        setResultDialogOpen(true);
                                      }}>
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteResult(tender, idx)}>
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {/* Total Row */}
                              <TableRow className="border-t-2 border-gray-300 font-bold">
                                <TableCell className="font-bold text-base">TOTAL</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right font-mono font-bold text-base">
                                  {totalQty.toLocaleString('de-DE')}
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
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
                          setEditingResultIndex(null);
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
                      </>
                    )}
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
                <p className="text-sm text-muted-foreground">Loading messages...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {telegramMessages.map((msg, i) => (
                  <a 
                    key={i} 
                    href={msg.link || `https://t.me/${msg.channelId}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block p-2.5 bg-muted/50 rounded-lg text-sm hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-semibold text-xs text-blue-600">{msg.channelName}</span>
                    </div>
                    <p className="text-foreground leading-snug text-xs">
                      {msg.text?.slice(0, 200)}{msg.text?.length > 200 ? '...' : ''}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {msg.date ? new Date(msg.date).toLocaleDateString('en-GB') + ' ' + new Date(msg.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
        <DialogContent className="sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{editingTender ? 'Edit Tender' : 'New TMO Tender'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tender Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" data-testid="tender-date-input" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tenderForm.tenderDate || 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={tenderForm.tenderDate ? parse(tenderForm.tenderDate, 'dd/MM/yyyy', new Date()) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setTenderForm({ ...tenderForm, tenderDate: format(date, 'dd/MM/yyyy') });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Commodity</Label>
                <Select value={tenderForm.commodity} onValueChange={(v) => setTenderForm({ ...tenderForm, commodity: v })}>
                  <SelectTrigger data-testid="tender-commodity-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feed Barley">Feed Barley</SelectItem>
                    <SelectItem value="Wheat">Wheat</SelectItem>
                    <SelectItem value="Feed Corn">Feed Corn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={tenderForm.tenderType || 'Import'} onValueChange={(v) => setTenderForm({ ...tenderForm, tenderType: v })}>
                  <SelectTrigger data-testid="tender-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Import">Import</SelectItem>
                    <SelectItem value="Export">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shipment Period From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" data-testid="tender-shipment-start" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tenderForm.shipmentPeriodStart || 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={tenderForm.shipmentPeriodStart ? parse(tenderForm.shipmentPeriodStart, 'dd/MM/yyyy', new Date()) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setTenderForm({ ...tenderForm, shipmentPeriodStart: format(date, 'dd/MM/yyyy') });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Shipment Period To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" data-testid="tender-shipment-end" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tenderForm.shipmentPeriodEnd || 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={tenderForm.shipmentPeriodEnd ? parse(tenderForm.shipmentPeriodEnd, 'dd/MM/yyyy', new Date()) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setTenderForm({ ...tenderForm, shipmentPeriodEnd: format(date, 'dd/MM/yyyy') });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
        <DialogContent className="sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">{editingResultIndex !== null ? 'Edit Tender Result' : 'Add Tender Result'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input 
                  data-testid="result-company-input"
                  value={resultForm.company} 
                  onChange={(e) => setResultForm({ ...resultForm, company: e.target.value })}
                  placeholder="e.g., Arion, Bunge"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Select value={resultForm.port} onValueChange={(v) => setResultForm({ ...resultForm, port: v })}>
                  <SelectTrigger data-testid="result-port-input"><SelectValue placeholder="Select port" /></SelectTrigger>
                  <SelectContent>
                    {TMO_PORTS.map((port) => (
                      <SelectItem key={port} value={port}>{port}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity (MTS)</Label>
              <Input 
                data-testid="result-quantity-input"
                type="number" 
                step="0.1"
                value={resultForm.quantity} 
                onChange={(e) => setResultForm({ ...resultForm, quantity: e.target.value })}
                placeholder="e.g., 25000"
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
            <Button data-testid="add-result-submit-btn" onClick={handleAddResult}>{editingResultIndex !== null ? 'Save' : 'Add Result'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
