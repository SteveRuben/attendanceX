/**
 * Service de génération de données de démonstration
 * Crée des données d'exemple adaptées au secteur d'activité
 */

import { collections } from '../../config/database';
import { TenantError, TenantErrorCode } from '../../shared/types/tenant.types';
import { tenantService } from '../tenant/tenant.service';

export interface DemoDataGenerationOptions {
  tenantId: string;
  industry: string;
  generateUsers: boolean;
  generateEvents: boolean;
  generateAttendance: boolean;
  userCount?: number;
  eventCount?: number;
  timeRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface DemoDataResult {
  users: any[];
  events: any[];
  attendance: any[];
  summary: {
    usersCreated: number;
    eventsCreated: number;
    attendanceRecordsCreated: number;
  };
}

export interface IndustryTemplate {
  userRoles: string[];
  departments: string[];
  eventTypes: string[];
  eventTitles: string[];
  locations: string[];
  skills: string[];
  defaultEventDuration: number;
  workingHours: {
    start: number;
    end: number;
  };
}

export class DemoDataGeneratorService {

  private industryTemplates: Record<string, IndustryTemplate> = {
    education: {
      userRoles: ['Enseignant', 'Étudiant', 'Administrateur', 'Personnel', 'Chercheur'],
      departments: ['Administration', 'Enseignement', 'Recherche', 'Services', 'Bibliothèque'],
      eventTypes: ['Cours', 'Examen', 'Conférence', 'Réunion', 'Formation', 'Soutenance'],
      eventTitles: [
        'Cours de Mathématiques', 'Examen de Physique', 'Conférence sur l\'IA',
        'Réunion pédagogique', 'Formation continue', 'Soutenance de thèse',
        'Cours de Littérature', 'TP Chimie', 'Séminaire de recherche'
      ],
      locations: ['Amphithéâtre A', 'Salle 101', 'Laboratoire', 'Bibliothèque', 'Salle de conférence'],
      skills: ['Pédagogie', 'Recherche', 'Administration', 'Technique', 'Communication'],
      defaultEventDuration: 120,
      workingHours: { start: 8, end: 18 }
    },

    healthcare: {
      userRoles: ['Médecin', 'Infirmier', 'Administrateur', 'Technicien', 'Spécialiste'],
      departments: ['Médecine générale', 'Chirurgie', 'Urgences', 'Administration', 'Laboratoire'],
      eventTypes: ['Consultation', 'Intervention', 'Formation', 'Réunion', 'Garde', 'Staff'],
      eventTitles: [
        'Consultation générale', 'Intervention chirurgicale', 'Formation sécurité',
        'Réunion d\'équipe', 'Garde de nuit', 'Staff médical',
        'Consultation spécialisée', 'Formation continue', 'Réunion qualité'
      ],
      locations: ['Cabinet 1', 'Bloc opératoire', 'Salle de formation', 'Urgences', 'Laboratoire'],
      skills: ['Médecine', 'Chirurgie', 'Soins', 'Administration', 'Technique'],
      defaultEventDuration: 60,
      workingHours: { start: 7, end: 19 }
    },

    corporate: {
      userRoles: ['Manager', 'Employé', 'RH', 'Administrateur', 'Commercial'],
      departments: ['RH', 'IT', 'Marketing', 'Ventes', 'Finance', 'Opérations'],
      eventTypes: ['Réunion', 'Formation', 'Présentation', 'Entretien', 'Événement', 'Workshop'],
      eventTitles: [
        'Réunion équipe', 'Formation produit', 'Présentation client',
        'Entretien candidat', 'Événement team building', 'Workshop innovation',
        'Réunion budget', 'Formation sécurité', 'Présentation résultats'
      ],
      locations: ['Salle de réunion A', 'Open space', 'Salle de formation', 'Bureau direction', 'Auditorium'],
      skills: ['Management', 'Vente', 'Marketing', 'Technique', 'Communication'],
      defaultEventDuration: 60,
      workingHours: { start: 9, end: 18 }
    },

    technology: {
      userRoles: ['Développeur', 'DevOps', 'Product Manager', 'Designer', 'QA'],
      departments: ['Développement', 'DevOps', 'Product', 'Design', 'QA', 'Support'],
      eventTypes: ['Sprint Planning', 'Daily Standup', 'Review', 'Retrospective', 'Formation', 'Demo'],
      eventTitles: [
        'Sprint Planning', 'Daily Standup', 'Sprint Review',
        'Retrospective', 'Formation technique', 'Demo produit',
        'Code Review', 'Architecture meeting', 'Tech Talk'
      ],
      locations: ['Open space', 'Salle de réunion', 'Lab', 'Salle de formation', 'Auditorium'],
      skills: ['Développement', 'DevOps', 'Design', 'Product', 'QA'],
      defaultEventDuration: 60,
      workingHours: { start: 9, end: 18 }
    }
  };

