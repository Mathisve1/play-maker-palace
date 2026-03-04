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
    // Check if user already dismissed
    const wasDismissed = localStorage.getItem('push_banner_dismissed');
    if (wasDismissed) return;

    // If Notification API exists, check permission state
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        // Already decided — don't show
        return;
      }
    }

    // Show banner: either permission is 'default' or Notification API is missing
    // (on Android PWA / some browsers, we still want to offer the prompt)
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setVisible(false);
    localStorage.setItem('push_banner_dismissed', '1');
    await promptPushPermission();
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('push_banner_dismissed', '1');
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
