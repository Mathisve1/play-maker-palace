import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { Calendar, Clock, RotateCcw, CalendarDays, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const TIME_SLOTS = [
  { key: 'morning', start: '06:00', end: '12:00' },
  { key: 'afternoon', start: '12:00', end: '18:00' },
  { key: 'evening', start: '18:00', end: '23:00' },
] as const;

const labels = {
  nl: {
    title: 'Mijn Beschikbaarheid',
    subtitle: 'Geef aan wanneer je beschikbaar bent',
    recurring: 'Wekelijks',
    specific: 'Specifieke datum',
    morning: 'Ochtend',
    afternoon: 'Middag',
    evening: 'Avond',
    days: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
    daysFull: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'],
    save: 'Opslaan',
    saving: 'Opslaan...',
    saved: 'Beschikbaarheid opgeslagen!',
    selectDate: 'Kies een datum',
    timeRange: '06:00 - 23:00',
  },
  fr: {
    title: 'Ma Disponibilité',
    subtitle: 'Indiquez quand vous êtes disponible',
    recurring: 'Hebdomadaire',
    specific: 'Date spécifique',
    morning: 'Matin',
    afternoon: 'Après-midi',
    evening: 'Soir',
    days: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
    daysFull: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    saved: 'Disponibilité enregistrée !',
    selectDate: 'Choisir une date',
    timeRange: '06:00 - 23:00',
  },
  en: {
    title: 'My Availability',
    subtitle: 'Indicate when you are available',
    recurring: 'Weekly',
    specific: 'Specific date',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    daysFull: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    save: 'Save',
    saving: 'Saving...',
    saved: 'Availability saved!',
    selectDate: 'Pick a date',
    timeRange: '06:00 - 23:00',
  },
};

// Map: Monday=0 ... Sunday=6 internally, stored as day_of_week 1-7 (ISO) mapped to 0-6
const toDow = (displayIdx: number) => (displayIdx + 1) % 7; // 0=Mon→1, 6=Sun→0

interface AvailabilityCalendarProps {
  userId: string;
}

const AvailabilityCalendar = ({ userId }: AvailabilityCalendarProps) => {
  const { language } = useLanguage();
  const l = labels[language];

  const [mode, setMode] = useState<'recurring' | 'specific'>('recurring');
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const slotKey = (day: number, timeKey: string) => `${day}-${timeKey}`;

  const loadSlots = useCallback(async () => {
    const { data } = await supabase
      .from('volunteer_availability')
      .select('*')
      .eq('volunteer_id', userId);

    if (data) {
      const set = new Set<string>();
      data.forEach((row: any) => {
        const timeSlot = TIME_SLOTS.find(ts => ts.start === row.start_time?.slice(0, 5));
        if (timeSlot) {
          set.add(slotKey(row.day_of_week, timeSlot.key));
        }
      });
      setSlots(set);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const toggleSlot = (day: number, timeKey: string) => {
    const key = slotKey(day, timeKey);
    setSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);

    // Delete all existing recurring availability
    await supabase
      .from('volunteer_availability')
      .delete()
      .eq('volunteer_id', userId)
      .eq('is_recurring', true);

    // Insert active slots
    const inserts: Omit<AvailabilitySlot, 'id'>[] = [];
    slots.forEach(key => {
      const [dayStr, timeKey] = key.split('-');
      const day = parseInt(dayStr);
      const ts = TIME_SLOTS.find(t => t.key === timeKey);
      if (ts) {
        inserts.push({
          day_of_week: day,
          start_time: ts.start,
          end_time: ts.end,
          is_recurring: true,
          specific_date: mode === 'specific' && selectedDate ? selectedDate : null,
        });
      }
    });

    if (inserts.length > 0) {
      const { error } = await supabase.from('volunteer_availability').insert(
        inserts.map(s => ({ ...s, volunteer_id: userId }))
      );
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

  const slotLabels = { morning: l.morning, afternoon: l.afternoon, evening: l.evening };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={mode === 'recurring' ? 'default' : 'outline'}
          onClick={() => setMode('recurring')}
          className="text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          {l.recurring}
        </Button>
        <Button
          size="sm"
          variant={mode === 'specific' ? 'default' : 'outline'}
          onClick={() => setMode('specific')}
          className="text-xs"
        >
          <CalendarDays className="w-3.5 h-3.5 mr-1" />
          {l.specific}
        </Button>
      </div>

      {mode === 'specific' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring"
          />
        </motion.div>
      )}

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header row */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
            <div className="flex items-center justify-center">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            {l.days.map((day, i) => (
              <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Time slot rows */}
          {TIME_SLOTS.map((ts) => (
            <div key={ts.key} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
              <div className="flex items-center justify-center text-[11px] text-muted-foreground font-medium">
                {slotLabels[ts.key]}
              </div>
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const dow = toDow(dayIdx);
                const key = slotKey(dow, ts.key);
                const isActive = slots.has(key);

                return (
                  <motion.button
                    key={key}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => toggleSlot(dow, ts.key)}
                    className={cn(
                      'h-12 rounded-xl border-2 transition-all duration-200 flex items-center justify-center',
                      isActive
                        ? 'bg-primary/15 border-primary text-primary shadow-sm'
                        : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/60 hover:border-muted-foreground/20'
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <Check className="w-5 h-5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary/15 border-2 border-primary" />
          <span>{language === 'nl' ? 'Beschikbaar' : language === 'fr' ? 'Disponible' : 'Available'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted/30 border-2 border-transparent" />
          <span>{language === 'nl' ? 'Niet beschikbaar' : language === 'fr' ? 'Non disponible' : 'Not available'}</span>
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
            <Button onClick={handleSave} disabled={saving} className="w-full">
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
