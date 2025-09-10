// shared/types/auth.types.ts

// shared/types/auth.types.ts
import type { BaseEntity, GeoPoint } from "./common.types";
import type { User, UserPermission } from "./user.types";

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

export interface AuthLoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  permissions: UserPermission[];
  sessionId: string;
  needsOrganization?: boolean; // Nouveau champ pour indiquer si l'utilisateur a besoin d'une organisation
  organizationSetupRequired?: boolean; // Alias pour plus de clarté
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

// ChangePasswordRequest is defined in user.types.ts

// TwoFactorSetupRequest is defined in user.types.ts

// TwoFactorVerifyRequest is defined in user.types.ts

export interface AuthSession {
  isAuthenticated: boolean;
  user?: User;
  permissions?: UserPermission[];
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