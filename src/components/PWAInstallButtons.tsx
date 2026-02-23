import { useState, useEffect, useRef } from 'react';
import { X, Share, MoreVertical, Download, Smartphone, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios' | 'android' | null;

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return null;
}

function isStandalone(): boolean {
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

// ── Apple-style Store Button ──────────────────────────────────────
export const AppStoreBadge = ({
  variant = 'primary',
  onClick,
}: {
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}) => {
  const platform = detectPlatform();
  const standalone = isStandalone();

  // Don't show if already installed
  if (standalone) return null;

  const isApple = platform === 'ios';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative inline-flex items-center gap-3 rounded-[14px] px-5 py-3 transition-all duration-200',
        'border border-foreground/10 hover:scale-[1.02] active:scale-[0.98]',
        variant === 'primary'
          ? 'bg-foreground text-background hover:bg-foreground/90'
          : 'bg-card text-foreground hover:bg-muted shadow-card'
      )}
    >
      {isApple ? (
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" aria-hidden>
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" aria-hidden>
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.931l2.386 1.381c.88.51.88 1.174 0 1.684l-2.386 1.381-2.538-2.538 2.538-2.538v.63zm-3.907-2.638L4.864 1.472l10.936 6.333-2.008 2.333z" />
        </svg>
      )}
      <div className="text-left">
        <div className={cn(
          'text-[10px] font-medium leading-tight uppercase tracking-wide',
          variant === 'primary' ? 'text-background/70' : 'text-muted-foreground'
        )}>
          {isApple ? 'Beschikbaar op' : 'Download op'}
        </div>
        <div className="text-[15px] font-semibold leading-tight mt-0.5">
          {isApple ? 'iPhone & iPad' : 'Android'}
        </div>
      </div>
    </button>
  );
};

// ── Both Badges Side-by-Side (for desktop) ────────────────────────
export const AppStoreButtons = ({
  variant = 'primary',
  onClickIOS,
  onClickAndroid,
}: {
  variant?: 'primary' | 'secondary';
  onClickIOS: () => void;
  onClickAndroid: () => void;
}) => {
  const platform = detectPlatform();

  // On mobile, only show relevant button
  if (platform === 'ios') {
    return <AppStoreBadge variant={variant} onClick={onClickIOS} />;
  }
  if (platform === 'android') {
    return <AppStoreBadge variant={variant} onClick={onClickAndroid} />;
  }

  // Desktop: show both
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={onClickIOS}
        className={cn(
          'group relative inline-flex items-center gap-3 rounded-[14px] px-5 py-3 transition-all duration-200',
          'border border-foreground/10 hover:scale-[1.02] active:scale-[0.98]',
          variant === 'primary'
            ? 'bg-foreground text-background hover:bg-foreground/90'
            : 'bg-card text-foreground hover:bg-muted shadow-card'
        )}
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" aria-hidden>
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        <div className="text-left">
          <div className={cn('text-[10px] font-medium leading-tight uppercase tracking-wide', variant === 'primary' ? 'text-background/70' : 'text-muted-foreground')}>
            Beschikbaar op
          </div>
          <div className="text-[15px] font-semibold leading-tight mt-0.5">iPhone & iPad</div>
        </div>
      </button>
      <button
        onClick={onClickAndroid}
        className={cn(
          'group relative inline-flex items-center gap-3 rounded-[14px] px-5 py-3 transition-all duration-200',
          'border border-foreground/10 hover:scale-[1.02] active:scale-[0.98]',
          variant === 'primary'
            ? 'bg-foreground text-background hover:bg-foreground/90'
            : 'bg-card text-foreground hover:bg-muted shadow-card'
        )}
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" aria-hidden>
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.931l2.386 1.381c.88.51.88 1.174 0 1.684l-2.386 1.381-2.538-2.538 2.538-2.538v.63zm-3.907-2.638L4.864 1.472l10.936 6.333-2.008 2.333z" />
        </svg>
        <div className="text-left">
          <div className={cn('text-[10px] font-medium leading-tight uppercase tracking-wide', variant === 'primary' ? 'text-background/70' : 'text-muted-foreground')}>
            Download op
          </div>
          <div className="text-[15px] font-semibold leading-tight mt-0.5">Android</div>
        </div>
      </button>
    </div>
  );
};

