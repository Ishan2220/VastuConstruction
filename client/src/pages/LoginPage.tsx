import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, ShieldCheck, Building2, HardHat, Calculator } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@vastuconstruction.in');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success && data.data) {
        setAuth(data.data.accessToken, data.data.user);
        toast.success(`Welcome back, ${data.data.user.name}`);
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
      if (data.success && data.data?.tempPassword) {
        setTempPassword(data.data.tempPassword);
        toast.success(data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password.');
    }
  };

  const setDemoRole = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    toast.info(`Selected ${roleEmail.split('@')[0].toUpperCase()} demo credentials`);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Left Brand Panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-heading">Vastu ERP</span>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Enterprise Grade Construction ERP
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight font-heading">
            Next-Generation Intelligence for Construction & Infrastructure
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Manage multiple sites, track real-time financial milestones, optimize material procurement, and automate labour attendance from a single, high-precision SaaS platform.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white font-heading">₹120Cr+</div>
              <div className="text-xs text-slate-400">Projects Managed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white font-heading">99.9%</div>
              <div className="text-xs text-slate-400">Audit Compliance</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white font-heading">35+</div>
              <div className="text-xs text-slate-400">Active Sites</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
          <span>Vastu Construction Technologies Pvt. Ltd.</span>
          <span>v2.4 Production</span>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-slate-950/60">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile Header */}
          <div className="flex items-center gap-3 lg:hidden mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-heading">Vastu ERP</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white font-heading">Sign in to workspace</h2>
            <p className="text-sm text-slate-400">Enter your official company credentials to access your portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vastuconstruction.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Password</label>
                <a href="#reset" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); setForgotEmail(email); setTempPassword(''); }} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign into Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="pt-6 border-t border-slate-800/80 space-y-3">
            <div className="text-xs font-medium text-slate-400 text-center">Quick Demo Role Switcher</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoRole('admin@vastuconstruction.in', 'Admin@123')}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('engineer@vastuconstruction.in', 'Engineer@123')}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 flex items-center justify-center transition-colors">
                  <HardHat className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold">Engineer</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('accountant@vastuconstruction.in', 'Accountant@123')}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                  <Calculator className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold">Accountant</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-bold text-lg text-white font-heading">Reset Password</h3>
              <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-slate-200 text-sm font-semibold">✕</button>
            </div>
            
            {tempPassword ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-white font-medium">Password Reset Successful!</h4>
                <p className="text-sm text-slate-400">Your temporary password is:</p>
                <div className="py-3 px-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-lg text-indigo-400 tracking-wider font-bold">
                  {tempPassword}
                </div>
                <p className="text-xs text-slate-500">Please use this to login and change your password immediately.</p>
                <button 
                  onClick={() => {
                    setPassword(tempPassword);
                    setEmail(forgotEmail);
                    setShowForgotModal(false);
                  }}
                  className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-slate-400 mb-2">Enter your work email to receive a temporary reset password.</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@vastuconstruction.in"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowForgotModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">Reset Password</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
