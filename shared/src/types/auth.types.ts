// shared/types/auth.types.ts

import { BaseEntity, GeoPoint } from "./common.types";
import { User, UserPermissions } from "./user.types";

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
  rememberMe?: boolean;
  deviceInfo?: {
    type: 'web' | 'mobile' | 'tablet';
    name: string;
    os?: string;
    browser?: string;
  };
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  permissions: UserPermissions;
  sessionId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorSetupRequest {
  enable: boolean;
  method: 'sms' | 'email' | 'authenticator';
  phoneNumber?: string;
}

export interface TwoFactorVerifyRequest {
  code: string;
  method: 'sms' | 'email' | 'authenticator';
}

export interface AuthSession {
  isAuthenticated: boolean;
  user?: User;
  permissions?: UserPermissions;
  sessionId?: string;
  expiresAt?: Date;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'password_change' | 'failed_login' | 'account_locked' | 'suspicious_activity';
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    coordinates?: GeoPoint;
  };
  details?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface EmailVerificationToken extends BaseEntity {
  userId: string;
  hashedToken: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    resendCount: number;
    originalRequestIp: string;
  };
}