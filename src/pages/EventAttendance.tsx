import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useClubContext } from '@/contexts/ClubContext';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, ArrowLeft, Search, Download, CheckCircle, Clock, XCircle, UserCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const labels = {
  nl: {
    title: 'Aanwezigheid',
    back: 'Terug',
    present: 'Aanwezig',
    expected: 'Verwacht',
    absent: 'Afwezig',
    markPresent: 'Aanwezig markeren',
    undoCheckin: 'Ongedaan maken',
    search: 'Zoek op naam...',
    export: 'Exporteer CSV',
    of: 'van',
    noSignups: 'Geen inschrijvingen voor dit evenement.',
    checkedInAt: 'Ingecheckt om',
    ungrouped: 'Algemeen',
  },
  fr: {
    title: 'Présence',
    back: 'Retour',
    present: 'Présent',
    expected: 'Attendu',
    absent: 'Absent',
    markPresent: 'Marquer présent',
    undoCheckin: 'Annuler',
    search: 'Rechercher par nom...',
    export: 'Exporter CSV',
    of: 'de',
    noSignups: "Aucune inscription pour cet événement.",
    checkedInAt: 'Arrivé à',
    ungrouped: 'Général',
  },
  en: {
    title: 'Attendance',
    back: 'Back',
    present: 'Present',
    expected: 'Expected',
    absent: 'Absent',
    markPresent: 'Mark present',
    undoCheckin: 'Undo',
    search: 'Search by name...',
    export: 'Export CSV',
    of: 'of',
    noSignups: 'No signups for this event.',
    checkedInAt: 'Checked in at',
    ungrouped: 'General',
  },
};

interface SignupRow {
  id: string;
  task_id: string;
  volunteer_id: string;
  status: string;
  checked_in_at: string | null;
  task_title: string;
  volunteer_name: string;
  avatar_url: string | null;
}

