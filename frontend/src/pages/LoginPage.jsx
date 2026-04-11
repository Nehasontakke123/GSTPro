import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon, DocumentCheckIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const roles = [
  { value: 'client', label: 'Client', desc: 'Upload & reconcile purchase data' },
  { value: 'officer', label: 'Officer', desc: 'Review and verify matched records' },
  { value: 'admin', label: 'Admin', desc: 'Manage system and upload GSTR2B' }
];

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const demoCredentials = {
    admin:   { email: 'admin@gstpro.com',   password: 'Admin@123' },
    client:  { email: 'client@gstpro.com',  password: 'Client@123' },
    officer: { email: 'officer@gstpro.com', password: 'Officer@123' }
  };

  const fillDemo = (role) => {
    setSelectedRole(role);
    setForm(demoCredentials[role]);
    toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} credentials filled!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success(`Welcome back, ${result.user.name}!`);
      const redirect = result.user.role === 'admin' ? '/admin' : result.user.role === 'officer' ? '/officer' : '/client';
      navigate(redirect);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-mesh-light dark:bg-mesh-dark bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-300/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Left panel - Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-brand p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <DocumentCheckIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white font-display font-bold text-xl">GST Pro</p>
              <p className="text-white/70 text-sm">Reconciliation System</p>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-4xl font-display font-bold text-white leading-tight mb-4">
              Enterprise GST<br />Reconciliation<br />Made Simple
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Seamlessly reconcile your purchase data with GSTR2B records. 
              Built for modern Indian enterprises.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: 'Accuracy', value: '99.9%' },
            { label: 'Records/min', value: '10K+' },
            { label: 'Clients', value: '500+' }
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-2xl font-display font-bold text-white">{stat.value}</p>
              <p className="text-white/70 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center">
              <DocumentCheckIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-slate-900 dark:text-white">GST Reconciliation Pro</span>
          </div>

          <div className="card p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Welcome back</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            {/* Demo role quick-fill */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quick Login Demo</p>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => fillDemo(r.value)}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                      selectedRole === r.value
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-11"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPass ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2">
                {isLoading ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" fill="currentColor" className="opacity-75" />
                  </svg>
                ) : null}
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                Register
              </Link>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheckIcon className="w-4 h-4" />
            <span>Secured with JWT Authentication & RBAC</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
