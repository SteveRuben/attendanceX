# End-to-End Testing

Guide des tests end-to-end.

## Vue d'ensemble

Les tests E2E valident les workflows utilisateur complets dans un environnement proche de la production.

## Configuration

### Playwright Setup
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'https://staging-presence.web.app',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
});
```

### Test Data Setup
```typescript
// tests/e2e/setup.ts
export async function setupTestData() {
  const testUser = await createTestUser({
    email: 'e2e-test@example.com',
    password: 'TestPassword123!'
  });
  
  const testOrg = await createTestOrganization({
    name: 'E2E Test Organization',
    ownerId: testUser.id
  });
  
  return { testUser, testOrg };
}
```

## Tests principaux

### Authentication Flow
```typescript
test('user can login and logout', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');
  
  // Fill credentials
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password123');
  
  // Submit form
  await page.click('[data-testid=login-button]');
  
  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
  
  // Logout
  await page.click('[data-testid=user-menu]');
  await page.click('[data-testid=logout-button]');
  
  // Verify redirect to login
  await expect(page).toHaveURL('/login');
});
```

### Presence Workflow
```typescript
test('user can check in and check out', async ({ page }) => {
  // Login
  await loginAsUser(page, 'test@example.com', 'password123');
  
  // Navigate to presence
  await page.goto('/presence');
  
  // Check in
  await page.click('[data-testid=checkin-button]');
  await expect(page.locator('[data-testid=status]')).toHaveText('Checked In');
  
  // Wait a moment
  await page.waitForTimeout(2000);
  
  // Check out
  await page.click('[data-testid=checkout-button]');
  await expect(page.locator('[data-testid=status]')).toHaveText('Checked Out');
  
  // Verify presence record
  await page.goto('/presence/history');
  await expect(page.locator('[data-testid=presence-record]').first()).toBeVisible();
});
```

### Organization Management
```typescript
test('admin can manage organization settings', async ({ page }) => {
  // Login as admin
  await loginAsAdmin(page);
  
  // Navigate to settings
  await page.goto('/organization/settings');
  
  // Update settings
  await page.check('[data-testid=require-location]');
  await page.fill('[data-testid=work-hours-start]', '09:00');
  await page.fill('[data-testid=work-hours-end]', '17:00');
  
  // Save changes
  await page.click('[data-testid=save-button]');
  
  // Verify success message
  await expect(page.locator('[data-testid=success-message]')).toBeVisible();
  
  // Verify settings persisted
  await page.reload();
  await expect(page.locator('[data-testid=require-location]')).toBeChecked();
});
```

## Page Objects

### Login Page
```typescript
export class LoginPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/login');
  }
  
  async login(email: string, password: string) {
    await this.page.fill('[data-testid=email]', email);
    await this.page.fill('[data-testid=password]', password);
    await this.page.click('[data-testid=login-button]');
  }
  
  async expectLoginError() {
    await expect(this.page.locator('[data-testid=error-message]')).toBeVisible();
  }
}
```

### Dashboard Page
```typescript
export class DashboardPage {
  constructor(private page: Page) {}
  
  async expectToBeVisible() {
    await expect(this.page).toHaveURL('/dashboard');
    await expect(this.page.locator('[data-testid=dashboard-title]')).toBeVisible();
  }
  
  async navigateToPresence() {
    await this.page.click('[data-testid=presence-nav]');
  }
  
  async navigateToSettings() {
    await this.page.click('[data-testid=settings-nav]');
  }
}
```

## Utilitaires

### Authentication Helpers
```typescript
export async function loginAsUser(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.expectToBeVisible();
}

export async function loginAsAdmin(page: Page) {
  await loginAsUser(page, 'admin@example.com', 'AdminPassword123!');
}
```

### Data Helpers
```typescript
export async function createTestPresence(userId: string, organizationId: string) {
  // API call to create test presence
  const response = await fetch('/api/test/presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, organizationId })
  });
  
  return response.json();
}
```

## Bonnes pratiques

- Utiliser des data-testid pour les sélecteurs
- Implémenter le pattern Page Object
- Nettoyer les données de test après chaque run
- Tester sur plusieurs navigateurs
- Capturer les screenshots en cas d'échec
- Paralléliser les tests quand possible