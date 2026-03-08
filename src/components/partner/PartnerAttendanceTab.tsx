import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, UserX, Clock, MapPin, Radio } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  event_id: string | null;
  event_title?: string | null;
  partner_acceptance_status: string;
  assigned_members: string[];
  start_time?: string | null;
  end_time?: string | null;
}

interface Member {
  id: string;
  full_name: string;
}

interface Assignment {
  id: string;
  task_id: string;
  partner_member_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

interface Props {
  partnerId: string;
  tasks: Task[];
  members: Member[];
  clubId: string | null;
}

const PartnerAttendanceTab = ({ partnerId, tasks, members, clubId }: Props) => {
  const { language } = useLanguage();
  const nl = language === 'nl';
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  // Group tasks by event
  const events = useMemo(() => {
    const map = new Map<string, { id: string; title: string; date: string | null }>();
    for (const t of tasks.filter(t => t.partner_acceptance_status === 'accepted')) {
      const key = t.event_id || `standalone_${t.id}`;
      if (!map.has(key)) {
        map.set(key, { id: key, title: t.event_title || t.title, date: t.task_date });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const accepted = tasks.filter(t => t.partner_acceptance_status === 'accepted');
    if (selectedEvent === 'all') return accepted;
    return accepted.filter(t => {
      const key = t.event_id || `standalone_${t.id}`;
      return key === selectedEvent;
    });
  }, [tasks, selectedEvent]);

  // Load assignments
  const loadAssignments = async () => {
    const taskIds = filteredTasks.map(t => t.id);
    if (!taskIds.length) { setAssignments([]); return; }
    const { data } = await supabase
      .from('partner_task_assignments')
      .select('id, task_id, partner_member_id, checked_in_at, checked_out_at')
      .in('task_id', taskIds);
    setAssignments((data || []) as Assignment[]);
  };

  useEffect(() => { loadAssignments(); }, [filteredTasks.map(t => t.id).join(',')]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('partner-attendance')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'partner_task_assignments',
      }, () => { loadAssignments(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filteredTasks.map(t => t.id).join(',')]);

  const handleCheckIn = async (assignmentId: string) => {
    const { error } = await supabase
      .from('partner_task_assignments')
      .update({ checked_in_at: new Date().toISOString() } as any)
      .eq('id', assignmentId);
    if (error) toast.error(error.message);
    else { toast.success(nl ? 'Ingecheckt!' : 'Checked in!'); loadAssignments(); }
  };

  const handleCheckOut = async (assignmentId: string) => {
    const { error } = await supabase
      .from('partner_task_assignments')
      .update({ checked_out_at: new Date().toISOString() } as any)
      .eq('id', assignmentId);
    if (error) toast.error(error.message);
    else { toast.success(nl ? 'Uitgecheckt!' : 'Checked out!'); loadAssignments(); }
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.full_name || '?';

  const totalAssigned = filteredTasks.reduce((s, t) => s + t.assigned_members.length, 0);
  const checkedIn = assignments.filter(a => a.checked_in_at && !a.checked_out_at).length;
  const checkedOut = assignments.filter(a => a.checked_out_at).length;
  const notYet = totalAssigned - checkedIn - checkedOut;

  return (
    <div className="space-y-4">
      {/* Event filter */}
      <div className="flex items-center gap-3">
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={nl ? 'Filter event' : 'Filter event'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{nl ? 'Alle events' : 'All events'}</SelectItem>
            {events.map(e => (
              <SelectItem key={e.id} value={e.id}>
                {e.title}{e.date ? ` — ${new Date(e.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radio className="w-3 h-3 text-green-500 animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5">
          <UserCheck className="w-3.5 h-3.5 text-green-500" />
          <span>{nl ? 'Aanwezig' : 'Present'}: {checkedIn}</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5">
          <UserX className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{nl ? 'Verwacht' : 'Expected'}: {notYet}</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>{nl ? 'Vertrokken' : 'Left'}: {checkedOut}</span>
        </Badge>
      </div>

      {/* Per-task attendance */}
      {filteredTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{nl ? 'Geen aanvaarde taken.' : 'No accepted tasks.'}</p>
      ) : filteredTasks.map(task => {
        const taskAssignments = assignments.filter(a => a.task_id === task.id);
        return (
          <Card key={task.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold">{task.title}</p>
                  {task.event_title && <p className="text-[11px] text-primary">{task.event_title}</p>}
                  <div className="flex gap-2 mt-1 text-[11px] text-muted-foreground">
                    {task.task_date && <span>{new Date(task.task_date).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
                    {task.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{task.location}</span>}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {taskAssignments.filter(a => a.checked_in_at && !a.checked_out_at).length}/{task.assigned_members.length}
                </Badge>
              </div>

              {task.assigned_members.length === 0 ? (
                <p className="text-xs text-muted-foreground">{nl ? 'Geen medewerkers toegewezen.' : 'No staff assigned.'}</p>
              ) : (
                <div className="space-y-1.5">
                  {task.assigned_members.map(memberId => {
                    const asgn = taskAssignments.find(a => a.partner_member_id === memberId);
                    const isIn = asgn?.checked_in_at && !asgn?.checked_out_at;
                    const isOut = !!asgn?.checked_out_at;

                    return (
                      <div key={memberId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isIn ? 'bg-green-500' : isOut ? 'bg-blue-400' : 'bg-muted-foreground/30'}`} />
                          <span className="text-sm">{getMemberName(memberId)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {asgn?.checked_in_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(asgn.checked_in_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                              {asgn.checked_out_at && ` — ${new Date(asgn.checked_out_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          )}
                          {!asgn?.checked_in_at && asgn && (
                            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => handleCheckIn(asgn.id)}>
                              {nl ? 'Check-in' : 'Check in'}
                            </Button>
                          )}
                          {isIn && asgn && (
                            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => handleCheckOut(asgn.id)}>
                              {nl ? 'Check-out' : 'Check out'}
                            </Button>
                          )}
                          {!asgn && (
                            <span className="text-[10px] text-muted-foreground italic">{nl ? 'Niet toegewezen' : 'Not assigned'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PartnerAttendanceTab;