  private firstNames = [
    'Alice', 'Bob', 'Claire', 'David', 'Emma', 'François', 'Gabrielle', 'Henri',
    'Isabelle', 'Julien', 'Karine', 'Louis', 'Marie', 'Nicolas', 'Olivia', 'Pierre',
    'Quentin', 'Rachel', 'Sophie', 'Thomas', 'Ursula', 'Vincent', 'Wendy', 'Xavier',
    'Yasmine', 'Zacharie', 'Amélie', 'Bernard', 'Céline', 'Damien'
  ];

  private lastNames = [
    'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Durand', 'Leroy',
    'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand',
    'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefèvre', 'Mercier',
    'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand'
  ];

  /**
   * Générer des données de démonstration complètes
   */
  async generateDemoData(options: DemoDataGenerationOptions): Promise<DemoDataResult> {
    try {
      const tenant = await tenantService.getTenant(options.tenantId);
      if (!tenant) {
        throw new TenantError('Tenant not found', TenantErrorCode.TENANT_NOT_FOUND);
      }

      const template = this.getIndustryTemplate(options.industry);
      const result: DemoDataResult = {
        users: [],
        events: [],
        attendance: [],
        summary: {
          usersCreated: 0,
          eventsCreated: 0,
          attendanceRecordsCreated: 0
        }
      };

      // Générer les utilisateurs
      if (options.generateUsers) {
        result.users = await this.generateDemoUsers(options.tenantId, template, options.userCount || 15);
        result.summary.usersCreated = result.users.length;
      }

      // Générer les événements
      if (options.generateEvents) {
        const timeRange = options.timeRange || this.getDefaultTimeRange();
        result.events = await this.generateDemoEvents(
          options.tenantId,
          template,
          options.eventCount || 30,
          timeRange
        );
        result.summary.eventsCreated = result.events.length;
      }

      // Générer les données de présence
      if (options.generateAttendance && result.users.length > 0 && result.events.length > 0) {
        result.attendance = await this.generateDemoAttendance(
          options.tenantId,
          result.users,
          result.events,
          template
        );
        result.summary.attendanceRecordsCreated = result.attendance.length;
      }

      // Marquer le tenant comme ayant des données de démo
      await tenantService.updateTenant(options.tenantId, {
        metadata: {
          hasDemoData: true,
          demoDataGeneratedAt: new Date(),
          demoDataSummary: result.summary
        }
      });

      return result;

    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error generating demo data:', error);
      throw new TenantError(
        'Failed to generate demo data',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Nettoyer les données de démonstration
   */
  async cleanupDemoData(tenantId: string): Promise<void> {
    try {
      const batch = collections.users.firestore.batch();

      // Supprimer les utilisateurs de démo
      const demoUsers = await collections.users
        .where('tenantId', '==', tenantId)
        .where('isDemo', '==', true)
        .get();

      demoUsers.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Supprimer les événements de démo
      const demoEvents = await collections.events
        .where('tenantId', '==', tenantId)
        .where('isDemo', '==', true)
        .get();

      demoEvents.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Supprimer les données de présence de démo
      const demoAttendance = await collections.attendances
        .where('tenantId', '==', tenantId)
        .where('isDemo', '==', true)
        .get();

      demoAttendance.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Mettre à jour le tenant
      await tenantService.updateTenant(tenantId, {
        metadata: {
          hasDemoData: false,
          demoDataGeneratedAt: null,
          demoDataSummary: null
        }
      });

    } catch (error) {
      console.error('Error cleaning up demo data:', error);
      throw new TenantError(
        'Failed to cleanup demo data',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir un template d'industrie
   */
  getIndustryTemplate(industry: string): IndustryTemplate {
    return this.industryTemplates[industry] || this.industryTemplates.corporate;
  }

  /**
   * Obtenir les templates disponibles
   */
  getAvailableTemplates(): Record<string, { name: string; description: string }> {
    return {
      education: {
        name: 'Éducation',
        description: 'Écoles, universités, centres de formation'
      },
      healthcare: {
        name: 'Santé',
        description: 'Hôpitaux, cliniques, cabinets médicaux'
      },
      corporate: {
        name: 'Entreprise',
        description: 'Entreprises, bureaux, organisations'
      },
      technology: {
        name: 'Technologie',
        description: 'Startups tech, équipes de développement'
      }
    };
  }

  // Méthodes privées

  private async generateDemoUsers(tenantId: string, template: IndustryTemplate, count: number): Promise<any[]> {
    const users = [];
    const usedEmails = new Set<string>();

    for (let i = 0; i < count; i++) {
      const firstName = this.firstNames[i % this.firstNames.length];
      const lastName = this.lastNames[i % this.lastNames.length];

      // Générer un email unique
      let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.local`;
      let counter = 1;
      while (usedEmails.has(email)) {
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${counter}@demo.local`;
        counter++;
      }
      usedEmails.add(email);

      const role = template.userRoles[i % template.userRoles.length];
      const department = template.departments[i % template.departments.length];
      const skills = this.getRandomItems(template.skills, Math.floor(Math.random() * 3) + 1);

      const user = {
        tenantId,
        email,
        profile: {
          firstName,
          lastName,
          department,
          position: role,
          skills,
          phone: this.generatePhoneNumber(),
          avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
          bio: this.generateUserBio(role, department)
        },
        role: this.mapToSystemRole(role),
        permissions: this.getPermissionsForRole(this.mapToSystemRole(role)),
        status: 'active',
        isDemo: true,
        demoData: {
          originalRole: role,
          generatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userId = `demo_user_${tenantId}_${i + 1}`;
      await collections.users.doc(userId).set(user);
      users.push({ id: userId, ...user });
    }

    return users;
  }

  private async generateDemoEvents(
    tenantId: string,
    template: IndustryTemplate,
    count: number,
    timeRange: { startDate: Date; endDate: Date }
  ): Promise<any[]> {
    const events = [];
    const { startDate, endDate } = timeRange;
    const timeSpan = endDate.getTime() - startDate.getTime();

    for (let i = 0; i < count; i++) {
      const eventType = template.eventTypes[i % template.eventTypes.length];
      const title = template.eventTitles[i % template.eventTitles.length];
      const location = template.locations[i % template.locations.length];

      // Générer une date aléatoire dans la plage
      const randomTime = Math.random() * timeSpan;
      const eventDate = new Date(startDate.getTime() + randomTime);

      // Ajuster pour les heures de travail
      const workingHour = template.workingHours.start +
        Math.floor(Math.random() * (template.workingHours.end - template.workingHours.start));
      eventDate.setHours(workingHour, Math.floor(Math.random() * 60), 0, 0);

      // Calculer la durée
      const baseDuration = template.defaultEventDuration;
      const duration = baseDuration + (Math.floor(Math.random() * 3) - 1) * 30; // ±30 minutes
      const endTime = new Date(eventDate.getTime() + duration * 60 * 1000);

      const event = {
        tenantId,
        title: `${title} ${i + 1}`,
        description: this.generateEventDescription(eventType, title),
        type: eventType.toLowerCase().replace(/\s+/g, '_'),
        category: this.getEventCategory(eventType),
        startDate: eventDate,
        endDate: endTime,
        location,
        maxAttendees: this.getMaxAttendeesForEventType(eventType),
        isPublic: Math.random() > 0.3, // 70% publics
        requiresApproval: Math.random() > 0.8, // 20% nécessitent une approbation
        tags: this.getEventTags(eventType, template),
        isDemo: true,
        demoData: {
          eventType,
          generatedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const eventId = `demo_event_${tenantId}_${i + 1}`;
      await collections.events.doc(eventId).set(event);
      events.push({ id: eventId, ...event });
    }

    return events;
  }

  private async generateDemoAttendance(
    tenantId: string,
    users: any[],
    events: any[],
    template: IndustryTemplate
  ): Promise<any[]> {
    const attendance = [];

    for (const event of events) {
      // Déterminer le nombre de participants (50-90% de la capacité max)
      const maxAttendees = event.maxAttendees;
      const minAttendees = Math.floor(maxAttendees * 0.5);
      const actualAttendees = minAttendees + Math.floor(Math.random() * (maxAttendees - minAttendees));

      // Sélectionner des utilisateurs aléatoires
      const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
      const selectedUsers = shuffledUsers.slice(0, Math.min(actualAttendees, users.length));

      for (const user of selectedUsers) {
        const attendanceStatus = this.generateAttendanceStatus(event, user);
        const checkedInAt = attendanceStatus === 'present' ?
          this.generateCheckinTime(event.startDate) : null;

        const attendanceRecord = {
          tenantId,
          eventId: event.id,
          userId: user.id,
          status: attendanceStatus,
          checkedInAt,
          checkedOutAt: attendanceStatus === 'present' && Math.random() > 0.7 ?
            this.generateCheckoutTime(event.endDate) : null,
          notes: this.generateAttendanceNotes(attendanceStatus),
          isDemo: true,
          demoData: {
            generatedAt: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const attendanceId = `demo_attendance_${event.id}_${user.id}`;
        await collections.attendances.doc(attendanceId).set(attendanceRecord);
        attendance.push({ id: attendanceId, ...attendanceRecord });
      }
    }

    return attendance;
  }

  private getDefaultTimeRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 jours avant
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours après
    return { startDate, endDate };
  }

  private getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private generatePhoneNumber(): string {
    const formats = [
      '+33 1 ## ## ## ##',
      '+33 6 ## ## ## ##',
      '01 ## ## ## ##',
      '06 ## ## ## ##'
    ];
    const format = formats[Math.floor(Math.random() * formats.length)];
    return format.replace(/##/g, () => Math.floor(Math.random() * 100).toString().padStart(2, '0'));
  }

  private generateUserBio(role: string, department: string): string {
    const bios = [
      `${role} expérimenté(e) dans le département ${department}.`,
      `Spécialiste ${role} avec plusieurs années d'expérience.`,
      `Membre actif de l'équipe ${department}, passionné(e) par son métier.`,
      `${role} dévoué(e) contribuant au succès de ${department}.`
    ];
    return bios[Math.floor(Math.random() * bios.length)];
  }

  private mapToSystemRole(demoRole: string): string {
    const roleMapping: Record<string, string> = {
      'Administrateur': 'admin',
      'Manager': 'manager',
      'Enseignant': 'manager',
      'Médecin': 'manager',
      'Spécialiste': 'manager',
      'Product Manager': 'manager'
    };
    return roleMapping[demoRole] || 'user';
  }

  private getPermissionsForRole(role: string): string[] {
    const permissions: Record<string, string[]> = {
      'admin': ['*'],
      'manager': ['events:create', 'events:edit', 'users:invite', 'reports:view'],
      'user': ['events:view', 'attendance:mark']
    };
    return permissions[role] || permissions.user;
  }

  private generateEventDescription(eventType: string, title: string): string {
    const descriptions: Record<string, string[]> = {
      'Cours': [
        'Session d\'apprentissage interactive avec exercices pratiques.',
        'Cours théorique avec supports pédagogiques.',
        'Formation approfondie sur le sujet.'
      ],
      'Réunion': [
        'Réunion d\'équipe pour faire le point sur les projets en cours.',
        'Session de coordination et de planification.',
        'Échange sur les objectifs et priorités.'
      ],
      'Formation': [
        'Session de formation pour développer les compétences.',
        'Atelier pratique avec mise en situation.',
        'Formation certifiante avec évaluation.'
      ]
    };

    const typeDescriptions = descriptions[eventType] || [
      'Événement organisé dans le cadre des activités.',
      'Session de travail collaborative.',
      'Rencontre professionnelle.'
    ];

    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
  }

  private getEventCategory(eventType: string): string {
    const categories: Record<string, string> = {
      'Cours': 'education',
      'Examen': 'evaluation',
      'Conférence': 'conference',
      'Réunion': 'meeting',
      'Formation': 'training',
      'Consultation': 'appointment',
      'Intervention': 'procedure'
    };
    return categories[eventType] || 'general';
  }

  private getMaxAttendeesForEventType(eventType: string): number {
    const capacities: Record<string, number> = {
      'Cours': 30,
      'Examen': 50,
      'Conférence': 100,
      'Réunion': 15,
      'Formation': 20,
      'Consultation': 1,
      'Intervention': 5
    };
    const baseCapacity = capacities[eventType] || 25;
    return baseCapacity + Math.floor(Math.random() * 10) - 5; // ±5 personnes
  }

  private getEventTags(eventType: string, template: IndustryTemplate): string[] {
    const baseTags = [eventType.toLowerCase()];
    const additionalTags = template.skills.slice(0, 2);
    return [...baseTags, ...additionalTags.map(tag => tag.toLowerCase())];
  }

  private generateAttendanceStatus(event: any, user: any): 'present' | 'absent' | 'late' | 'excused' {
    const now = new Date();
    const eventDate = event.startDate.toDate ? event.startDate.toDate() : event.startDate;

    // Si l'événement est dans le futur, pas de statut
    if (eventDate > now) {
      return Math.random() > 0.1 ? 'present' : 'absent'; // 90% de présence prévue
    }

    // Pour les événements passés, générer des statuts réalistes
    const rand = Math.random();
    if (rand < 0.8) {return 'present';} // 80% présent
    if (rand < 0.9) {return 'late';} // 10% en retard
    if (rand < 0.95) {return 'excused';} // 5% excusé
    return 'absent'; // 5% absent
  }

  private generateCheckinTime(eventStartDate: Date): Date {
    const startTime = eventStartDate.getTime();
    // Check-in entre 15 minutes avant et 10 minutes après le début
    const randomOffset = (Math.random() * 25 - 15) * 60 * 1000;
    return new Date(startTime + randomOffset);
  }

  private generateCheckoutTime(eventEndDate: Date): Date {
    const endTime = eventEndDate.getTime();
    // Check-out entre 5 minutes avant et 15 minutes après la fin
    const randomOffset = (Math.random() * 20 - 5) * 60 * 1000;
    return new Date(endTime + randomOffset);
  }

  private generateAttendanceNotes(status: string): string {
    const notes: Record<string, string[]> = {
      'present': ['', 'Participation active', 'Très engagé(e)'],
      'late': ['Retard de 10 minutes', 'Arrivé(e) en cours de session', 'Retard justifié'],
      'absent': ['Absence non justifiée', 'Maladie', 'Congés'],
      'excused': ['Absence justifiée', 'Mission externe', 'Formation externe']
    };

    const statusNotes = notes[status] || [''];
    return statusNotes[Math.floor(Math.random() * statusNotes.length)];
  }
}

// Instance singleton
export const demoDataGeneratorService = new DemoDataGeneratorService();
export default demoDataGeneratorService;