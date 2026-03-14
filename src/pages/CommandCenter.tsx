import { useEffect, useState, useCallback } from 'react';
import ShiftSwapApprovals from '@/components/ShiftSwapApprovals';
import { sendPush } from '@/lib/sendPush';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ClubPageLayout from '@/components/ClubPageLayout';
import VolunteerStepper, { StepStatus } from '@/components/VolunteerStepper';
import SendContractConfirmDialog from '@/components/SendContractConfirmDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users, UserCheck, UserX, FileSignature, Ticket, Clock, CheckCircle2,
  ChevronDown, ChevronUp, Inbox, Loader2, Filter,
} from 'lucide-react';
import { ActionListSkeleton } from '@/components/dashboard/DashboardSkeleton';

interface ActionItem {
  id: string;
  type: 'enrollment' | 'task_signup' | 'day_signup' | 'contract' | 'ticket';
  volunteer_id: string;
  volunteer_name: string;
  volunteer_email: string | null;
  context_label: string; // task/plan title
  context_date: string | null;
  // For enrollments/task_signups
  source_id: string; // enrollment_id, signup_id, day_signup_id
  // Extra data
  plan_id?: string;
  task_id?: string;
  enrollment_id?: string;
  contract_template_id?: string | null;
  has_monthly_contract?: boolean;
  // Rich data for contract dialog
  _volunteer?: any;
  _task?: any;
}

const typeConfig = {
  enrollment: { icon: Users, color: 'text-yellow-600 bg-yellow-500/10', label: { nl: 'Inschrijving goedkeuren', fr: 'Approuver l\'inscription', en: 'Approve enrollment' } },
  task_signup: { icon: UserCheck, color: 'text-blue-600 bg-blue-500/10', label: { nl: 'Taak-aanmelding toekennen', fr: 'Attribuer l\'inscription', en: 'Assign task signup' } },
  day_signup: { icon: Clock, color: 'text-orange-600 bg-orange-500/10', label: { nl: 'Dag-aanmelding toekennen', fr: 'Attribuer l\'inscription jour', en: 'Assign day signup' } },
  contract: { icon: FileSignature, color: 'text-indigo-600 bg-indigo-500/10', label: { nl: 'Contract versturen', fr: 'Envoyer le contrat', en: 'Send contract' } },
  ticket: { icon: Ticket, color: 'text-purple-600 bg-purple-500/10', label: { nl: 'Ticket genereren', fr: 'Générer le ticket', en: 'Generate ticket' } },
};

