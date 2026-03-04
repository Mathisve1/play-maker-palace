import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlanTask {
  id: string;
  plan_id: string;
  task_date: string;
  title: string;
  category: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  compensation_type: string;
  daily_rate: number | null;
  hourly_rate: number | null;
  estimated_hours: number | null;
  spots_available: number;
}

interface MonthlyCalendarGridProps {
  viewYear: number;
  viewMonth: number;
  tasks: PlanTask[];
  planStatus: string;
  language: string;
  weekdayNames: string[];
  categoryColor: (cat: string) => string;
  onDayClick: (dateStr: string) => void;
  onTaskClick: (task: PlanTask) => void;
  t3: (nl: string, fr: string, en: string) => string;
}

const MonthlyCalendarGrid = ({
  viewYear, viewMonth, tasks, planStatus, language, weekdayNames,
  categoryColor, onDayClick, onTaskClick, t3,
}: MonthlyCalendarGridProps) => {
  const now = new Date();
  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const getFirstDayOfWeek = (y: number, m: number) => { const d = new Date(y, m - 1, 1).getDay(); return d === 0 ? 6 : d - 1; };
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getTasksForDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.task_date === dateStr);
  };

  return (
    <Card>
      <CardContent className="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {weekdayNames.map(d => (
            <div key={d} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} className="bg-background p-2 min-h-[80px]" />;
            const dayTasks = getTasksForDay(day);
            const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = day === now.getDate() && viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();
            const isPast = new Date(dateStr) < new Date(now.toISOString().split('T')[0]);
            return (
              <div key={day} className={`bg-background p-1.5 min-h-[80px] sm:min-h-[100px] cursor-pointer hover:bg-muted/50 transition-colors relative ${isToday ? 'ring-2 ring-primary ring-inset' : ''} ${isPast ? 'opacity-60' : ''}`}
                onClick={() => { if (planStatus !== 'published' || !isPast) onDayClick(dateStr); }}>
                <span className={`text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : 'text-foreground'}`}>{day}</span>
                <div className="mt-1 space-y-0.5">
                  {dayTasks.slice(0, 3).map(t => (
                    <div key={t.id} className={`text-[10px] sm:text-xs px-1 py-0.5 rounded truncate ${categoryColor(t.category)}`}
                      onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}>{t.title}</div>
                  ))}
                  {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} {t3('meer', 'plus', 'more')}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyCalendarGrid;
