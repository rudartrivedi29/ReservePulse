import crypto from 'crypto';

/**
 * Generate a cryptographically secure 6-digit numeric OTP code.
 * Uses crypto.randomInt (CSPRNG) instead of Math.random().
 */
export const generateSecureOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Perform a constant-time comparison of two strings to prevent timing attacks.
 * Uses SHA-256 hashing before comparison to ensure equal-length buffers
 * and prevent length-disclosure timing channels.
 */
export const timingSafeCompare = (a: string | null | undefined, b: string | null | undefined): boolean => {
  if (!a || !b) return false;

  const hashA = crypto.createHash('sha256').update(String(a).trim()).digest();
  const hashB = crypto.createHash('sha256').update(String(b).trim()).digest();

  return crypto.timingSafeEqual(hashA, hashB);
};

/**
 * Sanitize SQL identifier or wildcard characters in search queries to prevent LIKE injection
 */
export const escapeLikeWildcards = (str: string): string => {
  return str.replace(/([%_\\])/g, '\\$1');
};
