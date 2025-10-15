// shared/utils/common/array-utils.ts

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