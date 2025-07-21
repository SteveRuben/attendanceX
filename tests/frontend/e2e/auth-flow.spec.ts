// tests/frontend/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Login Page', () => {
    test('should display login form correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Check page title and heading
      await expect(page).toHaveTitle(/AttendanceX/);
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

      // Check form elements
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByLabel(/remember me/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Check navigation links
      await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /create an account/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Submit empty form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Check validation errors
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Fill invalid email
      await page.getByLabel(/email address/i).fill('invalid-email');
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText(/please enter a valid email address/i)).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      const passwordInput = page.getByLabel(/password/i);
      const toggleButton = page.locator('[data-testid="password-toggle"]').or(
        page.locator('button').filter({ has: page.locator('svg') }).nth(1)
      );

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click toggle to hide password again
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.getByRole('link', { name: /forgot password/i }).click();
      await expect(page).toHaveURL(/forgot-password/);
      await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
    });

    test('should navigate to register page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.getByRole('link', { name: /create an account/i }).click();
      await expect(page).toHaveURL(/register/);
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    });

    test('should attempt login with valid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Fill form
      await page.getByLabel(/email address/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      await page.getByLabel(/remember me/i).check();

      // Submit form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show loading state
      await expect(page.getByText(/signing in/i)).toBeVisible();

      // Note: In a real E2E test, you would mock the API or use a test database
      // For now, we just verify the form submission behavior
    });
  });

  test.describe('Register Page', () => {
    test('should display registration form correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);

      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

      // Check all form fields
      await expect(page.getByLabel(/first name/i)).toBeVisible();
      await expect(page.getByLabel(/last name/i)).toBeVisible();
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/organization/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
      await expect(page.getByLabel(/i agree to the/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    });

    test('should show validation errors for empty required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);

      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText(/first name is required/i)).toBeVisible();
      await expect(page.getByText(/last name is required/i)).toBeVisible();
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/organization is required/i)).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();
      await expect(page.getByText(/you must accept the terms/i)).toBeVisible();
    });

    test('should show password strength indicator', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);

      const passwordInput = page.getByLabel(/^password$/i);
      
      // Type weak password
      await passwordInput.fill('weak');
      await expect(page.getByText(/weak/i)).toBeVisible();

      // Type stronger password
      await passwordInput.fill('StrongPassword123!');
      await expect(page.getByText(/strong/i)).toBeVisible();
    });

    test('should validate password confirmation', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);

      await page.getByLabel(/^password$/i).fill('password123');
      await page.getByLabel(/confirm password/i).fill('differentpassword');
      await page.getByRole('button', { name: /create account/i }).click();

      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);

      await page.getByRole('link', { name: /sign in instead/i }).click();
      await expect(page).toHaveURL(/login/);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });
  });

  test.describe('Forgot Password Page', () => {
    test('should display forgot password form correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send recovery link/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible();
    });

    test('should show validation error for empty email', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      await page.getByRole('button', { name: /send recovery link/i }).click();
      await expect(page.getByText(/email is required/i)).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      await page.getByLabel(/email address/i).fill('invalid-email');
      await page.getByRole('button', { name: /send recovery link/i }).click();

      await expect(page.getByText(/please enter a valid email address/i)).toBeVisible();
    });

    test('should navigate back to login', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);

      await page.getByRole('link', { name: /back to sign in/i }).click();
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Reset Password Page', () => {
    test('should display reset password form with valid token', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=valid-token`);

      await expect(page.getByRole('heading', { name: /set new password/i })).toBeVisible();
      await expect(page.getByLabel(/new password/i)).toBeVisible();
      await expect(page.getByLabel(/confirm new password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /update password/i })).toBeVisible();
      await expect(page.getByText(/security tip/i)).toBeVisible();
    });

    test('should redirect to forgot password without token', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password`);
      
      // Should redirect to forgot password page
      await expect(page).toHaveURL(/forgot-password/);
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=valid-token`);

      await page.getByRole('button', { name: /update password/i }).click();

      await expect(page.getByText(/password is required/i)).toBeVisible();
      await expect(page.getByText(/please confirm your password/i)).toBeVisible();
    });

    test('should validate password confirmation', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=valid-token`);

      await page.getByLabel(/new password/i).fill('newpassword123');
      await page.getByLabel(/confirm new password/i).fill('differentpassword');
      await page.getByRole('button', { name: /update password/i }).click();

      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('should show password strength indicator', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password?token=valid-token`);

      const passwordInput = page.getByLabel(/new password/i);
      
      await passwordInput.fill('weak');
      await expect(page.getByText(/weak/i)).toBeVisible();

      await passwordInput.fill('StrongPassword123!');
      await expect(page.getByText(/strong/i)).toBeVisible();
    });
  });

  test.describe('Navigation Flow', () => {
    test('should navigate through complete auth flow', async ({ page }) => {
      // Start at login
      await page.goto(`${BASE_URL}/login`);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

      // Go to register
      await page.getByRole('link', { name: /create an account/i }).click();
      await expect(page).toHaveURL(/register/);
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

      // Go back to login
      await page.getByRole('link', { name: /sign in instead/i }).click();
      await expect(page).toHaveURL(/login/);

      // Go to forgot password
      await page.getByRole('link', { name: /forgot password/i }).click();
      await expect(page).toHaveURL(/forgot-password/);
      await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();

      // Go back to login
      await page.getByRole('link', { name: /back to sign in/i }).click();
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Check form labels
      const emailInput = page.getByLabel(/email address/i);
      const passwordInput = page.getByLabel(/password/i);
      
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('required');
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/email address/i)).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/password/i)).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/remember me/i)).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /sign in/i })).toBeFocused();
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();
      await expect(h1).toHaveText(/welcome back/i);
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/login`);

      // Form should still be visible and usable
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      await expect(page.getByLabel(/email address/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/register`);

      // Registration form should be properly laid out
      await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
      await expect(page.getByLabel(/first name/i)).toBeVisible();
      await expect(page.getByLabel(/last name/i)).toBeVisible();
    });
  });
});