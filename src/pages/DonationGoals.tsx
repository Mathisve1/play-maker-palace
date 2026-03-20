import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Plus, X, Loader2, CheckCircle, ArrowLeft, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────

interface DonationGoal {
  id: string;
  title: string;
  description: string | null;
  target_amount: number; // cents
  raised_amount: number; // cents
  status: 'active' | 'closed';
  created_at: string;
}

interface DonationTransaction {
  id: string;
  donation_goal_id: string;
  volunteer_id: string;
  task_id: string;
  amount: number;
  created_at: string;
  volunteer_name?: string;
  task_title?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

const labels = {
  nl: {
    back: 'Terug',
    title: 'Donatiedoelen',
    subtitle: 'Beheer doelen waaraan vrijwilligers hun taakvergoeding kunnen schenken.',
    newGoal: 'Nieuw doel',
    goalTitle: 'Naam van het doel',
    goalDesc: 'Omschrijving (optioneel)',
    targetAmount: 'Streefbedrag (€)',
    create: 'Doel aanmaken',
    creating: 'Aanmaken...',
    active: 'Actief',
    closed: 'Gesloten',
    closeGoal: 'Sluit doel',
    raised: 'ingezameld',
    of: 'van',
    noGoals: 'Nog geen doelen aangemaakt.',
    donations: 'donaties',
    recentDonations: 'Recente donaties',
    noDonations: 'Nog geen donaties.',
    cancelCreate: 'Annuleren',
    confirmClose: 'Weet je zeker dat je dit doel wil sluiten? Dit kan niet ongedaan worden gemaakt.',
  },
  fr: {
    back: 'Retour',
    title: 'Objectifs de don',
    subtitle: 'Gérez les objectifs auxquels les bénévoles peuvent donner leur rémunération.',
    newGoal: 'Nouvel objectif',
    goalTitle: "Nom de l'objectif",
    goalDesc: 'Description (optionnelle)',
    targetAmount: 'Montant cible (€)',
    create: 'Créer l\'objectif',
    creating: 'Création...',
    active: 'Actif',
    closed: 'Fermé',
    closeGoal: 'Fermer l\'objectif',
    raised: 'collecté',
    of: 'sur',
    noGoals: 'Aucun objectif créé.',
    donations: 'dons',
    recentDonations: 'Dons récents',
    noDonations: 'Aucun don encore.',
    cancelCreate: 'Annuler',
    confirmClose: 'Êtes-vous sûr de vouloir fermer cet objectif ? Cette action est irréversible.',
  },
  en: {
    back: 'Back',
    title: 'Donation Goals',
    subtitle: 'Manage goals volunteers can donate their task payouts to.',
    newGoal: 'New goal',
    goalTitle: 'Goal name',
    goalDesc: 'Description (optional)',
    targetAmount: 'Target amount (€)',
    create: 'Create goal',
    creating: 'Creating...',
    active: 'Active',
    closed: 'Closed',
    closeGoal: 'Close goal',
    raised: 'raised',
    of: 'of',
    noGoals: 'No goals created yet.',
    donations: 'donations',
    recentDonations: 'Recent donations',
    noDonations: 'No donations yet.',
    cancelCreate: 'Cancel',
    confirmClose: 'Are you sure you want to close this goal? This cannot be undone.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const DonationGoals = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { clubId } = useClubContext();
  const l = labels[language as keyof typeof labels] ?? labels.nl;

  const [goals, setGoals] = useState<DonationGoal[]>([]);
  const [transactions, setTransactions] = useState<DonationTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  // Create form
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTarget, setFormTarget] = useState('');

  useEffect(() => { if (clubId) loadData(); }, [clubId]);

  const loadData = async () => {
    setLoading(true);
    const [goalsRes, txRes] = await Promise.all([
      supabase.from('donation_goals').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
      supabase.from('donation_transactions').select('id, donation_goal_id, volunteer_id, task_id, amount, created_at')
        .in('donation_goal_id', (await supabase.from('donation_goals').select('id').eq('club_id', clubId)).data?.map(g => g.id) || [])
        .order('created_at', { ascending: false }).limit(50),
    ]);

    const goalsList = (goalsRes.data || []) as DonationGoal[];
    setGoals(goalsList);

    // Enrich transactions with volunteer name + task title
    const txList = txRes.data || [];
    if (txList.length > 0) {
      const volIds = [...new Set(txList.map((t: any) => t.volunteer_id))];
      const taskIds = [...new Set(txList.map((t: any) => t.task_id))];
      const [profsRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', volIds),
        supabase.from('tasks').select('id, title').in('id', taskIds),
      ]);
      const profMap = new Map((profsRes.data || []).map((p: any) => [p.id, p.full_name]));
      const taskMap = new Map((tasksRes.data || []).map((t: any) => [t.id, t.title]));
      setTransactions(txList.map((t: any) => ({
        ...t,
        volunteer_name: profMap.get(t.volunteer_id) || '?',
        task_title: taskMap.get(t.task_id) || '?',
      })));
    } else {
      setTransactions([]);
    }
    setLoading(false);
  };

