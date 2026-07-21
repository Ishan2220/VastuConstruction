import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  PieChart,
  Download,
  Calendar as CalendarIcon,
  Filter,
  ArrowUpRight,
  Calculator,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const { data: finSummary, isLoading: finLoading } = useQuery({
    queryKey: ['fin-summary', dateRange],
    queryFn: async () => {
      const query = dateRange.startDate && dateRange.endDate
        ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
        : '';
      const { data } = await api.get(`/reports/financial${query}`);
      return data.data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: projectReports = [], isLoading: projLoading } = useQuery({
    queryKey: ['project-reports'],
    queryFn: async () => {
      const { data } = await api.get('/reports/projects');
      return data.data || [];
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  if (finLoading || projLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-200/50 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-slate-200/50 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-8 min-h-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Executive Financial & Project Analytics
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Audited P&L statements, GST reconciliation, cashflow telemetry, and margin reports.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="clay-btn inline-flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF Report</span>
        </button>
      </div>

      {/* Financial Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="clay-card p-6 space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Contract Inflow</span>
            <TrendingUp className="w-4 h-4 text-[#5CB77E]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800 font-heading">
            {formatCurrency(finSummary?.totalIncome || 0)}
          </div>
          <div className="text-xs font-semibold text-[#5CB77E]">Actual logged inflows</div>
        </div>

        <div className="clay-card p-6 space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Site & Procurement Outflow</span>
            <TrendingDown className="w-4 h-4 text-[#E5636C]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800 font-heading">
            {formatCurrency(finSummary?.totalExpense || 0)}
          </div>
          <div className="text-xs font-semibold text-slate-500">Includes materials & labour</div>
        </div>

        <div className="clay-card p-6 space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Net Operating Profit</span>
            <BarChart3 className="w-4 h-4 text-[#7C6EF0]" />
          </div>
          <div className="text-2xl font-extrabold text-[#7C6EF0] font-heading">
            {formatCurrency(finSummary?.netProfit || 0)}
          </div>
          <div className="text-xs font-semibold text-[#7C6EF0]">Calculated operating balance</div>
        </div>

        <div className="clay-card p-6 space-y-2">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Net GST Payable</span>
            <Calculator className="w-4 h-4 text-[#F2A65A]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800 font-heading">
            {formatCurrency(finSummary?.gstSummary?.netPayable || 0)}
          </div>
          <div className="text-xs font-semibold text-[#F2A65A]">Output tax minus input tax credit</div>
        </div>
      </div>

      {/* Project Wise P&L Table */}
      <div className="clay-card !p-0 overflow-hidden">
        <div className="p-6 border-b border-violet-100/40 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-heading">Project Profitability Analysis</h3>
            <p className="text-xs text-slate-600">Real-time breakdown by individual client contract</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-100/30 text-xs font-bold uppercase text-slate-500">
                <th className="p-4">Project Contract</th>
                <th className="p-4">Client</th>
                <th className="p-4">Contract Value</th>
                <th className="p-4">Total Inflow</th>
                <th className="p-4">Total Outflow</th>
                <th className="p-4">Net Profit Margin</th>
                <th className="p-4">Site Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100/30 text-sm">
              {projectReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">No project financial summaries logged yet.</td>
                </tr>
              ) : (
                projectReports.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/60 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{p.name}</td>
                    <td className="p-4 font-semibold text-slate-600">{p.clientName}</td>
                    <td className="p-4 font-heading font-bold text-slate-800">{formatCurrency(p.contractValue)}</td>
                    <td className="p-4 font-heading font-bold text-[#5CB77E]">{formatCurrency(p.totalIncome)}</td>
                    <td className="p-4 font-heading font-bold text-[#E5636C]">{formatCurrency(p.totalExpense)}</td>
                    <td className="p-4 font-heading font-extrabold text-[#7C6EF0]">{formatCurrency(p.profit)}</td>
                    <td className="p-4 font-heading font-bold text-slate-800">{p.progress}%</td>
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
