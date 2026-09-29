import React, { useState, useEffect, useCallback } from 'react';
import type { AppRole } from '../config/navigation';
import { AuthContext, type UserProfile } from './AuthTypes';
import {
  authService,
  type LoginPayload,
  type SignupPayload,
  type VerifyOtpPayload,
  type AuthSessionData,
  type AuthUser,
} from '../services/auth.service';
import { setCookie, getCookie, deleteCookie } from '../utils/cookieDb';

const defaultAvatars: Record<AppRole, string> = {
  public: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  customer: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  organiser: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  admin: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
};

const defaultOrgByRole: Record<AppRole, string> = {
  public: 'ReservePulse Open Network',
  customer: 'Client Services Hub',
  organiser: 'Facility & Operations Team',
  admin: 'ReservePulse Platform Administration',
};

const mockUsers: Record<AppRole, UserProfile> = {
  public: {
    id: 'usr_guest_000',
    name: 'Guest Visitor',
    email: 'guest@reservepulse.local',
    role: 'public',
    avatar: defaultAvatars.public,
    organization: defaultOrgByRole.public,
  },
  customer: {
    id: 'usr_customer_003',
    name: 'Alex Morgan',
    email: 'customer@reservepulse.com',
    role: 'customer',
    avatar: defaultAvatars.customer,
    organization: defaultOrgByRole.customer,
  },
  organiser: {
    id: 'usr_organiser_002',
    name: 'Jordan Vance',
    email: 'organiser@reservepulse.com',
    role: 'organiser',
    avatar: defaultAvatars.organiser,
    organization: defaultOrgByRole.organiser,
  },
  admin: {
    id: 'usr_admin_001',
    name: 'Morgan Reed',
    email: 'admin@reservepulse.com',
    role: 'admin',
    avatar: defaultAvatars.admin,
    organization: defaultOrgByRole.admin,
  },
};

const mapAuthUserToProfile = (authUser: AuthUser): UserProfile => {
  const role = (authUser.role ? authUser.role.toLowerCase() : 'customer') as AppRole;
  return {
    id: authUser.id,
    name: authUser.fullName,
    email: authUser.email,
    role,
    avatar: defaultAvatars[role] || defaultAvatars.customer,
    organization: defaultOrgByRole[role] || 'ReservePulse Network',
    isVerified: authUser.isVerified,
    phone: authUser.phone,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<AppRole>('public');
  const [user, setUser] = useState<UserProfile>(mockUsers.public);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from Cookies and LocalStorage on app start
  useEffect(() => {
    const initAuth = async () => {
      const cookieToken = getCookie('rp_auth_token');
      const cookieUser = getCookie('rp_auth_user');
      const storedToken = cookieToken || localStorage.getItem('reservepulse_token');
      const storedUser = cookieUser || localStorage.getItem('reservepulse_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser: UserProfile = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          setRole(parsedUser.role);

          // Verify or refresh token validity with local auth service
          const res = await authService.getMe();
          if (res.data) {
            const profile = mapAuthUserToProfile(res.data);
            setUser(profile);
            setRole(profile.role);
            setCookie('rp_auth_user', JSON.stringify(profile), 30);
            localStorage.setItem('reservepulse_user', JSON.stringify(profile));
          }
        } catch {
          // Token expired or invalid
          deleteCookie('rp_auth_token');
          deleteCookie('rp_auth_user');
          deleteCookie('rp_user_role');
          localStorage.removeItem('reservepulse_token');
          localStorage.removeItem('reservepulse_user');
          setToken(null);
          setUser(mockUsers.public);
          setRole('public');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const handleAuthSuccess = (session: AuthSessionData) => {
    const profile = mapAuthUserToProfile(session.user);
    setToken(session.token);
    setUser(profile);
    setRole(profile.role);

    // Save to browser Cookies
    setCookie('rp_auth_token', session.token, 30);
    setCookie('rp_auth_user', JSON.stringify(profile), 30);
    setCookie('rp_user_role', profile.role, 30);
    setCookie('rp_user_email', profile.email, 30);
    setCookie('rp_user_name', profile.name, 30);

    // Mirror to LocalStorage
    localStorage.setItem('reservepulse_token', session.token);
    localStorage.setItem('reservepulse_user', JSON.stringify(profile));
  };

  const login = useCallback(async (payload: LoginPayload): Promise<AuthSessionData> => {
    const res = await authService.login(payload);
    if (!res.data) {
      throw new Error(res.message || 'Login failed');
    }
    handleAuthSuccess(res.data);
    return res.data;
  }, []);

  const signup = useCallback(async (payload: SignupPayload): Promise<AuthSessionData> => {
    const res = await authService.signup(payload);
    if (!res.data) {
      throw new Error(res.message || 'Signup failed');
    }
    handleAuthSuccess(res.data);
    return res.data;
  }, []);

  const verifyOtp = useCallback(async (payload: VerifyOtpPayload): Promise<AuthSessionData> => {
    const res = await authService.verifyOtp(payload);
    if (!res.data) {
      throw new Error(res.message || 'Verification failed');
    }
    handleAuthSuccess(res.data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    deleteCookie('rp_auth_token');
    deleteCookie('rp_auth_user');
    deleteCookie('rp_user_role');
    deleteCookie('rp_user_email');
    deleteCookie('rp_user_name');
    localStorage.removeItem('reservepulse_token');
    localStorage.removeItem('reservepulse_user');
    setToken(null);
    setUser(mockUsers.public);
    setRole('public');
  }, []);

  const demoCredentials: Record<'customer' | 'organiser' | 'admin', LoginPayload> = {
    admin: { email: 'admin@reservepulse.com', password: 'Admin@123' },
    organiser: { email: 'organiser@reservepulse.com', password: 'Organiser@123' },
    customer: { email: 'customer@reservepulse.com', password: 'Customer@123' },
  };

  const switchRole = useCallback(
    async (newRole: AppRole) => {
      if (newRole === 'public') {
        logout();
        return;
      }

      const creds = demoCredentials[newRole];
      if (creds) {
        try {
          const res = await authService.login(creds);
          if (res.data) {
            handleAuthSuccess(res.data);
            return;
          }
        } catch (err) {
          console.warn('Switch role fallback', err);
        }
      }

      setRole(newRole);
      setUser(mockUsers[newRole] || mockUsers.public);
    },
    [logout]
  );

  const loginAs = useCallback(
    async (newRole: AppRole) => {
      await switchRole(newRole);
    },
    [switchRole]
  );

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        token,
        isAuthenticated: role !== 'public',
        isLoading,
        login,
        signup,
        verifyOtp,
        logout,
        switchRole,
        loginAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
