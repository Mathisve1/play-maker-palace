export interface WidgetDefinition {
  type: string;
  label: Record<string, string>;
  description: Record<string, string>;
  icon: string;
  defaultW: number;
  defaultH: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  category: 'kpi' | 'overview' | 'shortcuts' | 'activity' | 'season';
}

export interface WidgetInstance {
  i: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // === KPIs ===
  kpi_upcoming_events: {
    type: 'kpi_upcoming_events',
    label: { nl: 'Aankomende evenementen', en: 'Upcoming events', fr: 'Événements à venir' },
    description: { nl: 'Evenementen in de komende 30 dagen', en: 'Events in the next 30 days', fr: 'Événements dans les 30 prochains jours' },
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
  kpi_pending_enrollments: {
    type: 'kpi_pending_enrollments',
    label: { nl: 'Wachtende inschrijvingen', en: 'Pending enrollments', fr: 'Inscriptions en attente' },
    description: { nl: 'Maandplan-inschrijvingen die wachten op goedkeuring', en: 'Monthly plan enrollments awaiting approval', fr: 'Inscriptions mensuelles en attente' },
    icon: 'Users',
    defaultW: 1, defaultH: 1, minW: 1, maxW: 2, minH: 1, maxH: 1,
    category: 'kpi',
  },
  kpi_day_signups_pending: {
    type: 'kpi_day_signups_pending',
    label: { nl: 'Dag-aanmeldingen te bevestigen', en: 'Day signups to confirm', fr: 'Inscriptions jour à confirmer' },
    description: { nl: 'Dag-aanmeldingen die wachten op toekenning', en: 'Day signups awaiting assignment', fr: 'Inscriptions jour en attente' },
    icon: 'Clock',
    defaultW: 1, defaultH: 1, minW: 1, maxW: 2, minH: 1, maxH: 1,
    category: 'kpi',
  },

  // === Overview ===
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
  pending_tickets: {
    type: 'pending_tickets',
    label: { nl: 'Tickets te genereren', en: 'Tickets to generate', fr: 'Tickets à générer' },
    description: { nl: 'Vrijwilligers die nog een ticket nodig hebben', en: 'Volunteers who still need a ticket', fr: 'Bénévoles qui ont encore besoin d\'un ticket' },
    icon: 'Ticket',
    defaultW: 2, defaultH: 1, minW: 1, maxW: 4, minH: 1, maxH: 2,
    category: 'overview',
  },
  compliance_overview: {
    type: 'compliance_overview',
    label: { nl: 'Compliance overzicht', en: 'Compliance overview', fr: 'Aperçu conformité' },
    description: { nl: 'Status van vrijwilligersverklaringen', en: 'Status of volunteer declarations', fr: 'Statut des déclarations bénévoles' },
    icon: 'Shield',
    defaultW: 2, defaultH: 1, minW: 1, maxW: 4, minH: 1, maxH: 2,
    category: 'overview',
  },
  payments_summary: {
    type: 'payments_summary',
    label: { nl: 'Betalingen samenvatting', en: 'Payments summary', fr: 'Résumé des paiements' },
    description: { nl: 'Overzicht van recente uitbetalingen', en: 'Overview of recent payouts', fr: 'Aperçu des paiements récents' },
    icon: 'Euro',
    defaultW: 2, defaultH: 1, minW: 1, maxW: 4, minH: 1, maxH: 1,
    category: 'overview',
  },

  // === Shortcuts ===
  shortcuts: {
    type: 'shortcuts',
    label: { nl: 'Snelkoppelingen', en: 'Shortcuts', fr: 'Raccourcis' },
    description: { nl: 'Snelle links naar belangrijke pagina\'s', en: 'Quick links to important pages', fr: 'Liens rapides vers les pages importantes' },
    icon: 'Zap',
    defaultW: 2, defaultH: 1, minW: 1, maxW: 4, minH: 1, maxH: 1,
    category: 'shortcuts',
  },

  // === Activity ===
  action_list: {
    type: 'action_list',
    label: { nl: 'Actielijst', en: 'Action List', fr: 'Liste d\'actions' },
    description: { nl: 'Overzicht van alle openstaande acties (aanmeldingen, contracten, tickets)', en: 'Overview of all pending actions (signups, contracts, tickets)', fr: 'Aperçu de toutes les actions en attente' },
    icon: 'Inbox',
    defaultW: 2, defaultH: 2, minW: 1, maxW: 4, minH: 1, maxH: 2,
    category: 'activity',
  },
  recent_activity: {
    type: 'recent_activity',
    label: { nl: 'Recente activiteit', en: 'Recent activity', fr: 'Activité récente' },
    description: { nl: 'Laatste aanmeldingen, berichten en contracten', en: 'Latest signups, messages and contracts', fr: 'Dernières inscriptions, messages et contrats' },
    icon: 'Zap',
    defaultW: 2, defaultH: 2, minW: 2, maxW: 4, minH: 1, maxH: 2,
    category: 'activity',
  },
};

export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { i: 'w1', type: 'kpi_upcoming_events', x: 0, y: 0, w: 1, h: 1 },
  { i: 'w2', type: 'kpi_pending_signups', x: 1, y: 0, w: 1, h: 1 },
  { i: 'w3', type: 'kpi_active_volunteers', x: 2, y: 0, w: 1, h: 1 },
  { i: 'w4', type: 'kpi_unsigned_contracts', x: 3, y: 0, w: 1, h: 1 },
  { i: 'w5', type: 'shortcuts', x: 0, y: 1, w: 2, h: 1 },
  { i: 'w6', type: 'recent_activity', x: 2, y: 1, w: 2, h: 2 },
  { i: 'w7', type: 'monthly_planning', x: 0, y: 2, w: 2, h: 1 },
];

export function generateWidgetId(): string {
  return 'w_' + Math.random().toString(36).substring(2, 9);
}
