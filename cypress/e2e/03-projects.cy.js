// Tests complets des projets
describe('Projects Management', () => {
  beforeEach(() => {
    cy.login();
  });

  describe('Projects List', () => {
    beforeEach(() => {
      cy.visit('/app/projects');
    });

    it('should display projects list correctly', () => {
      cy.get('[data-cy="projects-list"]').should('be.visible');
      cy.get('[data-cy="create-project-button"]').should('be.visible');
      cy.get('[data-cy="projects-search"]').should('be.visible');
      cy.get('[data-cy="projects-filter"]').should('be.visible');
    });

    it('should search projects', () => {
      // Intercepter la requête de recherche
      cy.intercept('GET', '**/api/projects?search=*').as('searchProjects');
      
      cy.get('[data-cy="projects-search"]').type('test project');
      
      cy.wait('@searchProjects');
      cy.get('[data-cy="project-card"]').should('have.length.at.least', 0);
    });

    it('should filter projects by status', () => {
      cy.get('[data-cy="projects-filter"]').click();
      cy.get('[data-cy="filter-active"]').click();
      
      // Vérifier que seuls les projets actifs sont affichés
      cy.get('[data-cy="project-card"]').each(($card) => {
        cy.wrap($card).find('[data-cy="project-status"]').should('contain', 'Actif');
      });
    });

    it('should display project cards with correct information', () => {
      cy.get('[data-cy="project-card"]').first().within(() => {
        cy.get('[data-cy="project-title"]').should('be.visible');
        cy.get('[data-cy="project-description"]').should('be.visible');
        cy.get('[data-cy="project-status"]').should('be.visible');
        cy.get('[data-cy="project-created-date"]').should('be.visible');
        cy.get('[data-cy="project-actions"]').should('be.visible');
      });
    });

    it('should navigate to project details', () => {
      cy.get('[data-cy="project-card"]').first().click();
      cy.url().should('match', /\/app\/projects\/[a-zA-Z0-9]+$/);
    });
  });

  describe('Project Creation', () => {
    beforeEach(() => {
      cy.visit('/app/projects/create');
    });

    it('should display project creation form', () => {
      cy.get('[data-cy="project-form"]').should('be.visible');
      cy.get('[data-cy="project-name-input"]').should('be.visible');
      cy.get('[data-cy="project-description-input"]').should('be.visible');
      cy.get('[data-cy="project-template-selector"]').should('be.visible');
      cy.get('[data-cy="create-project-button"]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.get('[data-cy="create-project-button"]').click();
      
      cy.get('[data-cy="name-error"]').should('be.visible');
      cy.get('[data-cy="name-error"]').should('contain', 'requis');
    });

    it('should create a basic project successfully', () => {
      const projectName = `Test Project ${Date.now()}`;
      
      cy.get('[data-cy="project-name-input"]').type(projectName);
      cy.get('[data-cy="project-description-input"]').type('Description du projet de test');
      
      // Intercepter la requête de création
      cy.intercept('POST', '**/api/projects').as('createProject');
      
      cy.get('[data-cy="create-project-button"]').click();
      
      cy.wait('@createProject');
      
      // Vérifier la redirection vers le projet créé
      cy.url().should('match', /\/app\/projects\/[a-zA-Z0-9]+$/);
      cy.get('[data-cy="project-title"]').should('contain', projectName);
    });

    it('should create project with template', () => {
      const projectName = `Template Project ${Date.now()}`;
      
      cy.get('[data-cy="project-name-input"]').type(projectName);
      cy.get('[data-cy="project-template-selector"]').click();
      cy.get('[data-cy="template-event"]').click();
      
      cy.intercept('POST', '**/api/projects').as('createProject');
      
      cy.get('[data-cy="create-project-button"]').click();
      
      cy.wait('@createProject');
      
      // Vérifier que le projet a été créé avec le template
      cy.url().should('match', /\/app\/projects\/[a-zA-Z0-9]+$/);
      cy.get('[data-cy="project-template-badge"]').should('contain', 'Événement');
    });

    it('should handle creation errors', () => {
      cy.intercept('POST', '**/api/projects', { statusCode: 400, body: { error: 'Nom déjà utilisé' } });
      
      cy.get('[data-cy="project-name-input"]').type('Existing Project');
      cy.get('[data-cy="create-project-button"]').click();
      
      cy.get('[data-cy="creation-error"]').should('be.visible');
      cy.get('[data-cy="creation-error"]').should('contain', 'Nom déjà utilisé');
    });
  });

  describe('Project Details', () => {
    let projectId;

    beforeEach(() => {
      // Créer un projet de test ou utiliser un existant
      cy.createTestProject().then((id) => {
        projectId = id;
        cy.visit(`/app/projects/${projectId}`);
      });
    });

    it('should display project information', () => {
      cy.get('[data-cy="project-title"]').should('be.visible');
      cy.get('[data-cy="project-description"]').should('be.visible');
      cy.get('[data-cy="project-status"]').should('be.visible');
      cy.get('[data-cy="project-created-date"]').should('be.visible');
    });

    it('should display project tabs', () => {
      cy.get('[data-cy="project-tabs"]').should('be.visible');
      cy.get('[data-cy="tab-overview"]').should('be.visible');
      cy.get('[data-cy="tab-forms"]').should('be.visible');
      cy.get('[data-cy="tab-events"]').should('be.visible');
      cy.get('[data-cy="tab-teams"]').should('be.visible');
      cy.get('[data-cy="tab-settings"]').should('be.visible');
    });

    it('should navigate between tabs', () => {
      // Tab Forms
      cy.get('[data-cy="tab-forms"]').click();
      cy.get('[data-cy="forms-content"]').should('be.visible');
      
      // Tab Events
      cy.get('[data-cy="tab-events"]').click();
      cy.get('[data-cy="events-content"]').should('be.visible');
      
      // Tab Teams
      cy.get('[data-cy="tab-teams"]').click();
      cy.get('[data-cy="teams-content"]').should('be.visible');
      
      // Tab Settings
      cy.get('[data-cy="tab-settings"]').click();
      cy.get('[data-cy="settings-content"]').should('be.visible');
    });

    it('should edit project information', () => {
      cy.get('[data-cy="edit-project-button"]').click();
      
      const newName = `Updated Project ${Date.now()}`;
      cy.get('[data-cy="project-name-input"]').clear().type(newName);
      
      cy.intercept('PUT', `**/api/projects/${projectId}`).as('updateProject');
      
      cy.get('[data-cy="save-project-button"]').click();
      
      cy.wait('@updateProject');
      cy.get('[data-cy="project-title"]').should('contain', newName);
    });
  });

  describe('Project Teams', () => {
    let projectId;

    beforeEach(() => {
      cy.createTestProject().then((id) => {
        projectId = id;
        cy.visit(`/app/projects/${projectId}`);
        cy.get('[data-cy="tab-teams"]').click();
      });
    });

    it('should display teams management', () => {
      cy.get('[data-cy="teams-list"]').should('be.visible');
      cy.get('[data-cy="create-team-button"]').should('be.visible');
    });

    it('should create a new team', () => {
      cy.get('[data-cy="create-team-button"]').click();
      
      const teamName = `Test Team ${Date.now()}`;
      cy.get('[data-cy="team-name-input"]').type(teamName);
      cy.get('[data-cy="team-description-input"]').type('Description de l\'équipe');
      
      cy.intercept('POST', `**/api/projects/${projectId}/teams`).as('createTeam');
      
      cy.get('[data-cy="save-team-button"]').click();
      
      cy.wait('@createTeam');
      cy.get('[data-cy="team-item"]').should('contain', teamName);
    });

    it('should add members to team', () => {
      // Sélectionner une équipe existante ou créée
      cy.get('[data-cy="team-item"]').first().click();
      cy.get('[data-cy="add-member-button"]').click();
      
      cy.get('[data-cy="member-email-input"]').type('member@test.com');
      cy.get('[data-cy="member-role-select"]').select('Membre');
      
      cy.intercept('POST', '**/api/teams/*/members').as('addMember');
      
      cy.get('[data-cy="invite-member-button"]').click();
      
      cy.wait('@addMember');
      cy.get('[data-cy="member-list"]').should('contain', 'member@test.com');
    });
  });

  describe('Project Forms', () => {
    let projectId;

    beforeEach(() => {
      cy.createTestProject().then((id) => {
        projectId = id;
        cy.visit(`/app/projects/${projectId}`);
        cy.get('[data-cy="tab-forms"]').click();
      });
    });

    it('should display forms list', () => {
      cy.get('[data-cy="forms-list"]').should('be.visible');
      cy.get('[data-cy="create-form-button"]').should('be.visible');
    });

    it('should create a new form', () => {
      cy.get('[data-cy="create-form-button"]').click();
      
      // Devrait rediriger vers le form builder
      cy.url().should('include', '/form-builder');
      cy.get('[data-cy="form-builder"]').should('be.visible');
    });

    it('should edit existing form', () => {
      // Si il y a des formulaires existants
      cy.get('body').then(($body) => {
        if ($body.find('[data-cy="form-item"]').length > 0) {
          cy.get('[data-cy="form-item"]').first().within(() => {
            cy.get('[data-cy="edit-form-button"]').click();
          });
          
          cy.url().should('include', '/form-builder');
        }
      });
    });
  });

  describe('Project Events', () => {
    let projectId;

    beforeEach(() => {
      cy.createTestProject().then((id) => {
        projectId = id;
        cy.visit(`/app/projects/${projectId}`);
        cy.get('[data-cy="tab-events"]').click();
      });
    });

    it('should display events list', () => {
      cy.get('[data-cy="events-list"]').should('be.visible');
      cy.get('[data-cy="create-event-button"]').should('be.visible');
    });

    it('should create a new event', () => {
      cy.get('[data-cy="create-event-button"]').click();
      
      const eventTitle = `Test Event ${Date.now()}`;
      cy.get('[data-cy="event-title-input"]').type(eventTitle);
      cy.get('[data-cy="event-date-input"]').type('2024-12-31');
      cy.get('[data-cy="event-time-input"]').type('14:00');
      
      cy.intercept('POST', `**/api/projects/${projectId}/events`).as('createEvent');
      
      cy.get('[data-cy="save-event-button"]').click();
      
      cy.wait('@createEvent');
      cy.get('[data-cy="event-item"]').should('contain', eventTitle);
    });
  });

  describe('Project Settings', () => {
    let projectId;

    beforeEach(() => {
      cy.createTestProject().then((id) => {
        projectId = id;
        cy.visit(`/app/projects/${projectId}`);
        cy.get('[data-cy="tab-settings"]').click();
      });
    });

    it('should display project settings', () => {
      cy.get('[data-cy="project-settings"]').should('be.visible');
      cy.get('[data-cy="general-settings"]').should('be.visible');
      cy.get('[data-cy="permissions-settings"]').should('be.visible');
      cy.get('[data-cy="danger-zone"]').should('be.visible');
    });

    it('should update project settings', () => {
      cy.get('[data-cy="project-visibility-select"]').select('Privé');
      
      cy.intercept('PUT', `**/api/projects/${projectId}/settings`).as('updateSettings');
      
      cy.get('[data-cy="save-settings-button"]').click();
      
      cy.wait('@updateSettings');
      cy.get('[data-cy="settings-success"]').should('be.visible');
    });

    it('should delete project with confirmation', () => {
      cy.get('[data-cy="delete-project-button"]').click();
      
      // Vérifier la modal de confirmation
      cy.get('[data-cy="delete-confirmation-modal"]').should('be.visible');
      cy.get('[data-cy="delete-confirmation-input"]').type('SUPPRIMER');
      
      cy.intercept('DELETE', `**/api/projects/${projectId}`).as('deleteProject');
      
      cy.get('[data-cy="confirm-delete-button"]').click();
      
      cy.wait('@deleteProject');
      
      // Vérifier la redirection vers la liste des projets
      cy.url().should('include', '/app/projects');
      cy.get('[data-cy="delete-success"]').should('be.visible');
    });
  });

  describe('Project Permissions', () => {
    it('should restrict access based on user role', () => {
      // Test avec un utilisateur ayant des permissions limitées
      cy.loginAsRole('member');
      
      cy.visit('/app/projects');
      
      // Les membres ne devraient pas voir le bouton de création
      cy.get('[data-cy="create-project-button"]').should('not.exist');
    });

    it('should allow project owners full access', () => {
      cy.loginAsRole('owner');
      
      cy.visit('/app/projects');
      
      // Les propriétaires devraient voir tous les contrôles
      cy.get('[data-cy="create-project-button"]').should('be.visible');
    });
  });
});