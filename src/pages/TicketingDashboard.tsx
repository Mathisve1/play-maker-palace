import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { ArrowLeft, CalendarDays, Radio, Ticket, Loader2, Send, Users, QrCode, Mail, CheckCircle2, AlertCircle, Search, UserCheck, Clock, Bell } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ClubPageLayout from '@/components/ClubPageLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

const t = {
  nl: {
    back: 'Terug naar dashboard',
    title: 'Ticketing Dashboard',
    planning: 'Planning',
    live: 'Live Opvolging',
    selectEvent: 'Selecteer evenement',
    volunteer: 'Vrijwilliger',
    task: 'Taak',
    ticketStatus: 'Ticketstatus',
    actions: 'Acties',
    generate: 'Genereer Ticket',
    generateAll: 'Genereer Alle Tickets',
    generating: 'Genereren...',
    noTicket: 'Geen ticket',
    sent: 'Verzonden',
    checkedIn: 'Ingecheckt',
    checkedInAt: 'Ingecheckt om',
    progress: 'stewards ingecheckt',
    noVolunteers: 'Geen vrijwilligers voor dit evenement',
    noEvents: 'Geen evenementen beschikbaar',
    success: 'Succes',
    error: 'Fout',
    sendReminder: 'Stuur herinnering naar allen',
    reminderConfirmTitle: 'Herinnering versturen',
    reminderConfirmDesc: 'Je staat op het punt een herinnering te sturen naar {count} vrijwilliger(s) met een ongelezen ticket.',
    reminderSending: 'Versturen...',
    reminderSent: 'Herinneringen verstuurd',
    lastUpdate: 'Laatste update',
    perTask: 'Per taak',
  },
  fr: {
    back: 'Retour au tableau de bord',
    title: 'Tableau de bord Ticketing',
    planning: 'Planification',
    live: 'Suivi en direct',
    selectEvent: "Sélectionner l'événement",
    volunteer: 'Bénévole',
    task: 'Tâche',
    ticketStatus: 'Statut du ticket',
    actions: 'Actions',
    generate: 'Générer le ticket',
    generateAll: 'Générer tous les tickets',
    generating: 'Génération...',
    noTicket: 'Pas de ticket',
    sent: 'Envoyé',
    checkedIn: 'Enregistré',
    checkedInAt: 'Enregistré à',
    progress: 'stewards enregistrés',
    noVolunteers: 'Aucun bénévole pour cet événement',
    noEvents: 'Aucun événement disponible',
    success: 'Succès',
    error: 'Erreur',
    sendReminder: 'Envoyer un rappel à tous',
    reminderConfirmTitle: 'Envoyer un rappel',
    reminderConfirmDesc: 'Vous allez envoyer un rappel à {count} bénévole(s) avec un ticket non lu.',
    reminderSending: 'Envoi...',
    reminderSent: 'Rappels envoyés',
    lastUpdate: 'Dernière mise à jour',
    perTask: 'Par tâche',
  },
  en: {
    back: 'Back to dashboard',
    title: 'Ticketing Dashboard',
    planning: 'Planning',
    live: 'Live Tracking',
    selectEvent: 'Select event',
    volunteer: 'Volunteer',
    task: 'Task',
    ticketStatus: 'Ticket status',
    actions: 'Actions',
    generate: 'Generate Ticket',
    generateAll: 'Generate All Tickets',
    generating: 'Generating...',
    noTicket: 'No ticket',
    sent: 'Sent',
    checkedIn: 'Checked in',
    checkedInAt: 'Checked in at',
    progress: 'stewards checked in',
    noVolunteers: 'No volunteers for this event',
    noEvents: 'No events available',
    success: 'Success',
    error: 'Error',
    sendReminder: 'Send reminder to all',
    reminderConfirmTitle: 'Send reminder',
    reminderConfirmDesc: 'You are about to send a reminder to {count} volunteer(s) with an unopened ticket.',
    reminderSending: 'Sending...',
    reminderSent: 'Reminders sent',
    lastUpdate: 'Last update',
    perTask: 'Per task',
  },
};

