import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { successResponse } from '../utils/apiResponse';
import {
  SignupInput,
  LoginInput,
  VerifyOtpInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

export class AuthController {
  /**
   * POST /api/v1/auth/signup
   */
  public static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: SignupInput = req.body;
      const result = await AuthService.signup(data);
      res.status(201).json(successResponse(result, result.message));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/verify-otp
   */
  public static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: VerifyOtpInput = req.body;
      const result = await AuthService.verifyOtp(data);
      res.status(200).json(successResponse(result, result.message));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/resend-otp
   */
  public static async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.resendOtp(email);
      res.status(200).json(successResponse(result, result.message));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: LoginInput = req.body;
      const result = await AuthService.login(data);
      res.status(200).json(successResponse(result, result.message));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   */
  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      res.status(200).json(successResponse(result, result.message));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: ResetPasswordInput = req.body;
      const result = await AuthService.resetPassword(data);
      res.status(200).json(successResponse(result, result.message));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await AuthService.getCurrentUser(userId);
      res.status(200).json(successResponse(user, 'Current user profile retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }
}
