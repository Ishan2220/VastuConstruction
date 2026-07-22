import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, Shield, Save, KeyRound, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Link } from 'react-router';

export default function AccountPage() {
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordMutation = useMutation({
    mutationFn: async () => {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
    },
    onSuccess: () => {
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update password');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-8 relative">
      {/* Background ambient blobs */}
      <div className="absolute top-[10%] left-[-5%] w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-5%] w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="border-b border-slate-200/50 pb-6">
        <h1 className="text-4xl font-extrabold font-heading text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl shadow-lg shadow-violet-200">
            <User className="w-8 h-8 text-white" />
          </div>
          My Account
        </h1>
        <p className="text-base text-slate-500 mt-3 max-w-xl">
          Manage your personal profile, security preferences, and view your system access level.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center text-center transition-all hover:shadow-[0_8px_30px_rgb(124,110,240,0.1)]">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500 rounded-full blur-xl opacity-20" />
              <div className="w-28 h-28 bg-gradient-to-br from-violet-50 to-fuchsia-50 text-violet-600 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-xl relative z-10">
                <User className="w-12 h-12" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold font-heading text-slate-800">{user?.name}</h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100/80 text-violet-700 text-xs font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              {user?.role}
            </div>
            
            <div className="w-full space-y-3 mt-8 text-left">
              <div className="flex items-center gap-4 text-slate-600 bg-white/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Address</p>
                  <p className="text-sm font-semibold text-slate-700 truncate">{user?.email}</p>
                </div>
              </div>
              
              {user?.role === 'ADMIN' ? (
                <Link to="/settings/users" className="group flex items-center gap-4 text-slate-600 bg-gradient-to-br from-rose-50 to-orange-50 p-4 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer">
                  <div className="p-2 bg-white rounded-xl text-rose-500 shadow-sm group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">System Access</p>
                    <p className="text-sm font-bold text-rose-700 truncate">Admin Management</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <div className="flex items-center gap-4 text-slate-600 bg-white/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">System Access</p>
                    <p className="text-sm font-semibold text-slate-700 truncate">{user?.role} Access</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full transition-all hover:shadow-[0_8px_30px_rgb(124,110,240,0.1)]">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100/80">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-heading text-slate-800">Security Settings</h2>
                <p className="text-sm text-slate-500 mt-1">Update your password to keep your account secure</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    className="w-full bg-white/80 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-3 text-sm transition-all shadow-sm"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                
                <div className="pt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    className="w-full bg-white/80 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-3 text-sm transition-all shadow-sm"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat new password"
                    className="w-full bg-white/80 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-3 text-sm transition-all shadow-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-3 px-8 rounded-xl shadow-[0_4px_14px_0_rgb(124,110,240,0.39)] hover:shadow-[0_6px_20px_rgba(124,110,240,0.23)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Save className="w-4 h-4" />
                  {passwordMutation.isPending ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
