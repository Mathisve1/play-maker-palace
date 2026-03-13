import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Coffee, Play, Square, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language } from '@/i18n/translations';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface Props {
  taskId: string;
  userId: string;
  language: Language;
}

const BreakTimer = ({ taskId, userId, language }: Props) => {
  const [onBreak, setOnBreak] = useState(false);
  const [breakId, setBreakId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [todayBreaks, setTodayBreaks] = useState<{ duration_minutes: number }[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load today's breaks
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('volunteer_breaks')
        .select('id, started_at, ended_at, duration_minutes')
        .eq('task_id', taskId)
        .eq('volunteer_id', userId)
        .gte('started_at', today);

      if (data) {
        const activeBreak = data.find((b: any) => !b.ended_at);
        if (activeBreak) {
          setOnBreak(true);
          setBreakId(activeBreak.id);
          setElapsed(Math.floor((Date.now() - new Date(activeBreak.started_at).getTime()) / 1000));
        }
        setTodayBreaks(data.filter((b: any) => b.ended_at && b.duration_minutes));
      }
    };
    load();

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [taskId, userId]);

  useEffect(() => {
    if (onBreak) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [onBreak]);

  const handleStartBreak = async () => {
    const { data, error } = await supabase.from('volunteer_breaks').insert({
      task_id: taskId,
      volunteer_id: userId,
    }).select('id').single();

    if (error) { toast.error(error.message); return; }
    setBreakId(data.id);
    setOnBreak(true);
    setElapsed(0);
  };

  const handleEndBreak = async () => {
    if (!breakId) return;
    const durationMinutes = Math.max(Math.round(elapsed / 60), 1);

    await (supabase as any).from('volunteer_breaks')
      .update({ ended_at: new Date().toISOString(), duration_minutes: durationMinutes })
      .eq('id', breakId);

    setOnBreak(false);
    setBreakId(null);
    setTodayBreaks(prev => [...prev, { duration_minutes: durationMinutes }]);
    setElapsed(0);
    toast.success(t3(language, `Pauze beëindigd (${durationMinutes} min)`, `Pause terminée (${durationMinutes} min)`, `Break ended (${durationMinutes} min)`));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const totalBreakMinutes = todayBreaks.reduce((s, b) => s + (b.duration_minutes || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 border space-y-3 ${onBreak ? 'bg-accent/5 border-accent/30' : 'bg-card border-border'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coffee className={`w-4 h-4 ${onBreak ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
          <h3 className="text-sm font-semibold text-foreground">
            {t3(language, 'Pauze', 'Pause', 'Break')}
          </h3>
        </div>
        {totalBreakMinutes > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {t3(language, 'Totaal vandaag', 'Total aujourd\'hui', 'Total today')}: {totalBreakMinutes} min
          </span>
        )}
      </div>

      {onBreak && (
        <div className="text-center">
          <p className="text-3xl font-mono font-bold text-foreground">{formatTime(elapsed)}</p>
          {elapsed >= 900 && (
            <p className="text-xs text-destructive mt-1">
              ⚠️ {t3(language, 'Pauze duurt al 15+ minuten', 'Pause dure déjà 15+ min', 'Break is 15+ minutes long')}
            </p>
          )}
        </div>
      )}

      <Button
        size="sm"
        variant={onBreak ? 'destructive' : 'outline'}
        onClick={onBreak ? handleEndBreak : handleStartBreak}
        className="w-full"
      >
        {onBreak ? (
          <><Square className="w-4 h-4" /> {t3(language, 'Pauze stoppen', 'Arrêter la pause', 'End break')}</>
        ) : (
          <><Play className="w-4 h-4" /> {t3(language, 'Start pauze', 'Démarrer pause', 'Start break')}</>
        )}
      </Button>
    </motion.div>
  );
};

export default BreakTimer;
