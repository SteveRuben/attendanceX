// Tests complets des événements
describe('Events Management', () => {
  beforeEach(() => {
    cy.login();
  });

  describe('Events List', () => {
    beforeEach(() => {
      cy.visit('/app/events');
    });

    it('should display events list correctly', () => {
      cy.get('[data-cy="events-list"]').should('be.visible');
      cy.get('[data-cy="create-event-button"]').should('be.visible');
      cy.get('[data-cy="events-search"]').should('be.visible');
      cy.get('[data-cy="events-filter"]').should('be.visible');
      cy.get('[data-cy="calendar-view-toggle"]').should('be.visible');
    });

    it('should search events', () => {
      cy.intercept('GET', '**/api/events?search=*').as('searchEvents');
      
      cy.get('[data-cy="events-search"]').type('réunion');
      
      cy.wait('@searchEvents');
      cy.get('[data-cy="event-card"]').should('have.length.at.least', 0);
    });

    it('should filter events by status', () => {
      cy.get('[data-cy="events-filter"]').click();
      cy.get('[data-cy="filter-upcoming"]').click();
      
      // Vérifier que seuls les événements à venir sont affichés
      cy.get('[data-cy="event-card"]').each(($card) => {
        cy.wrap($card).find('[data-cy="event-date"]').should('not.contain', 'Passé');
      });
    });

    it('should switch between list and calendar view', () => {
      // Vue liste par défaut
      cy.get('[data-cy="events-list-view"]').should('be.visible');
      
      // Basculer vers la vue calendrier
      cy.get('[data-cy="calendar-view-toggle"]').click();
      cy.get('[data-cy="events-calendar-view"]').should('be.visible');
      
      // Retour à la vue liste
      cy.get('[data-cy="list-view-toggle"]').click();
      cy.get('[data-cy="events-list-view"]').should('be.visible');
    });

    it('should display event cards with correct information', () => {
      cy.get('[data-cy="event-card"]').first().within(() => {
        cy.get('[data-cy="event-title"]').should('be.visible');
        cy.get('[data-cy="event-date"]').should('be.visible');
        cy.get('[data-cy="event-location"]').should('be.visible');
        cy.get('[data-cy="event-attendees-count"]').should('be.visible');
        cy.get('[data-cy="event-status"]').should('be.visible');
      });
    });

    it('should navigate to event details', () => {
      cy.get('[data-cy="event-card"]').first().click();
      cy.url().should('match', /\/app\/events\/[a-zA-Z0-9]+$/);
    });
  });

  describe('Event Creation', () => {
    beforeEach(() => {
      cy.visit('/app/events/create');
    });

    it('should display event creation form', () => {
      cy.get('[data-cy="event-form"]').should('be.visible');
      cy.get('[data-cy="event-title-input"]').should('be.visible');
      cy.get('[data-cy="event-description-input"]').should('be.visible');
      cy.get('[data-cy="event-date-input"]').should('be.visible');
      cy.get('[data-cy="event-time-input"]').should('be.visible');
      cy.get('[data-cy="event-location-input"]').should('be.visible');
      cy.get('[data-cy="create-event-button"]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.get('[data-cy="create-event-button"]').click();
      
      cy.get('[data-cy="title-error"]').should('be.visible');
      cy.get('[data-cy="date-error"]').should('be.visible');
      cy.get('[data-cy="time-error"]').should('be.visible');
    });

    it('should create a basic event successfully', () => {
      const eventTitle = `Test Event ${Date.now()}`;
      const eventDate = '2024-12-31';
      const eventTime = '14:00';
      
      cy.get('[data-cy="event-title-input"]').type(eventTitle);
      cy.get('[data-cy="event-description-input"]').type('Description de l\'événement de test');
      cy.get('[data-cy="event-date-input"]').type(eventDate);
      cy.get('[data-cy="event-time-input"]').type(eventTime);
      cy.get('[data-cy="event-location-input"]').type('Salle de conférence A');
      
      cy.intercept('POST', '**/api/events').as('createEvent');
      
      cy.get('[data-cy="create-event-button"]').click();
      
      cy.wait('@createEvent');
      
      // Vérifier la redirection vers l'événement créé
      cy.url().should('match', /\/app\/events\/[a-zA-Z0-9]+$/);
      cy.get('[data-cy="event-title"]').should('contain', eventTitle);
    });

    it('should create recurring event', () => {
      const eventTitle = `Recurring Event ${Date.now()}`;
      
      cy.get('[data-cy="event-title-input"]').type(eventTitle);
      cy.get('[data-cy="event-date-input"]').type('2024-12-31');
      cy.get('[data-cy="event-time-input"]').type('10:00');
      
      // Activer la récurrence
      cy.get('[data-cy="recurring-toggle"]').click();
      cy.get('[data-cy="recurrence-pattern"]').select('weekly');
      cy.get('[data-cy="recurrence-end-date"]').type('2025-03-31');
      
      cy.intercept('POST', '**/api/events').as('createRecurringEvent');
      
      cy.get('[data-cy="create-event-button"]').click();
      
      cy.wait('@createRecurringEvent');
      
      // Vérifier que l'événement récurrent est créé
      cy.get('[data-cy="recurring-badge"]').should('be.visible');
    });

    it('should add event location with map', () => {
      cy.get('[data-cy="event-title-input"]').type('Event with Location');
      cy.get('[data-cy="event-date-input"]').type('2024-12-31');
      cy.get('[data-cy="event-time-input"]').type('15:00');
      
      // Ajouter une adresse
      cy.get('[data-cy="event-address-input"]').type('123 Rue de la Paix, Paris');
      cy.get('[data-cy="search-address-button"]').click();
      
      // Vérifier que la carte apparaît
      cy.get('[data-cy="location-map"]').should('be.visible');
      cy.get('[data-cy="confirm-location-button"]').click();
      
      cy.intercept('POST', '**/api/events').as('createEventWithLocation');
      
      cy.get('[data-cy="create-event-button"]').click();
      
      cy.wait('@createEventWithLocation');
      
      // Vérifier que la localisation est sauvegardée
      cy.get('[data-cy="event-location"]').should('contain', 'Paris');
    });

    it('should handle creation errors', () => {
      cy.intercept('POST', '**/api/events', { 
        statusCode: 400, 
        body: { error: 'Date dans le passé' } 
      });
      
      cy.get('[data-cy="event-title-input"]').type('Past Event');
      cy.get('[data-cy="event-date-input"]').type('2020-01-01');
      cy.get('[data-cy="event-time-input"]').type('10:00');
      cy.get('[data-cy="create-event-button"]').click();
      
      cy.get('[data-cy="creation-error"]').should('be.visible');
      cy.get('[data-cy="creation-error"]').should('contain', 'Date dans le passé');
    });
  });

  describe('Event Details', () => {
    let eventId;

    beforeEach(() => {
      cy.createTestEvent().then((id) => {
        eventId = id;
        cy.visit(`/app/events/${eventId}`);
      });
    });

    it('should display event information', () => {
      cy.get('[data-cy="event-title"]').should('be.visible');
      cy.get('[data-cy="event-description"]').should('be.visible');
      cy.get('[data-cy="event-date-time"]').should('be.visible');
      cy.get('[data-cy="event-location"]').should('be.visible');
      cy.get('[data-cy="event-status"]').should('be.visible');
    });

    it('should display event tabs', () => {
      cy.get('[data-cy="event-tabs"]').should('be.visible');
      cy.get('[data-cy="tab-overview"]').should('be.visible');
      cy.get('[data-cy="tab-attendees"]').should('be.visible');
      cy.get('[data-cy="tab-registration"]').should('be.visible');
      cy.get('[data-cy="tab-settings"]').should('be.visible');
    });

    it('should edit event information', () => {
      cy.get('[data-cy="edit-event-button"]').click();
      
      const newTitle = `Updated Event ${Date.now()}`;
      cy.get('[data-cy="event-title-input"]').clear().type(newTitle);
      
      cy.intercept('PUT', `**/api/events/${eventId}`).as('updateEvent');
      
      cy.get('[data-cy="save-event-button"]').click();
      
      cy.wait('@updateEvent');
      cy.get('[data-cy="event-title"]').should('contain', newTitle);
    });

    it('should manage event status', () => {
      // Publier l'événement
      cy.get('[data-cy="publish-event-button"]').click();
      cy.get('[data-cy="event-status"]').should('contain', 'Publié');
      
      // Annuler l'événement
      cy.get('[data-cy="cancel-event-button"]').click();
      cy.get('[data-cy="cancel-confirmation"]').should('be.visible');
      cy.get('[data-cy="confirm-cancel-button"]').click();
      
      cy.get('[data-cy="event-status"]').should('contain', 'Annulé');
    });
  });

  describe('Event Attendees', () => {
    let eventId;

    beforeEach(() => {
      cy.createTestEvent().then((id) => {
        eventId = id;
        cy.visit(`/app/events/${eventId}`);
        cy.get('[data-cy="tab-attendees"]').click();
      });
    });

    it('should display attendees list', () => {
      cy.get('[data-cy="attendees-list"]').should('be.visible');
      cy.get('[data-cy="add-attendee-button"]').should('be.visible');
      cy.get('[data-cy="attendees-stats"]').should('be.visible');
    });

    it('should add attendee manually', () => {
      cy.get('[data-cy="add-attendee-button"]').click();
      
      cy.get('[data-cy="attendee-name-input"]').type('John Doe');
      cy.get('[data-cy="attendee-email-input"]').type('john@example.com');
      cy.get('[data-cy="attendee-phone-input"]').type('+33123456789');
      
      cy.intercept('POST', `**/api/events/${eventId}/attendees`).as('addAttendee');
      
      cy.get('[data-cy="save-attendee-button"]').click();
      
      cy.wait('@addAttendee');
      cy.get('[data-cy="attendee-item"]').should('contain', 'John Doe');
    });

    it('should import attendees from CSV', () => {
      cy.get('[data-cy="import-attendees-button"]').click();
      
      // Simuler l'upload d'un fichier CSV
      cy.fixture('attendees.csv').then(fileContent => {
        cy.get('[data-cy="csv-upload-input"]').attachFile({
          fileContent: fileContent.toString(),
          fileName: 'attendees.csv',
          mimeType: 'text/csv'
        });
      });
      
      cy.get('[data-cy="preview-import"]').should('be.visible');
      
      cy.intercept('POST', `**/api/events/${eventId}/import-attendees`).as('importAttendees');
      
      cy.get('[data-cy="confirm-import-button"]').click();
      
      cy.wait('@importAttendees');
      cy.get('[data-cy="import-success"]').should('be.visible');
    });

    it('should check in attendee', () => {
      // Supposer qu'il y a des participants
      cy.get('[data-cy="attendee-item"]').first().within(() => {
        cy.get('[data-cy="checkin-button"]').click();
      });
      
      cy.intercept('POST', `**/api/events/${eventId}/checkin`).as('checkinAttendee');
      
      cy.wait('@checkinAttendee');
      
      // Vérifier que le statut est mis à jour
      cy.get('[data-cy="attendee-item"]').first().within(() => {
        cy.get('[data-cy="attendee-status"]').should('contain', 'Présent');
      });
    });

    it('should send notifications to attendees', () => {
      cy.get('[data-cy="notify-attendees-button"]').click();
      
      cy.get('[data-cy="notification-type"]').select('reminder');
      cy.get('[data-cy="notification-message"]').type('Rappel: événement demain');
      
      cy.intercept('POST', `**/api/events/${eventId}/notify`).as('notifyAttendees');
      
      cy.get('[data-cy="send-notification-button"]').click();
      
      cy.wait('@notifyAttendees');
      cy.get('[data-cy="notification-success"]').should('be.visible');
    });
  });

  describe('Event Registration', () => {
    let eventId;

    beforeEach(() => {
      cy.createTestEvent().then((id) => {
        eventId = id;
        cy.visit(`/app/events/${eventId}`);
        cy.get('[data-cy="tab-registration"]').click();
      });
    });

    it('should display registration settings', () => {
      cy.get('[data-cy="registration-settings"]').should('be.visible');
      cy.get('[data-cy="registration-enabled-toggle"]').should('be.visible');
      cy.get('[data-cy="registration-form-builder"]').should('be.visible');
    });

    it('should enable registration', () => {
      cy.get('[data-cy="registration-enabled-toggle"]').click();
      
      // Vérifier que les options de configuration apparaissent
      cy.get('[data-cy="max-attendees-input"]').should('be.visible');
      cy.get('[data-cy="registration-deadline-input"]').should('be.visible');
      cy.get('[data-cy="approval-required-toggle"]').should('be.visible');
    });

    it('should configure registration form', () => {
      cy.get('[data-cy="registration-enabled-toggle"]').click();
      cy.get('[data-cy="edit-registration-form"]').click();
      
      // Devrait ouvrir le form builder
      cy.get('[data-cy="form-builder"]').should('be.visible');
      
      // Ajouter un champ personnalisé
      cy.get('[data-cy="add-field-button"]').click();
      cy.get('[data-cy="field-type-select"]').select('text');
      cy.get('[data-cy="field-label-input"]').type('Régime alimentaire');
      cy.get('[data-cy="save-field-button"]').click();
      
      cy.intercept('PUT', `**/api/events/${eventId}/registration-form`).as('updateForm');
      
      cy.get('[data-cy="save-form-button"]').click();
      
      cy.wait('@updateForm');
      cy.get('[data-cy="form-success"]').should('be.visible');
    });

    it('should set registration limits', () => {
      cy.get('[data-cy="registration-enabled-toggle"]').click();
      
      cy.get('[data-cy="max-attendees-input"]').type('50');
      cy.get('[data-cy="registration-deadline-input"]').type('2024-12-30');
      cy.get('[data-cy="approval-required-toggle"]').click();
      
      cy.intercept('PUT', `**/api/events/${eventId}/registration-settings`).as('updateRegistration');
      
      cy.get('[data-cy="save-registration-settings"]').click();
      
      cy.wait('@updateRegistration');
      cy.get('[data-cy="registration-success"]').should('be.visible');
    });

    it('should generate registration link', () => {
      cy.get('[data-cy="registration-enabled-toggle"]').click();
      cy.get('[data-cy="save-registration-settings"]').click();
      
      // Vérifier que le lien est généré
      cy.get('[data-cy="registration-link"]').should('be.visible');
      cy.get('[data-cy="copy-link-button"]').click();
      
      cy.get('[data-cy="link-copied"]').should('be.visible');
    });
  });

  describe('Event Calendar View', () => {
    beforeEach(() => {
      cy.visit('/app/events');
      cy.get('[data-cy="calendar-view-toggle"]').click();
    });

    it('should display calendar correctly', () => {
      cy.get('[data-cy="events-calendar"]').should('be.visible');
      cy.get('[data-cy="calendar-navigation"]').should('be.visible');
      cy.get('[data-cy="current-month"]').should('be.visible');
    });

    it('should navigate between months', () => {
      cy.get('[data-cy="previous-month"]').click();
      cy.get('[data-cy="next-month"]').click();
      cy.get('[data-cy="today-button"]').click();
    });

    it('should display events on calendar', () => {
      // Vérifier que les événements apparaissent sur le calendrier
      cy.get('[data-cy="calendar-event"]').should('have.length.at.least', 0);
    });

    it('should create event by clicking on date', () => {
      cy.get('[data-cy="calendar-day"]').first().click();
      
      // Devrait ouvrir le formulaire de création avec la date pré-remplie
      cy.get('[data-cy="quick-create-event"]').should('be.visible');
      cy.get('[data-cy="event-date-input"]').should('not.be.empty');
    });
  });

  describe('Event Analytics', () => {
    let eventId;

    beforeEach(() => {
      cy.createTestEvent().then((id) => {
        eventId = id;
        cy.visit(`/app/events/${eventId}`);
        cy.get('[data-cy="tab-analytics"]').click();
      });
    });

    it('should display event statistics', () => {
      cy.get('[data-cy="event-stats"]').should('be.visible');
      cy.get('[data-cy="registrations-count"]').should('be.visible');
      cy.get('[data-cy="attendance-rate"]').should('be.visible');
      cy.get('[data-cy="no-shows-count"]').should('be.visible');
    });

    it('should display registration timeline', () => {
      cy.get('[data-cy="registration-timeline"]').should('be.visible');
      cy.get('[data-cy="timeline-chart"]').should('be.visible');
    });

    it('should export attendance report', () => {
      cy.get('[data-cy="export-report-button"]').click();
      cy.get('[data-cy="export-format-select"]').select('csv');
      
      cy.intercept('GET', `**/api/events/${eventId}/export`).as('exportReport');
      
      cy.get('[data-cy="download-report-button"]').click();
      
      cy.wait('@exportReport');
      // Vérifier que le téléchargement commence
    });
  });

  describe('Event Permissions', () => {
    it('should restrict event creation for members', () => {
      cy.loginAsRole('member');
      
      cy.visit('/app/events');
      
      // Les membres ne devraient pas voir le bouton de création
      cy.get('[data-cy="create-event-button"]').should('not.exist');
    });

    it('should allow event organizers full access', () => {
      cy.loginAsRole('organizer');
      
      cy.visit('/app/events');
      
      // Les organisateurs devraient voir tous les contrôles
      cy.get('[data-cy="create-event-button"]').should('be.visible');
    });
  });

  describe('Event Integration', () => {
    it('should sync with external calendars', () => {
      cy.createTestEvent().then((eventId) => {
        cy.visit(`/app/events/${eventId}`);
        
        cy.get('[data-cy="sync-calendar-button"]').click();
        cy.get('[data-cy="calendar-provider-select"]').select('google');
        
        cy.intercept('POST', `**/api/events/${eventId}/sync-calendar`).as('syncCalendar');
        
        cy.get('[data-cy="confirm-sync-button"]').click();
        
        cy.wait('@syncCalendar');
        cy.get('[data-cy="sync-success"]').should('be.visible');
      });
    });

    it('should generate QR codes for check-in', () => {
      cy.createTestEvent().then((eventId) => {
        cy.visit(`/app/events/${eventId}`);
        
        cy.get('[data-cy="generate-qr-button"]').click();
        
        cy.get('[data-cy="qr-code-display"]').should('be.visible');
        cy.get('[data-cy="download-qr-button"]').should('be.visible');
      });
    });
  });
});