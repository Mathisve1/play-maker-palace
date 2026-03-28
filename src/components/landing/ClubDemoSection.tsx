import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileSignature, ClipboardList, CreditCard,
  CheckCircle, Bell, Users, BarChart3, Calendar, Clock, MapPin,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ClubDemoScreen {
  id: string;
  tabLabel: string;
  tabIcon: React.ReactNode;
}

interface ClubDemoSectionProps {
  sectionLabel: string;
  sectionTitle: string;
  sectionSubtitle: string;
  screens: ClubDemoScreen[];
}

// ── Browser chrome frame ─────────────────────────────────────────
const BrowserFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#1e1e2e] rounded-2xl overflow-hidden shadow-[0_32px_80px_-16px_rgba(0,0,0,0.45)]"
    style={{ width: 580, maxWidth: '100%' }}>
    {/* Browser chrome */}
    <div className="bg-[#2a2a3e] px-4 py-3 flex items-center gap-3">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex-1 bg-[#1e1e2e] rounded-lg px-3 py-1.5 flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full border border-white/20" />
        <span className="text-[11px] text-white/40 font-mono">app.de12eman.be/club-dashboard</span>
      </div>
    </div>
    {/* Screen content */}
    <div className="bg-[hsl(220,25%,10%)] overflow-hidden" style={{ height: 420 }}>
      {children}
    </div>
  </div>
);

