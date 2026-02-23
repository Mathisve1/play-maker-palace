import { useState, useEffect, useRef } from 'react';
import { X, Share, PlusSquare, MoreVertical, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallOverlay = () => {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('pwa-install-dismissed');

    if (isStandalone || dismissed) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);

    // Listen for the native Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      // Show our custom overlay instead
      setPlatform('android');
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isIOS) {
      const timer = setTimeout(() => {
        setPlatform('ios');
        setShow(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    // For Android, if no beforeinstallprompt fires within 5s, show manual instructions
    if (isAndroid) {
      const timer = setTimeout(() => {
        if (!deferredPrompt.current) {
          setPlatform('android');
          setShow(true);
        }
      }, 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleAndroidInstall = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') {
        dismiss();
      }
      deferredPrompt.current = null;
    }
  };

  return (
    <AnimatePresence>
      {show && platform && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 pb-safe-bottom"
        >
          <div className="bg-card rounded-2xl shadow-elevated border border-border p-5 mx-auto max-w-md relative">
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-heading font-bold text-foreground pr-8">
              Installeer de app
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Voeg deze app toe aan je beginscherm voor de beste ervaring.
            </p>

            {platform === 'ios' ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">
                    Tik op het <strong>Deel</strong>-icoon onderaan je scherm
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <PlusSquare className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">
                    Kies <strong>&quot;Zet op beginscherm&quot;</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {deferredPrompt.current ? (
                  <button
                    onClick={handleAndroidInstall}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    App installeren
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MoreVertical className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm text-foreground">
                        Tik op het <strong>menu</strong> (⋮) rechtsboven in Chrome
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <PlusSquare className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm text-foreground">
                        Kies <strong>&quot;Toevoegen aan startscherm&quot;</strong>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Arrow pointing down */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-r border-b border-border rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallOverlay;
