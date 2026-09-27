import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface AuthUserPayload {
  id: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  isVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT Bearer token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Access token is missing or malformed. Expected Bearer token.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired. Please log in again.');
    }
    throw new UnauthorizedError('Invalid access token. Authentication failed.');
  }
};

/**
 * Middleware to optionally attach authenticated user from Bearer token if present
 */
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUserPayload;
    req.user = decoded;
  } catch {
    // Silently ignore invalid token for optional auth
  }
  next();
};

/**
 * Middleware to enforce role-based access control (RBAC)
 * Supports CUSTOMER, ORGANISER, and ADMIN roles (case-insensitive)
 */
export const requireRoles = (...roles: string[]) => {
  const normalizedAllowed = roles.map((r) => r.toUpperCase());

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User session is unauthenticated');
    }

    const userRole = (req.user.role || '').toUpperCase();

    if (!normalizedAllowed.includes(userRole)) {
      throw new ForbiddenError(
        `Access denied. Requires one of [${roles.join(', ')}] role privileges. Your role: ${req.user.role}`
      );
    }

    next();
  };
};

/**
 * Reusable role-specific authorization middlewares
 */
export const requireCustomer = requireRoles('CUSTOMER', 'ADMIN');
export const requireOrganiser = requireRoles('ORGANISER', 'ADMIN');
export const requireAdmin = requireRoles('ADMIN');

/**
 * Require verified email status on active session
 */
export const requireVerified = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('User session is unauthenticated');
  }
  if (!req.user.isVerified) {
    throw new ForbiddenError('Account email verification required. Please verify your OTP first.');
  }
  next();
};
