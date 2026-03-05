import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CalendarDays, MapPin, Plus, ChevronDown, ChevronUp,
  QrCode, Award, Loader2
} from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Training {
  id: string;
  title: string;
}

interface TrainingEvent {
  id: string;
  title: string;
  event_date: string | null;
  location: string | null;
  description: string | null;
  status: string;
  training_id: string | null;
  certificate_design_id: string | null;
  training_title?: string;
  task?: { id: string; spots_available: number | null } | null;
  signupCount?: number;
  checkedInCount?: number;
  ticketCount?: number;
}

interface EventSignup {
  volunteer_id: string;
  full_name: string | null;
  status: string;
  ticket_status: string | null;
  checked_in: boolean;
}

const labels = {
  nl: {
    title: 'Fysieke trainingen', back: 'Terug',
    createEvent: 'Nieuw trainingsmoment', trainingTitle: 'Titel',
    eventDate: 'Datum', eventLocation: 'Locatie', eventDesc: 'Beschrijving',
    spots: 'Plaatsen', signups: 'Inschrijvingen', checkedIn: 'Ingecheckt',
    awardCerts: 'Certificaten toekennen', generateTickets: 'Tickets genereren',
    awardConfirm: 'Certificaten toekennen aan alle ingecheckte vrijwilligers?',
    certsAwarded: 'Certificaten toegekend!', ticketsGenerated: 'Tickets gegenereerd!',
    noEvents: 'Nog geen fysieke trainingsmomenten.', eventCreated: 'Trainingsmoment aangemaakt!',
    selectTraining: 'Selecteer training', noTrainings: 'Maak eerst een training aan in de Academy Builder.',
    noSignups: 'Geen inschrijvingen', noApproved: 'Geen goedgekeurde inschrijvingen',
    noCheckedIn: 'Geen ingecheckte vrijwilligers',
    selectCertDesign: 'Certificaat sjabloon', noCertDesign: 'Geen sjabloon (geen certificaat)',
  },
  fr: {
    title: 'Formations physiques', back: 'Retour',
    createEvent: 'Nouveau moment de formation', trainingTitle: 'Titre',
    eventDate: 'Date', eventLocation: 'Lieu', eventDesc: 'Description',
    spots: 'Places', signups: 'Inscriptions', checkedIn: 'Enregistré',
    awardCerts: 'Attribuer certificats', generateTickets: 'Générer les tickets',
    awardConfirm: 'Attribuer les certificats à tous les volontaires enregistrés ?',
    certsAwarded: 'Certificats attribués !', ticketsGenerated: 'Tickets générés !',
    noEvents: 'Pas encore de formations physiques.', eventCreated: 'Moment de formation créé !',
    selectTraining: 'Sélectionner formation', noTrainings: 'Créez d\'abord une formation dans l\'Academy Builder.',
    noSignups: 'Aucune inscription', noApproved: 'Aucune inscription approuvée',
    noCheckedIn: 'Aucun volontaire enregistré',
    selectCertDesign: 'Modèle de certificat', noCertDesign: 'Aucun modèle (pas de certificat)',
  },
  en: {
    title: 'Physical trainings', back: 'Back',
    createEvent: 'New training session', trainingTitle: 'Title',
    eventDate: 'Date', eventLocation: 'Location', eventDesc: 'Description',
    spots: 'Spots', signups: 'Sign-ups', checkedIn: 'Checked in',
    awardCerts: 'Award certificates', generateTickets: 'Generate tickets',
    awardConfirm: 'Award certificates to all checked-in volunteers?',
    certsAwarded: 'Certificates awarded!', ticketsGenerated: 'Tickets generated!',
    noEvents: 'No physical training sessions yet.', eventCreated: 'Training session created!',
    selectTraining: 'Select training', noTrainings: 'Create a training first in the Academy Builder.',
    noSignups: 'No sign-ups', noApproved: 'No approved sign-ups',
    noCheckedIn: 'No checked-in volunteers',
    selectCertDesign: 'Certificate template', noCertDesign: 'No template (no certificate)',
  },
};

