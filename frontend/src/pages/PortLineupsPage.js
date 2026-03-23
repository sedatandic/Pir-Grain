import { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, Ship, Anchor, Calendar, Search, ChevronDown, Loader2, AlertCircle, Clock } from 'lucide-react';
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
  const [selectedPort, setSelectedPort] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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
        if (res.data.ports?.length > 0) {
          setSelectedPort(res.data.ports[0].portName);
        }
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
    if (!reportData || !selectedPort) return null;
    return reportData.ports?.find(p => p.portName === selectedPort);
  }, [reportData, selectedPort]);

  const filteredVessels = useMemo(() => {
    if (!currentPortData) return [];
    const term = searchTerm.toLowerCase();
    let result = currentPortData.vessels;
    if (term) {
      result = result.filter(v =>
        v.vesselName?.toLowerCase().includes(term) ||
        v.loadingPort?.toLowerCase().includes(term) ||
        v.cargo?.toLowerCase().includes(term) ||
        v.buyer?.toLowerCase().includes(term) ||
        v.seller?.toLowerCase().includes(term)
      );
    }
    // Sort by days at port ascending (lowest first)
    return [...result].sort((a, b) => {
      const daysA = calcDaysSince(a.arrivalDate, selectedDate);
      const daysB = calcDaysSince(b.arrivalDate, selectedDate);
      if (daysA === null && daysB === null) return 0;
      if (daysA === null) return 1;
      if (daysB === null) return -1;
      return daysA - daysB;
    });
  }, [currentPortData, searchTerm, selectedDate]);

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
    reportData.ports?.forEach(p => {
      // Count unique vessel names
      const uniqueVessels = new Set(p.vessels.map(v => v.vesselName).filter(Boolean));
      counts[p.portName] = uniqueVessels.size;
    });
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
          {/* Date selector + Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative" data-testid="date-selector-wrapper">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30 min-w-[170px]"
                data-testid="date-selector"
              >
                {dates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search vessels, cargo, buyer..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A3D]/30"
                data-testid="vessel-search-input"
              />
            </div>

            {reportData && (
              <span className="text-xs text-muted-foreground self-center" data-testid="report-stats">
                {reportData.ports?.length} ports - {dates.length} days of data
              </span>
            )}
          </div>

          {/* Port tabs */}
          {reportData && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin" data-testid="port-tabs">
              {reportData.ports?.map(port => (
                <button
                  key={port.portName}
                  onClick={() => { setSelectedPort(port.portName); setSearchTerm(''); }}
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
            <div className="border border-border rounded-lg overflow-hidden bg-card" data-testid="vessel-table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="vessel-table">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Vessel</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Loading Port</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Arrival</th>
                      <th className="text-center px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Days</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Op.</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Cargo</th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">B/L Tonnage</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Buyer</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Seller</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVessels.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No vessels match your search' : 'No vessels in this port'}
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        // Build vessel group index for alternating colors
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
                            <tr
                              key={i}
                              className={`border-b border-border/50 hover:bg-muted/40 transition-colors ${isAlt ? 'bg-[#f0f7f1]' : ''}`}
                              data-testid={`vessel-row-${i}`}
                            >
                              <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap" data-testid={`vessel-name-${i}`}>
                                {v.vesselName || '-'}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{v.loadingPort || '-'}</td>
                              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{v.arrivalDate || '-'}</td>
                              <td className="px-3 py-2 text-center" data-testid={`vessel-days-${i}`}>
                                {days !== null ? (
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                    days > 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                    : days > 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  }`}>
                                    <Clock className="w-3 h-3" />
                                    {days}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2">
                                {v.status ? (
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>
                                    {v.status}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground text-xs">{translateOp(v.operation)}</td>
                              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{translateCargo(v.cargo)}</td>
                              <td className="px-3 py-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                                {v.blTonnage != null ? `${v.blTonnage.toLocaleString('en-US', { maximumFractionDigits: 0 })} MTS` : '-'}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground" title={v.buyer}>{v.buyer || '-'}</td>
                              <td className="px-3 py-2 text-muted-foreground" title={v.seller}>{v.seller || '-'}</td>
                            </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
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
