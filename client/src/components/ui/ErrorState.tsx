import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export function ErrorState({ error, onRetry, message = "Something went wrong" }: { error?: any; onRetry?: () => void; message?: string }) {
  const errorMsg = error?.response?.data?.message || error?.message || message;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 shadow-sm border border-rose-100">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold font-heading text-slate-800 mb-2">Oops! An Error Occurred</h2>
      <p className="text-slate-500 max-w-md mb-8">{errorMsg}</p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="clay-btn inline-flex items-center gap-2 px-6 py-2.5"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
