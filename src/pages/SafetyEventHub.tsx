import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, CalendarDays, MapPin, Loader2, Radio, ClipboardList, FileDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generateSafetyReportPdf, type SafetyIncidentForPdf, type SafetyZoneForPdf, type ClosingTaskForPdf } from '@/lib/generateSafetyReportPdf';

const SafetyEventHub = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [event, setEvent] = useState<{ title: string; event_date: string | null; location: string | null; status: string; is_live: boolean; club_id: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!eventId) return;
      const { data } = await (supabase as any)
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

      const [clubRes, profileRes, zonesRes, incTypesRes, incRes, clItemsRes, cpRes, cTasksRes] = await Promise.all([
        supabase.from('clubs').select('name').eq('id', clubId).single(),
        session ? supabase.from('profiles').select('full_name').eq('id', session.user.id).single() : Promise.resolve({ data: null }),
        (supabase as any).from('safety_zones').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_incident_types').select('*').eq('club_id', clubId),
        (supabase as any).from('safety_incidents').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
        (supabase as any).from('safety_checklist_items').select('*').eq('event_id', eventId),
        (supabase as any).from('safety_checklist_progress').select('*'),
        (supabase as any).from('closing_tasks').select('*').eq('event_id', eventId).order('sort_order'),
      ]);

      const zones = zonesRes.data || [];
      const incidentTypes = incTypesRes.data || [];
      const incidents = incRes.data || [];
      const checklistItems = clItemsRes.data || [];
      const checklistProgress = cpRes.data || [];
      const cTasks = cTasksRes.data || [];

      // Volunteer names for closing tasks
      const volIds = [...new Set(cTasks.map((t: any) => t.assigned_volunteer_id).filter(Boolean))] as string[];
      let volMap: Record<string, string> = {};
      if (volIds.length > 0) {
        const { data: vols } = await supabase.from('profiles').select('id, full_name').in('id', volIds);
        (vols || []).forEach(v => { volMap[v.id] = v.full_name || 'Onbekend'; });
      }

      // Zone progress
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

      const pdfIncidents: SafetyIncidentForPdf[] = incidents.map((inc: any) => ({
        id: inc.id,
        incident_type_label: incidentTypes.find((t: any) => t.id === inc.incident_type_id)?.label || 'Onbekend',
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
        clubName: clubRes.data?.name || 'Onbekend',
        generatedBy: profileRes.data?.full_name || 'Onbekend',
        zones: pdfZones,
        incidents: pdfIncidents,
        closingTasks: pdfClosingTasks,
        totalChecklistItems,
        totalChecklistDone,
      });

      doc.save(`veiligheidsrapport-${event.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success('Veiligheidsrapport gedownload!');
    } catch (err: any) {
      toast.error(err.message || 'Fout bij rapport generatie');
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
        <div className="text-center py-24 text-muted-foreground">Evenement niet gevonden.</div>
      </ClubPageLayout>
    );
  }

  const isClosed = event.status === 'closed';

  return (
    <ClubPageLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-2 text-muted-foreground" onClick={() => navigate('/safety')}>
            <ArrowLeft className="w-4 h-4" /> Terug naar overzicht
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {event.event_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {new Date(event.event_date).toLocaleDateString('nl-BE')}
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

        {/* Option cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Control Room */}
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
                  Live incidentenbeheer, zones monitoren, checklist en meldingen opvolgen in real-time.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Closing Procedure */}
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
            onClick={() => navigate(`/safety/${eventId}/closing`)}
          >
            <CardContent className="p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                <ClipboardList className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Sluitingsprocedure</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Terrein of stadion afsluiten met checklists, foto-verificatie en taakverdeling.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Safety Report - always visible */}
        <Card className="bg-card border-border">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileDown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-heading font-semibold text-foreground text-sm">Veiligheidsrapport</p>
                <p className="text-xs text-muted-foreground">
                  {isClosed
                    ? 'Download het volledige rapport met incidenten, checklist status en sluitingstaken.'
                    : 'Genereer een tussentijds rapport van het huidige evenement.'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownloadReport}
              disabled={generatingReport}
              className="gap-2"
            >
              {generatingReport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Download PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClubPageLayout>
  );
};

export default SafetyEventHub;
