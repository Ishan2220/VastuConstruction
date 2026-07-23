import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  X, 
  IndianRupee, 
  Calendar, 
  CreditCard, 
  User, 
  Building2, 
  Briefcase,
  FileText,
  Clock
} from 'lucide-react';
import type { PaymentHistoryRecord } from '@/types';
import { cn } from '@/lib/utils';

interface PaymentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentHistoryRecord | null;
}

export default function PaymentDetailDrawer({ isOpen, onClose, payment }: PaymentDetailDrawerProps) {
  if (!payment) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800">Payment Details</h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Amount Card */}
              <div className={cn(
                "rounded-xl p-6 text-center shadow-sm border",
                payment.direction === 'INFLOW' 
                  ? "bg-emerald-50 border-emerald-100" 
                  : "bg-rose-50 border-rose-100"
              )}>
                <div className="inline-flex items-center justify-center rounded-full bg-white p-3 shadow-sm mb-3">
                  <IndianRupee className={cn(
                    "h-8 w-8",
                    payment.direction === 'INFLOW' ? "text-emerald-600" : "text-rose-600"
                  )} />
                </div>
                <h3 className={cn(
                  "text-3xl font-bold tracking-tight mb-1",
                  payment.direction === 'INFLOW' ? "text-emerald-700" : "text-rose-700"
                )}>
                  {payment.direction === 'INFLOW' ? '+' : '-'}₹{payment.amount.toLocaleString('en-IN')}
                </h3>
                <p className={cn(
                  "text-sm font-medium",
                  payment.direction === 'INFLOW' ? "text-emerald-600/80" : "text-rose-600/80"
                )}>
                  {payment.paymentType}
                </p>
                <div className="mt-4 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white shadow-sm border">
                  <span className={cn(
                    "h-2 w-2 rounded-full mr-2",
                    payment.status === 'COMPLETED' ? "bg-emerald-500" :
                    payment.status === 'PENDING' ? "bg-amber-500" :
                    payment.status === 'CANCELLED' ? "bg-rose-500" : "bg-blue-500"
                  )} />
                  {payment.status}
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Transaction Information</h4>
                
                <DetailRow icon={Calendar} label="Date" value={format(new Date(payment.paymentDate), 'dd MMM yyyy')} />
                <DetailRow icon={CreditCard} label="Payment Method" value={payment.paymentMethod} />
                
                {payment.reference && (
                  <DetailRow icon={FileText} label="Reference" value={payment.reference} />
                )}

                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-6 mb-2">Entity Details</h4>

                {payment.clientName && (
                  <DetailRow icon={User} label="Client" value={payment.clientName} />
                )}
                {payment.vendorName && (
                  <DetailRow icon={Building2} label="Vendor" value={payment.vendorName} />
                )}
                {payment.employeeName && (
                  <DetailRow icon={User} label="Employee" value={payment.employeeName} />
                )}
                {payment.labourName && (
                  <DetailRow icon={User} label="Labour" value={payment.labourName} />
                )}
                {payment.projectName && (
                  <DetailRow icon={Briefcase} label="Project" value={payment.projectName} />
                )}
                {payment.accountName && (
                  <DetailRow icon={Building2} label="Account" value={`${payment.accountName} ${payment.accountNo ? '(' + payment.accountNo + ')' : ''}`} />
                )}

                {(payment.remarks || payment.createdByName) && (
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-6 mb-2">Additional Info</h4>
                )}

                {payment.remarks && (
                  <DetailRow icon={FileText} label="Remarks" value={payment.remarks} />
                )}
                {payment.createdByName && (
                  <DetailRow icon={User} label="Created By" value={payment.createdByName} />
                )}
                <DetailRow icon={Clock} label="Created At" value={format(new Date(payment.createdAt), 'dd MMM yyyy, hh:mm a')} />
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className="mt-0.5 rounded-md bg-white p-1.5 shadow-sm">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
