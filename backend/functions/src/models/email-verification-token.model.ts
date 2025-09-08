import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { EmailVerificationToken } from "../shared";
import * as crypto from "crypto";

export class EmailVerificationTokenModel extends BaseModel<EmailVerificationToken> {
  constructor(data: Partial<EmailVerificationToken>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const token = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(token, [
      "userId", "hashedToken", "expiresAt", "isUsed"
    ]);

    // Validation du userId
    if (!token.userId || typeof token.userId !== "string" || token.userId.trim().length === 0) {
      throw new Error("Invalid userId");
    }

    // Validation du hashedToken
    if (!token.hashedToken || typeof token.hashedToken !== "string" || token.hashedToken.length !== 64) {
      throw new Error("Invalid hashedToken - must be 64 character SHA-256 hash");
    }

    // Validation de la date d'expiration
    if (!BaseModel.validateDate(token.expiresAt)) {
      throw new Error("Invalid expiresAt date");
    }

    // Validation que la date d'expiration est dans le futur (pour les nouveaux tokens)
    if (!token.isUsed && token.expiresAt <= new Date()) {
      throw new Error("Token expiration date must be in the future");
    }

    // Validation du statut isUsed
    if (typeof token.isUsed !== "boolean") {
      throw new Error("isUsed must be a boolean");
    }

    // Validation de usedAt si le token est utilisé
    if (token.isUsed && token.usedAt && !BaseModel.validateDate(token.usedAt)) {
      throw new Error("Invalid usedAt date");
    }

    // Validation de l'adresse IP (si fournie)
    if (token.ipAddress && !this.validateIpAddress(token.ipAddress)) {
      throw new Error("Invalid IP address format");
    }

    // Validation du userAgent (si fourni)
    if (token.userAgent && typeof token.userAgent !== "string") {
      throw new Error("userAgent must be a string");
    }

    // Validation des métadonnées (si fournies)
    if (token.metadata) {
      if (typeof token.metadata !== "object") {
        throw new Error("metadata must be an object");
      }
      
      if (token.metadata.resendCount !== undefined) {
        if (typeof token.metadata.resendCount !== "number" || token.metadata.resendCount < 0) {
          throw new Error("metadata.resendCount must be a non-negative number");
        }
      }

      if (token.metadata.originalRequestIp && !this.validateIpAddress(token.metadata.originalRequestIp)) {
        throw new Error("Invalid originalRequestIp format");
      }
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): EmailVerificationTokenModel | null {
    if (!doc.exists) { return null; }

    const data = doc.data()!;
    const convertedData = EmailVerificationTokenModel.prototype.convertDatesFromFirestore(data);

    return new EmailVerificationTokenModel({
      id: doc.id,
      ...convertedData,
    });
  }

  // Méthodes statiques pour créer des tokens
  static createToken(userId: string, ipAddress?: string, userAgent?: string): { model: EmailVerificationTokenModel; rawToken: string } {
    // Générer un token cryptographiquement sécurisé
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Définir l'expiration à 24 heures
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const tokenData: Partial<EmailVerificationToken> = {
      userId,
      hashedToken,
      expiresAt,
      isUsed: false,
      ipAddress,
      userAgent,
      metadata: {
        resendCount: 0,
        originalRequestIp: ipAddress || '',
      },
    };

    const model = new EmailVerificationTokenModel(tokenData);
    
    return { model, rawToken };
  }

  // Méthode statique pour hasher un token
  static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  // Méthodes d'instance
  isExpired(): boolean {
    return this.data.expiresAt <= new Date();
  }

  isValid(): boolean {
    return !this.data.isUsed && !this.isExpired();
  }

  markAsUsed(): void {
    this.update({
      isUsed: true,
      usedAt: new Date(),
    });
  }

  incrementResendCount(): void {
    const currentCount = this.data.metadata?.resendCount || 0;
    this.update({
      metadata: {
        ...this.data.metadata,
        resendCount: currentCount + 1,
        originalRequestIp: this.data.metadata?.originalRequestIp || '',
      },
    });
  }

  // Validation d'adresse IP
  private validateIpAddress(ip: string): boolean {
    // Permettre "unknown" comme valeur valide pour les cas où l'IP n'est pas disponible
    if (ip === "unknown" || ip === "localhost" || ip === "127.0.0.1") {
      return true;
    }
    
    // Validation IPv4
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // Validation IPv6 (basique)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // Méthode pour obtenir les informations de sécurité
  getSecurityInfo(): {
    isExpired: boolean;
    isUsed: boolean;
    isValid: boolean;
    timeUntilExpiry?: number;
    resendCount: number;
  } {
    const now = new Date();
    const timeUntilExpiry = this.data.expiresAt > now ? 
      this.data.expiresAt.getTime() - now.getTime() : 
      undefined;

    return {
      isExpired: this.isExpired(),
      isUsed: this.data.isUsed,
      isValid: this.isValid(),
      timeUntilExpiry,
      resendCount: this.data.metadata?.resendCount || 0,
    };
  }

  // Méthodes publiques pour les tests
  getTokenData() {
    return this.getData();
  }

  getUserId(): string {
    return this.data.userId;
  }

  getHashedToken(): string {
    return this.data.hashedToken;
  }

  getExpiresAt(): Date {
    return this.data.expiresAt;
  }

  getIsUsed(): boolean {
    return this.data.isUsed;
  }

  getUsedAt(): Date | undefined {
    return this.data.usedAt;
  }

  getIpAddress(): string | undefined {
    return this.data.ipAddress;
  }

  getUserAgent(): string | undefined {
    return this.data.userAgent;
  }

  getMetadata() {
    return this.data.metadata;
  }
}