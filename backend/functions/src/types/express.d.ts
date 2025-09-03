/**
 * Extension des types Express pour inclure les propriétés utilisateur
 */

import { UserRole } from '@attendance-x/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: UserRole;
        employeeId?: string;
        permissions: Record<string, boolean>;
        clientIp?: string;
        sessionId?: string;
      };
    }
  }
}

export {};