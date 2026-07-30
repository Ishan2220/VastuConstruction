import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  IndianRupee,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router';
import api from '@/lib/api';

interface SiteData {
  id: string;
  name: string;
  clientName: string;
  progress: number;
  totalIncome: number;
  totalExpense: number;
  profit: number;
}

export default function SiteProfitLossPage() {
  const navigate = useNavigate();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['reports-projects-financial'],
    queryFn: async () => {
      const { data } = await api.get('/reports/projects');
      return data.data || [];
    },
  });

  useEffect(() => {
    if (sites.length > 0 && selectedSiteId === 'all') {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  // Derived filtered data for the chart
  const chartSites = useMemo(() => {
    if (selectedSiteId === 'all') return sites;
    return sites.filter((s: SiteData) => s.id === selectedSiteId);
  }, [sites, selectedSiteId]);

  // Max value for bar scaling
  const maxValue = useMemo(() => {
    if (chartSites.length === 0) return 1;
    let m = 0;
    for (const s of chartSites) {
      m = Math.max(m, s.totalIncome, s.totalExpense, Math.abs(s.profit));
    }
    return m || 1;
  }, [chartSites]);

  // Totals
  const totals = useMemo(() => {
    const totalIncome = sites.reduce((sum: number, s: SiteData) => sum + (s.totalIncome || 0), 0);
    const totalExpense = sites.reduce((sum: number, s: SiteData) => sum + (s.totalExpense || 0), 0);
    return { income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense };
  }, [sites]);

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
            onClick={() => navigate(-1)}
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
            {sites.length === 0 && <option value="all">No Sites Available</option>}
            {sites.map((s: SiteData) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.clientName || 'N/A'}
              </option>
            ))}
          </select>
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
              {chartSites[0]?.name || 'Site'} — Detailed Breakdown
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Income (green) vs Expense (red) vs Net Profit (blue)</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center"><span className="w-3 h-3 rounded-md bg-[#5CB77E] shadow-sm" /> Income</span>
            <span className="flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center"><span className="w-3 h-3 rounded-md bg-[#E5636C] shadow-sm" /> Expense</span>
            <span className="flex items-center gap-2 min-w-[44px] min-h-[44px] flex items-center justify-center"><span className="w-3 h-3 rounded-md bg-[#4EA8DE] shadow-sm" /> Profit</span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white/50 rounded-2xl border border-violet-100/30 border-dashed shadow-inner mx-4 animate-pulse">
            <BarChart3 className="w-12 h-12 text-[#7C6EF0] opacity-30" />
            <p className="text-sm font-bold">Loading site data...</p>
          </div>
        ) : chartSites.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white/50 rounded-2xl border border-violet-100/30 border-dashed shadow-inner mx-4">
            <BarChart3 className="w-12 h-12 text-[#7C6EF0] opacity-30" />
            <p className="text-sm font-bold">No sites to display</p>
            <p className="text-xs font-medium">Add projects to see the profit/loss chart</p>
          </div>
        ) : (
          <div
            className="flex items-end justify-around gap-4 px-2 overflow-x-auto pb-4"
            style={{ height: '340px' }}
          >
            {chartSites.map((s: SiteData) => {
              const absProfit = Math.abs(s.profit);
              const incH = maxValue > 0 ? (s.totalIncome / maxValue) * 100 : 0;
              const expH = maxValue > 0 ? (s.totalExpense / maxValue) * 100 : 0;
              const profH = maxValue > 0 ? (absProfit / maxValue) * 100 : 0;

              return (
                <div
                  key={s.id}
                  className="flex-1 min-w-[120px] max-w-[160px] flex flex-col items-center gap-3 group"
                >
                  {/* Bars Container */}
                  <div className="h-[280px] w-full flex items-end justify-center gap-2 px-2 bg-white/50 rounded-2xl pt-3 relative border border-violet-100/30 shadow-inner">
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-mono px-3 py-1.5 rounded-lg shadow-xl pointer-events-none z-10 whitespace-nowrap font-bold">
                      {s.name}: {s.profit >= 0 ? '+' : ''}{formatCurrency(s.profit)} Profit
                    </div>
                    {/* Income Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(incH, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="w-5 sm:w-8 bg-[#5CB77E] rounded-t-lg hover:brightness-110 transition-all duration-300 cursor-pointer shadow-md"
                      title={`Income: ${formatCurrency(s.totalIncome)}`}
                    />
                    {/* Expense Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(expH, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                      className="w-5 sm:w-8 bg-[#E5636C] rounded-t-lg hover:brightness-110 transition-all duration-300 cursor-pointer shadow-md"
                      title={`Expense: ${formatCurrency(s.totalExpense)}`}
                    />
                    {/* Profit Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(profH, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                      className={`w-5 sm:w-8 rounded-t-lg hover:brightness-110 transition-all duration-300 cursor-pointer shadow-md ${s.profit >= 0 ? 'bg-[#4EA8DE]' : 'bg-[#F2A65A]'}`}
                      title={`Profit: ${formatCurrency(s.profit)}`}
                    />
                  </div>
                  {/* Label */}
                  <div className="text-center w-full truncate">
                    <span className="text-[11px] font-bold text-slate-800 leading-tight block uppercase tracking-wider truncate" title={s.name}>{s.name}</span>
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
            <p className="text-[11px] text-slate-500 font-medium">{sites.length} site{sites.length !== 1 ? 's' : ''} tracked</p>
          </div>
        </div>

        {sites.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-white/50 m-4 rounded-2xl border border-violet-100/30 border-dashed shadow-inner">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-[#7C6EF0] opacity-40" />
            <p className="text-sm font-bold">No sites tracked yet</p>
            <p className="text-xs mt-1 font-medium">Create a project to begin tracking profit and loss</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/50">
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Site Name</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-[#5CB77E] uppercase tracking-wider">Income (₹)</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-[#E5636C] uppercase tracking-wider">Expense (₹)</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-[#4EA8DE] uppercase tracking-wider">Profit (₹)</th>
                  <th className="text-right py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Profit %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/40">
                {sites.map((site: SiteData) => {
                  const profitPct = site.totalIncome > 0 ? ((site.profit / site.totalIncome) * 100) : 0;

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
                      <td className="py-4 px-4 text-right font-mono font-bold text-[#5CB77E]">
                        {formatCurrency(site.totalIncome)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-[#E5636C]">
                        {formatCurrency(site.totalExpense)}
                      </td>
                      <td className={`py-4 px-4 text-right font-mono font-bold ${site.profit >= 0 ? 'text-[#4EA8DE]' : 'text-[#F2A65A]'}`}>
                        {formatCurrency(site.profit)}
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
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals Footer */}
              <tfoot>
                <tr className="bg-white/50 border-t border-violet-100/40 shadow-sm">
                  <td className="py-4 px-6 font-extrabold text-slate-800 font-heading uppercase tracking-wider">
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
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
