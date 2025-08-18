/**
 * Tests end-to-end pour le système de présence
 */

import { test, expect, Page } from '@playwright/test';

// Configuration des données de test
const testUser = {
  email: 'john.doe@company.com',
  password: 'testpassword123',
  employeeId: 'EMP001',
  name: 'John Doe'
};

const testManager = {
  email: 'manager@company.com',
  password: 'managerpassword123',
  employeeId: 'MGR001',
  name: 'Jane Manager'
};

// Helpers
async function loginAsEmployee(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', testUser.email);
  await page.fill('[data-testid="password-input"]', testUser.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/presence');
}

async function loginAsManager(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', testManager.email);
  await page.fill('[data-testid="password-input"]', testManager.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/manager/dashboard');
}

async function mockGeolocation(page: Page, latitude = 48.8566, longitude = 2.3522) {
  await page.context().grantPermissions(['geolocation']);
  await page.setGeolocation({ latitude, longitude });
}

test.describe('Employee Presence Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockGeolocation(page);
  });

  test('should complete full day presence workflow', async ({ page }) => {
    await loginAsEmployee(page);

    // Vérifier l'état initial (absent)
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('Absent');
    await expect(page.locator('[data-testid="clock-in-button"]')).toBeVisible();

    // Clock In
    await page.click('[data-testid="clock-in-button"]');
    
    // Vérifier la confirmation de géolocalisation
    await expect(page.locator('[data-testid="location-info"]')).toBeVisible();
    
    // Confirmer le pointage
    await page.click('[data-testid="confirm-clock-in"]');
    
    // Attendre la mise à jour du statut
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('Présent');
    await expect(page.locator('[data-testid="start-break-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="clock-out-button"]')).toBeVisible();

    // Vérifier l'affichage du temps de travail
    await expect(page.locator('[data-testid="work-duration"]')).toBeVisible();

    // Commencer une pause
    await page.click('[data-testid="start-break-button"]');
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('En pause');
    await expect(page.locator('[data-testid="end-break-button"]')).toBeVisible();

    // Attendre un peu pour simuler une pause
    await page.waitForTimeout(2000);

    // Reprendre le travail
    await page.click('[data-testid="end-break-button"]');
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('Présent');

    // Clock Out
    await page.click('[data-testid="clock-out-button"]');
    await page.click('[data-testid="confirm-clock-out"]');
    
    // Vérifier le retour à l'état absent
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('Absent');
    await expect(page.locator('[data-testid="clock-in-button"]')).toBeVisible();

    // Vérifier l'historique de la journée
    await expect(page.locator('[data-testid="today-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-work-time"]')).toContainText(/\d+h \d+m/);
  });

  test('should handle geolocation requirements', async ({ page }) => {
    await loginAsEmployee(page);

    // Désactiver la géolocalisation
    await page.context().clearPermissions();

    // Tenter de pointer
    await page.click('[data-testid="clock-in-button"]');

    // Vérifier l'erreur de géolocalisation
    await expect(page.locator('[data-testid="geolocation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="geolocation-error"]')).toContainText('géolocalisation');

    // Réactiver la géolocalisation
    await mockGeolocation(page);
    await page.click('[data-testid="retry-geolocation"]');

    // Vérifier que le pointage fonctionne maintenant
    await page.click('[data-testid="confirm-clock-in"]');
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('Présent');
  });

  test('should work in offline mode', async ({ page }) => {
    await loginAsEmployee(page);

    // Simuler le mode hors ligne
    await page.context().setOffline(true);

    // Vérifier l'indicateur hors ligne
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    // Tenter de pointer en mode hors ligne
    await page.click('[data-testid="clock-in-button"]');
    await page.click('[data-testid="confirm-clock-in"]');

    // Vérifier que l'action est mise en queue
    await expect(page.locator('[data-testid="offline-queue-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-queue-indicator"]')).toContainText('1');

    // Revenir en ligne
    await page.context().setOffline(false);

    // Vérifier la synchronisation automatique
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('Présent');
    await expect(page.locator('[data-testid="offline-queue-indicator"]')).not.toBeVisible();
  });

  test('should display presence history', async ({ page }) => {
    await loginAsEmployee(page);

    // Naviguer vers l'historique
    await page.click('[data-testid="history-tab"]');

    // Vérifier l'affichage de l'historique
    await expect(page.locator('[data-testid="presence-history"]')).toBeVisible();
    
    // Filtrer par date
    await page.fill('[data-testid="date-filter"]', '2024-01-01');
    await page.click('[data-testid="apply-filter"]');

    // Vérifier les résultats filtrés
    await expect(page.locator('[data-testid="history-entries"]')).toBeVisible();

    // Exporter l'historique
    await page.click('[data-testid="export-button"]');
    
    // Vérifier le téléchargement (simulé)
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
  });

  test('should handle leave requests', async ({ page }) => {
    await loginAsEmployee(page);

    // Naviguer vers les congés
    await page.click('[data-testid="leaves-tab"]');

    // Créer une nouvelle demande de congé
    await page.click('[data-testid="new-leave-request"]');

    // Remplir le formulaire
    await page.selectOption('[data-testid="leave-type"]', 'vacation');
    await page.fill('[data-testid="start-date"]', '2024-06-01');
    await page.fill('[data-testid="end-date"]', '2024-06-05');
    await page.fill('[data-testid="leave-reason"]', 'Vacances d\'été');

    // Soumettre la demande
    await page.click('[data-testid="submit-leave-request"]');

    // Vérifier la confirmation
    await expect(page.locator('[data-testid="leave-request-success"]')).toBeVisible();
    
    // Vérifier l'affichage dans la liste
    await expect(page.locator('[data-testid="leave-requests-list"]')).toContainText('Vacances d\'été');
    await expect(page.locator('[data-testid="leave-status"]')).toContainText('En attente');
  });
});

