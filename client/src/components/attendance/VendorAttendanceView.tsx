import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, UserX, Building2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface VendorAttendanceViewProps {
  selectedDateStr: string;
  isLocked: boolean;
}

export const VendorAttendanceView: React.FC<VendorAttendanceViewProps> = ({ selectedDateStr, isLocked }) => {
  const queryClient = useQueryClient();
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  // Form State
  const [projectId, setProjectId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [details, setDetails] = useState<any[]>([{ categoryId: '', customCategory: '', count: '', rate: '' }]);

  // Fetch Vendors (Labour Contractors)
  const { data: vendorsList = [], isLoading: loadingVendors } = useQuery({
    queryKey: ['vendors-labour-contractors'],
    queryFn: async () => {
      const { data } = await api.get('/vendors?category=LABOUR_CONTRACTOR');
      return data.data?.data || [];
    },
  });

  // Fetch existing vendor attendances for the date
  const { data: attendances = [], isLoading: loadingAttendances } = useQuery({
    queryKey: ['vendor-attendance', selectedDateStr],
    queryFn: async () => {
      const { data } = await api.get(`/labour/vendor-attendance?date=${selectedDateStr}`);
      return data.data || [];
    },
  });

  // Fetch Projects
  const { data: projectsList = [] } = useQuery({
    queryKey: ['projects-list-minimal'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data?.data || [];
    },
  });

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/labour/vendor-attendance', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-attendance', selectedDateStr] });
      queryClient.invalidateQueries({ queryKey: ['vendors-labour-contractors'] });
      toast.success('Vendor headcount recorded successfully');
      setSelectedVendorId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record headcount');
    }
  });

  const handleAddDetail = () => setDetails([...details, { categoryId: '', customCategory: '', count: '', rate: '' }]);
  const handleRemoveDetail = (index: number) => setDetails(details.filter((_, i) => i !== index));
  const handleDetailChange = (index: number, field: string, value: string) => {
    const newDetails = [...details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setDetails(newDetails);
  };

  const updateFormState = (vendorId: string) => {
    const existing = attendances.find((a: any) => a.vendorId === vendorId);
    if (existing) {
      setProjectId(existing.projectId || '');
      setNotes(existing.notes || '');
      setDetails(existing.details.map((d: any) => ({
        categoryId: d.categoryId || '',
        customCategory: d.customCategory || '',
        count: d.count.toString(),
        rate: d.rate.toString()
      })));
    } else {
      setProjectId('');
      setNotes('');
      setDetails([{ categoryId: '', customCategory: 'Mason', count: '', rate: '' }]);
    }
  };

  React.useEffect(() => {
    if (selectedVendorId) {
      updateFormState(selectedVendorId);
    }
  }, [selectedDateStr, attendances, selectedVendorId]);

  const handleOpenVendor = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    // updateFormState is now handled by the useEffect watching selectedVendorId
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;

    submitMutation.mutate({
      vendorId: selectedVendorId,
      projectId: projectId || undefined,
      date: selectedDateStr,
      notes,
      details: details.map(d => ({
        categoryId: d.categoryId || undefined,
        customCategory: d.customCategory,
        count: Number(d.count),
        rate: Number(d.rate)
      }))
    });
  };

  const isLoading = loadingVendors || loadingAttendances;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7C6EF0]"></div>
      </div>
    );
  }

  if (vendorsList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <Building2 size={32} />
        </div>
        <h3 className="text-gray-900 font-bold text-lg mb-1">No Labour Contractors found</h3>
        <p className="text-gray-500 text-sm">Add a vendor with category 'LABOUR_CONTRACTOR' to track headcounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* List of Vendors */}
      <div className="flex flex-col gap-4">
        {vendorsList.map((vendor: any) => {
          const attendance = attendances.find((a: any) => a.vendorId === vendor.id);
          const isSelected = selectedVendorId === vendor.id;

          return (
            <motion.div key={vendor.id} layout className={`bg-white rounded-2xl shadow-sm border ${isSelected ? 'border-[#7C6EF0] ring-1 ring-[#7C6EF0]/30' : 'border-gray-100 hover:border-violet-200'} transition-all overflow-hidden`}>
              <div 
                className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() => handleOpenVendor(vendor.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${attendance ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      {vendor.name}
                      {attendance && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </h3>
                    <p className="text-xs text-gray-500">{vendor.phone}</p>
                  </div>
                </div>
                {attendance && (
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Wage</div>
                    <div className="font-bold text-[#5CB77E]">{formatCurrency(attendance.totalWage)}</div>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 bg-gray-50"
                  >
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                      {/* Project Selection */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Project Site (Optional)</label>
                        <select
                          disabled={isLocked}
                          value={projectId}
                          onChange={e => setProjectId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C6EF0]"
                        >
                          <option value="">No specific project</option>
                          {projectsList.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Headcount Breakdown */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Headcount Breakdown</label>
                          {!isLocked && (
                            <button type="button" onClick={handleAddDetail} className="text-xs text-[#7C6EF0] font-bold flex items-center gap-1 hover:bg-[#7C6EF0]/10 px-2 py-1 rounded transition-colors">
                              <Plus className="w-3 h-3" /> Add Row
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {details.map((detail, index) => (
                            <div key={index} className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Worker Role</label>
                                <input
                                  disabled={isLocked}
                                  type="text"
                                  placeholder="e.g. Mason, Helper"
                                  required
                                  value={detail.customCategory}
                                  onChange={e => handleDetailChange(index, 'customCategory', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C6EF0]"
                                />
                              </div>
                              <div className="w-20">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Count</label>
                                <input
                                  disabled={isLocked}
                                  type="number"
                                  placeholder="0"
                                  min="0.5" step="0.5" required
                                  value={detail.count}
                                  onChange={e => handleDetailChange(index, 'count', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C6EF0]"
                                />
                              </div>
                              <div className="w-24">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Rate (₹)</label>
                                <input
                                  disabled={isLocked}
                                  type="number"
                                  placeholder="Rate"
                                  min="1" step="0.01" required
                                  value={detail.rate}
                                  onChange={e => handleDetailChange(index, 'rate', e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C6EF0]"
                                />
                              </div>
                              {!isLocked && details.length > 1 && (
                                <button type="button" onClick={() => handleRemoveDetail(index)} className="p-2 mb-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Notes / Remarks</label>
                        <input
                          disabled={isLocked}
                          type="text"
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Any special remarks..."
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C6EF0]"
                        />
                      </div>

                      {!isLocked && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={submitMutation.isPending}
                            className="bg-[#7C6EF0] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-[0_4px_12px_rgba(124,110,240,0.3)] hover:shadow-[0_6px_16px_rgba(124,110,240,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            {submitMutation.isPending ? 'Saving...' : 'Save Headcount'}
                          </button>
                        </div>
                      )}
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
