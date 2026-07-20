import { useState, useEffect } from 'react';
import { Package, Search, Plus, FileText, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: { name: string };
  project?: { name: string };
  issueDate: string;
  status: string;
  totalAmount: number;
}

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/purchase-orders');
      if (res.data?.success) {
        setPos(res.data.data.purchaseOrders);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-500/10 text-slate-400';
      case 'SUBMITTED': return 'bg-blue-500/10 text-blue-400';
      case 'APPROVED': return 'bg-amber-500/10 text-amber-400';
      case 'ORDERED': return 'bg-indigo-500/10 text-indigo-400';
      case 'PARTIAL': return 'bg-purple-500/10 text-purple-400';
      case 'RECEIVED': return 'bg-emerald-500/10 text-emerald-400';
      case 'CANCELLED': return 'bg-red-500/10 text-red-400';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-400">Manage procurement and material orders</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4" />
          Create PO
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO number or vendor..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
          </div>
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-white/5 flex items-center gap-2">
            Filter <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">PO Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading purchase orders...</td></tr>
              ) : pos.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No purchase orders found.</td></tr>
              ) : (
                pos.map((po) => (
                  <tr key={po.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-white">{po.poNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                      {po.vendor?.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                      {po.project?.name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                      {format(new Date(po.issueDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-white text-right">
                      ₹{Number(po.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      <button className="text-amber-500 hover:text-amber-400 font-medium">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
