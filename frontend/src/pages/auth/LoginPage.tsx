import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import { cookieDb } from '../../utils/cookieDb';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
} from '../../components/ui';

interface DemoAccount {
  role: 'customer' | 'organiser' | 'admin';
  title: string;
  name: string;
  email: string;
  pass: string;
  tag: string;
  color: 'emerald' | 'teal' | 'purple';
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'customer',
    title: 'Customer',
    name: 'Alex Morgan',
    email: 'customer@reservepulse.com',
    pass: 'Customer@123',
    tag: 'Client Portal',
    color: 'emerald',
    description: 'Browse services, reserve time slots, intake forms & live tracking',
  },
  {
    role: 'organiser',
    title: 'Organiser',
    name: 'Jordan Vance',
    email: 'organiser@reservepulse.com',
    pass: 'Organiser@123',
    tag: 'Operations',
    color: 'teal',
    description: 'Publish services, configure resources, shifts & manage bookings',
  },
  {
    role: 'admin',
    title: 'Administrator',
    name: 'Morgan Reed',
    email: 'admin@reservepulse.com',
    pass: 'Admin@123',
    tag: 'Full Access',
    color: 'purple',
    description: 'Platform telemetry, user administration, system audit logs & KPIs',
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
  const [autofillSuccess, setAutofillSuccess] = useState<string | null>(null);
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
    setAutofillSuccess(acc.role);
    toast.info('Credentials Autofilled', `Ready to sign in as ${acc.name} (${acc.title})`);
    setTimeout(() => setAutofillSuccess(null), 3000);
  };

  const handleInstantLogin = async (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.pass);
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
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-xl w-full space-y-5">
        {/* Brand header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              Reserve<span className="text-emerald-600">Pulse</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-800">Sign in to test platform features</h2>
          <p className="mt-1 text-xs text-slate-500">
            Select a dummy role below for instant autofill or test custom credentials.
          </p>
        </div>

        {/* Demo Roles & Autofill Showcase */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-4 text-white shadow-xl border border-slate-700/60">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                1-Click Testing Credentials &amp; Autofill
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              🍪 Cookie DB Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = autofillSuccess === acc.role;
              return (
                <div
                  key={acc.role}
                  className={`rounded-xl p-3 border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-400/30'
                      : 'border-slate-700/80 bg-slate-800/60 hover:border-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            acc.color === 'emerald'
                              ? 'bg-emerald-400'
                              : acc.color === 'teal'
                              ? 'bg-teal-400'
                              : 'bg-purple-400'
                          }`}
                        />
                        {acc.title}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                        {acc.tag}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-slate-300 truncate">{acc.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">{acc.email}</div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {acc.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-700/50 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAutofill(acc)}
                      disabled={isSubmitting}
                      className="px-2 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 transition-all cursor-pointer text-center"
                      title="Fill into login form"
                    >
                      Fill Form
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInstantLogin(acc)}
                      disabled={isSubmitting}
                      className={`px-2 py-1.5 text-[11px] font-bold rounded-lg text-white active:scale-95 transition-all cursor-pointer text-center ${
                        acc.color === 'emerald'
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : acc.color === 'teal'
                          ? 'bg-teal-600 hover:bg-teal-500'
                          : 'bg-purple-600 hover:bg-purple-500'
                      }`}
                      title="Instant 1-Click login"
                    >
                      Login →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Database Persistence Notice */}
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>💾 Data, bookings &amp; services persist in browser Cookies.</span>
            <button
              type="button"
              onClick={handleResetData}
              className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              Reset Sample Data
            </button>
          </div>
        </div>

        {/* Login Card Form */}
        <Card variant="glass" className="shadow-xl border-slate-200/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Sign in with credentials</CardTitle>
            <CardDescription>
              Submit the form below (autofilled or type any email/password to test)
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <span className="text-[11px] text-slate-400">
                    (Default: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">Role@123</code>)
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
                className="w-full mt-2"
                size="md"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Sign In to Platform
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between bg-slate-50/50 border-t border-slate-100 p-4 text-xs text-slate-500">
            <div>
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                Create one now
              </Link>
            </div>
            <Link to="/" className="text-slate-500 hover:text-slate-800">
              ← Back to Catalog
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
