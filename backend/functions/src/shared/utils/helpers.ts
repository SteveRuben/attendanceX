export class StringUtils {
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static camelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');
  }

  static kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) {
      return str;
    }
    return str.substring(0, length - suffix.length) + suffix;
  }

  static slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static generateRandomString(length: number, includeNumbers: boolean = true): string {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const chars = includeNumbers ? letters + numbers : letters;
    
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
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

export class NumberUtils {
  static formatCurrency(amount: number, currency: string = 'EUR', locale: string = 'fr-FR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  static formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  static roundToDecimals(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  static randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  static randomIntBetween(min: number, max: number): number {
    return Math.floor(this.randomBetween(min, max + 1));
  }

  static isNumeric(value: any): boolean {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  static bytesToHuman(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
      return '0 Bytes';
    }
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export class ArrayUtils {
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  static sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i] as any, shuffled[j] as any] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static intersection<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter(x => arr2.includes(x));
  }

  static difference<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter(x => !arr2.includes(x));
  }

  static flatten<T>(array: (T | T[])[]): T[] {
    // @ts-ignore
   return array.reduce(
      (flat, item) =>
        Array.isArray(item)
      // @ts-ignore
          ? flat.concat(this.flatten(item))
          // @ts-ignore
          : flat.concat([item]),
      [] as T[]
    );
  }
}

export class ObjectUtils {
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  }

  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }
    if (typeof obj === 'object') {
      const copy = {} as any;
      Object.keys(obj).forEach(key => {
        copy[key] = this.deepClone((obj as any)[key]);
      });
      return copy;
    }
    return obj;
  }

  static merge<T, U>(obj1: T, obj2: U): T & U {
    return { ...obj1, ...obj2 };
  }

  static isEmpty(obj: any): boolean {
    if (obj === null || obj === undefined) {
      return true;
    }
    if (Array.isArray(obj) || typeof obj === 'string') {
      return obj.length === 0;
    }
    if (typeof obj === 'object') {
      return Object.keys(obj).length === 0;
    }
    return false;
  }

  static hasProperty(obj: any, path: string): boolean {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return false;
      }
      current = current[key];
    }
    
    return true;
  }

  static getProperty(obj: any, path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current;
  }
}