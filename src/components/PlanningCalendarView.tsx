import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Layers } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface EventData {
  id: string;
  title: string;
  event_date: string | null;
  location: string | null;
}

interface TaskData {
  id: string;
  title: string;
  task_date: string | null;
  event_id: string | null;
  zone_count: number;
}

interface Props {
  events: EventData[];
  tasks: TaskData[];
  language: string;
}

const DAY_LABELS: Record<string, string[]> = {
  nl: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

const MONTH_NAMES: Record<string, string[]> = {
  nl: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const PlanningCalendarView = ({ events, tasks, language }: Props) => {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const days = DAY_LABELS[language] || DAY_LABELS.en;
  const monthNames = MONTH_NAMES[language] || MONTH_NAMES.en;

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build date -> items map
  const dateMap = useMemo(() => {
    const map = new Map<string, { events: EventData[]; tasks: TaskData[] }>();
    const add = (key: string, type: 'events' | 'tasks', item: any) => {
      if (!map.has(key)) map.set(key, { events: [], tasks: [] });
      map.get(key)![type].push(item);
    };
    events.forEach(e => {
      if (e.event_date) add(e.event_date.slice(0, 10), 'events', e);
    });
    tasks.forEach(t => {
      if (t.task_date) add(t.task_date.slice(0, 10), 'tasks', t);
    });
    return map;
  }, [events, tasks]);

  // Calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
  const totalDays = lastDay.getDate();
  const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - startOffset + 1;
    cells.push(day >= 1 && day <= totalDays ? day : null);
  }

  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h2 className="text-base font-heading font-semibold text-foreground">
          {monthNames[month]} {year}
        </h2>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {days.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-[72px] border-b border-r border-border bg-muted/20" />;

          const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
          const items = dateMap.get(dateKey);
          const hasEvents = (items?.events.length || 0) > 0;
          const hasTasks = (items?.tasks.length || 0) > 0;
          const hasItems = hasEvents || hasTasks;

          const cell = (
            <div className={`min-h-[72px] border-b border-r border-border p-1.5 transition-colors ${hasItems ? 'hover:bg-muted/40 cursor-pointer' : ''} ${isToday(day) ? 'bg-primary/5' : ''}`}>
              <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                {day}
              </span>
              {hasItems && (
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {items!.events.map(e => (
                    <span key={e.id} className="w-2 h-2 rounded-full bg-primary shrink-0" title={e.title} />
                  ))}
                  {items!.tasks.map(t => (
                    <span key={t.id} className="w-2 h-2 rounded-full bg-accent shrink-0" title={t.title} />
                  ))}
                </div>
              )}
            </div>
          );

          if (!hasItems) return <div key={i}>{cell}</div>;

          return (
            <Popover key={i}>
              <PopoverTrigger asChild>{cell}</PopoverTrigger>
              <PopoverContent className="w-64 p-3 space-y-2" side="bottom" align="start">
                <p className="text-xs font-semibold text-foreground">{day} {monthNames[month]}</p>
                {items!.events.map(e => (
                  <button key={e.id} onClick={() => navigate(`/events-manager`)}
                    className="w-full flex items-center gap-2 text-left text-xs p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-foreground truncate">{e.title}</span>
                  </button>
                ))}
                {items!.tasks.map(t => (
                  <button key={t.id} onClick={() => t.zone_count > 0 ? navigate(`/planning/${t.id}`) : null}
                    disabled={t.zone_count === 0}
                    className="w-full flex items-center gap-2 text-left text-xs p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
                    <Layers className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="text-foreground truncate">{t.title}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-t border-border">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> {language === 'nl' ? 'Evenement' : language === 'fr' ? 'Événement' : 'Event'}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-accent" /> {language === 'nl' ? 'Taak' : language === 'fr' ? 'Tâche' : 'Task'}</span>
      </div>
    </div>
  );
};

export default PlanningCalendarView;
