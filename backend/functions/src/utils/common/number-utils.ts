// shared/utils/common/number-utils.ts

export class NumberUtils {
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
}