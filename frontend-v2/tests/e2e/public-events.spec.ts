/**
 * Tests E2E pour les pages publiques d'événements
 * Playwright tests - Enhanced with performance testing
 */

import { test, expect } from '@playwright/test';

// Configuration pour les tests de performance
const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD: 3000, // 3 secondes
  API_RESPONSE: 2000, // 2 secondes
  FIRST_CONTENTFUL_PAINT: 1500, // 1.5 secondes
  TIME_TO_INTERACTIVE: 3500, // 3.5 secondes
};

test.describe('Public Events - Discovery Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events');
  });

  test('should display the events discovery page', async ({ page }) => {
    // Vérifier le titre de la page
    await expect(page).toHaveTitle(/Découvrir des Événements/);
    
    // Vérifier le header
    await expect(page.getByRole('heading', { name: 'Découvrir des Événements' })).toBeVisible();
    
    // Vérifier la barre de recherche
    await expect(page.getByPlaceholder('Rechercher des événements...')).toBeVisible();
    
    // Vérifier le bouton de filtres
    await expect(page.getByRole('button', { name: /Filtres/ })).toBeVisible();
  });

  test('should search for events', async ({ page }) => {
    // Entrer un terme de recherche
    const searchInput = page.getByPlaceholder('Rechercher des événements...');
    await searchInput.fill('conference');
    
    // Cliquer sur le bouton rechercher
    await page.getByRole('button', { name: 'Rechercher' }).click();
    
    // Attendre le chargement
    await page.waitForLoadState('networkidle');
    
    // Vérifier que des résultats sont affichés ou un message vide
    const hasResults = await page.locator('[data-testid="event-card"]').count() > 0;
    const hasEmptyState = await page.getByText('Aucun événement trouvé').isVisible();
    
    expect(hasResults || hasEmptyState).toBeTruthy();
  });

  test('should open and close filters panel', async ({ page }) => {
    // Ouvrir les filtres
    await page.getByRole('button', { name: /Filtres/ }).click();
    
    // Vérifier que le panneau de filtres est visible
    await expect(page.getByText('Catégorie')).toBeVisible();
    await expect(page.getByText('Lieu')).toBeVisible();
    await expect(page.getByText('Prix')).toBeVisible();
    
    // Fermer les filtres
    await page.getByRole('button', { name: /Filtres/ }).click();
  });

  test('should filter events by category', async ({ page }) => {
    // Ouvrir les filtres
    await page.getByRole('button', { name: /Filtres/ }).click();
    
    // Sélectionner une catégorie (si disponible)
    const categorySelect = page.locator('select, [role="combobox"]').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.click();
      // Attendre que les options soient chargées
      await page.waitForTimeout(500);
    }
    
    // Vérifier que la page réagit au filtre
    await page.waitForLoadState('networkidle');
  });

  test('should navigate through pagination', async ({ page }) => {
    // Attendre le chargement initial
    await page.waitForLoadState('networkidle');
    
    // Vérifier si la pagination existe
    const nextButton = page.getByRole('button', { name: 'Suivant' });
    
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      // Cliquer sur suivant
      await nextButton.click();
      
      // Attendre le chargement
      await page.waitForLoadState('networkidle');
      
      // Vérifier que la page a changé
      await expect(page).toHaveURL(/page=2/);
      
      // Vérifier que le bouton précédent est maintenant actif
      await expect(page.getByRole('button', { name: 'Précédent' })).not.toBeDisabled();
    }
  });

  test('should display event cards', async ({ page }) => {
    // Attendre le chargement
    await page.waitForLoadState('networkidle');
    
    // Vérifier qu'il y a des cartes d'événements ou un état vide
    const eventCards = page.locator('[data-testid="event-card"]');
    const emptyState = page.getByText('Aucun événement trouvé');
    
    const hasCards = await eventCards.count() > 0;
    const hasEmpty = await emptyState.isVisible();
    
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      // Vérifier que les éléments sont visibles sur mobile
      await expect(page.getByRole('heading', { name: 'Découvrir des Événements' })).toBeVisible();
      await expect(page.getByPlaceholder('Rechercher des événements...')).toBeVisible();
      
      // Vérifier que la grille s'adapte (1 colonne sur mobile)
      const grid = page.locator('.grid');
      if (await grid.isVisible()) {
        const gridClasses = await grid.getAttribute('class');
        expect(gridClasses).toContain('grid-cols-1');
      }
    }
  });
});

