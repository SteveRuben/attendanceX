import { Request, Response, NextFunction } from "express";
import { logger } from "firebase-functions";
import crypto from "crypto";

interface WebhookRequest extends Request {
  body: {
    signature?: string;
    timestamp: string;
  };
  rawBody?: Buffer;
}

/**
 * Middleware to validate webhook signatures
 * Prevents unauthorized webhook calls and replay attacks
 */
export const webhookSignatureValidation = (
  req: WebhookRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const signature = req.body.signature || req.headers['x-webhook-signature'] as string;
    const timestamp = req.body.timestamp || req.headers['x-webhook-timestamp'] as string;
    
    // Skip validation if no signature provided (for development)
    if (!signature && process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ Webhook signature validation skipped in development mode');
      return next();
    }

    if (!signature) {
      logger.error('❌ Missing webhook signature');
      res.status(401).json({
        success: false,
        error: 'Missing webhook signature'
      });
      return;
    }

    if (!timestamp) {
      logger.error('❌ Missing webhook timestamp');
      res.status(401).json({
        success: false,
        error: 'Missing webhook timestamp'
      });
      return;
    }

    // Validate timestamp (prevent replay attacks)
    const webhookTime = new Date(timestamp);
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (now.getTime() - webhookTime.getTime() > maxAge) {
      logger.error('❌ Webhook timestamp too old', {
        timestamp,
        age: now.getTime() - webhookTime.getTime()
      });
      res.status(401).json({
        success: false,
        error: 'Webhook timestamp too old'
      });
      return;
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('❌ Webhook secret not configured');
      res.status(500).json({
        success: false,
        error: 'Webhook validation not configured'
      });
      return;
    }

    // Validate signature
    const payload = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature = generateWebhookSignature(payload, webhookSecret, timestamp);

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      logger.error('❌ Invalid webhook signature', {
        provided: signature.substring(0, 10) + '...',
        expected: expectedSignature.substring(0, 10) + '...'
      });
      res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
      return;
    }

    logger.info('✅ Webhook signature validated successfully');
    next();

  } catch (error: any) {
    logger.error('❌ Error validating webhook signature', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Webhook validation failed'
    });
    return;
  }
};

/**
 * Generate webhook signature using HMAC-SHA256
 */
function generateWebhookSignature(payload: Buffer, secret: string, timestamp: string): string {
  const signaturePayload = `${timestamp}.${payload.toString()}`;
  return crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
}

/**
 * Middleware to capture raw body for signature validation
 */
export const captureRawBody = (
  req: WebhookRequest,
  res: Response,
  next: NextFunction
): void => {
  let data = '';
  
  req.on('data', (chunk) => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = Buffer.from(data);
    next();
  });
};