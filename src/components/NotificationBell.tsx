import { useEffect, useState } from 'react';
import { Bell, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { fr } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { useLanguage } from '@/i18n/LanguageContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const DATE_LOCALES = { nl, fr, en: enUS } as const;

const NotificationBell = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const navigate = useNavigate();

  const t3 = (nlStr: string, frStr: string, enStr: string) =>
    language === 'nl' ? nlStr : language === 'fr' ? frStr : enStr;

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const channel = supabase
      .channel('notifications-' + userId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
        title={t3('Notificaties', 'Notifications', 'Notifications')}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-card rounded-xl shadow-elevated border border-border z-50"
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {t3('Notificaties', 'Notifications', 'Notifications')}
                </span>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t3('Alles gelezen', 'Tout lu', 'Mark all read')}
                    </button>
                  )}
                  <button
                    onClick={() => { setOpen(false); navigate('/notifications'); }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    {t3('Alle bekijken', 'Voir tout', 'View all')}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {t3('Geen notificaties', 'Aucune notification', 'No notifications')}
                </div>
              ) : (
                <div>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3 border-b border-border last:border-0 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                    >
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: DATE_LOCALES[language] || nl,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
