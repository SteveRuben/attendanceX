# AttendanceX Security Guide

This comprehensive security guide covers AttendanceX's security architecture, implementation details, and best practices for maintaining a secure multi-tenant environment.

## 🛡️ Security Overview

AttendanceX is built with **security-first principles**, implementing enterprise-grade security measures across all layers of the application. Our multi-tenant architecture ensures complete data isolation while maintaining high performance and usability.

### Security Principles

- **Zero Trust Architecture**: Never trust, always verify
- **Defense in Depth**: Multiple layers of security controls
- **Principle of Least Privilege**: Minimal access rights by default
- **Data Privacy by Design**: GDPR and privacy compliance built-in
- **Continuous Security**: Automated monitoring and threat detection

## 🔐 Authentication & Authorization

### JWT Authentication Flow

AttendanceX uses a robust JWT-based authentication system with refresh tokens and tenant context:

```typescript
interface JWTPayload {
  uid: string;           // User ID
  email: string;         // User email
  tenantId: string;      // Tenant isolation
  role: string;          // User role
  permissions: string[]; // Granular permissions
  iat: number;          // Issued at
  exp: number;          // Expiration
  aud: string;          // Audience
  iss: string;          // Issuer
}

// Token generation with tenant context
export const generateTokens = async (user: User): Promise<TokenPair> => {
  const payload: JWTPayload = {
    uid: user.id,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
    permissions: user.permissions.map(p => `${p.resource}:${p.action}`),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    aud: 'attendancex-api',
    iss: 'attendancex-auth'
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
  const refreshToken = jwt.sign(
    { uid: user.id, tenantId: user.tenantId }, 
    JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};
```

### Multi-Factor Authentication (2FA)

```typescript
// TOTP-based 2FA implementation
export class TwoFactorService {
  async enableTwoFactor(userId: string, tenantId: string): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: `AttendanceX (${tenantId})`,
      account: userId,
      issuer: 'AttendanceX'
    });
    
    // Store secret securely (encrypted)
    await this.storeTwoFactorSecret(userId, secret.base32);
    
    return {
      secret: secret.base32,
      qrCode: await QRCode.toDataURL(secret.otpauth_url!),
      backupCodes: await this.generateBackupCodes(userId)
    };
  }
  
  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const secret = await this.getTwoFactorSecret(userId);
    
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds)
    });
  }
}
```

### Role-Based Access Control (RBAC)

AttendanceX implements a sophisticated RBAC system with tenant-scoped permissions:

```typescript
interface Permission {
  id: string;
  resource: string;      // 'users', 'attendance', 'billing', etc.
  action: string;        // 'create', 'read', 'update', 'delete'
  scope: PermissionScope;
  conditions?: PermissionCondition[];
}

enum PermissionScope {
  OWN = 'own',           // Own resources only
  TEAM = 'team',         // Team resources
  DEPARTMENT = 'dept',   // Department resources  
  ORGANIZATION = 'org'   // All tenant resources
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  tenantId: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Permission checking middleware
export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    const targetResource = req.params.id || req.body.id;
    
    const hasPermission = await permissionService.checkPermission(
      user,
      resource,
      action,
      targetResource
    );
    
    if (!hasPermission) {
      throw new ForbiddenError(`Insufficient permissions for ${action} on ${resource}`);
    }
    
    next();
  };
};
```

## 🏢 Multi-Tenant Security

### Tenant Isolation

Complete data isolation is enforced at multiple levels:

#### 1. Database Level Isolation

```typescript
// All queries automatically include tenant filtering
export class TenantScopedService {
  protected async query<T>(
    collection: CollectionReference,
    additionalFilters: QueryConstraint[] = []
  ): Promise<T[]> {
    const tenantId = this.getCurrentTenantId();
    
    const query = collection
      .where('tenantId', '==', tenantId)
      .where(...additionalFilters);
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as T);
  }
}

// Example usage - users are automatically filtered by tenant
export class UserService extends TenantScopedService {
  async getUsers(filters?: UserFilters): Promise<User[]> {
    const additionalFilters = [];
    
    if (filters?.role) {
      additionalFilters.push(where('role', '==', filters.role));
    }
    
    return this.query<User>(collections.users, additionalFilters);
  }
}
```

#### 2. API Level Isolation

```typescript
// Tenant context middleware ensures all requests are scoped
export const tenantContextMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  
  if (!user?.tenantId) {
    throw new UnauthorizedError('Tenant context required');
  }
  
  // Verify tenant is active and user has access
  const tenant = await tenantService.getTenant(user.tenantId);
  if (!tenant || !tenant.isActive) {
    throw new ForbiddenError('Tenant access denied');
  }
  
  // Add tenant context to request
  req.tenantId = user.tenantId;
  req.tenant = tenant;
  
  next();
};
```