// ── Dashboard screen ─────────────────────────────────────────────
const ScreenClubDashboard = () => (
  <div className="flex h-full text-white">
    {/* Sidebar */}
    <div className="w-14 bg-[hsl(220,25%,8%)] flex flex-col items-center py-4 gap-4 border-r border-white/5">
      <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center mb-2">
        <span className="text-primary text-[9px] font-bold">12</span>
      </div>
      {[LayoutDashboard, Users, FileSignature, ClipboardList, CreditCard].map((Icon, i) => (
        <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-primary/20' : 'hover:bg-white/5'}`}>
          <Icon className={`w-4 h-4 ${i === 0 ? 'text-primary' : 'text-white/30'}`} />
        </div>
      ))}
    </div>
    {/* Main */}
    <div className="flex-1 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] text-white/40">Goedemorgen,</p>
          <p className="font-heading font-bold text-white text-base">FC Lokeren-Temse</p>
        </div>
        <div className="flex items-center gap-1.5 bg-primary/15 text-primary px-2.5 py-1 rounded-full text-[10px] font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </div>
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Vrijwilligers', value: '22', color: 'text-primary' },
          { label: 'Ingecheckt', value: '18', color: 'text-accent' },
          { label: 'Contracten', value: '100%', color: 'text-green-400' },
          { label: 'Volgende', value: '22 mrt', color: 'text-white' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/5 rounded-xl p-2.5">
            <p className={`font-heading font-bold text-sm ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[8px] text-white/30 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>
      {/* Recent activity */}
      <p className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Recente activiteit</p>
      <div className="space-y-1.5">
        {[
          { icon: CheckCircle, text: 'Jan Pieters ingecheckt · Poort 4',   time: '13:42', color: 'text-accent' },
          { icon: FileSignature, text: 'Marie Claes ondertekende contract', time: '10:02', color: 'text-blue-400' },
          { icon: Bell, text: 'Briefings verstuurd naar 12 leden',          time: '09:30', color: 'text-primary' },
        ].map((a, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/3 rounded-lg px-3 py-2">
            <a.icon className={`w-3.5 h-3.5 ${a.color} shrink-0`} />
            <span className="text-[9px] text-white/60 flex-1">{a.text}</span>
            <span className="text-[8px] text-white/25">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Contracts screen ─────────────────────────────────────────────
const ScreenContracts = () => (
  <div className="flex h-full text-white">
    <div className="w-14 bg-[hsl(220,25%,8%)] flex flex-col items-center py-4 gap-4 border-r border-white/5">
      <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center mb-2">
        <span className="text-primary text-[9px] font-bold">12</span>
      </div>
      {[LayoutDashboard, Users, FileSignature, ClipboardList, CreditCard].map((Icon, i) => (
        <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center ${i === 2 ? 'bg-primary/20' : ''}`}>
          <Icon className={`w-4 h-4 ${i === 2 ? 'text-primary' : 'text-white/30'}`} />
        </div>
      ))}
    </div>
    <div className="flex-1 p-5 overflow-hidden">
      <p className="font-heading font-bold text-white text-base mb-4">Seizoenscontracten</p>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-white/5 rounded-lg px-3 py-1.5">
          <span className="text-[10px] text-white/30">Zoek vrijwilliger...</span>
        </div>
        <div className="bg-primary rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white cursor-pointer">
          Batch versturen
        </div>
      </div>
      <div className="space-y-2">
        {[
          { name: 'Jan Pieters',     role: 'Steward',     status: 'signed',   date: '15 mrt' },
          { name: 'Marie Claes',     role: 'Bar & Catering', status: 'signed', date: '15 mrt' },
          { name: 'Pieter Maes',     role: 'Steward',     status: 'pending',  date: '–' },
          { name: 'Sophie De Wolf',  role: 'Ticketing',   status: 'pending',  date: '–' },
          { name: 'Thomas Jacobs',   role: 'Steward',     status: 'signed',   date: '14 mrt' },
        ].map((v) => (
          <div key={v.name} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${v.status === 'signed' ? 'bg-accent' : 'bg-amber-400'}`} />
              <div>
                <p className="text-[10px] font-semibold text-white">{v.name}</p>
                <p className="text-[8px] text-white/30">{v.role}</p>
              </div>
            </div>
            <span className={`text-[9px] font-medium ${v.status === 'signed' ? 'text-accent' : 'text-amber-400'}`}>
              {v.status === 'signed' ? `Getekend ${v.date}` : 'In afwachting'}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Briefing builder screen ──────────────────────────────────────
const ScreenBriefingBuilder = () => (
  <div className="flex h-full text-white">
    <div className="w-14 bg-[hsl(220,25%,8%)] flex flex-col items-center py-4 gap-4 border-r border-white/5">
      <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center mb-2">
        <span className="text-primary text-[9px] font-bold">12</span>
      </div>
      {[LayoutDashboard, Users, FileSignature, ClipboardList, CreditCard].map((Icon, i) => (
        <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center ${i === 3 ? 'bg-primary/20' : ''}`}>
          <Icon className={`w-4 h-4 ${i === 3 ? 'text-primary' : 'text-white/30'}`} />
        </div>
      ))}
    </div>
    <div className="flex-1 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <p className="font-heading font-bold text-white text-base">Briefing Builder</p>
        <div className="flex gap-1">
          {['NL', 'FR', 'EN'].map((l, i) => (
            <span key={l} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${i === 0 ? 'bg-primary text-white' : 'bg-white/10 text-white/40'}`}>{l}</span>
          ))}
        </div>
      </div>
      {/* Zone map */}
      <div className="bg-[hsl(145,30%,15%)] rounded-xl p-3 mb-3">
        <div className="border border-[hsl(145,40%,30%)] rounded-lg h-20 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border border-[hsl(145,40%,30%)] rounded-full" />
          </div>
          <div className="absolute left-0 right-0 top-1/2 h-px bg-[hsl(145,40%,25%)]" />
          {['top-1 right-1.5', 'top-1 left-1.5', 'bottom-1 left-1.5', 'bottom-1 right-1.5'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-5 h-5 ${i === 3 ? 'bg-primary' : 'bg-secondary/50'} rounded-full flex items-center justify-center`}>
              <span className="text-white text-[8px] font-bold">{i + 1}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-white/30 text-center mt-1">Klik op zone om te bewerken</p>
      </div>
      {/* Block list */}
      <div className="space-y-1.5">
        {[
          { icon: Users,    label: 'Taakomschrijving',   done: true },
          { icon: MapPin,   label: 'Locatie & route',     done: true },
          { icon: Clock,    label: 'Tijdschema',          done: false },
          { icon: Bell,     label: 'Noodprocedures',      done: false },
        ].map(({ icon: Icon, label, done }, i) => (
          <div key={i} className="flex items-center gap-2 bg-white/3 rounded-lg px-3 py-2">
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${done ? 'bg-primary border-primary' : 'border-white/20'}`}>
              {done && <CheckCircle className="w-2.5 h-2.5 text-white" />}
            </div>
            <Icon className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[9px] text-white/60">{label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── SEPA screen ──────────────────────────────────────────────────
const ScreenSepa = () => (
  <div className="flex h-full text-white">
    <div className="w-14 bg-[hsl(220,25%,8%)] flex flex-col items-center py-4 gap-4 border-r border-white/5">
      <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center mb-2">
        <span className="text-primary text-[9px] font-bold">12</span>
      </div>
      {[LayoutDashboard, Users, FileSignature, ClipboardList, CreditCard].map((Icon, i) => (
        <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center ${i === 4 ? 'bg-primary/20' : ''}`}>
          <Icon className={`w-4 h-4 ${i === 4 ? 'text-primary' : 'text-white/30'}`} />
        </div>
      ))}
    </div>
    <div className="flex-1 p-5 overflow-hidden">
      <p className="font-heading font-bold text-white text-base mb-4">SEPA Uitbetalingen</p>
      {/* Summary */}
      <div className="bg-[hsl(180,30%,12%)] border border-[hsl(180,30%,20%)] rounded-xl p-3 mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-white/40">Totaal · Za 22 mrt</span>
          <span className="font-heading font-bold text-secondary text-base">€ 440,00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[9px] text-white/30">22 vrijwilligers</span>
          <span className="text-[9px] text-white/30">Avg. €20/persoon</span>
        </div>
      </div>
      {/* Payout rows */}
      <div className="space-y-1.5 mb-4">
        {[
          { name: 'Jan Pieters',   amount: '€25,00', iban: 'BE68 ···· 1234' },
          { name: 'Marie Claes',   amount: '€20,00', iban: 'BE12 ···· 5678' },
          { name: 'Pieter Maes',   amount: '€25,00', iban: 'BE99 ···· 9012' },
          { name: '+ 19 anderen',  amount: '€370,00',iban: '' },
        ].map((p, i) => (
          <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${i < 3 ? 'bg-white/3' : 'bg-transparent'}`}>
            <div>
              <p className="text-[9px] font-semibold text-white">{p.name}</p>
              {p.iban && <p className="text-[7px] text-white/25 font-mono">{p.iban}</p>}
            </div>
            <span className="text-[9px] font-semibold text-secondary">{p.amount}</span>
          </div>
        ))}
      </div>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-secondary rounded-xl py-2.5 text-center text-[11px] font-bold text-white cursor-pointer"
      >
        SEPA-bestand downloaden (.xml)
      </motion.div>
    </div>
  </div>
);

const SCREEN_ORDER = ['dashboard', 'contracts', 'briefing', 'sepa'];
const CLUB_SCREENS: Record<string, React.FC> = {
  dashboard: ScreenClubDashboard,
  contracts: ScreenContracts,
  briefing:  ScreenBriefingBuilder,
  sepa:      ScreenSepa,
};
const TAB_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { id: 'contracts', icon: FileSignature,   label: 'Contracten' },
  { id: 'briefing',  icon: ClipboardList,   label: 'Briefings'  },
  { id: 'sepa',      icon: CreditCard,      label: 'SEPA'       },
];

export const ClubDemoSection = ({
  sectionLabel, sectionTitle, sectionSubtitle, screens,
}: ClubDemoSectionProps) => {
  const [activeScreen, setActiveScreen] = useState(0);
  const isMobile = useIsMobile();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setIsVisible(e.isIntersecting), { threshold: 0.3 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    timerRef.current = setInterval(() => setActiveScreen(p => (p + 1) % SCREEN_ORDER.length), 3200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isVisible]);

  const currentId = SCREEN_ORDER[activeScreen];
  const ActiveScreen = CLUB_SCREENS[currentId];

  return (
    <section ref={sectionRef} className="py-28 px-4 bg-muted/20 overflow-hidden">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-4">{sectionLabel}</p>
          <h2 className="font-heading font-bold text-foreground text-4xl md:text-5xl mb-5">{sectionTitle}</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">{sectionSubtitle}</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-start justify-center gap-10 lg:gap-16">
          {/* Browser mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative flex-shrink-0"
          >
            <div className="absolute inset-0 rounded-2xl blur-3xl opacity-15 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, hsl(180,45%,30%) 0%, transparent 70%)' }}
            />
            <BrowserFrame>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                  className="h-full"
                >
                  <ActiveScreen />
                </motion.div>
              </AnimatePresence>
            </BrowserFrame>
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-xs w-full"
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
                        ? 'bg-card border-secondary/25 shadow-[0_4px_24px_-4px_hsla(180,45%,30%,0.2)]'
                        : 'bg-card/60 border-border/40 hover:bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-secondary/10' : 'bg-muted'}`}>
                        {screen.tabIcon}
                      </div>
                      <p className={`font-heading font-semibold text-base ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {screen.tabLabel}
                      </p>
                      {isActive && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto w-2 h-2 rounded-full bg-secondary" />
                      )}
                    </div>
                    {isActive && (
                      <motion.div className="mt-3 h-0.5 bg-muted rounded-full overflow-hidden">
                        <motion.div className="h-full bg-secondary rounded-full" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3.2, ease: 'linear' }} />
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
