import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, Lock, Radio, Camera, MapPin, ChevronRight, Minimize2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

interface SafetyZone {
  id: string; name: string; color: string;
}
interface SafetyIncidentType {
  id: string; label: string; icon: string; color: string; default_priority: string;
}
interface ChecklistItem {
  id: string; description: string; zone_id: string | null; event_id: string;
}
interface ChecklistProgress {
  id: string; checklist_item_id: string; volunteer_id: string; is_completed: boolean;
}

interface VolunteerPhoneMockupProps {
  zones: SafetyZone[];
  incidentTypes: SafetyIncidentType[];
  checklistItems: ChecklistItem[];
  checklistProgress: ChecklistProgress[];
  isLive: boolean;
  eventTitle: string;
  eventId: string;
  clubId: string;
}

const t3 = (nl: string, fr: string, en: string, lang: string) => lang === 'fr' ? fr : lang === 'en' ? en : nl;

const VolunteerPhoneMockup = ({
  zones, incidentTypes, checklistItems, checklistProgress, isLive, eventTitle, eventId, clubId,
}: VolunteerPhoneMockupProps) => {
  const { language } = useLanguage();
  const [mockStep, setMockStep] = useState<'checklist' | 'incident-grid' | 'incident-detail' | 'sent'>('checklist');
  const [selectedType, setSelectedType] = useState<SafetyIncidentType | null>(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [sentIncidentId, setSentIncidentId] = useState<string | null>(null);

  useEffect(() => {
    setMockStep('checklist');
  }, [isLive]);

  const isItemCompleted = (itemId: string) => checklistProgress.some(p => p.checklist_item_id === itemId && p.is_completed);
  const completedCount = checklistItems.filter(i => isItemCompleted(i.id)).length;
  const totalItems = checklistItems.length;
  const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const itemsByZone = zones.map(z => ({
    zone: z,
    items: checklistItems.filter(ci => ci.zone_id === z.id),
  })).filter(g => g.items.length > 0);

  const handleInstantReport = async (type: SafetyIncidentType) => {
    setSelectedType(type);
    setSending(true);

    const demoLat = 51.0255 + (Math.random() - 0.5) * 0.005;
    const demoLng = 3.7250 + (Math.random() - 0.5) * 0.005;

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) { setSending(false); return; }

    const { data: inc, error } = await (supabase as any).from('safety_incidents').insert({
      event_id: eventId,
      club_id: clubId,
      incident_type_id: type.id,
      reporter_id: userId,
      priority: type.default_priority,
      status: 'nieuw',
      lat: demoLat,
      lng: demoLng,
    }).select('id').single();

    if (error) {
      toast.error(t3('Melding mislukt', 'Signalement échoué', 'Report failed', language));
      setSending(false);
      return;
    }

    setSentIncidentId(inc.id);
    setSending(false);
    setMockStep('incident-detail');
  };

  const handleUpdateReport = async () => {
    if (!sentIncidentId) return;
    setSending(true);

    const updates: any = {};
    if (description.trim()) updates.description = description.trim();
    if (selectedZone) updates.zone_id = selectedZone;

    if (Object.keys(updates).length > 0) {
      await (supabase as any).from('safety_incidents').update(updates).eq('id', sentIncidentId);
    }

    setSending(false);
    setMockStep('sent');
  };

  const resetFlow = () => {
    setMockStep('checklist');
    setSelectedType(null);
    setSelectedZone('');
    setDescription('');
    setSentIncidentId(null);
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-muted-foreground mb-2 font-medium">
        📱 {t3('Vrijwilligersweergave (live preview)', 'Vue bénévole (aperçu en direct)', 'Volunteer view (live preview)', language)}
      </p>
      <div className="relative w-[280px] h-[560px] rounded-[2.5rem] border-[6px] border-foreground/20 bg-background shadow-2xl overflow-hidden flex flex-col">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-foreground/20 rounded-b-2xl z-10" />

        <div className="h-10 bg-card border-b border-border flex items-center justify-between px-4 pt-2">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold text-foreground truncate max-w-[120px]">{eventTitle}</span>
          </div>
          {isLive ? (
            <Badge variant="destructive" className="text-[8px] h-4 px-1.5 gap-0.5">
              <Radio className="w-2 h-2 animate-pulse" /> LIVE
            </Badge>
          ) : (
            <span className="text-[9px] text-muted-foreground">{completedCount}/{totalItems}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!isLive && (
              <motion.div key="checklist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{t3('Voortgang', 'Progression', 'Progress', language)}</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>

                {itemsByZone.map(({ zone, items }) => (
                  <div key={zone.id}>
                    <p className="text-[10px] font-semibold text-foreground mb-1 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                      {zone.name}
                    </p>
                    <div className="space-y-1">
                      {items.map(item => {
                        const done = isItemCompleted(item.id);
                        return (
                          <div key={item.id} className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[10px] transition-all ${done ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-card border-border'}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/40'}`}>
                              {done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className={done ? 'line-through text-muted-foreground' : 'text-foreground'}>{item.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {pct === 100 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-[10px] font-semibold text-foreground">{t3('Alle taken voltooid!', 'Toutes les tâches terminées !', 'All tasks completed!', language)}</p>
                    <p className="text-[9px] text-muted-foreground">{t3('Wacht op GO LIVE van de coördinator...', 'En attente du GO LIVE du coordinateur...', 'Waiting for coordinator GO LIVE...', language)}</p>
                  </div>
                )}
              </motion.div>
            )}

            {isLive && mockStep === 'checklist' && (
              <motion.div key="lockdown" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-3">
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
                  <Lock className="w-5 h-5 text-destructive mx-auto mb-1" />
                  <p className="text-[10px] font-semibold text-foreground">{t3('Event is live', 'Événement en direct', 'Event is live', language)}</p>
                  <p className="text-[9px] text-muted-foreground">{t3('Meld incidenten hieronder', 'Signalez les incidents ci-dessous', 'Report incidents below', language)}</p>
                </div>
                <Button
                  onClick={() => setMockStep('incident-grid')}
                  className="w-full h-10 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> {t3('Incident melden', 'Signaler un incident', 'Report incident', language)}
                </Button>
              </motion.div>
            )}

            {isLive && mockStep === 'incident-grid' && (
              <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-foreground">{t3('Tik = direct melden!', 'Appuyez = signalement immédiat !', 'Tap = instant report!', language)}</p>
                  <button onClick={() => setMockStep('checklist')} className="text-muted-foreground">
                    <Minimize2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {incidentTypes.map(type => (
                    <button
                      key={type.id}
                      disabled={sending}
                      onClick={() => handleInstantReport(type)}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-destructive/50 bg-card transition-all text-center active:scale-95"
                    >
                      <AlertTriangle className="w-4 h-4" style={{ color: type.color }} />
                      <span className="text-[9px] font-medium text-foreground leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[8px] text-muted-foreground text-center">{t3('GPS wordt automatisch meegestuurd bij klik', 'Le GPS est envoyé automatiquement au clic', 'GPS is sent automatically on click', language)}</p>
              </motion.div>
            )}

            {isLive && mockStep === 'incident-detail' && selectedType && (
              <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 space-y-2">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
                  <p className="text-[9px] font-semibold text-emerald-600">{t3('✓ Melding verstuurd met GPS!', '✓ Signalement envoyé avec GPS !', '✓ Report sent with GPS!', language)}</p>
                  <p className="text-[8px] text-muted-foreground">{t3('Voeg hieronder extra details toe', 'Ajoutez des détails supplémentaires ci-dessous', 'Add extra details below', language)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: selectedType.color }} />
                  <span className="text-[10px] font-bold text-foreground">{selectedType.label}</span>
                </div>

                <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-[10px]">
                  <option value="">{t3('Zone selecteren...', 'Sélectionner une zone...', 'Select zone...', language)}</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>

                <input
                  type="text"
                  placeholder={t3('Korte beschrijving...', 'Brève description...', 'Short description...', language)}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-[10px]"
                />

                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <MapPin className="w-3 h-3 text-emerald-500" /> {t3('GPS al meegestuurd', 'GPS déjà envoyé', 'GPS already sent', language)}
                </div>

                <div className="border border-dashed border-border rounded-lg p-3 text-center">
                  <Camera className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-[9px] text-muted-foreground">{t3('Foto toevoegen (optioneel)', 'Ajouter une photo (optionnel)', 'Add photo (optional)', language)}</p>
                </div>

                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    onClick={() => setMockStep('sent')}
                    className="flex-1 h-8 rounded-lg text-[10px]"
                  >
                    {t3('Overslaan', 'Passer', 'Skip', language)}
                  </Button>
                  <Button
                    onClick={handleUpdateReport}
                    disabled={sending}
                    className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold"
                  >
                    {t3('Details toevoegen', 'Ajouter des détails', 'Add details', language)}
                  </Button>
                </div>
              </motion.div>
            )}

            {isLive && mockStep === 'sent' && (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-3 flex flex-col items-center justify-center h-[300px] gap-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.1 }}>
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </motion.div>
                <p className="text-xs font-semibold text-foreground">{t3('Melding verstuurd!', 'Signalement envoyé !', 'Report sent!', language)}</p>
                <p className="text-[10px] text-muted-foreground text-center">{t3('De coördinator ontvangt dit direct in de Control Room.', 'Le coordinateur le reçoit directement dans la salle de contrôle.', 'The coordinator receives this directly in the Control Room.', language)}</p>
                <Button variant="outline" size="sm" className="text-[10px] h-7 mt-2" onClick={resetFlow}>
                  {t3('Terug naar scherm', 'Retour à l\'écran', 'Back to screen', language)}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default VolunteerPhoneMockup;
