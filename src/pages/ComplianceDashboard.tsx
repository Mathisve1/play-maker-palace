import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Search, MoreHorizontal, Mail, Ban, User, Loader2, BookOpen, Download, FileText } from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Language } from '@/i18n/translations';
import { Badge } from '@/components/ui/badge';
import ComplianceBadge from '@/components/ComplianceBadge';
import { fetchBatchComplianceData, ComplianceStatus, YEARLY_LIMIT, HOURS_LIMIT } from '@/hooks/useComplianceData';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface VolunteerEntry {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  compliance_blocked?: boolean;
  trainingCompleted?: number;
  trainingRequired?: number;
}

const labels = {
  nl: {
    title: 'Compliance Dashboard',
    subtitle: 'Overzicht van alle vrijwilligers en hun fiscale status (Sport 2026)',
    back: 'Terug naar dashboard',
    search: 'Zoek vrijwilliger...',
    lastValidation: 'Laatste validatie',
    never: 'Nooit',
    status: 'Status',
    paymentStatus: 'Betalingsstatus',
    onHold: 'On hold',
    active: 'Actief',
    blocked: 'Geblokkeerd',
    yearlyLimit: 'Jaarplafond 2026',
    trainings: 'Trainingen',
    totalVolunteers: 'Vrijwilligers',
    greenCount: 'Legaal',
    orangeCount: 'Let op',
    redCount: 'Plafond bereikt',
    pendingValidation: 'Wacht op validatie',
    noVolunteers: 'Geen vrijwilligers gevonden.',
    sendWarning: 'Stuur waarschuwingsmail',
    blockVolunteer: 'Blokkeer voor nieuwe taken',
    unblockVolunteer: 'Deblokkeer vrijwilliger',
    viewProfile: 'Bekijk profiel',
    warningSent: 'Waarschuwingsmail verstuurd',
    volunteerBlocked: 'Vrijwilliger geblokkeerd',
    volunteerUnblocked: 'Vrijwilliger gedeblokkeerd',
    allStatuses: 'Alle',
    downloadReport: 'Download compliance rapport',
    sendReminder: 'Stuur herinnering',
    exportCsv: 'Exporteer CSV',
    csvExported: 'CSV geëxporteerd',
    reportDownloaded: 'Rapport gedownload',
    reminderSent: 'Herinnering verstuurd',
    pdfTitle: 'Compliance Rapport',
    pdfClub: 'Club',
    pdfName: 'Naam',
    pdfHoursWorked: 'Uren gewerkt dit jaar',
    pdfLegalMax: 'Wettelijk maximum',
    pdfRemaining: 'Resterende capaciteit',
    pdfStatus: 'Status',
    pdfDate: 'Datum rapport',
    pdfIncomeUsed: 'Inkomen gebruikt',
    statusGreen: 'Groen — Conform',
    statusOrange: 'Oranje — Let op',
    statusRed: 'Rood — Plafond bereikt',
    reminderSubject: 'Compliance status update',
    reminderBody: (name: string, pct: number, limit: number, hours: number, maxHours: number) =>
      `Beste ${name},\n\nJe hebt momenteel ${pct}% van het jaarplafond van €${limit.toFixed(2)} bereikt en ${hours} van de ${maxHours} toegestane uren gewerkt.\n\nHoud je status in de gaten via je profiel.\n\nMet vriendelijke groeten,`,
  },
  fr: {
    title: 'Tableau de conformité',
    subtitle: 'Aperçu de tous les bénévoles et leur statut fiscal (Sport 2026)',
    back: 'Retour au tableau de bord',
    search: 'Rechercher un bénévole...',
    lastValidation: 'Dernière validation',
    never: 'Jamais',
    status: 'Statut',
    paymentStatus: 'Statut de paiement',
    onHold: 'En attente',
    active: 'Actif',
    blocked: 'Bloqué',
    yearlyLimit: 'Plafond annuel 2026',
    trainings: 'Formations',
    totalVolunteers: 'Bénévoles',
    greenCount: 'Légal',
    orangeCount: 'Attention',
    redCount: 'Plafond atteint',
    pendingValidation: 'En attente de validation',
    noVolunteers: 'Aucun bénévole trouvé.',
    sendWarning: 'Envoyer un avertissement',
    blockVolunteer: 'Bloquer pour nouvelles tâches',
    unblockVolunteer: 'Débloquer le bénévole',
    viewProfile: 'Voir le profil',
    warningSent: 'Avertissement envoyé',
    volunteerBlocked: 'Bénévole bloqué',
    volunteerUnblocked: 'Bénévole débloqué',
    allStatuses: 'Tous',
    downloadReport: 'Télécharger le rapport',
    sendReminder: 'Envoyer un rappel',
    exportCsv: 'Exporter CSV',
    csvExported: 'CSV exporté',
    reportDownloaded: 'Rapport téléchargé',
    reminderSent: 'Rappel envoyé',
    pdfTitle: 'Rapport de conformité',
    pdfClub: 'Club',
    pdfName: 'Nom',
    pdfHoursWorked: 'Heures travaillées cette année',
    pdfLegalMax: 'Maximum légal',
    pdfRemaining: 'Capacité restante',
    pdfStatus: 'Statut',
    pdfDate: 'Date du rapport',
    pdfIncomeUsed: 'Revenu utilisé',
    statusGreen: 'Vert — Conforme',
    statusOrange: 'Orange — Attention',
    statusRed: 'Rouge — Plafond atteint',
    reminderSubject: 'Mise à jour du statut de conformité',
    reminderBody: (name: string, pct: number, limit: number, hours: number, maxHours: number) =>
      `Cher(e) ${name},\n\nVous avez actuellement atteint ${pct}% du plafond annuel de €${limit.toFixed(2)} et travaillé ${hours} des ${maxHours} heures autorisées.\n\nSuivez votre statut via votre profil.\n\nCordialement,`,
  },
  en: {
    title: 'Compliance Dashboard',
    subtitle: 'Overview of all volunteers and their fiscal status (Sport 2026)',
    back: 'Back to dashboard',
    search: 'Search volunteer...',
    lastValidation: 'Last validation',
    never: 'Never',
    status: 'Status',
    paymentStatus: 'Payment status',
    onHold: 'On hold',
    active: 'Active',
    blocked: 'Blocked',
    yearlyLimit: 'Yearly limit 2026',
    trainings: 'Trainings',
    totalVolunteers: 'Volunteers',
    greenCount: 'Legal',
    orangeCount: 'Warning',
    redCount: 'Limit reached',
    pendingValidation: 'Awaiting validation',
    noVolunteers: 'No volunteers found.',
    sendWarning: 'Send warning email',
    blockVolunteer: 'Block for new tasks',
    unblockVolunteer: 'Unblock volunteer',
    viewProfile: 'View profile',
    warningSent: 'Warning email sent',
    volunteerBlocked: 'Volunteer blocked',
    volunteerUnblocked: 'Volunteer unblocked',
    allStatuses: 'All',
    downloadReport: 'Download compliance report',
    sendReminder: 'Send reminder',
    exportCsv: 'Export CSV',
    csvExported: 'CSV exported',
    reportDownloaded: 'Report downloaded',
    reminderSent: 'Reminder sent',
    pdfTitle: 'Compliance Report',
    pdfClub: 'Club',
    pdfName: 'Name',
    pdfHoursWorked: 'Hours worked this year',
    pdfLegalMax: 'Legal maximum',
    pdfRemaining: 'Remaining capacity',
    pdfStatus: 'Status',
    pdfDate: 'Report date',
    pdfIncomeUsed: 'Income used',
    statusGreen: 'Green — Compliant',
    statusOrange: 'Orange — Warning',
    statusRed: 'Red — Limit reached',
    reminderSubject: 'Compliance status update',
    reminderBody: (name: string, pct: number, limit: number, hours: number, maxHours: number) =>
      `Dear ${name},\n\nYou have currently reached ${pct}% of the annual limit of €${limit.toFixed(2)} and worked ${hours} of the ${maxHours} allowed hours.\n\nMonitor your status via your profile.\n\nBest regards,`,
  },
};

