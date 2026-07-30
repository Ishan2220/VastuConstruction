import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Phone, Mail, Building2, PackageCheck, Banknote, FileText, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import { VendorPaymentModal } from './VendorPaymentModal';
import { useState } from 'react';

export default function VendorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

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

  const siteMap = new Map<string, any>();

  // 1. Add POs
  vendor.purchaseOrders?.forEach((po: any) => {
    const pId = po.projectId || 'global';
    const pName = po.project?.name || 'Global / No Specific Site';
    if (!siteMap.has(pId)) {
      siteMap.set(pId, { projectName: pName, projectId: pId, totalPO: 0, totalPaid: 0, expenses: [] });
    }
    const site = siteMap.get(pId)!;
    site.totalPO += Number(po.totalAmount || 0);
  });

  // 1.5 Add Labour Attendances to total value
  vendor.vendorAttendances?.forEach((va: any) => {
    const pId = va.projectId || 'global';
    const pName = va.project?.name || 'Global / No Specific Site';
    if (!siteMap.has(pId)) {
      siteMap.set(pId, { projectName: pName, projectId: pId, totalPO: 0, totalPaid: 0, expenses: [] });
    }
    const site = siteMap.get(pId)!;
    site.totalPO += Number(va.totalWage || 0);
  });

  // 2. Add Expenses (Payments)
  vendor.expenses?.forEach((exp: any) => {
    const pId = exp.projectId || 'global';
    const pName = exp.project?.name || 'Global / No Specific Site';
    if (!siteMap.has(pId)) {
      siteMap.set(pId, { projectName: pName, projectId: pId, totalPO: 0, totalPaid: 0, expenses: [] });
    }
    
    // Parse payment details if present
    let details = [];
    if (exp.remarks && exp.remarks.includes(' | DETAILS:')) {
      try {
        const parts = exp.remarks.split(' | DETAILS:');
        exp.remarks = parts[0];
        details = JSON.parse(parts[1]);
      } catch (e) {}
    }
    exp.paymentDetails = details;

    const site = siteMap.get(pId)!;
    site.totalPaid += Number(exp.amount || 0);
    site.expenses.push(exp);
  });

  const siteStats = Array.from(siteMap.values());
  const globalTotalPO = siteStats.reduce((acc, s) => acc + s.totalPO, 0);
  const globalTotalPaid = siteStats.reduce((acc, s) => acc + s.totalPaid, 0);
  const globalRemaining = globalTotalPO - globalTotalPaid;

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans pb-24">
      <PageHeader
        title={vendor.name}
        description={`${vendor.category || 'Vendor Agency'} • ${vendor.city || 'Mumbai'}`}
        showBack={false}
        breadcrumbs={[
          { label: 'Vendors', href: '/vendors' },
          { label: vendor.name }
        ]}
        action={{
          label: 'Record Payment',
          icon: Banknote,
          onClick: () => {
            setSelectedProjectId('');
            setIsPaymentOpen(true);
          }
        }}
      />

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
                      <span className="text-slate-600 flex items-center gap-2"><PackageCheck className="w-4 h-4 text-[#E5636C]"/> Payment Paid</span>
                      <span className="font-mono font-bold text-[#E5636C]">{formatCurrency(site.totalPaid)}</span>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setSelectedProjectId(site.projectId);
                          setIsPaymentOpen(true);
                        }}
                        className="w-full py-2 bg-white border border-violet-100/50 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors mb-4"
                      >
                        <Plus className="w-4 h-4" /> Pay for Site
                      </button>
                    </div>

                    <div className="pt-2 border-t border-violet-100/30">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Payments</h4>
                      {site.expenses && site.expenses.length > 0 ? (
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                          {site.expenses.sort((a: any,b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map((exp: any, i: number) => (
                            <div key={i} className="bg-white/60 p-3 rounded-xl border border-violet-100/50 shadow-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-500">{formatDate(exp.paymentDate)}</span>
                                <span className="text-sm font-bold text-[#E5636C]">{formatCurrency(exp.amount)}</span>
                              </div>
                              {exp.paymentDetails && exp.paymentDetails.length > 0 ? (
                                <div className="space-y-1.5 mt-2 border-t border-slate-100 pt-2">
                                  {exp.paymentDetails.map((det: any, j: number) => (
                                    <div key={j} className="flex justify-between items-start text-xs">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-slate-700">{det.description}</span>
                                        <span className="text-[10px] text-slate-400">Qty: {det.quantity} @ ₹{det.rate}</span>
                                      </div>
                                      <span className="font-bold text-slate-600">{formatCurrency(det.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exp.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No payments recorded for this site yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <VendorPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        vendorId={vendor.id}
        vendorName={vendor.name}
        vendorCategory={vendor.category}
        defaultProjectId={selectedProjectId}
      />
    </div>
  );
}
