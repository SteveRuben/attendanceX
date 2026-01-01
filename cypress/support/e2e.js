// ***********************************************************
// Support file for Cypress E2E tests
// ***********************************************************

import './commands'

// Désactiver les erreurs d'exception non capturées pour éviter les faux positifs
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignorer certaines erreurs connues
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false
  }
  // Laisser passer les autres erreurs
  return true
})

// Configuration globale
beforeEach(() => {
  // Configurer le localStorage avec les données de test
  cy.window().then((win) => {
    win.localStorage.setItem('tenantId', Cypress.env('TEST_TENANT_ID'));
  });
})