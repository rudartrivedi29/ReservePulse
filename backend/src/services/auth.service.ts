import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import {
  SignupInput,
  LoginInput,
  VerifyOtpInput,
  ResetPasswordInput,
} from '../validators/auth.validator';
import { AuthUserPayload } from '../middleware/auth.middleware';
import { generateSecureOtp, timingSafeCompare } from '../utils/security';

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserEntity {
  id: string;
  email: string;
  full_name: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  phone?: string;
  password_hash: string;
  is_active?: boolean;
  is_verified: boolean;
  otp_code?: string | null;
  otp_expires_at?: Date | null;
  otp_failed_attempts?: number;
  reset_password_token?: string | null;
  reset_password_expires_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

// In-Memory Fallback Store preloaded with standard demo credentials
const inMemoryUsers: Map<string, UserEntity> = new Map();

// Seed initial demo users with hashed passwords
const seedDemoUsers = async () => {
  if (inMemoryUsers.size > 0) return;

  const adminHash = await bcrypt.hash('Admin@123', 10);
  const organiserHash = await bcrypt.hash('Organiser@123', 10);
  const customerHash = await bcrypt.hash('Customer@123', 10);

  const demoUsers: UserEntity[] = [
    {
      id: 'usr_admin_001',
      email: 'admin@reservepulse.com',
      full_name: 'Morgan Reed (Admin)',
      role: 'ADMIN',
      phone: '+1 555-0190',
      password_hash: adminHash,
      is_verified: true,
      is_active: true,
      created_at: new Date('2026-01-01'),
      updated_at: new Date(),
    },
    {
      id: 'usr_organiser_002',
      email: 'organiser@reservepulse.com',
      full_name: 'Jordan Vance (Facility Director)',
      role: 'ORGANISER',
      phone: '+1 555-0191',
      password_hash: organiserHash,
      is_verified: true,
      is_active: true,
      created_at: new Date('2026-01-02'),
      updated_at: new Date(),
    },
    {
      id: 'usr_customer_003',
      email: 'customer@reservepulse.com',
      full_name: 'Alex Morgan (Client)',
      role: 'CUSTOMER',
      phone: '+1 555-0192',
      password_hash: customerHash,
      is_verified: true,
      is_active: true,
      created_at: new Date('2026-01-03'),
      updated_at: new Date(),
    },
  ];

  demoUsers.forEach((u) => inMemoryUsers.set(u.email.toLowerCase(), u));
  logger.info('In-memory demo auth users initialized', { count: demoUsers.length });
};

// Initialize demo users asynchronously
seedDemoUsers().catch((err) => {
  logger.error('Failed to initialize in-memory auth demo users', { error: err.message });
});

export class AuthService {
  /**
   * Helper: Generate signed JWT token
   */
  public static generateToken(user: UserEntity): string {
    const payload: AuthUserPayload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isVerified: user.is_verified,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });
  }

  /**
   * Helper: Generate a cryptographically secure 6-digit numeric OTP code
   */
  public static generateOtp(): string {
    return generateSecureOtp();
  }

  /**
   * Format entity to sanitized client response
   */
  public static formatUser(user: UserEntity): UserResponse {
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      phone: user.phone,
      isActive: user.is_active !== undefined ? user.is_active : true,
      isVerified: user.is_verified,
      createdAt: user.created_at.toISOString(),
      updatedAt: user.updated_at.toISOString(),
    };
  }

  /**
   * Helper: Find user by email (Checks DB first, falls back to memory)
   */
  public static async findUserByEmail(email: string): Promise<UserEntity | null> {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const res = await db.query<UserEntity>(
        `SELECT id, email, full_name, role, phone, password_hash, is_verified,
                COALESCE(is_active, true) as is_active,
                otp_code, otp_expires_at, reset_password_token, reset_password_expires_at,
                created_at, updated_at
         FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
        [normalizedEmail]
      );

      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      logger.debug('PostgreSQL query unavailable, using in-memory store for email lookup', {
        email: normalizedEmail,
        error: (err as Error).message,
      });
    }

    // Fallback to in-memory store
    return inMemoryUsers.get(normalizedEmail) || null;
  }

  /**
   * Helper: Find user by ID (Checks DB first, falls back to memory)
   */
  public static async findUserById(id: string): Promise<UserEntity | null> {
    try {
      const res = await db.query<UserEntity>(
        `SELECT id, email, full_name, role, phone, password_hash, is_verified,
                COALESCE(is_active, true) as is_active,
                otp_code, otp_expires_at, reset_password_token, reset_password_expires_at,
                created_at, updated_at
         FROM users WHERE id = $1 LIMIT 1;`,
        [id]
      );

      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      logger.debug('PostgreSQL query unavailable, using in-memory store for id lookup', {
        id,
        error: (err as Error).message,
      });
    }

    // In-memory fallback
    for (const user of inMemoryUsers.values()) {
      if (user.id === id) return user;
    }
    return null;
  }

  /**
   * Helper: Save or Update user entity
   */
  public static async saveUser(user: UserEntity): Promise<void> {
    const normalizedEmail = user.email.toLowerCase().trim();
    if (user.is_active === undefined) {
      user.is_active = true;
    }
    inMemoryUsers.set(normalizedEmail, user);

    try {
      await db.query(
        `INSERT INTO users (
           id, email, full_name, role, phone, password_hash, is_verified, is_active,
           otp_code, otp_expires_at, reset_password_token, reset_password_expires_at,
           created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           phone = EXCLUDED.phone,
           password_hash = EXCLUDED.password_hash,
           is_verified = EXCLUDED.is_verified,
           is_active = EXCLUDED.is_active,
           otp_code = EXCLUDED.otp_code,
           otp_expires_at = EXCLUDED.otp_expires_at,
           reset_password_token = EXCLUDED.reset_password_token,
           reset_password_expires_at = EXCLUDED.reset_password_expires_at,
           updated_at = EXCLUDED.updated_at;`,
        [
          user.id,
          normalizedEmail,
          user.full_name,
          user.role,
          user.phone || null,
          user.password_hash,
          user.is_verified,
          user.is_active,
          user.otp_code || null,
          user.otp_expires_at || null,
          user.reset_password_token || null,
          user.reset_password_expires_at || null,
          user.created_at,
          user.updated_at,
        ]
      );
    } catch (err) {
      logger.debug('PostgreSQL unavailable during saveUser, saved to memory', {
        email: normalizedEmail,
        error: (err as Error).message,
      });
    }
  }

  /**
   * 1. User Signup with Password Hashing & OTP Generation
   */
  public static async signup(data: SignupInput): Promise<{
    user: UserResponse;
    token: string;
    otp: string;
    message: string;
  }> {
    const existing = await this.findUserByEmail(data.email);
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

    // Guard: Prevent privilege escalation on public self-registration
    const assignedRole = (data.role as string) === 'ADMIN' ? 'CUSTOMER' : (data.role || 'CUSTOMER');

    const newUser: UserEntity = {
      id: `usr_${crypto.randomUUID()}`,
      email: data.email.toLowerCase().trim(),
      full_name: data.fullName.trim(),
      role: assignedRole,
      phone: data.phone?.trim(),
      password_hash: passwordHash,
      is_verified: false,
      is_active: true,
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt,
      otp_failed_attempts: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.saveUser(newUser);
    const token = this.generateToken(newUser);

    logger.info(`User signup successful [${newUser.role}]: ${newUser.email}`, {
      userId: newUser.id,
      role: newUser.role,
    });

    return {
      user: this.formatUser(newUser),
      token,
      otp: config.isDevelopment ? otpCode : undefined as any,
      message: `Account created successfully. A 6-digit OTP code has been generated (Valid for ${config.otp.expiryMinutes} minutes).`,
    };
  }

  /**
   * 2. Verify Account OTP with Timing-Attack & Brute-Force Protection
   */
  public static async verifyOtp(data: VerifyOtpInput): Promise<{
    user: UserResponse;
    token: string;
    message: string;
  }> {
    const user = await this.findUserByEmail(data.email);
    if (!user) {
      throw new NotFoundError('No user account found with this email address');
    }

    if (user.is_verified) {
      const token = this.generateToken(user);
      return {
        user: this.formatUser(user),
        token,
        message: 'Account is already verified.',
      };
    }

    // Rate-limiting check: Invalidate OTP after 5 failed attempts
    if ((user.otp_failed_attempts || 0) >= 5) {
      user.otp_code = null;
      user.otp_expires_at = null;
      user.otp_failed_attempts = 0;
      await this.saveUser(user);
      throw new BadRequestError('Too many failed OTP verification attempts. This code has been invalidated for security. Please request a new code.');
    }

    if (!user.otp_code || !timingSafeCompare(user.otp_code, data.otp)) {
      user.otp_failed_attempts = (user.otp_failed_attempts || 0) + 1;
      await this.saveUser(user);
      throw new BadRequestError('Invalid OTP verification code. Please check and try again.');
    }

    if (user.otp_expires_at && new Date() > new Date(user.otp_expires_at)) {
      throw new BadRequestError('OTP verification code has expired. Please request a new one.');
    }

    // Mark verified and clear OTP
    user.is_verified = true;
    user.otp_code = null;
    user.otp_expires_at = null;
    user.otp_failed_attempts = 0;
    user.updated_at = new Date();

    await this.saveUser(user);
    const token = this.generateToken(user);

    logger.info(`User OTP verified successfully: ${user.email}`);

    return {
      user: this.formatUser(user),
      token,
      message: 'Account verified successfully. Welcome to ReservePulse!',
    };
  }

  /**
   * 3. Resend Verification OTP
   */
  public static async resendOtp(email: string): Promise<{
    otp: string;
    message: string;
  }> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundError('No account found with this email address');
    }

    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

    user.otp_code = otpCode;
    user.otp_expires_at = otpExpiresAt;
    user.updated_at = new Date();

    await this.saveUser(user);

    logger.info(`Resent OTP for user: ${user.email}`);

    return {
      otp: otpCode,
      message: `A new 6-digit OTP code has been generated (Valid for ${config.otp.expiryMinutes} minutes).`,
    };
  }

  /**
   * 4. User Login with Password Verification
   */
  public static async login(data: LoginInput): Promise<{
    user: UserResponse;
    token: string;
    requiresOtp: boolean;
    message: string;
  }> {
    const user = await this.findUserByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email address or password.');
    }

    if (user.is_active === false) {
      throw new UnauthorizedError('Account has been deactivated. Please contact platform administration.');
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email address or password.');
    }

    const token = this.generateToken(user);

    logger.info(`User login successful: ${user.email} [${user.role}]`);

    return {
      user: this.formatUser(user),
      token,
      requiresOtp: !user.is_verified,
      message: user.is_verified
        ? 'Login successful. Welcome back!'
        : 'Login successful. Note: Please verify your email with OTP.',
    };
  }

  /**
   * 5. Forgot Password: Generate Reset Code / Token
   */
  public static async forgotPassword(email: string): Promise<{
    resetToken: string;
    message: string;
  }> {
    const user = await this.findUserByEmail(email);
    const resetToken = this.generateOtp(); // 6-digit reset code
    const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (user) {
      user.reset_password_token = resetToken;
      user.reset_password_expires_at = resetExpiresAt;
      user.updated_at = new Date();
      await this.saveUser(user);

      logger.info(`Password reset requested for: ${user.email}`);
    }

    return {
      resetToken: config.isDevelopment ? resetToken : (undefined as any),
      message:
        'If an account exists with this email address, a password reset code has been issued (Valid for 15 minutes).',
    };
  }

  /**
   * 6. Reset Password with Token/Code
   */
  public static async resetPassword(data: ResetPasswordInput): Promise<{
    message: string;
  }> {
    const user = await this.findUserByEmail(data.email);
    if (!user) {
      throw new NotFoundError('No user found with this email address');
    }

    if (
      !user.reset_password_token ||
      !timingSafeCompare(user.reset_password_token, data.token)
    ) {
      throw new BadRequestError('Invalid or expired password reset token.');
    }

    if (
      user.reset_password_expires_at &&
      new Date() > new Date(user.reset_password_expires_at)
    ) {
      throw new BadRequestError('Password reset token has expired. Please request a new one.');
    }

    const newHash = await bcrypt.hash(data.newPassword, 10);
    user.password_hash = newHash;
    user.reset_password_token = null;
    user.reset_password_expires_at = null;
    user.updated_at = new Date();

    await this.saveUser(user);

    logger.info(`Password reset completed successfully for user: ${user.email}`);

    return {
      message: 'Password has been successfully reset. You may now log in with your new password.',
    };
  }

  /**
   * 7. Get Authenticated User Profile
   */
  public static async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User profile could not be found');
    }
    return this.formatUser(user);
  }

  /**
   * 8. Retrieve All Registered Users (Platform Administration)
   */
  public static async getAllUsers(): Promise<UserEntity[]> {
    try {
      const res = await db.query<UserEntity>(
        `SELECT id, email, full_name, role, phone, password_hash, is_verified,
                COALESCE(is_active, true) as is_active,
                created_at, updated_at
         FROM users ORDER BY created_at DESC;`
      );
      if (res.rows.length > 0) {
        return res.rows;
      }
    } catch (err) {
      logger.debug('PostgreSQL unavailable, using in-memory store for getAllUsers');
    }
    return Array.from(inMemoryUsers.values());
  }

  /**
   * 9. Direct update/save user entity helper
   */
  public static async saveUserEntity(user: UserEntity): Promise<void> {
    return this.saveUser(user);
  }
}

