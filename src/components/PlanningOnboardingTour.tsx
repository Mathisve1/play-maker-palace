import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  CalendarDays, Users, Layers, LayoutGrid, ChevronRight,
  ChevronLeft, X, Rocket, MapPin, GripVertical, CheckCircle2,
  Plus, MousePointerClick, ArrowRight, Settings, Palette,
  ClipboardList, Eye, FolderTree, Move, BarChart3,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: 'learn' | 'post-demo';
}

const PlanningOnboardingTour = ({ open, onClose, mode = 'learn' }: Props) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const nl = language === 'nl';

  if (!open) return null;

  const steps = [
    {
      icon: Rocket,
      color: 'bg-primary/10 text-primary',
      title: nl ? 'Welkom bij de Planning Tour' : 'Welcome to the Planning Tour',
      description: nl
        ? 'In deze tour leer je stap voor stap hoe je een compleet evenement opzet: van het aanmaken van een evenement tot het toewijzen van vrijwilligers aan specifieke zones. We nemen je mee naar elke pagina!'
        : 'In this tour you\'ll learn step by step how to set up a complete event: from creating an event to assigning volunteers to specific zones. We\'ll take you to each page!',
      tip: nl
        ? '💡 Je kunt op elk moment de tour sluiten en later hervatten via de "Hoe werkt het?" knop.'
        : '💡 You can close the tour at any time and resume later via the "How does it work?" button.',
      visual: null,
    },
    {
      icon: CalendarDays,
      color: 'bg-primary/10 text-primary',
      title: nl ? '1. Ga naar Evenementen & Taken' : '1. Go to Events & Tasks',
      description: nl
        ? 'Klik in het linkermenu op "Evenementen & Taken". Dit is de centrale plek waar je al je evenementen, groepen en taken beheert.'
        : 'Click "Events & Tasks" in the left menu. This is the central place where you manage all your events, groups, and tasks.',
      tip: nl
        ? '📍 Klik op de knop hieronder om direct naar de juiste pagina te gaan.'
        : '📍 Click the button below to go directly to the right page.',
      cta: nl ? '→ Ga naar Evenementen & Taken' : '→ Go to Events & Tasks',
      ctaRoute: '/events-manager',
      visual: {
        type: 'menu-highlight',
        label: nl ? 'Menu → Evenementen & Taken' : 'Menu → Events & Tasks',
        icon: CalendarDays,
      },
    },
    {
      icon: Plus,
      color: 'bg-blue-500/10 text-blue-600',
      title: nl ? '2. Maak een nieuw evenement' : '2. Create a new event',
      description: nl
        ? 'Op de Evenementen-pagina klik je bovenaan op de groene "+ Nieuw evenement" knop. Vul een titel in (bv. "Voetbalwedstrijd KV Mechelen"), kies een datum en locatie. Dit evenement is de container voor al je groepen en taken.'
        : 'On the Events page, click the green "+ New event" button at the top. Enter a title (e.g. "Football Match"), choose a date and location. This event is the container for all your groups and tasks.',
      tip: nl
        ? '💡 Een evenement kan meerdere groepen en tientallen taken bevatten. Denk aan een evenement als een "werkdag".'
        : '💡 An event can contain multiple groups and dozens of tasks. Think of an event as a "work day".',
      cta: nl ? '→ Ga naar Evenementen & Taken' : '→ Go to Events & Tasks',
      ctaRoute: '/events-manager',
      visual: {
        type: 'action-highlight',
        label: nl ? 'Klik: "+ Nieuw evenement"' : 'Click: "+ New event"',
        icon: Plus,
        color: 'text-green-600',
      },
    },
    {
      icon: LayoutGrid,
      color: 'bg-amber-500/10 text-amber-600',
      title: nl ? '3. Voeg groepen toe aan je evenement' : '3. Add groups to your event',
      description: nl
        ? 'Klik op je evenement om het uit te klappen. Je ziet nu een "+ Groep toevoegen" knop. Maak groepen aan zoals:\n\n• Stewards (blauw)\n• Parking (rood)\n• Catering (groen)\n• Ticketing (paars)\n\nElke groep krijgt automatisch een kleur.'
        : 'Click your event to expand it. You\'ll see an "+ Add group" button. Create groups like:\n\n• Stewards (blue)\n• Parking (red)\n• Catering (green)\n• Ticketing (purple)\n\nEach group automatically gets a color.',
      tip: nl
        ? '⚙️ Per groep kun je ook instellen: polsbandkleur, polsbandlabel en een materiaalnotitie (bv. "Fluohesje + walkietalkie").'
        : '⚙️ Per group you can also set: wristband color, wristband label, and a materials note (e.g. "High-vis vest + walkie-talkie").',
      visual: {
        type: 'action-highlight',
        label: nl ? 'Klik: "+ Groep toevoegen"' : 'Click: "+ Add group"',
        icon: LayoutGrid,
        color: 'text-amber-600',
      },
    },
    {
      icon: Palette,
      color: 'bg-pink-500/10 text-pink-600',
      title: nl ? '4. Configureer groep-instellingen' : '4. Configure group settings',
      description: nl
        ? 'Klik op het tandwiel-icoon (⚙️) naast een groep om de instellingen te openen:\n\n• Polsbandkleur — welke kleur polsbandje krijgen vrijwilligers?\n• Polsbandlabel — tekst op het polsbandje\n• Materiaalnotitie — wat moeten ze meenemen?\n\nDit helpt bij check-in op de dag zelf.'
        : 'Click the gear icon (⚙️) next to a group to open settings:\n\n• Wristband color — what color wristband do volunteers get?\n• Wristband label — text on the wristband\n• Materials note — what should they bring?\n\nThis helps with check-in on the day itself.',
      tip: nl
        ? '💡 Deze info wordt getoond aan de steward bij het scannen van tickets, zodat ze weten welk polsbandje te geven.'
        : '💡 This info is shown to the steward when scanning tickets, so they know which wristband to give.',
      visual: {
        type: 'action-highlight',
        label: nl ? 'Klik: ⚙️ naast groepnaam' : 'Click: ⚙️ next to group name',
        icon: Settings,
        color: 'text-pink-600',
      },
    },
    {
      icon: ClipboardList,
      color: 'bg-green-500/10 text-green-600',
      title: nl ? '5. Maak taken per groep' : '5. Create tasks per group',
      description: nl
        ? 'Binnen elke groep klik je op "+ Taak toevoegen". Vul in:\n\n• Titel — bv. "Stewards Poort A"\n• Datum & tijden — briefing, start, einde\n• Locatie — waar moeten ze zijn?\n• Plaatsen — hoeveel vrijwilligers nodig?\n• Vergoeding — per uur of vast bedrag\n\nVrijwilligers zien deze taken in hun dashboard en kunnen zich inschrijven.'
        : 'Within each group, click "+ Add task". Fill in:\n\n• Title — e.g. "Stewards Gate A"\n• Date & times — briefing, start, end\n• Location — where should they be?\n• Spots — how many volunteers needed?\n• Compensation — per hour or fixed amount\n\nVolunteers see these tasks in their dashboard and can sign up.',
      tip: nl
        ? '💡 Je kunt taken ook kopiëren met het kopieer-icoon als je vergelijkbare taken hebt voor verschillende groepen.'
        : '💡 You can also copy tasks with the copy icon if you have similar tasks for different groups.',
      cta: nl ? '→ Ga naar Evenementen & Taken' : '→ Go to Events & Tasks',
      ctaRoute: '/events-manager',
      visual: {
        type: 'action-highlight',
        label: nl ? 'Klik: "+ Taak toevoegen" in een groep' : 'Click: "+ Add task" in a group',
        icon: Plus,
        color: 'text-green-600',
      },
    },
    {
      icon: FolderTree,
      color: 'bg-purple-500/10 text-purple-600',
      title: nl ? '6. Configureer zones per taak' : '6. Configure zones per task',
      description: nl
        ? 'Klik op het zone-icoon (▦) naast een taak. Hier bouw je een hiërarchische boomstructuur:\n\n📂 Poort A\n  ├── 📍 Post A1 Links (max 3)\n  └── 📍 Post A2 Rechts (max 3)\n📂 Poort B\n  ├── 📍 Post B1 (max 2)\n  └── 📍 Post B2 (max 2)\n\nStel per zone een maximum capaciteit in. Zones kunnen onbeperkt genest worden!'
        : 'Click the zone icon (▦) next to a task. Build a hierarchical tree structure:\n\n📂 Gate A\n  ├── 📍 Post A1 Left (max 3)\n  └── 📍 Post A2 Right (max 3)\n📂 Gate B\n  ├── 📍 Post B1 (max 2)\n  └── 📍 Post B2 (max 2)\n\nSet a maximum capacity per zone. Zones can be nested unlimited!',
      tip: nl
        ? '⚡ Tip: gebruik Zone > Sectie > Post als je heel specifiek wilt plannen. Bv. "Parking > Parking P1 > Ingang P1".'
        : '⚡ Tip: use Zone > Section > Post for very specific planning. E.g. "Parking > Parking P1 > Entrance P1".',
      visual: {
        type: 'action-highlight',
        label: nl ? 'Klik: ▦ icoon naast een taak' : 'Click: ▦ icon next to a task',
        icon: Layers,
        color: 'text-purple-600',
      },
    },
    {
      icon: Eye,
      color: 'bg-cyan-500/10 text-cyan-600',
      title: nl ? '7. Bekijk het resultaat in Planning' : '7. View the result in Planning',
      description: nl
        ? 'Ga nu naar "Planning" in het menu. Hier zie je een overzicht van al je evenementen en taken. Alleen taken MET zones verschijnen hier — die kun je aanklikken om het Kanban-bord te openen.'
        : 'Now go to "Planning" in the menu. Here you see an overview of all your events and tasks. Only tasks WITH zones appear here — you can click them to open the Kanban board.',
      tip: nl
        ? '📍 Taken zonder zones zijn grijs en niet-klikbaar. Ga terug naar Events Manager om zones toe te voegen.'
        : '📍 Tasks without zones are greyed out and not clickable. Go back to Events Manager to add zones.',
      cta: nl ? '→ Ga naar Planning' : '→ Go to Planning',
      ctaRoute: '/planning',
      visual: {
        type: 'menu-highlight',
        label: nl ? 'Menu → Planning' : 'Menu → Planning',
        icon: BarChart3,
      },
    },
    {
      icon: GripVertical,
      color: 'bg-indigo-500/10 text-indigo-600',
      title: nl ? '8. Wijs vrijwilligers toe via drag & drop' : '8. Assign volunteers via drag & drop',
      description: nl
        ? 'Klik op een taak in het Planning-overzicht. Je ziet nu het Kanban-bord:\n\n⬅️ Links: aangemelde vrijwilligers (wachtend)\n➡️ Rechts: jouw zones en posten\n\nSleep een vrijwilliger van links naar de juiste zone of post. Het systeem toont hoeveel plaatsen er nog vrij zijn per zone.'
        : 'Click a task in the Planning overview. You\'ll see the Kanban board:\n\n⬅️ Left: signed-up volunteers (waiting)\n➡️ Right: your zones and posts\n\nDrag a volunteer from the left to the correct zone or post. The system shows how many spots are still available per zone.',
      tip: nl
        ? '💡 Je kunt vrijwilligers ook weer terugslepen naar "Niet toegewezen" als je je bedenkt.'
        : '💡 You can also drag volunteers back to "Unassigned" if you change your mind.',
      visual: {
        type: 'action-highlight',
        label: nl ? 'Sleep vrijwilligers naar zones' : 'Drag volunteers to zones',
        icon: Move,
        color: 'text-indigo-600',
      },
    },
    {
      icon: Users,
      color: 'bg-teal-500/10 text-teal-600',
      title: nl ? '9. Wat zien vrijwilligers?' : '9. What do volunteers see?',
      description: nl
        ? 'Na toewijzing zien vrijwilligers in hun dashboard:\n\n✅ De taak waarvoor ze zijn ingeschreven\n📍 De exacte zone/post waar ze moeten staan\n🕐 De tijden (briefing, start, einde)\n📋 Eventuele briefing-instructies\n💰 Hun verwachte vergoeding\n\nAlles op één plek — geen WhatsApp-groepen meer nodig!'
        : 'After assignment, volunteers see in their dashboard:\n\n✅ The task they\'re signed up for\n📍 The exact zone/post where they should be\n🕐 The times (briefing, start, end)\n📋 Any briefing instructions\n💰 Their expected compensation\n\nEverything in one place — no more WhatsApp groups needed!',
      tip: nl
        ? '💡 Combineer dit met Briefings voor gedetailleerde instructies per groep, en Safety voor checklist-opvolging.'
        : '💡 Combine this with Briefings for detailed instructions per group, and Safety for checklist tracking.',
    },
    {
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600',
      title: nl ? '🎉 Je bent klaar!' : '🎉 You\'re all set!',
      description: nl
        ? 'Je kent nu de volledige flow:\n\n1️⃣ Evenement aanmaken\n2️⃣ Groepen toevoegen\n3️⃣ Groep-instellingen configureren\n4️⃣ Taken aanmaken per groep\n5️⃣ Zones opbouwen per taak\n6️⃣ Vrijwilligers toewijzen via drag & drop\n\nProbeer het zelf! Maak je eerste evenement aan in de Events Manager.'
        : 'You now know the complete flow:\n\n1️⃣ Create event\n2️⃣ Add groups\n3️⃣ Configure group settings\n4️⃣ Create tasks per group\n5️⃣ Build zones per task\n6️⃣ Assign volunteers via drag & drop\n\nTry it yourself! Create your first event in the Events Manager.',
      tip: nl
        ? '🚀 Tip: gebruik de "Start demo" knop om eerst te zien hoe een volledig ingevuld evenement eruitziet!'
        : '🚀 Tip: use the "Start demo" button to first see what a fully populated event looks like!',
      cta: nl ? '→ Start in Events Manager' : '→ Start in Events Manager',
      ctaRoute: '/events-manager',
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const handleCta = () => {
    if (current.cta && current.ctaRoute) {
      navigate(current.ctaRoute);
    }
  };

  const handleFinish = () => {
    onClose();
    navigate('/events-manager');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {step + 1} / {steps.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {nl ? 'Planning Tour' : 'Planning Tour'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${current.color}`}>
            <Icon className="w-5 h-5" />
          </div>

          <h3 className="text-lg font-heading font-bold text-foreground mb-2">
            {current.title}
          </h3>

          <p className="text-sm text-muted-foreground leading-relaxed mb-3 whitespace-pre-line">
            {current.description}
          </p>

          {/* Visual indicator */}
          {current.visual && (
            <div className="flex items-center gap-3 bg-accent/50 border border-accent rounded-xl px-4 py-3 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-background ${current.visual.color || 'text-primary'}`}>
                <current.visual.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-primary" />
                  {current.visual.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {current.visual.type === 'menu-highlight'
                    ? (nl ? 'Navigatie in het zijmenu' : 'Navigation in the side menu')
                    : (nl ? 'Actie op de pagina' : 'Action on the page')}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          )}

          <div className="bg-muted/50 rounded-xl px-4 py-2.5 text-xs text-muted-foreground leading-relaxed">
            {current.tip}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-5 pt-1">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={isFirst}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {nl ? 'Vorige' : 'Previous'}
          </button>

          <div className="flex gap-2">
            {current.cta && current.ctaRoute && !isLast && (
              <button
                onClick={handleCta}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {current.cta}
              </button>
            )}

            {isLast ? (
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
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
