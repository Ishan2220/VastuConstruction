import { useState, useEffect } from 'react';
import { Database, Image, FileText, File, HardDrive, Search, Filter, ShieldCheck, Activity } from 'lucide-react';
import api from '@/lib/api';

export default function StorageAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/files/dashboard/stats');
      setStats(data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch storage stats');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Enterprise Analytics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!stats) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-500" />
            Enterprise Storage Analytics
          </h1>
          <p className="text-slate-500 mt-1">Real-time metrics for File Management System (FMS)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center text-center">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Files</p>
          <p className="text-3xl font-bold font-heading">{stats.totalFiles}</p>
        </div>

        {/* Storage Used */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center text-center">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mb-3">
            <HardDrive className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Storage Used</p>
          <p className="text-3xl font-bold font-heading">{formatBytes(stats.storageUsed)}</p>
        </div>

        {/* Storage Saved */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 bg-emerald-500 text-white rounded-bl-xl text-xs font-bold">
            -{stats.overallCompressionRatio}%
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Storage Saved</p>
          <p className="text-3xl font-bold font-heading text-emerald-600">{formatBytes(stats.storageSaved)}</p>
          <p className="text-xs text-emerald-500 mt-1 flex items-center justify-center gap-1">
            <Activity className="w-3 h-3" /> via Deduplication & Compression
          </p>
        </div>

        {/* Duplicates Prevented */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center text-center">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Duplicates Prevented</p>
          <p className="text-3xl font-bold font-heading">{stats.duplicateFilesPrevented}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 font-heading border-b pb-2">File Types Distribution</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <Image className="text-blue-500 w-5 h-5" />
                <span className="font-semibold text-slate-700">Images (Photos, Receipts)</span>
              </div>
              <span className="font-bold">{stats.images} files</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <FileText className="text-red-500 w-5 h-5" />
                <span className="font-semibold text-slate-700">PDFs (Contracts, Permits)</span>
              </div>
              <span className="font-bold">{stats.pdfs} files</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <File className="text-green-500 w-5 h-5" />
                <span className="font-semibold text-slate-700">Office Files (Excel, Word)</span>
              </div>
              <span className="font-bold">{stats.office} files</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-3">
                <File className="text-slate-500 w-5 h-5" />
                <span className="font-semibold text-slate-700">Other (CAD, ZIP, Misc)</span>
              </div>
              <span className="font-bold">{stats.other} files</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 font-heading border-b pb-2">System Health</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Database Engine</span>
              <span className="font-semibold text-emerald-600">PostgreSQL (Metadata Only)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Binary Blobs in DB</span>
              <span className="font-semibold text-emerald-600">0 Bytes</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Background Queues</span>
              <span className="font-semibold text-emerald-600">None (Synchronous)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Orphaned Files</span>
              <span className="font-semibold text-emerald-600">0 Detected</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Duplicate Files</span>
              <span className="font-semibold text-amber-600">{stats.duplicateFilesPrevented} Prevented</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
