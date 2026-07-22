import { Settings, Shield, UserCog } from 'lucide-react';
import { Link } from 'react-router';

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 font-heading">
            <Settings className="w-8 h-8 text-[#7C6EF0]" />
            System Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage global ERP configurations and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Link to="/settings/account" className="clay-card p-6 flex items-start gap-4 hover:shadow-lg hover:-translate-y-1 transition-all group">
          <div className="p-3 rounded-xl bg-violet-50 text-[#7C6EF0] group-hover:bg-[#7C6EF0] group-hover:text-white transition-colors">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-heading">My Account</h3>
            <p className="text-sm text-slate-500 mt-1">Update your personal profile, email, and password.</p>
          </div>
        </Link>

        <Link to="/settings/users" className="clay-card p-6 flex items-start gap-4 hover:shadow-lg hover:-translate-y-1 transition-all group">
          <div className="p-3 rounded-xl bg-rose-50 text-[#E5636C] group-hover:bg-[#E5636C] group-hover:text-white transition-colors">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 font-heading">User Management</h3>
            <p className="text-sm text-slate-500 mt-1">Manage employee accounts, roles, and system access.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
