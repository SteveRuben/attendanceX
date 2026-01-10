describe('Form Builder - Tests d\'Aperçu', () => {
  beforeEach(() => {
    cy.login()
    cy.interceptFormAPI()
  })

  it('Devrait afficher l\'aperçu du formulaire correctement', () => {
    cy.goToFormBuilder()
    
    // Créer un formulaire avec différents types de champs
    cy.get('[data-cy=form-title-input]').clear().type('Formulaire Aperçu Test')
    cy.createFormSection('Informations Personnelles')
    
    // Ajouter différents types de champs
    cy.addFormField('text', 'Nom complet')
    cy.addFormField('email', 'Adresse email')
    cy.addFormField('select', 'Pays')
    cy.addFormField('textarea', 'Message')
    cy.addFormField('checkbox', 'J\'accepte les conditions')
    
    // Aller dans l\'aperçu
    cy.previewForm()
    
    // Vérifier que tous les champs sont présents
    cy.get('[data-cy=form-preview]').within(() => {
      cy.get('input[type="text"]').should('exist')
      cy.get('input[type="email"]').should('exist')
      cy.get('select').should('exist')
      cy.get('textarea').should('exist')
      cy.get('input[type="checkbox"]').should('exist')
    })
  })

  it('Devrait permettre de tester la soumission du formulaire', () => {
    cy.goToFormBuilder()
    
    // Créer un formulaire simple
    cy.get('[data-cy=form-title-input]').clear().type('Test Soumission')
    cy.createFormSection('Test Section')
    cy.addFormField('text', 'Nom')
    cy.addFormField('email', 'Email')
    
    // Aller dans l\'aperçu
    cy.previewForm()
    
    // Remplir le formulaire
    cy.get('[data-cy=form-preview]').within(() => {
      cy.get('input[type="text"]').type('John Doe')
      cy.get('input[type="email"]').type('john@example.com')
      
      // Soumettre le formulaire
      cy.get('[data-cy=submit-button]').click()
    })
    
    // Vérifier le message de succès
    cy.get('[data-cy=success-message]').should('be.visible')
    cy.get('[data-cy=success-message]').should('contain', 'Merci pour votre inscription')
  })

  it('Devrait valider les champs requis dans l\'aperçu', () => {
    cy.goToFormBuilder()
    
    // Créer un formulaire avec des champs requis
    cy.get('[data-cy=form-title-input]').clear().type('Test Validation')
    cy.createFormSection('Validation Section')
    cy.addFormField('text', 'Nom Requis')
    
    // Marquer le champ comme requis
    cy.get('[data-cy=field-item]').first().click()
    cy.get('[data-cy=field-required-checkbox]').check()
    
    // Aller dans l\'aperçu
    cy.previewForm()
    
    // Essayer de soumettre sans remplir
    cy.get('[data-cy=form-preview]').within(() => {
      cy.get('[data-cy=submit-button]').click()
    })
    
    // Vérifier les messages d\'erreur
    cy.get('[data-cy=field-error]').should('be.visible')
    cy.get('[data-cy=field-error]').should('contain', 'Ce champ est obligatoire')
  })

  it('Devrait ouvrir l\'aperçu dans un nouvel onglet', () => {
    cy.goToFormBuilder()
    
    // Créer un formulaire simple
    cy.get('[data-cy=form-title-input]').clear().type('Test Nouvel Onglet')
    cy.createFormSection('Test Section')
    cy.addFormField('text', 'Test Field')
    
    // Cliquer sur "Nouvel onglet"
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen')
    })
    
    cy.get('[data-cy=preview-new-tab-button]').click()
    cy.get('@windowOpen').should('have.been.called')
  })

  it('Devrait afficher le design personnalisé dans l\'aperçu', () => {
    cy.goToFormBuilder()
    
    // Configurer le design
    cy.get('[data-cy=design-tab]').click()
    cy.get('[data-cy=header-title-input]').clear().type('Titre Design Test')
    cy.get('[data-cy=header-background-color]').click()
    cy.get('[data-cy=color-picker-green]').click()
    
    // Créer du contenu
    cy.get('[data-cy=builder-tab]').click()
    cy.get('[data-cy=form-title-input]').clear().type('Formulaire Design')
    cy.createFormSection('Section Design')
    cy.addFormField('text', 'Champ Design')
    
    // Vérifier l\'aperçu
    cy.previewForm()
    cy.get('[data-cy=form-preview-header]').should('contain', 'Titre Design Test')
    cy.get('[data-cy=form-preview-header]').should('have.css', 'background-color')
  })
})