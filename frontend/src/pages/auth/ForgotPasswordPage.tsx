import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from '../../components/ui';

export const ForgotPasswordPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered account email.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await authService.forgotPassword(email);
      toast.success(
        'Reset Code Issued',
        'If this email is registered, a password reset code has been sent.'
      );

      const tokenParam = res.data?.resetToken ? `&demoToken=${res.data.resetToken}` : '';
      navigate(`/reset-password?email=${encodeURIComponent(email)}${tokenParam}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request reset.';
      setError(msg);
      toast.error('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-amber-500/20 mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Forgot your password?</h2>
          <p className="mt-1 text-xs text-slate-500">
            No worries! Enter your email address and we'll generate a password recovery code
          </p>
        </div>

        {/* Card */}
        <Card variant="glass" className="shadow-xl border-slate-200/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Reset Password Request</CardTitle>
            <CardDescription>
              We'll send a 6-digit confirmation token to verify your ownership
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
                label="Registered Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                helperText="Enter the email associated with your ReservePulse account"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="md"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Send Reset Code
              </Button>
            </form>
          </CardContent>

          <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-4 text-center justify-center text-xs text-slate-500">
            Remembered your credentials?{' '}
            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline ml-1">
              Back to Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
