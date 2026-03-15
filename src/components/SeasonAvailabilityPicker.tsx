import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Calendar, Check, X, HelpCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface EventItem {
  id: string;
  type: 'task' | 'event';
  title: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  clubName: string;
}

type AvailStatus = 'available' | 'unavailable' | 'maybe';

const labels = {
  nl: {
    title: 'Seizoensbeschikbaarheid',
    subtitle: 'Geef aan voor welke evenementen je beschikbaar bent',
    available: 'Beschikbaar',
    unavailable: 'Niet beschikbaar',
    maybe: 'Misschien',
    noEvents: 'Geen toekomstige evenementen gevonden',
    saved: 'Beschikbaarheid opgeslagen',
    task: 'Taak',
    event: 'Evenement',
  },
  fr: {
    title: 'Disponibilité saisonnière',
    subtitle: 'Indiquez votre disponibilité pour chaque événement',
    available: 'Disponible',
    unavailable: 'Indisponible',
    maybe: 'Peut-être',
    noEvents: 'Aucun événement futur trouvé',
    saved: 'Disponibilité enregistrée',
    task: 'Tâche',
    event: 'Événement',
  },
  en: {
    title: 'Season Availability',
    subtitle: 'Indicate your availability for each event',
    available: 'Available',
    unavailable: 'Unavailable',
    maybe: 'Maybe',
    noEvents: 'No upcoming events found',
    saved: 'Availability saved',
    task: 'Task',
    event: 'Event',
  },
};

interface Props {
  userId: string;
  clubId: string;
  language: Language;
}

const SeasonAvailabilityPicker = ({ userId, clubId, language }: Props) => {
  const l = labels[language];
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  const [items, setItems] = useState<EventItem[]>([]);
  const [statuses, setStatuses] = useState<Map<string, AvailStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const now = new Date().toISOString();

    // Fetch tasks and events in parallel, plus existing signups and availability
    const [tasksRes, eventsRes, signupsRes, availRes] = await Promise.all([
      supabase.from('tasks').select('id, title, task_date, start_time, end_time, location, clubs(name)')
        .eq('club_id', clubId).gte('task_date', now.split('T')[0]).order('task_date', { ascending: true }),
      supabase.from('events').select('id, title, event_date, location, clubs(name)')
        .eq('club_id', clubId).gte('event_date', now.split('T')[0]).order('event_date', { ascending: true }),
      supabase.from('task_signups').select('task_id').eq('volunteer_id', userId),
      supabase.from('event_availability' as any).select('task_id, event_id, status').eq('volunteer_id', userId),
    ]);

    const signedUpTaskIds = new Set((signupsRes.data || []).map((s: any) => s.task_id));

    // Build items: tasks not yet signed up for
    const taskItems: EventItem[] = (tasksRes.data || [])
      .filter((t: any) => !signedUpTaskIds.has(t.id))
      .map((t: any) => ({
        id: t.id,
        type: 'task' as const,
        title: t.title,
        date: t.task_date,
        start_time: t.start_time,
        end_time: t.end_time,
        location: t.location,
        clubName: (t.clubs as any)?.name || '',
      }));

    const eventItems: EventItem[] = (eventsRes.data || []).map((e: any) => ({
      id: e.id,
      type: 'event' as const,
      title: e.title,
      date: e.event_date,
      start_time: null,
      end_time: null,
      location: e.location,
      clubName: (e.clubs as any)?.name || '',
    }));

    // Merge and sort
    const all = [...taskItems, ...eventItems].sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      return da.localeCompare(db);
    });
    setItems(all);

    // Load existing availability
    const avMap = new Map<string, AvailStatus>();
    ((availRes.data || []) as any[]).forEach((a: any) => {
      const key = a.task_id || a.event_id;
      if (key) avMap.set(key, a.status);
    });
    setStatuses(avMap);

    setLoading(false);
  }, [userId, clubId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSetStatus = async (item: EventItem, status: AvailStatus) => {
    const key = item.id;
    const current = statuses.get(key);
    if (current === status) return;

    setSaving(key);

    const payload: any = {
      volunteer_id: userId,
      status,
      updated_at: new Date().toISOString(),
    };
    if (item.type === 'task') payload.task_id = item.id;
    else payload.event_id = item.id;

    // Upsert
    if (current) {
      // Update existing
      const filter = item.type === 'task'
        ? supabase.from('event_availability' as any).update({ status, updated_at: new Date().toISOString() } as any).eq('volunteer_id', userId).eq('task_id', item.id)
        : supabase.from('event_availability' as any).update({ status, updated_at: new Date().toISOString() } as any).eq('volunteer_id', userId).eq('event_id', item.id);
      const { error } = await filter;
      if (error) { toast.error(error.message); setSaving(null); return; }
    } else {
      const { error } = await supabase.from('event_availability' as any).insert(payload as any);
      if (error) { toast.error(error.message); setSaving(null); return; }
    }

    setStatuses(prev => new Map(prev).set(key, status));
    toast.success(l.saved);
    setSaving(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(locale, {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>{l.noEvents}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-heading font-bold text-foreground">{l.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{l.subtitle}</p>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => {
          const currentStatus = statuses.get(item.id);
          const isSaving = saving === item.id;

          return (
            <motion.div
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-card rounded-xl border p-4 transition-colors ${
                currentStatus === 'available' ? 'border-green-500/30 bg-green-500/5' :
                currentStatus === 'unavailable' ? 'border-destructive/30 bg-destructive/5' :
                currentStatus === 'maybe' ? 'border-yellow-500/30 bg-yellow-500/5' :
                'border-border'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {item.type === 'task' ? l.task : l.event}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{item.clubName}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {item.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{formatDate(item.date)}
                      </span>
                    )}
                    {item.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.start_time)}
                        {item.end_time && ` — ${formatTime(item.end_time)}`}
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{item.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant={currentStatus === 'available' ? 'default' : 'outline'}
                        className={`text-xs gap-1 ${currentStatus === 'available' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}`}
                        onClick={() => handleSetStatus(item, 'available')}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{l.available}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={currentStatus === 'maybe' ? 'default' : 'outline'}
                        className={`text-xs gap-1 ${currentStatus === 'maybe' ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' : ''}`}
                        onClick={() => handleSetStatus(item, 'maybe')}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{l.maybe}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={currentStatus === 'unavailable' ? 'default' : 'outline'}
                        className={`text-xs gap-1 ${currentStatus === 'unavailable' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive' : ''}`}
                        onClick={() => handleSetStatus(item, 'unavailable')}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{l.unavailable}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SeasonAvailabilityPicker;
