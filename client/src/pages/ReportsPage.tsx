import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
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

  const [activeTab, setActiveTab] = useState<'analytics' | 'ledger'>('analytics');

  const ledgerEntries = useMemo(() => {
    const entries: any[] = [];
    if (finSummary?.incomeSources) {
      finSummary.incomeSources.forEach((i: any) => entries.push({
        id: i.id, date: new Date(i.paymentDate), type: 'INCOME', desc: i.notes || i.project?.name || 'General Income', amount: Number(i.amount)
      }));
    }
    if (finSummary?.expenses) {
      finSummary.expenses.forEach((e: any) => entries.push({
        id: e.id, date: new Date(e.paymentDate), type: 'EXPENSE', desc: e.notes || e.type, amount: Number(e.amount)
      }));
    }
    entries.sort((a,b) => a.date.getTime() - b.date.getTime());
    
    let balance = 0;
    return entries.map(entry => {
      if (entry.type === 'INCOME') balance += entry.amount;
      else balance -= entry.amount;
      return { ...entry, balance };
    });
  }, [finSummary]);

  const handleExportPDF = () => {
    toast.success('Generating Executive Report PDF...');
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(124, 110, 240);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('EXECUTIVE FINANCIAL REPORT', 14, 20);
      doc.setFontSize(10);
      doc.text('Vastu x ConstraCore ERP System', 14, 28);
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 150, 20);

      // Financial Summary Section
      doc.setFontSize(14);
      doc.setTextColor(124, 110, 240);
      doc.text('Key Performance Indicators', 14, 55);

      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(`Gross Contract Inflow: Rs. ${Number(finSummary?.totalIncome || 0).toLocaleString('en-IN')}`, 14, 65);
      doc.text(`Site & Procurement Outflow: Rs. ${Number(finSummary?.totalExpense || 0).toLocaleString('en-IN')}`, 14, 73);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Net Operating Profit: Rs. ${Number(finSummary?.netProfit || 0).toLocaleString('en-IN')}`, 14, 83);
      
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(`Net GST Payable: Rs. ${Number(finSummary?.gstSummary?.netPayable || 0).toLocaleString('en-IN')}`, 14, 91);

      // Ledger Table
      autoTable(doc, {
        startY: 105,
        headStyles: { fillColor: [124, 110, 240], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [250, 249, 255] },
        head: [['Date', 'Type', 'Description', 'Amount (INR)', 'Running Balance (INR)']],
        body: ledgerEntries.map(entry => [
          formatDate(entry.date.toISOString()),
          entry.type,
          entry.desc,
          Number(entry.amount).toLocaleString('en-IN'),
          Number(entry.balance).toLocaleString('en-IN')
        ]),
        theme: 'striped',
        margin: { top: 10, left: 14, right: 14 }
      });

      doc.save(`Financial_Report_${format(new Date(), 'dd-MMM-yyyy')}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-8 space-y-8 min-h-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-heading">
            Executive Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Audited P&L statements, GST reconciliation, cashflow telemetry, and running ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-[#7C6EF0] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'ledger' ? 'bg-[#7C6EF0] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Ledger
          </button>
          <button
            onClick={handleExportPDF}
            className="clay-btn inline-flex items-center gap-2 ml-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <>
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
              <div className="text-xs font-semibold text-[#E5636C]">Total expenses across projects</div>
            </div>

            <div className="clay-card p-6 space-y-2">
              <div className="flex justify-between items-center text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Net Operating Profit</span>
                <BarChart3 className="w-4 h-4 text-[#7C6EF0]" />
              </div>
              <div className="text-2xl font-extrabold text-slate-800 font-heading">
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
        </>
      ) : (
        <div className="clay-card !p-0 overflow-hidden">
          <div className="p-6 border-b border-violet-100/40 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800 font-heading">Journal / Ledger</h3>
              <p className="text-xs text-slate-600">Chronological list of all financial transactions</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-violet-100/30 text-xs font-bold uppercase text-slate-500">
                  <th className="p-4">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Credit (In)</th>
                  <th className="p-4">Debit (Out)</th>
                  <th className="p-4">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100/30 text-sm">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">No ledger entries found.</td>
                  </tr>
                ) : (
                  ledgerEntries.map((e: any) => (
                    <tr key={e.id} className="hover:bg-white/60 transition-colors">
                      <td className="p-4 whitespace-nowrap text-slate-600">{e.date.toLocaleDateString()}</td>
                      <td className="p-4 text-slate-800">{e.desc}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${e.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {e.type}
                        </span>
                      </td>
                      <td className="p-4 font-heading font-bold text-[#5CB77E]">{e.type === 'INCOME' ? formatCurrency(e.amount) : '-'}</td>
                      <td className="p-4 font-heading font-bold text-[#E5636C]">{e.type === 'EXPENSE' ? formatCurrency(e.amount) : '-'}</td>
                      <td className="p-4 font-heading font-extrabold text-[#7C6EF0]">{formatCurrency(e.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
