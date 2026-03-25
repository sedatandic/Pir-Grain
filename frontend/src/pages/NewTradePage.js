import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { STATUS_OPTIONS } from '../lib/constants';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { ArrowLeft, Save, Loader2, Briefcase, User, CalendarDays, Plus, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

function DatePicker({ value, onChange, ...props }) {
  const dateObj = value ? (() => { try { return new Date(value + 'T00:00:00'); } catch { return undefined; } })() : undefined;
  const displayText = dateObj && !isNaN(dateObj) ? format(dateObj, 'dd/MM/yyyy') : '';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-7 text-xs px-2', !value && 'text-muted-foreground')} {...props}>
          <CalendarDays className="mr-1.5 h-3 w-3" />
          {displayText || 'dd/mm/yyyy'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={dateObj} onSelect={(d) => { if (d) onChange(format(d, 'yyyy-MM-dd')); }} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

const DELIVERY_TERMS = ['FOB', 'CFR', 'CIF'];
const CURRENCIES = ['USD', 'EUR'];

const compactSelect = "h-7 text-xs";
const compactInput = "h-7 text-xs px-2";
const compactLabel = "text-[11px] font-medium text-muted-foreground leading-none";
const sectionTitle = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-1.5";

function ContactPicker({ label, icon: Icon, contacts, value, onChange, testId }) {
  if (!contacts || contacts.length === 0) return null;
  const selectedIdx = value !== null && value !== undefined ? String(value) : '';
  return (
    <div className="space-y-0.5">
      <Label className="text-[10px] flex items-center gap-0.5 text-muted-foreground"><Icon className="h-2.5 w-2.5" />{label}</Label>
      <Select value={selectedIdx} onValueChange={(v) => onChange(v === 'none' ? null : contacts[parseInt(v)])}>
        <SelectTrigger className="h-6 text-[11px]" data-testid={testId}><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-- None --</SelectItem>
          {contacts.map((c, i) => (
            <SelectItem key={i} value={String(i)}>{c.name}{c.email ? ` (${c.email})` : ''}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PartyContactPickers({ partyLabel, partner, tradeContact, execContact, onTradeChange, onExecChange, testPrefix }) {
  if (!partner) return null;
  const tc = partner.tradeContacts || [];
  const ec = partner.executionContacts || [];
  if (tc.length === 0 && ec.length === 0) return null;

  const tcIdx = tradeContact ? tc.findIndex(c => c.name === tradeContact.name && c.email === tradeContact.email) : -1;
  const ecIdx = execContact ? ec.findIndex(c => c.name === execContact.name && c.email === execContact.email) : -1;

  return (
    <div className="col-span-full bg-muted/20 rounded px-2 py-1 space-y-0.5 border border-dashed border-muted-foreground/20">
      <div className="text-[10px] font-medium text-muted-foreground">{partyLabel} — {partner.companyName}</div>
      <div className="grid grid-cols-2 gap-2">
        {tc.length > 0 && (
          <ContactPicker label="Trade" icon={Briefcase} contacts={tc} value={tcIdx >= 0 ? tcIdx : null} onChange={onTradeChange} testId={`${testPrefix}-trade-contact`} />
        )}
        {ec.length > 0 && (
          <ContactPicker label="Execution" icon={User} contacts={ec} value={ecIdx >= 0 ? ecIdx : null} onChange={onExecChange} testId={`${testPrefix}-exec-contact`} />
        )}
      </div>
    </div>
  );
}

export default function NewTradePage() {
  const navigate = useNavigate();
  const { tradeId } = useParams();
  const isEdit = Boolean(tradeId);
  const [saving, setSaving] = useState(false);
  const [loadingTrade, setLoadingTrade] = useState(false);
  const [partners, setPartners] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [ports, setPorts] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showExclusions, setShowExclusions] = useState(false);

  const [form, setForm] = useState({
    sellerId: '', buyerId: '', brokerId: '', coBrokerId: 'na',
    commodityId: '', originId: '', quantity: '5000', tolerance: '10', cropYear: new Date().getFullYear().toString(),
    deliveryTerm: 'CIF', pricePerMT: '', currency: 'USD',
    paymentTerms: '%100 TT Against Copy Docs.', incoterms: '', basePortId: '', loadingPortId: '', dischargePortId: '',
    shipmentWindowStart: '', shipmentWindowEnd: '', vesselName: '',
    surveyorId: '', brokeragePerMT: '1', brokerageAccount: 'seller', brokerageCurrency: 'USD', contractDate: '', contractNumber: '',
    specialConditions: '', notes: '', status: 'confirmation', commoditySpecs: '',
    thirdPartyLab: 'allowed',
    dischargeRate: '1500', demurrageRate: '',
    pirContractNumber: '', sellerContractNumber: 'N/A',
    gaftaTerm: 'GAFTA No. 48, Arbitration Clause 125, London',
    excludedDisports: [], excludedSurveyors: [],
    portVariations: [],
    sellerTradeContact: null, sellerExecutionContact: null,
    buyerTradeContact: null, buyerExecutionContact: null,
    brokerTradeContact: null, brokerExecutionContact: null,
    coBrokerTradeContact: null, coBrokerExecutionContact: null,
    executionHandledBy: 'Alena Karagoz',
    brokerName: 'Salih Karagoz',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pa, co, or, po, su, ve, us] = await Promise.all([
          api.get('/api/partners'), api.get('/api/commodities'), api.get('/api/origins'),
          api.get('/api/ports'), api.get('/api/surveyors'), api.get('/api/vessels'),
          api.get('/api/users'),
        ]);
        setPartners(pa.data); setCommodities(co.data); setOrigins(or.data);
        setPorts(po.data); setSurveyors(su.data); setVessels(ve.data);
        setAllUsers(us.data);

        if (!isEdit) {
          const russia = or.data.find(o => o.name?.toLowerCase() === 'russia');
          const samsun = po.data.find(p => p.name?.toLowerCase().includes('samsun'));
          const izmir = po.data.find(p => p.name?.toLowerCase().includes('izmir'));
          const defaultPortVariations = [];
          if (samsun) defaultPortVariations.push({ portId: samsun.id, portName: samsun.name, portCountry: samsun.country || '', difference: '-2' });
          if (izmir) defaultPortVariations.push({ portId: izmir.id, portName: izmir.name, portCountry: izmir.country || '', difference: '+3' });
          setForm(prev => ({
            ...prev,
            originId: russia ? russia.id : prev.originId,
            portVariations: defaultPortVariations,
          }));
        }

        if (isEdit) {
          setLoadingTrade(true);
          const res = await api.get(`/api/trades/${tradeId}`);
          const t = res.data;
          const convertDate = (d) => {
            if (!d) return '';
            if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
            const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (m) return `${m[3]}-${m[2]}-${m[1]}`;
            return d;
          };
          setForm({
            sellerId: t.sellerId || '',
            buyerId: t.buyerId || '',
            brokerId: t.brokerId || 'na',
            coBrokerId: t.coBrokerId || 'na',
            commodityId: t.commodityId || '',
            originId: t.originId || '',
            cropYear: t.cropYear || new Date().getFullYear().toString(),
            quantity: t.quantity != null ? String(t.quantity) : '',
            tolerance: t.tolerance || '',
            deliveryTerm: t.deliveryTerm || 'CIF',
            pricePerMT: t.pricePerMT != null ? String(t.pricePerMT) : '',
            currency: t.currency || 'USD',
            paymentTerms: t.paymentTerms || '',
            incoterms: t.incoterms || '',
            basePortId: t.basePortId || '',
            loadingPortId: t.loadingPortId || '',
            dischargePortId: t.dischargePortId || '',
            shipmentWindowStart: convertDate(t.shipmentWindowStart),
            shipmentWindowEnd: convertDate(t.shipmentWindowEnd),
            vesselName: t.vesselName || '',
            surveyorId: t.surveyorId || '',
            brokeragePerMT: t.brokeragePerMT != null ? String(t.brokeragePerMT) : '',
            brokerageAccount: t.brokerageAccount || 'seller',
            brokerageCurrency: t.brokerageCurrency || 'USD',
            contractDate: convertDate(t.contractDate),
            contractNumber: t.contractNumber || '',
            specialConditions: t.specialConditions || '',
            notes: t.notes || '',
            status: t.status || 'confirmation',
            commoditySpecs: t.commoditySpecs || (() => { const comm = co.data.find(c => c.id === t.commodityId); return comm?.specs || ''; })(),
            pirContractNumber: t.pirContractNumber || '',
            sellerContractNumber: t.sellerContractNumber || 'N/A',
            gaftaTerm: t.gaftaTerm || 'GAFTA No. 48, Arbitration Clause 125, London',
            thirdPartyLab: t.thirdPartyLab || 'not_allowed',
            excludedDisports: t.excludedDisports || [],
            excludedSurveyors: t.excludedSurveyors || [],
            dischargeRate: t.dischargeRate != null ? String(t.dischargeRate) : '',
            demurrageRate: t.demurrageRate != null ? String(t.demurrageRate) : '',
            portVariations: t.portVariations || [],
            sellerTradeContact: t.sellerTradeContact || null,
            sellerExecutionContact: t.sellerExecutionContact || null,
            buyerTradeContact: t.buyerTradeContact || null,
            buyerExecutionContact: t.buyerExecutionContact || null,
            brokerTradeContact: t.brokerTradeContact || null,
            brokerExecutionContact: t.brokerExecutionContact || null,
            coBrokerTradeContact: t.coBrokerTradeContact || null,
            coBrokerExecutionContact: t.coBrokerExecutionContact || null,
            executionHandledBy: t.executionHandledBy || '',
            brokerName: t.brokerName || 'Salih Karagoz',
          });
          setLoadingTrade(false);
          if (!t.basePortId) {
            const mp = po.data.find(p => p.name === 'CIF Marmara Ports');
            if (mp) setForm(prev => ({ ...prev, basePortId: mp.id }));
          }
        } else {
          const pirGrain = pa.data.find(p => {
            const t = Array.isArray(p.type) ? p.type : [p.type];
            return t.includes('broker') && p.companyName.toLowerCase().includes('pir');
          });
          if (pirGrain) {
            setForm(prev => ({ ...prev, brokerId: pirGrain.id }));
          }
          const marmaraPorts = po.data.find(p => p.name === 'CIF Marmara Ports');
          if (marmaraPorts) {
            setForm(prev => prev.basePortId ? prev : ({ ...prev, basePortId: marmaraPorts.id }));
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [isEdit, tradeId]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const sellers = useMemo(() => partners.filter(p => { const t = Array.isArray(p.type) ? p.type : [p.type]; return t.includes('seller'); }), [partners]);
  const buyers = useMemo(() => partners.filter(p => { const t = Array.isArray(p.type) ? p.type : [p.type]; return t.includes('buyer'); }), [partners]);
  const coBrokers = useMemo(() => partners.filter(p => { const t = Array.isArray(p.type) ? p.type : [p.type]; return t.includes('co-broker'); }), [partners]);
  const dischPorts = useMemo(() => ports.filter(p => p.type === 'discharge'), [ports]);
  const loadPorts = useMemo(() => ports.filter(p => p.type === 'loading'), [ports]);

  const selectedCommodity = useMemo(() => commodities.find(c => c.id === form.commodityId), [commodities, form.commodityId]);
  const sellerPartner = useMemo(() => partners.find(p => p.id === form.sellerId), [partners, form.sellerId]);
  const buyerPartner = useMemo(() => partners.find(p => p.id === form.buyerId), [partners, form.buyerId]);
  const brokerPartner = useMemo(() => form.brokerId && form.brokerId !== 'na' ? partners.find(p => p.id === form.brokerId) : null, [partners, form.brokerId]);
  const coBrokerPartner = useMemo(() => form.coBrokerId && form.coBrokerId !== 'na' ? partners.find(p => p.id === form.coBrokerId) : null, [partners, form.coBrokerId]);

  const handleSellerChange = (v) => {
    setForm(prev => ({ ...prev, sellerId: v, sellerTradeContact: null, sellerExecutionContact: null }));
  };
  const handleBuyerChange = (v) => {
    setForm(prev => ({ ...prev, buyerId: v, buyerTradeContact: null, buyerExecutionContact: null }));
  };
  const handleBrokerChange = (v) => {
    setForm(prev => ({ ...prev, brokerId: v, brokerTradeContact: null, brokerExecutionContact: null }));
  };
  const handleCoBrokerChange = (v) => {
    setForm(prev => ({ ...prev, coBrokerId: v, coBrokerTradeContact: null, coBrokerExecutionContact: null }));
  };

  const handleSave = async () => {
    if (!form.sellerId || !form.buyerId || !form.commodityId) {
      toast.error('Seller, Buyer, and Commodity are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        contractNumber: form.pirContractNumber || '',
        sellerContractNumber: form.sellerContractNumber || 'N/A',
        brokerId: form.brokerId === 'na' ? '' : form.brokerId,
        coBrokerId: form.coBrokerId === 'na' ? '' : form.coBrokerId,
        loadingPortId: form.loadingPortId || '',
        quantity: form.quantity ? parseFloat(form.quantity) : 0,
        pricePerMT: form.pricePerMT ? parseFloat(form.pricePerMT) : 0,
        brokeragePerMT: form.brokeragePerMT ? parseFloat(form.brokeragePerMT) : 0,
        dischargeRate: form.dischargeRate ? parseFloat(form.dischargeRate) : 0,
        demurrageRate: form.demurrageRate ? parseFloat(form.demurrageRate) : 0,
        portVariations: form.portVariations.filter(pv => pv.portId).map(pv => ({
          portId: pv.portId,
          portName: pv.portName || '',
          portCountry: pv.portCountry || '',
          difference: pv.difference ? parseFloat(pv.difference) : 0,
        })),
      };
      if (isEdit) {
        await api.put(`/api/trades/${tradeId}`, data);
        toast.success('Trade updated');
      } else {
        await api.post('/api/trades', data);
        toast.success('Trade created');
      }
      navigate('/trades');
    } catch (err) {
      toast.error(isEdit ? 'Failed to update trade' : 'Failed to create trade');
    } finally {
      setSaving(false);
    }
  };

  if (loadingTrade) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-2 max-w-[1100px]" data-testid="compact-new-trade-form">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate('/trades')}>
            <ArrowLeft className="h-3 w-3 mr-1" />Back
          </Button>
          <h1 className="text-lg font-bold" data-testid="new-trade-title">{isEdit ? 'Edit Contract' : 'New Contract'}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('/trades')}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving} data-testid="save-trade-button">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>

      {/* CONTRACT DETAILS */}
      <div>
        <div className={sectionTitle}>Contract Details</div>
        <div className="grid grid-cols-4 gap-x-3 gap-y-1">
          <div>
            <Label className={compactLabel}>Contract Date</Label>
            <DatePicker value={form.contractDate} onChange={(v) => set('contractDate', v)} />
          </div>
          <div>
            <Label className={compactLabel}>Pir Grain Ref. No</Label>
            <Input className={compactInput} value={form.pirContractNumber} onChange={(e) => set('pirContractNumber', e.target.value)} placeholder="Auto-generated" />
          </div>
          <div>
            <Label className={compactLabel}>Seller Contract No</Label>
            <Input className={compactInput} value={form.sellerContractNumber} onChange={(e) => set('sellerContractNumber', e.target.value)} placeholder="N/A" />
          </div>
          <div>
            <Label className={compactLabel}>Execution Handled By</Label>
            <Select value={form.executionHandledBy} onValueChange={(v) => set('executionHandledBy', v)}>
              <SelectTrigger className={compactSelect} data-testid="execution-handled-by-select"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alena Karagoz">Alena Karagoz</SelectItem>
                <SelectItem value="Melisa Karagoz">Melisa Karagoz</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* CONTRACT PARTIES */}
      <div>
        <div className={sectionTitle}>Parties</div>
        <div className="grid grid-cols-5 gap-x-3 gap-y-1">
          <div>
            <Label className={compactLabel}>Seller *</Label>
            <Select value={form.sellerId} onValueChange={handleSellerChange}>
              <SelectTrigger className={compactSelect} data-testid="trade-seller-select"><SelectValue placeholder="Select seller" /></SelectTrigger>
              <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className={compactLabel}>Buyer *</Label>
            <Select value={form.buyerId} onValueChange={handleBuyerChange}>
              <SelectTrigger className={compactSelect} data-testid="trade-buyer-select"><SelectValue placeholder="Select buyer" /></SelectTrigger>
              <SelectContent>{buyers.map(b => <SelectItem key={b.id} value={b.id}>{b.companyName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className={compactLabel}>Broker</Label>
            <Select value={form.brokerId} onValueChange={handleBrokerChange}>
              <SelectTrigger className={compactSelect}><SelectValue placeholder="Select broker" /></SelectTrigger>
              <SelectContent>
                {partners.filter(p => { const t = Array.isArray(p.type) ? p.type : [p.type]; return t.includes('broker'); }).map(b => <SelectItem key={b.id} value={b.id}>{b.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={compactLabel}>Broker Name</Label>
            <Select value={form.brokerName || 'Salih Karagoz'} onValueChange={(v) => set('brokerName', v)}>
              <SelectTrigger className={compactSelect} data-testid="broker-name-select"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {allUsers.filter(u => u.username !== 'pir.accounts').map(u => <SelectItem key={u.username} value={u.name}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={compactLabel}>Co-Broker</Label>
            <Select value={form.coBrokerId} onValueChange={handleCoBrokerChange}>
              <SelectTrigger className={compactSelect}><SelectValue placeholder="N/A" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="na">N/A</SelectItem>
                {coBrokers.map(b => <SelectItem key={b.id} value={b.id}>{b.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <PartyContactPickers partyLabel="Seller" partner={sellerPartner} tradeContact={form.sellerTradeContact} execContact={form.sellerExecutionContact} onTradeChange={(c) => set('sellerTradeContact', c)} onExecChange={(c) => set('sellerExecutionContact', c)} testPrefix="seller" />
          <PartyContactPickers partyLabel="Buyer" partner={buyerPartner} tradeContact={form.buyerTradeContact} execContact={form.buyerExecutionContact} onTradeChange={(c) => set('buyerTradeContact', c)} onExecChange={(c) => set('buyerExecutionContact', c)} testPrefix="buyer" />
          <PartyContactPickers partyLabel="Broker" partner={brokerPartner} tradeContact={form.brokerTradeContact} execContact={form.brokerExecutionContact} onTradeChange={(c) => set('brokerTradeContact', c)} onExecChange={(c) => set('brokerExecutionContact', c)} testPrefix="broker" />
          <PartyContactPickers partyLabel="Co-Broker" partner={coBrokerPartner} tradeContact={form.coBrokerTradeContact} execContact={form.coBrokerExecutionContact} onTradeChange={(c) => set('coBrokerTradeContact', c)} onExecChange={(c) => set('coBrokerExecutionContact', c)} testPrefix="co-broker" />
        </div>
      </div>

      {/* COMMODITY */}
      <div>
        <div className={sectionTitle}>Commodity</div>
        <div className="grid grid-cols-5 gap-x-3 gap-y-1">
          <div>
            <Label className={compactLabel}>Commodity *</Label>
            <Select value={form.commodityId} onValueChange={(v) => {
              set('commodityId', v);
              const comm = commodities.find(c => c.id === v);
              set('commoditySpecs', comm?.specs || '');
            }}>
              <SelectTrigger className={compactSelect}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{commodities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className={compactLabel}>Origin</Label>
            <Select value={form.originId} onValueChange={(v) => set('originId', v)}>
              <SelectTrigger className={compactSelect}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{origins.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className={compactLabel}>Crop Year</Label>
            <Select value={form.cropYear} onValueChange={(v) => set('cropYear', v)}>
              <SelectTrigger className={compactSelect} data-testid="crop-year-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(new Date().getFullYear())}>{new Date().getFullYear()}</SelectItem>
                <SelectItem value={String(new Date().getFullYear() - 1)}>{new Date().getFullYear() - 1}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={compactLabel}>Quantity (MT)</Label>
            <Input className={compactInput} type="text" value={form.quantity ? Number(form.quantity).toLocaleString('en-US') : ''} onChange={(e) => { const qty = e.target.value.replace(/,/g, ''); set('quantity', qty); const n = parseInt(qty); if (n === 3000) set('dischargeRate', '1000'); else if (n === 5000) set('dischargeRate', '1500'); }} placeholder="0" />
          </div>
          <div>
            <Label className={compactLabel}>Tolerance (%)</Label>
            <Input className={compactInput} value={form.tolerance} onChange={(e) => set('tolerance', e.target.value)} placeholder="e.g. 5" />
          </div>
        </div>
        <div className="mt-1">
          <Label className={compactLabel}>Commodity Specs</Label>
          <Textarea value={form.commoditySpecs} onChange={(e) => set('commoditySpecs', e.target.value)} rows={2} className="font-mono text-[11px] min-h-0 py-1 px-2 resize-y" placeholder="Enter commodity specifications" />
        </div>
      </div>

      {/* PRICING & TERMS */}
      <div>
        <div className={sectionTitle}>Pricing & Terms</div>
        <div className="grid grid-cols-7 gap-x-3 gap-y-1">
          <div>
            <Label className={compactLabel}>Price / MT</Label>
            <Input className={compactInput} type="number" value={form.pricePerMT} onChange={(e) => set('pricePerMT', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label className={compactLabel}>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
              <SelectTrigger className={compactSelect}><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className={compactLabel}>Delivery Term</Label>
            <Select value={form.deliveryTerm} onValueChange={(v) => set('deliveryTerm', v)}>
              <SelectTrigger className={compactSelect}><SelectValue /></SelectTrigger>
              <SelectContent>{DELIVERY_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className={compactLabel}>Payment Terms</Label>
            <Input className={compactInput} value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} placeholder="e.g. LC at sight" />
          </div>
          <div>
            <Label className={compactLabel}>Brokerage / MT</Label>
            <Input className={compactInput} type="number" value={form.brokeragePerMT} onChange={(e) => set('brokeragePerMT', e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label className={compactLabel}>Brok. Payment</Label>
            <Select value={form.brokerageAccount} onValueChange={(v) => set('brokerageAccount', v)}>
              <SelectTrigger className={compactSelect}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="seller">Seller Acct</SelectItem>
                <SelectItem value="buyer">Buyer Acct</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* SHIPPING */}
      <div>
        <div className={sectionTitle}>Shipping</div>
        <div className="grid grid-cols-5 gap-x-3 gap-y-1">
          <div>
            <Label className={compactLabel}>Base Port</Label>
            <Select value={form.basePortId} onValueChange={(v) => set('basePortId', v)}>
              <SelectTrigger className={compactSelect}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{dischPorts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.country ? `, ${p.country}` : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className={compactLabel}>Shipment From</Label>
            <DatePicker value={form.shipmentWindowStart} onChange={(v) => set('shipmentWindowStart', v)} />
          </div>
          <div>
            <Label className={compactLabel}>Shipment To</Label>
            <DatePicker value={form.shipmentWindowEnd} onChange={(v) => set('shipmentWindowEnd', v)} />
          </div>
          <div>
            <Label className={compactLabel}>Discharge Rate (MT/Day)</Label>
            <Input className={compactInput} type="number" value={form.dischargeRate || ''} onChange={(e) => set('dischargeRate', e.target.value)} placeholder="1500" />
          </div>
          <div>
            <Label className={compactLabel}>Demurrage (USD/Day)</Label>
            <Input className={compactInput} type="number" value={form.demurrageRate || ''} onChange={(e) => set('demurrageRate', e.target.value)} placeholder="15000" />
          </div>
        </div>

        {/* Port Variations */}
        <div className="mt-1.5">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[11px] font-medium text-muted-foreground">Port Options (+/- per MT)</Label>
            <Button type="button" variant="outline" size="sm" className="h-5 text-[10px] px-2" onClick={() => set('portVariations', [...form.portVariations, { portId: '', difference: '' }])}>
              <Plus className="h-2.5 w-2.5 mr-0.5" />Add
            </Button>
          </div>
          {form.portVariations.map((pv, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-1">
              <div className="flex-1">
                <Select value={pv.portId} onValueChange={(v) => {
                  const updated = [...form.portVariations];
                  const port = dischPorts.find(p => p.id === v);
                  updated[idx] = { ...updated[idx], portId: v, portName: port?.name || '', portCountry: port?.country || '' };
                  set('portVariations', updated);
                }}>
                  <SelectTrigger className="h-6 text-[11px]"><SelectValue placeholder="Select port" /></SelectTrigger>
                  <SelectContent>{dischPorts.filter(p => p.id !== form.basePortId).map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.country ? `, ${p.country}` : ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input className="h-6 text-[11px] w-20 px-1.5" type="text" value={pv.difference} placeholder="+/- MT" onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.+-]/g, '');
                const updated = [...form.portVariations];
                updated[idx] = { ...updated[idx], difference: val };
                set('portVariations', updated);
              }} />
              <span className="text-[11px] font-mono w-16 text-center">
                {form.pricePerMT && pv.difference !== '' ? `${(parseFloat(form.pricePerMT) + parseFloat(pv.difference || 0)).toLocaleString()}` : '-'}
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => set('portVariations', form.portVariations.filter((_, i) => i !== idx))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Excluded - Collapsible */}
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-1"
          onClick={() => setShowExclusions(!showExclusions)}
          data-testid="toggle-exclusions"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", !showExclusions && "-rotate-90")} />
          Excluded Disports ({form.excludedDisports.length}) & Surveyors ({form.excludedSurveyors.length})
        </button>
        {showExclusions && (
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="border rounded p-2 max-h-[120px] overflow-y-auto">
              <div className="text-[10px] font-semibold text-muted-foreground mb-1">Disports</div>
              {dischPorts.filter(p => p.id !== form.basePortId).map(p => (
                <label key={p.id} className="flex items-center gap-1.5 py-0.5 text-[11px] cursor-pointer hover:bg-muted/50 rounded px-1">
                  <input type="checkbox" className="rounded border-input h-3 w-3" checked={form.excludedDisports.includes(p.id)} onChange={(e) => {
                    if (e.target.checked) set('excludedDisports', [...form.excludedDisports, p.id]);
                    else set('excludedDisports', form.excludedDisports.filter(id => id !== p.id));
                  }} />
                  {p.name}{p.country ? `, ${p.country}` : ''}
                </label>
              ))}
            </div>
            <div className="border rounded p-2 max-h-[120px] overflow-y-auto">
              <div className="text-[10px] font-semibold text-muted-foreground mb-1">Surveyors</div>
              {surveyors.map(s => (
                <label key={s.id} className="flex items-center gap-1.5 py-0.5 text-[11px] cursor-pointer hover:bg-muted/50 rounded px-1">
                  <input type="checkbox" className="rounded border-input h-3 w-3" checked={form.excludedSurveyors.includes(s.id)} onChange={(e) => {
                    if (e.target.checked) set('excludedSurveyors', [...form.excludedSurveyors, s.id]);
                    else set('excludedSurveyors', form.excludedSurveyors.filter(id => id !== s.id));
                  }} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ADDITIONAL */}
      <div>
        <div className={sectionTitle}>Additional</div>
        <div className="grid grid-cols-5 gap-x-3 gap-y-1">
          <div className="col-span-2">
            <Label className={compactLabel}>GAFTA Term</Label>
            <Input className={compactInput} value={form.gaftaTerm} onChange={(e) => set('gaftaTerm', e.target.value)} data-testid="gafta-term-input" />
          </div>
          <div>
            <Label className={compactLabel}>3rd Party Lab</Label>
            <Select value={form.thirdPartyLab} onValueChange={(v) => set('thirdPartyLab', v)}>
              <SelectTrigger className={compactSelect} data-testid="third-party-lab-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="allowed">Allowed</SelectItem>
                <SelectItem value="not_allowed">Not Allowed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className={compactLabel}>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional notes..." rows={2} className="text-[11px] min-h-0 py-1 px-2 resize-y" />
          </div>
        </div>
      </div>
    </div>
  );
}
