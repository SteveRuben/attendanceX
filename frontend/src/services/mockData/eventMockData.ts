import { Event, EventType, EventStatus, EventPriority } from '../../shared/types/event.types';

export const mockEvents: Event[] = [
  {
    id: 'evt-001',
    title: 'Réunion d\'équipe Marketing Q1',
    description: 'Revue des objectifs du premier trimestre et planification des campagnes à venir. Discussion sur les nouvelles stratégies digitales.',
    type: EventType.MEETING,
    status: EventStatus.PUBLISHED,
    priority: 'high' as EventPriority,
    
    organizationId: 'org-001',
    organizationName: 'TechCorp',
    organizationLogo: '',
    
    startDateTime: new Date('2025-10-15T09:00:00'),
    endDateTime: new Date('2025-10-15T11:00:00'),
    timezone: 'Europe/Paris',
    allDay: false,
    
    recurrence: {
      enabled: false,
      frequency: 'none' as any,
      interval: 1,
      endDate: undefined,
      occurrences: undefined
    },
    
    location: {
      type: 'physical',
      name: 'Salle de conférence A',
      address: '123 Avenue des Champs-Élysées, 75008 Paris',
      coordinates: {
        latitude: 48.8698,
        longitude: 2.3078
      }
    },
    capacity: 50,
    
    organizerId: 'user-001',
    organizerName: 'Marie Dubois',
    coOrganizers: ['user-002'],
    
    participants: ['user-001', 'user-002', 'user-003', 'user-004', 'user-005'],
    confirmedParticipants: ['user-001', 'user-002', 'user-003'],
    maxParticipants: 50,
    registrationRequired: true,
    waitingList: [],
    
    attendanceSettings: {
      trackingEnabled: true,
      requireCheckIn: true,
      requireCheckOut: false,
      allowLateCheckIn: true,
      lateThreshold: 15,
      autoMarkAbsent: true,
      autoMarkAbsentAfter: 30,
      allowedMethods: ['qr', 'manual', 'geolocation'],
      geofencing: {
        enabled: true,
        radius: 100,
        coordinates: {
          latitude: 48.8698,
          longitude: 2.3078
        }
      }
    },
    
    tags: ['marketing', 'quarterly', 'strategy'],
    category: 'Business',
    department: 'Marketing',
    isPrivate: false,
    requiresApproval: false,
    
    reminderSettings: {
      enabled: true,
      times: [24, 1],
      channels: ['email', 'push']
    },
    
    createdAt: new Date('2025-10-01T10:00:00'),
    updatedAt: new Date('2025-10-05T14:30:00'),
    createdBy: 'user-001',
    updatedBy: 'user-001',
    tenantId: 'tenant-001'
  },
  {
    id: 'evt-002',
    title: 'Formation React Advanced',
    description: 'Formation approfondie sur React : hooks avancés, performance optimization, et patterns modernes.',
    type: EventType.TRAINING,
    status: EventStatus.PUBLISHED,
    priority: 'medium' as EventPriority,
    
    organizationId: 'org-001',
    organizationName: 'TechCorp',
    
    startDateTime: new Date('2025-10-20T14:00:00'),
    endDateTime: new Date('2025-10-20T18:00:00'),
    timezone: 'Europe/Paris',
    allDay: false,
    
    recurrence: {
      enabled: false,
      frequency: 'none' as any,
      interval: 1
    },
    
    location: {
      type: 'virtual',
      name: 'Zoom Meeting',
      virtualLink: 'https://zoom.us/j/123456789'
    },
    capacity: 30,
    
    organizerId: 'user-002',
    organizerName: 'Jean Martin',
    coOrganizers: [],
    
    participants: ['user-006', 'user-007', 'user-008', 'user-009', 'user-010', 'user-011'],
    confirmedParticipants: ['user-006', 'user-007', 'user-008'],
    maxParticipants: 30,
    registrationRequired: true,
    waitingList: [],
    
    attendanceSettings: {
      trackingEnabled: true,
      requireCheckIn: true,
      requireCheckOut: false,
      allowLateCheckIn: true,
      lateThreshold: 10,
      autoMarkAbsent: true,
      autoMarkAbsentAfter: 20,
      allowedMethods: ['manual']
    },
    
    tags: ['formation', 'react', 'développement'],
    category: 'Training',
    department: 'IT',
    isPrivate: false,
    requiresApproval: true,
    
    reminderSettings: {
      enabled: true,
      times: [24, 2],
      channels: ['email']
    },
    
    createdAt: new Date('2025-10-02T09:00:00'),
    updatedAt: new Date('2025-10-02T09:00:00'),
    createdBy: 'user-002',
    updatedBy: 'user-002',
    tenantId: 'tenant-001'
  },
  {
    id: 'evt-003',
    title: 'Conférence Tech Summit 2025',
    description: 'Grande conférence annuelle sur les dernières innovations technologiques. Keynotes, workshops et networking.',
    type: EventType.CONFERENCE,
    status: EventStatus.PUBLISHED,
    priority: 'high' as EventPriority,
    
    organizationId: 'org-001',
    organizationName: 'TechCorp',
    
    startDateTime: new Date('2025-11-05T08:00:00'),
    endDateTime: new Date('2025-11-05T19:00:00'),
    timezone: 'Europe/Paris',
    allDay: true,
    
    recurrence: {
      enabled: false,
      frequency: 'none' as any,
      interval: 1
    },
    
    location: {
      type: 'hybrid',
      name: 'Palais des Congrès',
      address: '2 Place de la Porte Maillot, 75017 Paris',
      coordinates: {
        latitude: 48.8783,
        longitude: 2.2833
      },
      virtualLink: 'https://techsummit.live/2025'
    },
    capacity: 500,
    
    organizerId: 'user-001',
    organizerName: 'Marie Dubois',
    coOrganizers: ['user-002', 'user-003'],
    
    participants: Array.from({ length: 150 }, (_, i) => `user-${i + 100}`),
    confirmedParticipants: Array.from({ length: 120 }, (_, i) => `user-${i + 100}`),
    maxParticipants: 500,
    registrationRequired: true,
    waitingList: [],
    
    attendanceSettings: {
      trackingEnabled: true,
      requireCheckIn: true,
      requireCheckOut: true,
      allowLateCheckIn: true,
      lateThreshold: 30,
      autoMarkAbsent: false,
      autoMarkAbsentAfter: 60,
      allowedMethods: ['qr', 'manual', 'geolocation'],
      geofencing: {
        enabled: true,
        radius: 200,
        coordinates: {
          latitude: 48.8783,
          longitude: 2.2833
        }
      }
    },
    
    tags: ['conference', 'tech', 'innovation', 'networking'],
    category: 'Conference',
    isPrivate: false,
    requiresApproval: true,
    
    reminderSettings: {
      enabled: true,
      times: [168, 24, 2],
      channels: ['email', 'push', 'sms']
    },
    
    createdAt: new Date('2025-09-01T10:00:00'),
    updatedAt: new Date('2025-10-01T15:00:00'),
    createdBy: 'user-001',
    updatedBy: 'user-001',
    tenantId: 'tenant-001'
  },
  {
    id: 'evt-004',
    title: 'Atelier Design Thinking',
    description: 'Atelier pratique sur les méthodologies de Design Thinking appliquées au développement produit.',
    type: EventType.WORKSHOP,
    status: EventStatus.ONGOING,
    priority: 'medium' as EventPriority,
    
    organizationId: 'org-001',
    organizationName: 'TechCorp',
    
    startDateTime: new Date('2025-10-13T10:00:00'),
    endDateTime: new Date('2025-10-13T16:00:00'),
    timezone: 'Europe/Paris',
    allDay: false,
    
    recurrence: {
      enabled: false,
      frequency: 'none' as any,
      interval: 1
    },
    
    location: {
      type: 'physical',
      name: 'Innovation Lab',
      address: '45 Rue de Rivoli, 75001 Paris'
    },
    capacity: 20,
    
    organizerId: 'user-003',
    organizerName: 'Sophie Laurent',
    coOrganizers: [],
    
    participants: ['user-012', 'user-013', 'user-014', 'user-015', 'user-016'],
    confirmedParticipants: ['user-012', 'user-013', 'user-014', 'user-015'],
    maxParticipants: 20,
    registrationRequired: true,
    waitingList: ['user-017'],
    
    attendanceSettings: {
      trackingEnabled: true,
      requireCheckIn: true,
      requireCheckOut: false,
      allowLateCheckIn: false,
      lateThreshold: 5,
      autoMarkAbsent: true,
      autoMarkAbsentAfter: 15,
      allowedMethods: ['qr', 'manual']
    },
    
    tags: ['workshop', 'design', 'innovation'],
    category: 'Workshop',
    department: 'Product',
    isPrivate: false,
    requiresApproval: true,
    
    reminderSettings: {
      enabled: true,
      times: [24, 1],
      channels: ['email']
    },
    
    createdAt: new Date('2025-09-20T11:00:00'),
    updatedAt: new Date('2025-10-10T09:00:00'),
    createdBy: 'user-003',
    updatedBy: 'user-003',
    tenantId: 'tenant-001'
  },
  {
    id: 'evt-005',
    title: 'Webinaire Cybersécurité',
    description: 'Webinaire sur les meilleures pratiques en cybersécurité pour les entreprises modernes.',
    type: EventType.WEBINAR,
    status: EventStatus.COMPLETED,
    priority: 'low' as EventPriority,
    
    organizationId: 'org-001',
    organizationName: 'TechCorp',
    
    startDateTime: new Date('2025-10-01T15:00:00'),
    endDateTime: new Date('2025-10-01T16:30:00'),
    timezone: 'Europe/Paris',
    allDay: false,
    
    recurrence: {
      enabled: false,
      frequency: 'none' as any,
      interval: 1
    },
    
    location: {
      type: 'virtual',
      name: 'Microsoft Teams',
      virtualLink: 'https://teams.microsoft.com/l/meetup-join/...'
    },
    capacity: 100,
    
    organizerId: 'user-004',
    organizerName: 'Pierre Durand',
    coOrganizers: [],
    
    participants: Array.from({ length: 45 }, (_, i) => `user-${i + 200}`),
    confirmedParticipants: Array.from({ length: 38 }, (_, i) => `user-${i + 200}`),
    maxParticipants: 100,
    registrationRequired: true,
    waitingList: [],
    
    attendanceSettings: {
      trackingEnabled: true,
      requireCheckIn: true,
      requireCheckOut: false,
      allowLateCheckIn: true,
      lateThreshold: 10,
      autoMarkAbsent: true,
      autoMarkAbsentAfter: 20,
      allowedMethods: ['manual']
    },
    
    tags: ['webinar', 'security', 'cybersecurity'],
    category: 'Training',
    department: 'IT',
    isPrivate: false,
    requiresApproval: false,
    
    reminderSettings: {
      enabled: true,
      times: [24, 1],
      channels: ['email']
    },
    
    createdAt: new Date('2025-09-15T10:00:00'),
    updatedAt: new Date('2025-10-01T17:00:00'),
    createdBy: 'user-004',
    updatedBy: 'user-004',
    tenantId: 'tenant-001'
  }
];

export const mockEventStats = {
  total: 5,
  upcoming: 2,
  ongoing: 1,
  completed: 1,
  cancelled: 0,
  totalParticipants: 206,
  averageAttendance: 78.5,
  byType: {
    [EventType.MEETING]: 1,
    [EventType.TRAINING]: 1,
    [EventType.CONFERENCE]: 1,
    [EventType.WORKSHOP]: 1,
    [EventType.WEBINAR]: 1,
    [EventType.SEMINAR]: 0,
    [EventType.OTHER]: 0
  },
  byStatus: {
    [EventStatus.DRAFT]: 0,
    [EventStatus.PUBLISHED]: 3,
    [EventStatus.ONGOING]: 1,
    [EventStatus.COMPLETED]: 1,
    [EventStatus.CANCELLED]: 0
  }
};

