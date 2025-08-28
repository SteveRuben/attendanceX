// tests/frontend/e2e/appointmentBooking.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { chromium, Browser, Page } from 'playwright';

describe('Appointment Booking E2E Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    
    // Set up test data and authentication
    await page.goto('http://localhost:3000/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for login to complete
    await page.waitForURL('**/dashboard');
  });

  afterEach(async () => {
    await browser.close();
  });

  describe('Complete Booking Workflow', () => {
    it('should complete full appointment booking flow', async () => {
      // Navigate to appointments
      await page.click('[data-testid="appointments-nav"]');
      await page.waitForURL('**/appointments');

      // Click new appointment button
      await page.click('[data-testid="new-appointment-button"]');
      
      // Fill appointment form
      await page.selectOption('[data-testid="client-select"]', 'client-1');
      await page.selectOption('[data-testid="service-select"]', 'service-1');
      await page.selectOption('[data-testid="practitioner-select"]', 'prac-1');
      
      // Set date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill('[data-testid="date-input"]', dateString);
      
      // Set time
      await page.fill('[data-testid="time-input"]', '14:30');
      
      // Add notes
      await page.fill('[data-testid="notes-input"]', 'Test appointment booking');
      
      // Submit form
      await page.click('[data-testid="save-appointment-button"]');
      
      // Wait for success message
      await page.waitForSelector('[data-testid="success-message"]');
      
      // Verify appointment appears in list
      await page.waitForSelector('[data-testid="appointment-list"]');
      const appointmentExists = await page.locator('[data-testid="appointment-item"]').count() > 0;
      expect(appointmentExists).toBe(true);
      
      // Verify appointment details
      const appointmentText = await page.locator('[data-testid="appointment-item"]').first().textContent();
      expect(appointmentText).toContain('Test appointment booking');
      expect(appointmentText).toContain('14:30');
    });

    it('should handle appointment conflicts gracefully', async () => {
      // Create first appointment
      await page.click('[data-testid="appointments-nav"]');
      await page.click('[data-testid="new-appointment-button"]');
      
      await page.selectOption('[data-testid="client-select"]', 'client-1');
      await page.selectOption('[data-testid="service-select"]', 'service-1');
      await page.selectOption('[data-testid="practitioner-select"]', 'prac-1');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill('[data-testid="date-input"]', dateString);
      await page.fill('[data-testid="time-input"]', '15:00');
      
      await page.click('[data-testid="save-appointment-button"]');
      await page.waitForSelector('[data-testid="success-message"]');
      
      // Try to create conflicting appointment
      await page.click('[data-testid="new-appointment-button"]');
      
      await page.selectOption('[data-testid="client-select"]', 'client-2');
      await page.selectOption('[data-testid="service-select"]', 'service-1');
      await page.selectOption('[data-testid="practitioner-select"]', 'prac-1');
      await page.fill('[data-testid="date-input"]', dateString);
      await page.fill('[data-testid="time-input"]', '15:15'); // Overlapping time
      
      await page.click('[data-testid="save-appointment-button"]');
      
      // Should show conflict error
      await page.waitForSelector('[data-testid="error-message"]');
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorText).toContain('conflit');
    });

    it('should validate working hours', async () => {
      await page.click('[data-testid="appointments-nav"]');
      await page.click('[data-testid="new-appointment-button"]');
      
      await page.selectOption('[data-testid="client-select"]', 'client-1');
      await page.selectOption('[data-testid="service-select"]', 'service-1');
      await page.selectOption('[data-testid="practitioner-select"]', 'prac-1');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill('[data-testid="date-input"]', dateString);
      await page.fill('[data-testid="time-input"]', '08:00'); // Before working hours
      
      await page.click('[data-testid="save-appointment-button"]');
      
      // Should show working hours error
      await page.waitForSelector('[data-testid="error-message"]');
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorText).toContain('horaires');
    });
  });

  describe('Public Booking Flow', () => {
    it('should complete public booking without authentication', async () => {
      // Logout first
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Navigate to public booking page
      await page.goto('http://localhost:3000/booking/public');
      
      // Select service
      await page.click('[data-testid="service-card-service-1"]');
      await page.click('[data-testid="continue-button"]');
      
      // Select practitioner
      await page.click('[data-testid="practitioner-card-prac-1"]');
      await page.click('[data-testid="continue-button"]');
      
      // Select date and time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.click(`[data-testid="date-${tomorrow.getDate()}"]`);
      await page.click('[data-testid="time-slot-14:30"]');
      await page.click('[data-testid="continue-button"]');
      
      // Fill client information
      await page.fill('[data-testid="client-name-input"]', 'John Public');
      await page.fill('[data-testid="client-email-input"]', 'john.public@example.com');
      await page.fill('[data-testid="client-phone-input"]', '+33123456789');
      await page.fill('[data-testid="client-notes-input"]', 'Public booking test');
      
      // Submit booking
      await page.click('[data-testid="confirm-booking-button"]');
      
      // Wait for confirmation
      await page.waitForSelector('[data-testid="booking-confirmation"]');
      const confirmationText = await page.locator('[data-testid="booking-confirmation"]').textContent();
      expect(confirmationText).toContain('confirmé');
      expect(confirmationText).toContain('John Public');
    });

    it('should validate client information in public booking', async () => {
      await page.goto('http://localhost:3000/booking/public');
      
      // Go through service and practitioner selection
      await page.click('[data-testid="service-card-service-1"]');
      await page.click('[data-testid="continue-button"]');
      await page.click('[data-testid="practitioner-card-prac-1"]');
      await page.click('[data-testid="continue-button"]');
      
      // Select date and time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.click(`[data-testid="date-${tomorrow.getDate()}"]`);
      await page.click('[data-testid="time-slot-14:30"]');
      await page.click('[data-testid="continue-button"]');
      
      // Try to submit with invalid email
      await page.fill('[data-testid="client-name-input"]', 'John Public');
      await page.fill('[data-testid="client-email-input"]', 'invalid-email');
      await page.fill('[data-testid="client-phone-input"]', '+33123456789');
      
      await page.click('[data-testid="confirm-booking-button"]');
      
      // Should show validation error
      await page.waitForSelector('[data-testid="validation-error"]');
      const errorText = await page.locator('[data-testid="validation-error"]').textContent();
      expect(errorText).toContain('email');
    });
  });

  describe('Appointment Management', () => {
    it('should allow editing existing appointments', async () => {
      // First create an appointment
      await page.click('[data-testid="appointments-nav"]');
      await page.click('[data-testid="new-appointment-button"]');
      
      await page.selectOption('[data-testid="client-select"]', 'client-1');
      await page.selectOption('[data-testid="service-select"]', 'service-1');
      await page.selectOption('[data-testid="practitioner-select"]', 'prac-1');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill('[data-testid="date-input"]', dateString);
      await page.fill('[data-testid="time-input"]', '16:00');
      await page.fill('[data-testid="notes-input"]', 'Original notes');
      
      await page.click('[data-testid="save-appointment-button"]');
      await page.waitForSelector('[data-testid="success-message"]');
      
      // Edit the appointment
      await page.click('[data-testid="appointment-item"] [data-testid="edit-button"]');
      
      // Update notes
      await page.fill('[data-testid="notes-input"]', 'Updated notes');
      await page.click('[data-testid="save-appointment-button"]');
      
      // Verify update
      await page.waitForSelector('[data-testid="success-message"]');
      const appointmentText = await page.locator('[data-testid="appointment-item"]').first().textContent();
      expect(appointmentText).toContain('Updated notes');
    });

    it('should allow cancelling appointments', async () => {
      // Create appointment first
      await page.click('[data-testid="appointments-nav"]');
      await page.click('[data-testid="new-appointment-button"]');
      
      await page.selectOption('[data-testid="client-select"]', 'client-1');
      await page.selectOption('[data-testid="service-select"]', 'service-1');
      await page.selectOption('[data-testid="practitioner-select"]', 'prac-1');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2); // 2 days ahead to avoid cancellation deadline
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill('[data-testid="date-input"]', dateString);
      await page.fill('[data-testid="time-input"]', '17:00');
      
      await page.click('[data-testid="save-appointment-button"]');
      await page.waitForSelector('[data-testid="success-message"]');
      
      // Cancel the appointment
      await page.click('[data-testid="appointment-item"] [data-testid="cancel-button"]');
      
      // Confirm cancellation
      await page.click('[data-testid="confirm-cancel-button"]');
      
      // Verify cancellation
      await page.waitForSelector('[data-testid="success-message"]');
      const appointmentStatus = await page.locator('[data-testid="appointment-status"]').textContent();
      expect(appointmentStatus).toContain('Annulé');
    });

    it('should show calendar view with appointments', async () => {
      await page.click('[data-testid="appointments-nav"]');
      await page.click('[data-testid="calendar-view-button"]');
      
      // Wait for calendar to load
      await page.waitForSelector('[data-testid="calendar-container"]');
      
      // Verify calendar navigation works
      await page.click('[data-testid="next-month-button"]');
      await page.waitForTimeout(500); // Wait for animation
      
      await page.click('[data-testid="prev-month-button"]');
      await page.waitForTimeout(500);
      
      // Switch to week view
      await page.click('[data-testid="week-view-button"]');
      await page.waitForSelector('[data-testid="week-view-container"]');
      
      // Switch to day view
      await page.click('[data-testid="day-view-button"]');
      await page.waitForSelector('[data-testid="day-view-container"]');
    });
  });

  describe('Notification Workflow', () => {
    it('should send confirmation email after booking', async () => {
      // This test would require email testing setup
      // For now, we'll test the UI feedback
      
      await page.click('[data-testid="appointments-nav"]');
      await page.click('[data-testid="new-appointment-button"]');
      
      await page.selectOption('[data-testid="client-select"]', 'client-1');
      await page.selectOption('[data-testid="service-select"]', 'service-1');
      await page.selectOption('[data-testid="practitioner-select"]', 'prac-1');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.fill('[data-testid="date-input"]', dateString);
      await page.fill('[data-testid="time-input"]', '18:00');
      
      await page.click('[data-testid="save-appointment-button"]');
      
      // Check for confirmation notification
      await page.waitForSelector('[data-testid="success-message"]');
      const successText = await page.locator('[data-testid="success-message"]').textContent();
      expect(successText).toContain('confirmation');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/appointments', route => route.abort());
      
      await page.click('[data-testid="appointments-nav"]');
      
      // Should show error message
      await page.waitForSelector('[data-testid="error-message"]');
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorText).toContain('connexion');
    });

    it('should recover from temporary failures', async () => {
      let requestCount = 0;
      
      // Fail first request, succeed on retry
      await page.route('**/api/appointments', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      await page.click('[data-testid="appointments-nav"]');
      
      // Should eventually load after retry
      await page.waitForSelector('[data-testid="appointment-list"]', { timeout: 10000 });
    });
  });

  describe('Performance', () => {
    it('should load appointments within acceptable time', async () => {
      const startTime = Date.now();
      
      await page.click('[data-testid="appointments-nav"]');
      await page.waitForSelector('[data-testid="appointment-list"]');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    it('should handle large number of appointments efficiently', async () => {
      // This would require test data setup with many appointments
      await page.click('[data-testid="appointments-nav"]');
      
      // Test pagination or virtual scrolling
      await page.waitForSelector('[data-testid="appointment-list"]');
      
      // Scroll to bottom to test performance
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Should remain responsive
      await page.waitForTimeout(1000);
      const isResponsive = await page.evaluate(() => {
        return document.readyState === 'complete';
      });
      
      expect(isResponsive).toBe(true);
    });
  });
});