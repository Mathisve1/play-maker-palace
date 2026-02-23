import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const IOSInstallOverlay = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if iOS Safari and NOT standalone
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('pwa-install-dismissed');

    if (isIOS && !isStandalone && !dismissed) {
      // Delay to not overwhelm user on first load
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  return (
    <AnimatePresence>
      {show && (
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
                  Kies <strong>"Zet op beginscherm"</strong>
                </p>
              </div>
            </div>

            {/* Arrow pointing down */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-r border-b border-border rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IOSInstallOverlay;