const EventAttendance = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = labels[language];

  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [search, setSearch] = useState('');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  const loadData = useCallback(async () => {
    if (!eventId) return;

    // Get event info
    const { data: ev } = await supabase
      .from('events')
      .select('title, event_date')
      .eq('id', eventId)
      .single();
    if (ev) {
      setEventTitle(ev.title);
      setEventDate(ev.event_date);
    }

    // Get tasks for this event
    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('event_id', eventId);
    const taskList = taskData || [];
    const taskIds = taskList.map(t => t.id);
    const taskMap = new Map(taskList.map(t => [t.id, t.title]));

    if (taskIds.length === 0) {
      setSignups([]);
      setLoading(false);
      return;
    }

    // Get signups for these tasks (assigned or completed)
    const { data: signupData } = await (supabase as any)
      .from('task_signups')
      .select('id, task_id, volunteer_id, status, checked_in_at')
      .in('task_id', taskIds)
      .in('status', ['assigned', 'completed']);

    const rows = (signupData || []) as any[];
    const volIds = [...new Set(rows.map((s: any) => s.volunteer_id))];

    // Get volunteer profiles
    const { data: profiles } = volIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', volIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    setSignups(rows.map((s: any) => {
      const prof = profileMap.get(s.volunteer_id);
      return {
        id: s.id,
        task_id: s.task_id,
        volunteer_id: s.volunteer_id,
        status: s.status,
        checked_in_at: s.checked_in_at,
        task_title: taskMap.get(s.task_id) || '',
        volunteer_name: prof?.full_name || '?',
        avatar_url: prof?.avatar_url || null,
      };
    }));

    setLoading(false);
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime subscription on task_signups
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`attendance-${eventId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'task_signups' }, (payload) => {
        const updated = payload.new as any;
        setSignups(prev => prev.map(s =>
          s.id === updated.id
            ? { ...s, checked_in_at: updated.checked_in_at, status: updated.status }
            : s
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const handleCheckIn = async (signupId: string) => {
    setCheckingIn(signupId);
    const { error } = await supabase
      .from('task_signups')
      .update({ checked_in_at: new Date().toISOString() })
      .eq('id', signupId);
    if (error) toast.error(error.message);
    else {
      setSignups(prev => prev.map(s =>
        s.id === signupId ? { ...s, checked_in_at: new Date().toISOString() } : s
      ));
    }
    setCheckingIn(null);
  };

  const handleUndoCheckIn = async (signupId: string) => {
    setCheckingIn(signupId);
    const { error } = await supabase
      .from('task_signups')
      .update({ checked_in_at: null })
      .eq('id', signupId);
    if (error) toast.error(error.message);
    else {
      setSignups(prev => prev.map(s =>
        s.id === signupId ? { ...s, checked_in_at: null } : s
      ));
    }
    setCheckingIn(null);
  };

  // Filtered & grouped
  const filtered = useMemo(() => {
    if (!search.trim()) return signups;
    const q = search.toLowerCase();
    return signups.filter(s => s.volunteer_name.toLowerCase().includes(q));
  }, [signups, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, SignupRow[]>();
    for (const s of filtered) {
      const key = s.task_title || l.ungrouped;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [filtered, l.ungrouped]);

  const checkedInCount = signups.filter(s => s.checked_in_at).length;
  const totalCount = signups.length;
  const pct = totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;

  const handleExportCSV = () => {
    const header = 'Naam,Taak,Status,Ingecheckt om\n';
    const rows = signups.map(s => {
      const status = s.checked_in_at ? l.present : l.expected;
      const time = s.checked_in_at ? new Date(s.checked_in_at).toLocaleString(locale) : '';
      return `"${s.volunteer_name}","${s.task_title}","${status}","${time}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${eventTitle || eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <ClubPageLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ClubPageLayout>
    );
  }

  return (
    <ClubPageLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />{l.back}
          </Button>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">{eventTitle}</h1>
              {eventDate && (
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(eventDate).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-2.5">
                <UserCheck className="w-5 h-5 text-primary" />
                <span className="text-2xl font-heading font-bold text-primary">{checkedInCount}</span>
                <span className="text-sm text-muted-foreground">/ {totalCount}</span>
              </div>
            </div>
          </div>
          <Progress value={pct} className="h-3" />
          <p className="text-xs text-muted-foreground text-right">{pct}% {l.present.toLowerCase()}</p>
        </motion.div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={l.search}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="shrink-0">
            <Download className="w-4 h-4 mr-1.5" />{l.export}
          </Button>
        </div>

        {/* Grouped list */}
        {totalCount === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>{l.noSignups}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([taskTitle, members]) => (
              <motion.div key={taskTitle} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-heading font-semibold text-foreground">{taskTitle}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {members.filter(m => m.checked_in_at).length}/{members.length}
                  </Badge>
                </div>
                <div className="divide-y divide-border">
                  {members.map(member => {
                    const isCheckedIn = !!member.checked_in_at;
                    const isBusy = checkingIn === member.id;

                    return (
                      <div key={member.id} className="flex items-center gap-3 px-5 py-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {(member.volunteer_name || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{member.volunteer_name}</p>
                          {isCheckedIn && member.checked_in_at && (
                            <p className="text-[10px] text-muted-foreground">
                              {l.checkedInAt} {new Date(member.checked_in_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        {/* Status chip */}
                        {isCheckedIn ? (
                          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 text-xs gap-1">
                            <CheckCircle className="w-3 h-3" />{l.present}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />{l.expected}
                          </Badge>
                        )}

                        {/* Action */}
                        {isCheckedIn ? (
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
                            disabled={isBusy} onClick={() => handleUndoCheckIn(member.id)}>
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : l.undoCheckin}
                          </Button>
                        ) : (
                          <Button size="sm" className="text-xs"
                            disabled={isBusy} onClick={() => handleCheckIn(member.id)}>
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : l.markPresent}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ClubPageLayout>
  );
};

export default EventAttendance;
