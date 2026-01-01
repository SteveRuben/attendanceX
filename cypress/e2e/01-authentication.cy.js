// Tests d'authentification complets
describe('Authentication Flow', () => {
  const testUser = {
    email: Cypress.env('TEST_EMAIL') || 'test@test.com',
    password: Cypress.env('TEST_PASSWORD') || '123Abc@cbA123'
  };

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Login Process', () => {
    it('should display login form correctly', () => {
      cy.visit('/auth/login');
      
      // Vérifier les éléments du formulaire
      cy.get('[data-cy="email-input"]').should('be.visible');
      cy.get('[data-cy="password-input"]').should('be.visible');
      cy.get('[data-cy="login-button"]').should('be.visible');
      cy.get('[data-cy="forgot-password-link"]').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-cy="login-button"]').click();
      
      // Vérifier les messages d'erreur
      cy.get('[data-cy="email-error"]').should('be.visible');
      cy.get('[data-cy="password-error"]').should('be.visible');
    });

    it('should show error for invalid email format', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-cy="email-input"]').type('invalid-email');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-button"]').click();
      
      cy.get('[data-cy="email-error"]').should('contain', 'email valide');
    });

    it('should login successfully with valid credentials', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-cy="email-input"]').type(testUser.email);
      cy.get('[data-cy="password-input"]').type(testUser.password);
      cy.get('[data-cy="login-button"]').click();
      
      // Vérifier la redirection après connexion
      cy.url().should('not.include', '/auth/login');
      cy.url().should('include', '/app');
      
      // Vérifier que le token est stocké
      cy.window().then((win) => {
        expect(win.localStorage.getItem('authToken')).to.exist;
      });
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-cy="email-input"]').type('wrong@email.com');
      cy.get('[data-cy="password-input"]').type('wrongpassword');
      cy.get('[data-cy="login-button"]').click();
      
      cy.get('[data-cy="login-error"]').should('be.visible');
      cy.get('[data-cy="login-error"]').should('contain', 'Identifiants invalides');
    });

    it('should handle loading state during login', () => {
      cy.visit('/auth/login');
      
      cy.get('[data-cy="email-input"]').type(testUser.email);
      cy.get('[data-cy="password-input"]').type(testUser.password);
      
      // Intercepter la requête pour la ralentir
      cy.intercept('POST', '**/auth/login', (req) => {
        req.reply((res) => {
          res.delay(1000);
          res.send(res.body);
        });
      });
      
      cy.get('[data-cy="login-button"]').click();
      
      // Vérifier l'état de chargement
      cy.get('[data-cy="login-button"]').should('be.disabled');
      cy.get('[data-cy="loading-spinner"]').should('be.visible');
    });
  });

  describe('Logout Process', () => {
    beforeEach(() => {
      // Se connecter avant chaque test de déconnexion
      cy.login(testUser.email, testUser.password);
    });

    it('should logout successfully', () => {
      cy.visit('/app/dashboard');
      
      // Ouvrir le menu utilisateur
      cy.get('[data-cy="user-menu-button"]').click();
      cy.get('[data-cy="logout-button"]').click();
      
      // Vérifier la redirection vers la page de connexion
      cy.url().should('include', '/auth/login');
      
      // Vérifier que le token est supprimé
      cy.window().then((win) => {
        expect(win.localStorage.getItem('authToken')).to.be.null;
      });
    });

    it('should redirect to login when accessing protected route after logout', () => {
      cy.visit('/app/dashboard');
      
      // Se déconnecter
      cy.get('[data-cy="user-menu-button"]').click();
      cy.get('[data-cy="logout-button"]').click();
      
      // Essayer d'accéder à une route protégée
      cy.visit('/app/projects');
      cy.url().should('include', '/auth/login');
    });
  });

  describe('Password Reset', () => {
    it('should display forgot password form', () => {
      cy.visit('/auth/login');
      cy.get('[data-cy="forgot-password-link"]').click();
      
      cy.url().should('include', '/auth/forgot-password');
      cy.get('[data-cy="reset-email-input"]').should('be.visible');
      cy.get('[data-cy="reset-submit-button"]').should('be.visible');
    });

    it('should send password reset email', () => {
      cy.visit('/auth/forgot-password');
      
      cy.get('[data-cy="reset-email-input"]').type(testUser.email);
      cy.get('[data-cy="reset-submit-button"]').click();
      
      cy.get('[data-cy="reset-success-message"]').should('be.visible');
      cy.get('[data-cy="reset-success-message"]').should('contain', 'email envoyé');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when not authenticated', () => {
      const protectedRoutes = [
        '/app/dashboard',
        '/app/projects',
        '/app/events',
        '/app/organization/settings'
      ];

      protectedRoutes.forEach(route => {
        cy.visit(route);
        cy.url().should('include', '/auth/login');
      });
    });

    it('should allow access to protected routes when authenticated', () => {
      cy.login(testUser.email, testUser.password);
      
      const protectedRoutes = [
        '/app/dashboard',
        '/app/projects',
        '/app/events'
      ];

      protectedRoutes.forEach(route => {
        cy.visit(route);
        cy.url().should('include', route);
      });
    });
  });

  describe('Session Management', () => {
    it('should maintain session across page reloads', () => {
      cy.login(testUser.email, testUser.password);
      cy.visit('/app/dashboard');
      
      cy.reload();
      
      // Vérifier que l'utilisateur reste connecté
      cy.url().should('include', '/app/dashboard');
      cy.get('[data-cy="user-menu-button"]').should('be.visible');
    });

    it('should handle expired token gracefully', () => {
      cy.login(testUser.email, testUser.password);
      
      // Simuler un token expiré
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'expired-token');
      });
      
      cy.visit('/app/dashboard');
      
      // Devrait rediriger vers la page de connexion
      cy.url().should('include', '/auth/login');
    });
  });
});