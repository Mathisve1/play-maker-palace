import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, CalendarDays, MapPin, Loader2, Radio, ClipboardList, FileDown, RefreshCw, Bell, BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generateSafetyReportPdf, type SafetyIncidentForPdf, type SafetyZoneForPdf, type ClosingTaskForPdf } from '@/lib/generateSafetyReportPdf';

const SafetyEventHub = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [event, setEvent] = useState<{ title: string; event_date: string | null; location: string | null; status: string; is_live: boolean; club_id: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!eventId) return;
      const { data } = await supabase
        .from('events')
        .select('title, event_date, location, status, is_live, club_id')
        .eq('id', eventId)
        .maybeSingle();
      setEvent(data);
      setLoading(false);
    })();
  }, [eventId]);

  const handleDownloadReport = async () => {
    if (!event || !eventId) return;
    setGeneratingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const clubId = event.club_id;

      const [clubRes, profileRes, zonesRes, incTypesRes, incRes, clItemsRes, cTasksRes] = await Promise.all([
        supabase.from('clubs').select('name').eq('id', clubId).single(),
        session ? supabase.from('profiles').select('full_name').eq('id', session.user.id).single() : Promise.resolve({ data: null }),
        supabase.from('safety_zones').select('*').eq('event_id', eventId).order('sort_order'),
        supabase.from('safety_incident_types').select('*').eq('club_id', clubId),
        supabase.from('safety_incidents').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
        supabase.from('safety_checklist_items').select('*').eq('event_id', eventId),
        supabase.from('closing_tasks').select('*').eq('event_id', eventId).order('sort_order'),
      ]);
      const checklistItemIds = (clItemsRes.data || []).map((i: any) => i.id);
      const { data: cpData } = await supabase.from('safety_checklist_progress').select('*').in('checklist_item_id', checklistItemIds);

      const zones = zonesRes.data || [];
      const incidentTypes = incTypesRes.data || [];
      const incidents = incRes.data || [];
      const checklistItems = clItemsRes.data || [];
      const checklistProgress = cpData || [];
      const cTasks = cTasksRes.data || [];

      const volIds = [...new Set(cTasks.map((t: any) => t.assigned_volunteer_id).filter(Boolean))] as string[];
      let volMap: Record<string, string> = {};
      if (volIds.length > 0) {
        const { data: vols } = await supabase.from('profiles').select('id, full_name').in('id', volIds);
        (vols || []).forEach(v => { volMap[v.id] = v.full_name || t3('Onbekend', 'Inconnu', 'Unknown'); });
      }

      const zoneProgress: Record<string, { total: number; done: number }> = {};
      zones.forEach((z: any) => {
        const items = checklistItems.filter((ci: any) => ci.zone_id === z.id);
        const done = items.filter((ci: any) => checklistProgress.some((p: any) => p.checklist_item_id === ci.id && p.is_completed)).length;
        zoneProgress[z.id] = { total: items.length, done };
      });

      const totalChecklistItems = checklistItems.length;
      const totalChecklistDone = checklistItems.filter((ci: any) =>
        checklistProgress.some((p: any) => p.checklist_item_id === ci.id && p.is_completed)
      ).length;

      const pdfZones: SafetyZoneForPdf[] = zones.map((z: any) => {
        const prog = zoneProgress[z.id];
        return { name: z.name, color: z.color, checklist_total: prog?.total || 0, checklist_done: prog?.done || 0 };
      });

      const unknownLabel = t3('Onbekend', 'Inconnu', 'Unknown');
      const pdfIncidents: SafetyIncidentForPdf[] = incidents.map((inc: any) => ({
        id: inc.id,
        incident_type_label: incidentTypes.find((t: any) => t.id === inc.incident_type_id)?.label || unknownLabel,
        incident_type_color: incidentTypes.find((t: any) => t.id === inc.incident_type_id)?.color || '#888',
        zone_name: zones.find((z: any) => z.id === inc.zone_id)?.name || '—',
        description: inc.description,
        priority: inc.priority,
        status: inc.status,
        created_at: inc.created_at,
        resolved_at: inc.resolved_at,
        photo_url: inc.photo_url,
      }));

      const pdfClosingTasks: ClosingTaskForPdf[] = cTasks.map((t: any) => ({
        description: t.description,
        status: t.status,
        assigned_volunteer: t.assigned_volunteer_id ? volMap[t.assigned_volunteer_id] || null : null,
        requires_photo: t.requires_photo,
        requires_note: t.requires_note,
        photo_url: t.photo_url,
        note: t.note,
        completed_at: t.completed_at,
      }));

      const doc = generateSafetyReportPdf({
        eventTitle: event.title,
        eventDate: event.event_date,
        clubName: clubRes.data?.name || unknownLabel,
        generatedBy: profileRes.data?.full_name || unknownLabel,
        zones: pdfZones,
        incidents: pdfIncidents,
        closingTasks: pdfClosingTasks,
        totalChecklistItems,
        totalChecklistDone,
        language,
      });

      doc.save(`${t3('veiligheidsrapport', 'rapport-securite', 'safety-report')}-${event.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success(t3('Veiligheidsrapport gedownload!', 'Rapport de sécurité téléchargé!', 'Safety report downloaded!'));
    } catch (err: any) {
      toast.error(err.message || t3('Fout bij rapport generatie', 'Erreur lors de la génération', 'Error generating report'));
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <ClubPageLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </ClubPageLayout>
    );
  }

  if (!event) {
    return (
      <ClubPageLayout>
        <div className="text-center py-24 text-muted-foreground">{t3('Evenement niet gevonden.', 'Événement introuvable.', 'Event not found.')}</div>
      </ClubPageLayout>
    );
  }

  const isClosed = event.status === 'closed';

  return (
    <ClubPageLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate('/safety')}>
            <ArrowLeft className="w-4 h-4" /> {t3('Terug naar overzicht', 'Retour à l\'aperçu', 'Back to overview')}
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {event.event_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {new Date(event.event_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB')}
                  </span>
                )}
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
            onClick={() => navigate(`/safety/${eventId}/control-room`)}
          >
            <CardContent className="p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Radio className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Control Room</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t3(
                    'Live incidentenbeheer, zones monitoren, checklist en meldingen opvolgen in real-time.',
                    'Gestion des incidents en direct, surveillance des zones et suivi en temps réel.',
                    'Live incident management, zone monitoring, checklist and real-time reporting.'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
            onClick={() => navigate(`/safety/${eventId}/closing`)}
          >
            <CardContent className="p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                <ClipboardList className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{t3('Sluitingsprocedure', 'Procédure de clôture', 'Closing Procedure')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t3(
                    'Terrein of stadion afsluiten met checklists, foto-verificatie en taakverdeling.',
                    'Fermer le site avec des checklists, vérification photo et répartition des tâches.',
                    'Close the venue with checklists, photo verification and task assignment.'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileDown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-heading font-semibold text-foreground text-sm">{t3('Veiligheidsrapport', 'Rapport de sécurité', 'Safety Report')}</p>
                <p className="text-xs text-muted-foreground">
                  {isClosed
                    ? t3('Download het volledige rapport met incidenten, checklist status en sluitingstaken.', 'Téléchargez le rapport complet avec incidents et tâches de clôture.', 'Download the full report with incidents, checklist status and closing tasks.')
                    : t3('Genereer een tussentijds rapport van het huidige evenement.', 'Générez un rapport intermédiaire de l\'événement en cours.', 'Generate an interim report of the current event.')}
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownloadReport}
              disabled={generatingReport}
              className="gap-2"
            >
              {generatingReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {t3('Download PDF', 'Télécharger PDF', 'Download PDF')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClubPageLayout>
  );
};

export default SafetyEventHub;