#### 3. UI Level Isolation

```typescript
// React context for tenant-aware components
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  useEffect(() => {
    if (user?.tenantId) {
      tenantService.getTenant(user.tenantId).then(setTenant);
    }
  }, [user?.tenantId]);
  
  return (
    <TenantContext.Provider value={{ tenant, tenantId: user?.tenantId }}>
      {children}
    </TenantContext.Provider>
  );
};
```

## 🔒 Data Protection

### Encryption at Rest

All sensitive data is encrypted using AES-256 encryption:

```typescript
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  
  encrypt(text: string, key?: string): EncryptedData {
    const encryptionKey = key ? Buffer.from(key, 'hex') : this.getDefaultKey();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(this.algorithm, encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encryptedData: EncryptedData, key?: string): string {
    const encryptionKey = key ? Buffer.from(key, 'hex') : this.getDefaultKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage for sensitive fields
interface UserDocument {
  id: string;
  email: string;
  // Encrypted fields
  personalInfo: EncryptedData;  // PII data
  bankDetails?: EncryptedData;  // Financial data
  medicalInfo?: EncryptedData;  // Health data
}
```

### Encryption in Transit

All communications use TLS 1.3 with perfect forward secrecy:

```typescript
// Express.js security configuration
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

## 🚫 Rate Limiting & DDoS Protection

### Smart Rate Limiting

```typescript
export class SmartRateLimiter {
  private readonly limits = new Map<string, RateLimit>();
  
  // Different limits for different endpoints
  private readonly endpointLimits: Record<string, RateLimitConfig> = {
    '/auth/login': { requests: 5, window: 60000, blockDuration: 300000 },
    '/auth/register': { requests: 3, window: 60000, blockDuration: 600000 },
    '/api/users': { requests: 100, window: 60000, blockDuration: 60000 },
    '/api/attendance': { requests: 200, window: 60000, blockDuration: 30000 }
  };
  
  async checkLimit(
    identifier: string, 
    endpoint: string, 
    userTier: 'free' | 'premium' | 'enterprise' = 'free'
  ): Promise<RateLimitResult> {
    const config = this.getConfigForEndpoint(endpoint, userTier);
    const key = `${identifier}:${endpoint}`;
    
    const current = this.limits.get(key) || { count: 0, resetTime: Date.now() + config.window };
    
    // Reset if window expired
    if (Date.now() > current.resetTime) {
      current.count = 0;
      current.resetTime = Date.now() + config.window;
    }
    
    current.count++;
    this.limits.set(key, current);
    
    const remaining = Math.max(0, config.requests - current.count);
    const isAllowed = current.count <= config.requests;
    
    return {
      isAllowed,
      remaining,
      resetTime: current.resetTime,
      retryAfter: isAllowed ? 0 : config.blockDuration
    };
  }
}
```

### DDoS Protection

```typescript
// Advanced DDoS protection middleware
export const ddosProtection = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    // Different limits based on authentication status
    if (req.user) {
      return req.user.tier === 'enterprise' ? 10000 : 1000;
    }
    return 100; // Unauthenticated users
  },
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator for better tracking
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  // Skip successful requests for authenticated users
  skipSuccessfulRequests: (req) => !!req.user,
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      userId: req.user?.id
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please slow down',
        retryAfter: 900 // 15 minutes
      }
    });
  }
});
```

## 📝 Audit Logging

### Comprehensive Audit Trail

```typescript
interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  async logAction(
    tenantId: string,
    userId: string,
    action: string,
    resource: string,
    details: Partial<AuditEntry>,
    req: Request
  ): Promise<void> {
    const auditEntry: AuditEntry = {
      id: generateId(),
      tenantId,
      userId,
      action,
      resource,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      success: true,
      ...details
    };
    
    // Store in audit log collection
    await collections.auditLogs.add(auditEntry);
    
    // Also log to external audit system for compliance
    await this.sendToExternalAuditSystem(auditEntry);
  }
  
  private getClientIP(req: Request): string {
    return (
      req.get('CF-Connecting-IP') ||     // Cloudflare
      req.get('X-Forwarded-For') ||      // Proxy
      req.get('X-Real-IP') ||            // Nginx
      req.connection.remoteAddress ||    // Direct connection
      'Unknown'
    );
  }
}