const CommandCenter = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { clubId: contextClubId, clubInfo: contextClubInfo, profile: contextProfile } = useClubContext();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [contractConfirm, setContractConfirm] = useState<{ volunteer: any; task: any } | null>(null);

  const t = language === 'nl' ? {
    title: 'Actielijst',
    subtitle: 'Alle openstaande acties op één plek',
    empty: 'Alles is afgehandeld! 🎉',
    selectAll: 'Selecteer alles',
    bulkApprove: 'Goedkeuren',
    bulkAssign: 'Toekennen',
    selected: 'geselecteerd',
    all: 'Alles',
  } : language === 'fr' ? {
    title: 'Liste d\'actions',
    subtitle: 'Toutes les actions en attente en un seul endroit',
    empty: 'Tout est traité! 🎉',
    selectAll: 'Tout sélectionner',
    bulkApprove: 'Approuver',
    bulkAssign: 'Attribuer',
    selected: 'sélectionnés',
    all: 'Tout',
  } : {
    title: 'Action List',
    subtitle: 'All pending actions in one place',
    empty: 'All caught up! 🎉',
    selectAll: 'Select all',
    bulkApprove: 'Approve',
    bulkAssign: 'Assign',
    selected: 'selected',
    all: 'All',
  };

  const loadData = useCallback(async () => {
    if (!contextClubId) { setLoading(false); return; }
    setClubId(contextClubId);

    const actionItems: ActionItem[] = [];

    // Parallel: tasks + monthly plans (independent queries)
    const [{ data: tasks }, { data: plans }] = await Promise.all([
      supabase.from('tasks')
        .select('id, title, task_date, location, start_time, end_time, expense_amount, expense_reimbursement, contract_template_id')
        .eq('club_id', contextClubId)
        .eq('status', 'open'),
      supabase.from('monthly_plans')
        .select('id, title, month, year, contract_template_id')
        .eq('club_id', contextClubId)
        .eq('status', 'published'),
    ]);

    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);

      // Parallel: signups + tickets + signatures for tasks
      const [{ data: signups }, { data: existingTickets }, { data: existingSignatures }] = await Promise.all([
        supabase.from('task_signups')
          .select('id, task_id, volunteer_id, status')
          .in('task_id', taskIds)
          .in('status', ['pending', 'assigned']),
        supabase.from('volunteer_tickets')
          .select('volunteer_id, task_id')
          .eq('club_id', club.id)
          .in('task_id', taskIds),
        supabase.from('signature_requests')
          .select('task_id, volunteer_id')
          .in('task_id', taskIds),
      ]);
      const ticketSet = new Set((existingTickets || []).map(t => `${t.volunteer_id}_${t.task_id}`));
      const signatureSet = new Set((existingSignatures || []).map(s => `${s.volunteer_id}_${s.task_id}`));

      if (signups && signups.length > 0) {
        const volIds = [...new Set(signups.map(s => s.volunteer_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, phone, bank_iban, bank_holder_name').in('id', volIds);
        const pMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const tMap = new Map(tasks.map(t => [t.id, t]));

        signups.forEach(s => {
          const vol = pMap.get(s.volunteer_id);
          const task = tMap.get(s.task_id);

          if (s.status === 'pending') {
            actionItems.push({
              id: `ts-${s.id}`, type: 'task_signup', volunteer_id: s.volunteer_id,
              volunteer_name: vol?.full_name || vol?.email || '?',
              volunteer_email: vol?.email || null,
              context_label: task?.title || '?', context_date: task?.task_date || null,
              source_id: s.id, task_id: s.task_id,
              contract_template_id: task?.contract_template_id,
              _volunteer: vol, _task: task,
            });
          }

          if (s.status === 'assigned') {
            // Contract needed? Only if no signature request exists yet
            if (task?.contract_template_id && !signatureSet.has(`${s.volunteer_id}_${s.task_id}`)) {
              actionItems.push({
                id: `tctr-${s.id}`, type: 'contract', volunteer_id: s.volunteer_id,
                volunteer_name: vol?.full_name || vol?.email || '?',
                volunteer_email: vol?.email || null,
                context_label: task?.title || '?', context_date: task?.task_date || null,
                source_id: s.id, task_id: s.task_id,
                contract_template_id: task?.contract_template_id,
                _volunteer: vol, _task: task,
              });
            }

            // Ticket needed? (assigned but no ticket generated yet)
            if (task?.id && !ticketSet.has(`${s.volunteer_id}_${s.task_id}`)) {
              actionItems.push({
                id: `ttkt-${s.id}`, type: 'ticket', volunteer_id: s.volunteer_id,
                volunteer_name: vol?.full_name || vol?.email || '?',
                volunteer_email: vol?.email || null,
                context_label: task?.title || '?', context_date: task?.task_date || null,
                source_id: s.id, task_id: s.task_id,
              });
            }
          }
        });
      }
    }

    // 2. Monthly planning: pending enrollments, contracts, day signups, tickets

    if (plans && plans.length > 0) {
      const planIds = plans.map(p => p.id);
      const planMap = new Map(plans.map(p => [p.id, p]));

      const { data: enrollments } = await supabase
        .from('monthly_enrollments')
        .select('id, plan_id, volunteer_id, approval_status, contract_status, profiles:volunteer_id(full_name, email, phone, bank_iban, bank_holder_name)')
        .in('plan_id', planIds);

      const enrs = (enrollments || []) as any[];

      enrs.forEach(e => {
        const plan = planMap.get(e.plan_id);
        const vol = e.profiles || {};
        const name = vol.full_name || vol.email || '?';
        const email = vol.email || null;
        const planLabel = plan?.title || `${plan?.month}/${plan?.year}`;

        if (e.approval_status === 'pending') {
          actionItems.push({
            id: `enr-${e.id}`, type: 'enrollment', volunteer_id: e.volunteer_id,
            volunteer_name: name, volunteer_email: email,
            context_label: planLabel, context_date: null,
            source_id: e.id, plan_id: e.plan_id,
            contract_template_id: plan?.contract_template_id,
          });
        }
        if (e.approval_status === 'approved' && e.contract_status === 'pending' && plan?.contract_template_id) {
          actionItems.push({
            id: `ctr-${e.id}`, type: 'contract', volunteer_id: e.volunteer_id,
            volunteer_name: name, volunteer_email: email,
            context_label: planLabel, context_date: null,
            source_id: e.id, plan_id: e.plan_id,
            contract_template_id: plan?.contract_template_id,
            _volunteer: { id: e.volunteer_id, full_name: vol.full_name, email: vol.email, phone: vol.phone, bank_iban: vol.bank_iban, bank_holder_name: vol.bank_holder_name },
            _task: { id: e.plan_id, title: planLabel, contract_template_id: plan?.contract_template_id, task_date: null, location: null },
          });
        }
      });

      // Day signups
      if (enrs.length > 0) {
        const enrIds = enrs.map(e => e.id);
        const { data: daySignups } = await supabase
          .from('monthly_day_signups')
          .select('id, enrollment_id, plan_task_id, volunteer_id, status, ticket_barcode')
          .in('enrollment_id', enrIds);

        if (daySignups && daySignups.length > 0) {
          const taskIds = [...new Set(daySignups.map(d => d.plan_task_id))];
          const { data: planTasks } = await supabase
            .from('monthly_plan_tasks')
            .select('id, title, task_date')
            .in('id', taskIds);
          const ptMap = new Map((planTasks || []).map(t => [t.id, t]));

          daySignups.forEach(ds => {
            const enr = enrs.find((e: any) => e.id === ds.enrollment_id);
            const planTask = ptMap.get(ds.plan_task_id);
            const name = enr?.profiles?.full_name || enr?.profiles?.email || '?';

            if (ds.status === 'pending') {
              actionItems.push({
                id: `ds-${ds.id}`, type: 'day_signup', volunteer_id: ds.volunteer_id,
                volunteer_name: name, volunteer_email: enr?.profiles?.email || null,
                context_label: planTask?.title || '?', context_date: planTask?.task_date || null,
                source_id: ds.id, enrollment_id: ds.enrollment_id,
              });
            }
            if (ds.status === 'assigned' && !ds.ticket_barcode) {
              actionItems.push({
                id: `tkt-${ds.id}`, type: 'ticket', volunteer_id: ds.volunteer_id,
                volunteer_name: name, volunteer_email: enr?.profiles?.email || null,
                context_label: planTask?.title || '?', context_date: planTask?.task_date || null,
                source_id: ds.id, enrollment_id: ds.enrollment_id,
              });
            }
          });
        }
      }
    }

    setItems(actionItems);
    setSelected(new Set());
    setLoading(false);
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime subscriptions for live updates (debounced)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadData(), 1000);
    };

    const channel = supabase
      .channel('command-center-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_signups' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_enrollments' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_day_signups' }, debouncedLoad)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/club-login');
  };

  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const getSteps = (item: ActionItem) => {
    const steps: { label: string; status: StepStatus }[] = [];

    if (item.type === 'enrollment') {
      steps.push({ label: t3('Aangemeld', 'Inscrit', 'Signed up'), status: 'completed' });
      steps.push({ label: t3('Goedkeuren', 'Approuver', 'Approve'), status: 'active' });
      steps.push({ label: 'Contract', status: 'upcoming' });
      steps.push({ label: t3('Actief', 'Actif', 'Active'), status: 'upcoming' });
    } else if (item.type === 'task_signup') {
      steps.push({ label: t3('Aangemeld', 'Inscrit', 'Signed up'), status: 'completed' });
      steps.push({ label: t3('Toekennen', 'Attribuer', 'Assign'), status: 'active' });
      if (item.contract_template_id) steps.push({ label: 'Contract', status: 'upcoming' });
      steps.push({ label: t3('Actief', 'Actif', 'Active'), status: 'upcoming' });
    } else if (item.type === 'contract') {
      steps.push({ label: t3('Aangemeld', 'Inscrit', 'Signed up'), status: 'completed' });
      steps.push({ label: t3('Goedgekeurd', 'Approuvé', 'Approved'), status: 'completed' });
      steps.push({ label: 'Contract', status: 'active' });
      steps.push({ label: t3('Actief', 'Actif', 'Active'), status: 'upcoming' });
    } else if (item.type === 'day_signup') {
      steps.push({ label: 'Contract', status: 'completed' });
      steps.push({ label: t3('Dag aangemeld', 'Inscription jour', 'Day signup'), status: 'completed' });
      steps.push({ label: t3('Toekennen', 'Attribuer', 'Assign'), status: 'active' });
      steps.push({ label: 'Ticket', status: 'upcoming' });
    } else if (item.type === 'ticket') {
      steps.push({ label: t3('Toegekend', 'Attribué', 'Assigned'), status: 'completed' });
      steps.push({ label: 'Ticket', status: 'active' });
    }
    return steps;
  };

  // Single actions
  const handleAction = async (item: ActionItem) => {
    setProcessing(true);
    try {
      if (item.type === 'enrollment') {
        await supabase.from('monthly_enrollments').update({ approval_status: 'approved' }).eq('id', item.source_id);
        toast.success(t3('Goedgekeurd!', 'Approuvé !', 'Approved!'));
        sendPush({ userId: item.volunteer_id, title: '✅ Inschrijving goedgekeurd', message: `Je inschrijving voor "${item.context_label}" is goedgekeurd!`, url: '/dashboard', type: 'enrollment_approved' });
      } else if (item.type === 'task_signup') {
        await supabase.from('task_signups').update({ status: 'assigned' }).eq('id', item.source_id);
        toast.success(t3('Toegekend!', 'Attribué !', 'Assigned!'));
        sendPush({ userId: item.volunteer_id, title: '✅ Taak toegekend', message: `Je bent toegekend aan "${item.context_label}".`, url: '/dashboard', type: 'task_assigned' });
        // Trigger contract dialog if template exists
        if (item.contract_template_id && item.task_id) {
          setContractConfirm({
            volunteer: { id: item.volunteer_id, full_name: item.volunteer_name, email: item.volunteer_email },
            task: { id: item.task_id, title: item.context_label, contract_template_id: item.contract_template_id },
          });
        }
      } else if (item.type === 'day_signup') {
        await supabase.from('monthly_day_signups').update({ status: 'assigned' }).eq('id', item.source_id);
        toast.success(t3('Toegekend!', 'Attribué !', 'Assigned!'));
        sendPush({ userId: item.volunteer_id, title: '✅ Dag toegekend', message: `Je dag-aanmelding voor "${item.context_label}" is bevestigd.`, url: '/dashboard', type: 'day_assigned' });
      } else if (item.type === 'ticket') {
        if (item.id.startsWith('tkt-')) {
          // Monthly day signup ticket
          const barcode = `MP-${item.source_id.slice(0, 8).toUpperCase()}`;
          await supabase.from('monthly_day_signups').update({ ticket_barcode: barcode }).eq('id', item.source_id);
        } else if (item.task_id && clubId) {
          // Task-level ticket
          const barcode = `VT-${item.source_id.slice(0, 8).toUpperCase()}`;
          await supabase.from('volunteer_tickets').insert({
            club_id: clubId, volunteer_id: item.volunteer_id, task_id: item.task_id,
            barcode, status: 'sent',
          });
        }
        toast.success(t3('Ticket gegenereerd!', 'Ticket généré !', 'Ticket generated!'));
        sendPush({ userId: item.volunteer_id, title: '🎫 Ticket ontvangen', message: `Je ticket voor "${item.context_label}" is klaar!`, url: '/dashboard', type: 'ticket_generated' });
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setProcessing(false);
  };

  const handleReject = async (item: ActionItem) => {
    setProcessing(true);
    try {
      if (item.type === 'enrollment') {
        await supabase.from('monthly_enrollments').update({ approval_status: 'rejected' }).eq('id', item.source_id);
      } else if (item.type === 'task_signup') {
        await supabase.from('task_signups').update({ status: 'rejected' }).eq('id', item.source_id);
      } else if (item.type === 'day_signup') {
        await supabase.from('monthly_day_signups').update({ status: 'rejected' }).eq('id', item.source_id);
      }
      toast.success(t3('Afgewezen.', 'Rejeté.', 'Rejected.'));
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setProcessing(false);
  };

  // Bulk actions
  const handleBulkAction = async () => {
    if (selected.size === 0) return;
    setProcessing(true);
    const selectedItems = items.filter(i => selected.has(i.id));

    for (const item of selectedItems) {
      try {
        await handleActionSilent(item);
      } catch {}
    }

    toast.success(`${selected.size} ${t3('acties verwerkt', 'actions traitées', 'actions processed')}`);
    await loadData();
    setProcessing(false);
  };

  const handleActionSilent = async (item: ActionItem) => {
    if (item.type === 'enrollment') {
      await supabase.from('monthly_enrollments').update({ approval_status: 'approved' }).eq('id', item.source_id);
    } else if (item.type === 'task_signup') {
      await supabase.from('task_signups').update({ status: 'assigned' }).eq('id', item.source_id);
    } else if (item.type === 'day_signup') {
      await supabase.from('monthly_day_signups').update({ status: 'assigned' }).eq('id', item.source_id);
    } else if (item.type === 'ticket') {
      if (item.id.startsWith('tkt-')) {
        const barcode = `MP-${item.source_id.slice(0, 8).toUpperCase()}`;
        await supabase.from('monthly_day_signups').update({ ticket_barcode: barcode }).eq('id', item.source_id);
      } else if (item.task_id && clubId) {
        const barcode = `VT-${item.source_id.slice(0, 8).toUpperCase()}`;
        await supabase.from('volunteer_tickets').insert({
          club_id: clubId, volunteer_id: item.volunteer_id, task_id: item.task_id,
          barcode, status: 'generated' as any,
        });
      }
    } else if (item.type === 'contract') {
      // Skip in bulk - contracts need manual review via dialog
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filtered = filteredItems;
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(i => i.id)));
    }
  };

  const filteredItems = filterType ? items.filter(i => i.type === filterType) : items;
  const typeCounts = items.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {} as Record<string, number>);

  const actionLabel = (item: ActionItem) => {
    if (item.type === 'enrollment') return t3('Goedkeuren', 'Approuver', 'Approve');
    if (item.type === 'task_signup' || item.type === 'day_signup') return t3('Toekennen', 'Attribuer', 'Assign');
    if (item.type === 'contract') return t3('Contract versturen', 'Envoyer le contrat', 'Send contract');
    if (item.type === 'ticket') return t3('Ticket genereren', 'Générer le ticket', 'Generate ticket');
    return '';
  };

  const canReject = (item: ActionItem) => ['enrollment', 'task_signup', 'day_signup'].includes(item.type);

  return (
    <DashboardLayout
      sidebar={
        <ClubOwnerSidebar
          profile={profile}
          clubId={clubId}
          clubInfo={clubInfo}
          onLogout={handleLogout}
        />
      }
    >
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Inbox className="w-6 h-6 text-primary" />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        {/* Shift swap approvals */}
        {clubId && <ShiftSwapApprovals clubId={clubId} language={language} />}

        {/* Filter tabs + Bulk bar */}
        {items.length > 0 && (
          <div className="space-y-3">
            {/* Type filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterType ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {t.all} ({items.length})
              </button>
              {Object.entries(typeCounts).map(([type, count]) => {
                const cfg = typeConfig[type as keyof typeof typeConfig];
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(filterType === type ? null : type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filterType === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    <cfg.icon className="w-3 h-3" />
                    {cfg.label[language]} ({count})
                  </button>
                );
              })}
            </div>

            {/* Bulk action bar */}
            <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2">
              <Checkbox
                checked={selected.size === filteredItems.length && filteredItems.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-xs text-muted-foreground">
                {selected.size > 0 ? `${selected.size} ${t.selected}` : t.selectAll}
              </span>
              {selected.size > 0 && (
                <Button size="sm" onClick={handleBulkAction} disabled={processing} className="ml-auto gap-1.5">
                  {processing && <Loader2 className="w-3 h-3 animate-spin" />}
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t.bulkApprove} ({selected.size})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <ActionListSkeleton />}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground">{t.empty}</p>
          </motion.div>
        )}

        {/* Action items list */}
        {!loading && filteredItems.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredItems.map(item => {
                const cfg = typeConfig[item.type];
                const steps = getSteps(item);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-card rounded-xl border border-border p-4 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="mt-1"
                      />

                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <cfg.icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {item.volunteer_name[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate">{item.volunteer_name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {cfg.label[language]}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {item.context_label}
                          {item.context_date && ` · ${new Date(item.context_date).toLocaleDateString(language === 'fr' ? 'fr-BE' : language === 'en' ? 'en-GB' : 'nl-BE', { day: 'numeric', month: 'short' })}`}
                        </p>

                        {/* Stepper */}
                        <VolunteerStepper steps={steps} />
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        {item.type === 'contract' ? (
                          <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => {
                            const vol = item._volunteer || { id: item.volunteer_id, full_name: item.volunteer_name, email: item.volunteer_email };
                            const task = item._task || { id: item.task_id || item.source_id, title: item.context_label, contract_template_id: item.contract_template_id, task_date: item.context_date };
                            setContractConfirm({ volunteer: vol, task: { ...task, contract_template_id: item.contract_template_id } });
                          }}>
                            <FileSignature className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{actionLabel(item)}</span>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="gap-1 text-green-700 h-8" onClick={() => handleAction(item)} disabled={processing}>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{actionLabel(item)}</span>
                          </Button>
                        )}
                        {canReject(item) && (
                          <Button size="sm" variant="outline" className="gap-1 text-destructive h-8" onClick={() => handleReject(item)} disabled={processing}>
                            <UserX className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Contract dialog */}
      {contractConfirm && clubId && (
        <SendContractConfirmDialog
          open={!!contractConfirm}
          onOpenChange={(o) => !o && setContractConfirm(null)}
          volunteer={contractConfirm.volunteer}
          task={contractConfirm.task}
          clubId={clubId}
          language={language}
          onSent={() => { setContractConfirm(null); loadData(); }}
        />
      )}
    </DashboardLayout>
  );
};

export default CommandCenter;
