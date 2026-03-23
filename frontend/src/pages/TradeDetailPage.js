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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, FileText, Ship, Users, ClipboardCheck, Loader2, Save, CheckCircle2, Circle, Briefcase, User as UserIcon, Mail, Phone, Pencil, Plus, X, Paperclip, Download, Trash2, Upload, GripVertical, Send, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { STATUS_OPTIONS, TRADE_STATUS_CONFIG } from '../lib/constants';
import { format, parseISO } from 'date-fns';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { cn } from '../lib/utils';

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
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [newDocInput, setNewDocInput] = useState('');
  const [surveyors, setSurveyors] = useState([]);
  const [ports, setPorts] = useState([]);
  const [blDialogOpen, setBlDialogOpen] = useState(false);
  const [blForm, setBlForm] = useState({});
  const [blSaving, setBlSaving] = useState(false);
  const [disportAgents, setDisportAgents] = useState([]);
  const [diUploading, setDiUploading] = useState(false);
  const [docFiles, setDocFiles] = useState({});
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [draggedFile, setDraggedFile] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [sendingSA, setSendingSA] = useState(false);
  const [sendingBC, setSendingBC] = useState(false);
  const [emailDialog, setEmailDialog] = useState({ open: false, docType: '', docLabel: '' });
  const [emailSellerTo, setEmailSellerTo] = useState('');
  const [emailBuyerTo, setEmailBuyerTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);

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
        setAdditionalDocs(tradeRes.data.additionalDocuments || []);
        // Fetch uploaded document files for this trade
        const filesRes = await api.get(`/api/documents?tradeId=${tradeId}`);
        const fileMap = {};
        (filesRes.data || []).forEach(f => {
          if (f.docName) {
            if (!fileMap[f.docName]) fileMap[f.docName] = [];
            fileMap[f.docName].push(f);
          }
        });
        setDocFiles(fileMap);
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
      await api.put(`/api/trades/${tradeId}`, { docChecks, additionalDocuments: additionalDocs });
      toast.success('Document checklist saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const uploadDocFile = async (docName, file) => {
    if (!file) return;
    setUploadingDoc(docName);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tradeId', tradeId);
      formData.append('tradeRef', trade?.referenceNumber || '');
      formData.append('docType', 'checklist');
      formData.append('docName', docName);
      const res = await api.post('/api/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocFiles(prev => ({
        ...prev,
        [docName]: [...(prev[docName] || []), res.data]
      }));
      toast.success(`File uploaded for ${docName}`);
    } catch { toast.error('Upload failed'); }
    finally { setUploadingDoc(null); }
  };

  const deleteDocFile = async (docName, fileId) => {
    try {
      await api.delete(`/api/documents/${fileId}`);
      setDocFiles(prev => ({
        ...prev,
        [docName]: (prev[docName] || []).filter(f => f.id !== fileId)
      }));
      toast.success('File removed');
    } catch { toast.error('Delete failed'); }
  };

  const bulkUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    setBulkUploading(true);
    let count = 0;
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tradeId', tradeId);
        formData.append('tradeRef', trade?.referenceNumber || '');
        formData.append('docType', 'checklist');
        formData.append('docName', '_unassigned');
        const res = await api.post('/api/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setDocFiles(prev => ({ ...prev, _unassigned: [...(prev._unassigned || []), res.data] }));
        count++;
      } catch { /* skip failed */ }
    }
    setBulkUploading(false);
    if (count > 0) toast.success(`${count} file(s) uploaded — drag them to assign`);
  };

  const reassignFile = async (file, fromDoc, toDoc) => {
    try {
      await api.put(`/api/documents/${file.id}/assign`, { docName: toDoc });
      setDocFiles(prev => {
        const next = { ...prev };
        next[fromDoc] = (next[fromDoc] || []).filter(f => f.id !== file.id);
        if (next[fromDoc].length === 0) delete next[fromDoc];
        next[toDoc] = [...(next[toDoc] || []), { ...file, docName: toDoc }];
        return next;
      });
      toast.success(`Moved to ${toDoc}`);
    } catch { toast.error('Failed to reassign'); }
  };

  const handleDragStart = (file, fromDoc) => { setDraggedFile({ file, fromDoc }); };
  const handleDragOver = (e, docName) => { e.preventDefault(); setDropTarget(docName); };
  const handleDragLeave = () => { setDropTarget(null); };
  const handleDrop = (e, toDoc) => {
    e.preventDefault();
    setDropTarget(null);
    if (draggedFile && draggedFile.fromDoc !== toDoc) {
      reassignFile(draggedFile.file, draggedFile.fromDoc, toDoc);
    }
    setDraggedFile(null);
  };

  const sendShipmentAppropriation = async () => {
    setSendingSA(true);
    try {
      // Download PDF as blob with auth header
      const res = await api.get(`/api/shipment-appropriation/${tradeId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      // Record the send
      await api.put(`/api/trades/${tradeId}`, {
        shipmentAppropriationSentBy: trade.executionHandledBy || 'Admin',
        shipmentAppropriationSentAt: new Date().toISOString(),
      });
      setTrade(prev => ({
        ...prev,
        shipmentAppropriationSentBy: prev.executionHandledBy || 'Admin',
        shipmentAppropriationSentAt: new Date().toISOString(),
      }));
      toast.success('Shipment Appropriation generated');
    } catch { toast.error('Failed to generate'); }
    finally { setSendingSA(false); }
  };

  const reverseShipmentAppropriation = async () => {
    setSendingSA(true);
    try {
      await api.put(`/api/trades/${tradeId}`, {
        shipmentAppropriationSentBy: null,
        shipmentAppropriationSentAt: null,
      });
      setTrade(prev => ({ ...prev, shipmentAppropriationSentBy: null, shipmentAppropriationSentAt: null }));
      toast.success('Shipment Appropriation reversed');
    } catch { toast.error('Failed to reverse'); }
    finally { setSendingSA(false); }
  };

  const sendBusinessConfirmation = async () => {
    setSendingBC(true);
    try {
      const res = await api.get(`/api/business-confirmation/${tradeId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      await api.put(`/api/trades/${tradeId}`, {
        businessConfirmationSentBy: trade.executionHandledBy || 'Admin',
        businessConfirmationSentAt: new Date().toISOString(),
      });
      setTrade(prev => ({
        ...prev,
        businessConfirmationSentBy: prev.executionHandledBy || 'Admin',
        businessConfirmationSentAt: new Date().toISOString(),
      }));
      toast.success('Business Confirmation generated');
    } catch { toast.error('Failed to generate'); }
    finally { setSendingBC(false); }
  };

  const openEmailDialog = (docType, docLabel) => {
    setEmailSellerTo('');
    setEmailBuyerTo('');
    setEmailDialog({ open: true, docType, docLabel });
  };

  const sendDocumentEmail = async () => {
    if (!emailSellerTo && !emailBuyerTo) { toast.error('Please enter at least one recipient email'); return; }
    setEmailSending(true);
    try {
      await api.post('/api/send-document-email', {
        trade_id: tradeId,
        doc_type: emailDialog.docType,
        seller_email: emailSellerTo,
        buyer_email: emailBuyerTo,
      });
      toast.success(`${emailDialog.docLabel} sent successfully`);
      setEmailDialog({ open: false, docType: '', docLabel: '' });
      fetchTrade();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send email');
    } finally { setEmailSending(false); }
  };

  const reverseBusinessConfirmation = async () => {
    setSendingBC(true);
    try {
      await api.put(`/api/trades/${tradeId}`, {
        businessConfirmationSentBy: null,
        businessConfirmationSentAt: null,
      });
      setTrade(prev => ({ ...prev, businessConfirmationSentBy: null, businessConfirmationSentAt: null }));
      toast.success('Business Confirmation reversed');
    } catch { toast.error('Failed to reverse'); }
    finally { setSendingBC(false); }
  };

  const saveBuyerPaymentDate = async (dateStr) => {
    try {
      await api.put(`/api/trades/${tradeId}`, { buyerPaymentDate: dateStr });
      setTrade(prev => ({ ...prev, buyerPaymentDate: dateStr }));
      toast.success('Buyer payment date saved');
    } catch { toast.error('Failed to save payment date'); }
  };

  const addAdditionalDoc = () => {
    const name = newDocInput.trim();
    if (!name) return;
    if (additionalDocs.includes(name)) { toast.error('Document already exists'); return; }
    setAdditionalDocs(prev => [...prev, name]);
    setNewDocInput('');
  };

  const removeAdditionalDoc = (doc) => {
    setAdditionalDocs(prev => prev.filter(d => d !== doc));
    setDocChecks(prev => { const next = {...prev}; delete next[doc]; return next; });
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
      buyerSurveyor: trade.buyerSurveyor || 'N/A',
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
      toast.success('Shipment (B/L) Details saved');
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
  const allDocs = [...docList, ...additionalDocs];
  const completedDocs = allDocs.filter(d => docChecks[d]).length;

  return (
    <div className="space-y-6" data-testid="trade-detail-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/trades')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{trade.pirContractNumber || trade.referenceNumber || trade.contractNumber || 'Trade Detail'}</h1>
            <Badge className={statusColor.color || 'bg-muted'}>{statusConfig?.label || trade.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">Contract #{trade.sellerContractNumber || trade.pirContractNumber || trade.contractNumber || '-'}</p>
        </div>
        {activeTab !== 'documents' && (
        <Button variant="outline" data-testid="edit-trade-detail-btn" onClick={() => activeTab === 'shipment' ? openBlDialog() : navigate(`/trades/${tradeId}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />{activeTab === 'shipment' ? 'Edit Shipment (B/L) Details' : 'Edit Trade'}
        </Button>
        )}
      </div>

      <Tabs defaultValue="summary" onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="summary"><FileText className="h-3.5 w-3.5 mr-1" />Trade Summary</TabsTrigger>
          <TabsTrigger value="shipment"><Ship className="h-3.5 w-3.5 mr-1" />Shipment (B/L) Details</TabsTrigger>
          <TabsTrigger value="documents"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Documents ({completedDocs}/{allDocs.length})</TabsTrigger>
        </TabsList>

        {/* Trade Summary Tab */}
        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Contract Information</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Pir Grain Ref. No</span><span className="font-medium">{trade.referenceNumber || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Seller Sales Contract No.</span><span className="font-medium">{trade.sellerContractNumber || trade.pirContractNumber || trade.contractNumber || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Contract Date</span><span className="font-medium">{(() => { const d = trade.contractDate; if (!d) return '-'; if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d; try { const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[3]}/${m[2]}/${m[1]}`; return d; } catch { return d; } })()}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span className="font-medium">{trade.sellerName || getName(partners, trade.sellerId)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span className="font-medium">{trade.buyerName || getName(partners, trade.buyerId)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Broker</span><span className="font-medium">{trade.brokerName || getName(partners, trade.brokerId) || '-'}</span></div>
                {trade.coBrokerId && (
                  <div className="flex justify-between"><span className="text-muted-foreground text-orange-600">Co-Broker</span><span className="font-medium text-orange-600">{trade.coBrokerName || getName(partners, trade.coBrokerId) || '-'}</span></div>
                )}
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Commodity</span><span className="font-medium">{trade.commodityDisplayName || commodityName}</span></div>
                <Separator />
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Specifications</span>
                  <span className="font-medium text-right whitespace-pre-line">{trade.commoditySpecs || commodity?.specs || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span className="font-medium">{trade.quantity ? `${trade.quantity.toLocaleString()} MT` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Unit Price</span><span className="font-medium">{trade.pricePerMT ? `${trade.currency || 'USD'} ${trade.pricePerMT.toLocaleString()}/MT` : '-'}</span></div>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Shipment Period</span><span className="font-medium text-right">{trade.shipmentWindowStart && trade.shipmentWindowEnd ? <>{(() => { try { const m = trade.shipmentWindowStart.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) return trade.shipmentWindowStart; return format(parseISO(trade.shipmentWindowStart), 'dd/MM/yyyy'); } catch { return trade.shipmentWindowStart; }})()}<br />{(() => { try { const m = trade.shipmentWindowEnd.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (m) return trade.shipmentWindowEnd; return format(parseISO(trade.shipmentWindowEnd), 'dd/MM/yyyy'); } catch { return trade.shipmentWindowEnd; }})()}</> : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Vessel</span><span className="font-medium uppercase">{trade.vesselName || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Discharge Rate</span><span className="font-medium">{trade.dischargeRate ? `${Number(trade.dischargeRate).toLocaleString()} Mts/Day` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Demurrage Rate</span><span className="font-medium">{trade.demurrageRate ? `USD ${Number(trade.demurrageRate).toLocaleString()}/Day` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Brokerage (per MT)</span><span className="font-medium">{trade.brokeragePerMT != null && trade.brokeragePerMT !== 0 ? `${trade.brokeragePerMT} ${trade.brokerageCurrency || 'USD'}` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Brokerage Payment</span><span className="font-medium capitalize">{trade.brokerageAccount ? `${trade.brokerageAccount} Account` : '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Execution Handled By</span><span className="font-medium">{trade.executionHandledBy || '-'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">GAFTA Term</span><span className="font-medium text-right max-w-[60%]">{trade.gaftaTerm || 'GAFTA No. 48, Arbitration Clause 125, London'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusColor.color || 'bg-muted'}>{statusConfig?.label || trade.status}</Badge></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Shipment (B/L) Details Tab */}
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
              <div className="flex justify-between"><span className="text-muted-foreground">Load Port</span><span className="font-medium">{trade.loadingPortName ? `${trade.loadingPortName}${trade.loadingPortCountry ? ', ' + trade.loadingPortCountry : ''}` : (trade.basePortName || '-')}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Discharge Port</span><span className="font-medium">{trade.dischargePortName ? `${trade.dischargePortName}${trade.dischargePortCountry ? ', ' + trade.dischargePortCountry : ''}` : '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Seller Surveyor</span><span className="font-medium">{trade.sellerSurveyor || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Buyer Surveyor</span><span className="font-medium">{trade.buyerSurveyor || '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Discharge Quantity (Mts)</span><span className="font-medium">{trade.dischargeQuantity ? `${Number(trade.dischargeQuantity).toLocaleString()} MT` : '-'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Shortage (Mts)</span><span className="font-medium">{(() => { const s = calcShortage(trade.blQuantity, trade.dischargeQuantity); if (s === null) return '-'; if (s > 0) return <span className="text-red-600 font-bold">-{s.toLocaleString(undefined, {maximumFractionDigits: 2})} MT</span>; return <span className="text-green-600">N/A</span>; })()}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Disport Agent</span><span className="font-medium">{trade.disportAgent || '-'}</span></div>
            </CardContent>
          </Card>

          {/* Business Confirmation, Documentary Instruction, Shipment Appropriation, Payment Date — all in one row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Business Confirmation to Seller &amp; Buyer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {trade.businessConfirmationSentAt ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-50 border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">Sent</p>
                        <p className="text-xs text-green-600">By {trade.businessConfirmationSentBy || '-'}</p>
                        <p className="text-xs text-green-600">{(() => { try { const d = new Date(trade.businessConfirmationSentAt); return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`; } catch { return trade.businessConfirmationSentAt; } })()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={sendBusinessConfirmation} disabled={sendingBC} data-testid="resend-bc-btn">
                        {sendingBC ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Resend
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={reverseBusinessConfirmation} disabled={sendingBC} data-testid="reverse-bc-btn">
                        <X className="h-4 w-4 mr-1" />Reverse
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={sendBusinessConfirmation} disabled={sendingBC} data-testid="send-bc-btn">
                    {sendingBC ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Send
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEmailDialog('business_confirmation', 'Business Confirmation')} data-testid="email-bc-btn">
                  <Mail className="h-4 w-4 mr-1" />Email PDF
                </Button>
              </CardContent>
            </Card>

            <Card>
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

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Shipment Appropriation to Buyer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {trade.shipmentAppropriationSentAt ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-green-50 border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">Sent</p>
                        <p className="text-xs text-green-600">By {trade.shipmentAppropriationSentBy || '-'}</p>
                        <p className="text-xs text-green-600">{(() => { try { const d = new Date(trade.shipmentAppropriationSentAt); return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`; } catch { return trade.shipmentAppropriationSentAt; } })()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={sendShipmentAppropriation} disabled={sendingSA} data-testid="resend-sa-btn">
                        {sendingSA ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Resend
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={reverseShipmentAppropriation} disabled={sendingSA} data-testid="reverse-sa-btn">
                        <X className="h-4 w-4 mr-1" />Reverse
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={sendShipmentAppropriation} disabled={sendingSA} data-testid="send-sa-btn">
                    {sendingSA ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Send
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEmailDialog('shipment_appropriation', 'Shipment Appropriation')} data-testid="email-sa-btn">
                  <Mail className="h-4 w-4 mr-1" />Email PDF
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Commission Invoice</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button size="sm" variant="outline" className="w-full" onClick={async () => {
                  try {
                    const res = await api.get(`/api/commission-invoice/${tradeId}/pdf`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                    window.open(url, '_blank');
                  } catch { toast.error('Failed to generate Commission Invoice'); }
                }} data-testid="download-ci-btn">
                  <FileText className="h-4 w-4 mr-1" />Download PDF
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => openEmailDialog('commission_invoice', 'Commission Invoice')} data-testid="email-ci-btn">
                  <Mail className="h-4 w-4 mr-1" />Email PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="documents">
          {/* Bulk Upload Zone */}
          <Card className="mb-4">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
                    data-testid="bulk-upload-zone"
                  >
                    {bulkUploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{bulkUploading ? 'Uploading...' : 'Click to bulk upload documents, then drag them to the correct slot below'}</span>
                    <input type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => { bulkUploadFiles(Array.from(e.target.files)); e.target.value = ''; }} />
                  </label>
                </div>
              </div>
              {/* Unassigned Files */}
              {docFiles._unassigned && docFiles._unassigned.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-sm font-semibold text-amber-700">Unassigned Files — Drag to a document slot below</h4>
                  <div className="flex flex-wrap gap-2">
                    {docFiles._unassigned.map(f => (
                      <div
                        key={f.id}
                        draggable
                        onDragStart={() => handleDragStart(f, '_unassigned')}
                        className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        data-testid={`unassigned-file-${f.id}`}
                      >
                        <GripVertical className="h-3 w-3 text-amber-400 flex-shrink-0" />
                        <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{f.fileName}</span>
                        <button onClick={() => deleteDocFile('_unassigned', f.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-1"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Shipment Document Checklist</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {commodityName} — {completedDocs} of {allDocs.length} documents completed
                </p>
              </div>
              <Button onClick={saveDocChecks} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
              </Button>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${allDocs.length > 0 ? (completedDocs / allDocs.length) * 100 : 0}%` }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {docList.map((doc, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border hover:bg-muted/50 transition-colors ${dropTarget === doc ? 'ring-2 ring-primary bg-primary/5 border-primary' : ''}`}
                    onDragOver={(e) => handleDragOver(e, doc)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, doc)}
                    data-testid={`doc-slot-${i}`}
                  >
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleDoc(doc)}>
                      {docChecks[doc] ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={docChecks[doc] ? 'line-through text-muted-foreground flex-1' : 'text-sm flex-1'}>{doc}</span>
                      <label
                        className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`upload-doc-${i}`}
                      >
                        {uploadingDoc === doc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => { uploadDocFile(doc, e.target.files[0]); e.target.value = ''; }} />
                      </label>
                    </div>
                    {docFiles[doc] && docFiles[doc].length > 0 && (
                      <div className="mt-2 ml-8 space-y-1">
                        {docFiles[doc].map(f => (
                          <div
                            key={f.id}
                            draggable
                            onDragStart={() => handleDragStart(f, doc)}
                            className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                            <a href={`${process.env.REACT_APP_BACKEND_URL}${f.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1" onClick={(e) => e.stopPropagation()} data-testid={`doc-file-link-${f.id}`}>{f.fileName}</a>
                            <button onClick={(e) => { e.stopPropagation(); deleteDocFile(doc, f.id); }} className="text-red-400 hover:text-red-600 flex-shrink-0" data-testid={`delete-doc-file-${f.id}`}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Trade-Specific Documents */}
              <Separator className="my-4" />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Additional Documents (Trade-Specific)</h4>
                <div className="flex gap-2">
                  <Input
                    data-testid="add-additional-doc-input"
                    value={newDocInput}
                    onChange={(e) => setNewDocInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAdditionalDoc()}
                    placeholder="Add new document..."
                    className="flex-1"
                  />
                  <Button size="sm" onClick={addAdditionalDoc} disabled={!newDocInput.trim()} data-testid="add-additional-doc-btn">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {additionalDocs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {additionalDocs.map((doc, i) => (
                      <div
                        key={`add-${i}`}
                        className={`p-3 rounded-lg border border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-50 transition-colors group ${dropTarget === doc ? 'ring-2 ring-primary bg-primary/5 border-primary' : ''}`}
                        onDragOver={(e) => handleDragOver(e, doc)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, doc)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="cursor-pointer flex-1 flex items-center gap-3" onClick={() => toggleDoc(doc)}>
                            {docChecks[doc] ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-orange-400 flex-shrink-0" />
                            )}
                            <span className={docChecks[doc] ? 'line-through text-muted-foreground text-sm' : 'text-sm'}>{doc}</span>
                          </div>
                          <label
                            className="cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`upload-additional-doc-${i}`}
                          >
                            {uploadingDoc === doc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => { uploadDocFile(doc, e.target.files[0]); e.target.value = ''; }} />
                          </label>
                          <button
                            data-testid={`remove-additional-doc-${i}`}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                            onClick={() => removeAdditionalDoc(doc)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {docFiles[doc] && docFiles[doc].length > 0 && (
                          <div className="mt-2 ml-8 space-y-1">
                            {docFiles[doc].map(f => (
                              <div
                                key={f.id}
                                draggable
                                onDragStart={() => handleDragStart(f, doc)}
                                className="flex items-center gap-2 text-xs bg-white/70 rounded px-2 py-1 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                                <a href={`${process.env.REACT_APP_BACKEND_URL}${f.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1" onClick={(e) => e.stopPropagation()}>{f.fileName}</a>
                                <button onClick={(e) => { e.stopPropagation(); deleteDocFile(doc, f.id); }} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {additionalDocs.length === 0 && (
                  <p className="text-xs text-muted-foreground">No additional documents added for this trade.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* B/L Edit Dialog */}
      <Dialog open={blDialogOpen} onOpenChange={setBlDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Shipment (B/L) Details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>B/L Number</Label>
                <Input data-testid="bl-number-input" value={blForm.blNumber || ''} onChange={(e) => setBlForm({...blForm, blNumber: e.target.value})} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>B/L Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button data-testid="bl-date-input" variant="outline" className={cn('w-full justify-start text-left font-normal', !blForm.blDate && 'text-muted-foreground')}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {blForm.blDate ? (() => { try { const d = new Date(blForm.blDate + (blForm.blDate.includes('T') ? '' : 'T00:00:00')); return !isNaN(d) ? format(d, 'dd/MM/yyyy') : blForm.blDate; } catch { return blForm.blDate; } })() : 'dd/mm/yyyy'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={blForm.blDate ? (() => { try { const d = new Date(blForm.blDate + (blForm.blDate.includes('T') ? '' : 'T00:00:00')); return !isNaN(d) ? d : undefined; } catch { return undefined; } })() : undefined} onSelect={(d) => { if (d) setBlForm({...blForm, blDate: format(d, 'dd/MM/yyyy')}); }} initialFocus />
                  </PopoverContent>
                </Popover>
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
                <span className="font-medium">{(() => { const s = calcShortage(blForm.blQuantity, blForm.dischargeQuantity); if (s === null) return '-'; if (s > 0) return <span className="text-red-600 font-bold">-{s.toLocaleString(undefined, {maximumFractionDigits: 2})} MT</span>; return <span className="text-green-600">N/A</span>; })()}</span>
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
                <Select value={blForm.buyerSurveyor || 'N/A'} onValueChange={(v) => setBlForm({...blForm, buyerSurveyor: v === '_custom' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Select surveyor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N/A">N/A</SelectItem>
                    {surveyors.sort((a, b) => a.name.localeCompare(b.name)).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                    <SelectItem value="_custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {(blForm.buyerSurveyor && blForm.buyerSurveyor !== 'N/A' && !surveyors.some(s => s.name === blForm.buyerSurveyor)) && (
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
            <Button onClick={saveBlDetails} disabled={blSaving}>{blSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Shipment (B/L) Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialog.open} onOpenChange={(o) => !o && setEmailDialog({ open: false, docType: '', docLabel: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email {emailDialog.docLabel}</DialogTitle>
            <DialogDescription>Separate emails will be sent to seller and buyer. CC: melisa.karagoz@pirgrain.com, salih.karagoz@pirgrain.com</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seller Email ({trade?.sellerName})</Label>
              <Input data-testid="email-seller" type="email" value={emailSellerTo} onChange={(e) => setEmailSellerTo(e.target.value)} placeholder="seller@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Buyer Email ({trade?.buyerName})</Label>
              <Input data-testid="email-buyer" type="email" value={emailBuyerTo} onChange={(e) => setEmailBuyerTo(e.target.value)} placeholder="buyer@example.com" />
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <p><strong>Document:</strong> {emailDialog.docLabel}</p>
              <p><strong>Trade:</strong> {trade?.referenceNumber} ({trade?.sellerContractNumber})</p>
              <p><strong>From:</strong> alenakaragoz@pirgrain.com</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog({ open: false, docType: '', docLabel: '' })}>Cancel</Button>
            <Button onClick={sendDocumentEmail} disabled={emailSending} data-testid="send-email-btn">
              {emailSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}Send Emails
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
