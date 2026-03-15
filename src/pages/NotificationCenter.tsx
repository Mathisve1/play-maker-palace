import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ArrowLeft, MessageCircle, FileSignature, ClipboardList, CreditCard, Ticket, Shield, Award, Info, AlertTriangle, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { nl, fr, enUS } from 'date-fns/locale';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const DATE_LOCALES = { nl, fr, en: enUS } as const;

const TYPE_CONFIG: Record<string, { icon: typeof Bell; label: Record<string, string>; colorClass: string }> = {
  message: { icon: MessageCircle, label: { nl: 'Bericht', fr: 'Message', en: 'Message' }, colorClass: 'text-primary' },
  contract: { icon: FileSignature, label: { nl: 'Contract', fr: 'Contrat', en: 'Contract' }, colorClass: 'text-primary' },
  task: { icon: ClipboardList, label: { nl: 'Taak', fr: 'Tâche', en: 'Task' }, colorClass: 'text-accent-foreground' },
  payment: { icon: CreditCard, label: { nl: 'Betaling', fr: 'Paiement', en: 'Payment' }, colorClass: 'text-primary' },
  ticket: { icon: Ticket, label: { nl: 'Ticket', fr: 'Ticket', en: 'Ticket' }, colorClass: 'text-primary' },
  safety: { icon: Shield, label: { nl: 'Veiligheid', fr: 'Sécurité', en: 'Safety' }, colorClass: 'text-destructive' },
  loyalty: { icon: Award, label: { nl: 'Loyaliteit', fr: 'Fidélité', en: 'Loyalty' }, colorClass: 'text-primary' },
  urgent: { icon: AlertTriangle, label: { nl: 'Urgent', fr: 'Urgent', en: 'Urgent' }, colorClass: 'text-destructive' },
  default: { icon: Info, label: { nl: 'Algemeen', fr: 'Général', en: 'General' }, colorClass: 'text-muted-foreground' },
};

const getTypeConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.default;

const getNotificationLink = (n: Notification): string | null => {
  const meta = n.metadata as Record<string, any> | null;
  if (!meta) return null;
  if (meta.task_id) return `/task/${meta.task_id}`;
  if (meta.volunteer_id && meta.action === 'signup') return `/volunteer/${meta.volunteer_id}`;
  if (meta.action === 'sign_contract') return '/dashboard';
  return null;
};

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const { language } = useLanguage();
  const navigate = useNavigate();

  const t3 = (nlStr: string, frStr: string, enStr: string) =>
    language === 'nl' ? nlStr : language === 'fr' ? frStr : enStr;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) setNotifications(data as Notification[]);
      setLoading(false);

      const channel = supabase
        .channel('notif-center-' + user.id)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    init();
  }, [navigate]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const uniqueTypes = useMemo(() => {
    const types = new Set(notifications.map(n => n.type));
    return Array.from(types);
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  // Group by day
  const grouped = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = [];
    const todayLabel = t3('Vandaag', "Aujourd'hui", 'Today');
    const yesterdayLabel = t3('Gisteren', 'Hier', 'Yesterday');
    const earlierLabel = t3('Eerder', 'Plus tôt', 'Earlier');

    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];

    for (const n of filtered) {
      const d = new Date(n.created_at);
      if (isToday(d)) today.push(n);
      else if (isYesterday(d)) yesterday.push(n);
      else earlier.push(n);
    }

    if (today.length) groups.push({ label: todayLabel, items: today });
    if (yesterday.length) groups.push({ label: yesterdayLabel, items: yesterday });
    if (earlier.length) groups.push({ label: earlierLabel, items: earlier });

    return groups;
  }, [filtered, language]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    const link = getNotificationLink(n);
    if (link) navigate(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Bell className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              {t3('Notificatiecentrum', 'Centre de notifications', 'Notification Center')}
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} {t3('ongelezen', 'non lu(s)', 'unread')}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
              <CheckCheck className="w-4 h-4" />
              {t3('Alles gelezen', 'Tout marquer lu', 'Mark all read')}
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-4">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs">
              {t3('Alle', 'Tous', 'All')}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              {t3('Ongelezen', 'Non lus', 'Unread')}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            {uniqueTypes.map(type => {
              const cfg = getTypeConfig(type);
              return (
                <TabsTrigger key={type} value={type} className="text-xs gap-1">
                  <cfg.icon className={`w-3 h-3 ${cfg.colorClass}`} />
                  {cfg.label[language] || cfg.label.en}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Notification list grouped by day */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/60 flex items-center justify-center">
              <BellOff className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">
              {filter === 'unread'
                ? t3('Helemaal bij!', 'Tout est lu !', 'All caught up!')
                : t3('Geen notificaties', 'Aucune notification', 'No notifications')}
            </p>
            <p className="text-sm text-muted-foreground">
              {filter === 'unread'
                ? t3('Je hebt geen ongelezen notificaties.', "Aucune notification non lue.", 'You have no unread notifications.')
                : t3('Notificaties verschijnen hier wanneer er iets nieuws gebeurt.', 'Les notifications apparaîtront ici.', 'Notifications will appear here when something happens.')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{group.label}</p>
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {group.items.map((n, i) => {
                      const cfg = getTypeConfig(n.type);
                      const Icon = cfg.icon;
                      const isUrgent = n.type === 'urgent';
                      const link = getNotificationLink(n);

                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: i * 0.02 }}
                          className={`group flex items-start gap-3 p-3 rounded-lg border transition-colors
                            ${link ? 'cursor-pointer' : ''}
                            ${isUrgent && !n.read ? 'bg-destructive/5 border-destructive/20' : !n.read ? 'bg-primary/5 border-primary/20' : 'bg-card border-border hover:bg-muted/50'}`}
                          onClick={() => handleClick(n)}
                        >
                          <div className={`mt-0.5 p-1.5 rounded-full ${isUrgent ? 'bg-destructive/10' : 'bg-muted'}`}>
                            <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm text-foreground truncate ${!n.read ? 'font-semibold' : 'font-medium'}`}>
                                {n.title}
                              </p>
                              {!n.read && (
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isUrgent ? 'bg-destructive animate-pulse' : 'bg-primary'}`} />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                                <Icon className={`w-2.5 h-2.5 ${cfg.colorClass}`} />
                                {cfg.label[language] || cfg.label.en}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground/60">
                                {formatDistanceToNow(new Date(n.created_at), {
                                  addSuffix: true,
                                  locale: DATE_LOCALES[language] || nl,
                                })}
                              </span>
                            </div>
                          </div>
                          {!n.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                              title={t3('Markeer als gelezen', 'Marquer comme lu', 'Mark as read')}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
