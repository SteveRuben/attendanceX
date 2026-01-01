// Tests complets de gestion d'organisation
describe('Organization Management', () => {
  beforeEach(() => {
    cy.login();
  });

  describe('Organization Settings Navigation', () => {
    beforeEach(() => {
      cy.visit('/app/organization/settings');
    });

    it('should display organization settings page', () => {
      cy.get('[data-cy="organization-settings"]').should('be.visible');
      cy.get('[data-cy="settings-tabs"]').should('be.visible');
      
      // Vérifier tous les onglets
      cy.get('[data-cy="tab-general"]').should('be.visible');
      cy.get('[data-cy="tab-domain"]').should('be.visible');
      cy.get('[data-cy="tab-branding"]').should('be.visible');
      cy.get('[data-cy="tab-smtp"]').should('be.visible');
      cy.get('[data-cy="tab-sms"]').should('be.visible');
      cy.get('[data-cy="tab-security"]').should('be.visible');
    });

    it('should navigate between settings tabs', () => {
      // Tab Général (par défaut)
      cy.get('[data-cy="general-settings"]').should('be.visible');
      
      // Tab Domaines
      cy.get('[data-cy="tab-domain"]').click();
      cy.get('[data-cy="domain-settings"]').should('be.visible');
      
      // Tab Branding
      cy.get('[data-cy="tab-branding"]').click();
      cy.get('[data-cy="branding-settings"]').should('be.visible');
      
      // Tab SMTP
      cy.get('[data-cy="tab-smtp"]').click();
      cy.get('[data-cy="smtp-settings"]').should('be.visible');
      
      // Tab SMS
      cy.get('[data-cy="tab-sms"]').click();
      cy.get('[data-cy="sms-settings"]').should('be.visible');
      
      // Tab Sécurité
      cy.get('[data-cy="tab-security"]').click();
      cy.get('[data-cy="security-settings"]').should('be.visible');
    });
  });

  describe('General Settings', () => {
    beforeEach(() => {
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-general"]').click();
    });

    it('should display organization information', () => {
      cy.get('[data-cy="org-name-input"]').should('be.visible');
      cy.get('[data-cy="org-display-name-input"]').should('be.visible');
      cy.get('[data-cy="org-description-input"]').should('be.visible');
      cy.get('[data-cy="org-website-input"]').should('be.visible');
      cy.get('[data-cy="timezone-selector"]').should('be.visible');
      cy.get('[data-cy="locale-selector"]').should('be.visible');
      cy.get('[data-cy="currency-selector"]').should('be.visible');
    });

    it('should update organization basic information', () => {
      const newName = `Updated Org ${Date.now()}`;
      
      cy.get('[data-cy="org-name-input"]').clear().type(newName);
      cy.get('[data-cy="org-description-input"]').clear().type('Description mise à jour');
      
      cy.intercept('PUT', '**/api/organizations/*/settings').as('updateOrgSettings');
      
      cy.get('[data-cy="save-general-settings"]').click();
      
      cy.wait('@updateOrgSettings');
      cy.get('[data-cy="save-success"]').should('be.visible');
    });

    it('should update regional settings', () => {
      cy.get('[data-cy="timezone-selector"]').click();
      cy.get('[data-cy="timezone-option-america-new-york"]').click();
      
      cy.get('[data-cy="locale-selector"]').select('en-US');
      cy.get('[data-cy="currency-selector"]').select('USD');
      
      cy.intercept('PUT', '**/api/organizations/*/settings').as('updateRegionalSettings');
      
      cy.get('[data-cy="save-general-settings"]').click();
      
      cy.wait('@updateRegionalSettings');
      cy.get('[data-cy="save-success"]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.get('[data-cy="org-name-input"]').clear();
      cy.get('[data-cy="save-general-settings"]').click();
      
      cy.get('[data-cy="name-error"]').should('be.visible');
      cy.get('[data-cy="name-error"]').should('contain', 'requis');
    });
  });

  describe('Domain Settings', () => {
    beforeEach(() => {
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-domain"]').click();
    });

    it('should display domain configuration', () => {
      cy.get('[data-cy="subdomain-display"]').should('be.visible');
      cy.get('[data-cy="custom-domain-input"]').should('be.visible');
      cy.get('[data-cy="dns-configuration"]').should('be.visible');
    });

    it('should show current subdomain', () => {
      cy.get('[data-cy="subdomain-display"]').should('contain', '.attendancex.com');
      cy.get('[data-cy="copy-subdomain"]').should('be.visible');
    });

    it('should configure custom domain', () => {
      const customDomain = 'forms.monentreprise.com';
      
      cy.get('[data-cy="custom-domain-input"]').type(customDomain);
      
      cy.intercept('PUT', '**/api/organizations/*/domain').as('updateDomain');
      
      cy.get('[data-cy="save-domain-button"]').click();
      
      cy.wait('@updateDomain');
      
      // Vérifier que les instructions DNS apparaissent
      cy.get('[data-cy="dns-instructions"]').should('be.visible');
      cy.get('[data-cy="dns-records"]').should('be.visible');
    });

    it('should display DNS records for custom domain', () => {
      // Supposer qu'un domaine personnalisé est configuré
      cy.get('[data-cy="custom-domain-input"]').type('forms.test.com');
      cy.get('[data-cy="save-domain-button"]').click();
      
      // Vérifier les enregistrements DNS
      cy.get('[data-cy="dns-record-cname"]').should('be.visible');
      cy.get('[data-cy="dns-record-txt"]').should('be.visible');
      
      // Tester la copie des valeurs DNS
      cy.get('[data-cy="copy-cname-value"]').click();
      cy.get('[data-cy="copy-success"]').should('be.visible');
    });

    it('should verify domain configuration', () => {
      cy.get('[data-cy="verify-domain-button"]').click();
      
      cy.intercept('POST', '**/api/organizations/*/verify-domain').as('verifyDomain');
      
      cy.wait('@verifyDomain');
      
      // Vérifier le statut de vérification
      cy.get('[data-cy="verification-status"]').should('be.visible');
    });

    it('should validate domain format', () => {
      cy.get('[data-cy="custom-domain-input"]').type('invalid-domain');
      cy.get('[data-cy="save-domain-button"]').click();
      
      cy.get('[data-cy="domain-error"]').should('be.visible');
      cy.get('[data-cy="domain-error"]').should('contain', 'format invalide');
    });
  });

  describe('Branding Settings', () => {
    beforeEach(() => {
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-branding"]').click();
    });

    it('should display branding options', () => {
      cy.get('[data-cy="color-palette"]').should('be.visible');
      cy.get('[data-cy="font-selection"]').should('be.visible');
      cy.get('[data-cy="logo-upload"]').should('be.visible');
      cy.get('[data-cy="branding-preview"]').should('be.visible');
    });

    it('should update brand colors', () => {
      // Changer la couleur primaire
      cy.get('[data-cy="primary-color-picker"]').click();
      cy.get('[data-cy="color-input"]').clear().type('#ff0000');
      cy.get('[data-cy="color-apply"]').click();
      
      // Vérifier l'aperçu
      cy.get('[data-cy="branding-preview"]').should('have.css', 'color', 'rgb(255, 0, 0)');
      
      cy.intercept('PUT', '**/api/organizations/*/branding').as('updateBranding');
      
      cy.get('[data-cy="save-branding"]').click();
      
      cy.wait('@updateBranding');
      cy.get('[data-cy="branding-success"]').should('be.visible');
    });

    it('should upload logo', () => {
      // Simuler l'upload d'un fichier
      cy.fixture('test-logo.png').then(fileContent => {
        cy.get('[data-cy="logo-upload-input"]').attachFile({
          fileContent: fileContent.toString(),
          fileName: 'test-logo.png',
          mimeType: 'image/png'
        });
      });
      
      cy.get('[data-cy="logo-preview"]').should('be.visible');
      
      cy.intercept('POST', '**/api/organizations/*/upload-logo').as('uploadLogo');
      
      cy.get('[data-cy="save-branding"]').click();
      
      cy.wait('@uploadLogo');
      cy.get('[data-cy="logo-success"]').should('be.visible');
    });

    it('should update fonts', () => {
      cy.get('[data-cy="primary-font-select"]').select('Roboto');
      cy.get('[data-cy="secondary-font-select"]').select('Open Sans');
      
      // Vérifier l'aperçu
      cy.get('[data-cy="font-preview"]').should('have.css', 'font-family').and('include', 'Roboto');
      
      cy.intercept('PUT', '**/api/organizations/*/branding').as('updateFonts');
      
      cy.get('[data-cy="save-branding"]').click();
      
      cy.wait('@updateFonts');
      cy.get('[data-cy="fonts-success"]').should('be.visible');
    });

    it('should validate color formats', () => {
      cy.get('[data-cy="primary-color-picker"]').click();
      cy.get('[data-cy="color-input"]').clear().type('invalid-color');
      
      cy.get('[data-cy="color-error"]').should('be.visible');
      cy.get('[data-cy="color-error"]').should('contain', 'format invalide');
    });
  });

  describe('SMTP Settings', () => {
    beforeEach(() => {
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-smtp"]').click();
    });

    it('should display SMTP configuration', () => {
      cy.get('[data-cy="smtp-enabled-toggle"]').should('be.visible');
      cy.get('[data-cy="smtp-presets"]').should('be.visible');
    });

    it('should enable SMTP configuration', () => {
      cy.get('[data-cy="smtp-enabled-toggle"]').click();
      
      // Vérifier que les champs de configuration apparaissent
      cy.get('[data-cy="smtp-host-input"]').should('be.visible');
      cy.get('[data-cy="smtp-port-input"]').should('be.visible');
      cy.get('[data-cy="smtp-username-input"]').should('be.visible');
      cy.get('[data-cy="smtp-password-input"]').should('be.visible');
    });

    it('should use Gmail preset', () => {
      cy.get('[data-cy="smtp-enabled-toggle"]').click();
      cy.get('[data-cy="preset-gmail"]').click();
      
      // Vérifier que les champs sont pré-remplis
      cy.get('[data-cy="smtp-host-input"]').should('have.value', 'smtp.gmail.com');
      cy.get('[data-cy="smtp-port-input"]').should('have.value', '587');
    });

    it('should configure SMTP manually', () => {
      cy.get('[data-cy="smtp-enabled-toggle"]').click();
      
      cy.get('[data-cy="smtp-host-input"]').type('smtp.monserveur.com');
      cy.get('[data-cy="smtp-port-input"]').type('587');
      cy.get('[data-cy="smtp-username-input"]').type('user@monserveur.com');
      cy.get('[data-cy="smtp-password-input"]').type('motdepasse123');
      cy.get('[data-cy="smtp-from-name-input"]').type('Mon Organisation');
      cy.get('[data-cy="smtp-from-email-input"]').type('noreply@monserveur.com');
      
      cy.intercept('PUT', '**/api/organizations/*/smtp').as('updateSmtp');
      
      cy.get('[data-cy="save-smtp-settings"]').click();
      
      cy.wait('@updateSmtp');
      cy.get('[data-cy="smtp-success"]').should('be.visible');
    });

    it('should test SMTP connection', () => {
      cy.get('[data-cy="smtp-enabled-toggle"]').click();
      
      // Configurer SMTP
      cy.get('[data-cy="smtp-host-input"]').type('smtp.gmail.com');
      cy.get('[data-cy="smtp-port-input"]').type('587');
      cy.get('[data-cy="smtp-username-input"]').type('test@gmail.com');
      cy.get('[data-cy="smtp-password-input"]').type('password');
      
      cy.intercept('POST', '**/api/organizations/*/test-smtp').as('testSmtp');
      
      cy.get('[data-cy="test-smtp-button"]').click();
      
      cy.wait('@testSmtp');
      cy.get('[data-cy="smtp-test-result"]').should('be.visible');
    });

    it('should validate SMTP fields', () => {
      cy.get('[data-cy="smtp-enabled-toggle"]').click();
      cy.get('[data-cy="save-smtp-settings"]').click();
      
      cy.get('[data-cy="smtp-host-error"]').should('be.visible');
      cy.get('[data-cy="smtp-username-error"]').should('be.visible');
    });
  });

  describe('SMS Settings', () => {
    beforeEach(() => {
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-sms"]').click();
    });

    it('should display SMS configuration', () => {
      cy.get('[data-cy="sms-enabled-toggle"]').should('be.visible');
      cy.get('[data-cy="sms-provider-select"]').should('be.visible');
    });

    it('should configure Twilio SMS', () => {
      cy.get('[data-cy="sms-enabled-toggle"]').click();
      cy.get('[data-cy="sms-provider-select"]').select('twilio');
      
      // Vérifier que les champs Twilio apparaissent
      cy.get('[data-cy="twilio-account-sid"]').should('be.visible');
      cy.get('[data-cy="twilio-auth-token"]').should('be.visible');
      cy.get('[data-cy="twilio-from-number"]').should('be.visible');
      
      // Configurer Twilio
      cy.get('[data-cy="twilio-account-sid"]').type('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
      cy.get('[data-cy="twilio-auth-token"]').type('auth_token_123');
      cy.get('[data-cy="twilio-from-number"]').type('+33123456789');
      
      cy.intercept('PUT', '**/api/organizations/*/sms').as('updateSms');
      
      cy.get('[data-cy="save-sms-settings"]').click();
      
      cy.wait('@updateSms');
      cy.get('[data-cy="sms-success"]').should('be.visible');
    });

    it('should configure AWS SNS', () => {
      cy.get('[data-cy="sms-enabled-toggle"]').click();
      cy.get('[data-cy="sms-provider-select"]').select('aws-sns');
      
      // Vérifier que les champs AWS apparaissent
      cy.get('[data-cy="aws-access-key"]').should('be.visible');
      cy.get('[data-cy="aws-secret-key"]').should('be.visible');
      cy.get('[data-cy="aws-region"]').should('be.visible');
    });

    it('should set SMS limits', () => {
      cy.get('[data-cy="sms-enabled-toggle"]').click();
      
      cy.get('[data-cy="daily-limit-input"]').clear().type('50');
      cy.get('[data-cy="monthly-limit-input"]').clear().type('500');
      
      cy.intercept('PUT', '**/api/organizations/*/sms').as('updateSmsLimits');
      
      cy.get('[data-cy="save-sms-settings"]').click();
      
      cy.wait('@updateSmsLimits');
      cy.get('[data-cy="sms-limits-success"]').should('be.visible');
    });

    it('should test SMS configuration', () => {
      cy.get('[data-cy="sms-enabled-toggle"]').click();
      cy.get('[data-cy="sms-provider-select"]').select('twilio');
      
      // Configurer les credentials
      cy.get('[data-cy="twilio-account-sid"]').type('test_sid');
      cy.get('[data-cy="twilio-auth-token"]').type('test_token');
      
      cy.intercept('POST', '**/api/organizations/*/test-sms').as('testSms');
      
      cy.get('[data-cy="test-sms-button"]').click();
      
      cy.wait('@testSms');
      cy.get('[data-cy="sms-test-result"]').should('be.visible');
    });
  });

  describe('Security Settings', () => {
    beforeEach(() => {
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-security"]').click();
    });

    it('should display security options', () => {
      cy.get('[data-cy="ssl-required-toggle"]').should('be.visible');
      cy.get('[data-cy="allowed-origins-input"]').should('be.visible');
      cy.get('[data-cy="rate-limiting-toggle"]').should('be.visible');
      cy.get('[data-cy="two-factor-toggle"]').should('be.visible');
    });

    it('should configure SSL requirements', () => {
      cy.get('[data-cy="ssl-required-toggle"]').click();
      
      cy.intercept('PUT', '**/api/organizations/*/security').as('updateSecurity');
      
      cy.get('[data-cy="save-security-settings"]').click();
      
      cy.wait('@updateSecurity');
      cy.get('[data-cy="security-success"]').should('be.visible');
    });

    it('should configure allowed origins', () => {
      const origins = 'https://monsite.com\nhttps://www.monsite.com';
      
      cy.get('[data-cy="allowed-origins-input"]').type(origins);
      
      cy.intercept('PUT', '**/api/organizations/*/security').as('updateOrigins');
      
      cy.get('[data-cy="save-security-settings"]').click();
      
      cy.wait('@updateOrigins');
      cy.get('[data-cy="origins-success"]').should('be.visible');
    });

    it('should configure rate limiting', () => {
      cy.get('[data-cy="rate-limiting-toggle"]').click();
      cy.get('[data-cy="requests-per-minute"]').clear().type('30');
      
      cy.intercept('PUT', '**/api/organizations/*/security').as('updateRateLimit');
      
      cy.get('[data-cy="save-security-settings"]').click();
      
      cy.wait('@updateRateLimit');
      cy.get('[data-cy="rate-limit-success"]').should('be.visible');
    });

    it('should configure two-factor authentication', () => {
      cy.get('[data-cy="two-factor-toggle"]').click();
      cy.get('[data-cy="two-factor-required-toggle"]').click();
      
      cy.intercept('PUT', '**/api/organizations/*/security').as('update2FA');
      
      cy.get('[data-cy="save-security-settings"]').click();
      
      cy.wait('@update2FA');
      cy.get('[data-cy="2fa-success"]').should('be.visible');
    });
  });

  describe('Organization Permissions', () => {
    it('should restrict access to organization settings for non-admins', () => {
      cy.loginAsRole('member');
      
      cy.visit('/app/organization/settings', { failOnStatusCode: false });
      
      // Devrait être redirigé ou voir un message d'erreur
      cy.get('[data-cy="access-denied"]').should('be.visible');
    });

    it('should allow full access for organization owners', () => {
      cy.loginAsRole('owner');
      
      cy.visit('/app/organization/settings');
      
      // Tous les onglets devraient être accessibles
      cy.get('[data-cy="tab-general"]').should('be.visible');
      cy.get('[data-cy="tab-domain"]').should('be.visible');
      cy.get('[data-cy="tab-branding"]').should('be.visible');
    });
  });

  describe('Integration with Form Builder', () => {
    it('should apply organization branding to forms', () => {
      // Configurer le branding
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-branding"]').click();
      
      cy.get('[data-cy="primary-color-picker"]').click();
      cy.get('[data-cy="color-input"]').clear().type('#ff0000');
      cy.get('[data-cy="color-apply"]').click();
      cy.get('[data-cy="save-branding"]').click();
      
      // Créer un formulaire et vérifier le branding
      cy.visit('/app/projects');
      cy.get('[data-cy="create-project-button"]').click();
      
      cy.get('[data-cy="project-name-input"]').type('Test Branding Project');
      cy.get('[data-cy="create-project-button"]').click();
      
      // Aller au form builder
      cy.get('[data-cy="tab-forms"]').click();
      cy.get('[data-cy="create-form-button"]').click();
      
      // Vérifier que le branding est appliqué
      cy.get('[data-cy="form-preview"]').should('have.css', 'color', 'rgb(255, 0, 0)');
    });

    it('should use custom domain for form URLs', () => {
      // Configurer un domaine personnalisé
      cy.visit('/app/organization/settings');
      cy.get('[data-cy="tab-domain"]').click();
      
      cy.get('[data-cy="custom-domain-input"]').type('forms.test.com');
      cy.get('[data-cy="save-domain-button"]').click();
      
      // Créer un formulaire et vérifier l'URL
      cy.visit('/app/projects');
      cy.createTestProject().then((projectId) => {
        cy.visit(`/app/projects/${projectId}`);
        cy.get('[data-cy="tab-forms"]').click();
        cy.get('[data-cy="create-form-button"]').click();
        
        // Publier le formulaire
        cy.get('[data-cy="publish-form-button"]').click();
        
        // Vérifier que l'URL utilise le domaine personnalisé
        cy.get('[data-cy="form-url"]').should('contain', 'forms.test.com');
      });
    });
  });
});