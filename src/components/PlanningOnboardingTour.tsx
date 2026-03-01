import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  CalendarDays, Users, Layers, LayoutGrid, ChevronRight,
  ChevronLeft, X, Rocket, MapPin, GripVertical, CheckCircle2,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: 'learn' | 'post-demo';
}

const PlanningOnboardingTour = ({ open, onClose, mode = 'learn' }: Props) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const nl = language === 'nl';

  if (!open) return null;

  const steps = [
    {
      icon: CalendarDays,
      color: 'bg-primary/10 text-primary',
      title: nl ? '1. Maak een evenement aan' : '1. Create an event',
      description: nl
        ? 'Ga naar "Evenementen & Taken" in het menu. Klik op "Nieuw evenement" en vul de titel, datum en locatie in. Dit is de container voor al je taken.'
        : 'Go to "Events & Tasks" in the menu. Click "New event" and fill in title, date, and location. This is the container for all your tasks.',
      tip: nl
        ? '💡 Je kunt ook losse taken aanmaken zonder evenement, maar voor een voetbalwedstrijd is een evenement ideaal.'
        : '💡 You can also create standalone tasks without an event, but for a match day an event is ideal.',
      cta: nl ? 'Ga naar Evenementen' : 'Go to Events',
      ctaRoute: '/events-manager',
    },
    {
      icon: LayoutGrid,
      color: 'bg-amber-500/10 text-amber-600',
      title: nl ? '2. Voeg groepen toe' : '2. Add groups',
      description: nl
        ? 'Klik op je evenement om het uit te klappen. Voeg groepen toe zoals "Stewards", "Parking", "Catering". Elke groep krijgt een kleur en je kunt polsbandkleur en materiaalnotities instellen.'
        : 'Click your event to expand it. Add groups like "Stewards", "Parking", "Catering". Each group gets a color and you can set wristband colors and material notes.',
      tip: nl
        ? '💡 Groepen helpen je om vrijwilligers te organiseren per functie. Ze verschijnen ook op de scan-interface.'
        : '💡 Groups help organize volunteers by function. They also appear on the scan interface.',
    },
    {
      icon: Users,
      color: 'bg-green-500/10 text-green-600',
      title: nl ? '3. Maak taken per groep' : '3. Create tasks per group',
      description: nl
        ? 'Klik op "Taak toevoegen" binnen een groep. Stel de titel, datum, locatie en aantal beschikbare plaatsen in. Vrijwilligers kunnen zich hiervoor inschrijven vanuit hun dashboard.'
        : 'Click "Add task" within a group. Set the title, date, location and available spots. Volunteers can sign up for these from their dashboard.',
      tip: nl
        ? '💡 Je kunt ook tijden instellen (briefing, start, einde) en vergoeding per uur of vast bedrag.'
        : '💡 You can also set times (briefing, start, end) and compensation per hour or fixed amount.',
    },
    {
      icon: Layers,
      color: 'bg-purple-500/10 text-purple-600',
      title: nl ? '4. Configureer zones per taak' : '4. Configure zones per task',
      description: nl
        ? 'Klik op het zone-icoon (▦) naast een taak in de Events Manager. Hier bouw je een boomstructuur: bv. "Poort A" > "Post A1 Links", "Post A2 Rechts". Stel per zone een maximum capaciteit in.'
        : 'Click the zone icon (▦) next to a task in Events Manager. Build a tree structure: e.g. "Gate A" > "Post A1 Left", "Post A2 Right". Set a maximum capacity per zone.',
      tip: nl
        ? '💡 Zones kunnen onbeperkt genest worden. Gebruik dit voor Zone > Sectie > Post als je heel specifiek wilt plannen.'
        : '💡 Zones can be nested unlimitedly. Use this for Zone > Section > Post for very specific planning.',
    },
    {
      icon: GripVertical,
      color: 'bg-cyan-500/10 text-cyan-600',
      title: nl ? '5. Wijs vrijwilligers toe aan zones' : '5. Assign volunteers to zones',
      description: nl
        ? 'Ga naar "Planning" in het menu en klik op een taak. Je ziet een Kanban-bord: links de aangemelde vrijwilligers, rechts de zones. Sleep vrijwilligers naar de juiste zone of post.'
        : 'Go to "Planning" in the menu and click a task. You\'ll see a Kanban board: volunteers on the left, zones on the right. Drag volunteers to the correct zone or post.',
      tip: nl
        ? '💡 Het systeem toont hoeveel plaatsen nog vrij zijn per zone. Je kunt vrijwilligers ook weer terugslepen.'
        : '💡 The system shows how many spots are still available per zone. You can also drag volunteers back.',
      cta: nl ? 'Ga naar Planning' : 'Go to Planning',
      ctaRoute: '/planning',
    },
    {
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600',
      title: nl ? '🎉 Klaar!' : '🎉 Done!',
      description: nl
        ? 'Je vrijwilligers zien hun toewijzing in hun dashboard. Ze weten precies waar ze moeten staan, wanneer ze verwacht worden en wat ze nodig hebben. Alles op één plek!'
        : 'Your volunteers see their assignment in their dashboard. They know exactly where to be, when they\'re expected, and what they need. Everything in one place!',
      tip: nl
        ? '💡 Combineer dit met Briefings voor gedetailleerde instructies, en Safety voor checklist-opvolging op de dag zelf.'
        : '💡 Combine this with Briefings for detailed instructions, and Safety for checklist tracking on the day itself.',
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-xs font-medium text-muted-foreground">
            {nl ? 'Stap' : 'Step'} {step + 1} / {steps.length}
          </span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${current.color}`}>
            <Icon className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-heading font-bold text-foreground mb-2">
            {current.title}
          </h3>

          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {current.description}
          </p>

          <div className="bg-muted/50 rounded-xl px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            {current.tip}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={isFirst}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {nl ? 'Vorige' : 'Previous'}
          </button>

          <div className="flex gap-2">
            {current.cta && current.ctaRoute && (
              <button
                onClick={() => { onClose(); navigate(current.ctaRoute!); }}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                {current.cta}
              </button>
            )}

            {isLast ? (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
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
      </div>
    </div>
  );
};

export default PlanningOnboardingTour;
