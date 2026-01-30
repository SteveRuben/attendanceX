/**
 * Tests de Performance E2E
 * Mesure les performances des pages publiques
 */

import { test, expect } from '@playwright/test';

// Seuils de performance
const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD: 5000, // 5 secondes (tolérant pour cold start)
  API_RESPONSE: 3000, // 3 secondes
  FIRST_CONTENTFUL_PAINT: 2000, // 2 secondes
  TIME_TO_INTERACTIVE: 5000, // 5 secondes
  LARGEST_CONTENTFUL_PAINT: 4000, // 4 secondes
  CUMULATIVE_LAYOUT_SHIFT: 0.1, // Score CLS
};

test.describe('Performance Tests - Events Discovery Page', () => {
  test('should load events page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    // Naviguer vers la page
    await page.goto('/events', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`📊 Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto('/events');
    
    // Attendre que la page soit complètement chargée
    await page.waitForLoadState('networkidle');
    
    // Mesurer les Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};
          
          entries.forEach((entry: any) => {
            if (entry.entryType === 'paint') {
              vitals[entry.name] = entry.startTime;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              vitals.CLS = (vitals.CLS || 0) + entry.value;
            }
          });
          
          resolve(vitals);
        });
        
        observer.observe({ 
          entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] 
        });
        
        // Timeout après 10 secondes
        setTimeout(() => resolve({}), 10000);
      });
    });
    
    console.log('📊 Core Web Vitals:', metrics);
    
    // Vérifier FCP (First Contentful Paint)
    if ((metrics as any)['first-contentful-paint']) {
      expect((metrics as any)['first-contentful-paint']).toBeLessThan(
        PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT
      );
    }
    
    // Vérifier LCP (Largest Contentful Paint)
    if ((metrics as any).LCP) {
      expect((metrics as any).LCP).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LARGEST_CONTENTFUL_PAINT
      );
    }
    
    // Vérifier CLS (Cumulative Layout Shift)
    if ((metrics as any).CLS !== undefined) {
      expect((metrics as any).CLS).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CUMULATIVE_LAYOUT_SHIFT
      );
    }
  });

  test('should measure API response times', async ({ page }) => {
    const apiTimes: { url: string; duration: number }[] = [];
    
    // Intercepter les requêtes API
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/') || url.includes('/public/')) {
        const timing = response.timing();
        if (timing) {
          const duration = timing.responseEnd - timing.requestStart;
          apiTimes.push({ url, duration });
          console.log(`🌐 API call: ${url} - ${duration}ms`);
        }
      }
    });
    
    await page.goto('/events', { waitUntil: 'networkidle' });
    
    // Vérifier que les API calls sont dans les limites
    apiTimes.forEach(({ url, duration }) => {
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE);
    });
    
    console.log(`📊 Total API calls: ${apiTimes.length}`);
    console.log(`📊 Average API time: ${
      apiTimes.reduce((sum, t) => sum + t.duration, 0) / apiTimes.length
    }ms`);
  });

  test('should measure search performance', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.getByPlaceholder('Rechercher des événements...');
    const searchButton = page.getByRole('button', { name: 'Rechercher' });
    
    // Mesurer le temps de recherche
    const startTime = Date.now();
    
    await searchInput.fill('conference');
    await searchButton.click();
    await page.waitForLoadState('networkidle');
    
    const searchTime = Date.now() - startTime;
    
    console.log(`🔍 Search time: ${searchTime}ms`);
    expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE);
  });

  test('should measure filter performance', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Ouvrir les filtres
    await page.getByRole('button', { name: /Filtres/ }).click();
    await page.waitForTimeout(500);
    
    // Mesurer le temps d'application d'un filtre
    const startTime = Date.now();
    
    const categorySelect = page.locator('select, [role="combobox"]').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.click();
      await page.waitForTimeout(300);
    }
    
    await page.waitForLoadState('networkidle');
    
    const filterTime = Date.now() - startTime;
    
    console.log(`🎯 Filter time: ${filterTime}ms`);
    expect(filterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE);
  });

  test('should measure pagination performance', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const nextButton = page.getByRole('button', { name: 'Suivant' });
    
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      const startTime = Date.now();
      
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      
      const paginationTime = Date.now() - startTime;
      
      console.log(`📄 Pagination time: ${paginationTime}ms`);
      expect(paginationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE);
    }
  });

  test('should measure image loading performance', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Compter les images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    console.log(`🖼️ Total images: ${imageCount}`);
    
    // Vérifier que toutes les images ont un alt text
    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }
    
    // Mesurer le temps de chargement des images
    const imageLoadTimes = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(img => ({
        src: img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
      }));
    });
    
    const loadedImages = imageLoadTimes.filter(img => img.complete && img.naturalWidth > 0);
    console.log(`✅ Loaded images: ${loadedImages.length}/${imageCount}`);
  });

  test('should measure cache effectiveness', async ({ page }) => {
    // Premier chargement
    const firstLoadStart = Date.now();
    await page.goto('/events', { waitUntil: 'networkidle' });
    const firstLoadTime = Date.now() - firstLoadStart;
    
    console.log(`📊 First load time: ${firstLoadTime}ms`);
    
    // Recharger la page (devrait utiliser le cache)
    const secondLoadStart = Date.now();
    await page.reload({ waitUntil: 'networkidle' });
    const secondLoadTime = Date.now() - secondLoadStart;
    
    console.log(`📊 Second load time (cached): ${secondLoadTime}ms`);
    
    // Le second chargement devrait être plus rapide
    expect(secondLoadTime).toBeLessThan(firstLoadTime);
    
    // Calculer l'amélioration
    const improvement = ((firstLoadTime - secondLoadTime) / firstLoadTime) * 100;
    console.log(`📈 Cache improvement: ${improvement.toFixed(2)}%`);
  });
});

test.describe('Performance Tests - Event Detail Page', () => {
  test('should load event detail page within acceptable time', async ({ page }) => {
    // Aller d'abord sur la liste
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Cliquer sur le premier événement
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      const startTime = Date.now();
      
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`📊 Event detail load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
    }
  });

  test('should measure event detail API performance', async ({ page }) => {
    const apiTimes: { url: string; duration: number }[] = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/public/events/')) {
        const timing = response.timing();
        if (timing) {
          const duration = timing.responseEnd - timing.requestStart;
          apiTimes.push({ url, duration });
          console.log(`🌐 Event detail API: ${url} - ${duration}ms`);
        }
      }
    });
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      // Vérifier les temps de réponse
      apiTimes.forEach(({ url, duration }) => {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE);
      });
    }
  });
});

