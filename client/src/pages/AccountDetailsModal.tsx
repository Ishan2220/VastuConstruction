import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ArrowDownRight, ArrowUpRight, FileText, Calendar as CalendarIcon, Wallet, Search } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

const clayCard = "bg-[#f8fafc] rounded-[24px] shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff,inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.02)] border border-white/50";

interface AccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
}

export function AccountDetailsModal({ isOpen, onClose, accountId }: AccountDetailsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: account, isLoading, isError } = useQuery({
    queryKey: ['bank-account-details', accountId],
    queryFn: async () => {
      if (!accountId) return null;
      const res = await api.get(`/bank-accounts/${accountId}`);
      return res.data?.data;
    },
    enabled: !!accountId && isOpen,
  });

  const transactions = useMemo(() => {
    if (!account) return [];
    const incomes = (account.incomes || []).map((inc: any) => ({
      ...inc,
      _trxType: 'INCOME',
      _amount: inc.amount,
      _date: new Date(inc.paymentDate).getTime(),
      _title: `Payment from ${inc.client?.name || 'Client'}`,
    }));
    const expenses = (account.expenses || []).map((exp: any) => ({
      ...exp,
      _trxType: 'EXPENSE',
      _amount: exp.amount,
      _date: new Date(exp.paymentDate).getTime(),
      _title: `Payment to ${exp.vendor?.name || 'Vendor'} - ${exp.type}`,
    }));
    
    return [...incomes, ...expenses].sort((a, b) => b._date - a._date);
  }, [account]);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    const lower = searchTerm.toLowerCase();
    return transactions.filter(t => 
      t._title.toLowerCase().includes(lower) || 
      (t.description || '').toLowerCase().includes(lower) ||
      (t.reference || '').toLowerCase().includes(lower)
    );
  }, [transactions, searchTerm]);

  // Reset search on close
  useEffect(() => {
    if (!isOpen) setSearchTerm('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-2xl bg-[#e2e8f0] h-full shadow-2xl flex flex-col overflow-hidden relative border-l border-white/50"
        >
          {/* Header */}
          <div className="flex-none p-6 bg-gradient-to-br from-[#7C6EF0] to-[#6558D3] text-white">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-heading">{account?.bankName || 'Loading...'}</h2>
                <p className="text-white/80 text-sm font-medium">A/C: {account?.accountNo || '---'}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {isLoading ? (
              <PageSkeleton />
            ) : isError ? (
              <ErrorState message="Failed to load account details" />
            ) : (
              <div className="space-y-6">
                
                {/* Summary Card */}
                <div className={cn(clayCard, "p-5 flex justify-between items-center bg-white")}>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Balance</div>
                    <div className="text-3xl font-black text-slate-800 font-mono tracking-tight">{formatCurrency(account.balance)}</div>
                  </div>
                  <div className="text-right text-sm font-medium text-slate-500 space-y-1">
                    <div>Total Incomes: <span className="text-emerald-600 font-bold ml-1">{account._count?.incomes || 0}</span></div>
                    <div>Total Expenses: <span className="text-rose-600 font-bold ml-1">{account._count?.expenses || 0}</span></div>
                  </div>
                </div>

                {/* Transactions Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 font-heading">Transaction Ledger</h3>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search by reference, name, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/60 border border-violet-100 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-400 font-medium text-slate-700 shadow-[inset_2px_2px_4px_rgba(163,177,198,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.7)]"
                  />
                </div>

                {/* Ledger Feed */}
                <div className="space-y-3">
                  {filteredTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-20 text-[#7C6EF0]" />
                      <p className="text-sm font-medium">No transactions found for this account.</p>
                    </div>
                  ) : (
                    filteredTransactions.map((trx: any) => (
                      <div key={trx.id} className="bg-white/70 p-4 rounded-2xl border border-white/50 shadow-[4px_4px_10px_rgba(163,177,198,0.2),-4px_-4px_10px_rgba(255,255,255,0.8)] hover:shadow-[inset_2px_2px_4px_rgba(163,177,198,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.7)] transition-all flex justify-between items-center group cursor-pointer gap-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                            trx._trxType === 'INCOME' 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                              : "bg-rose-50 border-rose-100 text-rose-600"
                          )}>
                            {trx._trxType === 'INCOME' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{trx._title}</div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" /> {formatDate(trx.paymentDate)}
                              </span>
                              {trx.reference && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">Ref: {trx.reference}</span>
                              )}
                            </div>
                            {trx.description && <div className="text-[11px] text-slate-400 mt-1 truncate max-w-[200px]">{trx.description}</div>}
                          </div>
                        </div>
                        <div className={cn(
                          "text-base font-bold font-mono tracking-tight text-right",
                          trx._trxType === 'INCOME' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {trx._trxType === 'INCOME' ? '+' : '-'}{formatCurrency(trx._amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