// Audit middleware for automatic logging
export const auditMiddleware = (action: string, resource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response
      setImmediate(async () => {
        try {
          await auditService.logAction(
            req.tenantId!,
            req.user!.uid,
            action,
            resource,
            {
              resourceId: req.params.id,
              success: res.statusCode < 400,
              errorMessage: res.statusCode >= 400 ? data : undefined
            },
            req
          );
        } catch (error) {
          logger.error('Audit logging failed', { error, action, resource });
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};
```

## 🔍 Security Monitoring

### Real-time Threat Detection

```typescript
export class SecurityMonitoringService {
  private readonly suspiciousPatterns = [
    /union.*select/i,           // SQL injection
    /<script.*>/i,              // XSS attempts
    /\.\.\/.*etc\/passwd/i,     // Path traversal
    /eval\s*\(/i,              // Code injection
  ];
  
  async analyzeRequest(req: Request): Promise<SecurityAnalysis> {
    const analysis: SecurityAnalysis = {
      riskScore: 0,
      threats: [],
      blocked: false
    };
    
    // Check for suspicious patterns
    const requestData = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(requestData)) {
        analysis.threats.push({
          type: 'MALICIOUS_PATTERN',
          pattern: pattern.source,
          severity: 'HIGH'
        });
        analysis.riskScore += 50;
      }
    }
    
    // Check for unusual behavior
    const userBehavior = await this.analyzeUserBehavior(req);
    analysis.riskScore += userBehavior.riskScore;
    analysis.threats.push(...userBehavior.threats);
    
    // Block if risk score is too high
    analysis.blocked = analysis.riskScore >= 80;
    
    if (analysis.blocked || analysis.riskScore >= 50) {
      await this.alertSecurityTeam(analysis, req);
    }
    
    return analysis;
  }
  
  private async analyzeUserBehavior(req: Request): Promise<BehaviorAnalysis> {
    const userId = req.user?.uid;
    if (!userId) return { riskScore: 0, threats: [] };
    
    const recentActivity = await this.getRecentActivity(userId);
    
    // Check for unusual patterns
    const analysis: BehaviorAnalysis = { riskScore: 0, threats: [] };
    
    // Rapid requests from same user
    if (recentActivity.requestCount > 1000) {
      analysis.threats.push({
        type: 'RAPID_REQUESTS',
        severity: 'MEDIUM'
      });
      analysis.riskScore += 30;
    }
    
    // Login from new location
    if (recentActivity.newLocation) {
      analysis.threats.push({
        type: 'NEW_LOCATION',
        severity: 'LOW'
      });
      analysis.riskScore += 10;
    }
    
    return analysis;
  }
}
```

### Automated Incident Response

```typescript
export class IncidentResponseService {
  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // Immediate response based on severity
    switch (incident.severity) {
      case 'CRITICAL':
        await this.lockdownAccount(incident.userId);
        await this.notifySecurityTeam(incident, 'IMMEDIATE');
        await this.blockIPAddress(incident.ipAddress);
        break;
        
      case 'HIGH':
        await this.requireReauthentication(incident.userId);
        await this.notifySecurityTeam(incident, 'URGENT');
        await this.increaseSurveillance(incident.userId);
        break;
        
      case 'MEDIUM':
        await this.logSecurityEvent(incident);
        await this.notifySecurityTeam(incident, 'NORMAL');
        break;
        
      case 'LOW':
        await this.logSecurityEvent(incident);
        break;
    }
    
    // Update threat intelligence
    await this.updateThreatIntelligence(incident);
  }
  
  private async lockdownAccount(userId: string): Promise<void> {
    // Disable account temporarily
    await userService.updateUser(userId, { 
      isActive: false, 
      lockdownReason: 'SECURITY_INCIDENT',
      lockdownAt: new Date()
    });
    
    // Invalidate all sessions
    await sessionService.invalidateAllSessions(userId);
    
    // Notify user via secure channel
    await notificationService.sendSecurityAlert(userId, 'ACCOUNT_LOCKED');
  }
}
```

## 🛡️ GDPR & Privacy Compliance

### Data Privacy Implementation

```typescript
export class PrivacyService {
  // Right to be forgotten (GDPR Article 17)
  async deleteUserData(userId: string, tenantId: string): Promise<DeletionReport> {
    const report: DeletionReport = {
      userId,
      tenantId,
      startedAt: new Date(),
      collections: [],
      errors: []
    };
    
    try {
      // Delete from all collections
      const collections = [
        'users', 'attendance', 'appointments', 'orders', 
        'invoices', 'audit_logs', 'notifications'
      ];
      
      for (const collectionName of collections) {
        try {
          const deleted = await this.deleteFromCollection(collectionName, userId, tenantId);
          report.collections.push({
            name: collectionName,
            recordsDeleted: deleted,
            status: 'SUCCESS'
          });
        } catch (error) {
          report.errors.push({
            collection: collectionName,
            error: error.message
          });
        }
      }
      
      // Anonymize audit logs (can't delete for compliance)
      await this.anonymizeAuditLogs(userId, tenantId);
      
      report.completedAt = new Date();
      return report;
      
    } catch (error) {
      report.errors.push({ error: error.message });
      throw error;
    }
  }
  
  // Data portability (GDPR Article 20)
  async exportUserData(userId: string, tenantId: string): Promise<UserDataExport> {
    const exportData: UserDataExport = {
      userId,
      tenantId,
      exportedAt: new Date(),
      data: {}
    };
    
    // Export personal data from all relevant collections
    exportData.data.profile = await this.exportUserProfile(userId, tenantId);
    exportData.data.attendance = await this.exportAttendanceData(userId, tenantId);
    exportData.data.appointments = await this.exportAppointments(userId, tenantId);
    exportData.data.communications = await this.exportCommunications(userId, tenantId);
    
    return exportData;
  }
  
  // Consent management
  async updateConsent(userId: string, tenantId: string, consent: ConsentUpdate): Promise<void> {
    const consentRecord: ConsentRecord = {
      userId,
      tenantId,
      consentType: consent.type,
      granted: consent.granted,
      timestamp: new Date(),
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
      version: consent.policyVersion
    };
    
    await collections.consents.add(consentRecord);
    
    // Update user preferences based on consent
    await this.updateUserPreferences(userId, consent);
  }
}
```

## 🔧 Security Configuration

### Environment Security

```bash
# .env.production (example)
# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here
JWT_REFRESH_SECRET=your-256-bit-refresh-secret-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Encryption Keys
ENCRYPTION_KEY=your-256-bit-encryption-key-here
DATABASE_ENCRYPTION_KEY=your-database-encryption-key-here

# Security Headers
SECURITY_HEADERS_ENABLED=true
HSTS_MAX_AGE=31536000
CSP_ENABLED=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Audit Logging
AUDIT_LOGGING_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years for compliance

# Security Monitoring
SECURITY_MONITORING_ENABLED=true
THREAT_DETECTION_ENABLED=true
AUTO_INCIDENT_RESPONSE=true
```

### Security Headers Configuration

```typescript
// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};
```

## 📋 Security Checklist

### Development Security

- [ ] **Code Review**: All code changes reviewed for security issues
- [ ] **Static Analysis**: Automated security scanning with SonarQube
- [ ] **Dependency Scanning**: Regular updates and vulnerability checks
- [ ] **Secret Management**: No hardcoded secrets in code
- [ ] **Input Validation**: All user inputs validated and sanitized
- [ ] **Output Encoding**: All outputs properly encoded
- [ ] **Error Handling**: No sensitive information in error messages

### Infrastructure Security

- [ ] **TLS/SSL**: All communications encrypted with TLS 1.3+
- [ ] **Firewall**: Proper network segmentation and access controls
- [ ] **Monitoring**: Real-time security monitoring and alerting
- [ ] **Backup Security**: Encrypted backups with access controls
- [ ] **Patch Management**: Regular security updates applied
- [ ] **Access Control**: Principle of least privilege enforced
- [ ] **Incident Response**: Documented procedures and regular drills

### Compliance Security

- [ ] **GDPR Compliance**: Data privacy rights implemented
- [ ] **Audit Logging**: Comprehensive activity tracking
- [ ] **Data Retention**: Automated data lifecycle management
- [ ] **Consent Management**: User consent tracking and management
- [ ] **Data Portability**: User data export functionality
- [ ] **Right to Erasure**: Secure data deletion procedures
- [ ] **Privacy by Design**: Privacy considerations in all features

## 🚨 Incident Response

### Security Incident Classification

| Severity | Description | Response Time | Actions |
|----------|-------------|---------------|---------|
| **Critical** | Data breach, system compromise | Immediate | Lockdown, notify authorities |
| **High** | Unauthorized access, privilege escalation | 1 hour | Investigate, contain, notify users |
| **Medium** | Suspicious activity, failed attacks | 4 hours | Monitor, analyze, update defenses |
| **Low** | Policy violations, minor issues | 24 hours | Log, review, improve processes |

### Emergency Contacts

- **Security Team**: security@attendancex.com
- **Incident Response**: incident@attendancex.com
- **Legal/Compliance**: legal@attendancex.com
- **External Security Firm**: [Contact Information]

---

This security guide provides comprehensive coverage of AttendanceX's security implementation. For specific security procedures or to report security issues, contact our security team at security@attendancex.com.