import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, BarChart3, Download, Filter, Loader2, PieChart, TrendingUp, Users,
  Calendar, Euro, AlertTriangle, CheckCircle2, XCircle, ClipboardCheck, Send,
  Bot, Sparkles, CreditCard, Hash, Target, Percent, Clock, MapPin, FileText,
  Handshake, Shield, FileDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, subMonths, isWithinInterval, parseISO, isSameMonth, getDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ClubPageLayout from '@/components/ClubPageLayout';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import ReportingFinancialTab from '@/components/reporting/ReportingFinancialTab';
import ReportingPartnersTab from '@/components/reporting/ReportingPartnersTab';
import ReportingComplianceTab from '@/components/reporting/ReportingComplianceTab';
import VolunteerProfileDialog from '@/components/VolunteerProfileDialog';

// ── Types ───────────────────────────────────────────────────────
interface VolunteerReport {
  id: string; name: string; email: string | null;
  totalSignups: number; totalAssigned: number; totalCheckedIn: number;
  noShows: number; totalEarned: number; tasksWorked: string[]; eventsWorked: string[];
  reliabilityScore: number; avgEarnedPerTask: number;
}

interface TaskReport {
  id: string; title: string; eventTitle: string | null; date: string | null;
  totalSlots: number; signups: number; assigned: number; checkedIn: number;
  noShows: number; compensation: string; totalPaid: number; location: string | null;
  hourConfStatus: string; avgHours: number | null;
}

interface EventReport {
  id: string; title: string; date: string | null;
  totalTasks: number; totalVolunteers: number; checkedIn: number; fillRate: number;
  totalPaid: number; topTask: string | null;
}

type ChartType = 'bar' | 'line' | 'pie' | 'area';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))', 'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
];

const DAY_NAMES: Record<string, string[]> = {
  nl: ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'],
  fr: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
};

