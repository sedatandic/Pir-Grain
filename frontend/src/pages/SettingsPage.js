import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Trash2, Pencil, Loader2, Settings, Users, Map, Anchor, Wheat, Globe, ChevronRight } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [co, or, po, su, us] = await Promise.all([
        api.get('/api/commodities'), api.get('/api/origins'), api.get('/api/ports'), api.get('/api/surveyors'), api.get('/api/users'),
      ]);
      setCommodities(co.data); setOrigins(or.data); setPorts(po.data); setSurveyors(su.data); setUsers(us.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Generic CRUD dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // commodities, origins, ports, surveyors, users
  const [dialogForm, setDialogForm] = useState({});
  const [saving, setSaving] = useState(false);

  const openAdd = (type, defaults = {}) => { setDialogType(type); setDialogForm(defaults); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const endpoint = `/api/${dialogType}`;
      if (dialogType === 'users') {
        if (!dialogForm.name || !dialogForm.username || !dialogForm.password) { toast.error('Name, username, password required'); setSaving(false); return; }
      }
      await api.post(endpoint, dialogForm);
      toast.success('Added');
      setDialogOpen(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to add'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    try { await api.delete(`/api/${type}/${id}`); toast.success('Deleted'); fetchAll(); } catch (err) { toast.error('Failed'); }
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
            <TabsList className="mb-4">
              <TabsTrigger value="commodities"><Wheat className="h-3.5 w-3.5 mr-1" />Commodities</TabsTrigger>
              <TabsTrigger value="origins"><Globe className="h-3.5 w-3.5 mr-1" />Origins</TabsTrigger>
              <TabsTrigger value="ports"><Anchor className="h-3.5 w-3.5 mr-1" />Ports</TabsTrigger>
              <TabsTrigger value="surveyors"><Map className="h-3.5 w-3.5 mr-1" />Surveyors</TabsTrigger>
              <TabsTrigger value="users"><Users className="h-3.5 w-3.5 mr-1" />Users</TabsTrigger>
            </TabsList>

            <TabsContent value="commodities">
              <div className="flex justify-between mb-4"><h3 className="font-semibold">Commodities ({commodities.length})</h3><Button size="sm" onClick={() => openAdd('commodities', { name: '', code: '', group: '', hsCode: '', description: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Commodity Name</TableHead><TableHead>Commodity Group</TableHead><TableHead>Commodity Code</TableHead><TableHead>HS Code</TableHead><TableHead className="w-[50px]">Actions</TableHead></TableRow></TableHeader><TableBody>
                {commodities.map(c => <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.group || '-'}</TableCell><TableCell><Badge variant="secondary">{c.code || '-'}</Badge></TableCell><TableCell className="font-mono text-xs">{c.hsCode || '-'}</TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('commodities', c.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>

            <TabsContent value="origins">
              <div className="flex justify-between mb-4"><h3 className="font-semibold">Origins ({origins.length})</h3><Button size="sm" onClick={() => openAdd('origins', { name: '', adjective: '', code: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Country</TableHead><TableHead>Adjective</TableHead><TableHead>Code</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
                {origins.map(o => <TableRow key={o.id}><TableCell className="font-medium">{o.name}</TableCell><TableCell>{o.adjective || '-'}</TableCell><TableCell><Badge variant="secondary">{o.code || '-'}</Badge></TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('origins', o.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>

            <TabsContent value="ports">
              <div className="flex justify-between mb-4"><h3 className="font-semibold">Ports ({ports.length})</h3><Button size="sm" onClick={() => openAdd('ports', { name: '', type: 'loading', country: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Port</TableHead><TableHead>Type</TableHead><TableHead>Country</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
                {ports.map(p => <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell><Badge variant="secondary" className="capitalize">{p.type || '-'}</Badge></TableCell><TableCell>{p.country || '-'}</TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('ports', p.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>

            <TabsContent value="surveyors">
              <div className="flex justify-between mb-4"><h3 className="font-semibold">Surveyors ({surveyors.length})</h3><Button size="sm" onClick={() => openAdd('surveyors', { name: '', contact: '' })}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
                {surveyors.map(s => <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.contact || '-'}</TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('surveyors', s.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>

            <TabsContent value="users">
              <div className="flex justify-between mb-4"><h3 className="font-semibold">Users ({users.length})</h3><Button size="sm" onClick={() => openAdd('users', { name: '', username: '', email: '', mobile: '', password: '', role: 'user' })}><Plus className="h-3.5 w-3.5 mr-1" />Add User</Button></div>
              <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
                {users.map(u => <TableRow key={u.id}><TableCell className="font-medium">{u.name || '-'}</TableCell><TableCell>{u.username}</TableCell><TableCell>{u.email || '-'}</TableCell><TableCell><Badge variant="secondary" className="capitalize">{u.role || 'user'}</Badge></TableCell><TableCell><Badge className="bg-green-100 text-green-800">Active</Badge></TableCell><TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete('users', u.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>)}
              </TableBody></Table></div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Generic Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add {dialogType.replace(/s$/, '')}</DialogTitle><DialogDescription>Fill in the details.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4">
            {Object.entries(dialogForm).map(([key, val]) => (
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
              ) : (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                  <Input type={key === 'password' ? 'password' : 'text'} value={val || ''} onChange={(e) => setDialogForm({...dialogForm, [key]: e.target.value})} placeholder={key} />
                </div>
              )
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
