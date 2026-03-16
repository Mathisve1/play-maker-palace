import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, MapPin, AlertTriangle, Navigation, Calendar, CheckCircle, Loader2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Language } from '@/i18n/translations';
import { sendPushToClub } from '@/lib/sendPush';
import { toast } from 'sonner';
import type { VolunteerTask, TaskSignup } from '@/types/volunteer';

interface Props {
  language: Language;
  currentUserId: string;
  profileName: string;
  tasks: VolunteerTask[];
  signups: TaskSignup[];
  getSignupStatus: (taskId: string) => string | null;
  zoneAssignments?: Record<string, string>;
}

const labels: Record<'nl' | 'fr' | 'en', Record<string, string>> = {
  nl: {
    today: 'Vandaag',
    tomorrow: 'Morgen',
    noTasksToday: 'Geen taken vandaag',
    noTasksTomorrow: 'Geen taken morgen',
    onMyWay: 'Ik ben op weg',
    sent: 'Gemeld ✓',
    startsIn: 'Start over',
    started: 'Gestart',
    checkinWarning: '⚠️ Vergeet niet in te checken bij jouw taak vandaag!',
    assigned: 'Toegewezen',
    pending: 'In afwachting',
    hours: 'u',
    minutes: 'min',
    onMyWayPushTitle: 'Vrijwilliger onderweg',
  },
  fr: {
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    noTasksToday: "Pas de tâches aujourd'hui",
    noTasksTomorrow: 'Pas de tâches demain',
    onMyWay: 'Je suis en route',
    sent: 'Signalé ✓',
    startsIn: 'Début dans',
    started: 'Commencé',
    checkinWarning: "⚠️ N'oubliez pas de vous enregistrer à votre tâche aujourd'hui !",
    assigned: 'Assigné',
    pending: 'En attente',
    hours: 'h',
    minutes: 'min',
    onMyWayPushTitle: 'Bénévole en route',
  },
  en: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    noTasksToday: 'No tasks today',
    noTasksTomorrow: 'No tasks tomorrow',
    onMyWay: "I'm on my way",
    sent: 'Notified ✓',
    startsIn: 'Starts in',
    started: 'Started',
    checkinWarning: "⚠️ Don't forget to check in at your task today!",
    assigned: 'Assigned',
    pending: 'Pending',
    hours: 'h',
    minutes: 'min',
    onMyWayPushTitle: 'Volunteer on the way',
  },
};

function getDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatCountdown(taskDate: string, l: Record<string, string>): string {
  const diff = new Date(taskDate).getTime() - Date.now();
  if (diff <= 0) return l.started;
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${l.startsIn} ${h}${l.hours}${m > 0 ? String(m).padStart(2, '0') : ''}`;
  return `${l.startsIn} ${m}${l.minutes}`;
}

const TodayPlanningSection = ({ language, currentUserId, profileName, tasks, signups, getSignupStatus, zoneAssignments = {} }: Props) => {
  const navigate = useNavigate();
  const l = labels[language as keyof typeof labels] || labels.nl;

  const now = new Date();
  const todayStr = getDateString(now);
  const tomorrowStr = getDateString(new Date(now.getTime() + 86400000));

  const myTasks = tasks.filter(t => {
    const status = getSignupStatus(t.id);
    return status === 'assigned' || status === 'pending';
  });

  const todayTasks = myTasks.filter(t => t.task_date && getDateString(new Date(t.task_date)) === todayStr)
    .sort((a, b) => new Date(a.task_date!).getTime() - new Date(b.task_date!).getTime());
  const tomorrowTasks = myTasks.filter(t => t.task_date && getDateString(new Date(t.task_date)) === tomorrowStr)
    .sort((a, b) => new Date(a.task_date!).getTime() - new Date(b.task_date!).getTime());

  // Check-in warning: today tasks where checked_in_at is null
  const todaySignups = todayTasks.map(t => signups.find(s => s.task_id === t.id)).filter(Boolean) as TaskSignup[];
  const hasUncheckedToday = todaySignups.some(s => s.status === 'assigned' && !s.checked_in_at);

  const [sentOnMyWay, setSentOnMyWay] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});

  // Update countdowns every 30s
  useEffect(() => {
    const update = () => {
      const cd: Record<string, string> = {};
      [...todayTasks, ...tomorrowTasks].forEach(t => {
        if (t.task_date) cd[t.id] = formatCountdown(t.task_date, l);
      });
      setCountdowns(cd);
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [todayTasks.length, tomorrowTasks.length]);

  const handleOnMyWay = useCallback(async (task: VolunteerTask) => {
    setSendingId(task.id);
    await sendPushToClub({
      clubId: task.club_id,
      title: l.onMyWayPushTitle,
      message: `${profileName} is op weg naar ${task.title}`,
      url: `/task/${task.id}`,
      type: 'task',
    });
    setSentOnMyWay(prev => new Set(prev).add(task.id));
    setSendingId(null);
    toast.success(l.sent);
  }, [profileName, l]);

  if (todayTasks.length === 0 && tomorrowTasks.length === 0) return null;

  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  const renderTaskCard = (task: VolunteerTask, idx: number) => {
    const status = getSignupStatus(task.id);
    const isAssigned = status === 'assigned';
    const isSent = sentOnMyWay.has(task.id);
    const isSending = sendingId === task.id;
    const isToday = task.task_date && getDateString(new Date(task.task_date)) === todayStr;

    return (
      <motion.div
        key={task.id}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05 }}
        className="bg-card rounded-2xl p-4 shadow-sm border border-border hover:shadow-md transition-all"
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 rounded-xl">
            <AvatarFallback className="rounded-xl text-xs font-bold bg-secondary/10 text-secondary">
              {(task.clubs?.name || '?')[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate(`/task/${task.id}`)}
              className="text-sm font-semibold text-foreground truncate block text-left hover:text-primary transition-colors"
            >
              {task.title}
            </button>
            <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
              {task.clubs?.name && <span>{task.clubs.name}</span>}
              {task.task_date && (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {new Date(task.task_date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {(task.location || task.clubs?.location) && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {task.location || task.clubs?.location}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Countdown */}
              {countdowns[task.id] && (
                <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                  <Clock className="w-3 h-3" />
                  {countdowns[task.id]}
                </Badge>
              )}
              {isAssigned ? (
                <Badge className="bg-accent/15 text-accent-foreground text-[10px] gap-1">
                  <CheckCircle className="w-3 h-3" /> {l.assigned}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">{l.pending}</Badge>
              )}
            </div>
          </div>

          {/* On my way button — only for today's assigned tasks */}
          {isToday && isAssigned && (
            <div className="shrink-0">
              {isSent ? (
                <Badge className="bg-accent/15 text-accent-foreground text-[10px]">{l.sent}</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 text-xs gap-1.5 rounded-xl"
                  onClick={(e) => { e.stopPropagation(); handleOnMyWay(task); }}
                  disabled={isSending}
                >
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                  {l.onMyWay}
                </Button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Check-in warning */}
      {hasUncheckedToday && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{l.checkinWarning}</p>
        </motion.div>
      )}

      {/* Today */}
      {todayTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-heading font-semibold text-foreground">{l.today}</h2>
            <Badge variant="secondary" className="text-[10px]">{todayTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {todayTasks.map((t, i) => renderTaskCard(t, i))}
          </div>
        </div>
      )}

      {/* Tomorrow */}
      {tomorrowTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-heading font-semibold text-foreground">{l.tomorrow}</h2>
            <Badge variant="outline" className="text-[10px]">{tomorrowTasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {tomorrowTasks.map((t, i) => renderTaskCard(t, i))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayPlanningSection;
