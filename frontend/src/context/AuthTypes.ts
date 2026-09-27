import { createContext } from 'react';
import type { AppRole } from '../config/navigation';
import type {
  LoginPayload,
  SignupPayload,
  VerifyOtpPayload,
  AuthSessionData,
} from '../services/auth.service';

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: AppRole;
  avatar: string;
  organization: string;
  isVerified?: boolean;
  phone?: string;
}

export interface AuthContextValue {
  role: AppRole;
  user: UserProfile;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthSessionData>;
  signup: (payload: SignupPayload) => Promise<AuthSessionData>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<AuthSessionData>;
  logout: () => void;
  switchRole: (newRole: AppRole) => Promise<void> | void;
  loginAs: (role: AppRole) => Promise<void> | void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
