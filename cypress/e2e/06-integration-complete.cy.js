// Tests d'intégration complète de l'application
describe('Complete Application Integration', () => {
  beforeEach(() => {
    cy.login();
  });

  describe('End-to-End Workflow: Organization to Event', () => {
    it('should complete full workflow from organization setup to event creation', () => {
      // 1. Configuration de l'organisation
      cy.visit('/app/organization/settings');
      
      // Configurer les paramètres généraux
      cy.get('[data-cy="tab-general"]').click();
      const orgName = `Test Organization ${Date.now()}`;
      cy.get('[data-cy="org-name-input"]').clear().type(orgName);
      cy.get('[data-cy="save-general-settings"]').click();
      cy.get('[data-cy="save-success"]').should('be.visible');
      
      // Configurer le branding
      cy.get('[data-cy="tab-branding"]').click();
      cy.get('[data-cy="primary-color-picker"]').click();
      cy.get('[data-cy="color-input"]').clear().type('#ff6b35');
      cy.get('[data-cy="color-apply"]').click();
      cy.get('[data-cy="save-branding"]').click();
      cy.get('[data-cy="branding-success"]').should('be.visible');
      
      // 2. Création d'un projet
      cy.visit('/app/projects');
      cy.get('[data-cy="create-project-button"]').click();
      
      const projectName = `Integration Test Project ${Date.now()}`;
      cy.get('[data-cy="project-name-input"]').type(projectName);
      cy.get('[data-cy="project-description-input"]').type('Projet créé pour test d\'intégration');
      cy.get('[data-cy="create-project-button"]').click();
      
      // Vérifier la création du projet
      cy.url().should('match', /\/app\/projects\/[a-zA-Z0-9]+$/);
      cy.get('[data-cy="project-title"]').should('contain', projectName);
      
      // 3. Création d'une équipe
      cy.get('[data-cy="tab-teams"]').click();
      cy.get('[data-cy="create-team-button"]').click();
      
      const teamName = `Test Team ${Date.now()}`;
      cy.get('[data-cy="team-name-input"]').type(teamName);
      cy.get('[data-cy="save-team-button"]').click();
      cy.get('[data-cy="team-item"]').should('contain', teamName);
      
      // 4. Création d'un formulaire
      cy.get('[data-cy="tab-forms"]').click();
      cy.get('[data-cy="create-form-button"]').click();
      
      // Dans le form builder
      cy.get('[data-cy="form-title-input"]').type('Formulaire d\'inscription');
      cy.get('[data-cy="add-section-button"]').click();
      cy.get('[data-cy="section-title-input"]').type('Informations personnelles');
      
      // Ajouter des champs
      cy.get('[data-cy="add-field-button"]').click();
      cy.get('[data-cy="field-type-select"]').select('text');
      cy.get('[data-cy="field-label-input"]').type('Nom complet');
      cy.get('[data-cy="save-field-button"]').click();
      
      // Sauvegarder le formulaire
      cy.get('[data-cy="save-form-button"]').click();
      cy.get('[data-cy="save-success"]').should('be.visible');
      
      // Vérifier que le branding est appliqué
      cy.get('[data-cy="form-preview"]').should('have.css', 'color').and('include', 'rgb(255, 107, 53)');
      
      // 5. Création d'un événement
      cy.get('[data-cy="tab-events"]').click();
      cy.get('[data-cy="create-event-button"]').click();
      
      const eventTitle = `Integration Test Event ${Date.now()}`;
      cy.get('[data-cy="event-title-input"]').type(eventTitle);
      cy.get('[data-cy="event-date-input"]').type('2024-12-31');
      cy.get('[data-cy="event-time-input"]').type('14:00');
      cy.get('[data-cy="event-location-input"]').type('Salle de conférence');
      cy.get('[data-cy="save-event-button"]').click();
      
      // Vérifier la création de l'événement
      cy.get('[data-cy="event-item"]').should('contain', eventTitle);
      
      // 6. Configuration de l'inscription à l'événement
      cy.get('[data-cy="event-item"]').first().click();
      cy.get('[data-cy="tab-registration"]').click();
      cy.get('[data-cy="registration-enabled-toggle"]').click();
      cy.get('[data-cy="max-attendees-input"]').type('100');
      cy.get('[data-cy="save-registration-settings"]').click();
      
      // Vérifier que le lien d'inscription est généré
      cy.get('[data-cy="registration-link"]').should('be.visible');
      
      // 7. Vérification finale dans le dashboard
      cy.visit('/app/dashboard');
      
      // Vérifier que les statistiques sont mises à jour
      cy.get('[data-cy="stats-projects"]').should('contain', '1');
      cy.get('[data-cy="stats-events"]').should('contain', '1');
      
      // Vérifier les activités récentes
      cy.get('[data-cy="recent-activities"]').should('contain', projectName);
      cy.get('[data-cy="recent-activities"]').should('contain', eventTitle);
    });
  });

  describe('Cross-Module Data Consistency', () => {
    it('should maintain data consistency across modules', () => {
      // Créer un projet avec événement
      cy.createTestProject().then((projectId) => {
        cy.visit(`/app/projects/${projectId}`);
        
        // Créer un événement dans le projet
        cy.get('[data-cy="tab-events"]').click();
        cy.get('[data-cy="create-event-button"]').click();
        
        const eventTitle = `Consistency Test Event ${Date.now()}`;
        cy.get('[data-cy="event-title-input"]').type(eventTitle);
        cy.get('[data-cy="event-date-input"]').type('2024-12-31');
        cy.get('[data-cy="event-time-input"]').type('10:00');
        cy.get('[data-cy="save-event-button"]').click();
        
        // Vérifier dans la liste des événements globale
        cy.visit('/app/events');
        cy.get('[data-cy="event-card"]').should('contain', eventTitle);
        
        // Vérifier dans le dashboard
        cy.visit('/app/dashboard');
        cy.get('[data-cy="upcoming-events"]').should('contain', eventTitle);
        
        // Modifier l'événement depuis la vue globale
        cy.visit('/app/events');
        cy.get('[data-cy="event-card"]').first().click();
        cy.get('[data-cy="edit-event-button"]').click();
        
        const updatedTitle = `${eventTitle} - Updated`;
        cy.get('[data-cy="event-title-input"]').clear().type(updatedTitle);
        cy.get('[data-cy="save-event-button"]').click();
        
        // Vérifier que la modification est reflétée dans le projet
        cy.visit(`/app/projects/${projectId}`);
        cy.get('[data-cy="tab-events"]').click();
        cy.get('[data-cy="event-item"]').should('contain', updatedTitle);
      });
    });

    it('should handle organization branding across all modules', () => {
      // Configurer le branding de l'organisation
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-branding"]').click();
      
      const brandColor = '#9333ea';
      cy.get('[data-cy="primary-color-picker"]').click();
      cy.get('[data-cy="color-input"]').clear().type(brandColor);
      cy.get('[data-cy="color-apply"]').click();
      cy.get('[data-cy="save-branding"]').click();
      
      // Vérifier l'application du branding dans les projets
      cy.visit('/app/projects');
      cy.get('[data-cy="create-project-button"]').should('have.css', 'background-color').and('include', 'rgb(147, 51, 234)');
      
      // Vérifier dans les événements
      cy.visit('/app/events');
      cy.get('[data-cy="create-event-button"]').should('have.css', 'background-color').and('include', 'rgb(147, 51, 234)');
      
      // Vérifier dans le form builder
      cy.createTestProject().then((projectId) => {
        cy.visit(`/app/projects/${projectId}`);
        cy.get('[data-cy="tab-forms"]').click();
        cy.get('[data-cy="create-form-button"]').click();
        
        cy.get('[data-cy="form-preview"]').should('have.css', 'color').and('include', 'rgb(147, 51, 234)');
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', () => {
      // Créer plusieurs projets rapidement
      const projectPromises = [];
      for (let i = 0; i < 5; i++) {
        projectPromises.push(cy.createTestProject());
      }
      
      Promise.all(projectPromises).then(() => {
        // Vérifier que la liste des projets se charge rapidement
        const startTime = Date.now();
        cy.visit('/app/projects').then(() => {
          const loadTime = Date.now() - startTime;
          expect(loadTime).to.be.lessThan(3000);
        });
        
        // Vérifier la pagination
        cy.get('[data-cy="projects-list"]').should('be.visible');
        cy.get('[data-cy="project-card"]').should('have.length.at.least', 5);
      });
    });

    it('should handle concurrent user actions', () => {
      // Simuler des actions simultanées
      cy.createTestProject().then((projectId) => {
        cy.visit(`/app/projects/${projectId}`);
        
        // Modifier le projet et créer un événement simultanément
        cy.get('[data-cy="edit-project-button"]').click();
        cy.get('[data-cy="project-name-input"]').clear().type('Updated Project');
        
        // Ouvrir un nouvel onglet pour créer un événement
        cy.get('[data-cy="tab-events"]').click();
        cy.get('[data-cy="create-event-button"]').click();
        cy.get('[data-cy="event-title-input"]').type('Concurrent Event');
        cy.get('[data-cy="event-date-input"]').type('2024-12-31');
        cy.get('[data-cy="event-time-input"]').type('15:00');
        
        // Sauvegarder les deux modifications
        cy.get('[data-cy="save-event-button"]').click();
        cy.get('[data-cy="tab-overview"]').click();
        cy.get('[data-cy="save-project-button"]').click();
        
        // Vérifier que les deux modifications sont sauvegardées
        cy.get('[data-cy="project-title"]').should('contain', 'Updated Project');
        cy.get('[data-cy="tab-events"]').click();
        cy.get('[data-cy="event-item"]').should('contain', 'Concurrent Event');
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover gracefully from network errors', () => {
      // Simuler une perte de connexion
      cy.intercept('GET', '**/api/**', { forceNetworkError: true }).as('networkError');
      
      cy.visit('/app/dashboard');
      
      // Vérifier que l'erreur est gérée
      cy.get('[data-cy="network-error"]').should('be.visible');
      cy.get('[data-cy="retry-button"]').should('be.visible');
      
      // Restaurer la connexion
      cy.intercept('GET', '**/api/**').as('networkRestored');
      
      cy.get('[data-cy="retry-button"]').click();
      
      // Vérifier que l'application récupère
      cy.wait('@networkRestored');
      cy.get('[data-cy="dashboard-stats"]').should('be.visible');
    });

    it('should handle session expiration gracefully', () => {
      // Simuler une session expirée
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'expired-token');
      });
      
      cy.visit('/app/projects');
      
      // Devrait rediriger vers la page de connexion
      cy.url().should('include', '/auth/login');
      cy.get('[data-cy="session-expired-message"]').should('be.visible');
      
      // Se reconnecter
      cy.login();
      
      // Devrait revenir à la page demandée
      cy.url().should('include', '/app/projects');
    });

    it('should maintain form data during errors', () => {
      cy.visit('/app/projects/create');
      
      // Remplir le formulaire
      const projectName = 'Test Project with Error';
      cy.get('[data-cy="project-name-input"]').type(projectName);
      cy.get('[data-cy="project-description-input"]').type('Description du projet');
      
      // Simuler une erreur de sauvegarde
      cy.intercept('POST', '**/api/projects', { statusCode: 500 });
      
      cy.get('[data-cy="create-project-button"]').click();
      
      // Vérifier que l'erreur est affichée mais les données conservées
      cy.get('[data-cy="creation-error"]').should('be.visible');
      cy.get('[data-cy="project-name-input"]').should('have.value', projectName);
      
      // Corriger l'erreur et réessayer
      cy.intercept('POST', '**/api/projects').as('createProject');
      
      cy.get('[data-cy="create-project-button"]').click();
      
      cy.wait('@createProject');
      cy.url().should('match', /\/app\/projects\/[a-zA-Z0-9]+$/);
    });
  });

  describe('Security and Access Control', () => {
    it('should enforce role-based access control', () => {
      // Test avec différents rôles
      const roles = ['owner', 'admin', 'organizer', 'member'];
      
      roles.forEach(role => {
        cy.loginAsRole(role);
        
        cy.visit('/app/organization/settings');
        
        if (['owner', 'admin'].includes(role)) {
          // Propriétaires et admins devraient avoir accès
          cy.get('[data-cy="organization-settings"]').should('be.visible');
        } else {
          // Autres rôles devraient être bloqués
          cy.get('[data-cy="access-denied"]').should('be.visible');
        }
      });
    });

    it('should protect sensitive data', () => {
      cy.loginAsRole('owner');
      
      // Configurer SMTP avec des credentials
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-smtp"]').click();
      cy.get('[data-cy="smtp-enabled-toggle"]').click();
      
      cy.get('[data-cy="smtp-password-input"]').type('secret-password');
      cy.get('[data-cy="save-smtp-settings"]').click();
      
      // Se connecter avec un rôle inférieur
      cy.loginAsRole('member');
      
      cy.visit('/app/organization/settings', { failOnStatusCode: false });
      
      // Ne devrait pas pouvoir voir les credentials
      cy.get('[data-cy="smtp-password-input"]').should('not.exist');
    });

    it('should validate CSRF protection', () => {
      cy.login();
      
      // Tenter une requête sans token CSRF
      cy.request({
        method: 'POST',
        url: `${Cypress.env('API_URL')}/projects`,
        body: { name: 'CSRF Test Project' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should work correctly on mobile devices', () => {
      cy.viewport('iphone-x');
      
      cy.login();
      cy.visit('/app/dashboard');
      
      // Vérifier que la navigation mobile fonctionne
      cy.get('[data-cy="mobile-menu-button"]').click();
      cy.get('[data-cy="mobile-nav"]').should('be.visible');
      
      // Naviguer vers les projets
      cy.get('[data-cy="mobile-nav-projects"]').click();
      cy.url().should('include', '/app/projects');
      
      // Vérifier que les cartes s'adaptent
      cy.get('[data-cy="project-card"]').should('have.css', 'width').and('match', /100%|full/);
      
      // Créer un projet sur mobile
      cy.get('[data-cy="create-project-button"]').click();
      
      const projectName = 'Mobile Test Project';
      cy.get('[data-cy="project-name-input"]').type(projectName);
      cy.get('[data-cy="create-project-button"]').click();
      
      cy.get('[data-cy="project-title"]').should('contain', projectName);
    });

    it('should handle touch interactions', () => {
      cy.viewport('ipad-2');
      
      cy.login();
      cy.visit('/app/events');
      
      // Basculer vers la vue calendrier
      cy.get('[data-cy="calendar-view-toggle"]').click();
      
      // Tester le swipe sur le calendrier
      cy.get('[data-cy="events-calendar"]')
        .trigger('touchstart', { touches: [{ clientX: 200, clientY: 200 }] })
        .trigger('touchmove', { touches: [{ clientX: 100, clientY: 200 }] })
        .trigger('touchend');
      
      // Vérifier que le calendrier a changé de mois
      cy.get('[data-cy="current-month"]').should('be.visible');
    });
  });

  describe('Accessibility Compliance', () => {
    it('should be accessible with keyboard navigation', () => {
      cy.login();
      cy.visit('/app/dashboard');
      
      // Naviguer avec Tab
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'nav-dashboard');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'nav-projects');
      
      // Activer avec Enter
      cy.focused().type('{enter}');
      cy.url().should('include', '/app/projects');
    });

    it('should have proper ARIA labels', () => {
      cy.login();
      cy.visit('/app/projects');
      
      // Vérifier les labels ARIA
      cy.get('[data-cy="create-project-button"]').should('have.attr', 'aria-label');
      cy.get('[data-cy="projects-search"]').should('have.attr', 'aria-label');
      cy.get('[data-cy="projects-filter"]').should('have.attr', 'aria-label');
    });

    it('should support screen readers', () => {
      cy.login();
      cy.visit('/app/dashboard');
      
      // Vérifier les éléments pour lecteurs d'écran
      cy.get('[data-cy="dashboard-stats"]').should('have.attr', 'role', 'region');
      cy.get('[data-cy="recent-activities"]').should('have.attr', 'aria-live', 'polite');
    });
  });
});