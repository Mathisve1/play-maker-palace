import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { Calendar, Clock, RotateCcw, CalendarDays, Loader2, Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: string | null;
}

const labels = {
  nl: {
    title: 'Mijn Beschikbaarheid',
    subtitle: 'Geef aan wanneer je beschikbaar bent — clubs kunnen dit zien bij het plannen',
    recurring: 'Wekelijks',
    specific: 'Specifieke datum',
    days: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
    daysFull: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'],
    save: 'Opslaan',
    saving: 'Opslaan...',
    saved: 'Beschikbaarheid opgeslagen!',
    selectDate: 'Kies een datum',
    addSlot: 'Tijdslot toevoegen',
    from: 'Van',
    to: 'Tot',
    noSlots: 'Tik op een dag om tijdslots toe te voegen',
    removeSlot: 'Verwijderen',
  },
  fr: {
    title: 'Ma Disponibilité',
    subtitle: 'Indiquez quand vous êtes disponible — les clubs peuvent le voir lors de la planification',
    recurring: 'Hebdomadaire',
    specific: 'Date spécifique',
    days: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
    daysFull: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    saved: 'Disponibilité enregistrée !',
    selectDate: 'Choisir une date',
    addSlot: 'Ajouter un créneau',
    from: 'De',
    to: 'À',
    noSlots: 'Appuyez sur un jour pour ajouter des créneaux',
    removeSlot: 'Supprimer',
  },
  en: {
    title: 'My Availability',
    subtitle: 'Indicate when you are available — clubs can see this when planning',
    recurring: 'Weekly',
    specific: 'Specific date',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    daysFull: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    save: 'Save',
    saving: 'Saving...',
    saved: 'Availability saved!',
    selectDate: 'Pick a date',
    addSlot: 'Add time slot',
    from: 'From',
    to: 'To',
    noSlots: 'Tap a day to add time slots',
    removeSlot: 'Remove',
  },
};

// Monday=0 ... Sunday=6 display, stored as ISO day_of_week 0-6
const toDow = (displayIdx: number) => (displayIdx + 1) % 7;
const fromDow = (dow: number) => (dow + 6) % 7;

