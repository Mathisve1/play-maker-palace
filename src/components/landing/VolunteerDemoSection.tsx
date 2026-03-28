import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, FileText, QrCode, CreditCard, Bell,
  CheckCircle, MapPin, Clock, Star, ArrowRight,
} from 'lucide-react';
import IPhoneMockup from '@/components/ui/iphone-mockup';
import { useIsMobile } from '@/hooks/use-mobile';

export interface DemoScreen {
  id: string;
  tabLabel: string;
  tabIcon: React.ReactNode;
}

interface VolunteerDemoSectionProps {
  sectionLabel: string;
  sectionTitle: string;
  sectionSubtitle: string;
  screens: DemoScreen[];
}

// ── Individual app screens ───────────────────────────────────────

const ScreenDashboard = () => (
  <div className="h-full bg-[hsl(40,30%,98%)] flex flex-col p-4 text-[10px]">
    {/* Status bar */}
    <div className="flex justify-between items-center mb-3 px-1">
      <span className="font-semibold text-[9px] text-foreground/70">09:41</span>
      <div className="flex gap-1 items-center">
        <div className="w-3.5 h-2 border border-foreground/50 rounded-[2px] relative"><div className="absolute inset-0.5 left-0.5 right-1 bg-foreground/50 rounded-[1px]" /></div>
      </div>
    </div>
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-[9px] text-muted-foreground">Goedemorgen,</p>
        <p className="font-heading font-bold text-base text-foreground">Jan</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
        <span className="text-primary font-bold text-[11px]">JP</span>
      </div>
    </div>
    {/* Next task card */}
    <div className="bg-gradient-to-br from-primary to-[hsl(35,90%,58%)] rounded-2xl p-3 mb-3 text-white">
      <p className="text-[9px] opacity-80 mb-0.5">Volgende taak</p>
      <p className="font-heading font-bold text-sm leading-tight">Steward · Poort 4</p>
      <p className="text-[9px] opacity-80 mt-1">FC Lokeren-Temse · Za 22 mrt</p>
      <div className="flex items-center gap-1.5 mt-2">
        <Clock className="w-3 h-3 opacity-80" />
        <span className="text-[9px] opacity-80">13:30 – 18:00</span>
      </div>
    </div>
    {/* Stats row */}
    <div className="grid grid-cols-3 gap-2 mb-3">
      {[
        { label: 'Taken', value: '4' },
        { label: 'Uren', value: '18' },
        { label: 'Vergoeding', value: '€75' },
      ].map((s) => (
        <div key={s.label} className="bg-card rounded-xl p-2 text-center border border-border/40">
          <p className="font-heading font-bold text-sm text-foreground">{s.value}</p>
          <p className="text-[8px] text-muted-foreground mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
    {/* Notifications */}
    <div className="bg-primary/6 rounded-xl p-2.5 flex items-center gap-2">
      <Bell className="w-3.5 h-3.5 text-primary shrink-0" />
      <p className="text-[9px] text-primary font-medium">Briefing beschikbaar voor za 22 mrt</p>
    </div>
  </div>
);

const ScreenBriefing = () => (
  <div className="h-full bg-white flex flex-col p-4 text-[10px]">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-6 h-6 bg-accent/12 rounded-lg flex items-center justify-center">
        <FileText className="w-3.5 h-3.5 text-accent" />
      </div>
      <div>
        <p className="font-heading font-bold text-foreground text-xs">Briefing</p>
        <p className="text-[8px] text-muted-foreground">Steward · Poort 4</p>
      </div>
      <div className="ml-auto flex gap-0.5">
        {(['NL', 'FR', 'EN'] as const).map((l) => (
          <span key={l} className={`text-[7px] px-1 py-0.5 rounded font-bold ${l === 'NL' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{l}</span>
        ))}
      </div>
    </div>
    {/* Pitch */}
    <div className="bg-[hsl(145,40%,94%)] rounded-xl p-2 mb-3">
      <div className="border border-[hsl(145,40%,70%)] rounded-lg h-16 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border border-[hsl(145,40%,70%)] rounded-full" />
        </div>
        <div className="absolute left-0 right-0 top-1/2 h-px bg-[hsl(145,40%,70%)]" />
        <div className="absolute top-1 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">4</span>
        </div>
      </div>
    </div>
    {/* Tasks checklist */}
    <p className="font-semibold text-foreground text-[9px] mb-2">Jouw taken</p>
    <div className="space-y-1.5 mb-3">
      {['Ingang bewaken', 'Tickets controleren', 'Supporters begeleiden', 'Eerste hulp coördineren'].map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded border flex items-center justify-center ${i < 2 ? 'bg-primary border-primary' : 'border-border'}`}>
            {i < 2 && <CheckCircle className="w-2 h-2 text-white" />}
          </div>
          <span className={`text-[8px] ${i < 2 ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{t}</span>
        </div>
      ))}
    </div>
    {/* Important note */}
    <div className="bg-primary/6 border border-primary/15 rounded-xl p-2">
      <p className="text-[8px] text-primary font-medium">Meld je 45 min voor aanvang bij de coördinator aan ingang Poort 4.</p>
    </div>
  </div>
);

const ScreenCheckin = () => (
  <div className="h-full bg-[hsl(40,30%,98%)] flex flex-col items-center justify-center p-4 text-[10px]">
    <p className="text-[9px] text-muted-foreground mb-1">Check-in · Poort 4</p>
    <p className="font-heading font-bold text-foreground text-sm mb-4">Scan jouw QR-code</p>
    {/* QR code */}
    <div className="relative w-28 h-28 mb-4">
      {[['top-0 left-0'], ['top-0 right-0'], ['bottom-0 left-0']].map(([pos], i) => (
        <div key={i} className={`absolute ${pos} w-9 h-9 border-[2.5px] border-foreground/80 rounded-sm`}>
          <div className="absolute inset-[3px] bg-foreground/80 rounded-[1px]" />
        </div>
      ))}
      <div className="absolute inset-[12px] grid grid-cols-4 gap-[1.5px]">
        {[1,0,1,1,0,1,0,1,1,0,0,1,0,1,1,0].map((v, i) => (
          <div key={i} className={`rounded-[1px] ${v ? 'bg-foreground/80' : ''}`} />
        ))}
      </div>
      <motion.div
        className="absolute left-0 right-0 h-0.5 bg-primary/50"
        animate={{ top: ['8%', '88%', '8%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    </div>
    {/* Success */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="flex items-center gap-2 bg-accent/10 text-accent rounded-2xl px-4 py-2.5 mb-3"
    >
      <CheckCircle className="w-4 h-4" />
      <span className="font-semibold text-[10px]">Check-in geslaagd!</span>
    </motion.div>
    <p className="text-[9px] text-muted-foreground text-center">Welkom, Jan! Je taak start om 13:30.</p>
    <div className="mt-3 flex items-center gap-1.5">
      <MapPin className="w-3 h-3 text-primary" />
      <span className="text-[8px] text-primary font-medium">Poort 4 · Ingang Noord</span>
    </div>
  </div>
);

const ScreenPayment = () => (
  <div className="h-full bg-white flex flex-col p-4 text-[10px]">
    <p className="font-heading font-bold text-foreground text-xs mb-4">Vergoedingen</p>
    {/* Summary card */}
    <div className="bg-gradient-to-br from-accent/10 to-secondary/8 rounded-2xl p-3 mb-4 border border-accent/15">
      <p className="text-[9px] text-muted-foreground mb-1">Dit seizoen</p>
      <p className="font-heading font-bold text-2xl text-accent">€ 75,00</p>
      <div className="flex items-center gap-1.5 mt-1">
        <CheckCircle className="w-3 h-3 text-accent" />
        <span className="text-[8px] text-accent font-medium">Automatisch via SEPA</span>
      </div>
    </div>
    {/* Transaction list */}
    <p className="text-[8px] text-muted-foreground mb-2 uppercase tracking-wider">Recente uitbetalingen</p>
    <div className="space-y-2">
      {[
        { date: '22 mrt', event: 'FC Lokeren-Temse', amount: '+€25,00', status: 'pending' },
        { date: '8 mrt',  event: 'FC Lokeren-Temse', amount: '+€25,00', status: 'done' },
        { date: '22 feb', event: 'FC Lokeren-Temse', amount: '+€25,00', status: 'done' },
      ].map((t, i) => (
        <div key={i} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
          <div>
            <p className="font-semibold text-foreground text-[9px]">{t.event}</p>
            <p className="text-[8px] text-muted-foreground">{t.date}</p>
          </div>
          <div className="text-right">
            <p className={`font-heading font-bold text-xs ${i === 0 ? 'text-amber-600' : 'text-accent'}`}>{t.amount}</p>
            <p className={`text-[7px] ${i === 0 ? 'text-amber-500' : 'text-accent/70'}`}>{i === 0 ? 'In behandeling' : 'Uitbetaald'}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Bottom tab bar ───────────────────────────────────────────────
const TAB_BAR_ITEMS = [
  { id: 'dashboard', icon: Home,       label: 'Home'      },
  { id: 'briefing',  icon: FileText,   label: 'Briefing'  },
  { id: 'checkin',   icon: QrCode,     label: 'Check-in'  },
  { id: 'payment',   icon: CreditCard, label: 'Vergoeding'},
];

const APP_SCREENS: Record<string, React.FC> = {
  dashboard: ScreenDashboard,
  briefing:  ScreenBriefing,
  checkin:   ScreenCheckin,
  payment:   ScreenPayment,
};

const SCREEN_ORDER = ['dashboard', 'briefing', 'checkin', 'payment'];

// ── Main component ───────────────────────────────────────────────
export const VolunteerDemoSection = ({
  sectionLabel, sectionTitle, sectionSubtitle, screens,
}: VolunteerDemoSectionProps) => {
  const [activeScreen, setActiveScreen] = useState(0);
  const isMobile = useIsMobile();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 },
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    timerRef.current = setInterval(() => {
      setActiveScreen(prev => (prev + 1) % SCREEN_ORDER.length);
    }, 3200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isVisible]);

  const currentId = SCREEN_ORDER[activeScreen];
  const ActiveScreen = APP_SCREENS[currentId];

  const phoneScale = isMobile ? 0.62 : 0.72;

  return (
    <section ref={sectionRef} className="py-28 px-4 bg-background overflow-hidden">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">{sectionLabel}</p>
          <h2 className="font-heading font-bold text-foreground text-4xl md:text-5xl mb-5">{sectionTitle}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">{sectionSubtitle}</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            {/* Glow behind phone */}
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, hsl(24,85%,55%) 0%, transparent 70%)' }}
            />
            <IPhoneMockup
              model="15-pro"
              color="natural-titanium"
              scale={phoneScale}
              screenBg="hsl(40,30%,98%)"
              safeAreaOverrides={{ top: 64, bottom: 80 }}
            >
              {/* App content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="flex-1 overflow-hidden"
                  style={{ height: '100%' }}
                >
                  <ActiveScreen />
                </motion.div>
              </AnimatePresence>
              {/* Bottom tab bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border/40 flex justify-around py-2 px-1" style={{ zIndex: 10 }}>
                {TAB_BAR_ITEMS.map((tab, i) => {
                  const isActive = SCREEN_ORDER[activeScreen] === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveScreen(i); if (timerRef.current) clearInterval(timerRef.current); }}
                      className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="text-[7px] font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </IPhoneMockup>
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-sm w-full"
          >
            <div className="space-y-3">
              {screens.map((screen, i) => {
                const isActive = SCREEN_ORDER[activeScreen] === screen.id;
                return (
                  <motion.button
                    key={screen.id}
                    onClick={() => { setActiveScreen(i); if (timerRef.current) clearInterval(timerRef.current); }}
                    animate={{ opacity: isActive ? 1 : 0.5 }}
                    transition={{ duration: 0.3 }}
                    className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-card border-primary/25 shadow-[0_4px_24px_-4px_hsla(24,85%,55%,0.2)]'
                        : 'bg-card/60 border-border/40 hover:border-primary/15 hover:bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                        {screen.tabIcon}
                      </div>
                      <div className="flex-1">
                        <p className={`font-heading font-semibold text-base ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {screen.tabLabel}
                        </p>
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    {/* Progress bar */}
                    {isActive && (
                      <motion.div className="mt-3 h-0.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 3.2, ease: 'linear' }}
                        />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