interface VolunteerTicketRow {
  id: string;
  volunteer_id: string;
  task_id: string | null;
  status: string;
  checked_in_at: string | null;
  external_ticket_id: string | null;
  error_message: string | null;
  volunteer_name: string;
  task_title: string;
  is_partner: boolean;
  has_account: boolean;
  partner_email: string | null;
}

const TicketingDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const labels = t[language as keyof typeof t] || t.nl;

  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('planning');

  // Planning state
  const [events, setEvents] = useState<{ id: string; title: string; event_date: string | null }[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<{ id: string; title: string; month: number; year: number }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isMonthlyPlan, setIsMonthlyPlan] = useState(false);
  const [volunteers, setVolunteers] = useState<VolunteerTicketRow[]>([]);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [sendingEmailIds, setSendingEmailIds] = useState<Set<string>>(new Set());
  const [liveSearch, setLiveSearch] = useState('');
  const [manualCheckingIds, setManualCheckingIds] = useState<Set<string>>(new Set());
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const { clubId: contextClubId } = useClubContext();

  useEffect(() => {
    const init = async () => {
      if (!contextClubId) { navigate('/club-dashboard'); return; }
      setClubId(contextClubId);

      const [evtsRes, plansRes] = await Promise.all([
        supabase.from('events').select('id, title, event_date').eq('club_id', contextClubId).order('event_date', { ascending: false }),
        supabase.from('monthly_plans').select('id, title, month, year').eq('club_id', contextClubId).eq('status', 'published').order('year', { ascending: false }).order('month', { ascending: false }),
      ]);
      setEvents(evtsRes.data || []);
      setMonthlyPlans((plansRes.data || []) as any);

      setLoading(false);
    };
    init();
  }, [contextClubId]);

  // Handle selection change - detect if monthly plan
  const handleSelectChange = (value: string) => {
    if (value.startsWith('mp_')) {
      setSelectedEventId(value.replace('mp_', ''));
      setIsMonthlyPlan(true);
    } else {
      setSelectedEventId(value);
      setIsMonthlyPlan(false);
    }
  };

  // Load volunteers + tickets when event/plan changes
  useEffect(() => {
    if (!clubId || !selectedEventId) { setVolunteers([]); return; }

    if (isMonthlyPlan) {
      // Load monthly plan assigned day signups
      const loadMonthlyVolunteers = async () => {
        const planId = selectedEventId;
        const { data: enrollments } = await supabase
          .from('monthly_enrollments')
          .select('id, volunteer_id')
          .eq('plan_id', planId);
        if (!enrollments?.length) { setVolunteers([]); return; }

        const enrollmentIds = enrollments.map(e => e.id);
        const volIdMap = Object.fromEntries(enrollments.map(e => [e.id, e.volunteer_id]));

        const { data: signups } = await supabase
          .from('monthly_day_signups')
          .select('id, enrollment_id, plan_task_id, volunteer_id, status, ticket_barcode')
          .in('enrollment_id', enrollmentIds)
          .eq('status', 'assigned');

        if (!signups?.length) { setVolunteers([]); return; }

        const taskIds = [...new Set(signups.map(s => s.plan_task_id))];
        const volIds = [...new Set(signups.map(s => s.volunteer_id))];

        const [tasksRes, profilesRes, ticketsRes] = await Promise.all([
          supabase.from('monthly_plan_tasks').select('id, title, task_date').in('id', taskIds),
          supabase.from('profiles').select('id, full_name').in('id', volIds),
          supabase.from('volunteer_tickets').select('*').eq('club_id', clubId).eq('event_id', planId),
        ]);

        const taskMap = Object.fromEntries((tasksRes.data || []).map(t => [t.id, t]));
        const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p.full_name || 'Onbekend']));
        const ticketMap = Object.fromEntries((ticketsRes.data || []).map(t => [t.volunteer_id + '_' + t.task_id, t]));

        const rows: VolunteerTicketRow[] = signups.map(s => {
          const task = taskMap[s.plan_task_id];
          const ticket = ticketMap[s.volunteer_id + '_' + s.plan_task_id];
          return {
            id: ticket?.id || s.id,
            volunteer_id: s.volunteer_id,
            task_id: s.plan_task_id,
            status: ticket?.status || 'none',
            checked_in_at: ticket?.checked_in_at || null,
            external_ticket_id: ticket?.external_ticket_id || null,
            error_message: ticket?.error_message || null,
            volunteer_name: profileMap[s.volunteer_id] || 'Onbekend',
            task_title: task ? `${task.title} (${new Date(task.task_date).toLocaleDateString()})` : '',
            is_partner: false,
            has_account: true,
            partner_email: null,
          };
        });
        setVolunteers(rows);
      };
      loadMonthlyVolunteers();
      return;
    }

    // Regular event loading
    const loadVolunteers = async () => {
      const { data: tasks } = await supabase.from('tasks').select('id, title').eq('event_id', selectedEventId).eq('club_id', clubId);
      if (!tasks?.length) { setVolunteers([]); return; }

      const taskIds = tasks.map(t => t.id);
      const taskMap = Object.fromEntries(tasks.map(t => [t.id, t.title]));

      const { data: signups } = await supabase.from('task_signups').select('volunteer_id, task_id').in('task_id', taskIds).eq('status', 'assigned');

      const volIds = [...new Set((signups || []).map(s => s.volunteer_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', volIds.length > 0 ? volIds : ['__none__']);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || 'Onbekend']));

      // Also fetch partner member assignments
      const { data: partnerAssignments } = await supabase.from('partner_task_assignments').select('id, partner_member_id, task_id').in('task_id', taskIds);
      const partnerMemberIds = [...new Set((partnerAssignments || []).map(a => a.partner_member_id))];
      let partnerMemberMap: Record<string, { name: string; email: string | null }> = {};
      if (partnerMemberIds.length > 0) {
        const { data: partnerMembers } = await supabase.from('partner_members').select('id, full_name, email').in('id', partnerMemberIds);
        partnerMemberMap = Object.fromEntries((partnerMembers || []).map(m => [m.id, { name: m.full_name || 'Onbekend', email: m.email || null }]));
      }

      // Check which partner member emails have a matching account in profiles
      const partnerEmails = Object.values(partnerMemberMap).map(m => m.email).filter(Boolean) as string[];
      let accountEmailSet = new Set<string>();
      if (partnerEmails.length > 0) {
        const { data: matchedProfiles } = await supabase.from('profiles').select('email').in('email', partnerEmails);
        accountEmailSet = new Set((matchedProfiles || []).map(p => p.email?.toLowerCase()).filter(Boolean) as string[]);
      }

      const { data: tickets } = await supabase.from('volunteer_tickets').select('*').eq('club_id', clubId).eq('event_id', selectedEventId);
      const ticketMap = Object.fromEntries((tickets || []).map(t => [t.volunteer_id + '_' + t.task_id, t]));

      const rows: VolunteerTicketRow[] = [];

      // Regular volunteers
      (signups || []).forEach(s => {
        const ticket = ticketMap[s.volunteer_id + '_' + s.task_id];
        rows.push({
          id: ticket?.id || `${s.volunteer_id}_${s.task_id}`,
          volunteer_id: s.volunteer_id,
          task_id: s.task_id,
          status: ticket?.status || 'none',
          checked_in_at: ticket?.checked_in_at || null,
          external_ticket_id: ticket?.external_ticket_id || null,
          error_message: ticket?.error_message || null,
          volunteer_name: profileMap[s.volunteer_id] || 'Onbekend',
          task_title: taskMap[s.task_id] || '',
          is_partner: false,
          has_account: true,
          partner_email: null,
        });
      });

      // Partner members
      (partnerAssignments || []).forEach(a => {
        const ticket = ticketMap[a.partner_member_id + '_' + a.task_id];
        const member = partnerMemberMap[a.partner_member_id] || { name: 'Onbekend', email: null };
        const hasAccount = member.email ? accountEmailSet.has(member.email.toLowerCase()) : false;
        rows.push({
          id: ticket?.id || `partner_${a.partner_member_id}_${a.task_id}`,
          volunteer_id: a.partner_member_id,
          task_id: a.task_id,
          status: ticket?.status || 'none',
          checked_in_at: ticket?.checked_in_at || null,
          external_ticket_id: ticket?.external_ticket_id || null,
          error_message: ticket?.error_message || null,
          volunteer_name: `${member.name} (partner)`,
          task_title: taskMap[a.task_id] || '',
          is_partner: true,
          has_account: hasAccount,
          partner_email: member.email,
        });
      });

      if (rows.length === 0) { setVolunteers([]); return; }
      setVolunteers(rows);
    };
    loadVolunteers();
  }, [clubId, selectedEventId, isMonthlyPlan]);

  // Realtime subscription + polling
  useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel(`volunteer_tickets_rt_${clubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteer_tickets', filter: `club_id=eq.${clubId}` }, (payload) => {
        const updated = payload.new as any;
        if (!updated) return;
        setVolunteers(prev => prev.map(v =>
          (v.volunteer_id === updated.volunteer_id && v.task_id === updated.task_id)
            ? { ...v, status: updated.status, checked_in_at: updated.checked_in_at, external_ticket_id: updated.external_ticket_id, error_message: updated.error_message, id: updated.id }
            : v
        ));
      })
      .subscribe();

    const pollInterval = setInterval(async () => {
      if (!selectedEventId || document.visibilityState === 'hidden') return;
      const { data: tickets } = await supabase.from('volunteer_tickets').select('*').eq('club_id', clubId).eq('event_id', selectedEventId);
      if (tickets) {
        const ticketMap = Object.fromEntries(tickets.map(t => [t.volunteer_id + '_' + t.task_id, t]));
        setVolunteers(prev => prev.map(v => {
          const ticket = ticketMap[v.volunteer_id + '_' + v.task_id];
          if (ticket && (ticket.status !== v.status || ticket.checked_in_at !== v.checked_in_at)) {
            return { ...v, status: ticket.status, checked_in_at: ticket.checked_in_at, external_ticket_id: ticket.external_ticket_id, error_message: ticket.error_message, id: ticket.id };
          }
          return v;
        }));
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [clubId, selectedEventId]);

  // Generate ticket (always internal)
  const handleGenerateTicket = async (volunteerId: string, taskId: string) => {
    if (!clubId || !selectedEventId) return;
    const key = volunteerId + '_' + taskId;
    setGeneratingIds(prev => new Set(prev).add(key));
    try {
      const { data, error } = await supabase.functions.invoke('ticketing-generate', {
        body: {
          action: 'create_internal_ticket',
          club_id: clubId,
          event_id: selectedEventId,
          volunteer_id: volunteerId,
          task_id: taskId,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(labels.sent);
      } else {
        toast.error(data?.error || labels.error);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setGeneratingIds(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  // Generate all tickets
  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    const noTicket = volunteers.filter(v => v.status === 'none');
    for (const v of noTicket) {
      await handleGenerateTicket(v.volunteer_id, v.task_id || '');
    }
    setGeneratingAll(false);
  };

  // Send ticket + invite via email for partner members without account
  const handleSendTicketEmail = async (v: VolunteerTicketRow) => {
    if (!clubId || !selectedEventId || !v.partner_email) return;
    const key = v.volunteer_id + '_' + v.task_id;
    setSendingEmailIds(prev => new Set(prev).add(key));
    try {
      const { data, error } = await supabase.functions.invoke('ticketing-generate', {
        body: {
          action: 'send_ticket_email_invite',
          club_id: clubId,
          event_id: selectedEventId,
          volunteer_id: v.volunteer_id,
          task_id: v.task_id,
          email: v.partner_email,
          volunteer_name: v.volunteer_name.replace(' (partner)', ''),
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(language === 'nl' ? 'Ticket & uitnodiging verstuurd via e-mail' : language === 'fr' ? 'Ticket & invitation envoyés par e-mail' : 'Ticket & invitation sent via email');
      } else {
        toast.error(data?.error || labels.error);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setSendingEmailIds(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  // Manual check-in without QR
  const handleManualCheckin = async (v: VolunteerTicketRow) => {
    if (!clubId || !selectedEventId) return;
    const key = v.volunteer_id + '_' + v.task_id;
    setManualCheckingIds(prev => new Set(prev).add(key));
    try {
      // First ensure a ticket exists
      let barcode = '';
      const { data: existingTicket } = await supabase
        .from('volunteer_tickets')
        .select('id, barcode')
        .eq('volunteer_id', v.volunteer_id)
        .eq('event_id', selectedEventId)
        .eq('club_id', clubId)
        .maybeSingle();

      if (existingTicket) {
        barcode = existingTicket.barcode || '';
        // Update directly to checked_in
        await supabase
          .from('volunteer_tickets')
          .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
          .eq('id', existingTicket.id);
      } else {
        // Create ticket and immediately check in
        barcode = `VT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        await supabase
          .from('volunteer_tickets')
          .insert({
            club_id: clubId,
            event_id: selectedEventId,
            volunteer_id: v.volunteer_id,
            task_id: v.task_id,
            barcode,
            status: 'checked_in' as any,
            checked_in_at: new Date().toISOString(),
          });
      }

      // Update local state
      setVolunteers(prev => prev.map(vol =>
        (vol.volunteer_id === v.volunteer_id && vol.task_id === v.task_id)
          ? { ...vol, status: 'checked_in', checked_in_at: new Date().toISOString() }
          : vol
      ));
      toast.success(`${v.volunteer_name} ingecheckt`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setManualCheckingIds(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'checked_in': return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{labels.checkedIn}</Badge>;
      case 'sent': return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">{labels.sent}</Badge>;
      default: return <Badge variant="secondary">{labels.noTicket}</Badge>;
    }
  };

  // Account status badge for partner members
  const AccountBadge = ({ v }: { v: VolunteerTicketRow }) => {
    if (!v.is_partner) return null;
    if (v.has_account) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Account
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="w-3 h-3" />
        Geen account
      </Badge>
    );
  };

  // Progress calculations
  const totalVolunteers = volunteers.length;
  const checkedInCount = volunteers.filter(v => v.status === 'checked_in').length;
  const sentCount = volunteers.filter(v => v.status === 'sent').length;
  const progressPercent = totalVolunteers > 0 ? Math.round((checkedInCount / totalVolunteers) * 100) : 0;

  if (loading) {
    return (
      <ClubPageLayout><DashboardSkeleton /></ClubPageLayout>
    );
  }

  return (
    <ClubPageLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-foreground">{labels.title}</h1>
          <Button onClick={() => navigate('/scan')} size="sm" className="gap-2">
            <QrCode className="w-4 h-4" />
            QR Scanner
          </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="planning" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              {labels.planning}
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-2">
              <Radio className="w-4 h-4" />
              {labels.live}
            </TabsTrigger>
            <TabsTrigger value="scan" className="gap-2" onClick={() => navigate('/scan')}>
              <QrCode className="w-4 h-4" />
              Scanner
            </TabsTrigger>
          </TabsList>

          {/* PLANNING TAB */}
          <TabsContent value="planning">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Select value={isMonthlyPlan ? `mp_${selectedEventId}` : selectedEventId} onValueChange={handleSelectChange}>
                  <SelectTrigger className="w-full sm:w-80 min-w-[200px]">
                    <SelectValue placeholder={labels.selectEvent} className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.length === 0 && monthlyPlans.length === 0 ? (
                      <SelectItem value="__none" disabled>{labels.noEvents}</SelectItem>
                    ) : (
                      <>
                        {events.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.title} {e.event_date ? `(${new Date(e.event_date).toLocaleDateString()})` : ''}
                          </SelectItem>
                        ))}
                        {monthlyPlans.length > 0 && events.length > 0 && (
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Maandplannen</div>
                        )}
                        {monthlyPlans.map(mp => (
                          <SelectItem key={`mp_${mp.id}`} value={`mp_${mp.id}`}>
                            📅 {mp.title || `Maandplan ${mp.month}/${mp.year}`}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {selectedEventId && volunteers.some(v => v.status === 'none') && (
                  <Button onClick={handleGenerateAll} disabled={generatingAll} className="gap-2">
                    {generatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {labels.generateAll}
                  </Button>
                )}
              </div>

              {selectedEventId && (
                <Card>
                  <CardContent className="p-0">
                    {volunteers.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        {labels.noVolunteers}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{labels.volunteer}</TableHead>
                            <TableHead>{labels.task}</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead>{labels.ticketStatus}</TableHead>
                            <TableHead className="text-right">{labels.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {volunteers.map(v => {
                            const key = v.volunteer_id + '_' + v.task_id;
                            return (
                            <TableRow key={v.id}>
                              <TableCell className="font-medium">{v.volunteer_name}</TableCell>
                              <TableCell className="text-muted-foreground">{v.task_title}</TableCell>
                              <TableCell>
                                <AccountBadge v={v} />
                                {!v.is_partner && <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={v.status} />
                                {v.error_message && (
                                  <p className="text-xs text-destructive mt-1">{v.error_message}</p>
                                )}
                              </TableCell>
                              <TableCell className="text-right flex gap-1.5 justify-end">
                                {v.status === 'none' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleGenerateTicket(v.volunteer_id, v.task_id || '')}
                                    disabled={generatingIds.has(key)}
                                    className="gap-1.5"
                                  >
                                    {generatingIds.has(key) ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Ticket className="w-3.5 h-3.5" />
                                    )}
                                    {labels.generate}
                                  </Button>
                                )}
                                {v.is_partner && !v.has_account && v.partner_email && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleSendTicketEmail(v)}
                                    disabled={sendingEmailIds.has(key)}
                                    className="gap-1.5"
                                  >
                                    {sendingEmailIds.has(key) ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Mail className="w-3.5 h-3.5" />
                                    )}
                                    E-mail ticket & uitnodiging
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* LIVE TAB */}
          <TabsContent value="live">
            <div className="space-y-4">
              <Select value={isMonthlyPlan ? `mp_${selectedEventId}` : selectedEventId} onValueChange={handleSelectChange}>
                <SelectTrigger className="w-full sm:w-80 min-w-[200px]">
                  <SelectValue placeholder={labels.selectEvent} className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} {e.event_date ? `(${new Date(e.event_date).toLocaleDateString()})` : ''}
                    </SelectItem>
                  ))}
                  {monthlyPlans.length > 0 && events.length > 0 && (
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Maandplannen</div>
                  )}
                  {monthlyPlans.map(mp => (
                    <SelectItem key={`mp_${mp.id}`} value={`mp_${mp.id}`}>
                      📅 {mp.title || `Maandplan ${mp.month}/${mp.year}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedEventId && (
                <>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-foreground">
                          {checkedInCount} / {totalVolunteers} {labels.progress}
                        </span>
                        <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-3" />
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> {labels.checkedIn}: {checkedInCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" /> {labels.sent}: {sentCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground" /> {labels.noTicket}: {totalVolunteers - checkedInCount - sentCount}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Search for manual check-in */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Zoek vrijwilliger om handmatig in te checken..."
                      value={liveSearch}
                      onChange={(e) => setLiveSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{labels.volunteer}</TableHead>
                            <TableHead>{labels.task}</TableHead>
                            <TableHead>{labels.ticketStatus}</TableHead>
                            <TableHead>{labels.checkedInAt}</TableHead>
                            <TableHead className="text-right">{labels.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {volunteers
                            .filter(v => !liveSearch || v.volunteer_name.toLowerCase().includes(liveSearch.toLowerCase()))
                            .map(v => {
                              const key = v.volunteer_id + '_' + v.task_id;
                              return (
                                <TableRow key={v.id} className={v.status === 'checked_in' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                                  <TableCell className="font-medium">{v.volunteer_name}</TableCell>
                                  <TableCell className="text-muted-foreground">{v.task_title}</TableCell>
                                  <TableCell><StatusBadge status={v.status} /></TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {v.checked_in_at ? new Date(v.checked_in_at).toLocaleTimeString() : '—'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {v.status !== 'checked_in' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleManualCheckin(v)}
                                        disabled={manualCheckingIds.has(key)}
                                        className="gap-1.5"
                                      >
                                        {manualCheckingIds.has(key) ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <UserCheck className="w-3.5 h-3.5" />
                                        )}
                                        Inchecken
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ClubPageLayout>
  );
};

export default TicketingDashboard;
