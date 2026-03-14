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

const CalendarInstructions = ({ language }: { language: Language }) => {
  const [showApple, setShowApple] = useState(false);
  const [showAndroid, setShowAndroid] = useState(false);

  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs font-medium text-foreground">
        {t3(language, 'Hoe integreren?', 'Comment intégrer ?', 'How to integrate?')}
      </p>

      {/* Apple / iPhone */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowApple(!showApple)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Apple className="w-3.5 h-3.5" />
            {t3(language, 'iPhone / iPad (Apple Calendar)', 'iPhone / iPad (Apple Calendar)', 'iPhone / iPad (Apple Calendar)')}
          </span>
          {showApple ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {showApple && (
          <div className="px-3 py-3 space-y-2 bg-card">
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>{t3(language,
                'Open de Instellingen-app op je iPhone of iPad.',
                'Ouvrez l\'app Réglages sur votre iPhone ou iPad.',
                'Open the Settings app on your iPhone or iPad.'
              )}</li>
              <li>{t3(language,
                'Scroll naar beneden en tik op "Kalender".',
                'Faites défiler vers le bas et appuyez sur « Calendrier ».',
                'Scroll down and tap "Calendar".'
              )}</li>
              <li>{t3(language,
                'Tik op "Accounts" → "Voeg account toe".',
                'Appuyez sur « Comptes » → « Ajouter un compte ».',
                'Tap "Accounts" → "Add Account".'
              )}</li>
              <li>{t3(language,
                'Kies "Andere" → "Voeg agenda-abonnement toe".',
                'Choisissez « Autre » → « Ajouter un abonnement Calendrier ».',
                'Choose "Other" → "Add Subscribed Calendar".'
              )}</li>
              <li>{t3(language,
                'Plak de gekopieerde URL in het Server-veld.',
                'Collez l\'URL copiée dans le champ Serveur.',
                'Paste the copied URL into the Server field.'
              )}</li>
              <li>{t3(language,
                'Tik op "Volgende" en vervolgens op "Bewaar".',
                'Appuyez sur « Suivant » puis sur « Enregistrer ».',
                'Tap "Next" and then "Save".'
              )}</li>
              <li>{t3(language,
                'Je shifts verschijnen nu automatisch in je Apple Kalender! 🎉',
                'Vos shifts apparaîtront automatiquement dans Apple Calendrier ! 🎉',
                'Your shifts will now appear automatically in Apple Calendar! 🎉'
              )}</li>
            </ol>
            <p className="text-[11px] text-muted-foreground/70 italic">
              {t3(language,
                '💡 Tip: De kalender wordt automatisch bijgewerkt. Nieuwe shifts verschijnen vanzelf.',
                '💡 Astuce : Le calendrier se met à jour automatiquement.',
                '💡 Tip: The calendar updates automatically. New shifts appear on their own.'
              )}
            </p>
          </div>
        )}
      </div>

      {/* Android / Google Calendar */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowAndroid(!showAndroid)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Smartphone className="w-3.5 h-3.5" />
            {t3(language, 'Android (Google Calendar)', 'Android (Google Calendar)', 'Android (Google Calendar)')}
          </span>
          {showAndroid ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {showAndroid && (
          <div className="px-3 py-3 space-y-2 bg-card">
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>{t3(language,
                'Open Google Calendar op je computer (calendar.google.com).',
                'Ouvrez Google Calendar sur votre ordinateur (calendar.google.com).',
                'Open Google Calendar on your computer (calendar.google.com).'
              )}</li>
              <li>{t3(language,
                'Klik links op het +-icoon naast "Andere agenda\'s".',
                'Cliquez sur l\'icône + à côté de « Autres agendas ».',
                'Click the + icon next to "Other calendars" on the left.'
              )}</li>
              <li>{t3(language,
                'Kies "Via URL".',
                'Choisissez « À partir de l\'URL ».',
                'Choose "From URL".'
              )}</li>
              <li>{t3(language,
                'Plak de gekopieerde URL in het URL-veld.',
                'Collez l\'URL copiée dans le champ URL.',
                'Paste the copied URL into the URL field.'
              )}</li>
              <li>{t3(language,
                'Klik op "Agenda toevoegen".',
                'Cliquez sur « Ajouter l\'agenda ».',
                'Click "Add calendar".'
              )}</li>
              <li>{t3(language,
                'De agenda synchroniseert automatisch naar je Android-telefoon! 🎉',
                'L\'agenda se synchronise automatiquement avec votre téléphone Android ! 🎉',
                'The calendar syncs automatically to your Android phone! 🎉'
              )}</li>
            </ol>
            <p className="text-[11px] text-muted-foreground/70 italic">
              {t3(language,
                '⚠️ Let op: Via URL toevoegen kan alleen via de computer-versie van Google Calendar, niet via de app.',
                '⚠️ Attention : L\'ajout via URL ne fonctionne que sur la version ordinateur de Google Calendar.',
                '⚠️ Note: Adding via URL only works on the desktop version of Google Calendar, not the app.'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
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
