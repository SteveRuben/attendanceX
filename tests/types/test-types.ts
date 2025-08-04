// tests/types/test-types.ts
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email: string;
    sessionId?: string;
  };
}