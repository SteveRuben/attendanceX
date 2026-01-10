describe('Form Builder - Tests Avancés', () => {
  beforeEach(() => {
    cy.login()
    cy.interceptFormAPI()
  })

  it('Devrait permettre de configurer les propriétés des champs', () => {
    cy.goToFormBuilder()
    
    // Créer une section et un champ
    cy.createFormSection('Configuration Test')
    cy.addFormField('text', 'Champ Configurable')
    
    // Sélectionner le champ pour le configurer
    cy.get('[data-cy=field-item]').first().click()
    
    // Configurer les propriétés
    cy.get('[data-cy=field-required-checkbox]').check()
    cy.get('[data-cy=field-placeholder-input]').type('Entrez votre texte ici')
    cy.get('[data-cy=field-help-text-input]').type('Texte d\'aide pour ce champ')
    
    // Vérifier dans l\'aperçu
    cy.previewForm()
    cy.get('[data-cy=form-preview]').should('contain', 'Entrez votre texte ici')
    cy.get('[data-cy=form-preview]').should('contain', 'Texte d\'aide pour ce champ')
  })

  it('Devrait permettre de réorganiser les champs par drag & drop', () => {
    cy.goToFormBuilder()
    
    // Créer une section avec plusieurs champs
    cy.createFormSection('Réorganisation Test')
    cy.addFormField('text', 'Premier Champ')
    cy.addFormField('email', 'Deuxième Champ')
    cy.addFormField('phone', 'Troisième Champ')
    
    // Vérifier l\'ordre initial
    cy.get('[data-cy=field-list] [data-cy=field-item]').first().should('contain', 'Premier Champ')
    
    // Drag & drop (simulé avec des clics)
    cy.get('[data-cy=field-move-up]').eq(2).click() // Monter le troisième champ
    cy.get('[data-cy=field-move-up]').eq(1).click() // Le monter encore
    
    // Vérifier le nouvel ordre
    cy.get('[data-cy=field-list] [data-cy=field-item]').first().should('contain', 'Troisième Champ')
  })

  it('Devrait permettre de configurer le design du formulaire', () => {
    cy.goToFormBuilder()
    
    // Aller dans l\'onglet Design
    cy.get('[data-cy=design-tab]').click()
    
    // Configurer le header
    cy.get('[data-cy=header-title-input]').clear().type('Titre Personnalisé')
    cy.get('[data-cy=header-description-input]').clear().type('Description personnalisée')
    cy.get('[data-cy=header-background-color]').click()
    cy.get('[data-cy=color-picker-blue]').click()
    
    // Configurer le footer
    cy.get('[data-cy=footer-content-input]').clear().type('Pied de page personnalisé')
    cy.get('[data-cy=footer-show-powered-by]').uncheck()
    
    // Vérifier dans l\'aperçu
    cy.previewForm()
    cy.get('[data-cy=form-preview-header]').should('contain', 'Titre Personnalisé')
    cy.get('[data-cy=form-preview-header]').should('contain', 'Description personnalisée')
    cy.get('[data-cy=form-preview-footer]').should('contain', 'Pied de page personnalisé')
  })

  it('Devrait permettre de publier le formulaire', () => {
    cy.goToFormBuilder()
    
    // Créer un formulaire complet
    cy.get('[data-cy=form-title-input]').clear().type('Formulaire à Publier')
    cy.createFormSection('Section Publication')
    cy.addFormField('text', 'Nom')
    cy.addFormField('email', 'Email')
    
    // Publier le formulaire
    cy.publishForm()
    cy.wait('@updateForm')
    
    // Vérifier les liens de publication
    cy.get('[data-cy=publication-tab]').click()
    cy.get('[data-cy=publication-links]').should('be.visible')
    cy.get('[data-cy=public-form-link]').should('contain', 'http')
  })

  it('Devrait valider les champs requis', () => {
    cy.goToFormBuilder()
    
    // Essayer de sauvegarder un formulaire vide
    cy.get('[data-cy=save-form-button]').click()
    
    // Vérifier les messages d\'erreur
    cy.get('[data-cy=validation-error]').should('be.visible')
    cy.get('[data-cy=validation-error]').should('contain', 'Le titre du formulaire est requis')
    
    // Corriger et ressayer
    cy.get('[data-cy=form-title-input]').type('Formulaire Valide')
    cy.createFormSection('Section Valide')
    cy.addFormField('text', 'Champ Valide')
    
    cy.saveForm()
    cy.get('[data-cy=validation-error]').should('not.exist')
  })
})