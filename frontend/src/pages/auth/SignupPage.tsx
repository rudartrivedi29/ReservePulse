import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

export const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'ORGANISER'>('CUSTOMER');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const session = await signup({
        fullName,
        email,
        password,
        role,
        phone: phone || undefined,
      });

      toast.success(
        'Account Registered!',
        'A 6-digit OTP verification code has been issued.'
      );

      // Navigate to OTP verification with prefilled email and demo OTP
      const otpParam = session.otp ? `&demoOtp=${session.otp}` : '';
      navigate(`/verify-otp?email=${encodeURIComponent(email)}${otpParam}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(msg);
      toast.error('Signup Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-lg w-full space-y-6">
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
          <h2 className="text-xl font-bold text-slate-800">Create your account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Join thousands of providers and customers scheduling effortlessly
          </p>
        </div>

        {/* Signup Card */}
        <Card variant="glass" className="shadow-xl border-slate-200/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Get started with ReservePulse</CardTitle>
            <CardDescription>Choose your account type and fill your profile details</CardDescription>
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
              {/* Role Selection Tabs */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  I want to join as:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('CUSTOMER')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'CUSTOMER'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Customer</span>
                      <Badge variant={role === 'CUSTOMER' ? 'emerald' : 'slate'} size="xs">
                        Booker
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Browse services, reserve facilities and manage your bookings
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('ORGANISER')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'ORGANISER'
                        ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Organiser</span>
                      <Badge variant={role === 'ORGANISER' ? 'blue' : 'slate'} size="xs">
                        Provider
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Offer services, manage staff/resources and define schedules
                    </p>
                  </button>
                </div>
              </div>

              <Input
                label="Full Name"
                type="text"
                placeholder="Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                helperText="Must contain at least 8 characters"
              />

              <Input
                label="Phone Number (Optional)"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-3"
                size="md"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Create Account & Send OTP
              </Button>
            </form>
          </CardContent>

          <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-4 text-center justify-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline ml-1">
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
