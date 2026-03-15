import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Search, MoreHorizontal, Mail, Ban, User, Loader2, BookOpen } from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Language } from '@/i18n/translations';
import { Badge } from '@/components/ui/badge';
import ComplianceBadge from '@/components/ComplianceBadge';
import { fetchBatchComplianceData, ComplianceStatus, YEARLY_LIMIT } from '@/hooks/useComplianceData';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

      // Get club name
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

      setVolunteers((profiles as VolunteerEntry[]) || []);

      const cMap = await fetchBatchComplianceData(uniqueIds);
      setComplianceMap(cMap);

      setLoading(false);
    };
    init();
  }, [contextClubId]);

  const handleSendWarning = async (vol: VolunteerEntry) => {
    setActionLoading(vol.id);
    try {
      const compliance = complianceMap.get(vol.id);
      const pctUsed = compliance ? Math.round(compliance.percentUsed) : 0;

      await supabase.functions.invoke('send-transactional-email', {
        body: {
          template_name: 'compliance-warning',
          to: vol.email,
          subject: language === 'nl'
            ? `⚠️ Je nadert het jaarplafond bij ${clubName}`
            : `⚠️ You are approaching the annual limit at ${clubName}`,
          html: `<p>${language === 'nl'
            ? `Beste ${vol.full_name || 'vrijwilliger'},<br><br>Je hebt ${pctUsed}% van het jaarplafond van €${YEARLY_LIMIT.toFixed(2)} bereikt. Neem contact op met de club als je vragen hebt.<br><br>Met vriendelijke groeten,<br>${clubName}`
            : `Dear ${vol.full_name || 'volunteer'},<br><br>You have reached ${pctUsed}% of the annual limit of €${YEARLY_LIMIT.toFixed(2)}. Contact the club if you have questions.<br><br>Best regards,<br>${clubName}`
          }</p>`,
        },
      });
      toast.success(t.warningSent);
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
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
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
