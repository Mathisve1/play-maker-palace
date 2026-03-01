import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  CalendarDays, Users, Layers, LayoutGrid, ChevronRight,
  ChevronLeft, X, Rocket, Plus, GripVertical, CheckCircle2,
  FolderTree, Move, MousePointerClick,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface TourStep {
  target?: string; // data-tour attribute value
  action?: string; // custom event action to dispatch
  waitMs?: number; // ms to wait after action before highlighting
  title: string;
  description: string;
  tip: string;
  icon: any;
  color: string;
  navigateTo?: string; // navigate before highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

const PlanningOnboardingTour = ({ open, onClose }: Props) => {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const nl = language === 'nl';
  const tooltipRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const steps: TourStep[] = [
    {
      icon: Rocket,
      color: 'bg-primary/10 text-primary',
      title: nl ? '👋 Welkom bij de Planning Tour!' : '👋 Welcome to the Planning Tour!',
      description: nl
        ? 'We nemen je stap voor stap mee door het hele proces. De tour wijst je precies aan waar je wat moet doen en opent automatisch de juiste formulieren.'
        : 'We\'ll guide you step by step through the entire process. The tour shows you exactly where to do what and automatically opens the right forms.',
      tip: nl ? '💡 Klik op "Volgende" om te beginnen. De tour brengt je naar de juiste pagina\'s.' : '💡 Click "Next" to begin. The tour takes you to the right pages.',
    },
    {
      target: 'btn-new-event',
      navigateTo: '/events-manager',
      icon: CalendarDays,
      color: 'bg-primary/10 text-primary',
      title: nl ? '1. Nieuw evenement aanmaken' : '1. Create a new event',
      description: nl
        ? 'Dit is de knop om een nieuw evenement aan te maken. Klik hierop om te beginnen met het opzetten van je wedstrijd of activiteit.'
        : 'This is the button to create a new event. Click here to start setting up your match or activity.',
      tip: nl ? '📍 Dit is je startpunt. Een evenement groepeert alle taken van één dag.' : '📍 This is your starting point. An event groups all tasks for one day.',
    },
    {
      target: 'form-new-event',
      action: 'open-create-event',
      waitMs: 400,
      icon: Plus,
      color: 'bg-blue-500/10 text-blue-600',
      title: nl ? '2. Vul het formulier in' : '2. Fill in the form',
      description: nl
        ? 'Vul hier de titel in (bv. "Voetbalwedstrijd"), kies een datum en locatie. Dit is de container voor al je groepen en taken.'
        : 'Enter the title here (e.g. "Football Match"), choose a date and location. This is the container for all your groups and tasks.',
      tip: nl ? '💡 De locatie wordt automatisch overgenomen naar nieuwe taken binnen dit evenement.' : '💡 The location is automatically applied to new tasks within this event.',
      position: 'bottom',
    },
    {
      target: 'event-card-first',
      action: 'close-forms',
      waitMs: 300,
      icon: CalendarDays,
      color: 'bg-amber-500/10 text-amber-600',
      title: nl ? '3. Klap een evenement open' : '3. Expand an event',
      description: nl
        ? 'Klik op een evenement om het uit te klappen. Je ziet dan de groepen, taken en acties die je kunt uitvoeren.'
        : 'Click an event to expand it. You\'ll see the groups, tasks, and actions you can perform.',
      tip: nl ? '💡 In de demo staan al groepen en taken klaar als voorbeeld.' : '💡 The demo already has groups and tasks ready as an example.',
    },
    {
      target: 'btn-add-group',
      action: 'expand-first-event',
      waitMs: 400,
      icon: LayoutGrid,
      color: 'bg-amber-500/10 text-amber-600',
      title: nl ? '4. Groep toevoegen' : '4. Add a group',
      description: nl
        ? 'Klik op "Groep toevoegen" om een nieuwe groep aan te maken (bv. Stewards, Parking, Catering). Elke groep krijgt een kleur.'
        : 'Click "Add group" to create a new group (e.g. Stewards, Parking, Catering). Each group gets a color.',
      tip: nl ? '💡 Groepen helpen je vrijwilligers te organiseren per functie. Ze verschijnen ook op de scan-interface.' : '💡 Groups help organize volunteers by function. They also appear on the scan interface.',
    },
    {
      target: 'form-add-group',
      action: 'open-add-group',
      waitMs: 400,
      icon: LayoutGrid,
      color: 'bg-pink-500/10 text-pink-600',
      title: nl ? '5. Groep-instellingen' : '5. Group settings',
      description: nl
        ? 'Hier vul je de groepsnaam in, plus optioneel: polsbandkleur, type accessoire (hesje, badge...) en materiaalnotities.'
        : 'Here you fill in the group name, plus optionally: wristband color, accessory type (vest, badge...) and material notes.',
      tip: nl ? '⚙️ Deze info wordt getoond bij het scannen, zodat de steward weet welk polsbandje te geven.' : '⚙️ This info is shown when scanning, so the steward knows which wristband to give.',
      position: 'bottom',
    },
    {
      target: 'btn-add-task-group',
      action: 'close-add-group',
      waitMs: 300,
      icon: Plus,
      color: 'bg-green-500/10 text-green-600',
      title: nl ? '6. Taak toevoegen aan groep' : '6. Add a task to a group',
      description: nl
        ? 'Klik op het "+" icoon naast een groepsnaam om een taak toe te voegen. Bv. "Stewards Poort A" met 5 plaatsen.'
        : 'Click the "+" icon next to a group name to add a task. E.g. "Stewards Gate A" with 5 spots.',
      tip: nl ? '💡 Je kunt per taak instellen: datum, locatie, aantal plaatsen, en vergoeding.' : '💡 Per task you can set: date, location, spots, and compensation.',
    },
    {
      target: 'form-add-task-group',
      action: 'open-add-task-group',
      waitMs: 400,
      icon: Plus,
      color: 'bg-green-500/10 text-green-600',
      title: nl ? '7. Taak-formulier invullen' : '7. Fill in the task form',
      description: nl
        ? 'Vul de titel, datum, locatie en het aantal beschikbare plaatsen in. Vrijwilligers kunnen zich hiervoor inschrijven vanuit hun dashboard.'
        : 'Enter the title, date, location and available spots. Volunteers can sign up for this from their dashboard.',
      tip: nl ? '💡 De locatie wordt automatisch overgenomen van het evenement.' : '💡 The location is automatically taken from the event.',
      position: 'bottom',
    },
    {
      target: 'btn-zones-first',
      action: 'close-add-task-group',
      waitMs: 300,
      icon: FolderTree,
      color: 'bg-purple-500/10 text-purple-600',
      title: nl ? '8. Zones configureren' : '8. Configure zones',
      description: nl
        ? 'Klik op het zone-icoon (▦) naast een taak om de boomstructuur te openen. Hier maak je zones aan:\n\n📂 Poort A\n  ├── Post A1 Links\n  └── Post A2 Rechts'
        : 'Click the zone icon (▦) next to a task to open the tree structure. Here you create zones:\n\n📂 Gate A\n  ├── Post A1 Left\n  └── Post A2 Right',
      tip: nl ? '⚡ Zones kunnen onbeperkt genest worden: Zone > Sectie > Post.' : '⚡ Zones can be nested unlimited: Zone > Section > Post.',
    },
    {
      target: 'planning-task-first',
      navigateTo: '/planning',
      action: 'close-forms',
      waitMs: 500,
      icon: GripVertical,
      color: 'bg-indigo-500/10 text-indigo-600',
      title: nl ? '9. Ga naar Planning' : '9. Go to Planning',
      description: nl
        ? 'Op de Planning-pagina zie je alle taken MET zones. Klik op een taak om het Kanban-bord te openen en vrijwilligers toe te wijzen.'
        : 'On the Planning page you see all tasks WITH zones. Click a task to open the Kanban board and assign volunteers.',
      tip: nl ? '📍 Taken zonder zones zijn grijs. Ga terug naar Events Manager om zones toe te voegen.' : '📍 Tasks without zones are greyed out. Go back to Events Manager to add zones.',
    },
    {
      icon: Move,
      color: 'bg-indigo-500/10 text-indigo-600',
      title: nl ? '10. Drag & drop toewijzen' : '10. Drag & drop assignment',
      description: nl
        ? 'Op het Kanban-bord zie je:\n\n⬅️ Links: aangemelde vrijwilligers\n➡️ Rechts: jouw zones en posten\n\nSleep een vrijwilliger naar de juiste zone. Het systeem toont hoeveel plaatsen nog vrij zijn.'
        : 'On the Kanban board you see:\n\n⬅️ Left: signed-up volunteers\n➡️ Right: your zones and posts\n\nDrag a volunteer to the correct zone. The system shows available spots.',
      tip: nl ? '💡 Je kunt vrijwilligers ook terugslepen naar "Niet toegewezen".' : '💡 You can drag volunteers back to "Unassigned".',
    },
    {
      icon: Users,
      color: 'bg-teal-500/10 text-teal-600',
      title: nl ? '11. Wat zien vrijwilligers?' : '11. What do volunteers see?',
      description: nl
        ? 'Na toewijzing zien vrijwilligers:\n\n✅ Hun taak\n📍 Exacte zone/post\n🕐 Briefing-, start- en eindtijd\n📋 Instructies\n💰 Verwachte vergoeding\n\nAlles op één plek!'
        : 'After assignment, volunteers see:\n\n✅ Their task\n📍 Exact zone/post\n🕐 Briefing, start, and end times\n📋 Instructions\n💰 Expected compensation\n\nAll in one place!',
      tip: nl ? '💡 Combineer met Briefings en Safety voor een compleet systeem.' : '💡 Combine with Briefings and Safety for a complete system.',
    },
    {
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600',
      title: nl ? '🎉 Je bent klaar!' : '🎉 You\'re all set!',
      description: nl
        ? 'Je kent nu de volledige flow! Probeer het zelf uit door een evenement aan te maken in de Events Manager.'
        : 'You now know the complete flow! Try it yourself by creating an event in the Events Manager.',
      tip: nl ? '🚀 Gebruik de "Start demo" knop om een volledig voorbeeld te zien!' : '🚀 Use the "Start demo" button to see a complete example!',
    },
  ];

  // Find and highlight target element
  const findTarget = useCallback(() => {
    const current = steps[step];
    if (!current?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Small delay to let scroll finish
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 350);
    } else {
      setTargetRect(null);
    }
  }, [step, steps]);

  // Dispatch actions and navigate
  useEffect(() => {
    if (!open) return;
    const current = steps[step];
    setIsTransitioning(true);
    setTargetRect(null);

    const execute = async () => {
      // Navigate if needed
      if (current.navigateTo && location.pathname !== current.navigateTo) {
        navigate(current.navigateTo);
        await new Promise(r => setTimeout(r, 600));
      }

      // Dispatch action if needed
      if (current.action) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { action: current.action } }));
      }

      // Wait then find target
      await new Promise(r => setTimeout(r, current.waitMs || 200));
      findTarget();
      setIsTransitioning(false);
    };

    execute();
  }, [step, open]);

  // Observe target for position changes
  useEffect(() => {
    if (!open) return;
    const current = steps[step];
    if (!current?.target) return;

    const interval = setInterval(() => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(prev => {
          if (!prev || Math.abs(prev.top - rect.top) > 2 || Math.abs(prev.left - rect.left) > 2) {
            return rect;
          }
          return prev;
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [step, open]);

  if (!open) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const hasTarget = !!targetRect;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipW = 420;
    const viewH = window.innerHeight;
    const viewW = window.innerWidth;

    // Prefer placing below the target
    const spaceBelow = viewH - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceRight = viewW - targetRect.right;
    const spaceLeft = targetRect.left;

    let top = 0;
    let left = 0;

    if (current.position === 'bottom' || (!current.position && spaceBelow > 280)) {
      top = targetRect.bottom + padding;
      left = Math.max(padding, Math.min(targetRect.left, viewW - tooltipW - padding));
    } else if (current.position === 'top' || (!current.position && spaceAbove > 280)) {
      top = targetRect.top - padding - 280;
      left = Math.max(padding, Math.min(targetRect.left, viewW - tooltipW - padding));
    } else if (spaceRight > tooltipW + padding) {
      top = Math.max(padding, targetRect.top - 20);
      left = targetRect.right + padding;
    } else {
      top = Math.max(padding, targetRect.top - 20);
      left = targetRect.left - tooltipW - padding;
    }

    return {
      top: `${Math.max(padding, top)}px`,
      left: `${Math.max(padding, left)}px`,
    };
  };

  // SVG overlay with cutout
  const renderOverlay = () => {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    if (!targetRect) {
      return (
        <div className="fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300" />
      );
    }

    const pad = 8;
    const r = 12;
    const x = targetRect.left - pad;
    const y = targetRect.top - pad;
    const w = targetRect.width + pad * 2;
    const h = targetRect.height + pad * 2;

    return (
      <svg
        className="fixed inset-0 z-[60] w-full h-full pointer-events-none"
        style={{ width: viewW, height: viewH }}
      >
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width={viewW} height={viewH} fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
          </mask>
        </defs>
        <rect
          x="0" y="0"
          width={viewW} height={viewH}
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
        />
        {/* Glowing border around target */}
        <rect
          x={x} y={y}
          width={w} height={h}
          rx={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          className="animate-pulse"
        />
      </svg>
    );
  };

  return (
    <>
      {/* Overlay */}
      {renderOverlay()}

      {/* Click blocker (allows clicking the tooltip but blocks everything else) */}
      <div
        className="fixed inset-0 z-[61]"
        onClick={(e) => {
          // Allow clicks on the tooltip itself
          if (tooltipRef.current?.contains(e.target as Node)) return;
          e.stopPropagation();
        }}
      />

      {/* Tooltip card */}
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
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
                {nl ? '👆 Dit element is gemarkeerd op de pagina' : '👆 This element is highlighted on the page'}
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
            onClick={() => setStep(s => s - 1)}
            disabled={isFirst}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {nl ? 'Vorige' : 'Back'}
          </button>

          {isLast ? (
            <button
              onClick={() => { onClose(); navigate('/events-manager'); }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Rocket className="w-4 h-4" /> {nl ? 'Aan de slag!' : "Let's go!"}
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {nl ? 'Volgende' : 'Next'} <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default PlanningOnboardingTour;
