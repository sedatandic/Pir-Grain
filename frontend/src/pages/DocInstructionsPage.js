import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Copy, Printer, FileText } from 'lucide-react';
import { toast } from 'sonner';

const BUYER_DETAILS = `E.R. YEM GIDA TARIM URUNLERI SAN. VE TIC. LTD. STI.
EMMIOGLU MAH. FAKULTE CAD. NO:29 ODEMIS / IZMIR - TURKEY`;

const DEFAULT_FORM = {
  dischargePort: '',
  agentName: '',
  agentPhone: '',
  agentFax: '',
  agentMobile: '',
  agentEmail: '',
  agentWeb: '',
  surveyor: '',
  originalDocsAddress: '',
  consigneeOption: 'to_order',
  consigneeCustom: '',
  notifyOption: 'buyer_details',
  notifyCustom: '',
};

export default function DocInstructionsPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const previewRef = useRef(null);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const getConsignee = () => {
    if (form.consigneeOption === 'to_order') return 'TO ORDER';
    if (form.consigneeOption === 'buyer_details') return BUYER_DETAILS;
    return form.consigneeCustom || '—';
  };

  const getNotify = () => {
    if (form.notifyOption === 'buyer_details') return BUYER_DETAILS;
    return form.notifyCustom || '—';
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
      h2 { text-align: center; margin-bottom: 20px; color: #15803d; }
      h3 { margin-top: 24px; margin-bottom: 8px; color: #15803d; border-bottom: 2px solid #15803d; padding-bottom: 4px; }
      .doc-num { font-weight: 600; }
      .section-note { font-size: 12px; color: #666; font-style: italic; }
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  const consigneeText = getConsignee();
  const notifyText = getNotify();

  return (
    <div className="space-y-6" data-testid="doc-instructions-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Documentary Instructions</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Input Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Shipment & Port */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-green-700 border-b pb-1">Shipment & Port Details</h3>
              <div className="space-y-2">
                <Label>Discharge Port</Label>
                <Input value={form.dischargePort} onChange={e => set('dischargePort', e.target.value)} placeholder="e.g. Izmir, Turkey" data-testid="input-discharge-port" />
              </div>
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input value={form.agentName} onChange={e => set('agentName', e.target.value)} placeholder="e.g. ABC Shipping Agency" data-testid="input-agent-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Agent Phone</Label>
                  <Input value={form.agentPhone} onChange={e => set('agentPhone', e.target.value)} placeholder="+90 xxx xxx xx xx" />
                </div>
                <div className="space-y-2">
                  <Label>Agent Fax</Label>
                  <Input value={form.agentFax} onChange={e => set('agentFax', e.target.value)} placeholder="+90 xxx xxx xx xx" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Agent Mobile</Label>
                  <Input value={form.agentMobile} onChange={e => set('agentMobile', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Agent Email</Label>
                  <Input value={form.agentEmail} onChange={e => set('agentEmail', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Agent Website</Label>
                <Input value={form.agentWeb} onChange={e => set('agentWeb', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Surveyor</Label>
                <Input value={form.surveyor} onChange={e => set('surveyor', e.target.value)} placeholder="e.g. SGS, Intertek" data-testid="input-surveyor" />
              </div>
            </div>

            {/* Original Docs Address */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-green-700 border-b pb-1">Original Documents Address</h3>
              <Textarea value={form.originalDocsAddress} onChange={e => set('originalDocsAddress', e.target.value)} rows={4} placeholder="Full multiline address for original documents" data-testid="input-docs-address" />
            </div>

            {/* Consignee / Notify */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-green-700 border-b pb-1">Consignee & Notify Party</h3>
              <div className="space-y-2">
                <Label>Consignee</Label>
                <Select value={form.consigneeOption} onValueChange={v => set('consigneeOption', v)}>
                  <SelectTrigger data-testid="select-consignee"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to_order">TO ORDER</SelectItem>
                    <SelectItem value="buyer_details">Buyer Details</SelectItem>
                    <SelectItem value="other">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                {form.consigneeOption === 'other' && (
                  <Textarea value={form.consigneeCustom} onChange={e => set('consigneeCustom', e.target.value)} rows={2} placeholder="Enter custom consignee" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Notify Party</Label>
                <Select value={form.notifyOption} onValueChange={v => set('notifyOption', v)}>
                  <SelectTrigger data-testid="select-notify"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer_details">Buyer Details</SelectItem>
                    <SelectItem value="other">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                {form.notifyOption === 'other' && (
                  <Textarea value={form.notifyCustom} onChange={e => set('notifyCustom', e.target.value)} rows={2} placeholder="Enter custom notify party" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-700">Preview</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} data-testid="copy-doc-btn">
                  <Copy className="h-4 w-4 mr-1" />Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} data-testid="print-doc-btn">
                  <Printer className="h-4 w-4 mr-1" />Print
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={previewRef} className="text-sm leading-relaxed space-y-4">
              <h2 style={{ textAlign: 'center', fontWeight: 700, fontSize: '16px', color: '#15803d', marginBottom: '16px' }}>
                DOCUMENTARY INSTRUCTIONS TO SELLER
              </h2>

              {/* Section 1 */}
              <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#15803d', borderBottom: '2px solid #15803d', paddingBottom: '4px' }}>1. Shipment & Port Details</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <tbody>
                  {[
                    ['Discharge Port', form.dischargePort || '—'],
                    ['Agent at Discharge Port', form.agentName || '—'],
                    ['Agent Contacts', `Tel: ${form.agentPhone || '—'}  •  Fax: ${form.agentFax || '—'}  •  Mob: ${form.agentMobile || '—'}`],
                    ['Agent Email / Web', `${form.agentEmail || '—'}  •  ${form.agentWeb || '—'}`],
                    ['Surveyor', form.surveyor || '—'],
                  ].map(([label, val], i) => (
                    <tr key={i}>
                      <th style={{ border: '1px solid #d1d5db', padding: '6px 10px', background: '#f3f4f6', fontWeight: 600, width: '180px', textAlign: 'left', verticalAlign: 'top' }}>{label}</th>
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 10px', whiteSpace: 'pre-wrap' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Section 2 */}
              <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#15803d', borderBottom: '2px solid #15803d', paddingBottom: '4px' }}>2. Address for Original Documents</h3>
              <div style={{ border: '1px solid #d1d5db', padding: '10px', background: '#f9fafb', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
                {form.originalDocsAddress || '—'}
              </div>

              {/* Section 3 */}
              <h3 style={{ fontWeight: 700, fontSize: '14px', color: '#15803d', borderBottom: '2px solid #15803d', paddingBottom: '4px' }}>3. Required Documents</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #d1d5db', padding: '6px 10px', background: '#f3f4f6', fontWeight: 600, width: '36px', textAlign: 'center' }}>#</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '6px 10px', background: '#f3f4f6', fontWeight: 600, textAlign: 'left' }}>Document</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '6px 10px', background: '#f3f4f6', fontWeight: 600, textAlign: 'left' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { num: 1, doc: 'Signed Commercial Invoice (Original)', details: `Consignee: ${consigneeText}` },
                    { num: 2, doc: '3/3 Original B/L – "Clean on Board", "Freight Prepaid"', details: `Consignee: ${consigneeText}\nNotify: ${notifyText}` },
                    { num: 3, doc: 'Certificate of Origin (Original + 2 Copies)', details: `Consignee: ${consigneeText}\nNotify: ${notifyText}` },
                    { num: 4, doc: 'Phytosanitary Certificate (Original + 2 Copies)', details: `Consignee: ${consigneeText}` },
                    { num: 5, doc: 'Non-Radiation Certificate (CS134 & CS137 < 370 Bq/Kg)', details: `Consignee: ${consigneeText}\nNotify: ${notifyText}` },
                    { num: 6, doc: 'Fumigation Certificate (Original, if any)', details: `Consignee: ${consigneeText}\nNotify: ${notifyText}` },
                    { num: 7, doc: 'Quality Certificate (GAFTA Approved Surveyor)', details: `Consignee: ${consigneeText}\nNotify: ${notifyText}` },
                    { num: 8, doc: 'Weight Certificate (GAFTA Approved Surveyor)', details: `Consignee: ${consigneeText}\nNotify: ${notifyText}` },
                    { num: 9, doc: 'Holds Cleanliness Certificate (GAFTA Approved Surveyor)', details: `Consignee: ${consigneeText}\nNotify: ${notifyText}` },
                    { num: 10, doc: 'Holds Sealing Certificate (GAFTA Approved Surveyor)', details: `Consignee: ${consigneeText}\nNotify: ${notifyText}` },
                    { num: 11, doc: 'Insurance Certificate (GAFTA – 102% of value)', details: `Assured: ${consigneeText}` },
                    { num: 12, doc: "Master's Receipt", details: 'Confirming dispatch of 1 Original Phytosanitary Certificate + 1 Non-Negotiable B/L Copy' },
                    { num: 13, doc: 'Non-Dioxin Analysis + GAFTA Non-Dioxin Certificate', details: `Include all PCB and Dioxin parameters as per specification.\nConsignee: ${consigneeText}\nNotify: ${notifyText}` },
                  ].map(({ num, doc, details }) => (
                    <tr key={num}>
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 10px', textAlign: 'center', fontWeight: 600, verticalAlign: 'top' }}>{num}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 10px', fontWeight: 500, verticalAlign: 'top' }}>{doc}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 10px', whiteSpace: 'pre-wrap', verticalAlign: 'top', fontSize: '12px' }}>{details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
