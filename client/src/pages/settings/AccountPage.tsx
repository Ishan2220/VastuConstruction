import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, Shield, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

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
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-heading text-slate-800">My Account</h1>
        <p className="text-slate-500 mt-1">Manage your personal information and security</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="clay-card p-6 bg-white flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-clay-violet/10 text-clay-violet rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <User className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-bold font-heading text-slate-800">{user?.name}</h2>
            <p className="text-slate-500 font-medium mb-4">{user?.role}</p>
            
            <div className="w-full space-y-3 mt-2 text-left">
              <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Mail className="w-5 h-5 text-slate-400" />
                <span className="text-sm truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Shield className="w-5 h-5 text-slate-400" />
                <span className="text-sm">{user?.role} Access</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="clay-card p-8 bg-white">
            <h2 className="text-2xl font-bold font-heading mb-6 border-b border-slate-100 pb-4">Security Settings</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      className="clay-input w-full max-w-md"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      className="clay-input w-full max-w-md"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      className="clay-input w-full max-w-md"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-start">
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="clay-btn bg-clay-violet flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
