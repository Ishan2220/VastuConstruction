import { FileQuestion, Home } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-clay-violet/10">
      <div className="clay-card p-12 text-center space-y-6 max-w-md w-full">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-white/60 rounded-3xl flex items-center justify-center shadow-sm border border-violet-100/40 text-[#7C6EF0]">
            <FileQuestion className="w-10 h-10" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-800 font-heading">404</h1>
          <h2 className="text-xl font-bold text-slate-700 font-heading">Page Not Found</h2>
          <p className="text-sm text-slate-500">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="clay-btn w-full flex items-center justify-center gap-2 py-3"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
