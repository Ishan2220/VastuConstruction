import type { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
  };
  className?: string;
  showBack?: boolean;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function PageHeader({ title, description, children, action, className, showBack = true, breadcrumbs }: PageHeaderProps) {
  const navigate = useNavigate();
  const isDashboard = title.toLowerCase().includes('dashboard');

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4", className)}>
      <div className="space-y-1.5">
        {showBack && !isDashboard && (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs transition-all border border-slate-200/80 shadow-2xs mb-1 group"
            title="Go Back"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Previous Page</span>
          </button>
        )}
        
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-2">
            <Link to="/" className="text-slate-400 hover:text-indigo-600 transition-colors">
              <Home className="w-3.5 h-3.5" />
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-slate-300" />
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-indigo-600 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-800 font-bold">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
        )}
        
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-heading">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {action && (
          <Button onClick={action.onClick} className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-sm rounded-xl px-4 py-2">
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
