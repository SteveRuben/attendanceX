// ***********************************************
// Custom Cypress Commands for AttendanceX
// ***********************************************

// Commande pour se connecter
Cypress.Commands.add('login', (email = 'test@test.com', password = '123Abc@cbA123') => {
  cy.session([email, password], () => {
    cy.visit('/auth/login')
    
    // Attendre que la page soit chargée
    cy.get('[data-cy=email-input]').should('be.visible')
    cy.get('[data-cy=password-input]').should('be.visible')
    
    // Saisir les identifiants
    cy.get('[data-cy=email-input]').clear().type(email)
    cy.get('[data-cy=password-input]').clear().type(password)
    
    // Cliquer sur le bouton de connexion
    cy.get('[data-cy=login-button]').click()
    
    // Attendre la redirection après connexion
    cy.url().should('include', '/app', { timeout: 15000 })
    
    // Vérifier que les données de session sont stockées
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.exist
      expect(win.localStorage.getItem('tenantId')).to.exist
    })
  })
})

// Commande pour aller au Form Builder
Cypress.Commands.add('goToFormBuilder', (projectId = Cypress.env('TEST_PROJECT_ID')) => {
  cy.visit(`/app/projects/${projectId}`)
  cy.get('[data-cy=form-builder-tab]').click()
  cy.url().should('include', '/app/projects/')
})

// Commande pour créer une section de formulaire
Cypress.Commands.add('createFormSection', (sectionName) => {
  cy.get('[data-cy=add-section-button]').click()
  cy.get('[data-cy=section-title-input]').clear().type(sectionName)
  cy.get('[data-cy=section-title-input]').should('have.value', sectionName)
})

// Commande pour ajouter un champ à une section
Cypress.Commands.add('addFormField', (fieldType, fieldLabel) => {
  cy.get('[data-cy=add-field-button]').first().click()
  cy.get(`[data-cy=field-type-${fieldType}]`).click()
  cy.get('[data-cy=field-label-input]').clear().type(fieldLabel)
  cy.get('[data-cy=field-label-input]').should('have.value', fieldLabel)
})

// Commande pour sauvegarder le formulaire
Cypress.Commands.add('saveForm', () => {
  cy.get('[data-cy=save-form-button]').click()
  cy.get('[data-cy=save-success-indicator]').should('be.visible')
})

// Commande pour publier le formulaire
Cypress.Commands.add('publishForm', () => {
  cy.get('[data-cy=publish-form-button]').click()
  cy.get('[data-cy=publish-success-indicator]').should('be.visible')
})

// Commande pour vérifier l'aperçu du formulaire
Cypress.Commands.add('previewForm', () => {
  cy.get('[data-cy=preview-tab]').click()
  cy.get('[data-cy=form-preview]').should('be.visible')
})

// Commande pour attendre le chargement
Cypress.Commands.add('waitForLoad', () => {
  cy.get('[data-cy=loading-spinner]').should('not.exist')
})

// Commande pour intercepter les appels API
Cypress.Commands.add('interceptFormAPI', () => {
  cy.intercept('POST', '**/registration-form', { fixture: 'form-save-response.json' }).as('saveForm')
  cy.intercept('PUT', '**/registration-form', { fixture: 'form-update-response.json' }).as('updateForm')
  cy.intercept('GET', '**/registration-form', { fixture: 'form-get-response.json' }).as('getForm')
})

// Commande pour vérifier les éléments de l'interface
Cypress.Commands.add('checkFormBuilderUI', () => {
  cy.get('[data-cy=form-title-input]').should('be.visible')
  cy.get('[data-cy=add-section-button]').should('be.visible')
  cy.get('[data-cy=save-form-button]').should('be.visible')
  cy.get('[data-cy=preview-tab]').should('be.visible')
})

// ***********************************************
// Commandes étendues pour les tests complets
// ***********************************************

// Connexion avec rôle spécifique
Cypress.Commands.add('loginAsRole', (role) => {
  const credentials = {
    owner: { email: 'owner@test.com', password: '123Abc@cbA123' },
    admin: { email: 'admin@test.com', password: '123Abc@cbA123' },
    organizer: { email: 'organizer@test.com', password: '123Abc@cbA123' },
    member: { email: 'member@test.com', password: '123Abc@cbA123' }
  };

  const cred = credentials[role] || credentials.member;
  cy.login(cred.email, cred.password);
});

// Créer un projet de test
Cypress.Commands.add('createTestProject', (projectData = {}) => {
  const defaultData = {
    name: `Test Project ${Date.now()}`,
    description: 'Projet créé automatiquement pour les tests',
    template: 'basic'
  };

  const data = { ...defaultData, ...projectData };

  return cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/projects`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
    },
    body: data
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body.data.id;
  });
});

// Créer un événement de test
Cypress.Commands.add('createTestEvent', (eventData = {}) => {
  const defaultData = {
    title: `Test Event ${Date.now()}`,
    description: 'Événement créé automatiquement pour les tests',
    date: '2024-12-31',
    time: '14:00',
    location: 'Salle de test'
  };

  const data = { ...defaultData, ...eventData };

  return cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/events`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
    },
    body: data
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body.data.id;
  });
});

// Créer une organisation de test
Cypress.Commands.add('createTestOrganization', (orgData = {}) => {
  const defaultData = {
    name: `Test Organization ${Date.now()}`,
    displayName: 'Test Organization Display',
    subdomain: `test-org-${Date.now()}`,
    description: 'Organisation créée automatiquement pour les tests'
  };

  const data = { ...defaultData, ...orgData };

  return cy.request({
    method: 'POST',
    url: `${Cypress.env('API_URL')}/organizations`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
    },
    body: data
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body.data.id;
  });
});

// Vérifier qu'une notification toast apparaît
Cypress.Commands.add('checkToast', (message, type = 'success') => {
  cy.get('[data-cy="toast"]').should('be.visible');
  if (message) {
    cy.get('[data-cy="toast"]').should('contain', message);
  }
  if (type) {
    cy.get('[data-cy="toast"]').should('have.class', type);
  }
});

// Remplir un formulaire avec des données
Cypress.Commands.add('fillForm', (formData) => {
  Object.entries(formData).forEach(([field, value]) => {
    if (value !== null && value !== undefined) {
      cy.get(`[data-cy="${field}"]`).clear().type(value.toString());
    }
  });
});

// Vérifier le responsive design
Cypress.Commands.add('checkResponsive', () => {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1280, height: 720, name: 'desktop' }
  ];

  viewports.forEach(viewport => {
    cy.viewport(viewport.width, viewport.height);
    cy.get('body').should('be.visible');
  });
});

// Commande pour les tests de performance
Cypress.Commands.add('measurePerformance', (actionCallback) => {
  const startTime = Date.now();
  
  actionCallback();
  
  cy.then(() => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    cy.log(`Action completed in ${duration}ms`);
    expect(duration).to.be.lessThan(3000);
  });
});

// Support pour les fichiers uploadés
// import 'cypress-file-upload';