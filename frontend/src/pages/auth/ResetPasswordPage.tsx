import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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

export const ResetPasswordPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const initialEmail = searchParams.get('email') || '';
  const initialDemoToken = searchParams.get('demoToken') || '';

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialDemoToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDemoToken) {
      setToken(initialDemoToken);
    }
  }, [initialDemoToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !token || !newPassword || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await authService.resetPassword({
        email,
        token,
        newPassword,
      });

      toast.success(
        'Password Reset Successful!',
        res.message || 'You can now sign in with your new password.'
      );

      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired reset token.';
      setError(msg);
      toast.error('Reset Failed', msg);
    } finally {
      setIsSubmitting(false);
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Set new password</h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter your reset token and define a secure new password
          </p>
        </div>

        {/* Card */}
        <Card variant="glass" className="shadow-xl border-slate-200/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Create New Password</CardTitle>
            <CardDescription>
              Your new password must be at least 8 characters long
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

            {initialDemoToken && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="emerald" size="xs">
                    Dev Token
                  </Badge>
                  <span className="font-mono font-bold tracking-wider">{initialDemoToken}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setToken(initialDemoToken)}
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

              <Input
                label="Reset Code / Token"
                type="text"
                placeholder="6-digit code or reset token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                helperText="Paste the reset code received in your email"
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                size="md"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Reset Password & Log In
              </Button>
            </form>
          </CardContent>

          <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-4 text-center justify-center text-xs text-slate-500">
            Remember your credentials?{' '}
            <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline ml-1">
              Back to Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