test.describe('Manager Dashboard', () => {
  test('should display team presence overview', async ({ page }) => {
    await loginAsManager(page);

    // Vérifier l'affichage du dashboard manager
    await expect(page.locator('[data-testid="team-overview"]')).toBeVisible();
    
    // Vérifier les statistiques
    await expect(page.locator('[data-testid="present-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="absent-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="late-count"]')).toBeVisible();

    // Vérifier la liste des employés
    await expect(page.locator('[data-testid="employee-list"]')).toBeVisible();
    
    // Filtrer par statut
    await page.selectOption('[data-testid="status-filter"]', 'present');
    await expect(page.locator('[data-testid="employee-list"] [data-status="present"]')).toBeVisible();
  });

  test('should manage leave requests', async ({ page }) => {
    await loginAsManager(page);

    // Naviguer vers la gestion des congés
    await page.click('[data-testid="leave-management"]');

    // Vérifier les demandes en attente
    await expect(page.locator('[data-testid="pending-requests"]')).toBeVisible();

    // Approuver une demande
    await page.click('[data-testid="approve-request-1"]');
    await page.fill('[data-testid="approval-notes"]', 'Demande approuvée');
    await page.click('[data-testid="confirm-approval"]');

    // Vérifier la mise à jour du statut
    await expect(page.locator('[data-testid="request-1-status"]')).toContainText('Approuvé');

    // Rejeter une demande
    await page.click('[data-testid="reject-request-2"]');
    await page.fill('[data-testid="rejection-reason"]', 'Période trop chargée');
    await page.click('[data-testid="confirm-rejection"]');

    // Vérifier la mise à jour du statut
    await expect(page.locator('[data-testid="request-2-status"]')).toContainText('Refusé');
  });

  test('should generate presence reports', async ({ page }) => {
    await loginAsManager(page);

    // Naviguer vers les rapports
    await page.click('[data-testid="reports-tab"]');

    // Configurer le rapport
    await page.selectOption('[data-testid="report-type"]', 'monthly');
    await page.fill('[data-testid="report-start-date"]', '2024-01-01');
    await page.fill('[data-testid="report-end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="report-format"]', 'pdf');

    // Générer le rapport
    await page.click('[data-testid="generate-report"]');

    // Vérifier le statut de génération
    await expect(page.locator('[data-testid="report-status"]')).toContainText('En cours');

    // Attendre la fin de génération (simulée)
    await page.waitForTimeout(3000);
    
    // Vérifier la disponibilité du téléchargement
    await expect(page.locator('[data-testid="download-report"]')).toBeVisible();
  });

  test('should handle presence anomalies', async ({ page }) => {
    await loginAsManager(page);

    // Naviguer vers les anomalies
    await page.click('[data-testid="anomalies-tab"]');

    // Vérifier l'affichage des anomalies
    await expect(page.locator('[data-testid="anomalies-list"]')).toBeVisible();

    // Filtrer par type d'anomalie
    await page.selectOption('[data-testid="anomaly-filter"]', 'late_arrival');
    
    // Vérifier les résultats filtrés
    await expect(page.locator('[data-testid="anomaly-item"][data-type="late_arrival"]')).toBeVisible();

    // Marquer une anomalie comme résolue
    await page.click('[data-testid="resolve-anomaly-1"]');
    await page.fill('[data-testid="resolution-notes"]', 'Justification acceptée');
    await page.click('[data-testid="confirm-resolution"]');

    // Vérifier la mise à jour
    await expect(page.locator('[data-testid="anomaly-1-status"]')).toContainText('Résolu');
  });
});

