import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarPlus, Copy, Download, Loader2, ChevronDown, ChevronUp, Smartphone, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language } from '@/i18n/translations';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

/** Generate a single .ics file for a task */
export const downloadTaskIcs = (task: { title: string; task_date: string | null; start_time: string | null; end_time: string | null; location: string | null; description: string | null }) => {
  const start = task.start_time || task.task_date;
  const end = task.end_time || task.start_time || task.task_date;
  if (!start) return;

  const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlayMaker//Volunteer//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${task.title}`,
    task.location ? `LOCATION:${task.location}` : '',
    task.description ? `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}` : '',
    `UID:${Date.now()}@playmaker.app`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${task.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
};

interface CalendarSyncSectionProps {
  userId: string;
  language: Language;
}

const CalendarSyncSection = ({ userId, language }: CalendarSyncSectionProps) => {
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('calendar_tokens')
        .select('token')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (data?.token) {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        setFeedUrl(`${baseUrl}/functions/v1/calendar-feed?token=${data.token}`);
      }
    };
    load();
  }, [userId]);

  const handleGenerate = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('calendar_tokens').insert({
      user_id: userId,
    }).select('token').single();

    if (error) {
      toast.error(error.message);
    } else {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      setFeedUrl(`${baseUrl}/functions/v1/calendar-feed?token=${data.token}`);
      toast.success(t3(language, 'Kalender-link aangemaakt!', 'Lien calendrier créé !', 'Calendar link created!'));
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (feedUrl) {
      navigator.clipboard.writeText(feedUrl);
      toast.success(t3(language, 'Link gekopieerd!', 'Lien copié !', 'Link copied!'));
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
      <div className="flex items-center gap-2">
        <CalendarPlus className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {t3(language, 'Kalender synchroniseren', 'Synchroniser le calendrier', 'Calendar sync')}
        </h3>
      </div>

      {feedUrl ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t3(language,
              'Kopieer deze URL naar Google Calendar, Apple Calendar of Outlook:',
              'Copiez cette URL dans Google Calendar, Apple Calendar ou Outlook :',
              'Copy this URL to Google Calendar, Apple Calendar or Outlook:'
            )}
          </p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs text-foreground break-all select-all">
              {feedUrl}
            </code>
            <Button size="icon" variant="outline" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {/* Instructions toggle */}
          <CalendarInstructions language={language} />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t3(language,
              'Synchroniseer je shifts automatisch met je kalender.',
              'Synchronisez automatiquement vos shifts avec votre calendrier.',
              'Automatically sync your shifts with your calendar.'
            )}
          </p>
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
            {t3(language, 'Kalender-link genereren', 'Générer un lien calendrier', 'Generate calendar link')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CalendarSyncSection;
