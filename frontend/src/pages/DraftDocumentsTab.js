import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Upload, FileText, Trash2, Eye, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_REQUIRED_DOCS = [
  'Signed Commercial Invoice',
  'Bill of Lading (Clean on Board, Freight Prepaid)',
  'Certificate of Origin',
  'Phytosanitary Certificate',
  'Non-Radiation Certificate (CS134 & CS137 < 370 Bq/Kg)',
  'Fumigation Certificate (if any)',
  'Quality Certificate (GAFTA Approved Surveyor)',
  'Weight Certificate (GAFTA Approved Surveyor)',
  'Holds Cleanliness Certificate (GAFTA Approved Surveyor)',
  'Holds Sealing Certificate (GAFTA Approved Surveyor)',
  'Insurance Certificate (GAFTA - 102% of value)',
  "Master's Receipt",
  'Non-Dioxin Analysis + GAFTA Non-Dioxin Certificate',
];

export default function DraftDocumentsTab({ trade, tradeId }) {
  const [draftDocs, setDraftDocs] = useState([]);
  const [diDocs, setDiDocs] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDrafts = useCallback(async () => {
    if (!tradeId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/trades/${tradeId}/draft-documents`);
      setDraftDocs(res.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, [tradeId]);

  const fetchDI = useCallback(async () => {
    if (!tradeId) return;
    try {
      const res = await api.get(`/api/doc-instructions?tradeId=${tradeId}`);
      const dis = res.data;
      if (dis.length > 0 && dis[0].requiredDocuments?.length) {
        setDiDocs(dis[0].requiredDocuments.map(d => d.name));
      } else {
        setDiDocs(DEFAULT_REQUIRED_DOCS);
      }
    } catch {
      setDiDocs(DEFAULT_REQUIRED_DOCS);
    }
  }, [tradeId]);

  useEffect(() => { fetchDrafts(); fetchDI(); }, [fetchDrafts, fetchDI]);

  const requiredDocNames = diDocs.length > 0 ? diDocs : DEFAULT_REQUIRED_DOCS;

  const uploadDraft = async (docName, file) => {
    if (!file || !tradeId) return;
    setUploading(docName);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docName', docName);
      const res = await api.post(`/api/trades/${tradeId}/draft-documents?docName=${encodeURIComponent(docName)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setDraftDocs(res.data);
      toast.success(`Draft uploaded: ${docName}`);
    } catch { toast.error('Failed to upload draft'); }
    finally { setUploading(null); }
  };

  const deleteDraft = async (idx) => {
    try {
      const res = await api.delete(`/api/trades/${tradeId}/draft-documents/${idx}`);
      setDraftDocs(res.data);
      toast.success('Draft document removed');
    } catch { toast.error('Failed to delete'); }
  };

  const viewDraft = async (idx) => {
    try {
      const res = await api.get(`/api/trades/${tradeId}/draft-documents/${idx}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      window.open(url, '_blank');
    } catch { toast.error('Failed to open document'); }
  };

  // Build status map: docName -> uploaded draft(s)
  const draftMap = {};
  draftDocs.forEach((d, idx) => {
    if (!draftMap[d.docName]) draftMap[d.docName] = [];
    draftMap[d.docName].push({ ...d, index: idx });
  });

  const uploadedCount = requiredDocNames.filter(name => draftMap[name]?.length > 0).length;
  const missingCount = requiredDocNames.length - uploadedCount;

  if (!tradeId) return null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm">{uploadedCount} / {requiredDocNames.length} Uploaded</span>
        </Badge>
        {missingCount > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-red-200 text-red-700">
            <XCircle className="h-3.5 w-3.5" />
            <span className="text-sm">{missingCount} Missing</span>
          </Badge>
        )}
        {missingCount === 0 && (
          <Badge className="gap-1.5 py-1.5 px-3 bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-sm">All documents uploaded</span>
          </Badge>
        )}
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Required Documents vs Draft Uploads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead>Required Document (from DI)</TableHead>
                  <TableHead className="text-center w-28">Status</TableHead>
                  <TableHead>Uploaded File</TableHead>
                  <TableHead className="text-center w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requiredDocNames.map((docName, i) => {
                  const drafts = draftMap[docName] || [];
                  const hasUpload = drafts.length > 0;
                  return (
                    <TableRow key={i} className={!hasUpload ? 'bg-red-50/50 dark:bg-red-900/10' : ''} data-testid={`draft-row-${i}`}>
                      <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{docName}</TableCell>
                      <TableCell className="text-center">
                        {hasUpload ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                            <CheckCircle2 className="h-3 w-3" />Uploaded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-200 text-red-600 gap-1">
                            <AlertCircle className="h-3 w-3" />Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasUpload ? (
                          <div className="space-y-1">
                            {drafts.map((d, di) => (
                              <div key={di} className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs truncate max-w-[200px]" title={d.fileName}>{d.fileName}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {hasUpload && drafts.map((d, di) => (
                            <div key={di} className="flex items-center gap-0.5">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewDraft(d.index)} title="View">
                                <Eye className="h-3.5 w-3.5 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteDraft(d.index)} title="Delete">
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          ))}
                          <label className="cursor-pointer inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted transition-colors" title="Upload">
                            {uploading === docName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-muted-foreground" />}
                            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
                              onChange={(e) => { if (e.target.files[0]) uploadDraft(docName, e.target.files[0]); e.target.value = ''; }}
                              disabled={uploading === docName} />
                          </label>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