const PhysicalTrainings = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = labels[language];

  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventSignups, setEventSignups] = useState<EventSignup[]>([]);
  const [certDesigns, setCertDesigns] = useState<{ id: string; name: string }[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string>('');

  // Create event dialog
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventSpots, setNewEventSpots] = useState(30);
  const [newEventCertDesignId, setNewEventCertDesignId] = useState('');

  const { clubId: contextClubId } = useClubContext();

  useEffect(() => {
    if (!contextClubId) return;
    const init = async () => {
      const cid = contextClubId;
      setClubId(cid);

      // Parallel: trainings + certificate designs + events
      const [tData, designsData] = await Promise.all([
        supabase.from('academy_trainings').select('id, title').eq('club_id', cid).order('title'),
        (supabase as any).from('certificate_designs').select('id, name').eq('club_id', cid),
      ]);
      setTrainings((tData.data || []) as Training[]);
      setCertDesigns((designsData.data || []) as { id: string; name: string }[]);
      if (designsData.data && designsData.data.length > 0) setSelectedDesignId(designsData.data[0].id);

      await loadAllEvents(cid);
      setLoading(false);
    };
    init();
  }, [contextClubId]);

  const loadAllEvents = async (cid: string) => {
    const { data: evData } = await supabase
      .from('events')
      .select('*, academy_trainings(title)')
      .eq('club_id', cid)
      .eq('event_type', 'training')
      .order('event_date', { ascending: false });

    if (!evData || evData.length === 0) { setEvents([]); return; }

    const enriched: TrainingEvent[] = [];
    for (const ev of evData as any[]) {
      const { data: tasks } = await supabase.from('tasks').select('id, spots_available').eq('event_id', ev.id).limit(1);
      const task = tasks?.[0] || null;
      let signupCount = 0, checkedInCount = 0, ticketCount = 0;
      if (task) {
        const { count: sc } = await supabase.from('task_signups').select('id', { count: 'exact', head: true }).eq('task_id', task.id);
        signupCount = sc || 0;
        const { data: tickets } = await supabase.from('volunteer_tickets').select('status').eq('event_id', ev.id).eq('club_id', cid);
        ticketCount = (tickets || []).length;
        checkedInCount = (tickets || []).filter((t: any) => t.status === 'checked_in').length;
      }
      enriched.push({
        ...ev, training_id: ev.training_id!,
        certificate_design_id: ev.certificate_design_id || null,
        training_title: ev.academy_trainings?.title,
        task: task ? { id: task.id, spots_available: task.spots_available } : null,
        signupCount, checkedInCount, ticketCount,
      });
    }
    setEvents(enriched);
  };

  const handleCreateEvent = async () => {
    if (!clubId || !newEventTitle.trim()) return;

    const { data: ev, error: evErr } = await supabase.from('events').insert({
      club_id: clubId, title: newEventTitle, event_date: newEventDate || null,
      location: newEventLocation || null, description: newEventDesc || null,
      training_id: selectedTrainingId || null, event_type: 'training', status: 'open',
      certificate_design_id: newEventCertDesignId || null,
    }).select().single();
    if (evErr || !ev) { toast.error(evErr?.message || 'Error'); return; }

    await supabase.from('tasks').insert({
      club_id: clubId, title: newEventTitle, event_id: (ev as any).id,
      task_date: newEventDate || null, location: newEventLocation || null,
      spots_available: newEventSpots, status: 'open', compensation_type: 'none',
    });

    toast.success(l.eventCreated);
    setShowCreateEvent(false);
    setNewEventTitle(''); setNewEventDate(''); setNewEventLocation(''); setNewEventDesc(''); setSelectedTrainingId(''); setNewEventCertDesignId('');
    await loadAllEvents(clubId);
  };

  const loadEventSignups = async (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev?.task) { setEventSignups([]); return; }

    const { data: signups } = await supabase.from('task_signups').select('volunteer_id, status').eq('task_id', ev.task.id);
    if (!signups || signups.length === 0) { setEventSignups([]); return; }

    const volIds = signups.map((s: any) => s.volunteer_id);
    const [profilesRes, ticketsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', volIds),
      supabase.from('volunteer_tickets').select('volunteer_id, status').eq('event_id', eventId).eq('club_id', clubId!),
    ]);

    setEventSignups(signups.map((s: any) => {
      const prof = (profilesRes.data || []).find((p: any) => p.id === s.volunteer_id);
      const ticket = (ticketsRes.data || []).find((t: any) => t.volunteer_id === s.volunteer_id);
      return {
        volunteer_id: s.volunteer_id,
        full_name: prof?.full_name || s.volunteer_id.slice(0, 8),
        status: s.status,
        ticket_status: ticket?.status || null,
        checked_in: ticket?.status === 'checked_in',
      };
    }));
  };

  const handleGenerateTickets = async (eventId: string) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev?.task || !clubId) return;

    const { data: signups } = await supabase.from('task_signups').select('volunteer_id').eq('task_id', ev.task.id).eq('status', 'approved');
    if (!signups || signups.length === 0) { toast.error(l.noApproved); return; }

    const { data: existing } = await supabase.from('volunteer_tickets').select('volunteer_id').eq('event_id', eventId).eq('club_id', clubId);
    const existingIds = new Set((existing || []).map((t: any) => t.volunteer_id));

    const newTickets = signups
      .filter((s: any) => !existingIds.has(s.volunteer_id))
      .map((s: any) => ({
        club_id: clubId,
        event_id: eventId,
        task_id: ev.task!.id,
        volunteer_id: s.volunteer_id,
        barcode: `VT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        status: 'sent' as const,
      }));

    if (newTickets.length > 0) {
      await supabase.from('volunteer_tickets').insert(newTickets);
    }
    toast.success(`${newTickets.length} ${l.ticketsGenerated}`);
    await loadAllEvents(clubId!);
    await loadEventSignups(eventId);
  };

  const handleAwardCerts = async (eventId: string) => {
    if (!confirm(l.awardConfirm)) return;
    const ev = events.find(e => e.id === eventId);
    if (!ev || !clubId) return;

    const { data: tickets } = await supabase.from('volunteer_tickets')
      .select('volunteer_id')
      .eq('event_id', eventId)
      .eq('club_id', clubId)
      .eq('status', 'checked_in');

    if (!tickets || tickets.length === 0) { toast.error(l.noCheckedIn); return; }

    if (!ev.training_id && !ev.certificate_design_id) {
      toast.error(language === 'nl' ? 'Geen training of certificaat sjabloon gekoppeld' : 'No training or certificate template linked');
      return;
    }

    // Use event id as fallback training_id for standalone training events
    const trainingId = ev.training_id || ev.id;

    const { data: existingCerts } = await supabase.from('volunteer_certificates')
      .select('volunteer_id')
      .eq('training_id', trainingId)
      .eq('club_id', clubId);
    const existingIds = new Set((existingCerts || []).map((c: any) => c.volunteer_id));

    const newCerts = tickets
      .filter((t: any) => !existingIds.has(t.volunteer_id))
      .map((t: any) => ({
        volunteer_id: t.volunteer_id,
        training_id: trainingId,
        club_id: clubId!,
        type: 'physical_event',
        certificate_design_id: ev.certificate_design_id || null,
      }));

    if (newCerts.length > 0) {
      await supabase.from('volunteer_certificates').insert(newCerts);
    }
    toast.success(`${newCerts.length} ${l.certsAwarded}`);
    await loadAllEvents(clubId!);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 h-14 flex items-center justify-between max-w-4xl mx-auto">
          <button onClick={() => navigate('/academy')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {l.back}
          </button>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-accent" />
            <h1 className="font-heading font-semibold text-foreground">{l.title}</h1>
          </div>
          <Logo size="sm" linkTo="/club-dashboard" />
        </div>
      </header>

      <main className="px-4 py-6 pb-tab-bar max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-bold text-foreground">{l.title}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/academy/certificate-builder')} className="gap-1.5">
              <Award className="w-4 h-4" /> {language === 'nl' ? 'Certificaat ontwerpen' : language === 'fr' ? 'Concevoir certificat' : 'Design certificate'}
            </Button>
            <Button onClick={() => setShowCreateEvent(true)} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> {l.createEvent}
            </Button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">{l.noEvents}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev, i) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-card"
              >
                <button
                  onClick={() => { const newId = expandedEventId === ev.id ? null : ev.id; setExpandedEventId(newId); if (newId) loadEventSignups(newId); }}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                      {ev.training_title && <p className="text-xs text-primary font-medium">{ev.training_title}</p>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {ev.event_date && <span>{new Date(ev.event_date).toLocaleDateString()} {new Date(ev.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        {ev.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ev.location}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{ev.signupCount} {l.signups}</span>
                    <span className="text-accent font-medium">{ev.checkedInCount} {l.checkedIn}</span>
                    {ev.ticketCount! > 0 && <span className="text-primary">🎫 {ev.ticketCount}</span>}
                    {expandedEventId === ev.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedEventId === ev.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                        <div className="flex gap-2 flex-wrap">
                          <Button variant="default" size="sm" onClick={() => handleAwardCerts(ev.id)} disabled={ev.checkedInCount === 0 || (!ev.training_id && !ev.certificate_design_id)} className="gap-1.5 text-xs" title={(!ev.training_id && !ev.certificate_design_id) ? (language === 'nl' ? 'Geen training of sjabloon gekoppeld' : 'No training or template linked') : ''}>
                            <Award className="w-3.5 h-3.5" /> {l.awardCerts}
                          </Button>
                        </div>

                        {eventSignups.length > 0 ? (
                          <div className="space-y-1">
                            {eventSignups.map(s => (
                              <div key={s.volunteer_id} className="flex items-center justify-between text-sm py-2 px-3 rounded-xl bg-muted/30">
                                <span className="text-foreground font-medium">{s.full_name}</span>
                                <div className="flex items-center gap-2">
                                  {s.checked_in ? (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                                      ✅ {language === 'nl' ? 'Aanwezig' : language === 'fr' ? 'Présent' : 'Present'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                      {language === 'nl' ? 'Ingeschreven' : language === 'fr' ? 'Inscrit' : 'Signed up'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">{l.noSignups}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Create event dialog */}
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" /> {l.createEvent}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">{l.selectTraining} <span className="text-muted-foreground font-normal">({language === 'nl' ? 'optioneel' : language === 'fr' ? 'optionnel' : 'optional'})</span></label>
              <select value={selectedTrainingId} onChange={e => setSelectedTrainingId(e.target.value)}
                className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">{language === 'nl' ? 'Geen training (losstaand)' : language === 'fr' ? 'Aucune formation (indépendant)' : 'No training (standalone)'}</option>
                {trainings.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{l.trainingTitle}</label>
              <Input value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{l.eventDate}</label>
              <Input type="datetime-local" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{l.eventLocation}</label>
              <Input value={newEventLocation} onChange={e => setNewEventLocation(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{l.spots}</label>
              <Input type="number" min={1} value={newEventSpots} onChange={e => setNewEventSpots(Number(e.target.value))} className="mt-1 w-24" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{l.eventDesc}</label>
              <Textarea value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{l.selectCertDesign}</label>
              <select value={newEventCertDesignId} onChange={e => setNewEventCertDesignId(e.target.value)}
                className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">{l.noCertDesign}</option>
                {certDesigns.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <Button onClick={handleCreateEvent} disabled={!newEventTitle.trim()} className="w-full gap-2">
              <CalendarDays className="w-4 h-4" /> {l.createEvent}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhysicalTrainings;
