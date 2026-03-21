import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { STATUS_OPTIONS } from '../lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Save, Loader2, Briefcase, User } from 'lucide-react';
import { toast } from 'sonner';

const DELIVERY_TERMS = ['FOB', 'CFR', 'CIF', 'FAS', 'CIP', 'DAP', 'DPU', 'DDP'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY'];

function ContactPicker({ label, icon: Icon, contacts, value, onChange, testId }) {
  if (!contacts || contacts.length === 0) return null;
  const selectedIdx = value !== null && value !== undefined ? String(value) : '';
  return (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1 text-muted-foreground"><Icon className="h-3 w-3" />{label}</Label>
      <Select value={selectedIdx} onValueChange={(v) => onChange(v === 'none' ? null : contacts[parseInt(v)])}>
        <SelectTrigger className="h-8 text-sm" data-testid={testId}><SelectValue placeholder="Select contact" /></SelectTrigger>
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
    <div className="col-span-4 bg-muted/30 rounded-lg p-3 space-y-2 border border-dashed">
      <div className="text-xs font-medium text-muted-foreground">{partyLabel} Contacts — {partner.companyName}</div>
      <div className="grid grid-cols-2 gap-3">
        {tc.length > 0 && (
          <ContactPicker
            label="Trade Contact" icon={Briefcase} contacts={tc}
            value={tcIdx >= 0 ? tcIdx : null} onChange={onTradeChange}
            testId={`${testPrefix}-trade-contact`}
          />
        )}
        {ec.length > 0 && (
          <ContactPicker
            label="Execution Contact" icon={User} contacts={ec}
            value={ecIdx >= 0 ? ecIdx : null} onChange={onExecChange}
            testId={`${testPrefix}-exec-contact`}
          />
        )}
      </div>
    </div>
  );
}

export default function NewTradePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [ports, setPorts] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [vessels, setVessels] = useState([]);

  const [form, setForm] = useState({
    sellerId: '', buyerId: '', brokerId: '', coBrokerId: 'na',
    commodityId: '', originId: '', quantity: '', tolerance: '',
    deliveryTerm: '', pricePerMT: '', currency: 'USD',
    paymentTerms: '', incoterms: '', loadingPortId: '', dischargePortId: '',
    shipmentWindowStart: '', shipmentWindowEnd: '', vesselName: '',
    surveyorId: '', brokeragePerMT: '', contractDate: '', contractNumber: '',
    specialConditions: '', notes: '', status: 'confirmation',
    sellerTradeContact: null, sellerExecutionContact: null,
    buyerTradeContact: null, buyerExecutionContact: null,
    brokerTradeContact: null, brokerExecutionContact: null,
    coBrokerTradeContact: null, coBrokerExecutionContact: null,
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pa, co, or, po, su, ve] = await Promise.all([
          api.get('/api/partners'), api.get('/api/commodities'), api.get('/api/origins'),
          api.get('/api/ports'), api.get('/api/surveyors'), api.get('/api/vessels'),
        ]);
        setPartners(pa.data); setCommodities(co.data); setOrigins(or.data);
        setPorts(po.data); setSurveyors(su.data); setVessels(ve.data);

        // Auto-select Pir Grain as default Broker
        const pirGrain = pa.data.find(p => {
          const t = Array.isArray(p.type) ? p.type : [p.type];
          return t.includes('broker') && p.companyName.toLowerCase().includes('pir');
        });
        if (pirGrain) {
          setForm(prev => ({ ...prev, brokerId: pirGrain.id }));
        }
      } catch (err) { console.error(err); }
    };
    fetch();
  }, []);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const sellers = useMemo(() => partners.filter(p => { const t = Array.isArray(p.type) ? p.type : [p.type]; return t.includes('seller'); }), [partners]);
  const buyers = useMemo(() => partners.filter(p => { const t = Array.isArray(p.type) ? p.type : [p.type]; return t.includes('buyer'); }), [partners]);
  const coBrokers = useMemo(() => partners.filter(p => { const t = Array.isArray(p.type) ? p.type : [p.type]; return t.includes('co-broker'); }), [partners]);
  const loadPorts = useMemo(() => ports.filter(p => p.type === 'loading'), [ports]);
  const dischPorts = useMemo(() => ports.filter(p => p.type === 'discharge'), [ports]);

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
        brokerId: form.brokerId === 'na' ? '' : form.brokerId,
        coBrokerId: form.coBrokerId === 'na' ? '' : form.coBrokerId,
        quantity: form.quantity ? parseFloat(form.quantity) : 0,
        pricePerMT: form.pricePerMT ? parseFloat(form.pricePerMT) : 0,
        brokeragePerMT: form.brokeragePerMT ? parseFloat(form.brokeragePerMT) : 0,
      };
      await api.post('/api/trades', data);
      toast.success('Trade created');
      navigate('/trades');
    } catch (err) {
      toast.error('Failed to create trade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/trades')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Trade</h1>
          <p className="text-muted-foreground">Create a new commodity trade</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Trade Parties</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Seller *</Label>
            <Select value={form.sellerId} onValueChange={handleSellerChange}>
              <SelectTrigger data-testid="trade-seller-select"><SelectValue placeholder="Select seller" /></SelectTrigger>
              <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.companyName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Buyer *</Label>
            <Select value={form.buyerId} onValueChange={handleBuyerChange}>
              <SelectTrigger data-testid="trade-buyer-select"><SelectValue placeholder="Select buyer" /></SelectTrigger>
              <SelectContent>{buyers.map(b => <SelectItem key={b.id} value={b.id}>{b.companyName}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Seller Contacts */}
          <PartyContactPickers
            partyLabel="Seller" partner={sellerPartner}
            tradeContact={form.sellerTradeContact} execContact={form.sellerExecutionContact}
            onTradeChange={(c) => set('sellerTradeContact', c)} onExecChange={(c) => set('sellerExecutionContact', c)}
            testPrefix="seller"
          />

          {/* Buyer Contacts */}
          <PartyContactPickers
            partyLabel="Buyer" partner={buyerPartner}
            tradeContact={form.buyerTradeContact} execContact={form.buyerExecutionContact}
            onTradeChange={(c) => set('buyerTradeContact', c)} onExecChange={(c) => set('buyerExecutionContact', c)}
            testPrefix="buyer"
          />

          <div className="space-y-2">
            <Label>Broker</Label>
            <Select value={form.brokerId} onValueChange={handleBrokerChange}>
              <SelectTrigger><SelectValue placeholder="Select broker" /></SelectTrigger>
              <SelectContent>
                {partners.filter(p => { const t = Array.isArray(p.type) ? p.type : [p.type]; return t.includes('broker'); }).map(b => <SelectItem key={b.id} value={b.id}>{b.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Co-Broker</Label>
            <Select value={form.coBrokerId} onValueChange={handleCoBrokerChange}>
              <SelectTrigger><SelectValue placeholder="Select co-broker" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="na">N/A</SelectItem>
                {coBrokers.map(b => <SelectItem key={b.id} value={b.id}>{b.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Broker Contacts */}
          <PartyContactPickers
            partyLabel="Broker" partner={brokerPartner}
            tradeContact={form.brokerTradeContact} execContact={form.brokerExecutionContact}
            onTradeChange={(c) => set('brokerTradeContact', c)} onExecChange={(c) => set('brokerExecutionContact', c)}
            testPrefix="broker"
          />

          {/* Co-Broker Contacts */}
          <PartyContactPickers
            partyLabel="Co-Broker" partner={coBrokerPartner}
            tradeContact={form.coBrokerTradeContact} execContact={form.coBrokerExecutionContact}
            onTradeChange={(c) => set('coBrokerTradeContact', c)} onExecChange={(c) => set('coBrokerExecutionContact', c)}
            testPrefix="co-broker"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Commodity Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Commodity *</Label>
            <Select value={form.commodityId} onValueChange={(v) => set('commodityId', v)}>
              <SelectTrigger><SelectValue placeholder="Select commodity" /></SelectTrigger>
              <SelectContent>{commodities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Origin</Label>
            <Select value={form.originId} onValueChange={(v) => set('originId', v)}>
              <SelectTrigger><SelectValue placeholder="Select origin" /></SelectTrigger>
              <SelectContent>{origins.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity (MT)</Label>
            <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Tolerance (%)</Label>
            <Input value={form.tolerance} onChange={(e) => set('tolerance', e.target.value)} placeholder="e.g. 5" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pricing & Terms</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Price per MT</Label>
            <Input type="number" value={form.pricePerMT} onChange={(e) => set('pricePerMT', e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Delivery Term</Label>
            <Select value={form.deliveryTerm} onValueChange={(v) => set('deliveryTerm', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{DELIVERY_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Input value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} placeholder="e.g. LC at sight" />
          </div>
          <div className="space-y-2">
            <Label>Brokerage (per MT)</Label>
            <Input type="number" value={form.brokeragePerMT} onChange={(e) => set('brokeragePerMT', e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Contract Date</Label>
            <Input type="date" value={form.contractDate} onChange={(e) => set('contractDate', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Shipping</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Loading Port</Label>
            <Select value={form.loadingPortId} onValueChange={(v) => set('loadingPortId', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{loadPorts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Discharge Port</Label>
            <Select value={form.dischargePortId} onValueChange={(v) => set('dischargePortId', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{dischPorts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Shipment Window Start</Label>
            <Input type="date" value={form.shipmentWindowStart} onChange={(e) => set('shipmentWindowStart', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Shipment Window End</Label>
            <Input type="date" value={form.shipmentWindowEnd} onChange={(e) => set('shipmentWindowEnd', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vessel Name</Label>
            <Input value={form.vesselName} onChange={(e) => set('vesselName', e.target.value)} placeholder="e.g. MV GRAIN STAR" />
          </div>
          <div className="space-y-2">
            <Label>Surveyor</Label>
            <Select value={form.surveyorId} onValueChange={(v) => set('surveyorId', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{surveyors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Additional Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate('/trades')}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving} data-testid="save-trade-button">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Create Trade
        </Button>
      </div>
    </div>
  );
}
