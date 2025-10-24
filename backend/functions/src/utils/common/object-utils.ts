// shared/utils/common/object-utils.ts

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