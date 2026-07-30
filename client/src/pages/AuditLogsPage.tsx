import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  Search,
  Clock,
  User as UserIcon,
  Eye,
  FileDiff,
  X,
  Database,
  ArrowRight,
  History,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import api from '@/lib/api';

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [page, setPage] = useState(1);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['audit-logs-list', page],
    queryFn: async () => {
      const { data } = await api.get(`/audit-logs?page=${page}&limit=20`);
      return data.data;
    },
  });

  const displayList = Array.isArray(logsData?.data) ? logsData.data : [];
  const totalPages = logsData?.totalPages || 1;

  const filteredLogs = displayList.filter((l: any) => {
    const action = l.action || '';
    const userStr = typeof l.user === 'string'
      ? l.user
      : (l.user?.name || l.userName || 'System Executive');
    const resourceStr = l.resource || l.entity || (l.entityType ? `${l.entityType} #${l.entityId || ''}` : '');
    return (
      (actionFilter === 'ALL' || action.toUpperCase().includes(actionFilter)) &&
      (userStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
       resourceStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
       action.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Detailed Security & Compliance Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Immutable telemetry tracking exact user actions, field-level data mutations, and timestamped diffs.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-clay-green/10 text-[#5CB77E] border border-[#5CB77E]/30 text-xs font-bold">
          <ShieldAlert className="w-4 h-4 text-[#5CB77E]" />
          <span>Real-time Telemetry Active</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center clay-card p-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by executive, resource, or action..."
            className="clay-input pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-hide">
          {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                actionFilter === act ? 'clay-btn text-white' : 'bg-white/50 text-slate-600 hover:bg-white border border-violet-100/30'
              }`}
            >
              {act === 'ALL' ? 'All Actions' : act}
            </button>
          ))}
        </div>
      </div>

      <div className="clay-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/50 border-b border-violet-100/40 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="p-4">Timing</th>
                <th className="p-4">By Whom</th>
                <th className="p-4">Activity Done</th>
                <th className="p-4">Affected Resource</th>
                <th className="p-4">Mutated Fields</th>
                <th className="p-4">Source IP</th>
                <th className="p-4 text-center">Inspect Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100/40 text-sm">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                    {displayList.length === 0
                      ? 'No audit logs recorded yet. Telemetry will appear automatically when records are modified.'
                      : 'No audit records matching your filters.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any) => {
                  const timeStr = log.createdAt ? new Date(log.createdAt).toLocaleString() : (log.timestamp || '-');
                  const userStr = typeof log.user === 'string'
                    ? log.user
                    : (log.user?.name || log.userName || 'System Executive');
                  const actionStr = log.action || 'SYSTEM_EVENT';
                  const resourceStr = log.entity
                    ? `${log.entity} #${log.entityId || ''}`
                    : (log.resource || (log.entityType ? `${log.entityType} #${log.entityId || ''}` : 'Database'));
                  const ipStr = log.ipAddress || log.ip || '127.0.0.1';
                  const changedArr = Array.isArray(log.changedFields) ? log.changedFields : [];

                  return (
                    <tr key={log.id} className="hover:bg-white/50 transition-colors font-mono text-xs">
                      <td className="p-4 text-slate-500 whitespace-nowrap font-sans text-xs font-medium">{timeStr}</td>
                      <td className="p-4 font-bold text-slate-800 font-sans">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-clay-violet/10 text-[#7C6EF0] border border-violet-100/40 flex items-center justify-center font-bold text-[10px]">
                            {userStr.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{userStr}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] border ${
                          actionStr.includes('CREATE') ? 'bg-clay-green/10 text-[#5CB77E] border-[#5CB77E]/30' :
                          actionStr.includes('UPDATE') ? 'bg-clay-blue/10 text-[#4EA8DE] border-[#4EA8DE]/30' :
                          actionStr.includes('DELETE') ? 'bg-clay-rose/10 text-[#E5636C] border-[#E5636C]/30' :
                          'bg-white text-slate-600 border-violet-100/40 shadow-sm'
                        }`}>
                          {actionStr}
                        </span>
                      </td>
                      <td className="p-4 font-sans font-bold text-slate-800">{resourceStr}</td>
                      <td className="p-4 font-sans">
                        {changedArr.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {changedArr.map((f: string) => (
                              <span key={f} className="px-1.5 py-0.5 rounded-lg bg-white border border-violet-100/30 shadow-sm text-slate-600 font-mono text-[10px] font-bold">
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-sans text-xs font-medium">Full object / N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 whitespace-nowrap font-medium">{ipStr}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center px-3 py-1.5 rounded-xl bg-clay-violet/10 hover:bg-clay-violet/20 text-[#7C6EF0] font-sans text-xs font-bold border border-violet-100/40 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-violet-100/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-violet-100/30 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-clay-violet/10 text-[#7C6EF0] hover:bg-clay-violet/20 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="clay-card w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gradient-to-r from-[#7C6EF0] to-[#5c4ce0] text-white flex items-center justify-between border-b border-violet-100/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/20 text-white border border-white/30 backdrop-blur-sm shadow-sm">
                  <FileDiff className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading leading-tight">
                    Audit Log Inspection Details
                  </h3>
                  <p className="text-xs text-indigo-100 font-mono mt-0.5 font-medium">
                    ID: {selectedLog.id} • {new Date(selectedLog.createdAt || selectedLog.timestamp || Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl bg-black/10 text-white/80 hover:text-white hover:bg-black/20 transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm font-sans">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/50 border border-violet-100/40 shadow-inner">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Executive / User</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {typeof selectedLog.user === 'string' ? selectedLog.user : (selectedLog.user?.name || 'System Executive')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Action Performed</span>
                  <span className="font-extrabold text-[#7C6EF0] text-sm mt-0.5 block">
                    {selectedLog.action || 'SYSTEM_EVENT'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Resource</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {selectedLog.entity ? `${selectedLog.entity} #${selectedLog.entityId || ''}` : (selectedLog.resource || 'Database')}
                  </span>
                </div>
              </div>

              {/* Mutated Fields List */}
              {Array.isArray(selectedLog.changedFields) && selectedLog.changedFields.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center font-heading">
                    <Terminal className="w-4 h-4 text-[#7C6EF0]" />
                    <span>Specific Fields Mutated</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLog.changedFields.map((f: string) => (
                      <span key={f} className="px-3 py-1.5 rounded-xl bg-white border border-violet-100/40 text-[#7C6EF0] font-mono text-xs font-bold shadow-sm">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Old vs New Comparison Table */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center font-heading">
                  <FileDiff className="w-4 h-4 text-[#7C6EF0]" />
                  <span>State Snapshot Diffs (Old Data &rarr; New Data)</span>
                </h4>

                {selectedLog.oldData || selectedLog.newData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-clay-rose/10 border border-[#E5636C]/30 space-y-2">
                      <span className="text-xs font-extrabold text-[#E5636C] uppercase tracking-wider block">
                        Previous State (Before Mutation)
                      </span>
                      <pre className="text-xs font-mono text-slate-700 bg-white/80 p-3 rounded-xl border border-violet-100/40 overflow-x-auto max-h-52 shadow-inner">
                        {selectedLog.oldData ? JSON.stringify(selectedLog.oldData, null, 2) : 'Null / New Creation'}
                      </pre>
                    </div>

                    <div className="p-4 rounded-2xl bg-clay-green/10 border border-[#5CB77E]/30 space-y-2">
                      <span className="text-xs font-extrabold text-[#5CB77E] uppercase tracking-wider block">
                        New State (After Mutation)
                      </span>
                      <pre className="text-xs font-mono text-slate-700 bg-white/80 p-3 rounded-xl border border-violet-100/40 overflow-x-auto max-h-52 shadow-inner">
                        {selectedLog.newData ? JSON.stringify(selectedLog.newData, null, 2) : 'Null / Deleted'}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white/50 border border-violet-100/40 text-center text-slate-500 text-xs font-medium shadow-inner border-dashed">
                    No payload snapshot recorded for this system telemetry event.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-white/50 border-t border-violet-100/40 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="clay-btn px-5 py-2"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
