import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, Download, Folder, Upload, Eye, CheckCircle2, ShieldCheck, HardHat, FileCode, ExternalLink, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  useQuickAddListener('document', () => setIsUploadOpen(true));
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const [docTitle, setDocTitle] = useState('');
  const [category, setCategory] = useState('BLUEPRINT');
  const [siteName, setSiteName] = useState('Corporate HQ');
  const [fileNotes, setFileNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<any | null>(null);

  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents-list'],
    queryFn: async () => {
      const { data } = await api.get('/documents');
      return data.data?.data || data.data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list-docs'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data?.data || data.data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/documents', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Document uploaded and indexed across site repository.');
      setIsUploadOpen(false);
      setDocTitle('');
      setFileNotes('');
      setSelectedFile(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to index document to vault');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/documents/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Document removed from site vault.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete document');
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/documents/${id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Document details updated.');
      setIsEditOpen(false);
      setEditDoc(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update document');
    },
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) {
      toast.error('Document title is required');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    let typeEnum = 'OTHER';
    if (category === 'BLUEPRINT' || category === 'ENGINEERING') typeEnum = 'DRAWING';
    else if (category === 'PERMIT' || category === 'COMPLIANCE' || category === 'QUALITY_CERTIFICATE') typeEnum = 'PDF';

    try {
      setIsUploadingFile(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await api.post('/files/upload', formData);
      const uploadedFileUrl = uploadRes.data.data.publicUrl;
      const uploadedSize = uploadRes.data.data.fileSizeOriginal || selectedFile.size;

      uploadMutation.mutate({
        title: docTitle,
        type: typeEnum,
        fileUrl: uploadedFileUrl,
        fileSize: uploadedSize,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'File upload to cloud storage failed');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const triggerRealDownload = async (doc: any) => {
    try {
      const res = await api.get(`/files/${doc.id}/download`);
      if (res.data?.data?.downloadUrl) {
        let downloadUrl = res.data.data.downloadUrl;
        
        // Fix for local uploads when API is on a different domain
        if (downloadUrl.startsWith('/uploads') || downloadUrl.includes(window.location.origin + '/uploads')) {
          const baseUrl = api.defaults.baseURL?.replace('/api', '') || window.location.origin;
          downloadUrl = baseUrl + downloadUrl.replace(window.location.origin, '');
        }

        window.open(downloadUrl, '_blank');
      } else {
        toast.error('Could not retrieve document download URL.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to download document.');
    }
  };

  const filteredDocs = documents.filter((d: any) => {
    const title = d.title || '';
    const categoryStr = d.category || d.type || '';
    const siteStr = d.site || d.project?.name || '';
    return (
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoryStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      siteStr.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Site Vault & Engineering Documents
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralized cloud repository for AutoCAD blueprints, municipal permits, quality certificates, and structural reports.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New Document</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by blueprint name, permit category, or site location..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                <th className="p-4">Document Title</th>
                <th className="p-4">Category</th>
                <th className="p-4">Associated Site</th>
                <th className="p-4">Upload Date</th>
                <th className="p-4">File Size</th>
                <th className="p-4 text-right">Actions (View / Download)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">No engineering documents stored in vault yet. Click "+ Upload New Document" above to attach drawings, permits, or contracts.</td>
                </tr>
              ) : (
                filteredDocs.map((doc: any) => {
                  const title = doc.title || 'Untitled Document';
                  const cat = (doc.category || doc.type || 'DOCUMENT').replace('_', ' ');
                  const site = doc.site || doc.project?.name || 'All Sites / Corporate';
                  const date = doc.date || (doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : '-');
                  const size = doc.size || (doc.fileSize ? `${Math.max(0.1, Math.round(doc.fileSize / 1024 / 1024 * 10) / 10)} MB` : '2.4 MB');
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2.5 min-w-[200px]">
                        <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="hover:text-indigo-600 cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                          {title}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          {cat}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">{site}</td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">{date}</td>
                      <td className="p-4 font-mono text-slate-600 whitespace-nowrap">{size}</td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                            title="Preview Document & Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => triggerRealDownload(doc)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                            title="Download Original File to Device"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditDoc({
                                ...doc,
                                title: doc.title || '',
                                category: doc.category || doc.type || 'BLUEPRINT',
                                site: doc.site || 'Skyline Residency',
                              });
                              setIsEditOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition-all shadow-sm"
                            title="Edit Document Info"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all shadow-sm"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document View / Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-400">
                  <span>{previewDoc.category}</span>
                  <span>•</span>
                  <span>{previewDoc.fileType}</span>
                </div>
                <h3 className="text-lg font-bold font-heading">{previewDoc.title}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body & Mock Document Viewer */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
              {/* Metadata Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Site Project</span>
                  <div className="text-sm font-bold text-slate-900">{previewDoc.site}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">File Size</span>
                  <div className="text-sm font-bold text-slate-900 font-mono">{previewDoc.size}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Date Indexed</span>
                  <div className="text-sm font-bold text-slate-900">{previewDoc.date}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Status</span>
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified & Active
                  </div>
                </div>
              </div>

              {/* Engineering Notes */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Engineering & Architect Notes</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{previewDoc.notes}</p>
              </div>

              {/* Live Canvas / Blueprint Mock Previewer */}
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 font-mono text-xs text-indigo-300">
                    <FileCode className="w-4 h-4" /> CAD & Document Preview Engine
                  </div>
                  <span className="text-xs bg-slate-800 px-2.5 py-0.5 rounded text-slate-300 font-mono">Zoom: 100% (Fit Canvas)</span>
                </div>

                <div className="h-96 rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                  {previewDoc.fileUrl ? (
                    <iframe
                      src={
                        (previewDoc.fileUrl.startsWith('/uploads') || previewDoc.fileUrl.includes(window.location.origin + '/uploads')) 
                          ? (api.defaults.baseURL?.replace('/api', '') || window.location.origin) + previewDoc.fileUrl.replace(window.location.origin, '')
                          : previewDoc.fileUrl
                      }
                      className="w-full h-full border-none"
                      title={previewDoc.title || 'Document Preview'}
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]" />
                      <HardHat className="w-12 h-12 text-indigo-400 animate-bounce" />
                      <div className="space-y-1 z-10 text-center mt-3">
                        <div className="font-bold text-base text-slate-100">{previewDoc.title || 'Untitled Document'}</div>
                        <div className="text-xs text-slate-400 max-w-md mx-auto">
                          Structural reinforcement blueprint & inspection certificate rendered securely from Vastu Cloud CDN.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer with Download Action */}
            <div className="p-6 bg-white border-t border-slate-200 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Instant digital download certified by Vastu Engineering Vault.
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => triggerRealDownload(previewDoc)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Original ({previewDoc.size})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-lg p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Upload Site Document & Engineering Blueprint</h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Skyline Tower B Electrical Conduit CAD Blueprint"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="BLUEPRINT">Structural Blueprint / CAD</option>
                    <option value="PERMIT">Municipal Permit / Approval</option>
                    <option value="QUALITY_CERTIFICATE">Quality / Mill Certificate</option>
                    <option value="ENGINEERING">Soil / Structural Engineering Report</option>
                    <option value="COMPLIANCE">Environmental Compliance Notice</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Associated Site *</label>
                  <select
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Corporate HQ">Corporate HQ / General</option>
                    {projects.map((p: any) => (
                      <option key={p.id || p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Engineering Notes & Description</label>
                <textarea
                  rows={3}
                  placeholder="Architectural revision details, inspection batch number, or compliance signature..."
                  value={fileNotes}
                  onChange={(e) => setFileNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-6 border-2 border-dashed border-indigo-300 rounded-xl text-center text-xs text-slate-600 bg-indigo-50/30 space-y-3">
                <Upload className="w-8 h-8 text-indigo-500 mx-auto animate-bounce" />
                <div className="font-semibold text-slate-800">Select File (PDF, DWG, CAD, JPG, PNG, or ZIP)</div>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer"
                />
                {selectedFile && (
                  <div className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-block">
                    Ready to Upload: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button
                  type="submit"
                  disabled={isUploadingFile || uploadMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploadingFile ? 'Uploading File to Cloud...' : 'Upload & Index Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {isEditOpen && editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="font-bold text-lg font-heading">Edit Document Info</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                editMutation.mutate({
                  id: editDoc.id,
                  payload: {
                    title: editDoc.title,
                    category: editDoc.category,
                    site: editDoc.site,
                  },
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700">Document Title</label>
                <input
                  type="text"
                  required
                  value={editDoc.title}
                  onChange={(e) => setEditDoc({ ...editDoc, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Category</label>
                <select
                  value={editDoc.category}
                  onChange={(e) => setEditDoc({ ...editDoc, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm mt-1"
                >
                  <option value="BLUEPRINT">Structural Blueprint / CAD</option>
                  <option value="PERMIT">Municipal Permit / Approval</option>
                  <option value="QUALITY_CERTIFICATE">Quality / Mill Certificate</option>
                  <option value="ENGINEERING">Soil / Structural Engineering Report</option>
                  <option value="COMPLIANCE">Environmental Compliance Notice</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Associated Site</label>
                <select
                  value={editDoc.site}
                  onChange={(e) => setEditDoc({ ...editDoc, site: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 text-sm mt-1"
                >
                  <option value="Corporate HQ">Corporate HQ / General</option>
                  {projects.map((p: any) => (
                    <option key={p.id || p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editMutation.isPending} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