// ── Install Instructions Dialog ───────────────────────────────────
export const InstallInstructionsDialog = ({
  open,
  onClose,
  platform,
}: {
  open: boolean;
  onClose: () => void;
  platform: 'ios' | 'android';
}) => {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') onClose();
      deferredPrompt.current = null;
    }
  };

  const iosSteps = [
    {
      number: 1,
      icon: <Smartphone className="w-5 h-5" />,
      title: 'Open in Safari',
      description: 'Zorg dat je deze pagina in Safari hebt geopend (niet in Chrome of een andere browser).',
    },
    {
      number: 2,
      icon: <Share className="w-5 h-5" />,
      title: 'Tik op "Deel"',
      description: 'Tik op het deel-icoon (vierkantje met pijl omhoog) onderaan het scherm.',
    },
    {
      number: 3,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      ),
      title: 'Kies "Zet op beginscherm"',
      description: 'Scroll naar beneden in het menu en tik op "Zet op beginscherm".',
    },
    {
      number: 4,
      icon: <ChevronRight className="w-5 h-5" />,
      title: 'Bevestig met "Voeg toe"',
      description: 'Tik rechtsboven op "Voeg toe". De app staat nu op je beginscherm!',
    },
  ];

  const androidSteps = [
    {
      number: 1,
      icon: <Smartphone className="w-5 h-5" />,
      title: 'Open in Chrome',
      description: 'Zorg dat je deze pagina in Google Chrome hebt geopend.',
    },
    {
      number: 2,
      icon: <MoreVertical className="w-5 h-5" />,
      title: 'Tik op het menu (⋮)',
      description: 'Tik op de drie puntjes rechtsboven in Chrome.',
    },
    {
      number: 3,
      icon: <Download className="w-5 h-5" />,
      title: '"App installeren" of "Toevoegen aan startscherm"',
      description: 'Tik op "App installeren" als die optie er staat, of anders op "Toevoegen aan startscherm".',
    },
    {
      number: 4,
      icon: <ChevronRight className="w-5 h-5" />,
      title: 'Bevestig de installatie',
      description: 'Tik op "Installeren" of "Toevoegen". De app verschijnt op je startscherm!',
    },
  ];

  const steps = platform === 'ios' ? iosSteps : androidSteps;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[200]"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed inset-x-4 top-[10vh] z-[201] max-w-lg mx-auto"
          >
            <div className="bg-card rounded-3xl shadow-elevated border border-border overflow-hidden">
              {/* Header */}
              <div className={cn(
                'px-6 pt-6 pb-5 relative',
                platform === 'ios'
                  ? 'bg-gradient-to-br from-foreground to-foreground/90'
                  : 'bg-gradient-to-br from-accent/90 to-accent'
              )}>
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/20 flex items-center justify-center text-background hover:bg-background/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-background/20 flex items-center justify-center">
                    {platform === 'ios' ? (
                      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-background" aria-hidden>
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-background" aria-hidden>
                        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.931l2.386 1.381c.88.51.88 1.174 0 1.684l-2.386 1.381-2.538-2.538 2.538-2.538v.63zm-3.907-2.638L4.864 1.472l10.936 6.333-2.008 2.333z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-bold text-background">
                      Installeer De 12e Man
                    </h2>
                    <p className="text-sm text-background/70">
                      {platform === 'ios' ? 'voor iPhone & iPad' : 'voor Android'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto">
                {platform === 'android' && deferredPrompt.current && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleNativeInstall}
                    className="w-full py-3.5 rounded-2xl bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-5 h-5" />
                    Direct installeren
                  </motion.button>
                )}

                {(platform === 'ios' || !deferredPrompt.current) && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Volg deze {steps.length} eenvoudige stappen:
                    </p>
                    {steps.map((step, i) => (
                      <motion.div
                        key={step.number}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex gap-4 items-start"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                          {step.icon}
                        </div>
                        <div className="pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">
                              {step.number}
                            </span>
                            <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors text-sm"
                >
                  Begrepen, sluit dit venster
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
