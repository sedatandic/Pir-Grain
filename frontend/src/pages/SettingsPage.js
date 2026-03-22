import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Trash2, Pencil, Loader2, Settings, Users, Map, Anchor, Wheat, Globe, ChevronRight, Ship, KeyRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('commodities');
  const [commodities, setCommodities] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [ports, setPorts] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [users, setUsers] = useState([]);
  const [disportAgents, setDisportAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [pwdUserId, setPwdUserId] = useState(null);
  const [pwdUserName, setPwdUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [newDocInput, setNewDocInput] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [co, or, po, su, us, da] = await Promise.all([
        api.get('/api/commodities'), api.get('/api/origins'), api.get('/api/ports'), api.get('/api/surveyors'), api.get('/api/users'), api.get('/api/disport-agents'),
      ]);
      setCommodities(co.data); setOrigins(or.data); setPorts(po.data); setSurveyors(su.data); setUsers(us.data); setDisportAgents(da.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Generic CRUD dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // commodities, origins, ports, surveyors, users
  const [dialogForm, setDialogForm] = useState({});
  const [saving, setSaving] = useState(false);

  const openAdd = (type, defaults = {}) => { setDialogType(type); setDialogForm(defaults); setDialogOpen(true); };

  const toTitleCase = (str) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

  const handleSave = async () => {
    setSaving(true);
    try {
      const editId = dialogForm._editId;
      const formData = { ...dialogForm };
      delete formData._editId;
      // Apply Title Case for disport-agents name field
      if (dialogType === 'disport-agents' && formData.name) {
        formData.name = toTitleCase(formData.name);
      }
      const endpoint = `/api/${dialogType}`;
      if (editId) {
        await api.put(`${endpoint}/${editId}`, formData);
        toast.success('Updated');
      } else {
        if (dialogType === 'users') {
          if (!formData.name || !formData.username || !formData.password) { toast.error('Name, username, password required'); setSaving(false); return; }
        }
        await api.post(endpoint, formData);
        toast.success('Added');
      }
      setDialogOpen(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    try { await api.delete(`/api/${type}/${id}`); toast.success('Deleted'); fetchAll(); } catch (err) { toast.error('Failed'); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) { toast.error('Password must be at least 4 characters'); return; }
    setPwdSaving(true);
    try {
      await api.put(`/api/users/${pwdUserId}`, { password: newPassword });
      toast.success(`Password changed for ${pwdUserName}`);
      setPwdDialogOpen(false);
      setNewPassword('');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to change password'); }
    finally { setPwdSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Settings</h1><p className="text-muted-foreground">Manage reference data and users</p></div>

      {/* Profile Card */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Profile</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{user?.name || user?.fullName || '-'}</p></div>
            <div><Label className="text-muted-foreground">Username</Label><p className="font-medium">{user?.username || '-'}</p></div>
            <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{user?.email || '-'}</p></div>
            <div><Label className="text-muted-foreground">Role</Label><Badge variant="secondary" className="capitalize">{user?.role || 'user'}</Badge></div>
          </div>
        </CardContent>
      </Card>

      {/* Reference Data Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="commodities"><Wheat className="h-3.5 w-3.5 mr-1" />Commodities</TabsTrigger>
              <TabsTrigger value="origins"><Globe className="h-3.5 w-3.5 mr-1" />Origins</TabsTrigger>
              <TabsTrigger value="loading-ports"><Anchor className="h-3.5 w-3.5 mr-1" />Loading Ports</TabsTrigger>
              <TabsTrigger value="discharge-ports"><Ship className="h-3.5 w-3.5 mr-1" />Discharge Ports</TabsTrigger>
              <TabsTrigger value="surveyors"><Map className="h-3.5 w-3.5 mr-1" />Surveyors</TabsTrigger>
              <TabsTrigger value="disport-agents"><Anchor className="h-3.5 w-3.5 mr-1" />Disport Agents</TabsTrigger>
              <TabsTrigger value="users"><Users className="h-3.5 w-3.5 mr-1" />Users</TabsTrigger>
            </TabsList>

            <TabsContent value="commodities">
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Commodities ({commodities.length})</h3><Button size="sm" data-testid="add-commodity-btn" onClick={() => openAdd('commodities', { name: '', code: '', group: '', hsCode: '', specs: '', documents: [] })}><Plus className="h-3.5 w-3.5 mr-1" />Add Commodity</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Commodity Name</TableHead><TableHead>Commodity Group</TableHead><TableHead>Commodity Code</TableHead><TableHead>HS Code</TableHead><TableHead className="w-[80px]">Actions</TableHead></TableRow></TableHeader><TableBody>
                {commodities.map(c => <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.group || '-'}</TableCell><TableCell><Badge variant="secondary">{c.code || '-'}</Badge></TableCell><TableCell className="font-mono text-xs">{c.hsCode || '-'}</TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`edit-commodity-${c.id}`} onClick={() => { setDialogType('commodities'); setDialogForm({ name: c.name || '', code: c.code || '', group: c.group || '', hsCode: c.hsCode || '', specs: c.specs || '', documents: c.documents || [], _editId: c.id }); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" data-testid={`delete-commodity-${c.id}`} onClick={() => handleDelete('commodities', c.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>

            <TabsContent value="origins">
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Origins ({origins.length})</h3><Button size="sm" onClick={() => openAdd('origins', { name: '', adjective: '', code: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Add Origin</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Origin Name</TableHead><TableHead>Origin Adjective</TableHead><TableHead>Origin Code</TableHead><TableHead className="w-[50px]">Actions</TableHead></TableRow></TableHeader><TableBody>
                {origins.map(o => <TableRow key={o.id}><TableCell className="font-medium">{o.name}</TableCell><TableCell>{o.adjective || '-'}</TableCell><TableCell><Badge variant="secondary">{o.code || '-'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('origins', o.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>

            <TabsContent value="loading-ports">
              {(() => { const loadingPorts = ports.filter(p => p.type === 'loading'); return (<>
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Loading Ports ({loadingPorts.length})</h3><Button size="sm" onClick={() => openAdd('ports', { name: '', type: 'loading', country: '', countryCode: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Add Loading Port</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Port Name</TableHead><TableHead>Country</TableHead><TableHead>Country Code</TableHead><TableHead className="w-[50px]">Actions</TableHead></TableRow></TableHeader><TableBody>
                {loadingPorts.map(p => <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.country || '-'}</TableCell><TableCell><Badge variant="secondary">{p.countryCode || '-'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('ports', p.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
              </TableBody></Table></div></>); })()}
            </TabsContent>

            <TabsContent value="discharge-ports">
              {(() => { const dischargePorts = ports.filter(p => p.type === 'discharge'); return (<>
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Discharge Ports ({dischargePorts.length})</h3><Button size="sm" onClick={() => openAdd('ports', { name: '', type: 'discharge', country: '', countryCode: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Add Discharge Port</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Port Name</TableHead><TableHead>Country</TableHead><TableHead>Country Code</TableHead><TableHead className="w-[50px]">Actions</TableHead></TableRow></TableHeader><TableBody>
                {dischargePorts.map(p => <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.country || '-'}</TableCell><TableCell><Badge variant="secondary">{p.countryCode || '-'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('ports', p.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
              </TableBody></Table></div></>); })()}
            </TabsContent>

            <TabsContent value="surveyors">
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Surveyors ({surveyors.length})</h3><Button size="sm" onClick={() => openAdd('surveyors', { name: '', countriesServed: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Add Surveyor</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Surveyor Name</TableHead><TableHead>Countries Served</TableHead><TableHead className="w-[50px]">Actions</TableHead></TableRow></TableHeader><TableBody>
                {surveyors.map(s => <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell><div className="flex flex-wrap gap-1">{(s.countriesServed || []).map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}</div></TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('surveyors', s.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>

            <TabsContent value="disport-agents">
              <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Discharge Port Agents ({disportAgents.length})</h3><Button size="sm" onClick={() => openAdd('disport-agents', { name: '', port: '', contact: '', address: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Add Disport-Agent</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Agent Name</TableHead><TableHead>Port</TableHead><TableHead>Contact</TableHead><TableHead className="min-w-[250px]">Address</TableHead><TableHead className="w-[80px]">Actions</TableHead></TableRow></TableHeader><TableBody>
                {disportAgents.map(a => <TableRow key={a.id}><TableCell className="font-medium">{a.name}</TableCell><TableCell>{a.port || '-'}</TableCell><TableCell>{a.contact || '-'}</TableCell><TableCell><p className="text-xs whitespace-pre-line">{a.address || '-'}</p></TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDialogType('disport-agents'); setDialogForm({ name: a.name || '', port: a.port || '', contact: a.contact || '', address: a.address || '', _editId: a.id }); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('disport-agents', a.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>

            <TabsContent value="users">
              <div className="flex justify-between mb-4"><h3 className="font-semibold">Users ({users.length})</h3><Button size="sm" onClick={() => openAdd('users', { name: '', username: '', email: '', whatsapp: '', password: '', role: 'user' })}><Plus className="h-3.5 w-3.5 mr-1" />Add User</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Email</TableHead><TableHead>WhatsApp</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]">Actions</TableHead></TableRow></TableHeader><TableBody>
                {users.map(u => <TableRow key={u.id}><TableCell className="font-medium">{u.name || '-'}</TableCell><TableCell>{u.username}</TableCell><TableCell>{u.email || '-'}</TableCell><TableCell>{u.whatsapp || '-'}</TableCell><TableCell><Badge variant="secondary" className="capitalize">{u.role || 'user'}</Badge></TableCell><TableCell><Badge className="bg-green-100 text-green-800">Active</Badge></TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" title="Change Password" onClick={() => { setPwdUserId(u.id); setPwdUserName(u.name || u.username); setNewPassword(''); setPwdDialogOpen(true); }}><KeyRound className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDialogType('users'); setDialogForm({ name: u.name || '', username: u.username || '', email: u.email || '', whatsapp: u.whatsapp || '', role: u.role || 'user', _editId: u.id }); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('users', u.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Generic Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setNewDocInput(''); }}>
        <DialogContent className={dialogType === 'commodities' && dialogForm._editId ? 'max-w-2xl max-h-[85vh] overflow-y-auto' : dialogType === 'disport-agents' ? 'max-w-2xl max-h-[85vh] overflow-y-auto' : ''}>
          <DialogHeader className="text-center"><DialogTitle className="text-center">{dialogForm._editId ? 'Edit' : 'Add'} {dialogType === 'disport-agents' ? 'Disport-Agent' : dialogType === 'commodities' ? 'Commodity' : dialogType.replace(/s$/, '')}</DialogTitle><DialogDescription className="text-center">Fill in the details.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4">
            {Object.entries(dialogForm).filter(([key]) => key !== '_editId' && key !== 'documents').map(([key, val]) => (
              key === 'type' ? (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key}</Label>
                  <select className="w-full rounded-md border p-2 text-sm" value={val} onChange={(e) => setDialogForm({...dialogForm, [key]: e.target.value})}>
                    <option value="loading">Loading</option><option value="discharge">Discharge</option>
                  </select>
                </div>
              ) : key === 'role' ? (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key}</Label>
                  <select className="w-full rounded-md border p-2 text-sm" value={val} onChange={(e) => setDialogForm({...dialogForm, [key]: e.target.value})}>
                    <option value="admin">Admin</option><option value="user">User</option><option value="accountant">Accountant</option>
                  </select>
                </div>
              ) : key === 'specs' ? (
                <div key={key} className="space-y-2">
                  <Label>Specifications</Label>
                  <Textarea data-testid="commodity-specs-textarea" rows={6} value={val || ''} onChange={(e) => setDialogForm({...dialogForm, [key]: e.target.value})} placeholder="Enter commodity specifications (e.g. moisture, protein, etc.)" />
                </div>
              ) : key === 'address' ? (
                <div key={key} className="space-y-2">
                  <Label>Address</Label>
                  <Textarea data-testid="disport-agent-address-textarea" rows={8} value={val || ''} onChange={(e) => setDialogForm({...dialogForm, [key]: e.target.value})} placeholder="Paste full address with contact details..." className="font-mono text-sm" />
                </div>
              ) : (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                  <Input type={key === 'password' ? 'password' : 'text'} value={val || ''} onChange={(e) => setDialogForm({...dialogForm, [key]: e.target.value})} placeholder={key} />
                </div>
              )
            ))}
            {/* Documents management for commodities */}
            {Array.isArray(dialogForm.documents) && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Shipment Documents ({dialogForm.documents.length})</Label>
                <div className="flex gap-2">
                  <Input
                    data-testid="new-doc-input"
                    value={newDocInput}
                    onChange={(e) => setNewDocInput(e.target.value)}
                    placeholder="Add new document..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDocInput.trim()) {
                        e.preventDefault();
                        if (!dialogForm.documents.includes(newDocInput.trim())) {
                          setDialogForm({...dialogForm, documents: [...dialogForm.documents, newDocInput.trim()]});
                        }
                        setNewDocInput('');
                      }
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" data-testid="add-doc-btn" onClick={() => {
                    if (newDocInput.trim() && !dialogForm.documents.includes(newDocInput.trim())) {
                      setDialogForm({...dialogForm, documents: [...dialogForm.documents, newDocInput.trim()]});
                      setNewDocInput('');
                    }
                  }}><Plus className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {dialogForm.documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border bg-muted/30 text-sm group">
                      <span>{doc}</span>
                      <button
                        type="button"
                        data-testid={`remove-doc-${i}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                        onClick={() => setDialogForm({...dialogForm, documents: dialogForm.documents.filter((_, j) => j !== i)})}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{dialogForm._editId ? 'Save' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password</DialogTitle><DialogDescription>Set a new password for {pwdUserName}.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={pwdSaving}>{pwdSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