interface SlotEntry {
  key: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AvailabilityCalendarProps {
  userId: string;
}

const AvailabilityCalendar = ({ userId }: AvailabilityCalendarProps) => {
  const { language } = useLanguage();
  const l = labels[language];

  const [mode, setMode] = useState<'recurring' | 'specific'>('recurring');
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<SlotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const loadSlots = useCallback(async () => {
    const { data } = await supabase
      .from('volunteer_availability')
      .select('*')
      .eq('volunteer_id', userId);

    if (data) {
      const entries: SlotEntry[] = data.map((row: any) => ({
        key: `${row.day_of_week}-${row.start_time}-${row.end_time}`,
        day_of_week: row.day_of_week,
        start_time: row.start_time?.slice(0, 5) || '09:00',
        end_time: row.end_time?.slice(0, 5) || '17:00',
      }));
      setSlots(entries);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const getDaySlots = (dow: number) => slots.filter(s => s.day_of_week === dow);

  const addSlot = (dow: number) => {
    const existing = getDaySlots(dow);
    const lastEnd = existing.length > 0 ? existing[existing.length - 1].end_time : '08:00';
    const newStart = lastEnd;
    const newEnd = `${Math.min(parseInt(lastEnd.split(':')[0]) + 3, 23).toString().padStart(2, '0')}:00`;
    const entry: SlotEntry = {
      key: `${dow}-${newStart}-${newEnd}-${Date.now()}`,
      day_of_week: dow,
      start_time: newStart,
      end_time: newEnd,
    };
    setSlots(prev => [...prev, entry]);
    setDirty(true);
    setExpandedDay(dow);
  };

  const removeSlot = (key: string) => {
    setSlots(prev => prev.filter(s => s.key !== key));
    setDirty(true);
  };

  const updateSlotTime = (key: string, field: 'start_time' | 'end_time', value: string) => {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, [field]: value, key: field === 'start_time' || field === 'end_time' ? `${s.day_of_week}-${field === 'start_time' ? value : s.start_time}-${field === 'end_time' ? value : s.end_time}-${Date.now()}` : s.key } : s));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);

    // Validate: end > start for all slots
    for (const s of slots) {
      if (s.end_time <= s.start_time) {
        toast({ title: '⚠️', description: language === 'nl' ? `Eindtijd moet na starttijd liggen (${l.daysFull[fromDow(s.day_of_week)]})` : language === 'fr' ? `L'heure de fin doit être après l'heure de début` : `End time must be after start time`, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    // Delete all existing recurring availability
    await supabase
      .from('volunteer_availability')
      .delete()
      .eq('volunteer_id', userId)
      .eq('is_recurring', true);

    // Insert all current slots
    if (slots.length > 0) {
      const inserts = slots.map(s => ({
        volunteer_id: userId,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_recurring: true,
        specific_date: mode === 'specific' && selectedDate ? selectedDate : null,
      }));

      const { error } = await supabase.from('volunteer_availability').insert(inserts);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    toast({ title: '✅', description: l.saved });
    setDirty(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={mode === 'recurring' ? 'default' : 'outline'}
          onClick={() => setMode('recurring')}
          className="text-sm min-h-[44px]"
        >
          <RotateCcw className="w-4 h-4 mr-1.5" />
          {l.recurring}
        </Button>
        <Button
          size="sm"
          variant={mode === 'specific' ? 'default' : 'outline'}
          onClick={() => setMode('specific')}
          className="text-sm min-h-[44px]"
        >
          <CalendarDays className="w-4 h-4 mr-1.5" />
          {l.specific}
        </Button>
      </div>

      {mode === 'specific' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-3 rounded-xl border border-input bg-background text-foreground text-base focus:ring-2 focus:ring-ring w-full min-h-[48px]"
          />
        </motion.div>
      )}

      {/* Day cards with time slots */}
      <div className="space-y-2">
        {Array.from({ length: 7 }, (_, displayIdx) => {
          const dow = toDow(displayIdx);
          const daySlots = getDaySlots(dow);
          const isExpanded = expandedDay === dow;
          const hasSlots = daySlots.length > 0;

          return (
            <motion.div
              key={dow}
              className={cn(
                'rounded-xl border transition-colors',
                hasSlots ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
              )}
            >
              {/* Day header */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : dow)}
                className="w-full flex items-center justify-between p-4 min-h-[56px] text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold',
                    hasSlots ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {l.days[displayIdx]}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{l.daysFull[displayIdx]}</p>
                    {hasSlots && (
                      <p className="text-sm text-muted-foreground">
                        {daySlots.map(s => `${s.start_time} – ${s.end_time}`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                {hasSlots && (
                  <Check className="w-5 h-5 text-primary shrink-0" />
                )}
              </button>

              {/* Expanded: time slot editor */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {daySlots.map((slot) => (
                        <div key={slot.key} className="flex items-center gap-2 bg-background rounded-lg p-3 border border-border">
                          <div className="flex-1 flex items-center gap-2">
                            <label className="text-sm text-muted-foreground shrink-0">{l.from}</label>
                            <input
                              type="time"
                              value={slot.start_time}
                              onChange={e => updateSlotTime(slot.key, 'start_time', e.target.value)}
                              className="flex-1 px-2 py-2 rounded-lg border border-input bg-background text-foreground text-base min-h-[44px]"
                            />
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <label className="text-sm text-muted-foreground shrink-0">{l.to}</label>
                            <input
                              type="time"
                              value={slot.end_time}
                              onChange={e => updateSlotTime(slot.key, 'end_time', e.target.value)}
                              className="flex-1 px-2 py-2 rounded-lg border border-input bg-background text-foreground text-base min-h-[44px]"
                            />
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeSlot(slot.key)}
                            className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={() => addSlot(dow)}
                        className="w-full min-h-[48px] text-base gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {l.addSlot}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary/15 border-2 border-primary" />
          <span>{language === 'nl' ? 'Beschikbaar' : language === 'fr' ? 'Disponible' : 'Available'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted/30 border-2 border-transparent" />
          <span>{language === 'nl' ? 'Niet ingesteld' : language === 'fr' ? 'Non défini' : 'Not set'}</span>
        </div>
      </div>

      {/* Save button */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <Button onClick={handleSave} disabled={saving} className="w-full min-h-[52px] text-base">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{l.saving}</>
              ) : (
                <><Check className="w-4 h-4 mr-2" />{l.save}</>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AvailabilityCalendar;
