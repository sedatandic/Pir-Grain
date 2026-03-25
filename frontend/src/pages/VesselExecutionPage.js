import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Separator } from '../components/ui/separator';
import { Ship, FileText, Loader2, Save, CheckCircle2, Circle, Mail, Pencil, X, Paperclip, Trash2, Upload, GripVertical, Send, ClipboardCheck, Anchor, ScrollText, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import DocInstructionsPage from './DocInstructionsPage';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format, parse } from 'date-fns';

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

export default function VesselExecutionPage() {
  const [trades, setTrades] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeLoading, setTradeLoading] = useState(false);

  // B/L state
  const [blDialogOpen, setBlDialogOpen] = useState(false);
  const [blForm, setBlForm] = useState({});
  const [blSaving, setBlSaving] = useState(false);
  const [ports, setPorts] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [disportAgents, setDisportAgents] = useState([]);
  const [loadportAgents, setLoadportAgents] = useState([]);

  // Documents state
  const [docChecks, setDocChecks] = useState({});
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [newDocInput, setNewDocInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [docFiles, setDocFiles] = useState({});
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [draggedFile, setDraggedFile] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  // Execution state
  const [sendingBC, setSendingBC] = useState(false);
  const [sendingSA, setSendingSA] = useState(false);
  const [diUploading, setDiUploading] = useState(false);
  const [emailDialog, setEmailDialog] = useState({ open: false, docType: '', docLabel: '' });
  const [emailSellerTo, setEmailSellerTo] = useState('');
  const [emailBuyerTo, setEmailBuyerTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [trRes, comRes, portRes, surRes, daRes, laRes] = await Promise.all([
          api.get('/api/trades'),
          api.get('/api/commodities'),
          api.get('/api/ports'),
          api.get('/api/surveyors'),
          api.get('/api/disport-agents'),
          api.get('/api/loadport-agents'),
        ]);
        setTrades(trRes.data);
        setCommodities(comRes.data);
        setPorts(portRes.data);
        setSurveyors(surRes.data);
        setDisportAgents(daRes.data);
        setLoadportAgents(laRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchInitial();
  }, []);

  const fetchTrade = async (tradeId) => {
    if (!tradeId) { setTrade(null); return; }
    setTradeLoading(true);
    try {
      const res = await api.get(`/api/trades/${tradeId}`);
      setTrade(res.data);
      setDocChecks(res.data.docChecks || {});
      setAdditionalDocs(res.data.additionalDocuments || []);
      const filesRes = await api.get(`/api/documents?tradeId=${tradeId}`);
      const fileMap = {};
      (filesRes.data || []).forEach(f => {
        if (f.docName) {
          if (!fileMap[f.docName]) fileMap[f.docName] = [];
          fileMap[f.docName].push(f);
        }
      });
      setDocFiles(fileMap);
    } catch { toast.error('Failed to load contract'); }
    finally { setTradeLoading(false); }
  };

  const handleTradeSelect = (tradeId) => {
    setSelectedTradeId(tradeId);
    fetchTrade(tradeId);
  };

  const getTradeLabel = (t) => {
    const num = t.pirContractNumber || t.contractNumber || '';
    const qty = t.quantity ? Number(t.quantity).toLocaleString('en-US') : '';
    const origin = t.originAdjective || t.originName || '';
    const commodity = t.commodityName || '';
    const seller = t.sellerCode || t.sellerName || '';
    const buyer = t.buyerCode || t.buyerName || '';
    const vessel = t.vesselName || '';
    const parts = [num];
    if (qty || commodity) parts.push(`${qty} Mts ${origin} ${commodity}`.trim());
    if (seller || buyer) parts.push(`${seller} / ${buyer}`.trim());
    if (vessel) parts.push(vessel);
    return parts.filter(Boolean).join(' - ');
  };

  // --- B/L Functions ---
  const openBlDialog = () => {
    if (!trade) return;
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
      loadportAgent: trade.loadportAgent || '',
    });
    setBlDialogOpen(true);
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
        loadportAgent: blForm.loadportAgent,
      };
      const res = await api.put(`/api/trades/${selectedTradeId}`, data);
      setTrade(res.data);
      toast.success('B/L Details saved');
      setBlDialogOpen(false);
    } catch { toast.error('Failed to save B/L details'); }
    finally { setBlSaving(false); }
  };

  // --- Documents Functions ---
  const saveDocChecks = async () => {
    setSaving(true);
    try {
      await api.put(`/api/trades/${selectedTradeId}`, { docChecks, additionalDocuments: additionalDocs });
      toast.success('Document checklist saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const toggleDoc = (doc) => setDocChecks(prev => ({ ...prev, [doc]: !prev[doc] }));

  const uploadDocFile = async (docName, file) => {
    if (!file) return;
    setUploadingDoc(docName);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tradeId', selectedTradeId);
      formData.append('tradeRef', trade?.referenceNumber || '');
      formData.append('docType', 'checklist');
      formData.append('docName', docName);
      const res = await api.post('/api/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocFiles(prev => ({ ...prev, [docName]: [...(prev[docName] || []), res.data] }));
      toast.success(`File uploaded for ${docName}`);
    } catch { toast.error('Upload failed'); }
    finally { setUploadingDoc(null); }
  };

  const deleteDocFile = async (docName, fileId) => {
    try {
      await api.delete(`/api/documents/${fileId}`);
      setDocFiles(prev => ({ ...prev, [docName]: (prev[docName] || []).filter(f => f.id !== fileId) }));
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
        formData.append('tradeId', selectedTradeId);
        formData.append('tradeRef', trade?.referenceNumber || '');
        formData.append('docType', 'checklist');
        formData.append('docName', '_unassigned');
        const res = await api.post('/api/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setDocFiles(prev => ({ ...prev, _unassigned: [...(prev._unassigned || []), res.data] }));
        count++;
      } catch { /* skip */ }
    }
    setBulkUploading(false);
    if (count > 0) toast.success(`${count} file(s) uploaded`);
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

  const handleDragStart = (file, fromDoc) => setDraggedFile({ file, fromDoc });
  const handleDragOver = (e, docName) => { e.preventDefault(); setDropTarget(docName); };
  const handleDragLeave = () => setDropTarget(null);
  const handleDrop = (e, toDoc) => {
    e.preventDefault();
    setDropTarget(null);
    if (draggedFile && draggedFile.fromDoc !== toDoc) reassignFile(draggedFile.file, draggedFile.fromDoc, toDoc);
    setDraggedFile(null);
  };

  const addCustomDoc = () => {
    const name = newDocInput.trim();
    if (!name) return;
    if (additionalDocs.includes(name)) { toast.error('Already exists'); return; }
    setAdditionalDocs(prev => [...prev, name]);
    setNewDocInput('');
  };

  const removeAdditionalDoc = (doc) => {
    setAdditionalDocs(prev => prev.filter(d => d !== doc));
    setDocChecks(prev => { const next = { ...prev }; delete next[doc]; return next; });
  };

  // --- Execution Functions ---
  const sendBusinessConfirmation = async () => {
    setSendingBC(true);
    try {
      const res = await api.get(`/api/business-confirmation/${selectedTradeId}/pdf`, { responseType: 'blob' });
      window.open(window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
      await api.put(`/api/trades/${selectedTradeId}`, {
        businessConfirmationSentBy: trade.executionHandledBy || 'Admin',
        businessConfirmationSentAt: new Date().toISOString(),
      });
      setTrade(prev => ({ ...prev, businessConfirmationSentBy: prev.executionHandledBy || 'Admin', businessConfirmationSentAt: new Date().toISOString() }));
      toast.success('Business Confirmation generated');
    } catch { toast.error('Failed to generate'); }
    finally { setSendingBC(false); }
  };

  const reverseBusinessConfirmation = async () => {
    setSendingBC(true);
    try {
      await api.put(`/api/trades/${selectedTradeId}`, { businessConfirmationSentBy: null, businessConfirmationSentAt: null });
      setTrade(prev => ({ ...prev, businessConfirmationSentBy: null, businessConfirmationSentAt: null }));
      toast.success('Business Confirmation reversed');
    } catch { toast.error('Failed to reverse'); }
    finally { setSendingBC(false); }
  };

  const sendShipmentAppropriation = async () => {
    setSendingSA(true);
    try {
      const res = await api.get(`/api/shipment-appropriation/${selectedTradeId}/pdf`, { responseType: 'blob' });
      window.open(window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
      await api.put(`/api/trades/${selectedTradeId}`, {
        shipmentAppropriationSentBy: trade.executionHandledBy || 'Admin',
        shipmentAppropriationSentAt: new Date().toISOString(),
      });
      setTrade(prev => ({ ...prev, shipmentAppropriationSentBy: prev.executionHandledBy || 'Admin', shipmentAppropriationSentAt: new Date().toISOString() }));
      toast.success('Shipment Appropriation generated');
    } catch { toast.error('Failed to generate'); }
    finally { setSendingSA(false); }
  };

  const reverseShipmentAppropriation = async () => {
    setSendingSA(true);
    try {
      await api.put(`/api/trades/${selectedTradeId}`, { shipmentAppropriationSentBy: null, shipmentAppropriationSentAt: null });
      setTrade(prev => ({ ...prev, shipmentAppropriationSentBy: null, shipmentAppropriationSentAt: null }));
      toast.success('Shipment Appropriation reversed');
    } catch { toast.error('Failed to reverse'); }
    finally { setSendingSA(false); }
  };

  const toggleDiReceived = async (val) => {
    try {
      const res = await api.put(`/api/trades/${selectedTradeId}`, { diReceived: val });
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
      await api.post(`/api/trades/${selectedTradeId}/upload-di`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const res = await api.get(`/api/trades/${selectedTradeId}`);
      setTrade(res.data);
      toast.success('DI document uploaded');
    } catch (err) { toast.error(err.response?.data?.detail || 'Upload failed'); }
    finally { setDiUploading(false); }
  };

  const openEmailDialog = (docType, docLabel) => {
    setEmailSellerTo(trade?.sellerEmail || '');
    setEmailBuyerTo(trade?.buyerEmail || '');
    setEmailDialog({ open: true, docType, docLabel });
  };

  const sendDocumentEmail = async () => {
    if (!emailSellerTo && !emailBuyerTo) { toast.error('Enter at least one email'); return; }
    setEmailSending(true);
    try {
      await api.post('/api/send-document-email', {
        trade_id: selectedTradeId,
        doc_type: emailDialog.docType,
        seller_email: emailSellerTo,
        buyer_email: emailBuyerTo,
      });
      toast.success(`${emailDialog.docLabel} sent`);
      setEmailDialog({ open: false, docType: '', docLabel: '' });
      fetchTrade(selectedTradeId);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to send'); }
    finally { setEmailSending(false); }
  };

  // Computed
  const commodity = trade ? commodities.find(c => c.id === trade.commodityId) : null;
  const getPortDisplay = (portId) => {
    const p = ports.find(x => x.id === portId);
    return p ? `${p.name}, ${p.country}` : '-';
  };
  const docList = getDocChecklist(commodity);
  const allDocs = [...docList, ...additionalDocs];
  const completedDocs = allDocs.filter(d => docChecks[d]).length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4" data-testid="vessel-execution-page">
      <h1 className="text-3xl font-bold tracking-tight">Vessel Execution</h1>

      {/* Ongoing Contracts Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-2.5 font-medium">Contract</th>
              <th className="text-left px-4 py-2.5 font-medium">Commodity</th>
              <th className="text-right px-4 py-2.5 font-medium">Quantity</th>
              <th className="text-left px-4 py-2.5 font-medium">Seller</th>
              <th className="text-left px-4 py-2.5 font-medium">Buyer</th>
              <th className="text-left px-4 py-2.5 font-medium">Vessel</th>
            </tr>
          </thead>
          <tbody>
            {trades.filter(t => (t.pirContractNumber || t.contractNumber) && t.vesselName).map(t => (
              <tr
                key={t.id}
                onClick={() => handleTradeSelect(t.id)}
                className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${selectedTradeId === t.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                data-testid={`ve-contract-row-${t.id}`}
              >
                <td className="px-4 py-2.5 font-medium">{t.pirContractNumber || t.contractNumber}</td>
                <td className="px-4 py-2.5">{t.originAdjective || t.originName} {t.commodityName}</td>
                <td className="px-4 py-2.5 text-right">{t.quantity ? `${Number(t.quantity).toLocaleString('en-US')} MT` : '-'}</td>
                <td className="px-4 py-2.5">{t.sellerCode || t.sellerName || '-'}</td>
                <td className="px-4 py-2.5">{t.buyerCode || t.buyerName || '-'}</td>
                <td className="px-4 py-2.5 font-medium uppercase">{t.vesselName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tradeLoading && <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {trade && !tradeLoading && (
        <Tabs defaultValue="bc" className="mt-2">
          <TabsList className="w-full flex h-auto flex-wrap">
            <TabsTrigger value="bc" className="py-3 text-xs sm:text-sm flex-1"><FileText className="h-4 w-4 mr-1.5 hidden sm:inline" />Business Confirmation</TabsTrigger>
            <TabsTrigger value="nomination" className="py-3 text-xs sm:text-sm flex-1"><Anchor className="h-4 w-4 mr-1.5 hidden sm:inline" />Vessel Nomination</TabsTrigger>
            <TabsTrigger value="di" className="py-3 text-xs sm:text-sm flex-1"><ScrollText className="h-4 w-4 mr-1.5 hidden sm:inline" />Documentary Instruction</TabsTrigger>
            <TabsTrigger value="bl" className="py-3 text-xs sm:text-sm flex-1"><Ship className="h-4 w-4 mr-1.5 hidden sm:inline" />B/L Details</TabsTrigger>
            <TabsTrigger value="sa" className="py-3 text-xs sm:text-sm flex-1"><Send className="h-4 w-4 mr-1.5 hidden sm:inline" />Shipment Appropriation</TabsTrigger>
            <TabsTrigger value="documents" className="py-3 text-xs sm:text-sm flex-1"><ClipboardCheck className="h-4 w-4 mr-1.5 hidden sm:inline" />Shipment Documents ({completedDocs}/{allDocs.length})</TabsTrigger>
          </TabsList>

          {/* B/L Details Tab */}
          <TabsContent value="bl">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Bill of Lading Details</CardTitle>
                <Button size="sm" variant="outline" onClick={openBlDialog}><Pencil className="h-3.5 w-3.5 mr-1" />Edit B/L Details</Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Vessel Name</span><span className="font-medium uppercase">{trade.vesselName || '-'}</span></div>
                    <Separator />
                    <div className="flex justify-between"><span className="text-muted-foreground">B/L Number</span><span className="font-medium">{trade.blNumber || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">B/L Date</span><span className="font-medium">{trade.blDate || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">B/L Quantity</span><span className="font-medium">{trade.blQuantity ? `${Number(trade.blQuantity).toLocaleString()} MT` : '-'}</span></div>
                    <Separator />
                    <div className="flex justify-between"><span className="text-muted-foreground">Load Port</span><span className="font-medium">{getPortDisplay(trade.loadingPortId || trade.basePortId)}</span></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Load Port Agent</span><span className="font-medium">{trade.loadportAgent || '-'}</span></div>
                    <Separator />
                    <div className="flex justify-between"><span className="text-muted-foreground">Disport Agent</span><span className="font-medium">{trade.disportAgent || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Seller Surveyor at Load Port</span><span className="font-medium">{trade.sellerSurveyor || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Buyer Surveyor at Load Port</span><span className="font-medium">{trade.buyerSurveyor || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Discharge Quantity</span><span className="font-medium">{trade.dischargeQuantity ? `${Number(trade.dischargeQuantity).toLocaleString()} MT` : '-'}</span></div>
                    <Separator />
                    <div className="flex justify-between"><span className="text-muted-foreground">Discharge Port</span><span className="font-medium">{getPortDisplay(trade.dischargePortId)}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card className="mb-4">
              <CardContent className="pt-5 pb-4">
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors" data-testid="bulk-upload-zone">
                  {bulkUploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{bulkUploading ? 'Uploading...' : 'Click to bulk upload documents, then drag to assign'}</span>
                  <input type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => { bulkUploadFiles(Array.from(e.target.files)); e.target.value = ''; }} />
                </label>
                {docFiles._unassigned && docFiles._unassigned.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-sm font-semibold text-amber-700">Unassigned Files</h4>
                    <div className="flex flex-wrap gap-2">
                      {docFiles._unassigned.map(f => (
                        <div key={f.id} draggable onDragStart={() => handleDragStart(f, '_unassigned')} className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2 cursor-grab">
                          <GripVertical className="h-3 w-3 text-amber-400" /><FileText className="h-3 w-3 text-primary" />
                          <span className="truncate max-w-[200px]">{f.fileName}</span>
                          <button onClick={() => deleteDocFile('_unassigned', f.id)} className="text-red-400 hover:text-red-600 ml-1"><Trash2 className="h-3 w-3" /></button>
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
                  <CardTitle className="text-base">Document Checklist</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{completedDocs} of {allDocs.length} completed</p>
                </div>
                <Button onClick={saveDocChecks} disabled={saving} size="sm">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save</Button>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${allDocs.length > 0 ? (completedDocs / allDocs.length) * 100 : 0}%` }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allDocs.map((doc, i) => (
                    <div key={i} className={`p-3 rounded-lg border hover:bg-muted/50 transition-colors ${dropTarget === doc ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                      onDragOver={(e) => handleDragOver(e, doc)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, doc)}>
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleDoc(doc)}>
                        {docChecks[doc] ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                        <span className={docChecks[doc] ? 'line-through text-muted-foreground flex-1' : 'text-sm flex-1'}>{doc}</span>
                        <label className="cursor-pointer text-muted-foreground hover:text-primary" onClick={(e) => e.stopPropagation()}>
                          {uploadingDoc === doc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => { uploadDocFile(doc, e.target.files[0]); e.target.value = ''; }} />
                        </label>
                        {additionalDocs.includes(doc) && <button onClick={(e) => { e.stopPropagation(); removeAdditionalDoc(doc); }} className="text-red-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>}
                      </div>
                      {docFiles[doc] && docFiles[doc].length > 0 && (
                        <div className="mt-2 ml-8 space-y-1">
                          {docFiles[doc].map(f => (
                            <div key={f.id} draggable onDragStart={() => handleDragStart(f, doc)} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5 cursor-grab">
                              <GripVertical className="h-3 w-3 text-muted-foreground" /><FileText className="h-3 w-3 text-primary" />
                              <span className="truncate max-w-[200px]">{f.fileName}</span>
                              <button onClick={() => deleteDocFile(doc, f.id)} className="text-red-400 hover:text-red-600 ml-auto"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Input placeholder="Add custom document..." value={newDocInput} onChange={(e) => setNewDocInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomDoc()} className="max-w-xs" />
                  <Button size="sm" variant="outline" onClick={addCustomDoc}>Add</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Confirmation Tab */}
          <TabsContent value="bc">
            <Card>
              <CardHeader><CardTitle className="text-base">Business Confirmation to Seller & Buyer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {trade.businessConfirmationSentAt ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 border-green-200">
                      <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800">Business Confirmation Sent</p>
                        <p className="text-sm text-green-600">By {trade.businessConfirmationSentBy || '-'}</p>
                        <p className="text-sm text-green-600">{(() => { try { const d = new Date(trade.businessConfirmationSentAt); return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`; } catch { return trade.businessConfirmationSentAt; } })()}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={sendBusinessConfirmation} disabled={sendingBC}>
                        {sendingBC ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}Resend
                      </Button>
                      <Button variant="outline" className="text-destructive hover:text-destructive" onClick={reverseBusinessConfirmation} disabled={sendingBC}>
                        <X className="h-4 w-4 mr-2" />Reverse
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="lg" onClick={sendBusinessConfirmation} disabled={sendingBC}>
                    {sendingBC ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}Generate Business Confirmation
                  </Button>
                )}
                <Button variant="outline" size="lg" onClick={() => openEmailDialog('business_confirmation', 'Business Confirmation')}>
                  <Send className="h-4 w-4 mr-2" />Email Business Confirmation
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vessel Nomination Tab */}
          <TabsContent value="nomination">
            <Card>
              <CardHeader><CardTitle className="text-base">Vessel Nomination</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {trade.vesselName ? (
                  <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vessel:</span><span className="font-semibold text-lg">{trade.vesselName}</span></div>
                    {trade.vesselIMO && <div className="flex justify-between text-sm"><span className="text-muted-foreground">IMO:</span><span className="font-medium">{trade.vesselIMO}</span></div>}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No vessel assigned yet</p>
                )}
                <Button size="lg" disabled={!trade.vesselName} onClick={() => openEmailDialog('vessel_nomination', 'Vessel Nomination')}>
                  <Send className="h-4 w-4 mr-2" />Send Nomination
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documentary Instruction Tab */}
          <TabsContent value="di">
            <Card className="mb-4">
              <CardHeader><CardTitle className="text-base">Documentary Instruction Received</CardTitle></CardHeader>
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
                        <Button size="sm" variant="outline" onClick={() => window.open(`${api.defaults.baseURL}/api/trades/${selectedTradeId}/download-di`, '_blank')}>Download</Button>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Input type="file" accept=".pdf,.doc,.docx" className="max-w-sm" onChange={(e) => uploadDiDocument(e.target.files[0])} />
                      {diUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Accepted: PDF, Word (.doc, .docx)</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <DocInstructionsPage filterTradeId={selectedTradeId} embedded />
          </TabsContent>

          {/* Shipment Appropriation Tab */}
          <TabsContent value="sa">
            <Card>
              <CardHeader><CardTitle className="text-base">Shipment Appropriation to Buyer</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {trade.shipmentAppropriationSentAt ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 border-green-200">
                      <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800">Shipment Appropriation Sent</p>
                        <p className="text-sm text-green-600">By {trade.shipmentAppropriationSentBy || '-'}</p>
                        <p className="text-sm text-green-600">{(() => { try { const d = new Date(trade.shipmentAppropriationSentAt); return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`; } catch { return trade.shipmentAppropriationSentAt; } })()}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={sendShipmentAppropriation} disabled={sendingSA}>
                        {sendingSA ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}Resend
                      </Button>
                      <Button variant="outline" className="text-destructive hover:text-destructive" onClick={reverseShipmentAppropriation} disabled={sendingSA}>
                        <X className="h-4 w-4 mr-2" />Reverse
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="lg" onClick={sendShipmentAppropriation} disabled={sendingSA}>
                    {sendingSA ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}Generate Shipment Appropriation
                  </Button>
                )}
                <Button variant="outline" size="lg" onClick={() => openEmailDialog('shipment_appropriation', 'Shipment Appropriation')}>
                  <Send className="h-4 w-4 mr-2" />Email Shipment Appropriation
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!trade && !tradeLoading && !loading && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Ship className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Select a contract above to manage vessel execution</p>
        </CardContent></Card>
      )}

      {/* B/L Edit Dialog */}
      <Dialog open={blDialogOpen} onOpenChange={setBlDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle className="text-center">Edit B/L Details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>B/L Number</Label><Input value={blForm.blNumber || ''} onChange={(e) => setBlForm(p => ({ ...p, blNumber: e.target.value }))} /></div>
            <div className="space-y-2"><Label>B/L Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {blForm.blDate || 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={(() => { try { const [d, m, y] = (blForm.blDate || '').split('/'); return new Date(y, m - 1, d); } catch { return undefined; } })()}
                    onSelect={(date) => { if (date) setBlForm(p => ({ ...p, blDate: format(date, 'dd/MM/yyyy') })); }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2"><Label>B/L Quantity (MT)</Label><Input type="number" value={blForm.blQuantity || ''} onChange={(e) => setBlForm(p => ({ ...p, blQuantity: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Discharge Quantity (MT)</Label><Input type="number" value={blForm.dischargeQuantity || ''} onChange={(e) => setBlForm(p => ({ ...p, dischargeQuantity: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Load Port</Label>
              <Select value={blForm.loadPortId || ''} onValueChange={(v) => setBlForm(p => ({ ...p, loadPortId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ports.filter(p => p.type === 'loading').map(p => <SelectItem key={p.id} value={p.id}>{p.name}, {p.country}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Discharge Port</Label>
              <Select value={blForm.dischargePortId || ''} onValueChange={(v) => setBlForm(p => ({ ...p, dischargePortId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ports.filter(p => p.type === 'discharge').map(p => <SelectItem key={p.id} value={p.id}>{p.name}, {p.country}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Seller Surveyor at Load Port</Label>
              <Select value={blForm.sellerSurveyor || ''} onValueChange={(v) => setBlForm(p => ({ ...p, sellerSurveyor: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{surveyors.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Buyer Surveyor at Load Port</Label>
              <Select value={blForm.buyerSurveyor || ''} onValueChange={(v) => setBlForm(p => ({ ...p, buyerSurveyor: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{surveyors.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Disport Agent</Label>
              <Select value={blForm.disportAgent || ''} onValueChange={(v) => setBlForm(p => ({ ...p, disportAgent: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{disportAgents.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Load Port Agent</Label>
              <Select value={blForm.loadportAgent || ''} onValueChange={(v) => setBlForm(p => ({ ...p, loadportAgent: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{loadportAgents.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveBlDetails} disabled={blSaving}>{blSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialog.open} onOpenChange={(open) => !open && setEmailDialog({ open: false, docType: '', docLabel: '' })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Send {emailDialog.docLabel}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Seller Email</Label><Input value={emailSellerTo} onChange={(e) => setEmailSellerTo(e.target.value)} placeholder="seller@example.com" /></div>
            <div className="space-y-2"><Label>Buyer Email</Label><Input value={emailBuyerTo} onChange={(e) => setEmailBuyerTo(e.target.value)} placeholder="buyer@example.com" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog({ open: false, docType: '', docLabel: '' })}>Cancel</Button>
            <Button onClick={sendDocumentEmail} disabled={emailSending}>{emailSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
