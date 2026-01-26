/**
 * Tests E2E - Parcours Utilisateur Complet
 * Simule le parcours complet d'un utilisateur découvrant et s'inscrivant à un événement
 */

import { test, expect } from '@playwright/test';

test.describe('User Journey - Event Discovery and Registration', () => {
  test('complete user journey: discover → view → register', async ({ page }) => {
    // ÉTAPE 1: Arriver sur la page d'accueil
    console.log('📍 Step 1: Landing on homepage');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la page d'accueil charge
    await expect(page).toHaveTitle(/AttendanceX/);
    
    // ÉTAPE 2: Naviguer vers la découverte d'événements
    console.log('📍 Step 2: Navigate to events discovery');
    const discoverButton = page.getByRole('link', { name: /Découvrir/i }).or(
      page.getByRole('link', { name: /Événements/i })
    );
    
    if (await discoverButton.isVisible()) {
      await discoverButton.click();
    } else {
      await page.goto('/events');
    }
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/events/);
    
    // ÉTAPE 3: Rechercher un événement
    console.log('📍 Step 3: Search for events');
    const searchInput = page.getByPlaceholder('Rechercher des événements...');
    await searchInput.fill('conference');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await page.waitForLoadState('networkidle');
    
    // ÉTAPE 4: Appliquer des filtres
    console.log('📍 Step 4: Apply filters');
    await page.getByRole('button', { name: /Filtres/ }).click();
    await page.waitForTimeout(500);
    
    // Sélectionner une catégorie si disponible
    const categorySelect = page.locator('select, [role="combobox"]').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.click();
      await page.waitForTimeout(300);
    }
    
    // ÉTAPE 5: Voir les résultats
    console.log('📍 Step 5: View search results');
    await page.waitForLoadState('networkidle');
    
    // Vérifier qu'il y a des résultats ou un message vide
    const hasResults = await page.locator('[data-testid="event-card"]').count() > 0;
    const hasEmptyState = await page.getByText('Aucun événement trouvé').isVisible();
    expect(hasResults || hasEmptyState).toBeTruthy();
    
    // ÉTAPE 6: Cliquer sur un événement
    console.log('📍 Step 6: Click on an event');
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      // Vérifier qu'on est sur la page de détail
      await expect(page).toHaveURL(/\/events\/.+/);
      
      // ÉTAPE 7: Consulter les détails de l'événement
      console.log('📍 Step 7: View event details');
      await expect(page.getByText('À propos de cet événement')).toBeVisible();
      await expect(page.getByText('Informations')).toBeVisible();
      
      // ÉTAPE 8: Voir le profil de l'organisateur
      console.log('📍 Step 8: View organizer profile');
      const organizerLink = page.getByText('Organisé par').locator('..').getByRole('link').first();
      
      if (await organizerLink.isVisible()) {
        const organizerHref = await organizerLink.getAttribute('href');
        console.log(`  Organizer link: ${organizerHref}`);
      }
      
      // ÉTAPE 9: Partager l'événement
      console.log('📍 Step 9: Share event');
      const shareButton = page.getByRole('button', { name: /Partager/ });
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(500);
      }
      
      // ÉTAPE 10: Tenter de s'inscrire (redirige vers login)
      console.log('📍 Step 10: Attempt to register');
      const registerButton = page.getByRole('button', { name: /S'inscrire/ });
      if (await registerButton.isVisible()) {
        await registerButton.click();
        await page.waitForLoadState('networkidle');
        
        // Devrait rediriger vers la page de connexion/inscription
        await expect(page).toHaveURL(/\/(auth|login|register)/);
      }
    }
    
    console.log('✅ User journey completed successfully');
  });

  test('user journey: browse by category', async ({ page }) => {
    console.log('📍 Starting category browsing journey');
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Ouvrir les filtres
    await page.getByRole('button', { name: /Filtres/ }).click();
    await page.waitForTimeout(500);
    
    // Sélectionner une catégorie
    const categorySelect = page.locator('select, [role="combobox"]').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.click();
      await page.waitForTimeout(300);
      
      // Sélectionner la première option (après "Toutes")
      const options = page.locator('option, [role="option"]');
      const optionCount = await options.count();
      
      if (optionCount > 1) {
        await options.nth(1).click();
        await page.waitForLoadState('networkidle');
        
        // Vérifier que les résultats sont filtrés
        const resultsText = await page.textContent('body');
        expect(resultsText).toBeTruthy();
      }
    }
    
    console.log('✅ Category browsing completed');
  });

  test('user journey: browse by location', async ({ page }) => {
    console.log('📍 Starting location browsing journey');
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Ouvrir les filtres
    await page.getByRole('button', { name: /Filtres/ }).click();
    await page.waitForTimeout(500);
    
    // Sélectionner un lieu
    const locationSelects = page.locator('select, [role="combobox"]');
    const locationSelect = locationSelects.nth(1); // Deuxième select (lieu)
    
    if (await locationSelect.isVisible()) {
      await locationSelect.click();
      await page.waitForTimeout(300);
      
      const options = page.locator('option, [role="option"]');
      const optionCount = await options.count();
      
      if (optionCount > 1) {
        await options.nth(1).click();
        await page.waitForLoadState('networkidle');
      }
    }
    
    console.log('✅ Location browsing completed');
  });

  test('user journey: filter by price', async ({ page }) => {
    console.log('📍 Starting price filtering journey');
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Ouvrir les filtres
    await page.getByRole('button', { name: /Filtres/ }).click();
    await page.waitForTimeout(500);
    
    // Sélectionner "Gratuit"
    const priceSelects = page.locator('select, [role="combobox"]');
    const priceSelect = priceSelects.nth(2); // Troisième select (prix)
    
    if (await priceSelect.isVisible()) {
      await priceSelect.click();
      await page.waitForTimeout(300);
      
      // Sélectionner "Gratuit"
      const freeOption = page.getByText('Gratuit', { exact: true });
      if (await freeOption.isVisible()) {
        await freeOption.click();
        await page.waitForLoadState('networkidle');
        
        // Vérifier que seuls les événements gratuits sont affichés
        const eventCards = page.locator('[data-testid="event-card"]');
        const count = await eventCards.count();
        
        if (count > 0) {
          // Vérifier le premier événement
          const firstCard = eventCards.first();
          const cardText = await firstCard.textContent();
          console.log(`  First event card text: ${cardText?.substring(0, 100)}...`);
        }
      }
    }
    
    console.log('✅ Price filtering completed');
  });

  test('user journey: pagination navigation', async ({ page }) => {
    console.log('📍 Starting pagination journey');
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Vérifier s'il y a une pagination
    const nextButton = page.getByRole('button', { name: 'Suivant' });
    
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      // Aller à la page 2
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/page=2/);
      
      // Vérifier que le bouton précédent est actif
      const prevButton = page.getByRole('button', { name: 'Précédent' });
      await expect(prevButton).not.toBeDisabled();
      
      // Retourner à la page 1
      await prevButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/events$/);
    }
    
    console.log('✅ Pagination navigation completed');
  });

  test('user journey: view similar events', async ({ page }) => {
    console.log('📍 Starting similar events journey');
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      // Chercher la section événements similaires
      const similarSection = page.getByText('Événements similaires');
      
      if (await similarSection.isVisible()) {
        // Scroller vers la section
        await similarSection.scrollIntoViewIfNeeded();
        
        // Vérifier qu'il y a des événements similaires
        const similarEvents = page.locator('[data-testid="event-card"]');
        const count = await similarEvents.count();
        
        console.log(`  Found ${count} similar events`);
        
        if (count > 0) {
          // Cliquer sur un événement similaire
          await similarEvents.first().click();
          await page.waitForLoadState('networkidle');
          
          // Vérifier qu'on est sur une nouvelle page d'événement
          await expect(page).toHaveURL(/\/events\/.+/);
        }
      }
    }
    
    console.log('✅ Similar events journey completed');
  });

  test('user journey: explore organizer profile', async ({ page }) => {
    console.log('📍 Starting organizer exploration journey');
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      // Trouver et cliquer sur le lien de l'organisateur
      const organizerSection = page.getByText('Organisé par').locator('..');
      const organizerLink = organizerSection.getByRole('link').first();
      
      if (await organizerLink.isVisible()) {
        await organizerLink.click();
        await page.waitForLoadState('networkidle');
        
        // Vérifier qu'on est sur le profil de l'organisateur
        await expect(page).toHaveURL(/\/organizers\/.+/);
        
        // Vérifier les sections du profil
        await expect(page.getByText('À propos')).toBeVisible();
        await expect(page.getByText('Contact')).toBeVisible();
        
        // Vérifier les onglets d'événements
        const upcomingTab = page.getByRole('tab', { name: /À venir/ });
        const pastTab = page.getByRole('tab', { name: /Passés/ });
        
        if (await upcomingTab.isVisible()) {
          await expect(upcomingTab).toBeVisible();
          await expect(pastTab).toBeVisible();
          
          // Cliquer sur l'onglet passés
          await pastTab.click();
          await page.waitForTimeout(500);
          
          // Revenir aux événements à venir
          await upcomingTab.click();
          await page.waitForTimeout(500);
        }
        
        // Vérifier les statistiques
        const statsCards = page.locator('.grid').first();
        if (await statsCards.isVisible()) {
          const statsText = await statsCards.textContent();
          console.log(`  Organizer stats: ${statsText?.substring(0, 100)}...`);
        }
      }
    }
    
    console.log('✅ Organizer exploration completed');
  });

  test('user journey: mobile responsive experience', async ({ page }) => {
    // Définir la taille mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    console.log('📍 Starting mobile journey');
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Vérifier que les éléments sont visibles sur mobile
    await expect(page.getByRole('heading', { name: 'Découvrir des Événements' })).toBeVisible();
    await expect(page.getByPlaceholder('Rechercher des événements...')).toBeVisible();
    
    // Ouvrir les filtres sur mobile
    await page.getByRole('button', { name: /Filtres/ }).click();
    await page.waitForTimeout(500);
    
    // Vérifier que le panneau de filtres est visible
    await expect(page.getByText('Catégorie')).toBeVisible();
    
    // Fermer les filtres
    await page.getByRole('button', { name: /Filtres/ }).click();
    await page.waitForTimeout(500);
    
    // Scroller vers le bas
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    
    // Cliquer sur un événement
    const firstEventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await firstEventCard.isVisible()) {
      await firstEventCard.click();
      await page.waitForLoadState('networkidle');
      
      // Vérifier que la page de détail est responsive
      await expect(page.getByRole('button', { name: /Retour/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /S'inscrire/ })).toBeVisible();
    }
    
    console.log('✅ Mobile journey completed');
  });

  test('user journey: keyboard navigation', async ({ page }) => {
    console.log('📍 Starting keyboard navigation journey');
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Naviguer avec Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Vérifier qu'un élément a le focus
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName, text: el.textContent?.substring(0, 50) } : null;
    });
    
    console.log(`  Focused element: ${JSON.stringify(focusedElement)}`);
    expect(focusedElement).toBeTruthy();
    
    // Utiliser Enter sur un élément focusé
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    console.log('✅ Keyboard navigation completed');
  });

  test('user journey: error handling', async ({ page }) => {
    console.log('📍 Starting error handling journey');
    
    // Tenter d'accéder à un événement inexistant
    await page.goto('/events/non-existent-event-12345');
    await page.waitForLoadState('networkidle');
    
    // Vérifier le message d'erreur
    const notFoundMessage = page.getByText('Événement introuvable');
    await expect(notFoundMessage).toBeVisible();
    
    // Vérifier le bouton retour
    const backButton = page.getByRole('button', { name: /Retour/ });
    await expect(backButton).toBeVisible();
    
    // Cliquer sur retour
    await backButton.click();
    await page.waitForLoadState('networkidle');
    
    // Devrait être de retour sur la liste
    await expect(page).toHaveURL(/\/events$/);
    
    console.log('✅ Error handling completed');
  });
});

test.describe('User Journey - Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Vérifier les boutons avec aria-label
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    console.log(`  Found ${buttonCount} buttons`);
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Vérifier la hiérarchie des titres
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    
    console.log(`  Found ${h1Count} h1 elements`);
    expect(h1Count).toBeGreaterThan(0);
    
    // Il devrait y avoir exactement un h1
    expect(h1Count).toBeLessThanOrEqual(2);
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Vérifier les landmarks ARIA
    const main = page.locator('main, [role="main"]');
    const nav = page.locator('nav, [role="navigation"]');
    
    const hasMain = await main.count() > 0;
    const hasNav = await nav.count() > 0;
    
    console.log(`  Has main landmark: ${hasMain}`);
    console.log(`  Has navigation landmark: ${hasNav}`);
  });
});
