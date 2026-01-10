describe('Form Builder - Tests de Base', () => {
  beforeEach(() => {
    // Se connecter avant chaque test
    cy.login()
    cy.interceptFormAPI()
  })

  it('Devrait charger l\'interface du Form Builder', () => {
    cy.goToFormBuilder()
    cy.checkFormBuilderUI()
    
    // Vérifier que les onglets sont présents
    cy.get('[data-cy=builder-tab]').should('be.visible')
    cy.get('[data-cy=design-tab]').should('be.visible')
    cy.get('[data-cy=preview-tab]').should('be.visible')
    cy.get('[data-cy=publication-tab]').should('be.visible')
  })

  it('Devrait permettre de modifier le titre du formulaire', () => {
    cy.goToFormBuilder()
    
    const newTitle = 'Mon Formulaire de Test Cypress'
    cy.get('[data-cy=form-title-input]').clear().type(newTitle)
    cy.get('[data-cy=form-title-input]').should('have.value', newTitle)
    
    // Vérifier que le titre est mis à jour dans l\'aperçu
    cy.previewForm()
    cy.get('[data-cy=form-preview-title]').should('contain', newTitle)
  })

  it('Devrait créer une nouvelle section', () => {
    cy.goToFormBuilder()
    
    const sectionName = 'Informations Personnelles'
    cy.createFormSection(sectionName)
    
    // Vérifier que la section apparaît dans la liste
    cy.get('[data-cy=section-list]').should('contain', sectionName)
  })

  it('Devrait ajouter des champs à une section', () => {
    cy.goToFormBuilder()
    
    // Créer une section d\'abord
    cy.createFormSection('Test Section')
    
    // Ajouter différents types de champs
    cy.addFormField('text', 'Nom complet')
    cy.addFormField('email', 'Adresse email')
    cy.addFormField('phone', 'Numéro de téléphone')
    
    // Vérifier que les champs sont visibles
    cy.get('[data-cy=field-list]').should('contain', 'Nom complet')
    cy.get('[data-cy=field-list]').should('contain', 'Adresse email')
    cy.get('[data-cy=field-list]').should('contain', 'Numéro de téléphone')
  })

  it('Devrait sauvegarder le formulaire', () => {
    cy.goToFormBuilder()
    
    // Créer un formulaire simple
    cy.get('[data-cy=form-title-input]').clear().type('Formulaire Test Sauvegarde')
    cy.createFormSection('Section Test')
    cy.addFormField('text', 'Champ Test')
    
    // Sauvegarder
    cy.saveForm()
    cy.wait('@saveForm')
    
    // Vérifier le message de succès
    cy.get('[data-cy=save-success-message]').should('be.visible')
  })
})