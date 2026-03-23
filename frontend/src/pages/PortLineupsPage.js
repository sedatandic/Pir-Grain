import { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, Ship, Anchor, Calendar, Search, ChevronDown, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { normalizeTR } from '../lib/utils-tr';
import api from '../lib/api';

const STATUS_COLORS = {
  'RIHTIMDA': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'DEMIR': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'DEMİR': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'AYRILDI': 'bg-slate-100 text-slate-500 dark:bg-slate-800/30 dark:text-slate-400',
};

function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('.');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return null;
}

function calcDaysSince(arrivalDateStr, reportDateStr) {
  const arrival = parseDateStr(arrivalDateStr);
  const report = parseDateStr(reportDateStr);
  if (!arrival || !report) return null;
  const diffMs = report - arrival;
  if (diffMs < 0) return null;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

const OP_MAP = { 'TAHLİYE': 'DISCHARGE', 'TAHLIYE': 'DISCHARGE', 'YÜKLEME': 'LOADING', 'YUKLEME': 'LOADING' };

const CARGO_MAP = [
  { keys: ['AYÇİÇEK TOHUMU KÜSPESİ', 'AYÇEKİRDEĞİ KÜSPESİ', 'AYCICEK TOHUMU KUSPESI', 'AYCEKIRDEGI KUSPESI'], en: 'SUNFLOWER MEAL PELLETS' },
  { keys: ['BUĞDAY KEPEĞİ', 'BUGDAY KEPEGI', 'BUGDAY KEPEĞİ'], en: 'WHEAT BRAN PELLETS' },
  { keys: ['SOYA FASÜLYESİ KÜSPESİ', 'SOYA FASULYESI KUSPESI'], en: 'SOYBEAN MEAL' },
  { keys: ['SOYA FASÜLYESİ', 'SOYA FASULYESI'], en: 'SOYBEANS' },
  { keys: ['MISIR GLUTENI', 'MISIR GLUTENİ'], en: 'CORN GLUTEN MEAL' },
  { keys: ['AYÇİÇEK TOHUMU', 'AYCICEK TOHUMU', 'AYÇEKİRDEĞİ TOHUMU'], en: 'SUNFLOWER SEEDS' },
  { keys: ['MELAS (ŞEKER PEKMEZİ)', 'MELAS'], en: 'MOLASSES' },
  { keys: ['AYÇİÇEK YAĞI', 'AYCICEK YAGI'], en: 'SUNFLOWER OIL' },
  { keys: ['KOLZA TOHUMU KÜSPESİ', 'KOLZA TOHUMU KUSPESI'], en: 'CANOLA MEAL' },
  { keys: ['PRİNÇ KEPEĞİ', 'PRINC KEPEGI'], en: 'RICE BRAN' },
  { keys: ['BUĞDAY', 'BUGDAY'], en: 'WHEAT' },
  { keys: ['MISIR'], en: 'CORN' },
];

function translateOp(op) {
  if (!op) return '-';
  return OP_MAP[op.toUpperCase()] || op;
}

function translateCargo(cargo) {
  if (!cargo) return '-';
  const upper = cargo.toUpperCase().trim();
  for (const entry of CARGO_MAP) {
    if (entry.keys.some(k => k.toUpperCase() === upper)) return entry.en;
  }
  return cargo;
}

export default function PortLineupsPage() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [selectedPort, setSelectedPort] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoadPort, setFilterLoadPort] = useState('all');
  const [filterCommodity, setFilterCommodity] = useState('all');
  const [filterBuyer, setFilterBuyer] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  const fetchDates = useCallback(async () => {
    try {
      const res = await api.get('/api/port-lineups/dates');
      setDates(res.data.dates || []);
      if (res.data.dates?.length > 0 && !selectedDate) {
        setSelectedDate(res.data.dates[0]);
      }
    } catch {
      // No data yet
    }
  }, []);

  useEffect(() => { fetchDates(); }, [fetchDates]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setError('');
    api.get(`/api/port-lineups/report/${encodeURIComponent(selectedDate)}`)
      .then(res => {
        setReportData(res.data);
        setSelectedPort('ALL');
      })
      .catch(() => setError('Failed to load report data'))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setUploadResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/api/port-lineups/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setUploadResult(res.data);
      await fetchDates();
      if (res.data.dates?.length > 0) {
        setSelectedDate(res.data.dates[0]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const currentPortData = useMemo(() => {
    if (!reportData) return null;
    if (selectedPort === 'ALL') {
      const allVessels = (reportData.ports || []).flatMap(p => p.vessels);
      return { portName: 'ALL', vessels: allVessels };
    }
    return reportData.ports?.find(p => p.portName === selectedPort) || null;
  }, [reportData, selectedPort]);

  // Unique filter options from current port's vessels
  const filterOptions = useMemo(() => {
    if (!currentPortData) return { loadPorts: [], commodities: [], buyers: [], sellers: [] };
    const lp = new Set(), cm = new Set(), bu = new Set(), se = new Set();
    currentPortData.vessels.forEach(v => {
      if (v.loadingPort) lp.add(v.loadingPort.trim());
      if (v.cargo) cm.add(translateCargo(v.cargo));
      if (v.buyer) bu.add(v.buyer.trim());
      if (v.seller) se.add(v.seller.trim());
    });
    return {
      loadPorts: [...lp].sort((a, b) => a.localeCompare(b, 'tr')),
      commodities: [...cm].sort((a, b) => a.localeCompare(b)),
      buyers: [...bu].sort((a, b) => a.localeCompare(b, 'tr')),
      sellers: [...se].sort((a, b) => a.localeCompare(b, 'tr')),
    };
  }, [currentPortData]);

  const filteredVessels = useMemo(() => {
    if (!currentPortData) return [];
    const term = normalizeTR(searchTerm);
    let result = currentPortData.vessels;
    if (term) {
      result = result.filter(v =>
        normalizeTR(v.vesselName).includes(term) ||
        normalizeTR(v.loadingPort).includes(term) ||
        normalizeTR(v.cargo).includes(term) ||
        normalizeTR(v.buyer).includes(term) ||
        normalizeTR(v.seller).includes(term)
      );
    }
    if (filterLoadPort !== 'all') result = result.filter(v => v.loadingPort?.trim() === filterLoadPort);
    if (filterCommodity !== 'all') result = result.filter(v => translateCargo(v.cargo) === filterCommodity);
    if (filterBuyer !== 'all') result = result.filter(v => v.buyer?.trim() === filterBuyer);
    if (filterSeller !== 'all') result = result.filter(v => v.seller?.trim() === filterSeller);
    // Sort by days at port ascending (lowest first)
    return [...result].sort((a, b) => {
      const daysA = calcDaysSince(a.arrivalDate, selectedDate);
      const daysB = calcDaysSince(b.arrivalDate, selectedDate);
      if (daysA === null && daysB === null) return 0;
      if (daysA === null) return 1;
      if (daysB === null) return -1;
      return daysA - daysB;
    });
  }, [currentPortData, searchTerm, selectedDate, filterLoadPort, filterCommodity, filterBuyer, filterSeller]);

  // Group vessels by vesselName and aggregate tonnage
  const vesselSummary = useMemo(() => {
    if (!filteredVessels.length) return [];
    const grouped = {};
    filteredVessels.forEach(v => {
      const key = v.vesselName || '(unnamed)';
      if (!grouped[key]) {
        grouped[key] = { ...v, totalTonnage: v.blTonnage || 0, rowCount: 1, rows: [v] };
      } else {
        grouped[key].totalTonnage += (v.blTonnage || 0);
        grouped[key].rowCount += 1;
        grouped[key].rows.push(v);
      }
    });
    return Object.values(grouped);
  }, [filteredVessels]);

  const portVesselCounts = useMemo(() => {
    if (!reportData) return {};
    const counts = {};
    let allTotal = 0;
    reportData.ports?.forEach(p => {
      const uniqueVessels = new Set(p.vessels.map(v => v.vesselName).filter(Boolean));
      counts[p.portName] = uniqueVessels.size;
      allTotal += uniqueVessels.size;
    });
    counts['ALL'] = allTotal;
    return counts;
  }, [reportData]);

  return (
    <div className="space-y-4" data-testid="port-lineups-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground" data-testid="port-lineups-title">Port Line-Ups</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Daily port report summary from Fey Shipping</p>
        </div>
        <label
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
            uploading
              ? 'bg-muted text-muted-foreground cursor-wait'
              : 'bg-[#1B7A3D] text-white hover:bg-[#15632F]'
          }`}
          data-testid="upload-report-button"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading...' : 'Upload Report'}
          <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-sm text-emerald-800 dark:text-emerald-200" data-testid="upload-success-message">
          {uploadResult.message} - {uploadResult.totalVessels} vessel records across {uploadResult.totalPorts} port sections
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2" data-testid="error-message">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* No data state */}
      {dates.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="no-data-state">
          <Ship className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No port reports uploaded yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Upload an Excel report to get started</p>
        </div>
      )}

      {/* Data present */}
      {dates.length > 0 && (
        <>
          {/* Date selector + Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" data-testid="date-selector-wrapper">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30 min-w-[150px]"
                data-testid="date-selector"
              >
                {dates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative max-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search vessels..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30"
                data-testid="vessel-search-input"
              />
            </div>

            <div className="relative">
              <select value={filterLoadPort} onChange={e => setFilterLoadPort(e.target.value)} className="pl-3 pr-7 py-2 bg-card border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30 min-w-[130px]" data-testid="filter-load-port">
                <option value="all">All Load Ports</option>
                {filterOptions.loadPorts.map(lp => <option key={lp} value={lp}>{lp}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select value={filterCommodity} onChange={e => setFilterCommodity(e.target.value)} className="pl-3 pr-7 py-2 bg-card border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30 min-w-[140px]" data-testid="filter-commodity">
                <option value="all">All Commodities</option>
                {filterOptions.commodities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select value={filterBuyer} onChange={e => setFilterBuyer(e.target.value)} className="pl-3 pr-7 py-2 bg-card border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30 min-w-[130px]" data-testid="filter-buyer">
                <option value="all">All Buyers</option>
                {filterOptions.buyers.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select value={filterSeller} onChange={e => setFilterSeller(e.target.value)} className="pl-3 pr-7 py-2 bg-card border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30 min-w-[130px]" data-testid="filter-seller">
                <option value="all">All Sellers</option>
                {filterOptions.sellers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Port tabs */}
          {reportData && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin" data-testid="port-tabs">
              <button
                onClick={() => { setSelectedPort('ALL'); setSearchTerm(''); setFilterLoadPort('all'); setFilterCommodity('all'); setFilterBuyer('all'); setFilterSeller('all'); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedPort === 'ALL'
                    ? 'bg-[#1B7A3D] text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                data-testid="port-tab-all"
              >
                ALL
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  selectedPort === 'ALL' ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
                }`}>{portVesselCounts['ALL'] || 0}</span>
              </button>
              {reportData.ports?.map(port => (
                <button
                  key={port.portName}
                  onClick={() => { setSelectedPort(port.portName); setSearchTerm(''); setFilterLoadPort('all'); setFilterCommodity('all'); setFilterBuyer('all'); setFilterSeller('all'); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedPort === port.portName
                      ? 'bg-[#1B7A3D] text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  data-testid={`port-tab-${port.portName.replace(/[\s/]+/g, '-').toLowerCase()}`}
                >
                  {port.portName}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    selectedPort === port.portName
                      ? 'bg-white/20 text-white'
                      : 'bg-background text-muted-foreground'
                  }`}>
                    {portVesselCounts[port.portName] || 0}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Vessel table */}
          {!loading && currentPortData && (
            <div className="overflow-x-auto border rounded-lg" data-testid="vessel-table-container">
              <Table className="trade-table" data-testid="vessel-table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-center">Vessel</TableHead>
                    <TableHead className="text-center">Loading Port</TableHead>
                    <TableHead className="text-center">Arrival</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Op.</TableHead>
                    <TableHead className="text-center">Commodity</TableHead>
                    <TableHead className="text-center">B/L Tonnage</TableHead>
                    <TableHead className="text-center">Buyer</TableHead>
                    <TableHead className="text-center">Seller</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVessels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No vessels match your search' : 'No vessels in this port'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (() => {
                      let vesselColorIndex = 0;
                      let lastVessel = null;
                      const vesselGroupMap = {};
                      filteredVessels.forEach(v => {
                        const name = v.vesselName || '(unnamed)';
                        if (name !== lastVessel) {
                          if (lastVessel !== null) vesselColorIndex++;
                          lastVessel = name;
                        }
                        if (!(name in vesselGroupMap)) vesselGroupMap[name] = vesselColorIndex;
                      });

                      return filteredVessels.map((v, i) => {
                        const days = calcDaysSince(v.arrivalDate, selectedDate);
                        const statusClass = STATUS_COLORS[v.status?.toUpperCase()] || 'bg-muted text-muted-foreground';
                        const groupIdx = vesselGroupMap[v.vesselName || '(unnamed)'] || 0;
                        const isAlt = groupIdx % 2 === 1;
                        return (
                          <TableRow
                            key={i}
                            className={isAlt ? 'bg-[#f0f7f1] hover:bg-[#e4efe6]' : ''}
                            data-testid={`vessel-row-${i}`}
                          >
                            <TableCell className="text-center font-medium whitespace-nowrap" data-testid={`vessel-name-${i}`}>
                              {v.vesselName || '-'}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground whitespace-nowrap">{v.loadingPort || '-'}</TableCell>
                            <TableCell className="text-center text-muted-foreground whitespace-nowrap">{v.arrivalDate || '-'}</TableCell>
                            <TableCell className="text-center" data-testid={`vessel-days-${i}`}>
                              {days !== null ? (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                  days > 10 ? 'bg-red-100 text-red-700'
                                  : days > 5 ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  {days}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {v.status ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>
                                  {v.status}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground text-xs">{translateOp(v.operation)}</TableCell>
                            <TableCell className="text-center text-muted-foreground whitespace-nowrap">{translateCargo(v.cargo)}</TableCell>
                            <TableCell className="text-center font-mono text-muted-foreground whitespace-nowrap">
                              {v.blTonnage != null ? `${v.blTonnage.toLocaleString('en-US', { maximumFractionDigits: 0 })} MTS` : '-'}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground" title={v.buyer}>{v.buyer || '-'}</TableCell>
                            <TableCell className="text-center text-muted-foreground" title={v.seller}>{v.seller || '-'}</TableCell>
                          </TableRow>
                        );
                      });
                    })()
                  )}
                </TableBody>
              </Table>
              {/* Footer stats */}
              {filteredVessels.length > 0 && (
                <div className="px-3 py-2 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground" data-testid="table-footer-stats">
                  <span>{filteredVessels.length} records ({vesselSummary.length} unique vessels)</span>
                  <span>Total B/L: {filteredVessels.reduce((sum, v) => sum + (v.blTonnage || 0), 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} MTS</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
