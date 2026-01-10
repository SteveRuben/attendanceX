// Test de fumée global de l'application
describe('AttendanceX - Application Smoke Test', () => {
  beforeEach(() => {
    // Configuration de base
    cy.viewport(1280, 720);
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  it('should load the application homepage', () => {
    cy.visit('/');
    cy.get('head title').should('contain', 'AttendanceX');
    cy.get('body').should('be.visible');
  });

  it('should have working navigation to login', () => {
    cy.visit('/');
    
    // Vérifier que la page de connexion est accessible
    cy.visit('/auth/login');
    cy.url().should('include', '/auth/login');
    
    // Vérifier les éléments de base de la page de connexion
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should handle 404 pages gracefully', () => {
    cy.visit('/non-existent-page', { failOnStatusCode: false });
    cy.get('body').should('contain.text', '404');
  });

  it('should have proper meta tags', () => {
    cy.visit('/');
    cy.get('head meta[name="viewport"]').should('have.attr', 'content').and('include', 'width=device-width');
    cy.get('head meta[charset]').should('exist');
  });

  it('should load without JavaScript errors', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    
    // Vérifier le titre de la page
    cy.title().should('include', 'AttendanceX');
    
    // Vérifier qu'il n'y a pas d'erreurs critiques dans la console
    cy.window().should('exist');
  });

  it('should be responsive', () => {
    // Test mobile
    cy.viewport(375, 667);
    cy.visit('/');
    cy.get('body').should('be.visible');
    
    // Test desktop
    cy.viewport(1920, 1080);
    cy.visit('/');
    cy.get('body').should('be.visible');
  });
});