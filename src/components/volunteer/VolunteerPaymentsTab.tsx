import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banknote, CheckCircle, Clock, AlertTriangle, Wallet, Heart, ChevronDown, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface SepaPayoutItem {
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

interface VolunteerPayment {
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

interface DonationGoal {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  raised_amount: number;
  club_id: string;
  club_name: string;
}

interface DonatableTask {
  signup_id: string;
  task_id: string;
  task_title: string;
  task_date: string | null;
  club_name: string;
  expense_reimbursement: number; // cents
}

interface Props {
  sepaPayouts: SepaPayoutItem[];
  payments: VolunteerPayment[];
  language: string;
  userId?: string;
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

type UnifiedRow = {
  id: string;
  source: 'sepa' | 'payment';
  amount: number;
  date: string;
  taskTitle: string;
  clubName: string;
  status: 'paid' | 'processing' | 'error';
  statusLabel: string;
  extra?: string;
};

const VolunteerPaymentsTab = ({ sepaPayouts, payments, language, userId }: Props) => {
  const tr = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  // Donation state
  const [donationGoals, setDonationGoals] = useState<DonationGoal[]>([]);
  const [donatableTasks, setDonatableTasks] = useState<DonatableTask[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [showDonateSheet, setShowDonateSheet] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DonatableTask | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [donating, setDonating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadDonationData();
  }, [userId]);

  const loadDonationData = async () => {
    if (!userId) return;
    setLoadingDonations(true);

    // Clubs this volunteer is a member of
    const { data: memberships } = await supabase
      .from('club_memberships')
      .select('club_id, clubs(name)')
      .eq('volunteer_id', userId)
      .eq('status', 'actief');

    if (!memberships?.length) { setLoadingDonations(false); return; }

    const clubIds = memberships.map((m: any) => m.club_id);
    const clubNameMap = new Map(memberships.map((m: any) => [m.club_id, m.clubs?.name || '']));

    // Active donation goals
    const { data: goalsData } = await supabase
      .from('donation_goals')
      .select('id, title, description, target_amount, raised_amount, club_id')
      .in('club_id', clubIds)
      .eq('status', 'active');

    setDonationGoals(
      (goalsData || []).map((g: any) => ({
        ...g,
        club_name: clubNameMap.get(g.club_id) || '',
      }))
    );

    // Already donated (volunteer_id, task_id) pairs
    const { data: existingDonations } = await supabase
      .from('donation_transactions')
      .select('task_id')
      .eq('volunteer_id', userId);
    const donatedTaskIds = new Set((existingDonations || []).map((d: any) => d.task_id));

    // Completed task signups (checked in) — joined with tasks + clubs
    const { data: signupsData } = await supabase
      .from('task_signups')
      .select('id, task_id, tasks(id, title, task_date, expense_reimbursement, club_id, clubs(name))')
      .eq('volunteer_id', userId)
      .not('checked_in_at', 'is', null);

    const donatable: DonatableTask[] = [];
    for (const s of signupsData || []) {
      const task = (s as any).tasks;
      if (!task) continue;
      if (donatedTaskIds.has(s.task_id)) continue;
      const reimbursement = task.expense_reimbursement || 0;
      if (reimbursement <= 0) continue;
      // Only show tasks from clubs the volunteer is a member of with active goals
      if (!clubIds.includes(task.club_id)) continue;
      donatable.push({
        signup_id: s.id,
        task_id: s.task_id,
        task_title: task.title,
        task_date: task.task_date,
        club_name: task.clubs?.name || '',
        expense_reimbursement: reimbursement,
      });
    }
    setDonatableTasks(donatable);
    setLoadingDonations(false);
  };

  const openDonateSheet = (task: DonatableTask) => {
    setSelectedTask(task);
    // Pre-select first goal from the same club if available
    const clubGoal = donationGoals.find(g => g.club_name === task.club_name);
    setSelectedGoalId(clubGoal?.id || donationGoals[0]?.id || '');
    setShowDonateSheet(true);
  };

  const confirmDonation = async () => {
    if (!selectedTask || !selectedGoalId || !userId) return;
    setDonating(true);
    const { error } = await supabase.from('donation_transactions').insert({
      donation_goal_id: selectedGoalId,
      volunteer_id: userId,
      task_id: selectedTask.task_id,
      amount: selectedTask.expense_reimbursement,
    });
    setDonating(false);
    if (error) {
      toast.error(tr('Er ging iets mis. Probeer opnieuw.', 'Une erreur est survenue.', 'Something went wrong.'));
      return;
    }
    toast.success(tr('💚 Bedankt! Jouw bijdrage maakt het verschil.', '💚 Merci ! Votre contribution fait la différence.', '💚 Thank you! Your contribution makes a difference.'));
    setShowDonateSheet(false);
    setSelectedTask(null);
    loadDonationData();
  };

  // ── Existing payments logic ─────────────────────────────────────────────────

  const rows = useMemo<UnifiedRow[]>(() => {
    const sepaRows: UnifiedRow[] = sepaPayouts.map(s => {
      const isExported = ['downloaded', 'signed'].includes(s.batch_status);
      let status: UnifiedRow['status'] = 'processing';
      let statusLabel = tr('In behandeling', 'En cours', 'Processing');
      if (s.error_flag) {
        status = 'error';
        statusLabel = tr('Fout', 'Erreur', 'Error');
      } else if (isExported) {
        status = 'paid';
        statusLabel = tr('Betaald', 'Payé', 'Paid');
      }
      const est = addBusinessDays(new Date(s.created_at), 2);
      return {
        id: s.id,
        source: 'sepa',
        amount: s.amount,
        date: s.created_at,
        taskTitle: s.task_title || tr('Taak', 'Tâche', 'Task'),
        clubName: s.club_name || '',
        status,
        statusLabel,
        extra: status === 'processing' ? `${tr('Verwacht', 'Estimé', 'Expected')}: ${est.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}` : undefined,
      };
    });

    const payRows: UnifiedRow[] = payments.map(p => {
      let status: UnifiedRow['status'] = 'processing';
      let statusLabel = tr('In behandeling', 'En cours', 'Processing');
      if (p.status === 'succeeded' || p.status === 'paid') {
        status = 'paid';
        statusLabel = tr('Betaald', 'Payé', 'Paid');
      } else if (p.status === 'failed') {
        status = 'error';
        statusLabel = tr('Fout', 'Erreur', 'Error');
      }
      return {
        id: p.id,
        source: 'payment',
        amount: p.amount,
        date: p.paid_at || p.created_at,
        taskTitle: p.task_title || tr('Taak', 'Tâche', 'Task'),
        clubName: p.club_name || '',
        status,
        statusLabel,
      };
    });

    return [...sepaRows, ...payRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sepaPayouts, payments, language]);

  const totalPaid = rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const totalProcessing = rows.filter(r => r.status === 'processing').reduce((s, r) => s + r.amount, 0);

  const statusStyles: Record<UnifiedRow['status'], { bg: string; text: string; icon: typeof CheckCircle }> = {
    paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle },
    processing: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: Clock },
    error: { bg: 'bg-destructive/10', text: 'text-destructive', icon: AlertTriangle },
  };

  const selectedGoal = donationGoals.find(g => g.id === selectedGoalId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
        <Wallet className="w-6 h-6 text-primary" />
        {tr('Vergoedingen', 'Remboursements', 'Payments')}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{tr('Totaal ontvangen', 'Total reçu', 'Total received')}</p>
          <p className="text-2xl font-heading font-bold text-green-600 dark:text-green-400 mt-1">€{totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{tr('In behandeling', 'En cours', 'Processing')}</p>
          <p className="text-2xl font-heading font-bold text-orange-600 dark:text-orange-400 mt-1">€{totalProcessing.toFixed(2)}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Banknote className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium">{tr('Nog geen vergoedingen ontvangen.', 'Aucun remboursement reçu.', 'No payments received yet.')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => {
            const st = statusStyles[row.status];
            const Icon = st.icon;
            return (
              <motion.div key={row.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 shadow-sm border border-border hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{row.taskTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {row.clubName && <p className="text-xs text-muted-foreground">{row.clubName}</p>}
                      {row.source === 'sepa' && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">SEPA</span>
                      )}
                    </div>
                    {row.extra && <p className="text-[11px] text-muted-foreground mt-1">{row.extra}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className={`text-base font-heading font-bold ${row.status === 'paid' ? 'text-green-600 dark:text-green-400' : row.status === 'error' ? 'text-destructive' : 'text-orange-600 dark:text-orange-400'}`}>
                      €{row.amount.toFixed(2)}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                      <Icon className="w-3 h-3" />
                      {row.statusLabel}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(row.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Donation Section ── */}
      {userId && donationGoals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-border/60 bg-emerald-500/5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-foreground">
                {tr('Steun je club', 'Soutenir votre club', 'Support your club')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tr('Doneer de vergoeding van een voltooide taak aan een clubdoel.', 'Donnez la rémunération d\'une tâche à un objectif du club.', 'Donate a completed task payout to a club goal.')}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Active goals */}
            <div className="space-y-3">
              {donationGoals.map(goal => {
                const pct = Math.min(100, Math.round((goal.raised_amount / goal.target_amount) * 100));
                return (
                  <div key={goal.id} className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">{goal.club_name}</p>
                        {goal.description && <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-600">€{(goal.raised_amount / 100).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">/ €{(goal.target_amount / 100).toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{pct}%</p>
                  </div>
                );
              })}
            </div>

            {/* Donatable tasks */}
            {loadingDonations ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : donatableTasks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {tr('Voltooide taken die je kunt doneren:', 'Tâches complétées que vous pouvez donner :', 'Completed tasks you can donate:')}
                </p>
                {donatableTasks.map(task => (
                  <div key={task.task_id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{task.task_title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{task.club_name}</span>
                        {task.task_date && (
                          <>
                            <span>·</span>
                            <span>{new Date(task.task_date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-emerald-600">€{(task.expense_reimbursement / 100).toFixed(2)}</span>
                      <Button
                        size="sm"
                        className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => openDonateSheet(task)}
                      >
                        <Heart className="w-3.5 h-3.5 mr-1" />
                        {tr('Doneer', 'Donner', 'Donate')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {tr('Geen voltooide taken beschikbaar om te doneren.', 'Aucune tâche complétée disponible.', 'No completed tasks available to donate.')}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Donation confirmation sheet (modal) ── */}
      <AnimatePresence>
        {showDonateSheet && selectedTask && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDonateSheet(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl p-6 shadow-xl max-w-lg mx-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-heading font-bold text-foreground">
                  {tr('Bevestig donatie', 'Confirmer le don', 'Confirm donation')}
                </h3>
                <button onClick={() => setShowDonateSheet(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <p className="text-sm text-muted-foreground">{tr('Taak', 'Tâche', 'Task')}</p>
                  <p className="text-base font-semibold text-foreground">{selectedTask.task_title}</p>
                  <p className="text-2xl font-heading font-bold text-emerald-600 mt-1">
                    €{(selectedTask.expense_reimbursement / 100).toFixed(2)}
                  </p>
                </div>

                {/* Goal selector */}
                {donationGoals.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedGoalId}
                      onChange={e => setSelectedGoalId(e.target.value)}
                      className="w-full h-12 text-base rounded-xl border border-border bg-card px-3 pr-8 appearance-none"
                    >
                      {donationGoals.map(g => (
                        <option key={g.id} value={g.id}>{g.title} — {g.club_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                )}

                {selectedGoal && (
                  <p className="text-sm text-muted-foreground">
                    {tr('Voor', 'Pour', 'For')}: <span className="font-medium text-foreground">{selectedGoal.title}</span>
                  </p>
                )}

                <p className="text-sm text-muted-foreground">
                  {tr(
                    'Door te bevestigen geef je jouw vergoeding voor deze taak aan het clubdoel. Dit kan niet ongedaan gemaakt worden.',
                    'En confirmant, vous donnez votre rémunération à l\'objectif du club. Cette action est irréversible.',
                    'By confirming, you donate your task reimbursement to the club goal. This cannot be undone.'
                  )}
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 min-h-[52px] text-base"
                    onClick={() => setShowDonateSheet(false)}>
                    {tr('Annuleren', 'Annuler', 'Cancel')}
                  </Button>
                  <Button
                    className="flex-1 min-h-[52px] text-base bg-emerald-600 hover:bg-emerald-700"
                    disabled={donating || !selectedGoalId}
                    onClick={confirmDonation}
                  >
                    {donating
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tr('Bezig...', 'En cours...', 'Processing...')}</>
                      : <><Heart className="w-4 h-4 mr-2" />{tr('Doneer', 'Donner', 'Donate')}</>
                    }
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VolunteerPaymentsTab;
