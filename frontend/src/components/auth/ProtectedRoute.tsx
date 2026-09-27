import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Spinner } from '../ui';
import type { AppRole } from '../../config/navigation';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  redirectMessage?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectMessage,
}) => {
  const { role, isAuthenticated, isLoading, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Spinner size="lg" label="Verifying authentication session..." />
      </div>
    );
  }

  const isAuthorized = isAuthenticated && allowedRoles.includes(role);

  if (isAuthorized) {
    return <>{children}</>;
  }

  // Case 1: Unauthenticated user
  if (!isAuthenticated) {
    const loginRedirect = `/login?redirect=${encodeURIComponent(location.pathname)}`;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6 font-sans">
        <Card variant="glass" className="max-w-lg w-full shadow-xl border-slate-200/80">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <div>
                <CardTitle>Authentication Required</CardTitle>
                <CardDescription>
                  Sign in to access this protected area
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              {redirectMessage ||
                'This route requires an active, verified ReservePulse user session. Please log in with your credentials or create a new account.'}
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Session Status:</span>
                <Badge variant="rose" size="xs" dot>
                  UNAUTHENTICATED
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Required Role(s):</span>
                <div className="flex gap-1.5">
                  {allowedRoles.map((r) => (
                    <Badge key={r} variant="purple" size="xs">
                      {r.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => navigate(loginRedirect)}
              >
                Log In to Continue
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/signup')}
              >
                Create Account
              </Button>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Dev Bypass:
              </span>
              <div className="flex flex-wrap gap-2">
                {allowedRoles.map((targetRole) => (
                  <Button
                    key={targetRole}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => switchRole(targetRole)}
                  >
                    Simulate as {targetRole.charAt(0).toUpperCase() + targetRole.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Case 2: Authenticated but unauthorized role
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6 font-sans">
      <Card variant="glass" className="max-w-lg w-full shadow-xl border-slate-200/80">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <div>
              <CardTitle>Access Forbidden</CardTitle>
              <CardDescription>
                Insufficient role privileges for this section
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {redirectMessage ||
              'Your current user account does not have sufficient administrative or organizational privileges to access this area.'}
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Your Role:</span>
              <Badge variant="slate" size="xs" dot>
                {role.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Required Role(s):</span>
              <div className="flex gap-1.5">
                {allowedRoles.map((r) => (
                  <Badge key={r} variant="purple" size="xs">
                    {r.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (role === 'customer') navigate('/customer/dashboard');
                else if (role === 'organiser') navigate('/organiser/dashboard');
                else if (role === 'admin') navigate('/admin/dashboard');
                else navigate('/');
              }}
            >
              Go to My Dashboard
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => navigate('/login')}
            >
              Log In as Different User
            </Button>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Instant Switch:
            </span>
            <div className="flex flex-wrap gap-2">
              {allowedRoles.map((targetRole) => (
                <Button
                  key={targetRole}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => switchRole(targetRole)}
                >
                  Simulate as {targetRole.charAt(0).toUpperCase() + targetRole.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
