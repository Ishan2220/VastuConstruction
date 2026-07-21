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
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7C6EF0] border-t-transparent" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
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
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/vendors')}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-white/50 rounded-xl transition-colors shadow-sm bg-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-heading flex items-center gap-3">
            {vendor.name}
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-clay-violet/10 text-[#7C6EF0] border border-violet-100/40 uppercase align-middle">
              {vendor.category || 'General'}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Vendor Agency Details & Site Ledgers</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="clay-card p-6 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-violet-100/40 pb-3 font-heading">Contact Details</h3>
            <div className="space-y-4 text-sm mt-2">
              <div>
                <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">Contact Person</span>
                <div className="font-bold text-slate-800 flex items-center gap-2">
                   {vendor.contactPerson || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">Phone</span>
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#7C6EF0]" /> {vendor.phone}
                </div>
              </div>
              {vendor.email && (
                <div>
                  <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">Email</span>
                  <div className="font-bold text-slate-800 flex items-center gap-2 truncate">
                    <Mail className="w-4 h-4 text-[#7C6EF0]" /> {vendor.email}
                  </div>
                </div>
              )}
              {vendor.gst && (
                <div>
                  <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">GSTIN</span>
                  <div className="font-mono font-bold text-slate-800 bg-white border border-violet-100/40 px-2 py-1 rounded-lg w-fit shadow-sm">{vendor.gst}</div>
                </div>
              )}
              {vendor.address && (
                <div>
                  <span className="text-slate-500 block text-xs font-bold uppercase tracking-wider mb-1">Address</span>
                  <div className="font-medium text-slate-800 flex items-start gap-2 bg-white/50 p-2 rounded-xl border border-violet-100/30">
                    <MapPin className="w-4 h-4 text-[#E5636C] shrink-0 mt-0.5" /> 
                    <span>{vendor.address}, {vendor.city}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#7C6EF0] to-[#5c4ce0] rounded-3xl p-6 text-white shadow-lg shadow-[#7C6EF0]/30 space-y-4 relative overflow-hidden border border-white/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <h3 className="font-bold border-b border-white/20 pb-3 text-indigo-50 font-heading">Global Ledger</h3>
            <div className="space-y-4 mt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-100 font-medium">Total Order Value</span>
                <span className="font-mono font-bold text-white bg-black/10 px-2 py-0.5 rounded-lg">{formatCurrency(globalTotalPO)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#5CB77E] bg-white/10 px-2 py-0.5 rounded-lg font-bold">Total Paid</span>
                <span className="font-mono font-bold text-white">{formatCurrency(globalTotalPaid)}</span>
              </div>
              <div className="pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="font-bold text-[#F2A65A] text-sm uppercase tracking-wider">Net Payable</span>
                <span className="font-mono font-extrabold text-xl text-white">{formatCurrency(globalRemaining)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Site Tracking */}
        <div className="md:col-span-3 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 font-heading">Site-wise Tracking</h2>
          {siteStats.length === 0 ? (
            <div className="clay-card p-12 text-center text-slate-400">
              <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30 text-[#7C6EF0]" />
              <p className="font-medium">No project site activity recorded for this vendor yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {siteStats.map((site) => (
                <div key={site.projectId} className="clay-card-sm p-6 space-y-5 transition-transform hover:-translate-y-1 duration-300">
                  <div className="flex items-center gap-4 border-b border-violet-100/40 pb-4">
                    <div className="p-3 bg-clay-violet/10 text-[#7C6EF0] rounded-2xl shadow-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Site</div>
                      <div className="font-bold text-slate-800 leading-tight font-heading text-lg">{site.projectName}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm font-medium">
                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-xl border border-violet-100/30">
                      <span className="text-slate-600 flex items-center gap-2"><FileText className="w-4 h-4 text-[#7C6EF0]"/> PO Amount</span>
                      <span className="font-mono font-bold text-slate-800">{formatCurrency(site.totalPO)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-xl border border-violet-100/30">
                      <span className="text-slate-600 flex items-center gap-2"><PackageCheck className="w-4 h-4 text-[#5CB77E]"/> Payment Paid</span>
                      <span className="font-mono font-bold text-[#5CB77E]">{formatCurrency(site.totalPaid)}</span>
                    </div>
                    <div className="pt-3 flex justify-between items-center">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-xs">Remaining</span>
                      <span className={`font-mono font-extrabold text-lg ${site.totalPO - site.totalPaid > 0 ? 'text-[#E5636C]' : 'text-slate-400'}`}>
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
