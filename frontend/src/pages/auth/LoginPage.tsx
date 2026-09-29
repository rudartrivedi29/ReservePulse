import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import { cookieDb } from '../../utils/cookieDb';
import { Button, Input } from '../../components/ui';

interface DemoAccount {
  role: 'customer' | 'organiser' | 'admin';
  title: string;
  name: string;
  email: string;
  pass: string;
  badge: string;
  description: string;
  icon: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'customer',
    title: 'Customer',
    name: 'Alex Morgan',
    email: 'customer@reservepulse.com',
    pass: 'Customer@123',
    badge: 'Client Portal',
    description: 'Browse catalog, reserve time slots, intake forms & live tracking',
    icon: '👤',
  },
  {
    role: 'organiser',
    title: 'Organiser',
    name: 'Jordan Vance',
    email: 'organiser@reservepulse.com',
    pass: 'Organiser@123',
    badge: 'Operations Fleet',
    description: 'Publish services, configure resources, shifts & manage bookings',
    icon: '💼',
  },
  {
    role: 'admin',
    title: 'Administrator',
    name: 'Morgan Reed',
    email: 'admin@reservepulse.com',
    pass: 'Admin@123',
    badge: 'Full Governance',
    description: 'Platform telemetry, user administration, system audit logs & KPIs',
    icon: '🛡️',
  },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract return redirect if present
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect');

  const getDashboardPath = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return '/admin/dashboard';
      case 'organiser':
        return '/organiser/dashboard';
      case 'customer':
      default:
        return '/customer/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const session = await login({ email, password });
      toast.success(
        'Welcome Back!',
        `Logged in as ${session.user.fullName} (${session.user.role})`
      );

      const target = redirectPath || getDashboardPath(session.user.role);
      navigate(target, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(msg);
      toast.error('Login Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutofill = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setError(null);
    setActivePersona(acc.role);
    toast.info('Credentials Autofilled', `Ready to sign in as ${acc.name} (${acc.title})`);
  };

  const handleInstantLogin = async (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setActivePersona(acc.role);
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await login({ email: acc.email, password: acc.pass });
      toast.success(
        'Instant Login Successful!',
        `Authenticated as ${session.user.fullName} (${session.user.role})`
      );
      const target = redirectPath || getDashboardPath(session.user.role);
      navigate(target, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Instant login failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetData = () => {
    cookieDb.resetToDefaults();
    toast.success('Database Reset', 'Sample data, services, and bookings have been restored to defaults in browser cookies.');
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl w-full">
        {/* Unified 2-Column Card Shell */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-950/10 border border-emerald-200/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Standard Sign In Form (5 Cols)                               */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-emerald-100">
            <div>
              {/* Brand Header */}
              <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-extrabold text-xl tracking-tight text-slate-900 leading-none">
                    Reserve<span className="text-emerald-600">Pulse</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                    Orchestration Platform
                  </div>
                </div>
              </Link>

              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Welcome back
              </h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Sign in to manage schedules, catalog services, or inspect bookings.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    <span className="text-[10px] text-slate-400">
                      Default: <code className="bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded border border-emerald-200">Role@123</code>
                    </span>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2 py-2.5 font-bold shadow-md shadow-emerald-600/20"
                  size="md"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Sign In to Platform
                </Button>
              </form>
            </div>

            {/* Bottom Links */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                New to platform?{' '}
                <Link to="/signup" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                  Sign up
                </Link>
              </div>
              <Link to="/" className="text-slate-500 hover:text-emerald-700 font-medium">
                ← Explore Catalog
              </Link>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Interactive Demo Personas & Sandbox (7 Cols)                 */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 bg-gradient-to-br from-emerald-50/50 via-slate-50/40 to-emerald-50/30 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              {/* Sandbox Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Instant Demo Test Personas
                  </span>
                </div>
                <span className="text-[11px] text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full bg-white border border-emerald-200/90 shadow-2xs flex items-center gap-1.5">
                  <span>🍪</span>
                  <span>In-Browser Cookie DB</span>
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Click <strong>"Fill Form"</strong> to populate fields or <strong>"Login →"</strong> to immediately jump into each role's dashboard:
              </p>

              {/* Persona Cards List */}
              <div className="space-y-3">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isActive = activePersona === acc.role;
                  return (
                    <div
                      key={acc.role}
                      className={`rounded-2xl p-4 transition-all duration-200 border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isActive
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10'
                          : 'border-emerald-100 hover:border-emerald-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Persona Details */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-lg flex items-center justify-center shrink-0">
                          {acc.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 truncate">
                              {acc.name}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              {acc.badge}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                            {acc.email}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                            {acc.description}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleAutofill(acc)}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 active:scale-95 text-slate-700 transition-all cursor-pointer shadow-2xs"
                        >
                          Fill Form
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInstantLogin(acc)}
                          disabled={isSubmitting}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 transition-all cursor-pointer shadow-sm shadow-emerald-600/30 flex items-center gap-1"
                        >
                          <span>Login</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sandbox Footer */}
            <div className="mt-6 pt-4 border-t border-emerald-100/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span>💾</span>
                <span>All appointments, services &amp; users persist in browser cookies.</span>
              </span>
              <button
                type="button"
                onClick={handleResetData}
                className="text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer shrink-0"
              >
                Reset Demo Data
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
