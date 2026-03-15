import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  LayoutDashboard, Calendar, ClipboardList, MessageCircle,
  FileSignature, ChevronRight, ChevronLeft, X, Rocket,
  MousePointerClick,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  userId: string;
}

interface TourStep {
  target?: string;
  title: string;
  description: string;
  tip: string;
  icon: any;
  color: string;
  tabToOpen?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const VolunteerOnboardingTour = ({ open, onClose, onNavigateTab, userId }: Props) => {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const { language } = useLanguage();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const t = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  const steps: TourStep[] = [
    {
      icon: Rocket,
      color: 'bg-primary/10 text-primary',
      title: t('👋 Welkom bij je dashboard!', '👋 Bienvenue sur votre tableau de bord !', '👋 Welcome to your dashboard!'),
      description: t(
        'Dit is jouw vrijwilligersdashboard. Hier vind je al je taken, beschikbaarheid, berichten en contracten op één plek.',
        'Ceci est votre tableau de bord bénévole. Vous y trouverez vos tâches, disponibilités, messages et contrats.',
        'This is your volunteer dashboard. Here you\'ll find all your tasks, availability, messages and contracts in one place.'
      ),
      tip: t(
        '💡 We nemen je in 5 stappen mee door de belangrijkste functies.',
        '💡 Nous vous guidons en 5 étapes à travers les fonctions principales.',
        '💡 We\'ll guide you through the key features in 5 steps.'
      ),
    },
    {
      target: 'vol-sidebar-availability',
      tabToOpen: 'availability',
      icon: Calendar,
      color: 'bg-blue-500/10 text-blue-600',
      title: t('📅 Beschikbaarheid instellen', '📅 Définir votre disponibilité', '📅 Set your availability'),
      description: t(
        'Hier stel je in wanneer je beschikbaar bent voor taken. Je club kan je dan sneller inplannen op de juiste momenten.',
        'Ici vous indiquez quand vous êtes disponible. Votre club pourra vous planifier plus facilement.',
        'Here you set when you\'re available for tasks. Your club can then schedule you at the right moments.'
      ),
      tip: t(
        '💡 Hoe meer je invult, hoe beter je ingepland wordt!',
        '💡 Plus vous remplissez, mieux vous serez planifié !',
        '💡 The more you fill in, the better you\'ll be scheduled!'
      ),
    },
    {
      target: 'vol-sidebar-tasks',
      tabToOpen: 'mine',
      icon: ClipboardList,
      color: 'bg-green-500/10 text-green-600',
      title: t('📋 Jouw taken', '📋 Vos tâches', '📋 Your tasks'),
      description: t(
        'Hier zie je jouw toegewezen taken met datum, locatie en vergoeding. Je kunt je ook inschrijven voor beschikbare taken.',
        'Ici vous voyez vos tâches assignées avec date, lieu et compensation. Vous pouvez aussi vous inscrire aux tâches disponibles.',
        'Here you see your assigned tasks with date, location and compensation. You can also sign up for available tasks.'
      ),
      tip: t(
        '💡 Taken worden automatisch gesynchroniseerd met je agenda via de iCal-feed.',
        '💡 Les tâches sont automatiquement synchronisées avec votre agenda via le flux iCal.',
        '💡 Tasks are automatically synced to your calendar via the iCal feed.'
      ),
    },
    {
      target: 'vol-sidebar-messages',
      icon: MessageCircle,
      color: 'bg-purple-500/10 text-purple-600',
      title: t('💬 Chat met je club', '💬 Discutez avec votre club', '💬 Chat with your club'),
      description: t(
        'Hier communiceer je direct met je club over taken, vragen of wijzigingen. Berichten blijven gekoppeld aan je taak.',
        'Ici vous communiquez directement avec votre club sur les tâches, questions ou modifications.',
        'Here you communicate directly with your club about tasks, questions or changes.'
      ),
      tip: t(
        '💡 Je ontvangt een notificatie als er een nieuw bericht is.',
        '💡 Vous recevez une notification en cas de nouveau message.',
        '💡 You\'ll receive a notification when there\'s a new message.'
      ),
    },
    {
      target: 'vol-sidebar-contracts',
      tabToOpen: 'contracts',
      icon: FileSignature,
      color: 'bg-amber-500/10 text-amber-600',
      title: t('📄 Profiel & contracten', '📄 Profil & contrats', '📄 Profile & contracts'),
      description: t(
        'Hier vind je jouw seizoenscontract, vergoedingen en betalingsoverzicht. Je kunt je contract direct ondertekenen en downloaden als PDF.',
        'Ici vous trouvez votre contrat saisonnier, compensations et aperçu des paiements. Vous pouvez signer et télécharger votre contrat.',
        'Here you\'ll find your season contract, compensations and payment overview. You can sign and download your contract as PDF.'
      ),
      tip: t(
        '💡 Vergeet niet je contract te ondertekenen vóór je eerste taak!',
        '💡 N\'oubliez pas de signer votre contrat avant votre première tâche !',
        '💡 Don\'t forget to sign your contract before your first task!'
      ),
    },
  ];

  const findTarget = useCallback(() => {
    const current = steps[step];
    if (!current?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        setTargetRect(el.getBoundingClientRect());
      }, 300);
    } else {
      setTargetRect(null);
    }
  }, [step, steps]);

  useEffect(() => {
    if (!open) return;
    const current = steps[step];

    if (current.tabToOpen && onNavigateTab) {
      onNavigateTab(current.tabToOpen);
    }

    const timer = setTimeout(() => findTarget(), current.tabToOpen ? 400 : 200);
    return () => clearTimeout(timer);
  }, [step, open]);

  // Track target position changes
  useEffect(() => {
    if (!open) return;
    const current = steps[step];
    if (!current?.target) return;

    const interval = setInterval(() => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(prev => {
          if (!prev || Math.abs(prev.top - rect.top) > 2 || Math.abs(prev.left - rect.left) > 2) return rect;
          return prev;
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [step, open]);

  const handleClose = async () => {
    // Mark tour as seen
    await supabase.from('profiles').update({ first_tour_seen: true } as any).eq('id', userId);
    onClose();
  };

  const handleFinish = async () => {
    await supabase.from('profiles').update({ first_tour_seen: true } as any).eq('id', userId);
    if (onNavigateTab) onNavigateTab('dashboard');
    onClose();
  };

  if (!open) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const hasTarget = !!targetRect;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const padding = 16;
    const tooltipW = 400;
    const viewH = window.innerHeight;
    const viewW = window.innerWidth;
    const spaceBelow = viewH - targetRect.bottom;
    const spaceRight = viewW - targetRect.right;

    let top = 0;
    let left = 0;

    if (spaceRight > tooltipW + padding) {
      top = Math.max(padding, targetRect.top - 20);
      left = targetRect.right + padding;
    } else if (spaceBelow > 280) {
      top = targetRect.bottom + padding;
      left = Math.max(padding, Math.min(targetRect.left, viewW - tooltipW - padding));
    } else {
      top = targetRect.top - padding - 280;
      left = Math.max(padding, Math.min(targetRect.left, viewW - tooltipW - padding));
    }

    return {
      top: `${Math.max(padding, top)}px`,
      left: `${Math.max(padding, left)}px`,
    };
  };

  const renderOverlay = () => {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    if (!targetRect) {
      return <div className="fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300" />;
    }

    const pad = 8;
    const r = 12;
    const x = targetRect.left - pad;
    const y = targetRect.top - pad;
    const w = targetRect.width + pad * 2;
    const h = targetRect.height + pad * 2;

    return (
      <svg className="fixed inset-0 z-[60] w-full h-full pointer-events-none" style={{ width: viewW, height: viewH }}>
        <defs>
          <mask id="vol-tour-mask">
            <rect x="0" y="0" width={viewW} height={viewH} fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
          </mask>
        </defs>
        <rect x="0" y="0" width={viewW} height={viewH} fill="rgba(0,0,0,0.6)" mask="url(#vol-tour-mask)" />
        <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" className="animate-pulse" />
      </svg>
    );
  };

  return (
    <>
      {renderOverlay()}

      <div
        className="fixed inset-0 z-[61]"
        onClick={(e) => {
          if (tooltipRef.current?.contains(e.target as Node)) return;
          e.stopPropagation();
        }}
      />

      <div
        ref={tooltipRef}
        className="fixed z-[62] w-[400px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl transition-all duration-300"
        style={getTooltipStyle()}
      >
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {step + 1} / {steps.length}
          </span>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${current.color}`}>
            <Icon className="w-5 h-5" />
          </div>

          <h3 className="text-base font-heading font-bold text-foreground mb-1.5">
            {current.title}
          </h3>

          <p className="text-[13px] text-muted-foreground leading-relaxed mb-2 whitespace-pre-line">
            {current.description}
          </p>

          {hasTarget && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-2">
              <MousePointerClick className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-primary font-medium">
                {t('👆 Dit element is gemarkeerd op de pagina', '👆 Cet élément est mis en évidence', '👆 This element is highlighted on the page')}
              </span>
            </div>
          )}

          <div className="bg-muted/50 rounded-xl px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            {current.tip}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4 pt-1">
          <button
            onClick={() => { setStep(s => s - 1); setTargetRect(null); }}
            disabled={isFirst}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {t('Vorige', 'Précédent', 'Back')}
          </button>

          {isLast ? (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Rocket className="w-4 h-4" /> {t('Aan de slag!', 'C\'est parti !', "Let's go!")}
            </button>
          ) : (
            <button
              onClick={() => { setStep(s => s + 1); setTargetRect(null); }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {t('Volgende', 'Suivant', 'Next')} <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default VolunteerOnboardingTour;
