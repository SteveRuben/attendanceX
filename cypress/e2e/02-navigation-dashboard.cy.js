// Tests de navigation et dashboard
describe('Navigation & Dashboard', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/app/dashboard');
  });

  describe('Main Navigation', () => {
    it('should display sidebar navigation correctly', () => {
      // Vérifier que la sidebar est visible
      cy.get('[data-cy="sidebar"]').should('be.visible');
      
      // Vérifier les liens de navigation principaux
      cy.get('[data-cy="nav-dashboard"]').should('be.visible');
      cy.get('[data-cy="nav-projects"]').should('be.visible');
      cy.get('[data-cy="nav-events"]').should('be.visible');
      cy.get('[data-cy="nav-organization"]').should('be.visible');
    });

    it('should navigate between main sections', () => {
      // Navigation vers Projects
      cy.get('[data-cy="nav-projects"]').click();
      cy.url().should('include', '/app/projects');
      cy.get('[data-cy="page-title"]').should('contain', 'Projets');
      
      // Navigation vers Events
      cy.get('[data-cy="nav-events"]').click();
      cy.url().should('include', '/app/events');
      cy.get('[data-cy="page-title"]').should('contain', 'Événements');
      
      // Navigation vers Organization
      cy.get('[data-cy="nav-organization"]').click();
      cy.url().should('include', '/app/organization');
      cy.get('[data-cy="page-title"]').should('contain', 'Organisation');
      
      // Retour au Dashboard
      cy.get('[data-cy="nav-dashboard"]').click();
      cy.url().should('include', '/app/dashboard');
      cy.get('[data-cy="page-title"]').should('contain', 'Tableau de Bord');
    });

    it('should highlight active navigation item', () => {
      // Vérifier que le dashboard est actif par défaut
      cy.get('[data-cy="nav-dashboard"]').should('have.class', 'active');
      
      // Naviguer vers projects et vérifier l'état actif
      cy.get('[data-cy="nav-projects"]').click();
      cy.get('[data-cy="nav-projects"]').should('have.class', 'active');
      cy.get('[data-cy="nav-dashboard"]').should('not.have.class', 'active');
    });

    it('should collapse/expand sidebar on mobile', () => {
      cy.viewport(768, 1024);
      
      // Sur mobile, la sidebar devrait être collapsée par défaut
      cy.get('[data-cy="sidebar"]').should('have.class', 'collapsed');
      
      // Ouvrir la sidebar
      cy.get('[data-cy="sidebar-toggle"]').click();
      cy.get('[data-cy="sidebar"]').should('not.have.class', 'collapsed');
      
      // Fermer la sidebar
      cy.get('[data-cy="sidebar-toggle"]').click();
      cy.get('[data-cy="sidebar"]').should('have.class', 'collapsed');
    });
  });

  describe('User Menu', () => {
    it('should display user information', () => {
      cy.get('[data-cy="user-menu-button"]').click();
      
      cy.get('[data-cy="user-menu"]').should('be.visible');
      cy.get('[data-cy="user-email"]').should('contain', '@');
      cy.get('[data-cy="user-role"]').should('be.visible');
    });

    it('should navigate to profile settings', () => {
      cy.get('[data-cy="user-menu-button"]').click();
      cy.get('[data-cy="profile-settings-link"]').click();
      
      cy.url().should('include', '/app/profile');
    });

    it('should logout from user menu', () => {
      cy.get('[data-cy="user-menu-button"]').click();
      cy.get('[data-cy="logout-button"]').click();
      
      cy.url().should('include', '/auth/login');
    });
  });

  describe('Dashboard Content', () => {
    it('should display dashboard statistics', () => {
      // Vérifier les cartes de statistiques
      cy.get('[data-cy="stats-projects"]').should('be.visible');
      cy.get('[data-cy="stats-events"]').should('be.visible');
      cy.get('[data-cy="stats-attendances"]').should('be.visible');
      cy.get('[data-cy="stats-users"]').should('be.visible');
      
      // Vérifier que les statistiques contiennent des nombres
      cy.get('[data-cy="stats-projects"] [data-cy="stat-value"]').should('match', /\d+/);
      cy.get('[data-cy="stats-events"] [data-cy="stat-value"]').should('match', /\d+/);
    });

    it('should display recent activities', () => {
      cy.get('[data-cy="recent-activities"]').should('be.visible');
      cy.get('[data-cy="activity-item"]').should('have.length.at.least', 1);
      
      // Vérifier le contenu des activités
      cy.get('[data-cy="activity-item"]').first().within(() => {
        cy.get('[data-cy="activity-title"]').should('be.visible');
        cy.get('[data-cy="activity-date"]').should('be.visible');
      });
    });

    it('should display upcoming events', () => {
      cy.get('[data-cy="upcoming-events"]').should('be.visible');
      
      // Si il y a des événements à venir
      cy.get('body').then(($body) => {
        if ($body.find('[data-cy="event-item"]').length > 0) {
          cy.get('[data-cy="event-item"]').first().within(() => {
            cy.get('[data-cy="event-title"]').should('be.visible');
            cy.get('[data-cy="event-date"]').should('be.visible');
          });
        } else {
          cy.get('[data-cy="no-events-message"]').should('be.visible');
        }
      });
    });

    it('should have working quick actions', () => {
      // Vérifier les boutons d'action rapide
      cy.get('[data-cy="quick-create-project"]').should('be.visible');
      cy.get('[data-cy="quick-create-event"]').should('be.visible');
      
      // Tester la création rapide de projet
      cy.get('[data-cy="quick-create-project"]').click();
      cy.url().should('include', '/app/projects/create');
    });

    it('should refresh data when refresh button is clicked', () => {
      // Intercepter les requêtes de données
      cy.intercept('GET', '**/api/dashboard/stats').as('getStats');
      cy.intercept('GET', '**/api/dashboard/activities').as('getActivities');
      
      cy.get('[data-cy="refresh-dashboard"]').click();
      
      // Vérifier que les requêtes sont relancées
      cy.wait('@getStats');
      cy.wait('@getActivities');
      
      // Vérifier l'indicateur de chargement
      cy.get('[data-cy="loading-indicator"]').should('be.visible');
      cy.get('[data-cy="loading-indicator"]').should('not.exist');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for tablet view', () => {
      cy.viewport(768, 1024);
      
      // Vérifier que les statistiques s'adaptent
      cy.get('[data-cy="dashboard-stats"]').should('have.class', 'tablet-layout');
      
      // Vérifier que la sidebar est adaptée
      cy.get('[data-cy="sidebar"]').should('have.class', 'tablet-sidebar');
    });

    it('should adapt layout for mobile view', () => {
      cy.viewport(375, 667);
      
      // Vérifier que les statistiques sont en colonne unique
      cy.get('[data-cy="dashboard-stats"]').should('have.class', 'mobile-layout');
      
      // Vérifier que la sidebar est cachée par défaut
      cy.get('[data-cy="sidebar"]').should('have.class', 'mobile-hidden');
    });
  });

  describe('Performance', () => {
    it('should load dashboard within acceptable time', () => {
      const startTime = Date.now();
      
      cy.visit('/app/dashboard').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // 3 secondes max
      });
    });

    it('should handle slow API responses gracefully', () => {
      // Simuler des réponses lentes
      cy.intercept('GET', '**/api/dashboard/**', (req) => {
        req.reply((res) => {
          res.delay(2000);
          res.send(res.body);
        });
      });
      
      cy.visit('/app/dashboard');
      
      // Vérifier que les indicateurs de chargement sont affichés
      cy.get('[data-cy="stats-loading"]').should('be.visible');
      cy.get('[data-cy="activities-loading"]').should('be.visible');
      
      // Attendre que le chargement se termine
      cy.get('[data-cy="stats-loading"]').should('not.exist');
      cy.get('[data-cy="activities-loading"]').should('not.exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Simuler une erreur API
      cy.intercept('GET', '**/api/dashboard/stats', { statusCode: 500 });
      
      cy.visit('/app/dashboard');
      
      // Vérifier que l'erreur est affichée
      cy.get('[data-cy="stats-error"]').should('be.visible');
      cy.get('[data-cy="retry-button"]').should('be.visible');
    });

    it('should retry failed requests', () => {
      let requestCount = 0;
      
      cy.intercept('GET', '**/api/dashboard/stats', (req) => {
        requestCount++;
        if (requestCount === 1) {
          req.reply({ statusCode: 500 });
        } else {
          req.reply({ fixture: 'dashboard-stats.json' });
        }
      });
      
      cy.visit('/app/dashboard');
      
      // Cliquer sur retry
      cy.get('[data-cy="retry-button"]').click();
      
      // Vérifier que les données sont chargées après retry
      cy.get('[data-cy="stats-projects"]').should('be.visible');
    });
  });
});