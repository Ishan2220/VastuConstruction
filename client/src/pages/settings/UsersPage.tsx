import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Key, Mail, X, Shield, Users, Search, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast.error('Failed to delete user');
    },
  });

  const users = usersData?.data || [];
  const filteredUsers = users.filter((u: any) => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto relative min-h-[80vh]">
      {/* Background blobs for premium glassmorphism feel */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/50">
        <div>
          <h1 className="text-4xl font-extrabold font-heading text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl shadow-lg shadow-rose-200">
              <Users className="w-8 h-8 text-white" />
            </div>
            User Management
          </h1>
          <p className="text-base text-slate-500 mt-3 max-w-xl">
            Manage system users, define roles, and control access across the platform.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white/60 backdrop-blur-md border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl text-sm font-medium w-full md:w-64 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-[0_4px_14px_0_rgb(124,110,240,0.39)] hover:shadow-[0_6px_20px_rgba(124,110,240,0.23)] hover:-translate-y-0.5 transition-all duration-200 shrink-0"
          >
            <Plus className="h-5 w-5" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl animate-pulse shadow-sm" />
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700">No users found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search query or add a new user.</p>
          </div>
        ) : (
          filteredUsers.map((user: any) => (
            <div key={user.id} className="group relative bg-white/60 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(124,110,240,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 flex items-center justify-center font-bold text-lg shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1",
                  user.role === 'ADMIN' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                  user.role === 'ENGINEER' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                  'bg-emerald-100 text-emerald-700 border border-emerald-200'
                )}>
                  {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                  {user.role}
                </div>
              </div>
              
              <div className="relative z-10 flex-1">
                <h3 className="font-heading font-bold text-lg text-slate-800 line-clamp-1 group-hover:text-violet-700 transition-colors">{user.name}</h3>
                <div className="mt-2 space-y-1.5">
                  <p className="text-slate-500 text-xs font-medium flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> 
                    <span className="truncate">{user.email}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 relative z-10">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-bold",
                    user.isActive !== false ? "text-emerald-600" : "text-slate-400"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", user.isActive !== false ? "bg-emerald-500" : "bg-slate-400")} />
                    {user.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setResetPasswordUserId(user.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    title="Reset Password"
                  >
                    <Key className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
                        deleteMutation.mutate(user.id);
                      }
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete User"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isCreateModalOpen && (
        <CreateUserModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {resetPasswordUserId && (
        <ResetPasswordModal
          userId={resetPasswordUserId}
          onClose={() => setResetPasswordUserId(null)}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'ENGINEER',
    isActive: true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/users', data);
    },
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold font-heading text-slate-800">Create New User</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Jane Doe"
              className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm transition-all"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              placeholder="jane@example.com"
              className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone (Optional)</label>
              <input
                type="text"
                placeholder="+91..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm transition-all"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">System Role</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm transition-all"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="ADMIN">Admin</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="ENGINEER">Engineer</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Initial Password</label>
            <input
              type="password"
              required
              placeholder="Minimum 8 characters"
              className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 focus:ring-offset-0"
            />
            <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
              Account is Active
            </label>
          </div>
          
          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-[0_4px_14px_0_rgb(124,110,240,0.39)] hover:shadow-[0_6px_20px_rgba(124,110,240,0.23)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');

  const resetMutation = useMutation({
    mutationFn: async (password: string) => {
      await api.put(`/users/${userId}/reset-password`, { newPassword: password });
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold font-heading text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-violet-500" />
            Reset Password
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          resetMutation.mutate(newPassword);
        }} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">New Password</label>
            <input
              type="password"
              required
              placeholder="Enter new password"
              className="w-full bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm transition-all"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetMutation.isPending}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-[0_4px_14px_0_rgb(124,110,240,0.39)] hover:shadow-[0_6px_20px_rgba(124,110,240,0.23)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
