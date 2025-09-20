// shared/src/constants/event-types.ts

import { EventStatus, EventType } from "../types";

export const EVENT_TYPE_LABELS = {
  [EventType.MEETING]: 'Réunion',
  [EventType.CONFERENCE]: 'Conférence',
  [EventType.WORKSHOP]: 'Atelier',
  [EventType.TRAINING]: 'Formation',
  [EventType.SEMINAR]: 'Séminaire',
  [EventType.WEBINAR]: 'Webinaire',
  [EventType.TEAM_BUILDING]: 'Team Building',
  [EventType.PRESENTATION]: 'Présentation',
  [EventType.INTERVIEW]: 'Entretien',
  [EventType.EXAM]: 'Examen',
  [EventType.COURSE]: 'Cours',
  [EventType.OTHER]: 'Autre'
} as const;

export const EVENT_STATUS_LABELS = {
  [EventStatus.DRAFT]: 'Brouillon',
  [EventStatus.PUBLISHED]: 'Publié',
  [EventStatus.ONGOING]: 'En cours',
  [EventStatus.COMPLETED]: 'Terminé',
  [EventStatus.CANCELLED]: 'Annulé',
  [EventStatus.POSTPONED]: 'Reporté'
} as const;

export const EVENT_STATUS_COLORS = {
  [EventStatus.DRAFT]: 'gray',
  [EventStatus.PUBLISHED]: 'blue',
  [EventStatus.ONGOING]: 'green',
  [EventStatus.COMPLETED]: 'purple',
  [EventStatus.CANCELLED]: 'red',
  [EventStatus.POSTPONED]: 'orange'
} as const;

export const EVENT_TYPE_ICONS = {
  [EventType.MEETING]: 'users',
  [EventType.CONFERENCE]: 'mic',
  [EventType.WORKSHOP]: 'tool',
  [EventType.TRAINING]: 'graduation-cap',
  [EventType.SEMINAR]: 'presentation',
  [EventType.WEBINAR]: 'video',
  [EventType.TEAM_BUILDING]: 'heart',
  [EventType.PRESENTATION]: 'projector',
  [EventType.INTERVIEW]: 'user-check',
  [EventType.EXAM]: 'clipboard-check',
  [EventType.COURSE]: 'book-open',
  [EventType.OTHER]: 'calendar'
} as const;

// Durées par défaut par type d'événement (en minutes)
export const DEFAULT_EVENT_DURATIONS = {
  [EventType.MEETING]: 60,
  [EventType.CONFERENCE]: 480,
  [EventType.WORKSHOP]: 240,
  [EventType.TRAINING]: 480,
  [EventType.SEMINAR]: 120,
  [EventType.WEBINAR]: 90,
  [EventType.TEAM_BUILDING]: 240,
  [EventType.PRESENTATION]: 45,
  [EventType.INTERVIEW]: 30,
  [EventType.EXAM]: 120,
  [EventType.COURSE]: 90,
  [EventType.OTHER]: 60
} as const;

// Capacités par défaut par type d'événement
export const DEFAULT_EVENT_CAPACITIES = {
  [EventType.MEETING]: 15,
  [EventType.CONFERENCE]: 200,
  [EventType.WORKSHOP]: 30,
  [EventType.TRAINING]: 25,
  [EventType.SEMINAR]: 50,
  [EventType.WEBINAR]: 100,
  [EventType.TEAM_BUILDING]: 20,
  [EventType.PRESENTATION]: 100,
  [EventType.INTERVIEW]: 2,
  [EventType.EXAM]: 50,
  [EventType.COURSE]: 30,
  [EventType.OTHER]: 20
} as const;