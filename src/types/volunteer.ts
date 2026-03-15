export interface VolunteerTask {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  status: string;
  club_id: string;
  created_at: string;
  expense_reimbursement?: boolean;
  expense_amount?: number | null;
  briefing_time?: string | null;
  briefing_location?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  required_training_id?: string | null;
  clubs?: { name: string; sport: string | null; location: string | null; logo_url?: string | null };
  event_id?: string | null;
  event_group_id?: string | null;
}

export interface TaskSignup {
  task_id: string;
  status: string;
  checked_in_at?: string | null;
}

export interface VolunteerPayment {
  id: string;
  task_id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  task_title?: string;
  club_name?: string;
}

export interface SignatureContract {
  id: string;
  task_id: string;
  status: string;
  signing_url: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
  task_title?: string;
  club_name?: string;
}

export interface VolunteerTicket {
  id: string;
  task_id: string | null;
  event_id: string | null;
  club_id: string;
  status: string;
  ticket_url: string | null;
  barcode: string | null;
  external_ticket_id: string | null;
  created_at: string;
  checked_in_at: string | null;
  task_title?: string;
  club_name?: string;
  event_title?: string;
}

export interface SepaPayoutItem {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  error_flag: boolean;
  error_message: string | null;
  batch_status: string;
  batch_reference: string;
  task_title?: string;
  club_name?: string;
}

export interface VolunteerEventData {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  status: string;
  club_name?: string;
}

export interface VolunteerEventGroup {
  id: string;
  event_id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface LoyaltyProgramView {
  id: string;
  name: string;
  description: string | null;
  reward_description: string;
  required_tasks: number;
  required_points: number | null;
  points_based: boolean;
  club_id: string;
  club_name?: string;
}

export interface LoyaltyEnrollmentView {
  id: string;
  tasks_completed: number;
  points_earned: number;
  reward_claimed: boolean;
}

export const volunteerDashboardLabels = {
  nl: { welcome: 'Welkom terug', subtitle: 'Samen maken we sport mogelijk.', availableTasks: 'Beschikbare taken', searchPlaceholder: 'Zoek taken, clubs of locaties...', noTasks: 'Er zijn momenteel geen openstaande taken.', signUp: 'Inschrijven', signedUp: 'Ingeschreven', assigned: 'Toegekend', cancel: 'Annuleren', spots: 'plaatsen', mySignups: 'Mijn inschrijvingen', allTasks: 'Alle taken', myTasks: 'Mijn taken', noMyTasks: 'Geen taken in deze categorie.', signContract: 'Contract ondertekenen', ingeschreven: 'Ingeschreven', toegekend: 'Toegekend', payments: 'Vergoedingen', noPayments: 'Je hebt nog geen vergoedingen ontvangen.', paid: 'Betaald', processing: 'Verwerken', pending: 'In afwachting', failed: 'Mislukt', receipt: 'Betaalbewijs', paidOn: 'Betaald op', contracts: 'Contracten', noContracts: 'Je hebt nog geen contracten.', signed: 'Ondertekend', awaitingSignature: 'Wacht op ondertekening', signNow: 'Nu ondertekenen', downloadContract: 'Download contract', checkStatus: 'Status ophalen', sentOn: 'Verstuurd op', events: 'Evenementen', looseTasks: 'Overige taken', viewEvent: 'Bekijk evenement', upcomingTasks: 'Aankomende taken', quickStats: 'Overzicht', totalEarned: 'Totaal verdiend', tasksCompleted: 'Voltooid', openTasks: 'Open taken', viewAll: 'Bekijk alles', goToMessages: 'Ga naar berichten', recentMessages: 'Berichten' },
  fr: { welcome: 'Bienvenue', subtitle: 'Ensemble, rendons le sport possible.', availableTasks: 'Tâches disponibles', searchPlaceholder: 'Rechercher des tâches, clubs ou lieux...', noTasks: 'Aucune tâche disponible.', signUp: 'S\'inscrire', signedUp: 'Inscrit', assigned: 'Attribué', cancel: 'Annuler', spots: 'places', mySignups: 'Mes inscriptions', allTasks: 'Toutes les tâches', myTasks: 'Mes tâches', noMyTasks: 'Aucune tâche.', signContract: 'Signer le contrat', ingeschreven: 'Inscrits', toegekend: 'Attribués', payments: 'Remboursements', noPayments: 'Aucun remboursement.', paid: 'Payé', processing: 'En cours', pending: 'En attente', failed: 'Échoué', receipt: 'Reçu', paidOn: 'Payé le', contracts: 'Contrats', noContracts: 'Aucun contrat.', signed: 'Signé', awaitingSignature: 'En attente', signNow: 'Signer', downloadContract: 'Télécharger', checkStatus: 'Vérifier', sentOn: 'Envoyé le', events: 'Événements', looseTasks: 'Autres tâches', viewEvent: 'Voir', upcomingTasks: 'Prochaines tâches', quickStats: 'Aperçu', totalEarned: 'Total gagné', tasksCompleted: 'Terminées', openTasks: 'Tâches ouvertes', viewAll: 'Voir tout', goToMessages: 'Aller aux messages', recentMessages: 'Messages' },
  en: { welcome: 'Welcome back', subtitle: 'Together we make sports possible.', availableTasks: 'Available tasks', searchPlaceholder: 'Search tasks, clubs or locations...', noTasks: 'No open tasks.', signUp: 'Sign up', signedUp: 'Signed up', assigned: 'Assigned', cancel: 'Cancel', spots: 'spots', mySignups: 'My signups', allTasks: 'All tasks', myTasks: 'My tasks', noMyTasks: 'No tasks in this category.', signContract: 'Sign contract', ingeschreven: 'Signed up', toegekend: 'Assigned', payments: 'Payments', noPayments: 'No payments yet.', paid: 'Paid', processing: 'Processing', pending: 'Pending', failed: 'Failed', receipt: 'Receipt', paidOn: 'Paid on', contracts: 'Contracts', noContracts: 'No contracts.', signed: 'Signed', awaitingSignature: 'Awaiting signature', signNow: 'Sign now', downloadContract: 'Download', checkStatus: 'Check status', sentOn: 'Sent on', events: 'Events', looseTasks: 'Other tasks', viewEvent: 'View event', upcomingTasks: 'Upcoming tasks', quickStats: 'Overview', totalEarned: 'Total earned', tasksCompleted: 'Completed', openTasks: 'Open tasks', viewAll: 'View all', goToMessages: 'Go to messages', recentMessages: 'Messages' },
};
