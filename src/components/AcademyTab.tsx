import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Award, BookOpen, ArrowRight, CalendarDays, MapPin, Users, Ticket, CheckCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Certificate {
  id: string;
  training_id: string;
  club_id: string;
  issue_date: string;
  score: number | null;
  type: string;
  training_title?: string;
  club_name?: string;
}

interface Training {
  id: string;
  title: string;
  description: string | null;
  club_id: string;
  club_name?: string;
}

interface TrainingEvent {
  id: string;
  title: string;
  event_date: string | null;
  location: string | null;
  training_id: string | null;
  training_title?: string;
  club_id: string;
  club_name?: string;
  task_id?: string;
  spots_available?: number | null;
  signup_count?: number;
  already_signed_up?: boolean;
  has_ticket?: boolean;
  ticket_barcode?: string | null;
}

const labels = {
  nl: {
    myCerts: 'Mijn certificaten', availableTrainings: 'Beschikbare trainingen',
    noCerts: 'Nog geen certificaten behaald.', noTrainings: 'Geen trainingen beschikbaar.',
    start: 'Start training', certified: 'Gecertificeerd', quiz: 'Quiz', physical: 'Fysiek',
    trainingEvents: 'Fysieke trainingen', noEvents: 'Geen fysieke trainingen gepland.',
    signup: 'Inschrijven', signedUp: 'Ingeschreven', viewTicket: 'Bekijk ticket',
    signupSuccess: 'Je bent ingeschreven!', spots: 'plaatsen',
  },
  fr: {
    myCerts: 'Mes certificats', availableTrainings: 'Formations disponibles',
    noCerts: 'Aucun certificat obtenu.', noTrainings: 'Aucune formation disponible.',
    start: 'Commencer', certified: 'Certifié', quiz: 'Quiz', physical: 'Physique',
    trainingEvents: 'Formations physiques', noEvents: 'Aucune formation physique prévue.',
    signup: 'S\'inscrire', signedUp: 'Inscrit', viewTicket: 'Voir le ticket',
    signupSuccess: 'Vous êtes inscrit !', spots: 'places',
  },
  en: {
    myCerts: 'My certificates', availableTrainings: 'Available trainings',
    noCerts: 'No certificates yet.', noTrainings: 'No trainings available.',
    start: 'Start training', certified: 'Certified', quiz: 'Quiz', physical: 'Physical',
    trainingEvents: 'Physical trainings', noEvents: 'No physical trainings planned.',
    signup: 'Sign up', signedUp: 'Signed up', viewTicket: 'View ticket',
    signupSuccess: 'You are signed up!', spots: 'spots',
  },
};

