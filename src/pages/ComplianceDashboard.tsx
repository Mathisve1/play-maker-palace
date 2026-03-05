import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Clock, AlertTriangle, Search } from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Language } from '@/i18n/translations';
import { Badge } from '@/components/ui/badge';
import ComplianceBadge from '@/components/ComplianceBadge';
import { fetchBatchComplianceData, ComplianceStatus, YEARLY_LIMIT } from '@/hooks/useComplianceData';
import { Input } from '@/components/ui/input';

interface VolunteerEntry {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
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

  useEffect(() => {
    const init = async () => {
      if (!contextClubId) { setLoading(false); return; }

      // Get all tasks for this club
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('club_id', contextClubId);

      if (!tasks || tasks.length === 0) { setLoading(false); return; }

      // Get all assigned volunteers
      const { data: signups } = await supabase
        .from('task_signups')
        .select('volunteer_id')
        .in('task_id', tasks.map(t => t.id))
        .eq('status', 'assigned');

      const uniqueIds = [...new Set(signups?.map(s => s.volunteer_id) || [])];
      if (uniqueIds.length === 0) { setLoading(false); return; }

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', uniqueIds);

      setVolunteers(profiles || []);

      // Batch fetch compliance
      const cMap = await fetchBatchComplianceData(uniqueIds);
      setComplianceMap(cMap);

      setLoading(false);
    };
    init();
  }, [navigate]);

  const filtered = volunteers.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (v.full_name?.toLowerCase().includes(q) || v.email?.toLowerCase().includes(q));
  });

  // Sort: pending validation first, then by status (red > orange > green)
  const sorted = [...filtered].sort((a, b) => {
    const ca = complianceMap.get(a.id);
    const cb = complianceMap.get(b.id);
    const order = { red: 0, orange: 1, green: 2 };
    const pendA = ca?.declarationsPending ? -1 : 0;
    const pendB = cb?.declarationsPending ? -1 : 0;
    if (pendA !== pendB) return pendA - pendB;
    return (order[ca?.status || 'green'] || 2) - (order[cb?.status || 'green'] || 2);
  });

  // Stats
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
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-card rounded-2xl shadow-card border border-transparent p-4 text-center">
            <p className="text-2xl font-heading font-bold text-foreground">{volunteers.length}</p>
            <p className="text-xs text-muted-foreground">{t.totalVolunteers}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-2xl border border-green-200 dark:border-green-800 p-4 text-center">
            <p className="text-2xl font-heading font-bold text-green-600">{greenCount}</p>
            <p className="text-xs text-green-700 dark:text-green-400">{t.greenCount}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-200 dark:border-orange-800 p-4 text-center">
            <p className="text-2xl font-heading font-bold text-orange-600">{orangeCount}</p>
            <p className="text-xs text-orange-700 dark:text-orange-400">{t.orangeCount}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800 p-4 text-center">
            <p className="text-2xl font-heading font-bold text-red-600">{redCount}</p>
            <p className="text-xs text-red-700 dark:text-red-400">{t.redCount}</p>
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
                  <button
                    onClick={() => setSelectedVolunteer(isExpanded ? null : vol.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-10 h-10 shrink-0">
                        {vol.avatar_url && <AvatarImage src={vol.avatar_url} />}
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                          {(vol.full_name || vol.email || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{vol.full_name || 'Onbekend'}</p>
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
