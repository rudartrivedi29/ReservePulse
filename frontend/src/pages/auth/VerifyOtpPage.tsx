import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
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

export const VerifyOtpPage: React.FC = () => {
  const { verifyOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialEmail = searchParams.get('email') || '';
  const initialDemoOtp = searchParams.get('demoOtp') || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(initialDemoOtp);
  const [demoCode, setDemoCode] = useState(initialDemoOtp);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDemoOtp) {
      setOtp(initialDemoOtp);
    }
  }, [initialDemoOtp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) {
      setError('Please provide both your email and the 6-digit verification code.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const session = await verifyOtp({ email, otp });
      toast.success(
        'Email Verified!',
        'Your account has been successfully verified. Welcome to ReservePulse!'
      );

      // Direct to corresponding dashboard
      const target =
        session.user.role === 'ADMIN'
          ? '/admin/dashboard'
          : session.user.role === 'ORGANISER'
          ? '/organiser/dashboard'
          : '/customer/dashboard';

      navigate(target, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired OTP code.';
      setError(msg);
      toast.error('Verification Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address to resend OTP.');
      return;
    }

    setError(null);
    setIsResending(true);

    try {
      const res = await authService.resendOtp(email);
      if (res.data?.otp) {
        setDemoCode(res.data.otp);
        setOtp(res.data.otp);
      }
      toast.info('New OTP Sent', 'A fresh 6-digit code has been generated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend OTP.';
      setError(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Verify your email address</h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter the 6-digit verification code sent to your email
          </p>
        </div>

        {/* Verification Card */}
        <Card variant="glass" className="shadow-xl border-slate-200/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Two-Step Verification</CardTitle>
            <CardDescription>
              Confirming your identity ensures full account security
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

            {demoCode && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="emerald" size="xs">
                    Dev Code
                  </Badge>
                  <span className="font-mono font-bold tracking-wider">{demoCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(demoCode)}
                  className="font-bold text-[11px] text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                >
                  Auto-Fill
                </button>
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
              />

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono font-bold text-xl rounded-xl border border-slate-200 bg-white/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="md"
                isLoading={isSubmitting}
                disabled={isSubmitting || otp.length < 4}
              >
                Verify & Activate Session
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex-col gap-2 bg-slate-50/50 border-t border-slate-100 p-4 text-center">
            <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
            <Link to="/login" className="text-xs text-slate-400 hover:text-slate-600 mt-1">
              Back to Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
