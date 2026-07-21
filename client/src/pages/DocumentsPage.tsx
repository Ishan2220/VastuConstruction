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
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Site Vault & Engineering Documents
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Centralized cloud repository for AutoCAD blueprints, municipal permits, quality certificates, and structural reports.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New Document</span>
        </button>
      </div>

      <div className="clay-card p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by blueprint name, permit category, or site location..."
            className="clay-input w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full clay-card p-12 text-center text-slate-400">
            No engineering documents stored in vault yet. Click "+ Upload New Document" above to attach drawings, permits, or contracts.
          </div>
        ) : (
          filteredDocs.map((doc: any) => {
            const title = doc.title || 'Untitled Document';
            const cat = (doc.category || doc.type || 'DOCUMENT').replace('_', ' ');
            const site = doc.site || doc.project?.name || 'All Sites / Corporate';
            const date = doc.date || (doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : '-');
            const size = doc.size || (doc.fileSize ? `${Math.max(0.1, Math.round(doc.fileSize / 1024 / 1024 * 10) / 10)} MB` : '2.4 MB');
            
            return (
              <div key={doc.id} className="clay-card-sm p-5 space-y-4 hover:border-[#7C6EF0]/30 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-clay-violet rounded-xl text-[#7C6EF0]">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 font-heading line-clamp-1 cursor-pointer hover:text-[#7C6EF0]" onClick={() => setPreviewDoc(doc)}>
                          {title}
                        </h3>
                        <div className="text-[10px] font-bold uppercase mt-1">
                          <span className="bg-clay-blue text-[#4EA8DE] px-2 py-0.5 rounded-full">{cat}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs text-slate-600 bg-white/40 p-3 rounded-xl border border-violet-100/30">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Site</span>
                      <span className="font-semibold text-slate-700">{site}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date</span>
                      <span className="font-semibold text-slate-700">{date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Size</span>
                      <span className="font-mono text-slate-700">{size}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-violet-100/30">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="p-1.5 text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors"
                      title="View Document"
                    >
                      <Eye className="w-4 h-4" />
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
                      className="p-1.5 text-slate-400 hover:text-[#F2A65A] hover:bg-[#F2A65A]/10 rounded-lg transition-colors"
                      title="Edit Document Info"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-[#E5636C] hover:bg-[#E5636C]/10 rounded-lg transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => triggerRealDownload(doc)}
                    className="clay-btn px-3 py-1.5 text-xs text-white flex items-center gap-1.5"
                    title="Download Original File to Device"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Document View / Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] p-0">
            {/* Modal Header */}
            <div className="p-6 bg-white/50 border-b border-violet-100/40 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[#7C6EF0]">
                  <span className="bg-clay-violet px-2 py-0.5 rounded-full">{previewDoc.category}</span>
                  <span>•</span>
                  <span>{previewDoc.fileType}</span>
                </div>
                <h3 className="text-lg font-bold font-heading text-slate-800">{previewDoc.title}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/50 font-bold transition-colors"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Metadata Badges */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-4 bg-white/40 p-3 sm:p-4 rounded-xl border border-violet-100/30">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Site Project</span>
                  <div className="text-sm font-bold text-slate-800">{previewDoc.site}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">File Size</span>
                  <div className="text-sm font-bold text-slate-800 font-mono">{previewDoc.size}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Date Indexed</span>
                  <div className="text-sm font-bold text-slate-800">{previewDoc.date}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Status</span>
                  <div className="text-xs font-bold text-[#5CB77E] flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-4 h-4" /> Verified & Active
                  </div>
                </div>
              </div>

              {/* Engineering Notes */}
              <div className="bg-white/40 p-4 rounded-xl border border-violet-100/30 space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Engineering & Architect Notes</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{previewDoc.notes}</p>
              </div>

              {/* Preview */}
              <div className="bg-white/30 rounded-2xl p-6 border border-violet-100/30 space-y-4">
                <div className="flex items-center justify-between border-b border-violet-100/40 pb-3">
                  <div className="flex items-center gap-2 font-mono text-xs text-[#7C6EF0] font-bold">
                    <FileCode className="w-4 h-4" /> Document Preview Engine
                  </div>
                  <span className="text-xs bg-white/50 px-2.5 py-0.5 rounded-full text-slate-600 font-mono">Zoom: 100% (Fit Canvas)</span>
                </div>

                <div className="h-96 rounded-xl border-2 border-dashed border-[#7C6EF0]/30 bg-white/20 flex flex-col items-center justify-center relative overflow-hidden">
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
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#7C6EF0_1px,transparent_1px)] [background-size:16px_16px]" />
                      <HardHat className="w-12 h-12 text-[#7C6EF0] animate-bounce" />
                      <div className="space-y-1 z-10 text-center mt-3">
                        <div className="font-bold text-base text-slate-800">{previewDoc.title || 'Untitled Document'}</div>
                        <div className="text-xs text-slate-500 max-w-md mx-auto">
                          Structural reinforcement blueprint & inspection certificate rendered securely from Vastu Cloud CDN.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 bg-white/50 border-t border-violet-100/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 text-center sm:text-left">
                Instant digital download certified by Vastu Engineering Vault.
              </span>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold text-sm hover:bg-white/50 w-full sm:w-auto text-center"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => triggerRealDownload(previewDoc)}
                  className="clay-btn px-5 py-2 text-white font-bold text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Upload Site Document & Engineering Blueprint</h3>
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
                  className="clay-input w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="clay-input w-full px-3 py-2 text-sm"
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
                    className="clay-input w-full px-3 py-2 text-sm"
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
                  className="clay-input w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="p-6 border-2 border-dashed border-[#7C6EF0]/30 rounded-xl text-center text-xs text-[#7C6EF0] bg-clay-violet space-y-3">
                <Upload className="w-8 h-8 mx-auto animate-bounce" />
                <div className="font-semibold">Select File (PDF, DWG, CAD, JPG, PNG, or ZIP)</div>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/50 file:text-[#7C6EF0] hover:file:bg-white/70 cursor-pointer"
                />
                {selectedFile && (
                  <div className="text-[#5CB77E] font-bold bg-clay-green px-3 py-1.5 rounded-lg inline-block">
                    Ready to Upload: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-white/40">Cancel</button>
                <button
                  type="submit"
                  disabled={isUploadingFile || uploadMutation.isPending}
                  className="clay-btn px-5 py-2 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Edit Document Info</h3>
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
                  className="clay-input w-full px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Category</label>
                <select
                  value={editDoc.category}
                  onChange={(e) => setEditDoc({ ...editDoc, category: e.target.value })}
                  className="clay-input w-full px-3 py-2 text-sm mt-1"
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
                  className="clay-input w-full px-3 py-2 text-sm mt-1"
                >
                  <option value="Corporate HQ">Corporate HQ / General</option>
                  {projects.map((p: any) => (
                    <option key={p.id || p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-white/40">Cancel</button>
                <button type="submit" disabled={editMutation.isPending} className="clay-btn px-5 py-2 text-white text-sm font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
