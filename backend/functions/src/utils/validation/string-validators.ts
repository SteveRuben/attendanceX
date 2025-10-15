// shared/utils/validation/string-validators.ts

export class StringValidators {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  static isNumeric(value: any): boolean {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (!username || !domain || username.length <= 2) {
      return email;
    }
    
    const masked = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
    return `${masked}@${domain}`;
  }

  static maskPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) {
      return phone;
    }
    
    const visible = 4;
    const masked = '*'.repeat(cleaned.length - visible) + cleaned.slice(-visible);
    return masked;
  }
}