const rl = {
  nl: {
    reporting: 'Rapportering', reportBuilder: 'Rapport Builder', filters: 'Filters',
    from: 'Van', to: 'Tot', event: 'Evenement', allEvents: 'Alle evenementen',
    volunteer: 'Vrijwilliger', allVolunteers: 'Alle vrijwilligers',
    compType: 'Vergoedingstype', allTypes: 'Alle types', fixed: 'Vast bedrag', hourly: 'Uurloon',
    location: 'Locatie', allLocations: 'Alle locaties',
    taskStatus: 'Taakstatus', allStatuses: 'Alle statussen', open: 'Open', closed: 'Gesloten',
    chartType: 'Grafiektype', bar: 'Staafdiagram', line: 'Lijndiagram', area: 'Vlakdiagram', pie: 'Taartdiagram',
    paymentStatus: 'Betalingsstatus', paid: 'Betaald', pending: 'Openstaand', failed: 'Mislukt',
    partnerFilter: 'Partner filter', allTasks: 'Alle taken', ownOnly: 'Alleen eigen vrijwilligers', partnerOnly: 'Alleen partner taken',
    searchPlaceholder: 'Zoek op naam of e-mail...', reset: 'Reset',
    volunteers: 'Vrijwilligers', tasks: 'Taken', assignments: 'Toewijzingen',
    checkedIn: 'Ingecheckt', noShows: 'No-shows', attendance: 'Opkomst',
    occupancy: 'Bezetting', paidOut: 'Uitbetaald', outstanding: 'Openstaand',
    avgPerTask: '€/taak gem.', contracts: 'Contracten', partnerStaff: 'Partner mdw',
    overview: 'Overzicht', events: 'Evenementen', financial: 'Financieel',
    partners: 'Partners', compliance: 'Compliance',
    monthlyTrend: 'Maandelijkse trend', monthlySpending: 'Maandelijkse uitgaven (€)',
    perEvent: 'Per evenement', attendanceOverview: 'Opkomst overzicht',
    topVolunteers: 'Top vrijwilligers', dayOfWeek: 'Dag van de week',
    compTypeChart: 'Vergoedingstype', hourConf: 'Uur-bevestigingen',
    approved: 'Goedgekeurd', awaitingLabel: 'In afwachting', disputed: 'Betwist',
    noData: 'Geen data beschikbaar', noDataFound: 'Geen data gevonden',
    exportCsv: 'Exporteer CSV', name: 'Naam', email: 'E-mail',
    assigned: 'Toegewezen', reliability: 'Betrouwbaarheid', earned: 'Verdiend',
    perTaskShort: '€/taak', task: 'Taak', date: 'Datum',
    spots: 'Plaatsen', compensation: 'Vergoeding', hoursStatus: 'Uren status',
    avgHours: 'Gem. uren', popularTask: 'Populairste taak',
    pdfTitle: 'Rapportage Overzicht', pdfPeriod: 'Periode', pdfGenerated: 'Gegenereerd',
    pdfKpiOverview: 'KPI Overzicht', pdfTop10: 'Top 10 Vrijwilligers',
    pdfEvents: 'Evenementen', pdfDownloaded: 'PDF rapport gedownload',
    present: 'Aanwezig', unknown: 'Onbekend',
    aiTitle: 'AI Rapportage Assistent', aiSubtitle: 'Stel een vraag over je club data — inclusief financiën, partners, compliance en meer.',
    aiPlaceholder: 'Stel je vraag...', aiEmpty: 'Stel een vraag om te beginnen...',
    aiAnalyzing: 'Analyseren...',
    aiQ1: 'Hoeveel hebben we deze maand uitgegeven?', aiQ2: 'Welke vrijwilliger heeft de meeste no-shows?',
    aiQ3: 'Op welk evenement zetten we de meeste vrijwilligers in?', aiQ4: 'Wat is ons gemiddeld opkomstpercentage per evenement?',
    aiQ5: 'Wie zijn onze meest betrouwbare vrijwilligers?', aiQ6: 'Welke taken zijn het minst bezet?',
    aiQ7: 'Geef een overzicht van onze maandelijkse kosten', aiQ8: 'Hoeveel contracten zijn al ondertekend?',
    aiQ9: 'Welke partners leveren de meeste medewerkers?', aiQ10: 'Hoeveel vrijwilligers zitten dicht bij de jaargrens?',
    aiQ11: 'Op welke dag van de week plannen we de meeste taken?', aiQ12: 'Hoeveel uur-bevestigingen staan nog open?',
  },
  fr: {
    reporting: 'Rapports', reportBuilder: 'Constructeur de rapports', filters: 'Filtres',
    from: 'De', to: 'À', event: 'Événement', allEvents: 'Tous les événements',
    volunteer: 'Bénévole', allVolunteers: 'Tous les bénévoles',
    compType: 'Type de rémunération', allTypes: 'Tous les types', fixed: 'Montant fixe', hourly: 'Tarif horaire',
    location: 'Lieu', allLocations: 'Tous les lieux',
    taskStatus: 'Statut de tâche', allStatuses: 'Tous les statuts', open: 'Ouvert', closed: 'Fermé',
    chartType: 'Type de graphique', bar: 'Barres', line: 'Lignes', area: 'Aires', pie: 'Camembert',
    paymentStatus: 'Statut de paiement', paid: 'Payé', pending: 'En attente', failed: 'Échoué',
    partnerFilter: 'Filtre partenaire', allTasks: 'Toutes les tâches', ownOnly: 'Propres bénévoles uniquement', partnerOnly: 'Tâches partenaires uniquement',
    searchPlaceholder: 'Rechercher par nom ou e-mail...', reset: 'Réinitialiser',
    volunteers: 'Bénévoles', tasks: 'Tâches', assignments: 'Attributions',
    checkedIn: 'Enregistrés', noShows: 'Absences', attendance: 'Présence',
    occupancy: 'Occupation', paidOut: 'Payé', outstanding: 'En attente',
    avgPerTask: '€/tâche moy.', contracts: 'Contrats', partnerStaff: 'Personnel part.',
    overview: 'Aperçu', events: 'Événements', financial: 'Financier',
    partners: 'Partenaires', compliance: 'Conformité',
    monthlyTrend: 'Tendance mensuelle', monthlySpending: 'Dépenses mensuelles (€)',
    perEvent: 'Par événement', attendanceOverview: 'Aperçu de la présence',
    topVolunteers: 'Top bénévoles', dayOfWeek: 'Jour de la semaine',
    compTypeChart: 'Type de rémunération', hourConf: 'Confirmations d\'heures',
    approved: 'Approuvé', awaitingLabel: 'En attente', disputed: 'Contesté',
    noData: 'Aucune donnée disponible', noDataFound: 'Aucune donnée trouvée',
    exportCsv: 'Exporter CSV', name: 'Nom', email: 'E-mail',
    assigned: 'Attribué', reliability: 'Fiabilité', earned: 'Gagné',
    perTaskShort: '€/tâche', task: 'Tâche', date: 'Date',
    spots: 'Places', compensation: 'Rémunération', hoursStatus: 'Statut heures',
    avgHours: 'Heures moy.', popularTask: 'Tâche populaire',
    pdfTitle: 'Rapport d\'ensemble', pdfPeriod: 'Période', pdfGenerated: 'Généré',
    pdfKpiOverview: 'Aperçu KPI', pdfTop10: 'Top 10 Bénévoles',
    pdfEvents: 'Événements', pdfDownloaded: 'Rapport PDF téléchargé',
    present: 'Présent', unknown: 'Inconnu',
    aiTitle: 'Assistant IA Rapports', aiSubtitle: 'Posez une question sur les données de votre club — finances, partenaires, conformité et plus.',
    aiPlaceholder: 'Posez votre question...', aiEmpty: 'Posez une question pour commencer...',
    aiAnalyzing: 'Analyse en cours...',
    aiQ1: 'Combien avons-nous dépensé ce mois-ci ?', aiQ2: 'Quel bénévole a le plus d\'absences ?',
    aiQ3: 'Quel événement mobilise le plus de bénévoles ?', aiQ4: 'Quel est notre taux de présence moyen par événement ?',
    aiQ5: 'Qui sont nos bénévoles les plus fiables ?', aiQ6: 'Quelles tâches sont les moins occupées ?',
    aiQ7: 'Donnez un aperçu de nos coûts mensuels', aiQ8: 'Combien de contrats sont déjà signés ?',
    aiQ9: 'Quels partenaires fournissent le plus de personnel ?', aiQ10: 'Combien de bénévoles approchent la limite annuelle ?',
    aiQ11: 'Quel jour de la semaine planifions-nous le plus de tâches ?', aiQ12: 'Combien de confirmations d\'heures sont encore ouvertes ?',
  },
  en: {
    reporting: 'Reporting', reportBuilder: 'Report Builder', filters: 'Filters',
    from: 'From', to: 'To', event: 'Event', allEvents: 'All events',
    volunteer: 'Volunteer', allVolunteers: 'All volunteers',
    compType: 'Compensation type', allTypes: 'All types', fixed: 'Fixed amount', hourly: 'Hourly rate',
    location: 'Location', allLocations: 'All locations',
    taskStatus: 'Task status', allStatuses: 'All statuses', open: 'Open', closed: 'Closed',
    chartType: 'Chart type', bar: 'Bar chart', line: 'Line chart', area: 'Area chart', pie: 'Pie chart',
    paymentStatus: 'Payment status', paid: 'Paid', pending: 'Pending', failed: 'Failed',
    partnerFilter: 'Partner filter', allTasks: 'All tasks', ownOnly: 'Own volunteers only', partnerOnly: 'Partner tasks only',
    searchPlaceholder: 'Search by name or email...', reset: 'Reset',
    volunteers: 'Volunteers', tasks: 'Tasks', assignments: 'Assignments',
    checkedIn: 'Checked in', noShows: 'No-shows', attendance: 'Attendance',
    occupancy: 'Occupancy', paidOut: 'Paid out', outstanding: 'Outstanding',
    avgPerTask: '€/task avg.', contracts: 'Contracts', partnerStaff: 'Partner staff',
    overview: 'Overview', events: 'Events', financial: 'Financial',
    partners: 'Partners', compliance: 'Compliance',
    monthlyTrend: 'Monthly trend', monthlySpending: 'Monthly spending (€)',
    perEvent: 'Per event', attendanceOverview: 'Attendance overview',
    topVolunteers: 'Top volunteers', dayOfWeek: 'Day of week',
    compTypeChart: 'Compensation type', hourConf: 'Hour confirmations',
    approved: 'Approved', awaitingLabel: 'Awaiting', disputed: 'Disputed',
    noData: 'No data available', noDataFound: 'No data found',
    exportCsv: 'Export CSV', name: 'Name', email: 'Email',
    assigned: 'Assigned', reliability: 'Reliability', earned: 'Earned',
    perTaskShort: '€/task', task: 'Task', date: 'Date',
    spots: 'Spots', compensation: 'Compensation', hoursStatus: 'Hours status',
    avgHours: 'Avg. hours', popularTask: 'Most popular task',
    pdfTitle: 'Reporting Overview', pdfPeriod: 'Period', pdfGenerated: 'Generated',
    pdfKpiOverview: 'KPI Overview', pdfTop10: 'Top 10 Volunteers',
    pdfEvents: 'Events', pdfDownloaded: 'PDF report downloaded',
    present: 'Present', unknown: 'Unknown',
    aiTitle: 'AI Reporting Assistant', aiSubtitle: 'Ask a question about your club data — including finances, partners, compliance and more.',
    aiPlaceholder: 'Ask your question...', aiEmpty: 'Ask a question to get started...',
    aiAnalyzing: 'Analyzing...',
    aiQ1: 'How much did we spend this month?', aiQ2: 'Which volunteer has the most no-shows?',
    aiQ3: 'Which event uses the most volunteers?', aiQ4: 'What is our average attendance rate per event?',
    aiQ5: 'Who are our most reliable volunteers?', aiQ6: 'Which tasks are least filled?',
    aiQ7: 'Give an overview of our monthly costs', aiQ8: 'How many contracts are already signed?',
    aiQ9: 'Which partners provide the most staff?', aiQ10: 'How many volunteers are close to the annual limit?',
    aiQ11: 'On which day of the week do we schedule the most tasks?', aiQ12: 'How many hour confirmations are still open?',
  },
};

const ReportingDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const L = rl[language];
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);

  // Raw data
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [hourConfs, setHourConfs] = useState<any[]>([]);
  const [sepaItems, setSepaItems] = useState<any[]>([]);
  // New data
  const [signatureRequests, setSignatureRequests] = useState<any[]>([]);
  const [complianceDeclarations, setComplianceDeclarations] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerMembers, setPartnerMembers] = useState<any[]>([]);
  const [partnerTaskAssignments, setPartnerTaskAssignments] = useState<any[]>([]);
  const [sepaBatches, setSepaBatches] = useState<any[]>([]);
  const [loyaltyEnrollments, setLoyaltyEnrollments] = useState<any[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState<Date>(subMonths(new Date(), 3));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('all');
  const [selectedCompType, setSelectedCompType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });
  const [chartType, setChartType] = useState<ChartType>('bar');

  // AI
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);
  const [selectedVolunteerProfile, setSelectedVolunteerProfile] = useState<VolunteerReport | null>(null);

  // ── Init ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }
      const { data: clubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id).limit(1);
      let cid = clubs?.[0]?.id;
      if (!cid) {
        const { data: members } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id).limit(1);
        cid = members?.[0]?.club_id;
      }
      if (!cid) { navigate('/club-dashboard'); return; }
      setClubId(cid);
    })();
  }, [navigate]);

  // ── Load data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      setLoading(true);
      const [tasksRes, eventsRes, signupsRes, paymentsRes, ticketsRes, hourConfsRes, sepaRes,
        sigReqRes, complDeclRes, partnersRes, partnerMembersRes, partnerAssignRes, sepaBatchRes, loyaltyRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('club_id', clubId),
        supabase.from('events').select('*').eq('club_id', clubId),
        supabase.from('task_signups').select('*'),
        supabase.from('volunteer_payments').select('*').eq('club_id', clubId),
        supabase.from('volunteer_tickets').select('*').eq('club_id', clubId),
        supabase.from('hour_confirmations').select('*'),
        supabase.from('sepa_batch_items').select('*'),
        supabase.from('signature_requests').select('*'),
        supabase.from('compliance_declarations').select('*'),
        supabase.from('external_partners').select('*').eq('club_id', clubId),
        supabase.from('partner_members').select('*'),
        supabase.from('partner_task_assignments').select('*'),
        supabase.from('sepa_batches').select('*').eq('club_id', clubId),
        supabase.from('loyalty_enrollments').select('*'),
      ]);

      const taskData = tasksRes.data || [];
      setTasks(taskData);
      setEvents(eventsRes.data || []);
      setPayments(paymentsRes.data || []);
      setTickets(ticketsRes.data || []);
      setPartners(partnersRes.data || []);
      setSepaBatches(sepaBatchRes.data || []);

      const taskIds = new Set(taskData.map((t: any) => t.id));
      setSignups((signupsRes.data || []).filter((s: any) => taskIds.has(s.task_id)));
      setHourConfs((hourConfsRes.data || []).filter((h: any) => taskIds.has(h.task_id)));
      setSepaItems((sepaRes.data || []).filter((s: any) => taskIds.has(s.task_id)));
      setSignatureRequests((sigReqRes.data || []).filter((s: any) => taskIds.has(s.task_id)));
      setPartnerTaskAssignments((partnerAssignRes.data || []).filter((a: any) => taskIds.has(a.task_id)));

      // Filter partner members to club partners
      const partnerIds = new Set((partnersRes.data || []).map((p: any) => p.id));
      setPartnerMembers((partnerMembersRes.data || []).filter((m: any) => partnerIds.has(m.partner_id)));

      // Filter compliance declarations to club volunteers
      const volIds = [...new Set((signupsRes.data || []).filter((s: any) => taskIds.has(s.task_id)).map((s: any) => s.volunteer_id))];
      const volIdSet = new Set(volIds);
      setComplianceDeclarations((complDeclRes.data || []).filter((d: any) => volIdSet.has(d.volunteer_id)));
      setLoyaltyEnrollments((loyaltyRes.data || []).filter((e: any) => volIdSet.has(e.volunteer_id)));

      if (volIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', volIds);
        setProfiles(profs || []);
      }
      setLoading(false);
    };
    load();
  }, [clubId]);

  // ── Derived data ───────────────────────────────────────────────
  const taskMap = useMemo(() => Object.fromEntries(tasks.map((t: any) => [t.id, t])), [tasks]);
  const eventMap = useMemo(() => Object.fromEntries(events.map((e: any) => [e.id, e])), [events]);
  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p: any) => [p.id, p])), [profiles]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set(tasks.map((t: any) => t.location).filter(Boolean));
    return [...locs].sort();
  }, [tasks]);

  // Date + multi-filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      const d = t.task_date ? parseISO(t.task_date) : null;
      if (d && !isWithinInterval(d, { start: dateFrom, end: dateTo })) return false;
      if (selectedEventId !== 'all' && t.event_id !== selectedEventId) return false;
      if (selectedCompType !== 'all' && t.compensation_type !== selectedCompType) return false;
      if (selectedLocation !== 'all' && t.location !== selectedLocation) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      if (selectedPartnerFilter === 'own' && t.partner_only) return false;
      if (selectedPartnerFilter === 'partner' && !t.partner_only) return false;
      if (selectedPartnerFilter !== 'all' && selectedPartnerFilter !== 'own' && selectedPartnerFilter !== 'partner' && t.assigned_partner_id !== selectedPartnerFilter) return false;
      return true;
    });
  }, [tasks, dateFrom, dateTo, selectedEventId, selectedCompType, selectedLocation, selectedStatus, selectedPartnerFilter]);

  const filteredTaskIds = useMemo(() => new Set(filteredTasks.map((t: any) => t.id)), [filteredTasks]);

  const filteredSignups = useMemo(() => {
    return signups.filter((s: any) => {
      if (!filteredTaskIds.has(s.task_id)) return false;
      if (selectedVolunteerId !== 'all' && s.volunteer_id !== selectedVolunteerId) return false;
      return true;
    });
  }, [signups, filteredTaskIds, selectedVolunteerId]);

  const filteredPayments = useMemo(() => {
    let fp = payments.filter((p: any) => filteredTaskIds.has(p.task_id));
    if (selectedPaymentStatus !== 'all') fp = fp.filter((p: any) => p.status === selectedPaymentStatus);
    return fp;
  }, [payments, filteredTaskIds, selectedPaymentStatus]);

  // ── Volunteer reports ──────────────────────────────────────────
  const volunteerReports: VolunteerReport[] = useMemo(() => {
    const map = new Map<string, VolunteerReport>();
    filteredSignups.forEach((s: any) => {
      const p = profileMap[s.volunteer_id];
      if (!map.has(s.volunteer_id)) {
        map.set(s.volunteer_id, {
          id: s.volunteer_id, name: p?.full_name || L.unknown, email: p?.email || null,
          totalSignups: 0, totalAssigned: 0, totalCheckedIn: 0, noShows: 0,
          totalEarned: 0, tasksWorked: [], eventsWorked: [],
          reliabilityScore: 0, avgEarnedPerTask: 0,
        });
      }
      const r = map.get(s.volunteer_id)!;
      r.totalSignups++;
      if (s.status === 'assigned') {
        r.totalAssigned++;
        const task = taskMap[s.task_id];
        if (task) {
          r.tasksWorked.push(task.title);
          if (task.event_id && eventMap[task.event_id]) r.eventsWorked.push(eventMap[task.event_id].title);
        }
      }
    });
    tickets.forEach((t: any) => {
      if (!filteredTaskIds.has(t.task_id)) return;
      const r = map.get(t.volunteer_id);
      if (r && t.status === 'checked_in') r.totalCheckedIn++;
    });
    filteredPayments.forEach((p: any) => {
      const r = map.get(p.volunteer_id);
      if (r && (p.status === 'paid' || p.status === 'succeeded')) r.totalEarned += Number(p.amount);
    });
    map.forEach(r => {
      r.noShows = Math.max(0, r.totalAssigned - r.totalCheckedIn);
      r.eventsWorked = [...new Set(r.eventsWorked)];
      r.reliabilityScore = r.totalAssigned > 0 ? Math.round((r.totalCheckedIn / r.totalAssigned) * 100) : 0;
      r.avgEarnedPerTask = r.totalAssigned > 0 ? Math.round((r.totalEarned / r.totalAssigned) * 100) / 100 : 0;
    });
    let results = Array.from(map.values());
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(r => r.name.toLowerCase().includes(q) || (r.email && r.email.toLowerCase().includes(q)));
    }
    return results.sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [filteredSignups, profileMap, taskMap, eventMap, tickets, filteredPayments, filteredTaskIds, searchQuery]);

  // ── Task reports ───────────────────────────────────────────────
  const taskReports: TaskReport[] = useMemo(() => {
    return filteredTasks.map((t: any) => {
      const tSignups = signups.filter((s: any) => s.task_id === t.id);
      const assigned = tSignups.filter((s: any) => s.status === 'assigned');
      const tTickets = tickets.filter((tk: any) => tk.task_id === t.id);
      const checkedIn = tTickets.filter((tk: any) => tk.status === 'checked_in').length;
      const tPayments = payments.filter((p: any) => p.task_id === t.id && (p.status === 'paid' || p.status === 'succeeded'));
      const event = t.event_id ? eventMap[t.event_id] : null;
      const tHourConfs = hourConfs.filter((h: any) => h.task_id === t.id);
      const approvedHours = tHourConfs.filter((h: any) => h.status === 'approved');
      const avgHours = approvedHours.length > 0
        ? Math.round(approvedHours.reduce((s: number, h: any) => s + Number(h.final_hours || 0), 0) / approvedHours.length * 10) / 10
        : null;
      const pendingConfs = tHourConfs.filter((h: any) => h.status === 'pending').length;
      const hourConfStatus = tHourConfs.length === 0 ? '—' : pendingConfs > 0 ? `${pendingConfs} ${L.pending.toLowerCase()}` : L.approved;

      return {
        id: t.id, title: t.title, eventTitle: event?.title || null, date: t.task_date,
        totalSlots: t.spots_available || 0, signups: tSignups.length, assigned: assigned.length,
        checkedIn, noShows: Math.max(0, assigned.length - checkedIn),
        compensation: t.compensation_type === 'hourly' ? `€${t.hourly_rate}/u` : `€${t.expense_amount || 0}`,
        totalPaid: tPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0),
        location: t.location, hourConfStatus, avgHours,
      };
    }).sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredTasks, signups, tickets, payments, eventMap, hourConfs]);

  // ── Event reports ──────────────────────────────────────────────
  const eventReports: EventReport[] = useMemo(() => {
    const filtered = events.filter((e: any) => {
      const d = e.event_date ? parseISO(e.event_date) : null;
      if (d && !isWithinInterval(d, { start: dateFrom, end: dateTo })) return false;
      if (selectedEventId !== 'all' && e.id !== selectedEventId) return false;
      return true;
    });
    return filtered.map((e: any) => {
      const eTasks = tasks.filter((t: any) => t.event_id === e.id);
      const eTaskIds = new Set(eTasks.map((t: any) => t.id));
      const eSignups = signups.filter((s: any) => eTaskIds.has(s.task_id) && s.status === 'assigned');
      const eTickets = tickets.filter((tk: any) => eTaskIds.has(tk.task_id) && tk.status === 'checked_in');
      const totalSlots = eTasks.reduce((s: number, t: any) => s + (t.spots_available || 0), 0);
      const ePaid = payments.filter((p: any) => eTaskIds.has(p.task_id) && (p.status === 'paid' || p.status === 'succeeded'))
        .reduce((s: number, p: any) => s + Number(p.amount), 0);
      const taskSignupCounts = eTasks.map((t: any) => ({
        title: t.title, count: signups.filter((s: any) => s.task_id === t.id).length,
      })).sort((a: any, b: any) => b.count - a.count);
      return {
        id: e.id, title: e.title, date: e.event_date,
        totalTasks: eTasks.length, totalVolunteers: eSignups.length, checkedIn: eTickets.length,
        fillRate: totalSlots > 0 ? Math.round((eSignups.length / totalSlots) * 100) : 0,
        totalPaid: ePaid, topTask: taskSignupCounts[0]?.title || null,
      };
    }).sort((a, b) => {
      if (!a.date && !b.date) return 0; if (!a.date) return 1; if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [events, tasks, signups, tickets, payments, dateFrom, dateTo, selectedEventId]);

  // ── KPIs ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalVolunteers = volunteerReports.length;
    const totalTasks = filteredTasks.length;
    const totalAssigned = volunteerReports.reduce((s, r) => s + r.totalAssigned, 0);
    const totalCheckedIn = volunteerReports.reduce((s, r) => s + r.totalCheckedIn, 0);
    const totalNoShows = volunteerReports.reduce((s, r) => s + r.noShows, 0);
    const totalPaid = filteredPayments.filter(p => p.status === 'paid' || p.status === 'succeeded').reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalPending = filteredPayments.filter(p => p.status === 'pending').reduce((s: number, p: any) => s + Number(p.amount), 0);
    const attendanceRate = totalAssigned > 0 ? Math.round((totalCheckedIn / totalAssigned) * 100) : 0;
    const avgPerVolunteer = totalVolunteers > 0 ? Math.round(totalAssigned / totalVolunteers * 10) / 10 : 0;
    const totalSepa = sepaItems.filter(s => filteredTaskIds.has(s.task_id)).reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    const totalSlots = filteredTasks.reduce((s: number, t: any) => s + (t.spots_available || 0), 0);
    const fillRate = totalSlots > 0 ? Math.round((totalAssigned / totalSlots) * 100) : 0;
    const now = new Date();
    const thisMonthPaid = filteredPayments
      .filter((p: any) => (p.status === 'paid' || p.status === 'succeeded') && p.paid_at && isSameMonth(parseISO(p.paid_at), now))
      .reduce((s: number, p: any) => s + Number(p.amount), 0);
    const avgCostPerTask = totalTasks > 0 ? Math.round(totalPaid / totalTasks * 100) / 100 : 0;
    const contractsSigned = signatureRequests.filter(s => s.status === 'completed').length;
    const contractsTotal = signatureRequests.length;
    const contractsPercent = contractsTotal > 0 ? Math.round((contractsSigned / contractsTotal) * 100) : 0;
    const activePartnerMembers = partnerTaskAssignments.filter(a => filteredTaskIds.has(a.task_id)).length;

    return {
      totalVolunteers, totalTasks, totalAssigned, totalCheckedIn, totalNoShows,
      totalPaid, totalPending, attendanceRate, avgPerVolunteer, totalSepa,
      fillRate, thisMonthPaid, avgCostPerTask, totalSlots,
      contractsPercent, activePartnerMembers,
    };
  }, [volunteerReports, filteredTasks, filteredPayments, sepaItems, filteredTaskIds, signatureRequests, partnerTaskAssignments]);

  // ── Chart data ─────────────────────────────────────────────────
  const signupsPerEventChart = useMemo(() =>
    eventReports.slice(0, 15).map(e => ({
      name: e.title.length > 20 ? e.title.slice(0, 18) + '…' : e.title,
      [L.assigned]: e.totalVolunteers, [L.checkedIn]: e.checkedIn,
    })), [eventReports]);

  const compensationPieData = useMemo(() => {
    const byType: Record<string, number> = {};
    filteredTasks.forEach((t: any) => {
      const label = t.compensation_type === 'hourly' ? L.hourly : L.fixed;
      byType[label] = (byType[label] || 0) + 1;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [filteredTasks]);

  const monthlyTrendData = useMemo(() => {
    const months: Record<string, { month: string; signups: number; checkedIn: number; paid: number }> = {};
    filteredSignups.forEach((s: any) => {
      const task = taskMap[s.task_id];
      if (!task?.task_date) return;
      const m = format(parseISO(task.task_date), 'yyyy-MM');
      if (!months[m]) months[m] = { month: m, signups: 0, checkedIn: 0, paid: 0 };
      months[m].signups++;
    });
    tickets.forEach((t: any) => {
      const task = taskMap[t.task_id];
      if (!task?.task_date || !filteredTaskIds.has(t.task_id)) return;
      const m = format(parseISO(task.task_date), 'yyyy-MM');
      if (months[m] && t.status === 'checked_in') months[m].checkedIn++;
    });
    filteredPayments.forEach((p: any) => {
      if (p.status !== 'paid' && p.status !== 'succeeded') return;
      const task = taskMap[p.task_id];
      if (!task?.task_date) return;
      const m = format(parseISO(task.task_date), 'yyyy-MM');
      if (months[m]) months[m].paid += Number(p.amount);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredSignups, tickets, filteredPayments, taskMap, filteredTaskIds]);

  const topVolunteersChart = useMemo(() =>
    volunteerReports.slice(0, 10).map(v => ({
      name: v.name.length > 15 ? v.name.slice(0, 13) + '…' : v.name,
      [L.tasks]: v.totalAssigned, [L.earned]: v.totalEarned,
    })), [volunteerReports]);

  const noShowRateChart = useMemo(() => {
    const total = kpis.totalAssigned;
    if (total === 0) return [];
    return [
      { name: L.present, value: kpis.totalCheckedIn },
      { name: 'No-show', value: kpis.totalNoShows },
      { name: L.unknown, value: Math.max(0, total - kpis.totalCheckedIn - kpis.totalNoShows) },
    ];
  }, [kpis]);

  const monthlySpendingChart = useMemo(() => {
    const months: Record<string, number> = {};
    filteredPayments.filter((p: any) => (p.status === 'paid' || p.status === 'succeeded') && p.paid_at).forEach((p: any) => {
      const m = format(parseISO(p.paid_at), 'yyyy-MM');
      months[m] = (months[m] || 0) + Number(p.amount);
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, bedrag]) => ({ month, [L.paidOut]: Math.round(bedrag * 100) / 100 }));
  }, [filteredPayments]);

  const volunteersByEventChart = useMemo(() => {
    return eventReports.slice(0, 10).map(e => ({
      name: e.title.length > 18 ? e.title.slice(0, 16) + '…' : e.title,
      [L.volunteers]: e.totalVolunteers, [L.occupancy]: e.fillRate,
    }));
  }, [eventReports]);

  // Day of week analysis
  const dayOfWeekChart = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    filteredTasks.forEach((t: any) => {
      if (t.task_date) counts[getDay(parseISO(t.task_date))]++;
    });
    return (DAY_NAMES[language] || DAY_NAMES.nl).map((name, i) => ({ name, [L.tasks]: counts[i] }));
  }, [filteredTasks]);

  // Hour confirmation stats
  const hourConfStats = useMemo(() => {
    const filtered = hourConfs.filter(h => filteredTaskIds.has(h.task_id));
    return {
      total: filtered.length,
      approved: filtered.filter(h => h.status === 'approved').length,
      pending: filtered.filter(h => h.status === 'pending').length,
      disputed: filtered.filter(h => h.status === 'disputed').length,
    };
  }, [hourConfs, filteredTaskIds]);

  // ── AI data summary ───────────────────────────────────────────
  const buildDataSummary = () => {
    const lines = [
      `Periode: ${format(dateFrom, 'dd/MM/yyyy')} - ${format(dateTo, 'dd/MM/yyyy')}`,
      `Totaal taken: ${kpis.totalTasks}`, `Totaal vrijwilligers: ${kpis.totalVolunteers}`,
      `Totaal toewijzingen: ${kpis.totalAssigned}`, `Totaal ingecheckt: ${kpis.totalCheckedIn}`,
      `Totaal no-shows: ${kpis.totalNoShows}`, `Opkomstpercentage: ${kpis.attendanceRate}%`,
      `Totaal uitbetaald: €${kpis.totalPaid.toFixed(2)}`, `Openstaande betalingen: €${kpis.totalPending.toFixed(2)}`,
      `SEPA uitbetalingen: €${kpis.totalSepa.toFixed(2)}`, `Gem. per taak: €${kpis.avgCostPerTask.toFixed(2)}`,
      `Bezettingsgraad: ${kpis.fillRate}%`, `Deze maand: €${kpis.thisMonthPaid.toFixed(2)}`,
      `Contracten ondertekend: ${kpis.contractsPercent}%`, `Partner medewerkers ingezet: ${kpis.activePartnerMembers}`,
      '',
      'TOP 10 VRIJWILLIGERS:',
      ...volunteerReports.slice(0, 10).map(v =>
        `- ${v.name}: ${v.totalAssigned} taken, ${v.totalCheckedIn} ingecheckt, ${v.noShows} no-shows, €${v.totalEarned.toFixed(2)} verdiend, betrouwbaarheid ${v.reliabilityScore}%, evenementen: ${v.eventsWorked.join(', ') || 'geen'}`
      ),
      '', 'EVENEMENTEN:',
      ...eventReports.map(e =>
        `- ${e.title} (${e.date ? format(parseISO(e.date), 'dd/MM/yyyy') : '?'}): ${e.totalTasks} taken, ${e.totalVolunteers} vrijwilligers, ${e.checkedIn} ingecheckt, bezetting ${e.fillRate}%, €${e.totalPaid.toFixed(2)}`
      ),
      '', 'TAKEN (recent):',
      ...taskReports.slice(0, 20).map(t =>
        `- ${t.title} (${t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '?'}): ${t.assigned}/${t.totalSlots} pl, ${t.checkedIn} in, ${t.noShows} ns, ${t.compensation}, €${t.totalPaid.toFixed(2)}, uren: ${t.hourConfStatus}`
      ),
      '', 'PARTNERS:',
      ...partners.map((p: any) => {
        const members = partnerMembers.filter((m: any) => m.partner_id === p.id);
        const assignments = partnerTaskAssignments.filter((a: any) => members.some((m: any) => m.id === a.partner_member_id));
        return `- ${p.name} (${p.category}): ${members.length} medewerkers, ${assignments.length} ingezet, ${members.filter((m: any) => m.user_id).length} met account`;
      }),
      '', 'COMPLIANCE:',
      `Uur-bevestigingen: ${hourConfStats.total} totaal, ${hourConfStats.approved} goedgekeurd, ${hourConfStats.pending} in afwachting`,
      `Contracten: ${signatureRequests.filter(s => s.status === 'completed').length}/${signatureRequests.length} ondertekend`,
      '', 'MAANDELIJKSE UITGAVEN:',
      ...monthlySpendingChart.map(m => `- ${m.month}: €${Number(m[L.paidOut] || 0).toFixed(2)}`),
      '', 'DAY DISTRIBUTION:',
      ...dayOfWeekChart.map(d => `- ${d.name}: ${d[L.tasks]} tasks`),
    ];
    return lines.join('\n');
  };

  // ── AI chat ───────────────────────────────────────────────────
  const handleAiQuestion = async () => {
    if (!aiQuestion.trim() || aiLoading) return;
    const question = aiQuestion.trim();
    setAiQuestion('');
    setAiMessages(prev => [...prev, { role: 'user', content: question }]);
    setAiLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reporting-ai`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ question, dataSummary: buildDataSummary() }) }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Fout' }));
        toast.error(err.error || 'AI fout'); setAiLoading(false); return;
      }
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let assistantSoFar = '', textBuffer = '';
      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setAiMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };
      let done = false;
      while (!done) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        textBuffer += decoder.decode(value, { stream: true });
        let ni: number;
        while ((ni = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, ni); textBuffer = textBuffer.slice(ni + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const js = line.slice(6).trim();
          if (js === '[DONE]') { done = true; break; }
          try { const p = JSON.parse(js); const c = p.choices?.[0]?.delta?.content; if (c) upsert(c); }
          catch { textBuffer = line + '\n' + textBuffer; break; }
        }
      }
    } catch (e) { toast.error('AI assistent fout'); console.error(e); }
    setAiLoading(false);
  };

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  // ── PDF export ─────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(L.pdfTitle, 14, 20);
    doc.setFontSize(10);
    doc.text(`${L.pdfPeriod}: ${format(dateFrom, 'dd/MM/yyyy')} - ${format(dateTo, 'dd/MM/yyyy')}`, 14, 28);
    doc.text(`${L.pdfGenerated}: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 34);

    let y = 44;
    doc.setFontSize(12);
    doc.text('KPI Overzicht', 14, y); y += 8;
    doc.setFontSize(9);
    const kpiLines = [
      `Vrijwilligers: ${kpis.totalVolunteers}`, `Taken: ${kpis.totalTasks}`,
      `Toewijzingen: ${kpis.totalAssigned}`, `Ingecheckt: ${kpis.totalCheckedIn}`,
      `No-shows: ${kpis.totalNoShows}`, `Opkomst: ${kpis.attendanceRate}%`,
      `Bezetting: ${kpis.fillRate}%`, `Uitbetaald: €${kpis.totalPaid.toFixed(2)}`,
      `Openstaand: €${kpis.totalPending.toFixed(2)}`, `SEPA: €${kpis.totalSepa.toFixed(2)}`,
      `Contracten: ${kpis.contractsPercent}%`, `Partner mdw: ${kpis.activePartnerMembers}`,
    ];
    kpiLines.forEach(l => { doc.text(l, 14, y); y += 5; });

    y += 4; doc.setFontSize(12);
    doc.text('Top 10 Vrijwilligers', 14, y); y += 7;
    doc.setFontSize(8);
    volunteerReports.slice(0, 10).forEach(v => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(`${v.name}: ${v.totalAssigned} taken, ${v.totalCheckedIn} ingecheckt, ${v.noShows} no-shows, €${v.totalEarned.toFixed(2)}, betrouwbaarheid ${v.reliabilityScore}%`, 14, y);
      y += 4.5;
    });

    y += 4; doc.setFontSize(12);
    if (y > 260) { doc.addPage(); y = 20; }
    doc.text('Evenementen', 14, y); y += 7;
    doc.setFontSize(8);
    eventReports.forEach(e => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(`${e.title}: ${e.totalTasks} taken, ${e.totalVolunteers} vrw, bezetting ${e.fillRate}%, €${e.totalPaid.toFixed(2)}`, 14, y);
      y += 4.5;
    });

    doc.save(`rapportage-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF rapport gedownload');
  };

  // ── Date picker ────────────────────────────────────────────────
  const DatePicker = ({ date, onChange }: { date: Date; onChange: (d: Date) => void; label?: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start text-left font-normal gap-2", !date && "text-muted-foreground")}>
          <Calendar className="w-4 h-4" />{format(date, 'dd MMM yyyy', { locale: nl })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent mode="single" selected={date} onSelect={(d) => d && onChange(d)} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  // ── Chart renderer ─────────────────────────────────────────────
  const renderChart = (data: any[], dataKeys: string[], xKey: string) => {
    if (!data.length) return <p className="text-sm text-muted-foreground text-center py-8">Geen data beschikbaar</p>;
    switch (chartType) {
      case 'line':
        return (<ResponsiveContainer width="100%" height={300}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} /><Legend />{dataKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />)}</LineChart></ResponsiveContainer>);
      case 'area':
        return (<ResponsiveContainer width="100%" height={300}><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} /><Legend />{dataKeys.map((k, i) => <Area key={k} type="monotone" dataKey={k} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />)}</AreaChart></ResponsiveContainer>);
      case 'pie':
        return (<ResponsiveContainer width="100%" height={300}><RechartsPie><Pie data={data.map((d) => ({ name: d[xKey], value: d[dataKeys[0]] || 0 }))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></RechartsPie></ResponsiveContainer>);
      default:
        return (<ResponsiveContainer width="100%" height={300}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} /><Legend />{dataKeys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}</BarChart></ResponsiveContainer>);
    }
  };

  // ── CSV export ─────────────────────────────────────────────────
  const exportCSV = (rows: Record<string, any>[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(';'), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── AI presets ─────────────────────────────────────────────────
  const aiPresets = [
    'Hoeveel hebben we deze maand uitgegeven?',
    'Welke vrijwilliger heeft de meeste no-shows?',
    'Op welk evenement zetten we de meeste vrijwilligers in?',
    'Wat is ons gemiddeld opkomstpercentage per evenement?',
    'Wie zijn onze meest betrouwbare vrijwilligers?',
    'Welke taken zijn het minst bezet?',
    'Geef een overzicht van onze maandelijkse kosten',
    'Hoeveel contracten zijn al ondertekend?',
    'Welke partners leveren de meeste medewerkers?',
    'Hoeveel vrijwilligers zitten dicht bij de jaargrens?',
    'Op welke dag van de week plannen we de meeste taken?',
    'Hoeveel uur-bevestigingen staan nog open?',
  ];

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>);
  }

  return (
    <ClubPageLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Rapportering</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/report-builder')}>
              <FileText className="w-4 h-4" /> Rapport Builder
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPDF}>
              <FileDown className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>
        {/* ── Filters ─────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Van</label><DatePicker date={dateFrom} onChange={setDateFrom} /></div>
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Tot</label><DatePicker date={dateTo} onChange={setDateTo} /></div>
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Evenement</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}><SelectTrigger><SelectValue placeholder="Alle evenementen" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Alle evenementen</SelectItem>{events.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Vrijwilliger</label>
                <Select value={selectedVolunteerId} onValueChange={setSelectedVolunteerId}><SelectTrigger><SelectValue placeholder="Alle vrijwilligers" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Alle vrijwilligers</SelectItem>{profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Vergoedingstype</label>
                <Select value={selectedCompType} onValueChange={setSelectedCompType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Alle types</SelectItem><SelectItem value="fixed">Vast bedrag</SelectItem><SelectItem value="hourly">Uurloon</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Locatie</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Alle locaties</SelectItem>{uniqueLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Taakstatus</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Alle statussen</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Gesloten</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Grafiektype</label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="bar">Staafdiagram</SelectItem><SelectItem value="line">Lijndiagram</SelectItem><SelectItem value="area">Vlakdiagram</SelectItem><SelectItem value="pie">Taartdiagram</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Betalingsstatus</label>
                <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Alle statussen</SelectItem><SelectItem value="paid">Betaald</SelectItem><SelectItem value="pending">Openstaand</SelectItem><SelectItem value="failed">Mislukt</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Partner filter</label>
                <Select value={selectedPartnerFilter} onValueChange={setSelectedPartnerFilter}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle taken</SelectItem>
                    <SelectItem value="own">Alleen eigen vrijwilligers</SelectItem>
                    <SelectItem value="partner">Alleen partner taken</SelectItem>
                    {partners.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent></Select>
              </div>
              <div className="space-y-1 col-span-1 sm:col-span-2 flex items-end gap-2">
                <Input placeholder="Zoek op naam of e-mail..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-xs" />
                <Button variant="outline" size="sm" onClick={() => {
                  setDateFrom(subMonths(new Date(), 3)); setDateTo(new Date());
                  setSelectedEventId('all'); setSelectedVolunteerId('all');
                  setSelectedCompType('all'); setSelectedLocation('all');
                  setSelectedStatus('all'); setSearchQuery('');
                  setSelectedPaymentStatus('all'); setSelectedPartnerFilter('all');
                }}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── KPI Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { icon: Users, label: 'Vrijwilligers', value: kpis.totalVolunteers, color: 'text-primary' },
            { icon: Hash, label: 'Taken', value: kpis.totalTasks, color: 'text-primary' },
            { icon: ClipboardCheck, label: 'Toewijzingen', value: kpis.totalAssigned, color: 'text-primary' },
            { icon: CheckCircle2, label: 'Ingecheckt', value: kpis.totalCheckedIn, color: 'text-emerald-500' },
            { icon: XCircle, label: 'No-shows', value: kpis.totalNoShows, color: 'text-destructive' },
            { icon: Percent, label: 'Opkomst', value: `${kpis.attendanceRate}%`, color: 'text-primary' },
            { icon: Target, label: 'Bezetting', value: `${kpis.fillRate}%`, color: 'text-primary' },
            { icon: Euro, label: 'Uitbetaald', value: `€${kpis.totalPaid.toFixed(0)}`, color: 'text-primary' },
            { icon: CreditCard, label: 'Openstaand', value: `€${kpis.totalPending.toFixed(0)}`, color: 'text-amber-500' },
            { icon: Clock, label: '€/taak gem.', value: `€${kpis.avgCostPerTask.toFixed(0)}`, color: 'text-primary' },
            { icon: FileText, label: 'Contracten', value: `${kpis.contractsPercent}%`, color: 'text-primary' },
            { icon: Handshake, label: 'Partner mdw', value: kpis.activePartnerMembers, color: 'text-primary' },
          ].map((kpi, i) => (
            <Card key={i}><CardContent className="pt-4 pb-3 text-center">
              <kpi.icon className={cn("w-5 h-5 mx-auto mb-1", kpi.color)} />
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full md:min-w-0">
              <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="w-3.5 h-3.5" />Overzicht</TabsTrigger>
              <TabsTrigger value="volunteers" className="gap-1.5 text-xs sm:text-sm"><Users className="w-3.5 h-3.5" />Vrijwilligers</TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm"><Calendar className="w-3.5 h-3.5" />Taken</TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5 text-xs sm:text-sm"><PieChart className="w-3.5 h-3.5" />Evenementen</TabsTrigger>
              <TabsTrigger value="financial" className="gap-1.5 text-xs sm:text-sm"><Euro className="w-3.5 h-3.5" />Financieel</TabsTrigger>
              <TabsTrigger value="partners" className="gap-1.5 text-xs sm:text-sm"><Handshake className="w-3.5 h-3.5" />Partners</TabsTrigger>
              <TabsTrigger value="compliance" className="gap-1.5 text-xs sm:text-sm"><Shield className="w-3.5 h-3.5" />Compliance</TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm"><Bot className="w-3.5 h-3.5" />AI</TabsTrigger>
            </TabsList>
          </div>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-base">Maandelijkse trend</CardTitle></CardHeader>
                <CardContent>{renderChart(monthlyTrendData, ['signups', 'checkedIn'], 'month')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Maandelijkse uitgaven (€)</CardTitle></CardHeader>
                <CardContent>{renderChart(monthlySpendingChart, ['Bedrag'], 'month')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Per evenement</CardTitle></CardHeader>
                <CardContent>{renderChart(signupsPerEventChart, ['Toegewezen', 'Ingecheckt'], 'name')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Opkomst overzicht</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie><Pie data={noShowRateChart} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {noShowRateChart.map((_, i) => <Cell key={i} fill={[COLORS[1], COLORS[4], COLORS[3]][i]} />)}
                    </Pie><Tooltip /><Legend /></RechartsPie>
                  </ResponsiveContainer>
                </CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Top vrijwilligers</CardTitle></CardHeader>
                <CardContent>{renderChart(topVolunteersChart, ['Taken', 'Verdiend'], 'name')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Dag van de week</CardTitle></CardHeader>
                <CardContent>{renderChart(dayOfWeekChart, ['Taken'], 'name')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Vergoedingstype</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie><Pie data={compensationPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {compensationPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie><Tooltip /><Legend /></RechartsPie>
                  </ResponsiveContainer>
                </CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Uur-bevestigingen</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-2xl font-bold text-foreground">{hourConfStats.approved}</p><p className="text-xs text-muted-foreground">Goedgekeurd</p></div>
                    <div><p className="text-2xl font-bold text-amber-500">{hourConfStats.pending}</p><p className="text-xs text-muted-foreground">In afwachting</p></div>
                    <div><p className="text-2xl font-bold text-destructive">{hourConfStats.disputed}</p><p className="text-xs text-muted-foreground">Betwist</p></div>
                  </div>
                </CardContent></Card>
            </div>
          </TabsContent>

          {/* VOLUNTEERS */}
          <TabsContent value="volunteers" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(volunteerReports.map(v => ({
                Naam: v.name, Email: v.email || '', Inschrijvingen: v.totalSignups, Toegewezen: v.totalAssigned,
                Ingecheckt: v.totalCheckedIn, NoShows: v.noShows, Betrouwbaarheid: `${v.reliabilityScore}%`,
                Verdiend: `€${v.totalEarned.toFixed(2)}`, GemPerTaak: `€${v.avgEarnedPerTask.toFixed(2)}`,
                Evenementen: v.eventsWorked.join(', '),
              })), 'vrijwilligers-rapport')}>
                <Download className="w-4 h-4" /> Exporteer CSV
              </Button>
            </div>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Naam</TableHead><TableHead>E-mail</TableHead>
                <TableHead className="text-center">Toegewezen</TableHead>
                <TableHead className="text-center">Ingecheckt</TableHead><TableHead className="text-center">No-shows</TableHead>
                <TableHead className="text-center">Betrouwbaarheid</TableHead>
                <TableHead className="text-right">Verdiend</TableHead><TableHead className="text-right">€/taak</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                 {volunteerReports.length === 0 ? (
                   <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen data gevonden</TableCell></TableRow>
                 ) : volunteerReports.map(v => (
                   <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedVolunteerProfile(v)}>
                     <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{v.email || '—'}</TableCell>
                    <TableCell className="text-center">{v.totalAssigned}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{v.totalCheckedIn}</Badge></TableCell>
                    <TableCell className="text-center">{v.noShows > 0 ? <Badge variant="destructive">{v.noShows}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={v.reliabilityScore >= 80 ? 'default' : v.reliabilityScore >= 50 ? 'secondary' : 'destructive'}>
                        {v.reliabilityScore}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">€{v.totalEarned.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">€{v.avgEarnedPerTask.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div></CardContent></Card>
          </TabsContent>

          {/* TASKS */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(taskReports.map(t => ({
                Taak: t.title, Evenement: t.eventTitle || '', Datum: t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '',
                Locatie: t.location || '', Plaatsen: t.totalSlots, Toegewezen: t.assigned,
                Ingecheckt: t.checkedIn, NoShows: t.noShows, Vergoeding: t.compensation,
                Uitbetaald: `€${t.totalPaid.toFixed(2)}`, UrenStatus: t.hourConfStatus, GemUren: t.avgHours ?? '',
              })), 'taken-rapport')}>
                <Download className="w-4 h-4" /> Exporteer CSV
              </Button>
            </div>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Taak</TableHead><TableHead>Evenement</TableHead><TableHead>Datum</TableHead>
                <TableHead className="text-center">Plaatsen</TableHead><TableHead className="text-center">Toegewezen</TableHead>
                <TableHead className="text-center">Ingecheckt</TableHead><TableHead className="text-center">No-shows</TableHead>
                <TableHead>Vergoeding</TableHead><TableHead className="text-right">Uitbetaald</TableHead>
                <TableHead className="text-center">Uren status</TableHead><TableHead className="text-right">Gem. uren</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {taskReports.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Geen data gevonden</TableCell></TableRow>
                ) : taskReports.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-muted-foreground">{t.eventTitle || '—'}</TableCell>
                    <TableCell className="text-sm">{t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell className="text-center">{t.totalSlots}</TableCell>
                    <TableCell className="text-center">{t.assigned}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{t.checkedIn}</Badge></TableCell>
                    <TableCell className="text-center">{t.noShows > 0 ? <Badge variant="destructive">{t.noShows}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell className="text-sm">{t.compensation}</TableCell>
                    <TableCell className="text-right font-medium">€{t.totalPaid.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-sm">
                      <Badge variant={t.hourConfStatus === 'Goedgekeurd' ? 'default' : t.hourConfStatus === '—' ? 'secondary' : 'outline'}>
                        {t.hourConfStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{t.avgHours !== null ? `${t.avgHours}u` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div></CardContent></Card>
          </TabsContent>

          {/* EVENTS */}
          <TabsContent value="events" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(eventReports.map(e => ({
                Evenement: e.title, Datum: e.date ? format(parseISO(e.date), 'dd/MM/yyyy') : '',
                Taken: e.totalTasks, Vrijwilligers: e.totalVolunteers, Ingecheckt: e.checkedIn,
                'Bezetting %': `${e.fillRate}%`, Uitbetaald: `€${e.totalPaid.toFixed(2)}`,
                'Populairste taak': e.topTask || '',
              })), 'evenementen-rapport')}>
                <Download className="w-4 h-4" /> Exporteer CSV
              </Button>
            </div>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Evenement</TableHead><TableHead>Datum</TableHead>
                <TableHead className="text-center">Taken</TableHead><TableHead className="text-center">Vrijwilligers</TableHead>
                <TableHead className="text-center">Ingecheckt</TableHead><TableHead className="text-center">Bezetting</TableHead>
                <TableHead className="text-right">Uitbetaald</TableHead><TableHead>Populairste taak</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {eventReports.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen data gevonden</TableCell></TableRow>
                ) : eventReports.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell className="text-sm">{e.date ? format(parseISO(e.date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell className="text-center">{e.totalTasks}</TableCell>
                    <TableCell className="text-center">{e.totalVolunteers}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{e.checkedIn}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant={e.fillRate >= 80 ? 'default' : e.fillRate >= 50 ? 'secondary' : 'destructive'}>{e.fillRate}%</Badge></TableCell>
                    <TableCell className="text-right font-medium">€{e.totalPaid.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.topTask || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div></CardContent></Card>
          </TabsContent>

          {/* FINANCIAL */}
          <TabsContent value="financial" className="mt-4">
            <ReportingFinancialTab
              payments={payments} sepaItems={sepaItems} tasks={tasks} events={events}
              signups={signups} profiles={profiles} filteredTaskIds={filteredTaskIds}
              complianceDeclarations={complianceDeclarations} chartType={chartType}
            />
          </TabsContent>

          {/* PARTNERS */}
          <TabsContent value="partners" className="mt-4">
            <ReportingPartnersTab
              partners={partners} partnerMembers={partnerMembers}
              partnerTaskAssignments={partnerTaskAssignments} signups={signups}
              tasks={tasks} filteredTaskIds={filteredTaskIds}
            />
          </TabsContent>

          {/* COMPLIANCE */}
          <TabsContent value="compliance" className="mt-4">
            <ReportingComplianceTab
              signatureRequests={signatureRequests} complianceDeclarations={complianceDeclarations}
              payments={payments} profiles={profiles}
            />
          </TabsContent>

          {/* AI ASSISTANT */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="w-5 h-5 text-primary" />AI Rapportage Assistent</CardTitle>
                <p className="text-sm text-muted-foreground">Stel een vraag over je club data — inclusief financiën, partners, compliance en meer.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {aiPresets.map((preset, i) => (
                    <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => setAiQuestion(preset)}>{preset}</Button>
                  ))}
                </div>
                <div className="border border-border rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto bg-muted/30 space-y-3">
                  {aiMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                      <Bot className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm">Stel een vraag om te beginnen...</p>
                    </div>
                  )}
                  {aiMessages.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn("max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap",
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'
                      )}>{msg.content}</div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyseren...
                      </div>
                    </div>
                  )}
                  <div ref={aiEndRef} />
                </div>
                <div className="flex gap-2">
                  <Textarea placeholder="Stel je vraag..." value={aiQuestion} onChange={e => setAiQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiQuestion(); } }}
                    className="min-h-[44px] max-h-[100px] resize-none" rows={1} />
                  <Button onClick={handleAiQuestion} disabled={aiLoading || !aiQuestion.trim()} size="icon" className="shrink-0"><Send className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedVolunteerProfile && (
        <VolunteerProfileDialog
          volunteer={{
            id: selectedVolunteerProfile.id,
            full_name: selectedVolunteerProfile.name,
            email: selectedVolunteerProfile.email,
            avatar_url: null,
          }}
          open={!!selectedVolunteerProfile}
          onOpenChange={(open) => { if (!open) setSelectedVolunteerProfile(null); }}
          language="nl"
        />
      )}
    </ClubPageLayout>
  );
};

export default ReportingDashboard;
