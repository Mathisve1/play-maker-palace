import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, Lock, Radio, Camera, MapPin, ChevronRight, Minimize2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

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
}

const VolunteerPhoneMockup = ({
  zones, incidentTypes, checklistItems, checklistProgress, isLive, eventTitle,
}: VolunteerPhoneMockupProps) => {
  const [mockStep, setMockStep] = useState<'checklist' | 'incident-grid' | 'incident-detail' | 'sent'>('checklist');
  const [selectedType, setSelectedType] = useState<SafetyIncidentType | null>(null);

  // Reset to appropriate screen when isLive changes
  useEffect(() => {
    if (isLive) {
      setMockStep('checklist'); // will show lockdown screen
    } else {
      setMockStep('checklist');
    }
  }, [isLive]);

  const isItemCompleted = (itemId: string) => checklistProgress.some(p => p.checklist_item_id === itemId && p.is_completed);
  const completedCount = checklistItems.filter(i => isItemCompleted(i.id)).length;
  const totalItems = checklistItems.length;
  const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const getZoneName = (zoneId: string | null) => zones.find(z => z.id === zoneId)?.name || '—';

  // Group checklist items by zone
  const itemsByZone = zones.map(z => ({
    zone: z,
    items: checklistItems.filter(ci => ci.zone_id === z.id),
  })).filter(g => g.items.length > 0);

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-muted-foreground mb-2 font-medium">📱 Vrijwilligersweergave (live preview)</p>
      {/* Phone frame */}
      <div className="relative w-[280px] h-[560px] rounded-[2.5rem] border-[6px] border-foreground/20 bg-background shadow-2xl overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-foreground/20 rounded-b-2xl z-10" />

        {/* Status bar */}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ── PRE-EVENT: Checklist ── */}
            {!isLive && (
              <motion.div
                key="checklist"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-3 space-y-3"
              >
                {/* Overall progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Voortgang</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>

                {/* Items grouped by zone */}
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
                          <div
                            key={item.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[10px] transition-all ${done ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-card border-border'}`}
                          >
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
                    <p className="text-[10px] font-semibold text-foreground">Alle taken voltooid!</p>
                    <p className="text-[9px] text-muted-foreground">Wacht op GO LIVE van de coördinator...</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── POST GO LIVE: Incident mode ── */}
            {isLive && mockStep === 'checklist' && (
              <motion.div
                key="lockdown"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="p-3 space-y-3"
              >
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
                  <Lock className="w-5 h-5 text-destructive mx-auto mb-1" />
                  <p className="text-[10px] font-semibold text-foreground">Event is live</p>
                  <p className="text-[9px] text-muted-foreground">Meld incidenten hieronder</p>
                </div>

                <Button
                  onClick={() => setMockStep('incident-grid')}
                  className="w-full h-10 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Incident melden
                </Button>
              </motion.div>
            )}

            {isLive && mockStep === 'incident-grid' && (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-foreground">Kies type</p>
                  <button onClick={() => setMockStep('checklist')} className="text-muted-foreground">
                    <Minimize2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {incidentTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => { setSelectedType(type); setMockStep('incident-detail'); }}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border hover:border-primary/50 bg-card transition-all text-center"
                    >
                      <AlertTriangle className="w-4 h-4" style={{ color: type.color }} />
                      <span className="text-[9px] font-medium text-foreground leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {isLive && mockStep === 'incident-detail' && selectedType && (
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <button onClick={() => setMockStep('incident-grid')}>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
                  </button>
                  <AlertTriangle className="w-4 h-4" style={{ color: selectedType.color }} />
                  <span className="text-[10px] font-bold text-foreground">{selectedType.label}</span>
                </div>

                <select className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-[10px]" disabled>
                  <option>Zone selecteren...</option>
                </select>

                <input type="text" placeholder="Korte beschrijving..." className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-[10px]" disabled />

                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <MapPin className="w-3 h-3 text-emerald-500" /> GPS wordt automatisch meegestuurd
                </div>

                <div className="border border-dashed border-border rounded-lg p-3 text-center">
                  <Camera className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-[9px] text-muted-foreground">Foto toevoegen (optioneel)</p>
                </div>

                <Button
                  onClick={() => setMockStep('sent')}
                  className="w-full h-8 rounded-lg bg-destructive text-destructive-foreground text-[10px] font-bold"
                >
                  Verstuur melding
                </Button>
              </motion.div>
            )}

            {isLive && mockStep === 'sent' && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="p-3 flex flex-col items-center justify-center h-[300px] gap-3"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.1 }}
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </motion.div>
                <p className="text-xs font-semibold text-foreground">Melding verstuurd!</p>
                <p className="text-[10px] text-muted-foreground text-center">De coördinator ontvangt dit direct in de Control Room.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 mt-2"
                  onClick={() => { setMockStep('checklist'); setSelectedType(null); }}
                >
                  Terug naar scherm
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
