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

      <Tabs defaultValue="confirmation">
        <TabsList className="flex-wrap">
          <TabsTrigger value="confirmation"><FileText className="h-3.5 w-3.5 mr-1" />Confirmation</TabsTrigger>
          <TabsTrigger value="shipment"><Ship className="h-3.5 w-3.5 mr-1" />Shipment Details</TabsTrigger>
          <TabsTrigger value="parties"><Users className="h-3.5 w-3.5 mr-1" />Parties & Agents</TabsTrigger>
          <TabsTrigger value="documents"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Documents ({completedDocs}/{docList.length})</TabsTrigger>
        </TabsList>

        {/* Confirmation Tab */}
        <TabsContent value="confirmation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Contract Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Reference Number</span><span className="font-medium">{trade.referenceNumber || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Contract Number</span><span className="font-medium">{trade.pirContractNumber || trade.contractNumber || '-'}</span></div>
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
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Incoterm</span><span className="font-medium">{(() => { const port = trade.basePortName || trade.loadingPortName || ''; const term = trade.deliveryTerm || ''; if (port && port.toLowerCase().startsWith(term.toLowerCase())) return port; return [term, port].filter(Boolean).join(' ') || '-'; })()}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Payment Terms</span><span className="font-medium">{trade.paymentTerms || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Origin</span><span className="font-medium">{trade.originName || getName([], trade.originId)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Shipment Window</span><span className="font-medium">{trade.shipmentWindowStart && trade.shipmentWindowEnd ? `${(() => { try { return format(parseISO(trade.shipmentWindowStart), 'dd MMM yyyy'); } catch { return trade.shipmentWindowStart; }})() } - ${(() => { try { return format(parseISO(trade.shipmentWindowEnd), 'dd MMM yyyy'); } catch { return trade.shipmentWindowEnd; }})()}` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColor.color || 'bg-muted'}>{statusConfig?.label || trade.status}</Badge></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Shipment Details Tab */}
        <TabsContent value="shipment">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Vessel & Voyage</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Vessel</span><span className="font-medium">{getName(vessels, trade.vesselId)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Loading Port</span><span className="font-medium">{trade.loadingPortName || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Discharge Port</span><span className="font-medium">{trade.dischargePortName || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span className="font-medium">{trade.eta || '-'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Rates</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Freight Rate</span><span className="font-medium">{trade.freightRate ? `$${trade.freightRate}/MT` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Discharge Rate</span><span className="font-medium">{trade.dischargeRate || trade.disRate || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Demurrage Rate</span><span className="font-medium">{trade.demurrageRate || trade.demRate || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Dispatch Rate</span><span className="font-medium">{trade.dispatchRate || '-'}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Parties & Agents Tab */}
        <TabsContent value="parties">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Trading Parties</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span className="font-medium">{getName(partners, trade.sellerId)}</span></div>
                {trade.sellerTradeContact && (
                  <div className="ml-4 pl-3 border-l-2 border-blue-200 space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" />Seller Trade Contact</div>
                    <div className="text-sm">{trade.sellerTradeContact.name}</div>
                    {trade.sellerTradeContact.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{trade.sellerTradeContact.email}</div>}
                    {trade.sellerTradeContact.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{trade.sellerTradeContact.phone}</div>}
                  </div>
                )}
                {trade.sellerExecutionContact && (
                  <div className="ml-4 pl-3 border-l-2 border-green-200 space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><UserIcon className="h-3 w-3" />Seller Execution Contact</div>
                    <div className="text-sm">{trade.sellerExecutionContact.name}</div>
                    {trade.sellerExecutionContact.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{trade.sellerExecutionContact.email}</div>}
                    {trade.sellerExecutionContact.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{trade.sellerExecutionContact.phone}</div>}
                  </div>
                )}
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span className="font-medium">{getName(partners, trade.buyerId)}</span></div>
                {trade.buyerTradeContact && (
                  <div className="ml-4 pl-3 border-l-2 border-blue-200 space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" />Buyer Trade Contact</div>
                    <div className="text-sm">{trade.buyerTradeContact.name}</div>
                    {trade.buyerTradeContact.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{trade.buyerTradeContact.email}</div>}
                    {trade.buyerTradeContact.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{trade.buyerTradeContact.phone}</div>}
                  </div>
                )}
                {trade.buyerExecutionContact && (
                  <div className="ml-4 pl-3 border-l-2 border-green-200 space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><UserIcon className="h-3 w-3" />Buyer Execution Contact</div>
                    <div className="text-sm">{trade.buyerExecutionContact.name}</div>
                    {trade.buyerExecutionContact.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{trade.buyerExecutionContact.email}</div>}
                    {trade.buyerExecutionContact.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{trade.buyerExecutionContact.phone}</div>}
                  </div>
                )}
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Broker</span><span className="font-medium">{getName(partners, trade.brokerId) || '-'}</span></div>
                {trade.brokerTradeContact && (
                  <div className="ml-4 pl-3 border-l-2 border-blue-200 space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" />Broker Trade Contact</div>
                    <div className="text-sm">{trade.brokerTradeContact.name}</div>
                    {trade.brokerTradeContact.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{trade.brokerTradeContact.email}</div>}
                    {trade.brokerTradeContact.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{trade.brokerTradeContact.phone}</div>}
                  </div>
                )}
                {trade.brokerExecutionContact && (
                  <div className="ml-4 pl-3 border-l-2 border-green-200 space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><UserIcon className="h-3 w-3" />Broker Execution Contact</div>
                    <div className="text-sm">{trade.brokerExecutionContact.name}</div>
                    {trade.brokerExecutionContact.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{trade.brokerExecutionContact.email}</div>}
                    {trade.brokerExecutionContact.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{trade.brokerExecutionContact.phone}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Co-Broker, Surveyor & Agents</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Co-Broker</span><span className="font-medium">{getName(partners, trade.coBrokerId) || '-'}</span></div>
                {trade.coBrokerTradeContact && (
                  <div className="ml-4 pl-3 border-l-2 border-blue-200 space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" />Co-Broker Trade Contact</div>
                    <div className="text-sm">{trade.coBrokerTradeContact.name}</div>
                    {trade.coBrokerTradeContact.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{trade.coBrokerTradeContact.email}</div>}
                    {trade.coBrokerTradeContact.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{trade.coBrokerTradeContact.phone}</div>}
                  </div>
                )}
                {trade.coBrokerExecutionContact && (
                  <div className="ml-4 pl-3 border-l-2 border-green-200 space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><UserIcon className="h-3 w-3" />Co-Broker Execution Contact</div>
                    <div className="text-sm">{trade.coBrokerExecutionContact.name}</div>
                    {trade.coBrokerExecutionContact.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{trade.coBrokerExecutionContact.email}</div>}
                    {trade.coBrokerExecutionContact.phone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{trade.coBrokerExecutionContact.phone}</div>}
                  </div>
                )}
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Surveyor</span><span className="font-medium">{getName(surveyors, trade.surveyorId)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Loading Agent</span><span className="font-medium">{trade.loadingAgent || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Discharge Agent</span><span className="font-medium">{trade.dischargeAgent || '-'}</span></div>
              </CardContent>
            </Card>
          </div>
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
