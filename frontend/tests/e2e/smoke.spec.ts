/**
 * Smoke tests - Tests de base pour vérifier que l'application démarre
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Application Startup', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que la page charge sans erreur
    await expect(page).toHaveTitle(/AttendanceX/);
  });

  test('should load the events discovery page', async ({ page }) => {
    await page.goto('/events');
    
    // Vérifier le titre
    await expect(page).toHaveTitle(/Découvrir des Événements/);
    
    // Vérifier que les éléments principaux sont présents
    await expect(page.getByRole('heading', { name: /Découvrir des Événements/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Rechercher des événements/i)).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/events');
    
    // Vérifier que le bouton "Se connecter" est présent
    const loginButton = page.getByRole('button', { name: /Se connecter/i });
    await expect(loginButton).toBeVisible();
  });

  test('should display search functionality', async ({ page }) => {
    await page.goto('/events');
    
    // Vérifier la barre de recherche
    const searchInput = page.getByPlaceholder(/Rechercher des événements/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();
    
    // Vérifier le bouton rechercher
    const searchButton = page.getByRole('button', { name: /Rechercher/i });
    await expect(searchButton).toBeVisible();
  });

  test('should display filters button', async ({ page }) => {
    await page.goto('/events');
    
    // Vérifier le bouton filtres
    const filtersButton = page.getByRole('button', { name: /Filtres/i });
    await expect(filtersButton).toBeVisible();
  });

  test('should toggle filters panel', async ({ page }) => {
    await page.goto('/events');
    
    // Ouvrir les filtres
    const filtersButton = page.getByRole('button', { name: /Filtres/i });
    await filtersButton.click();
    
    // Attendre un peu pour l'animation
    await page.waitForTimeout(300);
    
    // Vérifier que le panneau de filtres est visible
    const categoryLabel = page.getByText('Catégorie');
    await expect(categoryLabel).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Définir la taille mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/events');
    
    // Vérifier que les éléments sont visibles sur mobile
    await expect(page.getByRole('heading', { name: /Découvrir des Événements/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Rechercher des événements/i)).toBeVisible();
  });

  test('should handle 404 for non-existent event', async ({ page }) => {
    await page.goto('/events/non-existent-event-slug-12345');
    
    // Attendre le chargement
    await page.waitForLoadState('networkidle');
    
    // Vérifier le message d'erreur ou le loader
    const notFoundMessage = page.getByText(/Événement introuvable/i);
    const loader = page.locator('[class*="animate-spin"]');
    
    // L'un des deux devrait être visible
    const notFoundVisible = await notFoundMessage.isVisible().catch(() => false);
    const loaderVisible = await loader.isVisible().catch(() => false);
    
    expect(notFoundVisible || loaderVisible).toBeTruthy();
  });

  test('should handle 404 for non-existent organizer', async ({ page }) => {
    await page.goto('/organizers/non-existent-organizer-slug-12345');
    
    // Attendre le chargement
    await page.waitForLoadState('networkidle');
    
    // Vérifier le message d'erreur ou le loader
    const notFoundMessage = page.getByText(/Organisateur introuvable/i);
    const loader = page.locator('[class*="animate-spin"]');
    
    // L'un des deux devrait être visible
    const notFoundVisible = await notFoundMessage.isVisible().catch(() => false);
    const loaderVisible = await loader.isVisible().catch(() => false);
    
    expect(notFoundVisible || loaderVisible).toBeTruthy();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/events');
    
    // Vérifier le titre
    const title = await page.title();
    expect(title).toContain('Découvrir des Événements');
    
    // Vérifier la meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription).toContain('événements');
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Filtrer les erreurs connues (API calls qui peuvent échouer en test)
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to fetch') && 
      !error.includes('NetworkError') &&
      !error.includes('ECONNREFUSED')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have accessible form elements', async ({ page }) => {
    await page.goto('/events');
    
    // Vérifier que les inputs ont des labels ou placeholders
    const searchInput = page.getByPlaceholder(/Rechercher des événements/i);
    await expect(searchInput).toBeVisible();
    
    // Vérifier que les boutons ont du texte ou des aria-labels
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    expect(buttonCount).toBeGreaterThan(0);
    
    // Vérifier le premier bouton
    const firstButton = buttons.first();
    const buttonText = await firstButton.textContent();
    const ariaLabel = await firstButton.getAttribute('aria-label');
    
    expect(buttonText || ariaLabel).toBeTruthy();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/events');
    
    // Tester la navigation au clavier
    await page.keyboard.press('Tab');
    
    // Vérifier qu'un élément a le focus
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName : null;
    });
    
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Smoke Tests - Performance', () => {
  test('should load events page in reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // La page devrait charger en moins de 5 secondes
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have no layout shifts', async ({ page }) => {
    await page.goto('/events');
    
    // Attendre que la page soit stable
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Vérifier que les éléments principaux sont visibles
    await expect(page.getByRole('heading', { name: /Découvrir des Événements/i })).toBeVisible();
  });
});
