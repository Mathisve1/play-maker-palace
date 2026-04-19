import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import SaveAsMatchTemplateDialog from './SaveAsMatchTemplateDialog';

interface Props {
  eventId: string;
  onClose: () => void;
}

const SaveAsMatchTemplateLoader = ({ eventId, onClose }: Props) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [evRes, grpRes, tskRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).maybeSingle(),
        supabase.from('event_groups').select('*').eq('event_id', eventId).order('sort_order'),
        supabase.from('tasks').select('*').eq('event_id', eventId),
      ]);
      if (cancel) return;
      const ev = evRes.data as any;
      if (!ev) { onClose(); return; }
      setData({
        event: ev,
        groups: (grpRes.data || []).map((g: any) => ({
          id: g.id, name: g.name, color: g.color, sort_order: g.sort_order ?? 0,
          wristband_color: g.wristband_color || null,
          wristband_label: g.wristband_label || null,
          materials_note: g.materials_note || null,
        })),
        tasks: (tskRes.data || []).map((t: any) => ({
          id: t.id, title: t.title, spots_available: t.spots_available || 1,
          event_group_id: t.event_group_id || null,
          start_time: t.start_time || null, end_time: t.end_time || null,
          briefing_time: t.briefing_time || null,
          briefing_location: t.briefing_location || null,
          description: t.description || null, notes: t.notes || null,
          compensation_type: t.compensation_type || 'none',
          expense_amount: t.expense_amount, hourly_rate: t.hourly_rate,
          estimated_hours: t.estimated_hours, daily_rate: t.daily_rate,
          loyalty_points: t.loyalty_points,
          loyalty_eligible: t.loyalty_eligible !== false,
        })),
      });
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [eventId, onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <SaveAsMatchTemplateDialog
      open={true}
      onClose={onClose}
      eventId={data.event.id}
      eventTitle={data.event.title}
      eventDate={data.event.event_date}
      eventLocation={data.event.location || null}
      eventKickoffTime={data.event.kickoff_time || null}
      groups={data.groups}
      tasks={data.tasks}
    />
  );
};

export default SaveAsMatchTemplateLoader;