  const createGoal = async () => {
    if (!formTitle.trim() || !formTarget) return;
    const targetCents = Math.round(parseFloat(formTarget) * 100);
    if (isNaN(targetCents) || targetCents <= 0) { toast.error('Ongeldig bedrag.'); return; }
    setCreating(true);
    const { error } = await supabase.from('donation_goals').insert({
      club_id: clubId,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      target_amount: targetCents,
      status: 'active',
    });
    setCreating(false);
    if (error) { toast.error('Er ging iets mis.'); return; }
    toast.success('Doel aangemaakt!');
    setFormTitle(''); setFormDesc(''); setFormTarget('');
    setShowCreate(false);
    loadData();
  };

  const closeGoal = async (goalId: string) => {
    if (!window.confirm(l.confirmClose)) return;
    setClosingId(goalId);
    const { error } = await supabase.from('donation_goals').update({ status: 'closed' }).eq('id', goalId);
    setClosingId(null);
    if (error) { toast.error('Er ging iets mis.'); return; }
    toast.success('Doel gesloten.');
    loadData();
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border px-4 flex items-center gap-3 min-h-[60px]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-2 rounded-xl hover:bg-muted transition-colors font-semibold text-foreground"
          aria-label={l.back}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">{l.back}</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-heading font-bold text-foreground truncate">{l.title}</h1>
        </div>
        <Button size="sm" className="min-h-[44px] shrink-0" onClick={() => setShowCreate(v => !v)}>
          {showCreate ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showCreate ? l.cancelCreate : l.newGoal}
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground">{l.subtitle}</p>

        {/* Create form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4">
            <Input
              placeholder={l.goalTitle}
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="h-12 text-base"
            />
            <Input
              placeholder={l.goalDesc}
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              className="h-12 text-base"
            />
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder={l.targetAmount}
              value={formTarget}
              onChange={e => setFormTarget(e.target.value)}
              className="h-12 text-base"
            />
            <Button
              className="w-full min-h-[52px] text-base"
              disabled={creating || !formTitle.trim() || !formTarget}
              onClick={createGoal}
            >
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{l.creating}</> : <><Plus className="w-4 h-4 mr-2" />{l.create}</>}
            </Button>
          </motion.div>
        )}

        {/* Goals list */}
        {goals.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Heart className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">{l.noGoals}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal, i) => {
              const pct = Math.min(100, Math.round((goal.raised_amount / goal.target_amount) * 100));
              const goalTxs = transactions.filter(t => t.donation_goal_id === goal.id);
              return (
                <motion.div key={goal.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={cn('bg-card rounded-2xl border border-border shadow-sm overflow-hidden', goal.status === 'closed' && 'opacity-70')}>
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-heading font-bold text-foreground">{goal.title}</h3>
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', goal.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                            {goal.status === 'active' ? l.active : l.closed}
                          </span>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                        )}
                      </div>
                      {goal.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 min-h-[40px] text-muted-foreground"
                          disabled={closingId === goal.id}
                          onClick={() => closeGoal(goal.id)}
                        >
                          {closingId === goal.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <><Lock className="w-3.5 h-3.5 mr-1" />{l.closeGoal}</>
                          }
                        </Button>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-emerald-600">€{(goal.raised_amount / 100).toFixed(2)} {l.raised}</span>
                        <span className="text-muted-foreground">{l.of} €{(goal.target_amount / 100).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pct}%</span>
                        <span>{goalTxs.length} {l.donations}</span>
                      </div>
                    </div>

                    {/* Recent donations */}
                    {goalTxs.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{l.recentDonations}</p>
                        {goalTxs.slice(0, 5).map(tx => (
                          <div key={tx.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="text-foreground font-medium">{tx.volunteer_name}</span>
                              <span className="text-muted-foreground truncate max-w-[120px]">· {tx.task_title}</span>
                            </div>
                            <span className="font-semibold text-emerald-600 shrink-0">€{(tx.amount / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default DonationGoals;
