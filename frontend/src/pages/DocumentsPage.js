import { useState, useEffect } from 'react';
import api from '../lib/api';
import { DOCUMENT_TYPES } from '../lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Upload, Trash2, Download, FileText, Loader2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('Other Document');
  const [tradeId, setTradeId] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    try {
      const [docsRes, tradesRes] = await Promise.all([
        api.get('/api/documents'),
        api.get('/api/trades'),
      ]);
      setDocuments(docsRes.data);
      setTrades(tradesRes.data);
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      formData.append('tradeId', tradeId);
      const selectedTrade = trades.find(t => t.id === tradeId);
      formData.append('tradeRef', selectedTrade?.tradeRef || '');

      await api.post('/api/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded');
      setDialogOpen(false);
      setFile(null);
      setDocType('Other Document');
      setTradeId('');
      fetchData();
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    try {
      await api.delete(`/api/documents/${deletingDoc.id}`);
      toast.success('Document deleted');
      setDeleteDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shipment Documents</h1>
          <p className="text-slate-500 text-sm">Manage trade documents</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#0e7490] hover:bg-[#155e75]" data-testid="documents-upload-button">
          <Upload className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      <div className="data-table">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Document</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Trade Ref</TableHead>
              <TableHead className="font-semibold">Size</TableHead>
              <TableHead className="font-semibold">Uploaded</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : documents.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" /> No documents uploaded yet
              </TableCell></TableRow>
            ) : documents.map((doc) => (
              <TableRow key={doc.id} className="hover:bg-slate-50/70">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-medium">{doc.fileName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {doc.docType}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">{doc.tradeRef || '-'}</TableCell>
                <TableCell className="text-sm">{formatSize(doc.fileSize)}</TableCell>
                <TableCell className="text-xs text-slate-500">
                  {doc.createdAt ? (() => { try { return format(parseISO(doc.createdAt), 'MMM d, yyyy'); } catch { return '-'; } })() : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <a href={`${process.env.REACT_APP_BACKEND_URL}${doc.fileUrl}`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                    </a>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => { setDeletingDoc(doc); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link to Trade (optional)</Label>
              <Select value={tradeId} onValueChange={setTradeId}>
                <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {trades.map((t) => <SelectItem key={t.id} value={t.id}>{t.tradeRef} - {t.commodityName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading} className="bg-[#0e7490] hover:bg-[#155e75]">
              {uploading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will permanently delete {deletingDoc?.fileName}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
