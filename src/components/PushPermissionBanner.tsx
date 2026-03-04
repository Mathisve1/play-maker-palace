import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { promptPushPermission } from '@/lib/onesignal';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A dismissible banner that appears after login asking users to enable push notifications.
 * Uses a button tap (user gesture) which is required by iOS Safari.
 */
const PushPermissionBanner = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { language } = useLanguage();

  const labels = {
    nl: {
      title: 'Blijf op de hoogte!',
      description: 'Schakel meldingen in zodat je geen taken, briefings of updates mist.',
      enable: 'Meldingen inschakelen',
    },
    fr: {
      title: 'Restez informé !',
      description: 'Activez les notifications pour ne manquer aucune tâche, briefing ou mise à jour.',
      enable: 'Activer les notifications',
    },
    en: {
      title: 'Stay in the loop!',
      description: 'Enable notifications so you never miss a task, briefing, or update.',
      enable: 'Enable notifications',
    },
  };

  const l = labels[language] || labels.nl;

  useEffect(() => {
    // v2: Clean up ALL old dismiss keys so every user gets prompted fresh
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === 'push_banner_dismissed' || key.startsWith('push_banner_dismissed_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    const checkAndShow = async () => {
      const { data: { user } } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
      const uid = user?.id || 'anon';
      const key = `push_banner_v2_${uid}`;

      const wasDismissed = localStorage.getItem(key);
      if (wasDismissed) return;

      // If Notification API exists, check permission state
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted' || Notification.permission === 'denied') {
          return;
        }
      }

      // Show banner after short delay
      setTimeout(() => setVisible(true), 3000);
    };
    checkAndShow();
  }, []);

  const dismissForUser = async () => {
    const { data: { user } } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
    const uid = user?.id || 'anon';
    localStorage.setItem(`push_banner_dismissed_${uid}`, '1');
  };

  const handleEnable = async () => {
    setVisible(false);
    await dismissForUser();
    await promptPushPermission();
  };

  const handleDismiss = async () => {
    setVisible(false);
    setDismissed(true);
    await dismissForUser();
  };

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl shadow-elevated p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{l.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>
              <button
                onClick={handleEnable}
                className="mt-2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                {l.enable}
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PushPermissionBanner;
