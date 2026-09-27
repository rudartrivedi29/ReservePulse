import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { validateBody } from '../validators';
import { successResponse } from '../utils/apiResponse';
import {
  signupSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

// 1. User Registration & Onboarding
router.post('/signup', validateBody(signupSchema), AuthController.signup);

// 2. Email OTP Verification & Resend
router.post('/verify-otp', validateBody(verifyOtpSchema), AuthController.verifyOtp);
router.post('/resend-otp', validateBody(resendOtpSchema), AuthController.resendOtp);

// 3. Credential Login
router.post('/login', validateBody(loginSchema), AuthController.login);

// 4. Password Recovery Flow
router.post('/forgot-password', validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), AuthController.resetPassword);

// 5. Authenticated Profile Probe
router.get('/me', authenticate, AuthController.getMe);

// 6. Role Authorization Verification Probes
router.get('/admin-check', authenticate, requireRoles('ADMIN'), (req, res) => {
  res.json(successResponse({ authorized: true, user: req.user }, 'Admin privilege verified'));
});

router.get('/organiser-check', authenticate, requireRoles('ORGANISER', 'ADMIN'), (req, res) => {
  res.json(successResponse({ authorized: true, user: req.user }, 'Organiser privilege verified'));
});

export const authRoutes = router;
