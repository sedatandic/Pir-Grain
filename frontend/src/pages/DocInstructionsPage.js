import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Copy, Printer, FileText, Send, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_FORM = {
  tradeId: '', dischargePort: '', agentId: '', agentName: '', agentPhone: '', agentFax: '',
  agentMobile: '', agentEmail: '', agentWeb: '', agentAddress: '', surveyor: '',
  sellerSurveyor: '', originalDocsAddress: '', consigneeOption: 'to_order', consigneeCustom: '',
  consigneeBuyerId: '', notifyOption: 'buyer_details', notifyCustom: '', notifyBuyerId: '',
};

export default function DocInstructionsPage() {
  const [diList, setDiList] = useState([]);
  const [trades, setTrades] = useState([]);
  const [ports, setPorts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sending, setSending] = useState(null);
  const [previewDi, setPreviewDi] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [diRes, trRes, poRes, agRes, paRes, svRes] = await Promise.all([
        api.get('/api/doc-instructions/'),
        api.get('/api/trades'),
        api.get('/api/ports'),
        api.get('/api/disport-agents'),
        api.get('/api/partners'),
        api.get('/api/surveyors'),
      ]);
      setDiList(diRes.data);
      setTrades(trRes.data);
      setPorts(poRes.data);
      setAgents(agRes.data);
      setSurveyors(svRes.data);
      setBuyers(paRes.data.filter(p => {
        const t = Array.isArray(p.type) ? p.type : [p.type];
        return t.includes('buyer');
      }));
    } catch (err) {
      console.error('Failed to load data');
    }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleAgentSelect = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setForm(prev => ({
        ...prev,
        agentId, agentName: agent.name || '',
        agentPhone: agent.tel || '', agentFax: agent.fax || '',
        agentMobile: agent.whatsapp || '', agentEmail: agent.email || '',
        agentWeb: agent.web || '', agentAddress: agent.address || '',
      }));
    }
  };

  const handlePortSelect = (portDisplay) => {
    set('dischargePort', portDisplay);
    // Extract port name for agent matching
    const portName = portDisplay.split(',')[0].trim();
    const matchingAgent = agents.find(a => a.port && a.port.toLowerCase() === portName.toLowerCase());
    if (matchingAgent) {
      handleAgentSelect(matchingAgent.id);
    }
  };

  const handleSave = async () => {
    if (!form.tradeId) { toast.error('Please select a contract'); return; }
    try {
      if (editingId) {
        const { tradeId, ...updateData } = form;
        await api.put(`/api/doc-instructions/${editingId}`, updateData);
        toast.success('Documentary Instruction updated');
      } else {
        await api.post('/api/doc-instructions/', form);
        toast.success('Documentary Instruction created');
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...DEFAULT_FORM });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
  };

  const handleEdit = (di) => {
    setEditingId(di.id);
    const trade = trades.find(t => t.id === di.tradeId);
    setForm({
      tradeId: di.tradeId || '', dischargePort: di.dischargePort || '',
      agentId: di.agentId || '', agentName: di.agentName || '',
      agentPhone: di.agentPhone || '', agentFax: di.agentFax || '',
      agentMobile: di.agentMobile || '', agentEmail: di.agentEmail || '',
      agentWeb: di.agentWeb || '', agentAddress: di.agentAddress || '',
      surveyor: di.surveyor || '', sellerSurveyor: di.sellerSurveyor || trade?.sellerSurveyor || '',
      originalDocsAddress: di.originalDocsAddress || '',
      consigneeOption: di.consigneeOption || 'to_order', consigneeCustom: di.consigneeCustom || '',
      consigneeBuyerId: di.consigneeBuyerId || '', notifyOption: di.notifyOption || 'buyer_details',
      notifyCustom: di.notifyCustom || '', notifyBuyerId: di.notifyBuyerId || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/doc-instructions/${id}`);
      toast.success('Deleted');
      fetchAll();
      if (previewDi?.id === id) setPreviewDi(null);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleSendEmail = async (di) => {
    setSending(di.id);
    try {
      const res = await api.post(`/api/doc-instructions/${di.id}/send-email`);
      toast.success(res.data.message);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(null);
    }
  };

  const getTradeDropdownLabel = (trade) => {
    const num = trade.pirContractNumber || trade.contractNumber || '';
    const qty = trade.quantity ? Number(trade.quantity).toLocaleString('en-US') : '';
    const origin = trade.originAdjective || trade.originName || '';
    const commodity = trade.commodityName || '';
    const seller = trade.sellerCode || trade.sellerName || '';
    const buyer = trade.buyerCode || trade.buyerName || '';
    const vessel = trade.vesselName || '';
    const parts = [num];
    if (qty || commodity) parts.push(`${qty} Mts ${origin} ${commodity}`.trim());
    if (seller || buyer) parts.push(`${seller} / ${buyer}`.trim());
    if (vessel) parts.push(vessel);
    return parts.filter(Boolean).join(' - ');
  };

  const getTradeLabel = (tradeId) => {
    const trade = trades.find(t => t.id === tradeId);
    return trade ? (trade.pirContractNumber || trade.contractNumber || tradeId) : tradeId;
  };

  const getBuyerName = (buyerId) => {
    const buyer = buyers.find(b => b.id === buyerId);
    return buyer?.companyName || '';
  };

  const getBuyerDisplay = (buyerId) => {
    const buyer = buyers.find(b => b.id === buyerId);
    if (!buyer) return '';
    let lines = [buyer.companyName || ''];
    if (buyer.address) lines.push(buyer.address);
    if (buyer.city || buyer.country) lines.push([buyer.city, buyer.country].filter(Boolean).join(' / '));
    return lines.join('\n').toUpperCase();
  };

  const getConsigneeText = (di) => {
    if (di.consigneeOption === 'to_order') return 'TO ORDER';
    if (di.consigneeOption === 'buyer_details') return di.consigneeBuyerText || getBuyerDisplay(di.consigneeBuyerId);
    return di.consigneeCustom || '—';
  };

  const getNotifyText = (di) => {
    if (di.notifyOption === 'buyer_details') return di.notifyBuyerText || getBuyerDisplay(di.notifyBuyerId);
    return di.notifyCustom || '—';
  };

  const handleCopy = () => {
    if (previewRef.current) {
      const range = document.createRange();
      range.selectNodeContents(previewRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
      toast.success('Copied to clipboard');
    }
  };

  const handlePrint = () => {
    const content = previewRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Documentary Instructions</title><style>
      body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 30px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; font-weight: 600; width: 200px; }
      h2 { text-align: center; color: #15803d; }
      h3 { color: #15803d; border-bottom: 2px solid #15803d; padding-bottom: 4px; }
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  // For live preview from form
  const formConsignee = form.consigneeOption === 'to_order' ? 'TO ORDER' :
    form.consigneeOption === 'buyer_details' ? getBuyerDisplay(form.consigneeBuyerId) :
    form.consigneeCustom || '—';
  const formNotify = form.notifyOption === 'buyer_details' ? getBuyerDisplay(form.notifyBuyerId) :
    form.notifyCustom || '—';

  // Discharge ports with country for display
  const dischargePorts = [...new Map(
    ports.filter(p => p.type === 'discharge')
      .map(p => [`${p.name}, ${p.country}`, { name: p.name, country: p.country, display: `${p.name}, ${p.country}` }])
  ).values()].sort((a, b) => a.display.localeCompare(b.display));

  // Handle trade selection - auto-populate seller surveyor and buyer
  const handleTradeSelect = (tradeId) => {
    const trade = trades.find(t => t.id === tradeId);
    setForm(prev => ({
      ...prev,
      tradeId,
      sellerSurveyor: trade?.sellerSurveyor || '',
      notifyBuyerId: trade?.buyerId || prev.notifyBuyerId,
      consigneeBuyerId: trade?.buyerId || prev.consigneeBuyerId,
    }));
  };

  return (
    <div className="space-y-6" data-testid="doc-instructions-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Documentary Instructions</h1>
        <Button onClick={() => { setForm({ ...DEFAULT_FORM }); setEditingId(null); setDialogOpen(true); }} data-testid="new-di-btn">
          <Plus className="h-4 w-4 mr-2" />New DI
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DI List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-green-700">Saved Instructions</h2>
          {diList.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No documentary instructions yet. Click "New DI" to create one.</CardContent></Card>
          ) : (
            diList.map(di => (
              <Card key={di.id} className={`cursor-pointer transition-colors ${previewDi?.id === di.id ? 'border-green-500 border-2' : 'hover:border-green-300'}`}
                onClick={() => setPreviewDi(di)} data-testid={`di-card-${di.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{getTradeLabel(di.tradeId)}</p>
                      <p className="text-sm text-muted-foreground">{di.dischargePort || 'No port'} &bull; {di.agentName || 'No agent'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(di.createdAt).toLocaleDateString('en-GB')}
                        {di.sentAt && <span className="text-green-600 ml-2">Sent: {new Date(di.sentAt).toLocaleDateString('en-GB')}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(di)} data-testid={`edit-di-${di.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(di.id)} data-testid={`delete-di-${di.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" disabled={sending === di.id} onClick={() => handleSendEmail(di)} data-testid={`send-di-${di.id}`}>
                        {sending === di.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                        Send DI
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Preview */}
        <div>
          {previewDi ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-green-700">Preview - {getTradeLabel(previewDi.tradeId)}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Print</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={previewRef} className="text-sm leading-relaxed space-y-4">
                  <h2 style={{ textAlign: 'center', fontWeight: 700, fontSize: '16px', color: '#15803d' }}>DOCUMENTARY INSTRUCTIONS TO SELLER</h2>
                  <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#15803d', borderBottom: '2px solid #15803d', paddingBottom: '4px' }}>1. Shipment & Port Details</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                    <tbody>
                      {[
                        ['Discharge Port', previewDi.dischargePort || '—'],
                        ['Agent at Discharge Port', previewDi.agentName || '—'],
                        ['Agent Contacts', `Tel: ${previewDi.agentPhone || '—'}  •  Fax: ${previewDi.agentFax || '—'}  •  Mob: ${previewDi.agentMobile || '—'}`],
                        ['Agent Email / Web', `${previewDi.agentEmail || '—'}  •  ${previewDi.agentWeb || '—'}`],
                        ['Buyer Surveyor at Load Port', previewDi.surveyor || '—'],
                        ['Seller Surveyor at Load Port', previewDi.sellerSurveyor || (() => { const t = trades.find(tr => tr.id === previewDi.tradeId); return t?.sellerSurveyor || '—'; })()],
                      ].map(([label, val], i) => (
                        <tr key={i}>
                          <th style={{ border: '1px solid #d1d5db', padding: '6px 10px', background: '#f3f4f6', fontWeight: 600, width: '180px', textAlign: 'left', verticalAlign: 'top' }}>{label}</th>
                          <td style={{ border: '1px solid #d1d5db', padding: '6px 10px', whiteSpace: 'pre-wrap' }}>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#15803d', borderBottom: '2px solid #15803d', paddingBottom: '4px' }}>2. Address for Original Documents</h3>
                  <div style={{ border: '1px solid #d1d5db', padding: '10px', background: '#f9fafb', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>{previewDi.originalDocsAddress || '—'}</div>
                  <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#15803d', borderBottom: '2px solid #15803d', paddingBottom: '4px' }}>3. Required Documents</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #d1d5db', padding: '6px', background: '#f3f4f6', width: '36px', textAlign: 'center' }}>#</th>
                        <th style={{ border: '1px solid #d1d5db', padding: '6px', background: '#f3f4f6', textAlign: 'left' }}>Document</th>
                        <th style={{ border: '1px solid #d1d5db', padding: '6px', background: '#f3f4f6', textAlign: 'left' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const c = getConsigneeText(previewDi);
                        const n = getNotifyText(previewDi);
                        return [
                          { num: 1, doc: 'Signed Commercial Invoice (Original)', details: `Consignee: ${c}` },
                          { num: 2, doc: '3/3 Original B/L – "Clean on Board", "Freight Prepaid"', details: `Consignee: ${c}\nNotify: ${n}` },
                          { num: 3, doc: 'Certificate of Origin (Original + 2 Copies)', details: `Consignee: ${c}\nNotify: ${n}` },
                          { num: 4, doc: 'Phytosanitary Certificate (Original + 2 Copies)', details: `Consignee: ${c}` },
                          { num: 5, doc: 'Non-Radiation Certificate (CS134 & CS137 < 370 Bq/Kg)', details: `Consignee: ${c}\nNotify: ${n}` },
                          { num: 6, doc: 'Fumigation Certificate (Original, if any)', details: `Consignee: ${c}\nNotify: ${n}` },
                          { num: 7, doc: 'Quality Certificate (GAFTA Approved Surveyor)', details: `Consignee: ${c}\nNotify: ${n}` },
                          { num: 8, doc: 'Weight Certificate (GAFTA Approved Surveyor)', details: `Consignee: ${c}\nNotify: ${n}` },
                          { num: 9, doc: 'Holds Cleanliness Certificate (GAFTA Approved Surveyor)', details: `Consignee: ${c}\nNotify: ${n}` },
                          { num: 10, doc: 'Holds Sealing Certificate (GAFTA Approved Surveyor)', details: `Consignee: ${c}\nNotify: ${n}` },
                          { num: 11, doc: 'Insurance Certificate (GAFTA – 102% of value)', details: `Assured: ${c}` },
                          { num: 12, doc: "Master's Receipt", details: 'Confirming dispatch of 1 Original Phytosanitary Certificate + 1 Non-Negotiable B/L Copy' },
                          { num: 13, doc: 'Non-Dioxin Analysis + GAFTA Non-Dioxin Certificate', details: `Include all PCB and Dioxin parameters.\nConsignee: ${c}\nNotify: ${n}` },
                        ].map(({ num, doc, details }) => (
                          <tr key={num}>
                            <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'center', fontWeight: 600, verticalAlign: 'top' }}>{num}</td>
                            <td style={{ border: '1px solid #d1d5db', padding: '6px', fontWeight: 500, verticalAlign: 'top' }}>{doc}</td>
                            <td style={{ border: '1px solid #d1d5db', padding: '6px', whiteSpace: 'pre-wrap', verticalAlign: 'top', fontSize: '12px' }}>{details}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a DI from the list to preview</p>
            </CardContent></Card>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-center">{editingId ? 'Edit Documentary Instruction' : 'New Documentary Instruction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Contract Selection */}
            <div className="space-y-2">
              <Label>Contract *</Label>
              <Select value={form.tradeId} onValueChange={handleTradeSelect} disabled={!!editingId}>
                <SelectTrigger data-testid="di-contract-select"><SelectValue placeholder="Select contract" /></SelectTrigger>
                <SelectContent>
                  {trades.filter(t => t.pirContractNumber || t.contractNumber).map(t => (
                    <SelectItem key={t.id} value={t.id}>{getTradeDropdownLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Consignee & Notify */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-green-700 border-b pb-1">Consignee & Notify Party</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Consignee</Label>
                  <Select value={form.consigneeOption} onValueChange={v => set('consigneeOption', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to_order">TO ORDER</SelectItem>
                      <SelectItem value="buyer_details">Buyer Details</SelectItem>
                      <SelectItem value="other">Other (Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.consigneeOption === 'other' && (
                    <Textarea value={form.consigneeCustom} onChange={e => set('consigneeCustom', e.target.value)} rows={2} placeholder="Enter custom consignee" />
                  )}
                  {form.consigneeOption === 'buyer_details' && form.consigneeBuyerId && (
                    <div className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap font-medium">{getBuyerDisplay(form.consigneeBuyerId)}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Notify Party</Label>
                  <Select value={form.notifyOption} onValueChange={v => set('notifyOption', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer_details">Buyer Details</SelectItem>
                      <SelectItem value="other">Other (Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.notifyOption === 'other' && (
                    <Textarea value={form.notifyCustom} onChange={e => set('notifyCustom', e.target.value)} rows={2} placeholder="Enter custom notify party" />
                  )}
                  {form.notifyOption === 'buyer_details' && form.notifyBuyerId && (
                    <div className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap font-medium">{getBuyerDisplay(form.notifyBuyerId)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Shipment & Port */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-green-700 border-b pb-1">Shipment & Port Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Discharge Port</Label>
                  <Select value={form.dischargePort} onValueChange={handlePortSelect}>
                    <SelectTrigger data-testid="di-port-select"><SelectValue placeholder="Select port" /></SelectTrigger>
                    <SelectContent side="bottom">
                      {dischargePorts.map(p => <SelectItem key={p.display} value={p.display}>{p.display}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Disport Agent</Label>
                  <Select value={form.agentId} onValueChange={handleAgentSelect}>
                    <SelectTrigger data-testid="di-agent-select"><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent side="bottom">
                      {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.port})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.agentName && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium">{form.agentName}</p>
                  {form.agentPhone && <p>Tel: {form.agentPhone}</p>}
                  {form.agentFax && <p>Fax: {form.agentFax}</p>}
                  {form.agentMobile && <p>Mobile: {form.agentMobile}</p>}
                  {form.agentEmail && <p>Email: {form.agentEmail}</p>}
                  {form.agentAddress && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{form.agentAddress}</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label>Buyer Surveyor at Load Port</Label>
                <Select value={form.surveyor} onValueChange={v => set('surveyor', v)}>
                  <SelectTrigger data-testid="di-surveyor-select"><SelectValue placeholder="Select surveyor" /></SelectTrigger>
                  <SelectContent side="bottom">
                    {surveyors.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Seller Surveyor at Load Port</Label>
                <Select value={form.sellerSurveyor} onValueChange={v => set('sellerSurveyor', v)}>
                  <SelectTrigger data-testid="di-seller-surveyor"><SelectValue placeholder={form.tradeId ? 'Select surveyor' : 'Select a contract first'} /></SelectTrigger>
                  <SelectContent side="bottom">
                    {surveyors.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Original Docs Address */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-green-700 border-b pb-1">Original Documents Address</h3>
              <Textarea value={form.originalDocsAddress} onChange={e => set('originalDocsAddress', e.target.value)} rows={3} placeholder="Full multiline address" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-di-btn">{editingId ? 'Update' : 'Create'} DI</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
