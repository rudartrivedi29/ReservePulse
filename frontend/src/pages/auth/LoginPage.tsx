import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Badge,
} from '../../components/ui';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await login({ email: demoEmail, password: demoPass });
      toast.success(
        'Demo Login Successful!',
        `Authenticated as ${session.user.fullName} (${session.user.role})`
      );
      const target = redirectPath || getDashboardPath(session.user.role);
      navigate(target, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Brand header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
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
          <h2 className="text-xl font-bold text-slate-800">Sign in to your account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Access your bookings, availability and resource schedule
          </p>
        </div>

        {/* Login Card */}
        <Card variant="glass" className="shadow-xl border-slate-200/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your credentials to enter your dashboard</CardDescription>
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
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
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
                Sign In
              </Button>
            </form>
          </CardContent>

          {/* Quick Demo Credentials */}
          <CardFooter className="flex-col items-start gap-3 bg-slate-50/50 border-t border-slate-100 p-4">
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Instant Demo Accounts:
                </span>
                <Badge variant="emerald" size="xs">
                  1-Click Fill
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('customer@reservepulse.com', 'Customer@123')}
                  className="px-2.5 py-2 text-left rounded-lg border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-xs group cursor-pointer"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Customer
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Alex Morgan</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('organiser@reservepulse.com', 'Organiser@123')}
                  className="px-2.5 py-2 text-left rounded-lg border border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/40 transition-all text-xs group cursor-pointer"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-teal-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    Organiser
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Jordan Vance</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin@reservepulse.com', 'Admin@123')}
                  className="px-2.5 py-2 text-left rounded-lg border border-slate-200 bg-white hover:border-purple-500 hover:bg-purple-50/40 transition-all text-xs group cursor-pointer"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-purple-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    Admin
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Morgan Reed</div>
                </button>
              </div>
            </div>

            <div className="w-full text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                Create one now
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
