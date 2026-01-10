describe('Form Builder - Tests de Performance', () => {
  beforeEach(() => {
    cy.login()
    cy.interceptFormAPI()
  })

  it('Devrait charger rapidement avec de nombreux champs', () => {
    cy.goToFormBuilder()
    
    const startTime = Date.now()
    
    // Créer un formulaire avec beaucoup de champs
    cy.get('[data-cy=form-title-input]').clear().type('Formulaire Performance Test')
    cy.createFormSection('Section Performance')
    
    // Ajouter 20 champs
    for (let i = 1; i <= 20; i++) {
      cy.addFormField('text', `Champ ${i}`)
    }
    
    // Vérifier que l\'interface reste responsive
    cy.get('[data-cy=field-list]').should('be.visible')
    cy.get('[data-cy=field-list] [data-cy=field-item]').should('have.length', 20)
    
    // Mesurer le temps de chargement de l\'aperçu
    cy.previewForm()
    cy.get('[data-cy=form-preview]').should('be.visible')
    
    const endTime = Date.now()
    const loadTime = endTime - startTime
    
    // Le chargement ne devrait pas prendre plus de 5 secondes
    expect(loadTime).to.be.lessThan(5000)
  })

  it('Devrait sauvegarder rapidement un formulaire complexe', () => {
    cy.goToFormBuilder()
    
    // Créer un formulaire complexe
    cy.get('[data-cy=form-title-input]').clear().type('Formulaire Complexe')
    
    // Créer plusieurs sections
    for (let i = 1; i <= 5; i++) {
      cy.createFormSection(`Section ${i}`)
      cy.addFormField('text', `Champ Text ${i}`)
      cy.addFormField('email', `Champ Email ${i}`)
      cy.addFormField('select', `Champ Select ${i}`)
    }
    
    // Mesurer le temps de sauvegarde
    const startTime = Date.now()
    cy.saveForm()
    cy.wait('@saveForm').then(() => {
      const endTime = Date.now()
      const saveTime = endTime - startTime
      
      // La sauvegarde ne devrait pas prendre plus de 3 secondes
      expect(saveTime).to.be.lessThan(3000)
    })
  })

  it('Devrait gérer les erreurs réseau gracieusement', () => {
    cy.goToFormBuilder()
    
    // Simuler une erreur réseau
    cy.intercept('POST', '**/registration-form', { forceNetworkError: true }).as('saveFormError')
    
    // Créer un formulaire simple
    cy.get('[data-cy=form-title-input]').clear().type('Test Erreur Réseau')
    cy.createFormSection('Test Section')
    cy.addFormField('text', 'Test Field')
    
    // Essayer de sauvegarder
    cy.get('[data-cy=save-form-button]').click()
    cy.wait('@saveFormError')
    
    // Vérifier le message d\'erreur
    cy.get('[data-cy=error-message]').should('be.visible')
    cy.get('[data-cy=error-message]').should('contain', 'Erreur de connexion')
    
    // Vérifier que l\'interface reste utilisable
    cy.get('[data-cy=form-title-input]').should('be.enabled')
    cy.get('[data-cy=save-form-button]').should('be.enabled')
  })
})