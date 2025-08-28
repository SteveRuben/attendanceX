// src/utils/performanceOptimization.ts
import { debounce, throttle } from 'lodash-es';

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Observe long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              console.warn('Long task detected:', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              });
              this.recordMetric('longTasks', entry.duration);
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        console.warn('Long task observer not supported');
      }

      // Observe layout shifts
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).value > 0.1) { // CLS threshold
              console.warn('Layout shift detected:', {
                value: (entry as any).value,
                sources: (entry as any).sources
              });
              this.recordMetric('layoutShifts', (entry as any).value);
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('Layout shift observer not supported');
      }
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return { avg, max, min, count: values.length };
  }

  measureFunction<T extends (...args: any[]) => any>(
    fn: T,
    name: string
  ): T {
    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start;
          this.recordMetric(name, duration);
        });
      } else {
        const duration = performance.now() - start;
        this.recordMetric(name, duration);
        return result;
      }
    }) as T;
  }

  measureRender(componentName: string) {
    return {
      start: () => {
        performance.mark(`${componentName}-render-start`);
      },
      end: () => {
        performance.mark(`${componentName}-render-end`);
        performance.measure(
          `${componentName}-render`,
          `${componentName}-render-start`,
          `${componentName}-render-end`
        );
        
        const measure = performance.getEntriesByName(`${componentName}-render`)[0];
        if (measure) {
          this.recordMetric(`render-${componentName}`, measure.duration);
        }
      }
    };
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

/**
 * Virtual scrolling implementation for large lists
 */
export class VirtualScrollManager {
  private container: HTMLElement;
  private itemHeight: number;
  private visibleCount: number;
  private totalCount: number;
  private scrollTop: number = 0;
  private onRenderItems: (startIndex: number, endIndex: number) => void;

  constructor(
    container: HTMLElement,
    itemHeight: number,
    visibleCount: number,
    totalCount: number,
    onRenderItems: (startIndex: number, endIndex: number) => void
  ) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleCount = visibleCount;
    this.totalCount = totalCount;
    this.onRenderItems = onRenderItems;

    this.setupScrollListener();
    this.updateVisibleItems();
  }

  private setupScrollListener() {
    const handleScroll = throttle(() => {
      this.scrollTop = this.container.scrollTop;
      this.updateVisibleItems();
    }, 16); // ~60fps

    this.container.addEventListener('scroll', handleScroll);
  }

  private updateVisibleItems() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + this.visibleCount + 1, // +1 for buffer
      this.totalCount - 1
    );

    this.onRenderItems(startIndex, endIndex);
  }

  updateTotalCount(newCount: number) {
    this.totalCount = newCount;
    this.updateVisibleItems();
  }

  scrollToIndex(index: number) {
    const scrollTop = index * this.itemHeight;
    this.container.scrollTop = scrollTop;
  }
}

/**
 * Image lazy loading utility
 */
export class LazyImageLoader {
  private observer: IntersectionObserver;
  private images: Set<HTMLImageElement> = new Set();

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.loadImage(img);
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }

  observe(img: HTMLImageElement) {
    this.images.add(img);
    this.observer.observe(img);
  }

  unobserve(img: HTMLImageElement) {
    this.images.delete(img);
    this.observer.unobserve(img);
  }

  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
      this.observer.unobserve(img);
    }
  }

  cleanup() {
    this.observer.disconnect();
    this.images.clear();
  }
}

/**
 * Debounced search utility
 */
export function createDebouncedSearch<T>(
  searchFunction: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  const debouncedSearch = debounce(searchFunction, delay);
  
  return {
    search: debouncedSearch,
    cancel: debouncedSearch.cancel
  };
}

/**
 * Optimized event handlers
 */
export const optimizedEventHandlers = {
  scroll: (handler: (event: Event) => void, delay: number = 16) => 
    throttle(handler, delay),
  
  resize: (handler: (event: Event) => void, delay: number = 100) => 
    throttle(handler, delay),
  
  input: (handler: (event: Event) => void, delay: number = 300) => 
    debounce(handler, delay),
  
  search: (handler: (query: string) => void, delay: number = 500) => 
    debounce(handler, delay)
};

/**
 * Memory management utilities
 */
export class MemoryManager {
  private static cleanupTasks: (() => void)[] = [];

  static addCleanupTask(task: () => void) {
    this.cleanupTasks.push(task);
  }

  static cleanup() {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];
  }

  static monitorMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
      };

      if (usage.used / usage.limit > 0.8) {
        console.warn('High memory usage detected:', usage);
        this.cleanup();
      }

      return usage;
    }
    return null;
  }
}

/**
 * Bundle splitting and code splitting utilities
 */
export const loadComponent = async (importFn: () => Promise<any>) => {
  try {
    const module = await importFn();
    return module.default || module;
  } catch (error) {
    console.error('Failed to load component:', error);
    throw error;
  }
};

/**
 * Preloading utilities
 */
export class PreloadManager {
  private static preloadedResources: Set<string> = new Set();

  static preloadRoute(routePath: string) {
    if (this.preloadedResources.has(routePath)) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = routePath;
    document.head.appendChild(link);
    
    this.preloadedResources.add(routePath);
  }

  static preloadImage(src: string): Promise<void> {
    if (this.preloadedResources.has(src)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.preloadedResources.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  static preloadData(url: string): Promise<any> {
    if (this.preloadedResources.has(url)) return Promise.resolve();

    return fetch(url)
      .then(response => response.json())
      .then(data => {
        this.preloadedResources.add(url);
        return data;
      });
  }
}

/**
 * Performance optimization hooks
 */
export function usePerformanceOptimization() {
  const monitor = PerformanceMonitor.getInstance();

  const measureRender = (componentName: string) => {
    return monitor.measureRender(componentName);
  };

  const measureFunction = <T extends (...args: any[]) => any>(
    fn: T,
    name: string
  ): T => {
    return monitor.measureFunction(fn, name);
  };

  const getMetrics = (name: string) => {
    return monitor.getMetrics(name);
  };

  return {
    measureRender,
    measureFunction,
    getMetrics
  };
}

/**
 * React component optimization utilities
 */
export const optimizeComponent = {
  // Memoize expensive calculations
  memoize: <T extends (...args: any[]) => any>(fn: T): T => {
    const cache = new Map();
    return ((...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  // Shallow comparison for props
  shallowEqual: (obj1: any, obj2: any): boolean => {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let key of keys1) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }

    return true;
  }
};

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  PerformanceMonitor.getInstance();
  
  // Monitor memory usage periodically
  setInterval(() => {
    MemoryManager.monitorMemoryUsage();
  }, 30000); // Every 30 seconds

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    MemoryManager.cleanup();
    PerformanceMonitor.getInstance().cleanup();
  });
}