import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, FileText, Ship, Users, ClipboardCheck, Loader2, Save, CheckCircle2, Circle, Briefcase, User as UserIcon, Mail, Phone, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { STATUS_OPTIONS, TRADE_STATUS_CONFIG } from '../lib/constants';
import { format, parseISO } from 'date-fns';

const DEFAULT_DOCS = [
  "Bill of Ladings", "Commercial Invoice", "Phytosanitary Certificate",
  "Certificate of Origin", "Weight Certificate", "Quality Certificate",
  "Hold Cleanliness Certificate", "Hold Sealing Certificate", "Fumigation Certificate",
  "Non-Radioactivity Certificate", "Cargo Manifest", "Marine Insurance Certificate",
  "Master's Receipt"
];

function getDocChecklist(commodity) {
  if (commodity && Array.isArray(commodity.documents) && commodity.documents.length > 0) {
    return commodity.documents;
  }
  return DEFAULT_DOCS;
}

export default function TradeDetailPage() {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docChecks, setDocChecks] = useState({});
  const [activeTab, setActiveTab] = useState('summary');
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [ports, setPorts] = useState([]);
  const [blDialogOpen, setBlDialogOpen] = useState(false);
  const [blForm, setBlForm] = useState({});
  const [blSaving, setBlSaving] = useState(false);
  const [disportAgents, setDisportAgents] = useState([]);
  const [diUploading, setDiUploading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tradeRes, partRes, comRes, vesRes, surRes, portRes, daRes] = await Promise.all([
          api.get(`/api/trades/${tradeId}`),
          api.get('/api/partners'),
          api.get('/api/commodities'),
          api.get('/api/vessels'),
          api.get('/api/surveyors'),
          api.get('/api/ports'),
          api.get('/api/disport-agents'),
        ]);
        setTrade(tradeRes.data);
        setPartners(partRes.data);
        setCommodities(comRes.data);
        setVessels(vesRes.data);
        setSurveyors(surRes.data);
        setPorts(portRes.data);
        setDisportAgents(daRes.data);
        setDocChecks(tradeRes.data.docChecks || {});
      } catch (err) {
        toast.error('Failed to load trade');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [tradeId]);

  const getName = (list, id) => {
    const item = list.find(i => i.id === id);
    return item?.name || item?.companyName || '-';
  };

  const saveDocChecks = async () => {
    setSaving(true);
    try {
      await api.put(`/api/trades/${tradeId}`, { docChecks });
      toast.success('Document checklist saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const toggleDoc = (doc) => {
    setDocChecks(prev => ({ ...prev, [doc]: !prev[doc] }));
  };

  const openBlDialog = () => {
    setBlForm({
      blNumber: trade.blNumber || '1',
      blDate: trade.blDate || '',
      blQuantity: trade.blQuantity != null ? String(trade.blQuantity) : '',
      loadPortId: trade.loadingPortId || trade.basePortId || '',
      dischargePortId: trade.dischargePortId || '',
      sellerSurveyor: trade.sellerSurveyor || '',
      buyerSurveyor: trade.buyerSurveyor || '',
      dischargeQuantity: trade.dischargeQuantity != null ? String(trade.dischargeQuantity) : '',
      disportAgent: trade.disportAgent || '',
    });
    setBlDialogOpen(true);
  };

  const handleBlQuantityChange = (val) => {
    setBlForm(prev => ({ ...prev, blQuantity: val }));
  };

  const calcShortage = (blQty, dischQty) => {
    const bl = parseFloat(blQty) || 0;
    const disch = parseFloat(dischQty) || 0;
    if (!bl || !disch) return null;
    const allowance = bl * 0.005;
    const diff = bl - disch;
    if (diff > allowance) return diff - allowance;
    return 0;
  };

  const saveBlDetails = async () => {
    setBlSaving(true);
    try {
      const data = {
        blNumber: blForm.blNumber,
        blDate: blForm.blDate,
        blQuantity: blForm.blQuantity ? parseFloat(blForm.blQuantity) : 0,
        loadingPortId: blForm.loadPortId,
        dischargePortId: blForm.dischargePortId,
        sellerSurveyor: blForm.sellerSurveyor,
        buyerSurveyor: blForm.buyerSurveyor,
        dischargeQuantity: blForm.dischargeQuantity ? parseFloat(blForm.dischargeQuantity) : 0,
        disportAgent: blForm.disportAgent,
      };
      const res = await api.put(`/api/trades/${tradeId}`, data);
      setTrade(res.data);
      toast.success('B/L Details saved');
      setBlDialogOpen(false);
    } catch { toast.error('Failed to save B/L details'); }
    finally { setBlSaving(false); }
  };

  const toggleDiReceived = async (val) => {
    try {
      const res = await api.put(`/api/trades/${tradeId}`, { diReceived: val });
      setTrade(res.data);
      toast.success(val ? 'DI marked as received' : 'DI marked as not received');
    } catch { toast.error('Failed to update'); }
  };

  const uploadDiDocument = async (file) => {
    if (!file) return;
    setDiUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/api/trades/${tradeId}/upload-di`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const res = await api.get(`/api/trades/${tradeId}`);
      setTrade(res.data);
      toast.success('DI document uploaded');
    } catch (err) { toast.error(err.response?.data?.detail || 'Upload failed'); }
    finally { setDiUploading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!trade) return <div className="text-center py-16 text-muted-foreground">Trade not found</div>;

  const statusConfig = STATUS_OPTIONS.find(s => s.value === trade.status);
  const statusColor = TRADE_STATUS_CONFIG[trade.status] || {};
  const commodity = commodities.find(c => c.id === trade.commodityId);
  const commodityName = commodity?.name || commodity?.companyName || '-';
  const docList = getDocChecklist(commodity);
  const completedDocs = docList.filter(d => docChecks[d]).length;

  return (
    <div className="space-y-6" data-testid="trade-detail-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/trades')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{trade.pirContractNumber || trade.referenceNumber || trade.contractNumber || 'Trade Detail'}</h1>
            <Badge className={statusColor.color || 'bg-muted'}>{statusConfig?.label || trade.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">Contract #{trade.pirContractNumber || trade.contractNumber || '-'}</p>
        </div>
        {activeTab !== 'documents' && (
        <Button variant="outline" data-testid="edit-trade-detail-btn" onClick={() => activeTab === 'shipment' ? openBlDialog() : navigate(`/trades/${tradeId}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />{activeTab === 'shipment' ? 'Edit B/L Details' : 'Edit Trade'}
        </Button>
        )}
      </div>

      <Tabs defaultValue="summary" onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="summary"><FileText className="h-3.5 w-3.5 mr-1" />Trade Summary</TabsTrigger>
          <TabsTrigger value="shipment"><Ship className="h-3.5 w-3.5 mr-1" />B/L Details</TabsTrigger>
          <TabsTrigger value="documents"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Documents ({completedDocs}/{docList.length})</TabsTrigger>
        </TabsList>

        {/* Trade Summary Tab */}
        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Contract Information</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Reference Number</span><span className="font-medium">{trade.referenceNumber || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Contract Number</span><span className="font-medium">{trade.pirContractNumber || trade.contractNumber || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Contract Date</span><span className="font-medium">{(() => { const d = trade.contractDate; if (!d) return '-'; if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d; try { const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[3]}/${m[2]}/${m[1]}`; return d; } catch { return d; } })()}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span className="font-medium">{trade.sellerName || getName(partners, trade.sellerId)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span className="font-medium">{trade.buyerName || getName(partners, trade.buyerId)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Broker</span><span className="font-medium">{trade.brokerName || getName(partners, trade.brokerId) || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Commodity</span><span className="font-medium">{commodityName}</span></div>
                {trade.commoditySpecs && (<>
                <Separator />
                <div>
                  <span className="text-muted-foreground text-xs">Commodity Specs.</span>
                  <pre className="whitespace-pre-wrap text-xs font-mono bg-muted/30 rounded-md p-2 mt-1">{trade.commoditySpecs}</pre>
                </div>
                </>)}
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span className="font-medium">{trade.quantity ? `${trade.quantity.toLocaleString()} MT` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium">{trade.pricePerMT ? `${trade.currency || 'USD'} ${trade.pricePerMT.toLocaleString()}/MT` : '-'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Trade Terms</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Incoterm</span><span className="font-medium">{(() => { const port = trade.basePortName || trade.loadingPortName || ''; const term = trade.deliveryTerm || ''; if (port && port.toLowerCase().startsWith(term.toLowerCase())) return port; return [term, port].filter(Boolean).join(' ') || '-'; })()}</span></div>
                <Separator />
                {trade.portVariations && trade.portVariations.length > 0 && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Port Variations</span>
                      <div className="mt-2 space-y-1.5">
                        {trade.portVariations.map((pv, i) => (
                          <div key={i} className="flex items-center justify-between rounded-md border px-3 py-1.5 bg-muted/30">
                            <span className="font-medium">{pv.portName || pv.portId}</span>
                            <span className={`font-mono text-sm ${Number(pv.difference) < 0 ? 'text-red-600' : Number(pv.difference) > 0 ? 'text-green-600' : ''}`}>
                              {Number(pv.difference) > 0 ? '+' : ''}{Number(pv.difference).toLocaleString()} USD
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Payment Terms</span><span className="font-medium">{trade.paymentTerms || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Origin</span><span className="font-medium">{trade.originName || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Shipment Window</span><span className="font-medium">{trade.shipmentWindowStart && trade.shipmentWindowEnd ? `${(() => { try { const m = trade.shipmentWindowStart.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) return format(new Date(m[3], m[2]-1, m[1]), 'dd MMM yyyy'); return format(parseISO(trade.shipmentWindowStart), 'dd MMM yyyy'); } catch { return trade.shipmentWindowStart; }})() } - ${(() => { try { const m = trade.shipmentWindowEnd.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) return format(new Date(m[3], m[2]-1, m[1]), 'dd MMM yyyy'); return format(parseISO(trade.shipmentWindowEnd), 'dd MMM yyyy'); } catch { return trade.shipmentWindowEnd; }})()}` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Vessel</span><span className="font-medium uppercase">{trade.vesselName || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Discharge Rate</span><span className="font-medium">{trade.dischargeRate ? `${Number(trade.dischargeRate).toLocaleString()} Mts` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Demurrage Rate</span><span className="font-medium">{trade.demurrageRate ? `USD ${Number(trade.demurrageRate).toLocaleString()}/Day` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Brokerage (per MT)</span><span className="font-medium">{trade.brokeragePerMT != null && trade.brokeragePerMT !== 0 ? trade.brokeragePerMT : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Brokerage Payment</span><span className="font-medium capitalize">{trade.brokerageAccount ? `${trade.brokerageAccount} Account` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColor.color || 'bg-muted'}>{statusConfig?.label || trade.status}</Badge></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* B/L Details Tab */}
        <TabsContent value="shipment">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Bill of Lading Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">B/L Number</span><span className="font-medium">{trade.blNumber || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">B/L Date</span><span className="font-medium">{trade.blDate || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">B/L Quantity</span><span className="font-medium">{trade.blQuantity ? `${Number(trade.blQuantity).toLocaleString()} MT` : '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Load Port</span><span className="font-medium">{trade.loadingPortName || trade.basePortName || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Discharge Port</span><span className="font-medium">{trade.dischargePortName || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Seller Surveyor</span><span className="font-medium">{trade.sellerSurveyor || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Buyer Surveyor</span><span className="font-medium">{trade.buyerSurveyor || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Discharge Quantity (Mts)</span><span className="font-medium">{trade.dischargeQuantity ? `${Number(trade.dischargeQuantity).toLocaleString()} MT` : '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Shortage (Mts)</span><span className="font-medium">{(() => { const s = calcShortage(trade.blQuantity, trade.dischargeQuantity); if (s === null) return '-'; if (s > 0) return <span className="text-red-600 font-bold">-{s.toLocaleString(undefined, {maximumFractionDigits: 2})} MT</span>; return <span className="text-green-600">None</span>; })()}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Disport Agent</span><span className="font-medium">{trade.disportAgent || '-'}</span></div>
            </CardContent>
          </Card>

          {/* Documentary Instruction */}
          <Card className="mt-4">
            <CardHeader className="pb-3"><CardTitle className="text-base">Documentary Instruction</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">DI Received?</span>
                <div className="flex gap-2">
                  <Button size="sm" variant={trade.diReceived ? 'default' : 'outline'} onClick={() => toggleDiReceived(true)}>Yes</Button>
                  <Button size="sm" variant={!trade.diReceived ? 'default' : 'outline'} onClick={() => toggleDiReceived(false)}>No</Button>
                </div>
              </div>
              {trade.diReceived && (
                <div className="space-y-3">
                  {trade.diDocumentFilename && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{trade.diDocumentFilename}</p>
                        <p className="text-xs text-muted-foreground">Uploaded document</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => window.open(`${api.defaults.baseURL}/api/trades/${tradeId}/download-di`, '_blank')}>Download</Button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      data-testid="di-file-upload"
                      className="max-w-sm"
                      onChange={(e) => uploadDiDocument(e.target.files[0])}
                    />
                    {diUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Accepted formats: PDF, Word (.doc, .docx)</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Documents Checklist Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Shipment Document Checklist</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {commodityName} — {completedDocs} of {docList.length} documents completed
                </p>
              </div>
              <Button onClick={saveDocChecks} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
              </Button>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${docList.length > 0 ? (completedDocs / docList.length) * 100 : 0}%` }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {docList.map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => toggleDoc(doc)}
                  >
                    {docChecks[doc] ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={docChecks[doc] ? 'line-through text-muted-foreground' : 'text-sm'}>{doc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* B/L Edit Dialog */}
      <Dialog open={blDialogOpen} onOpenChange={setBlDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit B/L Details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>B/L Number</Label>
                <Input data-testid="bl-number-input" value={blForm.blNumber || ''} onChange={(e) => setBlForm({...blForm, blNumber: e.target.value})} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>B/L Date</Label>
                <Input data-testid="bl-date-input" value={blForm.blDate || ''} onChange={(e) => setBlForm({...blForm, blDate: e.target.value})} placeholder="dd/mm/yyyy" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>B/L Quantity (Mts)</Label>
                <Input data-testid="bl-quantity-input" type="number" value={blForm.blQuantity || ''} onChange={(e) => handleBlQuantityChange(e.target.value)} placeholder="e.g. 25000" />
              </div>
              <div className="space-y-2">
                <Label>Discharge Quantity (Mts)</Label>
                <Input data-testid="bl-discharge-qty-input" type="number" value={blForm.dischargeQuantity || ''} onChange={(e) => setBlForm({...blForm, dischargeQuantity: e.target.value})} placeholder="Enter discharge quantity" />
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Shortage (Mts)</span>
                <span className="font-medium">{(() => { const s = calcShortage(blForm.blQuantity, blForm.dischargeQuantity); if (s === null) return '-'; if (s > 0) return <span className="text-red-600 font-bold">-{s.toLocaleString(undefined, {maximumFractionDigits: 2})} MT</span>; return <span className="text-green-600">None</span>; })()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Allowance: B/L Qty x 0.5% = {blForm.blQuantity ? (parseFloat(blForm.blQuantity) * 0.005).toLocaleString(undefined, {maximumFractionDigits: 2}) : '0'} MT</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Load Port</Label>
                <Select value={blForm.loadPortId || ''} onValueChange={(v) => setBlForm({...blForm, loadPortId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select port" /></SelectTrigger>
                  <SelectContent>{ports.sort((a, b) => a.name.localeCompare(b.name)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.country ? `, ${p.country}` : ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discharge Port</Label>
                <Select value={blForm.dischargePortId || ''} onValueChange={(v) => setBlForm({...blForm, dischargePortId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select port" /></SelectTrigger>
                  <SelectContent>{ports.sort((a, b) => a.name.localeCompare(b.name)).map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.country ? `, ${p.country}` : ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seller Surveyor</Label>
                <Select value={blForm.sellerSurveyor || '_custom'} onValueChange={(v) => setBlForm({...blForm, sellerSurveyor: v === '_custom' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Select surveyor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_custom">Custom...</SelectItem>
                    {surveyors.sort((a, b) => a.name.localeCompare(b.name)).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(!blForm.sellerSurveyor || !surveyors.some(s => s.name === blForm.sellerSurveyor)) && (
                  <Input value={blForm.sellerSurveyor || ''} onChange={(e) => setBlForm({...blForm, sellerSurveyor: e.target.value})} placeholder="Type surveyor name" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Buyer Surveyor</Label>
                <Select value={blForm.buyerSurveyor || '_custom'} onValueChange={(v) => setBlForm({...blForm, buyerSurveyor: v === '_custom' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Select surveyor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_custom">Custom...</SelectItem>
                    {surveyors.sort((a, b) => a.name.localeCompare(b.name)).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(!blForm.buyerSurveyor || !surveyors.some(s => s.name === blForm.buyerSurveyor)) && (
                  <Input value={blForm.buyerSurveyor || ''} onChange={(e) => setBlForm({...blForm, buyerSurveyor: e.target.value})} placeholder="Type surveyor name" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Disport Agent</Label>
              <Select value={blForm.disportAgent || '_custom'} onValueChange={(v) => setBlForm({...blForm, disportAgent: v === '_custom' ? '' : v})}>
                <SelectTrigger><SelectValue placeholder="Select disport agent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_custom">Custom...</SelectItem>
                  {disportAgents.sort((a, b) => a.name.localeCompare(b.name)).map(a => <SelectItem key={a.id} value={a.name}>{a.name}{a.port ? ` (${a.port})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {(!blForm.disportAgent || !disportAgents.some(a => a.name === blForm.disportAgent)) && (
                <Input value={blForm.disportAgent || ''} onChange={(e) => setBlForm({...blForm, disportAgent: e.target.value})} placeholder="Type agent name" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveBlDetails} disabled={blSaving}>{blSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save B/L Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
