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

  const { data: logsData = [], isLoading } = useQuery({
    queryKey: ['audit-logs-list'],
    queryFn: async () => {
      const { data } = await api.get('/audit-logs');
      return data.data?.data || data.data || [];
    },
  });

  const displayList = Array.isArray(logsData) ? logsData : [];

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
    <div className="p-4 md:p-8 lg:p-8 space-y-6 bg-slate-50 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Detailed Security & Compliance Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable telemetry tracking exact user actions, field-level data mutations, and timestamped diffs.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          <span>Real-time Telemetry Active</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by executive, resource, or action..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN'].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                actionFilter === act ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act === 'ALL' ? 'All Actions' : act}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="p-4">Timing</th>
                <th className="p-4">By Whom</th>
                <th className="p-4">Activity Done</th>
                <th className="p-4">Affected Resource</th>
                <th className="p-4">Mutated Fields</th>
                <th className="p-4">Source IP</th>
                <th className="p-4 text-center">Inspect Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
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
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors font-mono text-xs">
                      <td className="p-4 text-slate-500 whitespace-nowrap font-sans text-xs">{timeStr}</td>
                      <td className="p-4 font-bold text-slate-800 font-sans">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                            {userStr.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{userStr}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg font-bold uppercase text-[11px] ${
                          actionStr.includes('CREATE') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          actionStr.includes('UPDATE') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          actionStr.includes('DELETE') ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {actionStr}
                        </span>
                      </td>
                      <td className="p-4 font-sans font-bold text-slate-700">{resourceStr}</td>
                      <td className="p-4 font-sans">
                        {changedArr.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {changedArr.map((f: string) => (
                              <span key={f} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-sans text-xs">Full object / N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">{ipStr}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-sans text-xs font-bold border border-indigo-200 transition-all shadow-2xs"
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
      </div>

      {/* Detailed Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <FileDiff className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading leading-tight">
                    Audit Log Inspection Details
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    ID: {selectedLog.id} • {new Date(selectedLog.createdAt || selectedLog.timestamp || Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm font-sans">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Executive / User</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {typeof selectedLog.user === 'string' ? selectedLog.user : (selectedLog.user?.name || 'System Executive')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Action Performed</span>
                  <span className="font-extrabold text-indigo-600 text-sm mt-0.5 block">
                    {selectedLog.action || 'SYSTEM_EVENT'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Resource</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {selectedLog.entity ? `${selectedLog.entity} #${selectedLog.entityId || ''}` : (selectedLog.resource || 'Database')}
                  </span>
                </div>
              </div>

              {/* Mutated Fields List */}
              {Array.isArray(selectedLog.changedFields) && selectedLog.changedFields.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Specific Fields Mutated</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLog.changedFields.map((f: string) => (
                      <span key={f} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-xs font-bold">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Old vs New Comparison Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileDiff className="w-3.5 h-3.5 text-indigo-600" />
                  <span>State Snapshot Diffs (Old Data $\rightarrow$ New Data)</span>
                </h4>

                {selectedLog.oldData || selectedLog.newData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/60 space-y-2">
                      <span className="text-xs font-extrabold text-rose-700 uppercase tracking-wider block">
                        Previous State (Before Mutation)
                      </span>
                      <pre className="text-xs font-mono text-slate-700 bg-white p-3 rounded-xl border border-rose-100 overflow-x-auto max-h-52">
                        {selectedLog.oldData ? JSON.stringify(selectedLog.oldData, null, 2) : 'Null / New Creation'}
                      </pre>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-2">
                      <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider block">
                        New State (After Mutation)
                      </span>
                      <pre className="text-xs font-mono text-slate-700 bg-white p-3 rounded-xl border border-emerald-100 overflow-x-auto max-h-52">
                        {selectedLog.newData ? JSON.stringify(selectedLog.newData, null, 2) : 'Null / Deleted'}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs">
                    No payload snapshot recorded for this system telemetry event.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow"
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
