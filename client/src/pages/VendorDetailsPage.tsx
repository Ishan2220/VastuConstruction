import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Phone, Mail, Building2, PackageCheck, Banknote, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';

export default function VendorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor-details', id],
    queryFn: async () => {
      const { data } = await api.get(`/vendors/${id}`);
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-8 text-center text-slate-500">
        Vendor not found.
      </div>
    );
  }

  // Aggregate site-wise financial data
  const siteMap = new Map<string, { projectName: string; projectId: string; totalPO: number; totalPaid: number }>();

  // 1. Add POs
  vendor.purchaseOrders?.forEach((po: any) => {
    if (!po.project) return;
    const pId = po.projectId;
    if (!siteMap.has(pId)) {
      siteMap.set(pId, { projectName: po.project.name, projectId: pId, totalPO: 0, totalPaid: 0 });
    }
    siteMap.get(pId)!.totalPO += Number(po.totalAmount || 0);
  });

  // 2. Add Expenses (Payments)
  vendor.expenses?.forEach((exp: any) => {
    if (!exp.project) return;
    const pId = exp.projectId;
    if (!siteMap.has(pId)) {
      siteMap.set(pId, { projectName: exp.project.name, projectId: pId, totalPO: 0, totalPaid: 0 });
    }
    siteMap.get(pId)!.totalPaid += Number(exp.amount || 0);
  });

  const siteStats = Array.from(siteMap.values());
  const globalTotalPO = siteStats.reduce((acc, s) => acc + s.totalPO, 0);
  const globalTotalPaid = siteStats.reduce((acc, s) => acc + s.totalPaid, 0);
  const globalRemaining = globalTotalPO - globalTotalPaid;

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 bg-slate-50 min-h-full font-sans pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/vendors')}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading flex items-center gap-3">
            {vendor.name}
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase align-middle">
              {vendor.category || 'General'}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Vendor Agency Details & Site Ledgers</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2">Contact Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-400 block text-xs font-semibold mb-1">Contact Person</span>
                <div className="font-medium text-slate-700 flex items-center gap-2">
                   {vendor.contactPerson || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-xs font-semibold mb-1">Phone</span>
                <div className="font-medium text-slate-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" /> {vendor.phone}
                </div>
              </div>
              {vendor.email && (
                <div>
                  <span className="text-slate-400 block text-xs font-semibold mb-1">Email</span>
                  <div className="font-medium text-slate-700 flex items-center gap-2 truncate">
                    <Mail className="w-4 h-4 text-slate-400" /> {vendor.email}
                  </div>
                </div>
              )}
              {vendor.gst && (
                <div>
                  <span className="text-slate-400 block text-xs font-semibold mb-1">GSTIN</span>
                  <div className="font-mono font-medium text-slate-700">{vendor.gst}</div>
                </div>
              )}
              {vendor.address && (
                <div>
                  <span className="text-slate-400 block text-xs font-semibold mb-1">Address</span>
                  <div className="font-medium text-slate-700 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> 
                    <span>{vendor.address}, {vendor.city}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg space-y-4">
            <h3 className="font-bold border-b border-white/20 pb-2 text-indigo-100">Global Ledger</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-200">Total Order Value</span>
                <span className="font-mono font-bold text-white">{formatCurrency(globalTotalPO)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-emerald-300">Total Paid</span>
                <span className="font-mono font-bold text-white">{formatCurrency(globalTotalPaid)}</span>
              </div>
              <div className="pt-2 border-t border-white/20 flex justify-between items-center">
                <span className="font-bold text-rose-200 text-sm">Net Payable</span>
                <span className="font-mono font-extrabold text-lg text-white">{formatCurrency(globalRemaining)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Site Tracking */}
        <div className="md:col-span-3 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 font-heading">Site-wise Tracking</h2>
          {siteStats.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center text-slate-400">
              <Building2 className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No project site activity recorded for this vendor yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {siteStats.map((site) => (
                <div key={site.projectId} className="bg-white border rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 border-b pb-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Site</div>
                      <div className="font-bold text-slate-900 leading-tight">{site.projectName}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> PO Amount</span>
                      <span className="font-mono font-semibold text-slate-700">{formatCurrency(site.totalPO)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-1.5"><PackageCheck className="w-3.5 h-3.5"/> Payment Paid</span>
                      <span className="font-mono font-bold text-emerald-600">{formatCurrency(site.totalPaid)}</span>
                    </div>
                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="font-bold text-slate-700">Remaining</span>
                      <span className={`font-mono font-extrabold ${site.totalPO - site.totalPaid > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatCurrency(site.totalPO - site.totalPaid)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
