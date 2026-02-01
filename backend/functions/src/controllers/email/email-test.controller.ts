/**
 * Email Test Controller
 * Public endpoint for testing email configuration
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { notificationService } from "../../services/notification/notification.service";
import { auditLogService } from "../../services/audit/audit-log.service";
import { AuditAction, AuditSeverity } from "../../types/audit-log.types";

export class EmailTestController {
  /**
   * Send a test email (PUBLIC endpoint)
   * POST /api/v1/public/test-email
   * 
   * Body:
   * {
   *   "to": "test@example.com",
   *   "provider": "resend" | "smtp" | "sendgrid" (optional)
   * }
   */
  static sendTestEmail = async (req: Request, res: Response) => {
    const startTime = Date.now();
    const clientIp = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

    try {
      const { to, provider } = req.body;

      // Validation
      if (!to) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email address is required',
            field: 'to',
          },
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            field: 'to',
          },
        });
      }

      logger.info('📧 Sending test email', {
        to,
        provider: provider || 'default',
        clientIp,
      });

      // Send test email directly using email service (bypass notification service)
      const { EmailService } = await import('../../services/notification/EmailService');
      const emailService = new EmailService();
      
      const emailResult = await emailService.sendEmail(
        to,
        'AttendanceX - Test Email',
        {
          html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.6;
                color: #334155;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                color: white;
                padding: 30px;
                border-radius: 12px 12px 0 0;
                text-align: center;
              }
              .content {
                background: white;
                padding: 30px;
                border: 1px solid #e2e8f0;
                border-top: none;
                border-radius: 0 0 12px 12px;
              }
              .badge {
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                margin: 20px 0;
              }
              .info-box {
                background: #f1f5f9;
                border-left: 4px solid #3b82f6;
                padding: 16px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                color: #64748b;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
              }
              .success-icon {
                font-size: 48px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">✅ Email Test Successful!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AttendanceX Email System</p>
            </div>
            
            <div class="content">
              <div style="text-align: center;">
                <div class="success-icon">🎉</div>
                <div class="badge">Configuration Working</div>
              </div>
              
              <h2 style="color: #1e293b; margin-top: 30px;">Test Email Details</h2>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>Provider:</strong> ${provider || 'Default (Resend)'}</p>
                <p style="margin: 8px 0 0 0;"><strong>Sent to:</strong> ${to}</p>
                <p style="margin: 8px 0 0 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p style="margin: 8px 0 0 0;"><strong>Client IP:</strong> ${clientIp}</p>
              </div>
              
              <h3 style="color: #1e293b; margin-top: 30px;">What This Means</h3>
              <p>If you're reading this email, it means:</p>
              <ul style="color: #475569;">
                <li>✅ Your email provider is correctly configured</li>
                <li>✅ The API key is valid and working</li>
                <li>✅ Email delivery is functional</li>
                <li>✅ DNS records are properly set up</li>
              </ul>
              
              <h3 style="color: #1e293b; margin-top: 30px;">Next Steps</h3>
              <p>Your email system is ready to use for:</p>
              <ul style="color: #475569;">
                <li>User registration confirmations</li>
                <li>Password reset emails</li>
                <li>Event notifications</li>
                <li>System alerts</li>
              </ul>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ Note:</strong> This is a test email sent from the public test endpoint. In production, ensure this endpoint is properly secured or disabled.</p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>AttendanceX</strong> - Event Management System</p>
              <p style="font-size: 12px; color: #94a3b8;">
                This is an automated test email. Please do not reply.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
AttendanceX - Test Email

✅ Email Test Successful!

Your email configuration is working correctly.

Test Details:
- Provider: ${provider || 'Default (Resend)'}
- Sent to: ${to}
- Timestamp: ${new Date().toISOString()}
- Client IP: ${clientIp}

What This Means:
✅ Your email provider is correctly configured
✅ The API key is valid and working
✅ Email delivery is functional
✅ DNS records are properly set up

Next Steps:
Your email system is ready to use for:
- User registration confirmations
- Password reset emails
- Event notifications
- System alerts

---
AttendanceX - Event Management System
This is an automated test email. Please do not reply.
        `,
        },
        {
          userId: 'test-user',
          trackingId: `test-${Date.now()}`,
        }
      );

      if (!emailResult.success) {
        throw new Error(emailResult.errors?.[0] || 'Failed to send email');
      }

      const duration = Date.now() - startTime;

      // Log to audit (without tenant context for public endpoint)
      try {
        await auditLogService.createLog('system', {
          action: AuditAction.EMAIL_SEND,
          severity: AuditSeverity.INFO,
          actorId: 'public-test',
          actorIp: clientIp,
          actorUserAgent: req.headers['user-agent'],
          targetType: 'email',
          targetId: to,
          description: `Test email sent to ${to}`,
          metadata: {
            provider: provider || 'default',
            messageId: emailResult.messageId,
            duration,
          },
          success: true,
          endpoint: req.path,
          method: req.method,
        });
      } catch (auditError) {
        // Don't fail the request if audit logging fails
        logger.warn('Failed to create audit log for test email', auditError);
      }

      logger.info(`✅ Test email sent successfully in ${duration}ms`, {
        to,
        provider: provider || 'default',
        messageId: emailResult.messageId,
        duration,
      });

      res.json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          to,
          provider: provider || 'default',
          messageId: emailResult.messageId,
          timestamp: new Date().toISOString(),
          duration: `${duration}ms`,
        },
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error(`❌ Failed to send test email after ${duration}ms`, {
        error: error.message,
        to: req.body.to,
        provider: req.body.provider,
        clientIp,
        duration,
      });

      // Log failure to audit
      try {
        await auditLogService.createLog('system', {
          action: AuditAction.EMAIL_FAIL,
          severity: AuditSeverity.ERROR,
          actorId: 'public-test',
          actorIp: clientIp,
          actorUserAgent: req.headers['user-agent'],
          targetType: 'email',
          targetId: req.body.to,
          description: `Failed to send test email to ${req.body.to}`,
          metadata: {
            provider: req.body.provider || 'default',
            error: error.message,
            duration,
          },
          success: false,
          errorMessage: error.message,
          endpoint: req.path,
          method: req.method,
        });
      } catch (auditError) {
        logger.warn('Failed to create audit log for failed test email', auditError);
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send test email',
          details: error.message,
        },
      });
    }
  };
}
