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
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Site-wise Profit / Loss Analysis
            </h1>
            <p className="text-xs text-slate-500">Income vs Expense vs Net Profit per project site</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Site Filter Dropdown */}
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
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
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md transition-all flex items-center gap-1.5"
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
        className="grid grid-cols-1 sm:grid-cols-4 gap-4"
      >
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Sites</span>
            <span className="text-xl font-extrabold text-slate-900 font-heading">{sites.length}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Income</span>
            <span className="text-xl font-extrabold text-emerald-700 font-heading">{formatCurrency(totals.income)}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Expense</span>
            <span className="text-xl font-extrabold text-rose-700 font-heading">{formatCurrency(totals.expense)}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totals.profit >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
            <IndianRupee className={`w-5 h-5 ${totals.profit >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Net Profit</span>
            <span className={`text-xl font-extrabold font-heading ${totals.profit >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
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
        className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              {selectedSiteId === 'all' ? 'All Sites — Grouped Bar Comparison' : `${chartSites[0]?.name || 'Site'} — Detailed Breakdown`}
            </h3>
            <p className="text-[11px] text-slate-400">Income (green) vs Expense (red) vs Net Profit (blue)</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Income</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-500" /> Expense</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-600" /> Profit</span>
          </div>
        </div>

        {chartSites.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-3">
            <BarChart3 className="w-12 h-12 text-slate-300" />
            <p className="text-sm font-semibold">No sites to display</p>
            <p className="text-xs">Add your first site to see the profit/loss chart</p>
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
                  className="flex-1 max-w-[160px] flex flex-col items-center gap-2 group"
                >
                  {/* Bars Container */}
                  <div className="h-[280px] w-full flex items-end justify-center gap-1.5 px-1 bg-slate-50/60 rounded-xl pt-3 relative">
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono px-3 py-1.5 rounded-lg shadow-xl pointer-events-none z-10 whitespace-nowrap">
                      {s.name}: {profit >= 0 ? '+' : ''}{formatCurrency(profit)} Profit
                    </div>
                    {/* Income Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(incH, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="w-5 sm:w-7 bg-emerald-500 rounded-t hover:brightness-110 transition-all duration-300 cursor-pointer"
                      title={`Income: ${formatCurrency(s.income)}`}
                    />
                    {/* Expense Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(expH, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                      className="w-5 sm:w-7 bg-rose-500 rounded-t hover:brightness-110 transition-all duration-300 cursor-pointer"
                      title={`Expense: ${formatCurrency(s.expense)}`}
                    />
                    {/* Profit Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(profH, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                      className={`w-5 sm:w-7 rounded-t hover:brightness-110 transition-all duration-300 cursor-pointer ${profit >= 0 ? 'bg-blue-600' : 'bg-amber-500'}`}
                      title={`Profit: ${formatCurrency(profit)}`}
                    />
                  </div>
                  {/* Label */}
                  <div className="text-center">
                    <span className="text-[11px] font-bold text-slate-700 leading-tight block">{s.name}</span>
                    {s.location && (
                      <span className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {s.location}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {chartSites.length > 0 && (
          <div className="text-[11px] text-slate-400 text-center mt-4 pt-3 border-t border-slate-100">
            Hover over grouped bars for detailed profit figures. Bars scale relative to the highest value.
          </div>
        )}
      </motion.div>

      {/* Summary Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">Site Financial Summary</h3>
            <p className="text-[11px] text-slate-400">{sites.length} site{sites.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Site
          </button>
        </div>

        {sites.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No sites added yet</p>
            <p className="text-xs mt-1">Click "+ Add Site" to begin tracking profit and loss</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="text-left py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Site Name</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-emerald-600 uppercase tracking-wider">Income (₹)</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-rose-600 uppercase tracking-wider">Expense (₹)</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-blue-600 uppercase tracking-wider">Profit (₹)</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Profit %</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sites.map((site) => {
                  const profit = site.income - site.expense;
                  const profitPct = site.income > 0 ? ((profit / site.income) * 100) : 0;

                  return (
                    <tr key={site.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="font-bold text-slate-900 font-heading">{site.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3 text-slate-400" /> {site.location || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(site.income)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                        {formatCurrency(site.expense)}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${profit >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                        {formatCurrency(profit)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                          profitPct >= 0
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {profitPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {profitPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(site)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit site"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(site.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
                <tr className="bg-slate-50/80 border-t-2 border-slate-200">
                  <td className="py-3 px-6 font-bold text-slate-900 font-heading" colSpan={2}>
                    Grand Total
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700">
                    {formatCurrency(totals.income)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-rose-700">
                    {formatCurrency(totals.expense)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-extrabold ${totals.profit >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                    {formatCurrency(totals.profit)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                      totals.profit >= 0
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {totals.income > 0 ? ((totals.profit / totals.income) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </td>
                  <td className="py-3 px-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                {editingSite ? 'Edit Site' : 'Add New Site'}
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setEditingSite(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Site Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sai Villa"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Kolhapur"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0 – 100"
                  value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Income (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 720000"
                    value={form.income}
                    onChange={(e) => setForm({ ...form, income: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Expense (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 450000"
                    value={form.expense}
                    onChange={(e) => setForm({ ...form, expense: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Auto-calculated Profit Preview */}
              {(form.income || form.expense) && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Calculated Profit:</span>
                  <span className={`text-sm font-extrabold font-mono ${
                    (Number(form.income) || 0) - (Number(form.expense) || 0) >= 0 ? 'text-blue-700' : 'text-amber-700'
                  }`}>
                    {formatCurrency((Number(form.income) || 0) - (Number(form.expense) || 0))}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingSite(null); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md"
                >
                  {editingSite ? 'Update Site' : 'Add Site'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
