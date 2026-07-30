import { Settings, Shield, UserCog, ChevronRight, Bell, Lock } from 'lucide-react';
import { Link } from 'react-router';

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto font-sans relative">
      {/* Background blobs for premium glassmorphism feel */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/40 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3 font-heading">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl shadow-lg shadow-violet-200">
              <Settings className="w-8 h-8 text-white animate-spin-slow" style={{ animationDuration: '4s' }} />
            </div>
            System Settings
          </h1>
          <p className="text-base text-slate-500 mt-3 max-w-xl">
            Manage global ERP configurations, organizational preferences, and your personal account settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Link to="/settings/account" className="block group relative bg-white/70 backdrop-blur-md border border-slate-200/60 p-6 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="relative flex items-start gap-5 pointer-events-none">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 text-slate-800 shadow-sm group-hover:scale-110 group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
              <UserCog className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800 font-heading group-hover:text-slate-900 transition-colors">My Account</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">Update your personal profile, email, password, and security preferences.</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-800 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link to="/settings/users" className="block group relative bg-white/70 backdrop-blur-md border border-slate-200/60 p-6 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="relative flex items-start gap-5 pointer-events-none">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 text-slate-800 shadow-sm group-hover:scale-110 group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
              <Shield className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800 font-heading group-hover:text-slate-900 transition-colors">Admin & User Management</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">Manage admin access, employee accounts, roles, and system permissions.</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-800 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link to="/settings/financial" className="block group relative bg-white/70 backdrop-blur-md border border-slate-200/60 p-6 rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="relative flex items-start gap-5 pointer-events-none">
            <div className="p-4 rounded-2xl bg-white border border-slate-100 text-slate-800 shadow-sm group-hover:scale-110 group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-indian-rupee"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-800 font-heading group-hover:text-slate-900 transition-colors">Financial & GST Settings</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">Manage GST configurations, flexible tax rules, and general financial preferences.</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-800 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        {/* Future expansion placeholders */}
        <div className="group relative bg-slate-50/50 backdrop-blur-xl border border-slate-200/50 p-6 rounded-3xl opacity-60 cursor-not-allowed">
          <div className="flex items-start gap-5">
            <div className="p-4 rounded-2xl bg-slate-100 text-slate-400">
              <Bell className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-600 font-heading">Notifications</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase tracking-wider">Coming Soon</span>
              </div>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">Configure email and push notification alerts for your modules.</p>
            </div>
          </div>
        </div>

        <div className="group relative bg-slate-50/50 backdrop-blur-xl border border-slate-200/50 p-6 rounded-3xl opacity-60 cursor-not-allowed">
          <div className="flex items-start gap-5">
            <div className="p-4 rounded-2xl bg-slate-100 text-slate-400">
              <Lock className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-600 font-heading">Security Policies</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase tracking-wider">Coming Soon</span>
              </div>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">Manage enterprise security rules, 2FA, and compliance controls.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
