import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, CalendarDays, Radio, Ticket, Loader2, Send, Users, QrCode } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import Logo from '@/components/Logo';

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
  const [selectedEventId, setSelectedEventId] = useState('');
  const [volunteers, setVolunteers] = useState<VolunteerTicketRow[]>([]);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);

  // Load club & events
  useEffect(() => {
    const init = async () => {
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

      const { data: evts } = await supabase.from('events').select('id, title, event_date').eq('club_id', cid).order('event_date', { ascending: false });
      setEvents(evts || []);

      setLoading(false);
    };
    init();
  }, [navigate]);

  // Load volunteers + tickets when event changes
  useEffect(() => {
    if (!clubId || !selectedEventId) { setVolunteers([]); return; }
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
      let partnerMemberMap: Record<string, string> = {};
      if (partnerMemberIds.length > 0) {
        const { data: partnerMembers } = await supabase.from('partner_members').select('id, full_name').in('id', partnerMemberIds);
        partnerMemberMap = Object.fromEntries((partnerMembers || []).map(m => [m.id, m.full_name || 'Onbekend']));
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
        });
      });

      // Partner members
      (partnerAssignments || []).forEach(a => {
        const ticket = ticketMap[a.partner_member_id + '_' + a.task_id];
        rows.push({
          id: ticket?.id || `partner_${a.partner_member_id}_${a.task_id}`,
          volunteer_id: a.partner_member_id,
          task_id: a.task_id,
          status: ticket?.status || 'none',
          checked_in_at: ticket?.checked_in_at || null,
          external_ticket_id: ticket?.external_ticket_id || null,
          error_message: ticket?.error_message || null,
          volunteer_name: `${partnerMemberMap[a.partner_member_id] || 'Onbekend'} (partner)`,
          task_title: taskMap[a.task_id] || '',
        });
      });

      if (rows.length === 0) { setVolunteers([]); return; }
      setVolunteers(rows);
    };
    loadVolunteers();
  }, [clubId, selectedEventId]);

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
      if (!selectedEventId) return;
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
    }, 5000);

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

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'checked_in': return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{labels.checkedIn}</Badge>;
      case 'sent': return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">{labels.sent}</Badge>;
      default: return <Badge variant="secondary">{labels.noTicket}</Badge>;
    }
  };

  // Progress calculations
  const totalVolunteers = volunteers.length;
  const checkedInCount = volunteers.filter(v => v.status === 'checked_in').length;
  const sentCount = volunteers.filter(v => v.status === 'sent').length;
  const progressPercent = totalVolunteers > 0 ? Math.round((checkedInCount / totalVolunteers) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/club-dashboard')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Logo />
          <h1 className="text-lg font-bold text-foreground ml-2">{labels.title}</h1>
          <div className="ml-auto">
            <Button onClick={() => navigate('/scan')} size="sm" className="gap-2">
              <QrCode className="w-4 h-4" />
              QR Scanner
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
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
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder={labels.selectEvent} />
                  </SelectTrigger>
                  <SelectContent>
                    {events.length === 0 ? (
                      <SelectItem value="__none" disabled>{labels.noEvents}</SelectItem>
                    ) : events.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title} {e.event_date ? `(${new Date(e.event_date).toLocaleDateString()})` : ''}
                      </SelectItem>
                    ))}
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
                            <TableHead>{labels.ticketStatus}</TableHead>
                            <TableHead className="text-right">{labels.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {volunteers.map(v => (
                            <TableRow key={v.id}>
                              <TableCell className="font-medium">{v.volunteer_name}</TableCell>
                              <TableCell className="text-muted-foreground">{v.task_title}</TableCell>
                              <TableCell>
                                <StatusBadge status={v.status} />
                                {v.error_message && (
                                  <p className="text-xs text-destructive mt-1">{v.error_message}</p>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {v.status === 'none' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleGenerateTicket(v.volunteer_id, v.task_id || '')}
                                    disabled={generatingIds.has(v.volunteer_id + '_' + v.task_id)}
                                    className="gap-1.5"
                                  >
                                    {generatingIds.has(v.volunteer_id + '_' + v.task_id) ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Ticket className="w-3.5 h-3.5" />
                                    )}
                                    {labels.generate}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
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
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder={labels.selectEvent} />
                </SelectTrigger>
                <SelectContent>
                  {events.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} {e.event_date ? `(${new Date(e.event_date).toLocaleDateString()})` : ''}
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

                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{labels.volunteer}</TableHead>
                            <TableHead>{labels.task}</TableHead>
                            <TableHead>{labels.ticketStatus}</TableHead>
                            <TableHead>{labels.checkedInAt}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {volunteers.map(v => (
                            <TableRow key={v.id} className={v.status === 'checked_in' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                              <TableCell className="font-medium">{v.volunteer_name}</TableCell>
                              <TableCell className="text-muted-foreground">{v.task_title}</TableCell>
                              <TableCell><StatusBadge status={v.status} /></TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {v.checked_in_at ? new Date(v.checked_in_at).toLocaleTimeString() : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TicketingDashboard;
