/**
 * TypeScript type extensions for Express
 * Fixes type issues with req.params and req.query
 */

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      // Override params to always be Record<string, string> instead of ParamsDictionary
      params: Record<string, string>;
      // Override query to have better typing
      query: Record<string, string>;
    }
  }
}

export {};
