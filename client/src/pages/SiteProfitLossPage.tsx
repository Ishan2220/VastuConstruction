import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  Plus,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  X,
  Building2,
  MapPin,
  IndianRupee,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

interface SiteData {
  id: string;
  name: string;
  location: string;
  progress: number;
  income: number;
  expense: number;
}

const STORAGE_KEY = 'vastu-dashboard-sites';

function loadSites(): SiteData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveSites(sites: SiteData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
}

function generateId(): string {
  return `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SiteProfitLossPage() {
  const navigate = useNavigate();

  const [sites, setSites] = useState<SiteData[]>(() => loadSites());
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteData | null>(null);
  const [form, setForm] = useState({
    name: '',
    location: '',
    progress: '0',
    income: '',
    expense: '',
  });

  // Persist whenever sites change
  useEffect(() => {
    saveSites(sites);
  }, [sites]);

  // Derived filtered data for the chart
  const chartSites = useMemo(() => {
    if (selectedSiteId === 'all') return sites;
    return sites.filter((s) => s.id === selectedSiteId);
  }, [sites, selectedSiteId]);

  // Max value for bar scaling
  const maxValue = useMemo(() => {
    if (chartSites.length === 0) return 1;
    let m = 0;
    for (const s of chartSites) {
      m = Math.max(m, s.income, s.expense, Math.abs(s.income - s.expense));
    }
    return m || 1;
  }, [chartSites]);

  // Totals
  const totals = useMemo(() => {
    const totalIncome = sites.reduce((sum, s) => sum + (s.income || 0), 0);
    const totalExpense = sites.reduce((sum, s) => sum + (s.expense || 0), 0);
    return { income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense };
  }, [sites]);

  // Open add modal
  const handleAdd = () => {
    setEditingSite(null);
    setForm({ name: '', location: '', progress: '0', income: '', expense: '' });
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleEdit = (site: SiteData) => {
    setEditingSite(site);
    setForm({
      name: site.name,
      location: site.location,
      progress: String(site.progress),
      income: String(site.income),
      expense: String(site.expense),
    });
    setIsModalOpen(true);
  };

  // Delete
  const handleDelete = (id: string) => {
    setSites((prev) => prev.filter((s) => s.id !== id));
    if (selectedSiteId === id) setSelectedSiteId('all');
    toast.success('Site removed successfully');
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const incomeVal = Number(form.income) || 0;
    const expenseVal = Number(form.expense) || 0;

    if (!form.name.trim()) {
      toast.error('Site name is required');
      return;
    }

    if (editingSite) {
      setSites((prev) =>
        prev.map((s) =>
          s.id === editingSite.id
            ? {
                ...s,
                name: form.name.trim(),
                location: form.location.trim(),
                progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
                income: incomeVal,
                expense: expenseVal,
              }
            : s
        )
      );
      toast.success('Site updated successfully');
    } else {
      const newSite: SiteData = {
        id: generateId(),
        name: form.name.trim(),
        location: form.location.trim(),
        progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
        income: incomeVal,
        expense: expenseVal,
      };
      setSites((prev) => [...prev, newSite]);
      toast.success('New site added successfully');
    }

    setIsModalOpen(false);
    setEditingSite(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 md:p-8 pb-0"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white border border-violet-100/40 hover:bg-white/50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 font-heading flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#7C6EF0]" />
              Site-wise Profit / Loss Analysis
            </h1>
            <p className="text-xs text-slate-500 font-medium">Income vs Expense vs Net Profit per project site</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Site Filter Dropdown */}
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="clay-input py-2"
          >
            <option value="all">All Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.location || 'N/A'}
              </option>
            ))}
          </select>

          <button
            onClick={handleAdd}
            className="clay-btn px-4 py-2 text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Site
          </button>
        </div>
      </motion.div>

      {/* Summary KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-4 gap-4 px-4 md:px-8"
      >
        <div className="clay-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-clay-violet/10 flex items-center justify-center border border-violet-100/40 shadow-inner">
            <Building2 className="w-6 h-6 text-[#7C6EF0]" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Sites</span>
            <span className="text-2xl font-extrabold text-slate-800 font-heading">{sites.length}</span>
          </div>
        </div>
        <div className="clay-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-clay-green/10 flex items-center justify-center border border-[#5CB77E]/20 shadow-inner">
            <TrendingUp className="w-6 h-6 text-[#5CB77E]" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Income</span>
            <span className="text-2xl font-extrabold text-[#5CB77E] font-heading">{formatCurrency(totals.income)}</span>
          </div>
        </div>
        <div className="clay-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-clay-rose/10 flex items-center justify-center border border-[#E5636C]/20 shadow-inner">
            <TrendingDown className="w-6 h-6 text-[#E5636C]" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Expense</span>
            <span className="text-2xl font-extrabold text-[#E5636C] font-heading">{formatCurrency(totals.expense)}</span>
          </div>
        </div>
        <div className="clay-card p-4 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${totals.profit >= 0 ? 'bg-clay-blue/10 border-[#4EA8DE]/20' : 'bg-clay-amber/10 border-[#F2A65A]/20'}`}>
            <IndianRupee className={`w-6 h-6 ${totals.profit >= 0 ? 'text-[#4EA8DE]' : 'text-[#F2A65A]'}`} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Net Profit</span>
            <span className={`text-2xl font-extrabold font-heading ${totals.profit >= 0 ? 'text-[#4EA8DE]' : 'text-[#F2A65A]'}`}>
              {formatCurrency(totals.profit)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Bar Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="clay-card p-6 mx-4 md:mx-8"
      >
        <div className="flex items-center justify-between border-b border-violet-100/40 pb-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 font-heading">
              {selectedSiteId === 'all' ? 'All Sites — Grouped Bar Comparison' : `${chartSites[0]?.name || 'Site'} — Detailed Breakdown`}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Income (green) vs Expense (red) vs Net Profit (blue)</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#5CB77E] shadow-sm" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#E5636C] shadow-sm" /> Expense</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#4EA8DE] shadow-sm" /> Profit</span>
          </div>
        </div>

        {chartSites.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white/50 rounded-2xl border border-violet-100/30 border-dashed shadow-inner mx-4">
            <BarChart3 className="w-12 h-12 text-[#7C6EF0] opacity-30" />
            <p className="text-sm font-bold">No sites to display</p>
            <p className="text-xs font-medium">Add your first site to see the profit/loss chart</p>
          </div>
        ) : (
          <div
            className="flex items-end justify-around gap-4 px-2"
            style={{ height: '340px' }}
          >
            {chartSites.map((s) => {
              const profit = s.income - s.expense;
              const absProfit = Math.abs(profit);
              const incH = maxValue > 0 ? (s.income / maxValue) * 100 : 0;
              const expH = maxValue > 0 ? (s.expense / maxValue) * 100 : 0;
              const profH = maxValue > 0 ? (absProfit / maxValue) * 100 : 0;

              return (
                <div
                  key={s.id}
                  className="flex-1 max-w-[160px] flex flex-col items-center gap-3 group"
                >
                  {/* Bars Container */}
                  <div className="h-[280px] w-full flex items-end justify-center gap-2 px-2 bg-white/50 rounded-2xl pt-3 relative border border-violet-100/30 shadow-inner">
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-mono px-3 py-1.5 rounded-lg shadow-xl pointer-events-none z-10 whitespace-nowrap font-bold">
                      {s.name}: {profit >= 0 ? '+' : ''}{formatCurrency(profit)} Profit
                    </div>
                    {/* Income Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(incH, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="w-5 sm:w-8 bg-[#5CB77E] rounded-t-lg hover:brightness-110 transition-all duration-300 cursor-pointer shadow-md"
                      title={`Income: ${formatCurrency(s.income)}`}
                    />
                    {/* Expense Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(expH, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                      className="w-5 sm:w-8 bg-[#E5636C] rounded-t-lg hover:brightness-110 transition-all duration-300 cursor-pointer shadow-md"
                      title={`Expense: ${formatCurrency(s.expense)}`}
                    />
                    {/* Profit Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(profH, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                      className={`w-5 sm:w-8 rounded-t-lg hover:brightness-110 transition-all duration-300 cursor-pointer shadow-md ${profit >= 0 ? 'bg-[#4EA8DE]' : 'bg-[#F2A65A]'}`}
                      title={`Profit: ${formatCurrency(profit)}`}
                    />
                  </div>
                  {/* Label */}
                  <div className="text-center">
                    <span className="text-[11px] font-bold text-slate-800 leading-tight block uppercase tracking-wider">{s.name}</span>
                    {s.location && (
                      <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-[#E5636C]" /> {s.location}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {chartSites.length > 0 && (
          <div className="text-[11px] text-slate-500 font-medium text-center mt-6 pt-4 border-t border-violet-100/40">
            Hover over grouped bars for detailed profit figures. Bars scale relative to the highest value.
          </div>
        )}
      </motion.div>

      {/* Summary Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="clay-card overflow-hidden mx-4 md:mx-8"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-violet-100/40">
          <div>
            <h3 className="text-base font-bold text-slate-800 font-heading">Site Financial Summary</h3>
            <p className="text-[11px] text-slate-500 font-medium">{sites.length} site{sites.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-xl border border-dashed border-[#7C6EF0]/40 bg-clay-violet/10 hover:bg-clay-violet/20 text-[#7C6EF0] text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Site
          </button>
        </div>

        {sites.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-white/50 m-4 rounded-2xl border border-violet-100/30 border-dashed shadow-inner">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-[#7C6EF0] opacity-40" />
            <p className="text-sm font-bold">No sites added yet</p>
            <p className="text-xs mt-1 font-medium">Click "+ Add Site" to begin tracking profit and loss</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/50">
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Site Name</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-[#5CB77E] uppercase tracking-wider">Income (₹)</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-[#E5636C] uppercase tracking-wider">Expense (₹)</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-[#4EA8DE] uppercase tracking-wider">Profit (₹)</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Profit %</th>
                  <th className="text-center py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/40">
                {sites.map((site) => {
                  const profit = site.income - site.expense;
                  const profitPct = site.income > 0 ? ((profit / site.income) * 100) : 0;

                  return (
                    <tr key={site.id} className="hover:bg-white/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-clay-violet/10 flex items-center justify-center border border-violet-100/40 shadow-sm">
                            <Building2 className="w-5 h-5 text-[#7C6EF0]" />
                          </div>
                          <span className="font-bold text-slate-800 font-heading text-base">{site.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-xs bg-white border border-violet-100/30 px-2 py-1 rounded-lg w-fit shadow-sm">
                          <MapPin className="w-3.5 h-3.5 text-[#E5636C]" /> {site.location || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-[#5CB77E]">
                        {formatCurrency(site.income)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-[#E5636C]">
                        {formatCurrency(site.expense)}
                      </td>
                      <td className={`py-4 px-4 text-right font-mono font-bold ${profit >= 0 ? 'text-[#4EA8DE]' : 'text-[#F2A65A]'}`}>
                        {formatCurrency(profit)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          profitPct >= 0
                            ? 'bg-clay-blue/10 text-[#4EA8DE] border-[#4EA8DE]/30'
                            : 'bg-clay-amber/10 text-[#F2A65A] border-[#F2A65A]/30'
                        }`}>
                          {profitPct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {profitPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(site)}
                            className="p-2 rounded-xl text-slate-400 hover:text-[#7C6EF0] hover:bg-clay-violet/10 border border-transparent hover:border-violet-100/40 transition-all shadow-sm"
                            title="Edit site"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(site.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-[#E5636C] hover:bg-clay-rose/10 border border-transparent hover:border-[#E5636C]/30 transition-all shadow-sm"
                            title="Delete site"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals Footer */}
              <tfoot>
                <tr className="bg-white/50 border-t border-violet-100/40 shadow-sm">
                  <td className="py-4 px-6 font-extrabold text-slate-800 font-heading uppercase tracking-wider" colSpan={2}>
                    Grand Total
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-extrabold text-[#5CB77E] text-lg">
                    {formatCurrency(totals.income)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-extrabold text-[#E5636C] text-lg">
                    {formatCurrency(totals.expense)}
                  </td>
                  <td className={`py-4 px-4 text-right font-mono font-extrabold text-lg ${totals.profit >= 0 ? 'text-[#4EA8DE]' : 'text-[#F2A65A]'}`}>
                    {formatCurrency(totals.profit)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border ${
                      totals.profit >= 0
                        ? 'bg-clay-blue/10 text-[#4EA8DE] border-[#4EA8DE]/30'
                        : 'bg-clay-amber/10 text-[#F2A65A] border-[#F2A65A]/30'
                    }`}>
                      {totals.income > 0 ? ((totals.profit / totals.income) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </td>
                  <td className="py-4 px-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="clay-card w-full max-w-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-violet-100/40 pb-4">
              <h3 className="text-xl font-bold text-slate-800 font-heading">
                {editingSite ? 'Edit Site' : 'Add New Site'}
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setEditingSite(null); }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors shadow-sm bg-white/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Site Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sai Villa"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="clay-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Kolhapur"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="clay-input"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0 – 100"
                  value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: e.target.value })}
                  className="clay-input font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Income (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 720000"
                    value={form.income}
                    onChange={(e) => setForm({ ...form, income: e.target.value })}
                    className="clay-input font-mono font-bold text-[#5CB77E]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Expense (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 450000"
                    value={form.expense}
                    onChange={(e) => setForm({ ...form, expense: e.target.value })}
                    className="clay-input font-mono font-bold text-[#E5636C]"
                  />
                </div>
              </div>

              {/* Auto-calculated Profit Preview */}
              {(form.income || form.expense) && (
                <div className="rounded-xl bg-white/50 border border-violet-100/40 p-4 flex items-center justify-between shadow-inner mt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Calculated Profit:</span>
                  <span className={`text-lg font-extrabold font-mono ${
                    (Number(form.income) || 0) - (Number(form.expense) || 0) >= 0 ? 'text-[#4EA8DE]' : 'text-[#F2A65A]'
                  }`}>
                    {formatCurrency((Number(form.income) || 0) - (Number(form.expense) || 0))}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-violet-100/40">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingSite(null); }}
                  className="px-5 py-2.5 rounded-xl border border-violet-100/40 text-slate-600 hover:bg-white text-sm font-bold shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="clay-btn px-6 py-2.5"
                >
                  <span className="font-bold">{editingSite ? 'Update Site' : 'Add Site'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
