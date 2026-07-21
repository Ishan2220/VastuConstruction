import { useState, useEffect } from 'react';
import { Settings, Save, Globe, Lock, Shield, Database, LayoutTemplate, UserCog } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('security');

  // For Permissions
  const [selectedUser, setSelectedUser] = useState('');
  const [tempAdminHours, setTempAdminHours] = useState('24');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const { data: users = [] } = useQuery({
    queryKey: ['users-list-permissions'],
    queryFn: async () => {
      const { data } = await api.get('/employees');
      return data.data?.data || data.data || [];
    },
    enabled: activeTab === 'permissions'
  });

  const grantPermissionMutation = useMutation({
    mutationFn: async (payload: { userId: string, durationHours: number, pages: string[] }) => {
      const { data } = await api.post('/employees/temp-admin', payload);
      return data.data;
    },
    onSuccess: () => {
      toast.success('Permissions granted successfully');
      setSelectedUser('');
      setSelectedPages([]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to grant permissions');
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      // Mocking settings since there is no backend endpoint
      setTimeout(() => {
        setSettings({
          companyName: 'Vastu Construction',
          currency: 'INR',
          financialYear: '2023-2024',
          invoicePrefix: 'INV-',
          enablePurchaseOrders: true,
          enableNotifications: true,
          enableAnalytics: true,
        });
        setIsLoading(false);
      }, 500);
    } catch (error) {
      toast.error('Failed to load system settings');
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Mocking save
      setTimeout(() => {
        toast.success('Settings saved successfully');
        setIsSaving(false);
      }, 500);
    } catch (error) {
      toast.error('Failed to save settings');
      setIsSaving(false);
    }
  };

  const handleGrantPermissions = () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }
    grantPermissionMutation.mutate({
      userId: selectedUser,
      durationHours: Number(tempAdminHours) || 0,
      pages: selectedPages
    });
  };

  const togglePage = (page: string) => {
    setSelectedPages(prev => 
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2 font-heading">
            <Settings className="w-8 h-8 text-indigo-600" />
            System Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage global ERP configurations and preferences</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">Loading settings...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-2">
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'security' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Lock className={`w-5 h-5 ${activeTab === 'security' ? 'text-indigo-600' : 'text-slate-400'}`} />
              Security
            </button>
            <button 
              onClick={() => setActiveTab('permissions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'permissions' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Shield className={`w-5 h-5 ${activeTab === 'permissions' ? 'text-indigo-600' : 'text-slate-400'}`} />
              Permissions
            </button>
          </div>

          <div className="md:col-span-3 space-y-6">


            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Security Policies</h3>
                  <p className="text-sm text-slate-500 mt-1">Manage passwords, multi-factor auth, and sessions.</p>
                </div>
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  <Lock className="w-8 h-8 mx-auto mb-3 text-slate-400" />
                  <p>Security settings are currently managed via direct environment variables.</p>
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Role & Page Permissions</h3>
                  <p className="text-sm text-slate-500 mt-1">Grant temporary or specific page access rights to employees.</p>
                </div>
                
                <div className="space-y-4 border border-slate-200 p-4 rounded-xl bg-slate-50">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Select Employee</label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Choose an employee --</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.user?.id || u.id}>
                          {u.name || u.user?.name} ({u.role || u.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Access Duration (Hours)</label>
                    <input
                      type="number"
                      value={tempAdminHours}
                      onChange={(e) => setTempAdminHours(e.target.value)}
                      min="1"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">Set to 0 or leave empty for permanent changes, though temporary is recommended.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select Accessible Pages</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {['Dashboard', 'Projects', 'Sites', 'Expenses', 'Income / Payments', 'Accounts', 'Invoices', 'Vendors', 'Labour Management', 'Clients', 'Documents', 'Reports', 'Calendar', 'Tasks', 'Employees', 'Settings'].map((page) => (
                        <label key={page} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={selectedPages.includes(page)}
                            onChange={() => togglePage(page)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          {page}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={handleGrantPermissions}
                      disabled={grantPermissionMutation.isPending || !selectedUser}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                      {grantPermissionMutation.isPending ? 'Applying...' : 'Apply Permissions'}
                    </button>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>
      )}
    </div>
  );
}
