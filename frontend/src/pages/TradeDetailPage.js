import { useState, useEffect } from 'react';
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
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [surveyors, setSurveyors] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tradeRes, partRes, comRes, vesRes, surRes] = await Promise.all([
          api.get(`/api/trades/${tradeId}`),
          api.get('/api/partners'),
          api.get('/api/commodities'),
          api.get('/api/vessels'),
          api.get('/api/surveyors'),
        ]);
        setTrade(tradeRes.data);
        setPartners(partRes.data);
        setCommodities(comRes.data);
        setVessels(vesRes.data);
        setSurveyors(surRes.data);
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
        <Button variant="outline" data-testid="edit-trade-detail-btn" onClick={() => navigate(`/trades/${tradeId}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />Edit Trade
        </Button>
      </div>

      <Tabs defaultValue="summary">
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
                <div className="flex justify-between"><span className="text-muted-foreground">Payment Terms</span><span className="font-medium">{trade.paymentTerms || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Origin</span><span className="font-medium">{trade.originName || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Shipment Window</span><span className="font-medium">{trade.shipmentWindowStart && trade.shipmentWindowEnd ? `${(() => { try { const m = trade.shipmentWindowStart.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) return format(new Date(m[3], m[2]-1, m[1]), 'dd MMM yyyy'); return format(parseISO(trade.shipmentWindowStart), 'dd MMM yyyy'); } catch { return trade.shipmentWindowStart; }})() } - ${(() => { try { const m = trade.shipmentWindowEnd.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) return format(new Date(m[3], m[2]-1, m[1]), 'dd MMM yyyy'); return format(parseISO(trade.shipmentWindowEnd), 'dd MMM yyyy'); } catch { return trade.shipmentWindowEnd; }})()}` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Vessel</span><span className="font-medium uppercase">{trade.vesselName || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Discharge Rate</span><span className="font-medium">{trade.dischargeRate ? `${trade.dischargeRate.toLocaleString()} Mts` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Demurrage Rate</span><span className="font-medium">{trade.demurrageRate ? `USD ${trade.demurrageRate.toLocaleString()}/Day` : '-'}</span></div>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Discharge Quantity</span><span className="font-medium">{trade.dischargeQuantity ? `${Number(trade.dischargeQuantity).toLocaleString()} MT` : '-'}</span></div>
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
    </div>
  );
}
