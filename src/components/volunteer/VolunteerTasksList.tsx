import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Calendar, Search, CheckCircle, Clock, CircleDot,
  CreditCard, MapPinned, ClipboardList, Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { VolunteerTask, TaskSignup, SignatureContract } from '@/types/volunteer';
import { Language } from '@/i18n/translations';

type FilterMode = 'upcoming' | 'completed' | 'all';

interface Props {
  language: Language;
  currentUserId: string;
  tasks: VolunteerTask[];
  signups: TaskSignup[];
  myContracts: SignatureContract[];
  getSignupStatus: (taskId: string) => string | null;
}

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

const VolunteerTasksList = ({
  language, currentUserId, tasks, signups, myContracts, getSignupStatus,
}: Props) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterMode>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneMap, setZoneMap] = useState<Record<string, string>>({});

  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  // My signed-up task IDs
  const myTaskIds = useMemo(() => signups.map(s => s.task_id), [signups]);

  // Load zone assignments for my tasks
  useEffect(() => {
    if (!currentUserId || myTaskIds.length === 0) return;
    const load = async () => {
      const { data } = await supabase
        .from('task_zone_assignments')
        .select('zone_id, task_zones!inner(task_id, name)')
        .eq('volunteer_id', currentUserId);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((row: any) => {
          const taskId = row.task_zones?.task_id;
          const zoneName = row.task_zones?.name;
          if (taskId && zoneName) map[taskId] = zoneName;
        });
        setZoneMap(map);
      }
    };
    load();
  }, [currentUserId, myTaskIds.length]);

  // Filtered tasks — only tasks the user has signed up for
  const myTasks = useMemo(() => {
    const signupMap = new Map(signups.map(s => [s.task_id, s]));
    return tasks
      .filter(t => signupMap.has(t.id))
      .map(t => ({ ...t, signupStatus: signupMap.get(t.id)!.status }));
  }, [tasks, signups]);

  const now = new Date();

  const filteredTasks = useMemo(() => {
    let list = myTasks;

    // Apply filter mode
    if (filter === 'upcoming') {
      list = list.filter(t => {
        const isPast = t.task_date ? new Date(t.task_date) < now : false;
        const isCompleted = t.signupStatus === 'completed';
        return !isPast && !isCompleted;
      });
    } else if (filter === 'completed') {
      list = list.filter(t => {
        const isPast = t.task_date ? new Date(t.task_date) < now : false;
        const isCompleted = t.signupStatus === 'completed';
        return isPast || isCompleted;
      });
    }

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.clubs?.name.toLowerCase().includes(q) ||
        t.location?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }

    // Sort: upcoming first by date ascending, completed by date descending
    list.sort((a, b) => {
      if (!a.task_date && !b.task_date) return 0;
      if (!a.task_date) return 1;
      if (!b.task_date) return -1;
      if (filter === 'completed') return new Date(b.task_date).getTime() - new Date(a.task_date).getTime();
      return new Date(a.task_date).getTime() - new Date(b.task_date).getTime();
    });

    return list;
  }, [myTasks, filter, searchQuery]);

  const filterPills: { key: FilterMode; label: string }[] = [
    { key: 'upcoming', label: t3(language, 'Aankomend', 'À venir', 'Upcoming') },
    { key: 'completed', label: t3(language, 'Afgerond', 'Terminé', 'Completed') },
    { key: 'all', label: t3(language, 'Alles', 'Tout', 'All') },
  ];

  const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
    pending: {
      label: t3(language, 'In afwachting', 'En attente', 'Pending'),
      icon: Clock,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    assigned: {
      label: t3(language, 'Toegekend', 'Attribué', 'Assigned'),
      icon: CheckCircle,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    completed: {
      label: t3(language, 'Voltooid', 'Terminé', 'Completed'),
      icon: CircleDot,
      className: 'bg-muted text-muted-foreground',
    },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <h1 className="text-2xl font-heading font-bold text-foreground">
        {t3(language, 'Mijn Taken', 'Mes tâches', 'My Tasks')}
      </h1>

      {/* Filter pills — horizontally scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {filterPills.map(pill => (
          <button
            key={pill.key}
            onClick={() => setFilter(pill.key)}
            className={`shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
              filter === pill.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t3(language, 'Zoek in mijn taken...', 'Rechercher dans mes tâches...', 'Search my tasks...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring border border-border"
        />
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <ClipboardList className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-muted-foreground font-medium mb-1">
            {filter === 'upcoming'
              ? t3(language, 'Geen aankomende taken gevonden', 'Aucune tâche à venir', 'No upcoming tasks found')
              : filter === 'completed'
              ? t3(language, 'Geen afgeronde taken gevonden', 'Aucune tâche terminée', 'No completed tasks found')
              : t3(language, 'Geen taken gevonden', 'Aucune tâche trouvée', 'No tasks found')}
          </p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            {t3(language, 'Ontdek beschikbare taken bij clubs', 'Découvrez les tâches disponibles', 'Discover available tasks at clubs')}
          </p>
          <button
            onClick={() => navigate('/community')}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            {t3(language, 'Zoek taken', 'Chercher des tâches', 'Find tasks')}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task, i) => {
            const status = task.signupStatus || 'pending';
            const cfg = statusConfig[status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const zoneName = zoneMap[task.id];
            const hasExpense = task.expense_reimbursement && task.expense_amount;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/task/${task.id}`)}
                className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
              >
                {/* Club row */}
                <div className="flex items-center gap-2 mb-2">
                  {task.clubs?.logo_url ? (
                    <img
                      src={task.clubs.logo_url}
                      alt={task.clubs.name}
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-muted-foreground">
                        {(task.clubs?.name || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground truncate">{task.clubs?.name}</span>
                </div>

                {/* Title */}
                <h3 className="font-heading font-semibold text-foreground text-base line-clamp-1">
                  {task.title}
                </h3>

                {/* Meta row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-xs text-muted-foreground">
                  {task.task_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(task.task_date).toLocaleDateString(locale, {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                      {task.start_time && (
                        <span className="text-foreground/70">
                          {' '}· {task.start_time.slice(0, 5)}
                          {task.end_time ? `–${task.end_time.slice(0, 5)}` : ''}
                        </span>
                      )}
                    </span>
                  )}
                  {(task.location || task.clubs?.location) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {task.location || task.clubs?.location}
                    </span>
                  )}
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${cfg.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </span>

                  {/* Zone badge */}
                  {zoneName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                      <MapPinned className="w-3 h-3" />
                      {zoneName}
                    </span>
                  )}

                  {/* Expense badge */}
                  {hasExpense && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <CreditCard className="w-3 h-3" />
                      €{task.expense_amount}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VolunteerTasksList;