const AcademyTab = ({ language, navigate, followedClubIds }: { language: Language; navigate: ReturnType<typeof useNavigate>; followedClubIds?: Set<string> | null }) => {
  const l = labels[language];
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [trainingEvents, setTrainingEvents] = useState<TrainingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    const [certRes, trainRes, eventsRes] = await Promise.all([
      supabase.from('volunteer_certificates').select('*').eq('volunteer_id', userId),
      supabase.from('academy_trainings').select('*, clubs(name)').eq('is_published', true),
      supabase.from('events').select('*').eq('event_type', 'training').eq('status', 'open'),
    ]);

    const certs = (certRes.data || []) as any[];
    let allTrainings = (trainRes.data || []) as any[];

    // Filter by followed clubs — if followedClubIds is provided, ONLY show from followed clubs
    if (followedClubIds) {
      allTrainings = allTrainings.filter((t: any) => followedClubIds.has(t.club_id));
    }

    // Enrich certs
    const enrichedCerts = certs.map(c => {
      const t = (trainRes.data || []).find((tr: any) => tr.id === c.training_id);
      return { ...c, training_title: t?.title, club_name: t?.clubs?.name };
    });
    // Only show certs from followed clubs
    const filteredCerts = followedClubIds
      ? enrichedCerts.filter(c => {
          const t = (trainRes.data || []).find((tr: any) => tr.id === c.training_id);
          return t ? followedClubIds.has(t.club_id) : false;
        })
      : enrichedCerts;
    setCertificates(filteredCerts);

    // Available digital trainings
    const certifiedIds = new Set(certs.map(c => c.training_id));
    setTrainings(allTrainings.filter((t: any) => !certifiedIds.has(t.id)).map((t: any) => ({
      id: t.id, title: t.title, description: t.description, club_id: t.club_id, club_name: t.clubs?.name,
    })));

    // Training events — filter by followed clubs
    let events = (eventsRes.data || []) as any[];
    if (followedClubIds) {
      events = events.filter((e: any) => followedClubIds.has(e.club_id));
    }
    if (events.length > 0) {
      const eventIds = events.map((e: any) => e.id);
      const trainingIds = [...new Set(events.map((e: any) => e.training_id).filter(Boolean))];

      // Get tasks for these events
      const { data: tasks } = await supabase.from('tasks').select('id, event_id, spots_available').in('event_id', eventIds);
      // Get signups and tickets for current user
      const taskIds = (tasks || []).map((t: any) => t.id);
      const [signupsRes, ticketsRes] = await Promise.all([
        taskIds.length > 0 ? supabase.from('task_signups').select('task_id, status').eq('volunteer_id', userId).in('task_id', taskIds) : Promise.resolve({ data: [] }),
        supabase.from('volunteer_tickets').select('event_id, barcode, status').eq('volunteer_id', userId).in('event_id', eventIds),
      ]);

      const signups = (signupsRes.data || []) as any[];
      const tickets = (ticketsRes.data || []) as any[];

      const enrichedEvents: TrainingEvent[] = events.map((ev: any) => {
        const task = (tasks || []).find((t: any) => t.event_id === ev.id);
        const signup = signups.find((s: any) => s.task_id === task?.id);
        const ticket = tickets.find((t: any) => t.event_id === ev.id);
        const training = allTrainings.find((tr: any) => tr.id === ev.training_id);

        return {
          id: ev.id,
          title: ev.title,
          event_date: ev.event_date,
          location: ev.location,
          training_id: ev.training_id,
          training_title: training?.title,
          club_id: ev.club_id,
          club_name: training?.clubs?.name || ev.club_id,
          task_id: task?.id,
          spots_available: task?.spots_available,
          already_signed_up: !!signup,
          has_ticket: !!ticket,
          ticket_barcode: ticket?.barcode || null,
        };
      });
      setTrainingEvents(enrichedEvents);
    }

    setLoading(false);
  };

  const [qrDialogBarcode, setQrDialogBarcode] = useState<string | null>(null);

  const handleSignup = async (event: TrainingEvent) => {
    if (!event.task_id) return;
    setSigningUp(event.id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 1. Sign up
    const { error } = await supabase.from('task_signups').insert({
      task_id: event.task_id, volunteer_id: session.user.id, status: 'approved',
    });
    if (error) { toast.error(error.message); setSigningUp(null); return; }

    // 2. Auto-generate QR ticket
    const barcode = `VT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await supabase.from('volunteer_tickets').insert({
      club_id: event.club_id || '',
      event_id: event.id,
      task_id: event.task_id,
      volunteer_id: session.user.id,
      barcode,
      status: 'sent' as any,
    });

    toast.success(l.signupSuccess);
    setSigningUp(null);
    await load();
  };

  if (loading) return <div className="mt-6 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mt-6 space-y-6">
      {/* Certificates */}
      <div>
        <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" /> {l.myCerts}
        </h3>
        {certificates.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{l.noCerts}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {certificates.map((cert, i) => (
              <motion.div key={cert.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-500/20 flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{cert.training_title}</p>
                    <p className="text-xs text-muted-foreground">{cert.club_name} • {new Date(cert.issue_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cert.score != null && <span className="text-xs font-bold text-accent">{cert.score}</span>}
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">{l.certified}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Training Events (Physical) */}
      {trainingEvents.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent" /> {l.trainingEvents}
          </h3>
          <div className="space-y-2">
            {trainingEvents.map((ev, i) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CalendarDays className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{ev.title}</p>
                      {ev.training_title && <p className="text-xs text-muted-foreground">{ev.training_title} • {ev.club_name}</p>}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {ev.event_date && <span>{new Date(ev.event_date).toLocaleDateString()} {new Date(ev.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        {ev.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ev.location}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {ev.already_signed_up ? (
                      ev.has_ticket ? (
                        <Button size="sm" variant="outline" onClick={() => setQrDialogBarcode(ev.ticket_barcode || null)} className="gap-1.5 text-xs">
                          <QrCode className="w-3.5 h-3.5 text-accent" />
                          {l.viewTicket}
                        </Button>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {l.signedUp}
                        </span>
                      )
                    ) : (
                      <Button size="sm" variant="default" onClick={() => handleSignup(ev)} disabled={signingUp === ev.id} className="gap-1 text-xs">
                        {signingUp === ev.id ? <div className="w-3 h-3 border border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Users className="w-3 h-3" />}
                        {l.signup}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Available digital trainings */}
      {trainings.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> {l.availableTrainings}
          </h3>
          <div className="space-y-2">
            {trainings.map((t, i) => (
              <motion.button key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/training/${t.id}`)}
                className="w-full text-left bg-card rounded-xl border border-border hover:border-primary/30 p-4 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.club_name}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!qrDialogBarcode} onOpenChange={() => setQrDialogBarcode(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center">
              <QrCode className="w-5 h-5 text-accent" />
              {language === 'nl' ? 'Jouw QR-ticket' : language === 'fr' ? 'Votre ticket QR' : 'Your QR ticket'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrDialogBarcode && (
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG value={qrDialogBarcode} size={200} level="H" />
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              {language === 'nl' ? 'Toon deze QR-code bij aankomst om in te checken.' : language === 'fr' ? 'Montrez ce code QR à votre arrivée.' : 'Show this QR code on arrival to check in.'}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground">{qrDialogBarcode}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcademyTab;
