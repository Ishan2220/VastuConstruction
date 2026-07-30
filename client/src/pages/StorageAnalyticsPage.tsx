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
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading flex items-center gap-2">
            <Database className="w-8 h-8 text-[#7C6EF0]" /> Storage Analytics
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Overview of file storage consumption across the system.
          </p>
        </div>
      </div>

      <div className="clay-card p-6 md:p-8 max-w-4xl space-y-8">
        {/* Top Stats */}
        <div className="grid grid-cols-2 divide-x divide-violet-100/30">
          <div className="flex flex-col items-center justify-center p-4">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Storage Used</p>
            <p className="text-4xl font-extrabold text-[#7C6EF0] font-heading">{formatBytes(stats.storageUsed)}</p>
          </div>
          <div className="flex flex-col items-center justify-center p-4">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Files</p>
            <p className="text-4xl font-extrabold text-slate-700 font-heading">{stats.totalFiles}</p>
          </div>
        </div>

        <hr className="border-violet-100/30" />

        {/* File Types */}
        <div>
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" /> File Type Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center transition hover:shadow-md hover:-translate-y-1">
              <Image className="text-blue-500 w-8 h-8 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{stats.images}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">Images</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center transition hover:shadow-md hover:-translate-y-1">
              <FileText className="text-red-500 w-8 h-8 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{stats.pdfs}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">PDFs</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center transition hover:shadow-md hover:-translate-y-1">
              <File className="text-emerald-500 w-8 h-8 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{stats.office}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">Documents</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center transition hover:shadow-md hover:-translate-y-1">
              <File className="text-slate-400 w-8 h-8 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{stats.other}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">Other</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
