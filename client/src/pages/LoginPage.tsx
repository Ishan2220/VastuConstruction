import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, ShieldCheck, Building2, HardHat, Calculator } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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


  return (
    <div className="min-h-screen grid lg:grid-cols-2 selection:bg-[#7C6EF0]/20 selection:text-[#7C6EF0]">
      {/* Left Brand Panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-violet-100/40 bg-clay-violet bg-opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#7c6ef00d_1px,transparent_1px),linear-gradient(to_bottom,#7c6ef00d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C6EF0] to-[#5CB77E] flex items-center justify-center shadow-lg shadow-[#7C6EF0]/25 ring-1 ring-white/50">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800 font-heading">VASTU <span className="text-[#F2A65A] font-extrabold">×</span> CONSTRACORE</span>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/60 backdrop-blur-sm text-[#7C6EF0] border border-violet-100/40 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" /> Enterprise Grade Construction ERP
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 leading-tight font-heading">
            Next-Generation Intelligence for Construction & Infrastructure
          </h1>
          <p className="text-slate-600 text-base leading-relaxed">
            Manage multiple sites, track real-time financial milestones, optimize material procurement, and automate labour attendance from a single, high-precision SaaS platform powered by SHIVLINK Technologies.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Shivlink Technologies Pvt. Ltd.</span>
          <span>v2.4 Production</span>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Background blobs for right side */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-clay-amber opacity-40 blur-3xl mix-blend-multiply pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 rounded-full bg-clay-violet opacity-30 blur-3xl mix-blend-multiply pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8 relative z-10"
        >
          {/* Mobile Header */}
          <div className="flex items-center gap-3 lg:hidden mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C6EF0] to-[#5CB77E] flex items-center justify-center shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800 font-heading">VASTU <span className="text-[#F2A65A] font-extrabold">×</span> CONSTRACORE</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-800 font-heading">Sign in to workspace</h2>
            <p className="text-sm text-slate-500">Enter your official company credentials to access your portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 clay-card p-6 rounded-3xl">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vastuconstruction.in"
                  className="clay-input pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                <a href="#reset" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); setForgotEmail(email); setTempPassword(''); }} className="text-xs text-[#7C6EF0] hover:text-[#5c4ce0] transition-colors font-bold">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="clay-input pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="clay-btn w-full py-3 px-4 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="font-bold">Sign into Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="clay-card w-full max-w-sm p-6 space-y-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7C6EF0] to-[#5CB77E]" />
             
            <div className="flex items-center justify-between border-b border-violet-100/40 pb-4">
              <h3 className="font-bold text-xl text-slate-800 font-heading">Reset Password</h3>
              <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">✕</button>
            </div>
            
            {tempPassword ? (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-[#5CB77E]/20 text-[#5CB77E] rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-white shadow-sm">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="text-slate-800 font-bold font-heading text-lg">Password Reset Successful!</h4>
                <p className="text-sm text-slate-500">Your temporary password is:</p>
                <div className="py-4 px-4 bg-slate-50 rounded-2xl border border-violet-100/40 shadow-inner font-mono text-xl text-[#7C6EF0] tracking-wider font-extrabold select-all">
                  {tempPassword}
                </div>
                <p className="text-xs text-slate-500 font-medium">Please use this to login and change your password immediately.</p>
                <button 
                  onClick={() => {
                    setPassword(tempPassword);
                    setEmail(forgotEmail);
                    setShowForgotModal(false);
                  }}
                  className="clay-btn w-full mt-4 py-3"
                >
                  <span className="font-bold">Back to Login</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-slate-600 mb-2 font-medium">Enter your work email to receive a temporary reset password.</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@vastuconstruction.in"
                      className="clay-input pl-10"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-violet-100/40">
                  <button type="button" onClick={() => setShowForgotModal(false)} className="px-5 py-2.5 rounded-xl border border-violet-100/40 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm bg-white">Cancel</button>
                  <button type="submit" className="clay-btn px-6 py-2.5">
                    <span className="font-bold">Reset Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