test.describe('Performance Tests - Organizer Profile Page', () => {
  test('should load organizer profile within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/organizers/test-organizer-slug');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`📊 Organizer profile load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
  });
});

test.describe('Performance Tests - Mobile Performance', () => {
  test.use({ 
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  });

  test('should perform well on mobile devices', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/events', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`📱 Mobile load time: ${loadTime}ms`);
    
    // Mobile peut être un peu plus lent
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD * 1.5);
  });

  test('should have good mobile interaction performance', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Mesurer le temps de tap sur un bouton
    const startTime = Date.now();
    
    const filtersButton = page.getByRole('button', { name: /Filtres/ });
    await filtersButton.tap();
    await page.waitForTimeout(500);
    
    const tapTime = Date.now() - startTime;
    
    console.log(`👆 Mobile tap response time: ${tapTime}ms`);
    expect(tapTime).toBeLessThan(1000); // 1 seconde max pour une interaction
  });
});

test.describe('Performance Tests - Network Conditions', () => {
  test('should handle slow 3G network', async ({ page, context }) => {
    // Simuler une connexion 3G lente
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms de latence
      await route.continue();
    });
    
    const startTime = Date.now();
    
    await page.goto('/events', { waitUntil: 'networkidle', timeout: 30000 });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`🐌 Slow 3G load time: ${loadTime}ms`);
    
    // Devrait quand même charger en moins de 15 secondes
    expect(loadTime).toBeLessThan(15000);
  });
});

test.describe('Performance Tests - Memory and Resources', () => {
  test('should not have memory leaks', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Mesurer l'utilisation mémoire initiale
    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (initialMetrics) {
      console.log('💾 Initial memory:', {
        usedJSHeapSize: `${(initialMetrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        totalJSHeapSize: `${(initialMetrics.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      });
    }
    
    // Naviguer plusieurs fois
    for (let i = 0; i < 5; i++) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }
    
    // Mesurer l'utilisation mémoire finale
    const finalMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (finalMetrics && initialMetrics) {
      console.log('💾 Final memory:', {
        usedJSHeapSize: `${(finalMetrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        totalJSHeapSize: `${(finalMetrics.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      });
      
      const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      const increasePercentage = (memoryIncrease / initialMetrics.usedJSHeapSize) * 100;
      
      console.log(`📈 Memory increase: ${increasePercentage.toFixed(2)}%`);
      
      // L'augmentation de mémoire ne devrait pas dépasser 50%
      expect(increasePercentage).toBeLessThan(50);
    }
  });

  test('should have reasonable bundle size', async ({ page }) => {
    const resourceSizes: { type: string; size: number }[] = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      const headers = response.headers();
      const contentLength = headers['content-length'];
      
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        
        if (url.endsWith('.js')) {
          resourceSizes.push({ type: 'JavaScript', size });
        } else if (url.endsWith('.css')) {
          resourceSizes.push({ type: 'CSS', size });
        } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
          resourceSizes.push({ type: 'Image', size });
        }
      }
    });
    
    await page.goto('/events', { waitUntil: 'networkidle' });
    
    // Calculer les totaux par type
    const totals = resourceSizes.reduce((acc, { type, size }) => {
      acc[type] = (acc[type] || 0) + size;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📦 Resource sizes:');
    Object.entries(totals).forEach(([type, size]) => {
      console.log(`  ${type}: ${(size / 1024).toFixed(2)} KB`);
    });
    
    const totalSize = Object.values(totals).reduce((sum, size) => sum + size, 0);
    console.log(`📦 Total size: ${(totalSize / 1024).toFixed(2)} KB`);
  });
});

test.describe('Performance Tests - Lighthouse Metrics', () => {
  test('should generate performance report', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Collecter les métriques de performance
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnection: navigation.connectEnd - navigation.connectStart,
        serverResponse: navigation.responseEnd - navigation.requestStart,
        domProcessing: navigation.domComplete - navigation.domLoading,
      };
    });
    
    console.log('⚡ Performance Metrics:');
    console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`);
    console.log(`  Load Complete: ${performanceMetrics.loadComplete.toFixed(2)}ms`);
    console.log(`  DOM Interactive: ${performanceMetrics.domInteractive.toFixed(2)}ms`);
    console.log(`  DNS Lookup: ${performanceMetrics.dnsLookup.toFixed(2)}ms`);
    console.log(`  TCP Connection: ${performanceMetrics.tcpConnection.toFixed(2)}ms`);
    console.log(`  Server Response: ${performanceMetrics.serverResponse.toFixed(2)}ms`);
    console.log(`  DOM Processing: ${performanceMetrics.domProcessing.toFixed(2)}ms`);
    
    // Vérifier que les métriques sont raisonnables
    expect(performanceMetrics.domInteractive).toBeLessThan(PERFORMANCE_THRESHOLDS.TIME_TO_INTERACTIVE);
  });
});