test.describe('Mobile Experience', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Simuler un appareil mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await mockGeolocation(page);
    await loginAsEmployee(page);

    // Vérifier l'interface mobile
    await expect(page.locator('[data-testid="mobile-presence-tracker"]')).toBeVisible();
    
    // Vérifier l'affichage de l'heure
    await expect(page.locator('[data-testid="current-time"]')).toBeVisible();
    
    // Vérifier les boutons tactiles
    const clockInButton = page.locator('[data-testid="clock-in-button"]');
    await expect(clockInButton).toBeVisible();
    
    // Vérifier la taille des boutons pour le tactile
    const buttonBox = await clockInButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThan(44); // Taille minimum recommandée pour le tactile

    // Tester le pointage mobile
    await clockInButton.tap();
    await page.tap('[data-testid="confirm-clock-in"]');
    
    // Vérifier la mise à jour
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('Présent');
  });

  test('should handle push notifications', async ({ page }) => {
    await mockGeolocation(page);
    await loginAsEmployee(page);

    // Simuler l'autorisation des notifications
    await page.context().grantPermissions(['notifications']);

    // Naviguer vers les paramètres
    await page.click('[data-testid="settings-button"]');
    
    // Activer les notifications
    await page.check('[data-testid="enable-notifications"]');
    
    // Vérifier la confirmation
    await expect(page.locator('[data-testid="notifications-enabled"]')).toBeVisible();

    // Simuler une notification (via l'API de test)
    await page.evaluate(() => {
      new Notification('Rappel de pointage', {
        body: 'N\'oubliez pas de pointer votre arrivée !',
        icon: '/icons/icon-192x192.png'
      });
    });
  });
});

test.describe('Performance and Accessibility', () => {
  test('should meet performance benchmarks', async ({ page }) => {
    await loginAsEmployee(page);

    // Mesurer le temps de chargement initial
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="presence-tracker"]');
    const loadTime = Date.now() - startTime;
    
    // Vérifier que le chargement est rapide (< 2 secondes)
    expect(loadTime).toBeLessThan(2000);

    // Mesurer le temps de réponse du pointage
    const clockInStart = Date.now();
    await page.click('[data-testid="clock-in-button"]');
    await page.click('[data-testid="confirm-clock-in"]');
    await page.waitForSelector('[data-testid="presence-status"]:has-text("Présent")');
    const clockInTime = Date.now() - clockInStart;
    
    // Vérifier que le pointage est rapide (< 3 secondes)
    expect(clockInTime).toBeLessThan(3000);
  });

  test('should be accessible', async ({ page }) => {
    await loginAsEmployee(page);

    // Vérifier la navigation au clavier
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Vérifier les labels ARIA
    await expect(page.locator('[data-testid="clock-in-button"]')).toHaveAttribute('aria-label');
    
    // Vérifier les rôles ARIA
    await expect(page.locator('[data-testid="presence-status"]')).toHaveAttribute('role', 'status');

    // Vérifier le contraste des couleurs (simulé)
    const statusElement = page.locator('[data-testid="presence-status"]');
    const styles = await statusElement.evaluate(el => getComputedStyle(el));
    
    // Les couleurs devraient avoir un contraste suffisant
    expect(styles.color).toBeTruthy();
    expect(styles.backgroundColor).toBeTruthy();
  });
});

test.describe('Error Handling and Recovery', () => {
  test('should handle API failures gracefully', async ({ page }) => {
    await mockGeolocation(page);
    await loginAsEmployee(page);

    // Simuler une panne API
    await page.route('/api/presence/**', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    // Tenter de pointer
    await page.click('[data-testid="clock-in-button"]');
    await page.click('[data-testid="confirm-clock-in"]');

    // Vérifier l'affichage de l'erreur
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Restaurer l'API
    await page.unroute('/api/presence/**');

    // Retry
    await page.click('[data-testid="retry-button"]');

    // Vérifier le succès
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('Présent');
  });

  test('should recover from network interruptions', async ({ page }) => {
    await mockGeolocation(page);
    await loginAsEmployee(page);

    // Pointer normalement
    await page.click('[data-testid="clock-in-button"]');
    await page.click('[data-testid="confirm-clock-in"]');
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('Présent');

    // Simuler une interruption réseau
    await page.context().setOffline(true);
    
    // Tenter une action
    await page.click('[data-testid="start-break-button"]');
    
    // Vérifier la mise en queue
    await expect(page.locator('[data-testid="offline-queue-indicator"]')).toBeVisible();

    // Restaurer la connexion
    await page.context().setOffline(false);

    // Vérifier la synchronisation automatique
    await expect(page.locator('[data-testid="presence-status"]')).toContainText('En pause');
  });
});