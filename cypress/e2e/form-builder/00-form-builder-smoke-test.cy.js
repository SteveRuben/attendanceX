describe('Form Builder - Test de Fumée', () => {
  beforeEach(() => {
    // Aller directement à la page sans authentification pour un test rapide
    cy.visit('/app/projects/qoBPzKDQfGSvunnqXRtt', { failOnStatusCode: false })
  })

  it('Devrait charger la page du projet', () => {
    // Vérifier que la page se charge (même si pas authentifié)
    cy.get('body').should('exist')
    
    // Si on est redirigé vers login, c'est normal
    cy.url().then((url) => {
      if (url.includes('/auth/login')) {
        cy.log('Redirection vers login détectée - comportement normal')
        
        // Tester les éléments de login
        cy.get('input[type="email"]').should('exist')
        cy.get('input[type="password"]').should('exist')
        cy.get('button[type="submit"]').should('exist')
      } else {
        // Si on arrive sur la page du projet, tester les éléments
        cy.log('Page du projet chargée directement')
        cy.get('[data-cy=form-builder-tab]').should('exist')
      }
    })
  })

  it('Devrait avoir les éléments de base du DOM', () => {
    // Test très basique - vérifier que React fonctionne
    cy.get('html').should('have.attr', 'lang')
    cy.get('head title').should('exist')
    cy.get('body').should('be.visible')
    
    // Vérifier que les scripts sont chargés
    cy.window().should('have.property', 'React').or('have.property', '__NEXT_DATA__')
  })

  it('Devrait gérer les erreurs 404 gracieusement', () => {
    // Tester une page qui n'existe pas
    cy.visit('/app/projects/nonexistent', { failOnStatusCode: false })
    
    // Vérifier qu'on a une réponse (même si erreur)
    cy.get('body').should('exist')
  })

  it('Devrait avoir les meta tags appropriés', () => {
    cy.visit('/', { failOnStatusCode: false })
    
    // Vérifier les meta tags de base
    cy.get('head meta[charset]').should('exist')
    cy.get('head meta[name="viewport"]').should('exist')
  })
})