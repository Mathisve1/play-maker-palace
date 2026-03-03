import { LucideIcon } from 'lucide-react';

export interface WidgetDefinition {
  type: string;
  label: Record<string, string>;
  description: Record<string, string>;
  icon: string; // lucide icon name
  defaultW: number; // default width in grid cols (1-4)
  defaultH: number; // default height in grid rows (1-2)
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  category: 'kpi' | 'overview' | 'shortcuts' | 'activity';
}

export interface WidgetInstance {
  i: string; // unique instance id
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  kpi_upcoming_events: {
    type: 'kpi_upcoming_events',
    label: { nl: 'Aankomende evenementen', en: 'Upcoming events', fr: 'Événements à venir' },
    description: { nl: 'Aantal evenementen in de komende 30 dagen', en: 'Events in the next 30 days', fr: 'Événements dans les 30 prochains jours' },
    icon: 'CalendarDays',
    defaultW: 1, defaultH: 1, minW: 1, maxW: 2, minH: 1, maxH: 1,
    category: 'kpi',
  },
  kpi_pending_signups: {
    type: 'kpi_pending_signups',
    label: { nl: 'Openstaande aanmeldingen', en: 'Pending signups', fr: 'Inscriptions en attente' },
    description: { nl: 'Vrijwilligers die wachten op goedkeuring', en: 'Volunteers awaiting approval', fr: 'Bénévoles en attente' },
    icon: 'Clock',
    defaultW: 1, defaultH: 1, minW: 1, maxW: 2, minH: 1, maxH: 1,
    category: 'kpi',
  },
  kpi_active_volunteers: {
    type: 'kpi_active_volunteers',
    label: { nl: 'Actieve vrijwilligers', en: 'Active volunteers', fr: 'Bénévoles actifs' },
    description: { nl: 'Unieke toegekende vrijwilligers', en: 'Unique assigned volunteers', fr: 'Bénévoles uniques assignés' },
    icon: 'Users',
    defaultW: 1, defaultH: 1, minW: 1, maxW: 2, minH: 1, maxH: 1,
    category: 'kpi',
  },
  kpi_unsigned_contracts: {
    type: 'kpi_unsigned_contracts',
    label: { nl: 'Ongetekende contracten', en: 'Unsigned contracts', fr: 'Contrats non signés' },
    description: { nl: 'Contracten die nog niet getekend zijn', en: 'Contracts not yet signed', fr: 'Contrats non encore signés' },
    icon: 'FileSignature',
    defaultW: 1, defaultH: 1, minW: 1, maxW: 2, minH: 1, maxH: 1,
    category: 'kpi',
  },
  monthly_planning: {
    type: 'monthly_planning',
    label: { nl: 'Maandplanning', en: 'Monthly Planning', fr: 'Planification mensuelle' },
    description: { nl: 'KPIs en acties voor de maandplanning', en: 'KPIs and actions for monthly planning', fr: 'KPIs et actions pour la planification mensuelle' },
    icon: 'CalendarDays',
    defaultW: 4, defaultH: 1, minW: 2, maxW: 4, minH: 1, maxH: 2,
    category: 'overview',
  },
  upcoming_events: {
    type: 'upcoming_events',
    label: { nl: 'Evenementen overzicht', en: 'Events overview', fr: 'Aperçu des événements' },
    description: { nl: 'Aankomende evenementen met details', en: 'Upcoming events with details', fr: 'Événements à venir avec détails' },
    icon: 'Calendar',
    defaultW: 4, defaultH: 2, minW: 2, maxW: 4, minH: 1, maxH: 2,
    category: 'overview',
  },
  shortcuts: {
    type: 'shortcuts',
    label: { nl: 'Snelkoppelingen', en: 'Shortcuts', fr: 'Raccourcis' },
    description: { nl: 'Snelle links naar belangrijke pagina\'s', en: 'Quick links to important pages', fr: 'Liens rapides vers les pages importantes' },
    icon: 'Zap',
    defaultW: 2, defaultH: 1, minW: 1, maxW: 4, minH: 1, maxH: 1,
    category: 'shortcuts',
  },
  recent_activity: {
    type: 'recent_activity',
    label: { nl: 'Recente activiteit', en: 'Recent activity', fr: 'Activité récente' },
    description: { nl: 'Laatste aanmeldingen, berichten en contracten', en: 'Latest signups, messages and contracts', fr: 'Dernières inscriptions, messages et contrats' },
    icon: 'Activity',
    defaultW: 2, defaultH: 2, minW: 2, maxW: 4, minH: 1, maxH: 2,
    category: 'activity',
  },
  pending_tickets: {
    type: 'pending_tickets',
    label: { nl: 'Tickets te genereren', en: 'Tickets to generate', fr: 'Tickets à générer' },
    description: { nl: 'Vrijwilligers die nog een ticket nodig hebben', en: 'Volunteers who still need a ticket', fr: 'Bénévoles qui ont encore besoin d\'un ticket' },
    icon: 'Ticket',
    defaultW: 2, defaultH: 1, minW: 1, maxW: 4, minH: 1, maxH: 2,
    category: 'overview',
  },
};

export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { i: 'w1', type: 'kpi_upcoming_events', x: 0, y: 0, w: 1, h: 1 },
  { i: 'w2', type: 'kpi_pending_signups', x: 1, y: 0, w: 1, h: 1 },
  { i: 'w3', type: 'kpi_active_volunteers', x: 2, y: 0, w: 1, h: 1 },
  { i: 'w4', type: 'kpi_unsigned_contracts', x: 3, y: 0, w: 1, h: 1 },
  { i: 'w5', type: 'monthly_planning', x: 0, y: 1, w: 4, h: 1 },
  { i: 'w6', type: 'shortcuts', x: 0, y: 2, w: 2, h: 1 },
  { i: 'w7', type: 'recent_activity', x: 2, y: 2, w: 2, h: 2 },
  { i: 'w8', type: 'upcoming_events', x: 0, y: 3, w: 4, h: 2 },
];

export function generateWidgetId(): string {
  return 'w_' + Math.random().toString(36).substring(2, 9);
}