const ComplianceDashboard = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = labels[language];
  const { clubId: contextClubId } = useClubContext();

  const [loading, setLoading] = useState(true);
  const [volunteers, setVolunteers] = useState<VolunteerEntry[]>([]);
  const [complianceMap, setComplianceMap] = useState<Map<string, ComplianceStatus>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'green' | 'orange' | 'red'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');

  useEffect(() => {
    const init = async () => {
      if (!contextClubId) { setLoading(false); return; }

      const { data: club } = await supabase.from('clubs').select('name').eq('id', contextClubId).single();
      if (club) setClubName(club.name);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('club_id', contextClubId);

      if (!tasks || tasks.length === 0) { setLoading(false); return; }

      const { data: signups } = await supabase
        .from('task_signups')
        .select('volunteer_id')
        .in('task_id', tasks.map(t => t.id))
        .eq('status', 'assigned');

      const uniqueIds = [...new Set(signups?.map(s => s.volunteer_id) || [])];
      if (uniqueIds.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, compliance_blocked')
        .in('id', uniqueIds);

      const { data: reqTrainings } = await supabase.from('club_required_trainings' as any).select('training_id').eq('club_id', contextClubId);
      const requiredIds = (reqTrainings || []).map((r: any) => r.training_id);

      let certMap = new Map<string, number>();
      if (requiredIds.length > 0) {
        const { data: certs } = await supabase.from('volunteer_certificates')
          .select('volunteer_id, training_id')
          .in('volunteer_id', uniqueIds)
          .in('training_id', requiredIds);
        (certs || []).forEach((c: any) => {
          certMap.set(c.volunteer_id, (certMap.get(c.volunteer_id) || 0) + 1);
        });
      }

      setVolunteers(((profiles as any[]) || []).map(p => ({
        ...p,
        trainingCompleted: certMap.get(p.id) || 0,
        trainingRequired: requiredIds.length,
      })) as VolunteerEntry[]);

      const cMap = await fetchBatchComplianceData(uniqueIds);
      setComplianceMap(cMap);

      setLoading(false);
    };
    init();
  }, [contextClubId]);

  /* ── Send warning via email queue (enqueue_email RPC) ── */
  const handleSendWarning = async (vol: VolunteerEntry) => {
    setActionLoading(vol.id);
    try {
      const compliance = complianceMap.get(vol.id);
      if (!compliance || !vol.email) throw new Error('No data');
      const pctUsed = Math.round(compliance.percentUsed);
      const statusLabel = compliance.status === 'green' ? t.statusGreen
        : compliance.status === 'orange' ? t.statusOrange : t.statusRed;

      const subject = language === 'nl'
        ? `⚠️ Je nadert het jaarplafond bij ${clubName}`
        : language === 'fr'
          ? `⚠️ Vous approchez du plafond annuel chez ${clubName}`
          : `⚠️ You are approaching the annual limit at ${clubName}`;

      const html = language === 'nl'
        ? `<p>Beste ${vol.full_name || 'vrijwilliger'},</p>
           <p>Hieronder een overzicht van je huidige compliance status bij <strong>${clubName}</strong>:</p>
           <ul>
             <li><strong>Uren dit jaar:</strong> ${compliance.totalHours.toFixed(1)} h</li>
             <li><strong>Wettelijk maximum:</strong> ${HOURS_LIMIT} h / €${YEARLY_LIMIT.toFixed(2)}</li>
             <li><strong>Resterende capaciteit:</strong> ${compliance.remainingHours.toFixed(1)} h / €${compliance.remainingBudget.toFixed(2)}</li>
             <li><strong>Status:</strong> ${statusLabel} (${pctUsed}%)</li>
           </ul>
           <p>Neem contact op met de club als je vragen hebt.</p>
           <p>Met vriendelijke groeten,<br>${clubName}</p>`
        : language === 'fr'
          ? `<p>Cher(e) ${vol.full_name || 'bénévole'},</p>
             <p>Voici un aperçu de votre statut de conformité chez <strong>${clubName}</strong> :</p>
             <ul>
               <li><strong>Heures cette année :</strong> ${compliance.totalHours.toFixed(1)} h</li>
               <li><strong>Maximum légal :</strong> ${HOURS_LIMIT} h / €${YEARLY_LIMIT.toFixed(2)}</li>
               <li><strong>Capacité restante :</strong> ${compliance.remainingHours.toFixed(1)} h / €${compliance.remainingBudget.toFixed(2)}</li>
               <li><strong>Statut :</strong> ${statusLabel} (${pctUsed}%)</li>
             </ul>
             <p>Contactez le club si vous avez des questions.</p>
             <p>Cordialement,<br>${clubName}</p>`
          : `<p>Dear ${vol.full_name || 'volunteer'},</p>
             <p>Here is an overview of your current compliance status at <strong>${clubName}</strong>:</p>
             <ul>
               <li><strong>Hours this year:</strong> ${compliance.totalHours.toFixed(1)} h</li>
               <li><strong>Legal maximum:</strong> ${HOURS_LIMIT} h / €${YEARLY_LIMIT.toFixed(2)}</li>
               <li><strong>Remaining capacity:</strong> ${compliance.remainingHours.toFixed(1)} h / €${compliance.remainingBudget.toFixed(2)}</li>
               <li><strong>Status:</strong> ${statusLabel} (${pctUsed}%)</li>
             </ul>
             <p>Contact the club if you have questions.</p>
             <p>Best regards,<br>${clubName}</p>`;

      const messageId = `compliance-warning-${vol.id}-${Date.now()}`;
      const { error } = await supabase.rpc('enqueue_email' as any, {
        queue_name: 'transactional_emails',
        payload: {
          to: vol.email,
          subject,
          html,
          from: `De 12e Man <noreply@de12eman.be>`,
          message_id: messageId,
          queued_at: new Date().toISOString(),
          label: 'compliance-warning',
        },
      });

      if (error) throw error;
      toast.success(language === 'nl' ? 'Herinnering gepland ✓' : language === 'fr' ? 'Rappel planifié ✓' : 'Reminder scheduled ✓');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
    setActionLoading(null);
  };

  const handleToggleBlock = async (vol: VolunteerEntry) => {
    setActionLoading(vol.id);
    const newBlocked = !vol.compliance_blocked;
    const { error } = await supabase
      .from('profiles')
      .update({ compliance_blocked: newBlocked })
      .eq('id', vol.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(newBlocked ? t.volunteerBlocked : t.volunteerUnblocked);
      setVolunteers(prev => prev.map(v => v.id === vol.id ? { ...v, compliance_blocked: newBlocked } : v));
    }
    setActionLoading(null);
  };

  /* ── New: Download individual PDF report ── */
  const handleDownloadReport = useCallback((vol: VolunteerEntry) => {
    const compliance = complianceMap.get(vol.id);
    if (!compliance) return;

    const statusLabel = compliance.status === 'green' ? t.statusGreen
      : compliance.status === 'orange' ? t.statusOrange : t.statusRed;

    const doc = new jsPDF();
    const now = new Date().toLocaleDateString(
      language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );

    doc.setFontSize(18);
    doc.text(t.pdfTitle, 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`${t.pdfDate}: ${now}`, 20, 33);

    doc.setDrawColor(200);
    doc.line(20, 38, 190, 38);

    doc.setFontSize(12);
    doc.setTextColor(0);
    let y = 48;
    const row = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 80, y);
      y += 9;
    };

    row(t.pdfName, vol.full_name || '-');
    row(t.pdfClub, clubName);
    row(t.pdfHoursWorked, `${compliance.totalHours.toFixed(1)} h`);
    row(t.pdfLegalMax, `${HOURS_LIMIT} h / €${YEARLY_LIMIT.toFixed(2)}`);
    row(t.pdfIncomeUsed, `€${compliance.totalIncome.toFixed(2)} (${Math.round(compliance.percentUsed)}%)`);
    row(t.pdfRemaining, `${compliance.remainingHours.toFixed(1)} h / €${compliance.remainingBudget.toFixed(2)}`);
    row(t.pdfStatus, statusLabel);

    doc.save(`compliance-${(vol.full_name || vol.id).replace(/\s+/g, '_')}.pdf`);
    toast.success(t.reportDownloaded);
  }, [complianceMap, clubName, language, t]);

  /* ── Send compliance reminder via email queue ── */
  const handleSendReminder = async (vol: VolunteerEntry) => {
    setActionLoading(vol.id);
    try {
      const compliance = complianceMap.get(vol.id);
      if (!compliance || !vol.email) throw new Error('No data');

      const pct = Math.round(compliance.percentUsed);
      const bodyText = t.reminderBody(vol.full_name || vol.email, pct, YEARLY_LIMIT, Math.round(compliance.totalHours), HOURS_LIMIT);
      const html = `<p>${bodyText.replace(/\n/g, '<br>')}<br>${clubName}</p>`;

      const messageId = `compliance-reminder-${vol.id}-${Date.now()}`;
      const { error } = await supabase.rpc('enqueue_email' as any, {
        queue_name: 'transactional_emails',
        payload: {
          to: vol.email,
          subject: t.reminderSubject,
          html,
          from: `De 12e Man <noreply@de12eman.be>`,
          message_id: messageId,
          queued_at: new Date().toISOString(),
          label: 'compliance-reminder',
        },
      });

      if (error) throw error;
      toast.success(language === 'nl' ? 'Herinnering gepland ✓' : language === 'fr' ? 'Rappel planifié ✓' : 'Reminder scheduled ✓');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
    setActionLoading(null);
  };

  /* ── New: Export CSV ── */
  const handleExportCsv = useCallback(() => {
    const header = language === 'nl'
      ? 'Naam,E-mail,Uren dit jaar,Maximum uren,Inkomen,Maximum inkomen,Status'
      : language === 'fr'
        ? 'Nom,E-mail,Heures cette année,Maximum heures,Revenu,Maximum revenu,Statut'
        : 'Name,Email,Hours this year,Max hours,Income,Max income,Status';

    const rows = volunteers.map(v => {
      const c = complianceMap.get(v.id);
      return [
        `"${(v.full_name || '').replace(/"/g, '""')}"`,
        v.email || '',
        c ? c.totalHours.toFixed(1) : '0',
        HOURS_LIMIT,
        c ? `€${c.totalIncome.toFixed(2)}` : '€0',
        `€${YEARLY_LIMIT.toFixed(2)}`,
        c?.status || 'green',
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-${clubName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.csvExported);
  }, [volunteers, complianceMap, clubName, language, t]);

  const filtered = volunteers.filter(v => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(v.full_name?.toLowerCase().includes(q) || v.email?.toLowerCase().includes(q))) return false;
    }
    if (statusFilter !== 'all') {
      const status = complianceMap.get(v.id)?.status || 'green';
      if (status !== statusFilter) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const ca = complianceMap.get(a.id);
    const cb = complianceMap.get(b.id);
    const order = { red: 0, orange: 1, green: 2 };
    const pendA = ca?.declarationsPending ? -1 : 0;
    const pendB = cb?.declarationsPending ? -1 : 0;
    if (pendA !== pendB) return pendA - pendB;
    return (order[ca?.status || 'green'] || 2) - (order[cb?.status || 'green'] || 2);
  });

  const greenCount = [...complianceMap.values()].filter(c => c.status === 'green').length;
  const orangeCount = [...complianceMap.values()].filter(c => c.status === 'orange').length;
  const redCount = [...complianceMap.values()].filter(c => c.status === 'red').length;
  const pendingCount = [...complianceMap.values()].filter(c => c.declarationsPending).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ClubPageLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageNavTabs tabs={[
          { label: 'Overzicht', path: '/volunteer-management' },
          { label: 'Contracten', path: '/season-contracts' },
          { label: 'Contract Builder', path: '/contract-builder' },
          { label: 'Sjablonen', path: '/contract-templates' },
          { label: 'Briefings', path: '/briefing-builder' },
          { label: 'Vergoedingen', path: '/sepa-payouts' },
          { label: 'Compliance', path: '/compliance' },
        ]} />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                {t.title}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCsv} disabled={volunteers.length === 0}>
              <Download className="w-4 h-4" />
              {t.exportCsv}
            </Button>
          </div>
        </motion.div>

        {/* Clickable summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-2xl shadow-card border p-4 text-center transition-all ${statusFilter === 'all' ? 'border-primary ring-2 ring-primary/20 bg-card' : 'border-transparent bg-card hover:border-border'}`}
          >
            <p className="text-2xl font-heading font-bold text-foreground">{volunteers.length}</p>
            <p className="text-xs text-muted-foreground">{t.allStatuses}</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'green' ? 'all' : 'green')}
            className={`rounded-2xl border p-4 text-center transition-all ${statusFilter === 'green' ? 'ring-2 ring-green-400/30 border-green-400' : 'border-green-200 dark:border-green-800'} bg-green-50 dark:bg-green-950/20 hover:border-green-400`}
          >
            <p className="text-2xl font-heading font-bold text-green-600">{greenCount}</p>
            <p className="text-xs text-green-700 dark:text-green-400">{t.greenCount}</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'orange' ? 'all' : 'orange')}
            className={`rounded-2xl border p-4 text-center transition-all ${statusFilter === 'orange' ? 'ring-2 ring-orange-400/30 border-orange-400' : 'border-orange-200 dark:border-orange-800'} bg-orange-50 dark:bg-orange-950/20 hover:border-orange-400`}
          >
            <p className="text-2xl font-heading font-bold text-orange-600">{orangeCount}</p>
            <p className="text-xs text-orange-700 dark:text-orange-400">{t.orangeCount}</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'red' ? 'all' : 'red')}
            className={`rounded-2xl border p-4 text-center transition-all ${statusFilter === 'red' ? 'ring-2 ring-red-400/30 border-red-400' : 'border-red-200 dark:border-red-800'} bg-red-50 dark:bg-red-950/20 hover:border-red-400`}
          >
            <p className="text-2xl font-heading font-bold text-red-600">{redCount}</p>
            <p className="text-xs text-red-700 dark:text-red-400">{t.redCount}</p>
          </button>
          <div className="bg-card rounded-2xl shadow-card border border-transparent p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-heading font-bold text-foreground">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">{t.pendingValidation}</p>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 flex items-center gap-2 text-xs text-orange-700 dark:text-orange-400">
            <Clock className="w-4 h-4" />
            {pendingCount} {language === 'nl' ? 'vrijwilliger(s) wacht(en) op validatie - vergoeding bevroren' : language === 'fr' ? 'bénévole(s) en attente de validation - remboursement gelé' : 'volunteer(s) awaiting validation - reimbursement frozen'}
          </div>
        )}

        {/* Search */}
        <div className="mt-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Volunteer list */}
        <div className="mt-4 space-y-3">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t.noVolunteers}</p>
          ) : (
            sorted.map(vol => {
              const compliance = complianceMap.get(vol.id);
              const isExpanded = selectedVolunteer === vol.id;

              return (
                <motion.div
                  key={vol.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl shadow-card border border-transparent overflow-hidden"
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => setSelectedVolunteer(isExpanded ? null : vol.id)}
                      className="flex-1 p-4 text-left flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors min-w-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-10 h-10 shrink-0">
                          {vol.avatar_url && <AvatarImage src={vol.avatar_url} />}
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {(vol.full_name || vol.email || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{vol.full_name || 'Onbekend'}</p>
                            {vol.compliance_blocked && (
                              <Badge variant="destructive" className="text-[10px] gap-0.5">
                                <Ban className="w-3 h-3" /> {t.blocked}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{vol.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {vol.trainingRequired! > 0 && (
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            vol.trainingCompleted === vol.trainingRequired
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                          }`}>
                            <BookOpen className="w-3 h-3 inline mr-0.5" />
                            {vol.trainingCompleted}/{vol.trainingRequired} {vol.trainingCompleted === vol.trainingRequired ? '✅' : ''}
                          </span>
                        )}
                        {compliance?.declarationsPending && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <Clock className="w-3 h-3" />
                            {t.onHold}
                          </Badge>
                        )}
                        {compliance && (
                          <ComplianceBadge compliance={compliance} language={language} compact />
                        )}
                      </div>
                    </button>

                    {/* Actions dropdown */}
                    <div className="pr-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === vol.id}>
                            {actionLoading === vol.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadReport(vol)}>
                            <FileText className="w-4 h-4 mr-2" />
                            {t.downloadReport}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendReminder(vol)}>
                            <Mail className="w-4 h-4 mr-2" />
                            {t.sendReminder}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendWarning(vol)}>
                            <Mail className="w-4 h-4 mr-2" />
                            {t.sendWarning}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleBlock(vol)}>
                            <Ban className="w-4 h-4 mr-2" />
                            {vol.compliance_blocked ? t.unblockVolunteer : t.blockVolunteer}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/volunteer/${vol.id}`)}>
                            <User className="w-4 h-4 mr-2" />
                            {t.viewProfile}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {isExpanded && compliance && (
                    <div className="px-4 pb-4 border-t border-border pt-3">
                      <ComplianceBadge compliance={compliance} language={language} showProgress />
                      <div className="mt-3 text-xs text-muted-foreground">
                        <span className="font-medium">{t.lastValidation}:</span>{' '}
                        {compliance.lastDeclarationDate
                          ? new Date(compliance.lastDeclarationDate).toLocaleDateString(
                              language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
                              { day: 'numeric', month: 'long', year: 'numeric' }
                            )
                          : t.never}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </ClubPageLayout>
  );
};

export default ComplianceDashboard;
