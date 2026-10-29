import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  Edit3,
  Trash2,
  Check,
  ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/common/CategorySelect';
import { useCustomCategories } from '@/hooks/useCustomCategories';
import { useQuickAddListener } from '@/hooks/useQuickAddListener';
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { MAHARASHTRA_CITIES } from '@/lib/cities';

interface MultiCategorySelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  defaultOptions?: string[];
  placeholder?: string;
  className?: string;
}

function MultiCategorySelect({
  value = [],
  onChange,
  defaultOptions = ['CEMENT', 'STEEL', 'AGGREGATE', 'BRICKS', 'ELECTRICAL', 'PLUMBING'],
  placeholder = 'Select Categories...',
  className = '',
}: MultiCategorySelectProps) {
  const { allCategories, addCategory } = useCustomCategories('vendors', defaultOptions);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedList = Array.isArray(value) ? value : [];

  const toggleCategory = (cat: string) => {
    if (selectedList.includes(cat)) {
      onChange(selectedList.filter((c) => c !== cat));
    } else {
      onChange([...selectedList, cat]);
    }
  };

  const handleAddSubmit = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = newCatName.trim().toUpperCase();
    if (!trimmed) return;
    addCategory(trimmed);
    if (!selectedList.includes(trimmed)) {
      onChange([...selectedList, trimmed]);
    }
    setNewCatName('');
    setIsAdding(false);
    setSearchQuery('');
    toast.success(`Category "${trimmed}" added!`);
  };

  const filteredCategories = allCategories.filter((cat) =>
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exactMatchExists = allCategories.some(
    (cat) => cat.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  return (
    <div className="relative w-full text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-2xs transition-all hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${className}`}
      >
        <span className="truncate">
          {selectedList.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : selectedList.length <= 2 ? (
            selectedList.join(', ')
          ) : (
            `${selectedList.slice(0, 2).join(', ')} (+${selectedList.length - 2} more)`
          )}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setIsAdding(false);
              setSearchQuery('');
            }}
          />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full min-w-[220px] overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            {/* Search Input */}
            <div className="p-1.5 border-b border-slate-100 mb-1 bg-slate-50/50 rounded-t-xl">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Selected Pills */}
            {selectedList.length > 0 && (
              <div className="p-1.5 flex flex-wrap gap-1 border-b border-slate-100 mb-1">
                {selectedList.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(cat);
                      }}
                      className="hover:text-rose-500 ml-0.5 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Category Checkbox List */}
            <div className="max-h-44 overflow-y-auto space-y-1">
              {filteredCategories.length === 0 ? (
                <div className="p-2 text-xs text-slate-400 text-center font-medium">No results found</div>
              ) : (
                filteredCategories.map((cat) => {
                  const isSelected = selectedList.includes(cat);
                  return (
                    <div
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                        />
                        <span className="truncate">{cat}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                    </div>
                  );
                })
              )}
            </div>

            <div className="my-1.5 border-t border-slate-100" />

            {/* Quick Add from Search */}
            {!exactMatchExists && searchQuery.trim() && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const trimmed = searchQuery.trim().toUpperCase();
                  addCategory(trimmed);
                  if (!selectedList.includes(trimmed)) {
                    onChange([...selectedList, trimmed]);
                  }
                  setSearchQuery('');
                  toast.success(`Category "${trimmed}" added!`);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add "{searchQuery.trim().toUpperCase()}"...</span>
              </button>
            )}

            {/* Add Custom Category Form */}
            {isAdding ? (
              <div className="p-1 space-y-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSubmit(e);
                    }
                  }}
                  placeholder="Type category name..."
                  autoFocus
                  className="w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-2.5 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAdding(false);
                    }}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleAddSubmit(e);
                    }}
                    className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-500"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              !searchQuery.trim() && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAdding(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Custom Category...</span>
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function VendorsPage() {
    const confirmDialog = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterCity, setFilterCity] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  useQuickAddListener('vendor', () => setIsAddOpen(true));
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [newVendor, setNewVendor] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    categories: ['CEMENT'] as string[],
    gstin: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    openingBalance: '',
  });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const { data } = await api.get('/vendors?limit=1000');
      return data.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/vendors', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
      queryClient.invalidateQueries({ queryKey: ['vendors-select'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Vendor agency added successfully');
      setNewVendor({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        categories: ['CEMENT'],
        gstin: '',
        address: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        openingBalance: '',
      });
      setIsAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add vendor');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put(`/vendors/${editingVendor.id}`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
      queryClient.invalidateQueries({ queryKey: ['vendors-select'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Vendor profile updated successfully');
      setEditingVendor(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update vendor');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/vendors/${id}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
      queryClient.invalidateQueries({ queryKey: ['vendors-select'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      toast.success('Vendor agency deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete vendor');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.contactPerson) {
      toast.error('Vendor Name and Contact Person are required');
      return;
    }
    if (!newVendor.categories || newVendor.categories.length === 0) {
      toast.error('Please select at least one material category');
      return;
    }
    const { gstin, openingBalance, ...rest } = newVendor;
    createMutation.mutate({
      ...rest,
      gstin,
      openingBalance: openingBalance ? parseFloat(openingBalance as string) : 0,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor.categories || editingVendor.categories.length === 0) {
      toast.error('Please select at least one material category');
      return;
    }
    const { gstin, gst, openingBalance, ...rest } = editingVendor;
    updateMutation.mutate({
      ...rest,
      gst: gst || gstin,
      openingBalance: openingBalance ? parseFloat(openingBalance as string) : 0,
    });
  };

  const openEdit = (vendor: any) => {
    const cats = Array.isArray(vendor.categories) && vendor.categories.length > 0
      ? vendor.categories
      : vendor.category
        ? [vendor.category]
        : ['CEMENT'];
    setEditingVendor({
      ...vendor,
      categories: cats,
    });
  };

  const filteredVendors = vendors.filter((v: any) => {
    const vendorCats: string[] = Array.isArray(v.categories) && v.categories.length > 0
      ? v.categories
      : (v.category ? [v.category] : []);
    const catsString = vendorCats.join(' ').toLowerCase();
    const matchesSearch = v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          catsString.includes(searchTerm.toLowerCase()) || 
                          v.phone?.includes(searchTerm);
    const matchesCategory = filterCategory === 'ALL' || vendorCats.some((c: string) => 
      c.toUpperCase() === filterCategory.toUpperCase() ||
      (filterCategory === 'AGGREGATES' && c.toUpperCase() === 'AGGREGATE') ||
      (filterCategory === 'AGGREGATE' && c.toUpperCase() === 'AGGREGATES')
    );
    const matchesCity = filterCity === 'ALL' || v.city === filterCity;
    return matchesSearch && matchesCategory && matchesCity;
  });

  const uniqueCities = Array.from(new Set(vendors.map((v: any) => v.city || 'Mumbai')));

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-6 min-h-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Authorized Vendors & Material Suppliers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain supplier directory, GSTIN compliance, category specialization, and payment ledgers.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="clay-btn inline-flex items-center gap-2 px-4 py-2.5"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Vendor</span>
        </button>
      </div>

      <div className="clay-card p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search suppliers by agency name, category, or phone..."
            className="w-full pl-10 pr-4 py-2 clay-input text-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 clay-input text-sm font-semibold text-slate-700 w-full md:w-auto"
          >
            <option value="ALL">All Categories</option>
            <option value="CEMENT">Cement</option>
            <option value="STEEL">Steel & TMT</option>
            <option value="AGGREGATES">Aggregates (Sand/Stone)</option>
            <option value="BRICKS">Bricks & Blocks</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="PAINT">Paint & Finishes</option>
            <option value="MACHINERY">Machinery & Tools</option>
            <option value="LABOUR_CONTRACTOR">Labour Contractor</option>
            <option value="OTHER">Other</option>
          </select>
          
          <select 
            value={filterCity} 
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-3 py-2 clay-input text-sm font-semibold text-slate-700 w-full md:w-auto"
          >
            <option value="ALL">All Cities</option>
            {uniqueCities.map(city => (
              <option key={city as string} value={city as string}>{city as string}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-slate-200 rounded-2xl" />)}
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="clay-card p-12 text-center text-slate-400">No vendor agencies found.</div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredVendors.map((vendor: any) => (
              <div key={vendor.id} onClick={() => navigate(`/vendors/${vendor.id}`)} className="clay-card p-6 space-y-4 flex flex-col justify-between hover:border-[#7C6EF0]/30 transition-all cursor-pointer group">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-[70%]">
                      {((vendor.categories && vendor.categories.length > 0) ? vendor.categories : (vendor.category ? [vendor.category] : ['OTHER'])).map((cat: string) => (
                        <span key={cat} className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#7C6EF0]/10 text-[#7C6EF0] border border-[#7C6EF0]/20">
                          {cat}
                        </span>
                      ))}
                      <span className="text-[11px] font-mono text-slate-400">{vendor.gst || vendor.gstin || 'GST Unregistered'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(vendor); }}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors cursor-pointer"
                        title="Edit Vendor Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to delete vendor agency ${vendor.name}?` })) {
                            deleteMutation.mutate(vendor.id);
                          }
                        }}
                        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Vendor Agency"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 font-heading">{vendor.contactPerson || vendor.name}</h3>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div>Agency: <strong className="text-slate-700">{vendor.name}</strong></div>
                    <div className="flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center pt-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> <span>{vendor.phone || 'N/A'}</span>
                    </div>
                    {vendor.email && (
                      <div className="flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> <span>{vendor.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-4 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Total Paid</span>
                    <span className="font-bold text-rose-600 text-base">₹{(vendor.totalPaid || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-violet-100/30 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {vendor.city || 'Mumbai'}
                  </span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto clay-card">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-violet-100/30">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contact / Main</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Agency Info</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Financials</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30">
                {filteredVendors.map((vendor: any) => (
                  <tr key={vendor.id} onClick={() => navigate(`/vendors/${vendor.id}`)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{vendor.contactPerson || vendor.name}</div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                        {((vendor.categories && vendor.categories.length > 0) ? vendor.categories : (vendor.category ? [vendor.category] : ['OTHER'])).map((cat: string) => (
                          <span key={cat} className="font-bold text-[#7C6EF0] bg-[#7C6EF0]/10 px-2 py-0.5 rounded border border-[#7C6EF0]/20 font-mono text-[11px]">
                            {cat}
                          </span>
                        ))}
                        <span className="font-mono ml-1">{vendor.gst || vendor.gstin || 'GST Unregistered'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-600 flex flex-col gap-1">
                        <div>Agency: <strong className="text-slate-700">{vendor.name}</strong></div>
                        <div className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5" /> {vendor.phone || 'N/A'}</div>
                        {vendor.email && <div className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5" /> {vendor.email}</div>}
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1"><MapPin className="w-3.5 h-3.5" /> {vendor.city || 'Mumbai'}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between gap-4"><span className="text-slate-500">Total Paid:</span> <span className="font-bold text-rose-600 text-sm">₹{(vendor.totalPaid || 0).toLocaleString('en-IN')}</span></div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(vendor); }}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#7C6EF0] hover:bg-[#7C6EF0]/10 rounded-lg transition-colors"
                          title="Edit Vendor Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirmDialog({ title: 'Confirm Action', message: `Are you sure you want to delete vendor agency ${vendor.name}?` })) {
                              deleteMutation.mutate(vendor.id);
                            }
                          }}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Vendor Agency"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Onboard Vendor Agency</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Agency Name *"
                value={newVendor.name}
                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <input
                type="text"
                required
                placeholder="Contact Person *"
                value={newVendor.contactPerson}
                onChange={(e) => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <div className="grid grid-cols-2 gap-4">
                <MultiCategorySelect
                  value={newVendor.categories}
                  onChange={(val) => setNewVendor({ ...newVendor, categories: val })}
                  defaultOptions={['CEMENT', 'STEEL', 'AGGREGATE', 'BRICKS', 'ELECTRICAL', 'PLUMBING']}
                  placeholder="Select Categories..."
                />
                <CategorySelect
                  module="cities"
                  value={newVendor.city}
                  onChange={(val) => setNewVendor({ ...newVendor, city: val })}
                  defaultOptions={MAHARASHTRA_CITIES}
                  placeholder="Select or Add City..."
                />
              </div>
                <input
                  type="text"
                  placeholder="State"
                  value={newVendor.state || ''}
                  onChange={(e) => setNewVendor({ ...newVendor, state: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              <input
                type="text"
                placeholder="Phone Number *"
                value={newVendor.phone}
                onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                className="w-full clay-input text-sm font-mono"
              />
              <input
                type="text"
                placeholder="GSTIN Number (15 digits)"
                value={newVendor.gstin}
                onChange={(e) => setNewVendor({ ...newVendor, gstin: e.target.value.toUpperCase() })}
                className="w-full clay-input text-sm font-mono"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  className="w-full clay-input text-sm"
                />
                <input
                  type="text"
                  placeholder="Alternate Phone"
                  value={(newVendor as any).altPhone || ''}
                  onChange={(e) => setNewVendor({ ...newVendor, altPhone: e.target.value } as any)}
                  className="w-full clay-input text-sm font-mono"
                />
              </div>
              <input
                type="text"
                placeholder="Complete Address"
                value={newVendor.address}
                onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="PAN Number"
                  value={(newVendor as any).pan || ''}
                  onChange={(e) => setNewVendor({ ...newVendor, pan: e.target.value.toUpperCase() } as any)}
                  className="w-full clay-input text-sm font-mono uppercase"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="clay-btn px-5 py-2">Onboard</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-violet-100/30 pb-4">
              <h3 className="font-bold text-lg font-heading text-slate-800">Update Vendor Agency</h3>
              <button onClick={() => setEditingVendor(null)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Agency Name *"
                value={editingVendor.name || ''}
                onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                className="w-full clay-input text-sm font-semibold"
              />
              <input
                type="text"
                required
                placeholder="Primary Contact Person *"
                value={editingVendor.contactPerson || ''}
                onChange={(e) => setEditingVendor({ ...editingVendor, contactPerson: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <div className="grid grid-cols-2 gap-4">
                <MultiCategorySelect
                  value={Array.isArray(editingVendor.categories) ? editingVendor.categories : (editingVendor.category ? [editingVendor.category] : ['CEMENT'])}
                  onChange={(val) => setEditingVendor({ ...editingVendor, categories: val })}
                  defaultOptions={['CEMENT', 'STEEL', 'AGGREGATE', 'BRICKS', 'ELECTRICAL', 'PLUMBING']}
                  placeholder="Select Categories..."
                />
                <CategorySelect
                  module="cities"
                  value={editingVendor.city || ''}
                  onChange={(val) => setEditingVendor({ ...editingVendor, city: val })}
                  defaultOptions={MAHARASHTRA_CITIES}
                  placeholder="Select or Add City..."
                />
              </div>
                <input
                  type="text"
                  placeholder="State"
                  value={editingVendor.state || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, state: e.target.value })}
                  className="w-full clay-input text-sm"
                />
              <input
                type="text"
                placeholder="Phone Number *"
                value={editingVendor.phone || ''}
                onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                className="w-full clay-input text-sm font-mono"
              />
              <input
                type="text"
                placeholder="GSTIN Number"
                value={editingVendor.gst || editingVendor.gstin || ''}
                onChange={(e) => setEditingVendor({ ...editingVendor, gst: e.target.value.toUpperCase() })}
                className="w-full clay-input text-sm font-mono uppercase"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={editingVendor.email || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                  className="w-full clay-input text-sm"
                />
                <input
                  type="text"
                  placeholder="Alternate Phone"
                  value={editingVendor.altPhone || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, altPhone: e.target.value })}
                  className="w-full clay-input text-sm font-mono"
                />
              </div>
              <input
                type="text"
                placeholder="Complete Address"
                value={editingVendor.address || ''}
                onChange={(e) => setEditingVendor({ ...editingVendor, address: e.target.value })}
                className="w-full clay-input text-sm"
              />
              <div className="grid grid-cols-1 gap-4">
                <input
                  type="text"
                  placeholder="PAN Number"
                  value={editingVendor.pan || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, pan: e.target.value.toUpperCase() })}
                  className="w-full clay-input text-sm font-mono uppercase"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/30">
                <button type="button" onClick={() => setEditingVendor(null)} className="px-4 py-2 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="clay-btn px-5 py-2">Save Updates</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