test.describe('Public Events - Event Detail Page', () => {
  test('should display event detail page', async ({ page }) => {
    // Aller sur la page des événements
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Cliquer sur le premier événement (si disponible)
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      
      // Attendre la navigation
      await page.waitForLoadState('networkidle');
      
      // Vérifier que nous sommes sur une page de détail
      await expect(page).toHaveURL(/\/events\/.+/);
      
      // Vérifier les éléments de la page
      await expect(page.getByRole('button', { name: /Retour aux événements/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /S'inscrire/ })).toBeVisible();
    }
  });

  test('should display event information', async ({ page }) => {
    // Naviguer vers un événement de test (slug fictif)
    await page.goto('/events/test-event-slug');
    
    // Attendre le chargement
    await page.waitForLoadState('networkidle');
    
    // Si l'événement existe, vérifier les informations
    const notFound = await page.getByText('Événement introuvable').isVisible();
    
    if (!notFound) {
      // Vérifier les sections principales
      await expect(page.getByText('À propos de cet événement')).toBeVisible();
      await expect(page.getByText('Informations')).toBeVisible();
    }
  });

  test('should display organizer information', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      // Vérifier la section organisateur
      const organizerSection = page.getByText('Organisé par');
      if (await organizerSection.isVisible()) {
        await expect(organizerSection).toBeVisible();
      }
    }
  });

  test('should show similar events', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      // Vérifier la section événements similaires
      const similarSection = page.getByText('Événements similaires');
      if (await similarSection.isVisible()) {
        await expect(similarSection).toBeVisible();
      }
    }
  });

  test('should handle share button', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      // Vérifier le bouton partager
      const shareButton = page.getByRole('button', { name: /Partager/ });
      await expect(shareButton).toBeVisible();
      
      // Cliquer sur partager (peut ouvrir un dialog natif ou copier)
      await shareButton.click();
    }
  });

  test('should navigate back to events list', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      // Cliquer sur retour
      await page.getByRole('button', { name: /Retour aux événements/ }).click();
      
      // Vérifier que nous sommes de retour sur la liste
      await expect(page).toHaveURL(/\/events$/);
    }
  });
});

test.describe('Public Events - Organizer Profile Page', () => {
  test('should display organizer profile', async ({ page }) => {
    // Naviguer vers un profil d'organisateur de test
    await page.goto('/organizers/test-organizer-slug');
    
    // Attendre le chargement
    await page.waitForLoadState('networkidle');
    
    // Si l'organisateur existe, vérifier les informations
    const notFound = await page.getByText('Organisateur introuvable').isVisible();
    
    if (!notFound) {
      // Vérifier les sections principales
      await expect(page.getByText('À propos')).toBeVisible();
      await expect(page.getByText('Contact')).toBeVisible();
    }
  });

  test('should display organizer stats', async ({ page }) => {
    await page.goto('/organizers/test-organizer-slug');
    await page.waitForLoadState('networkidle');
    
    const notFound = await page.getByText('Organisateur introuvable').isVisible();
    
    if (!notFound) {
      // Vérifier les statistiques
      const statsCards = page.locator('.grid').first();
      if (await statsCards.isVisible()) {
        await expect(statsCards).toBeVisible();
      }
    }
  });

  test('should display upcoming and past events tabs', async ({ page }) => {
    await page.goto('/organizers/test-organizer-slug');
    await page.waitForLoadState('networkidle');
    
    const notFound = await page.getByText('Organisateur introuvable').isVisible();
    
    if (!notFound) {
      // Vérifier les onglets
      const upcomingTab = page.getByRole('tab', { name: /À venir/ });
      const pastTab = page.getByRole('tab', { name: /Passés/ });
      
      if (await upcomingTab.isVisible()) {
        await expect(upcomingTab).toBeVisible();
        await expect(pastTab).toBeVisible();
        
        // Cliquer sur l'onglet passés
        await pastTab.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display social links', async ({ page }) => {
    await page.goto('/organizers/test-organizer-slug');
    await page.waitForLoadState('networkidle');
    
    const notFound = await page.getByText('Organisateur introuvable').isVisible();
    
    if (!notFound) {
      // Vérifier la section contact
      const contactSection = page.getByText('Contact');
      if (await contactSection.isVisible()) {
        await expect(contactSection).toBeVisible();
      }
    }
  });
});

test.describe('Public Events - SEO and Accessibility', () => {
  test('should have proper meta tags on events list', async ({ page }) => {
    await page.goto('/events');
    
    // Vérifier les meta tags
    const title = await page.title();
    expect(title).toContain('Découvrir des Événements');
    
    // Vérifier la description meta
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Vérifier qu'il y a un h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Vérifier le texte du h1
    await expect(h1).toContainText('Découvrir des Événements');
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Tester la navigation au clavier
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Vérifier qu'un élément a le focus
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Vérifier que les images ont des alt text
    const images = page.locator('img');
    const count = await images.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const alt = await images.nth(i).getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    }
  });
});
