import { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import {
  Calendar, FileSignature, ClipboardList, Users, Bell,
  CheckCircle, AlertTriangle, MapPin, CreditCard, BarChart3,
  Globe, Clock,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface StoryChapter {
  num: string;
  title: string;
  subtitle: string;
  desc: string;
}

interface ClubStorySectionProps {
  sectionLabel: string;
  sectionTitle: string;
  chapters: StoryChapter[];
}

const CHAPTER_BG = [
  'hsl(180, 20%, 97%)',  // soft teal   – evenement aanmaken
  'hsl(210, 28%, 97%)',  // soft blue   – contracten
  'hsl(145, 18%, 96%)',  // soft green  – briefing builder
  'hsl(40, 28%, 96%)',   // warm cream  – dag van de wedstrijd
  'hsl(35, 25%, 96%)',   // amber       – live meldingen
  'hsl(180, 18%, 96%)',  // teal        – SEPA betalingen
];

// ── Scene illustrations ──────────────────────────────────────────

const SceneCreateEvent = () => (
  <div className="bg-white rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.18)] p-6 w-72 border border-black/5">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-secondary/12 rounded-2xl flex items-center justify-center">
        <Calendar className="w-5 h-5 text-secondary" />
      </div>
      <div>
        <p className="font-heading font-semibold text-foreground text-sm">Nieuw evenement</p>
        <p className="text-xs text-muted-foreground">FC Lokeren-Temse</p>
      </div>
    </div>
    {/* Event card being created */}
    <div className="bg-muted/50 rounded-2xl p-4 mb-4 border border-dashed border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="font-heading font-semibold text-foreground text-sm">Thuis · KVC Westerlo</p>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Competitie</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Za 22 mrt</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />14:30</span>
      </div>
    </div>
    {/* Volunteer slots */}
    <p className="text-xs text-muted-foreground mb-2">Vrijwilligers nodig</p>
    <div className="space-y-2">
      {[
        { role: 'Stewards', needed: 12, filled: 0 },
        { role: 'Bar & Catering', needed: 6, filled: 0 },
        { role: 'Ticketing', needed: 4, filled: 0 },
      ].map((slot) => (
        <div key={slot.role} className="flex items-center justify-between">
          <span className="text-xs text-foreground">{slot.role}</span>
          <span className="text-xs font-semibold text-primary">{slot.filled}/{slot.needed}</span>
        </div>
      ))}
    </div>
    <div className="mt-4 bg-primary rounded-xl py-2.5 text-center text-sm text-white font-semibold">
      Evenement aanmaken
    </div>
  </div>
);

const SceneSendContracts = () => (
  <div className="bg-white rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.18)] p-6 w-72 border border-black/5">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-accent/12 rounded-2xl flex items-center justify-center">
        <FileSignature className="w-5 h-5 text-accent" />
      </div>
      <div>
        <p className="font-heading font-semibold text-foreground text-sm">Seizoenscontracten</p>
        <p className="text-xs text-muted-foreground">Batch versturen</p>
      </div>
    </div>
    {/* Volunteer list */}
    <div className="space-y-2 mb-4">
      {[
        { name: 'Jan Pieters',    status: 'signed',  time: '09:14' },
        { name: 'Marie Claes',   status: 'signed',  time: '10:02' },
        { name: 'Pieter Maes',   status: 'pending', time: '–' },
        { name: 'Sophie De Wolf',status: 'pending', time: '–' },
      ].map((v) => (
        <div key={v.name} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${v.status === 'signed' ? 'bg-accent' : 'bg-amber-400'}`} />
            <span className="text-xs text-foreground">{v.name}</span>
          </div>
          <span className={`text-[10px] font-semibold ${v.status === 'signed' ? 'text-accent' : 'text-amber-500'}`}>
            {v.status === 'signed' ? `Getekend ${v.time}` : 'In afwachting'}
          </span>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between bg-accent/8 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-accent" />
        <span className="text-xs font-semibold text-foreground">2 / 4 ondertekend</span>
      </div>
      <span className="text-xs text-muted-foreground">Automatisch verstuurd</span>
    </div>
  </div>
);

const SceneBriefingBuilder = () => (
  <div className="bg-white rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.18)] p-6 w-72 border border-black/5">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-primary/12 rounded-2xl flex items-center justify-center">
        <ClipboardList className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="font-heading font-semibold text-foreground text-sm">Briefing Builder</p>
        <p className="text-xs text-muted-foreground">Steward · Poort 4</p>
      </div>
    </div>
    {/* Zone assignment */}
    <div className="bg-accent/6 rounded-xl p-3 mb-3 relative">
      <div className="border border-accent/25 rounded-lg h-20 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border border-accent/25 rounded-full" />
        </div>
        <div className="absolute left-0 right-0 top-1/2 h-px bg-accent/20" />
        {/* Assigned zones */}
        {[
          { pos: 'top-1 right-1.5',  label: '1', name: 'Poort 1' },
          { pos: 'top-1 left-1.5',   label: '2', name: 'Poort 2' },
          { pos: 'bottom-1 left-1.5',label: '3', name: 'Poort 3' },
          { pos: 'bottom-1 right-1.5',label: '4', name: 'Poort 4' },
        ].map((z) => (
          <div key={z.label} className={`absolute ${z.pos} w-5 h-5 ${z.label === '4' ? 'bg-primary' : 'bg-secondary/40'} rounded-full flex items-center justify-center`}>
            <span className="text-white text-[8px] font-bold">{z.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-center text-muted-foreground mt-1">Zones toegewezen</p>
    </div>
    {/* Language note */}
    <div className="flex items-center gap-2 bg-secondary/8 rounded-xl px-3 py-2 mb-3">
      <Globe className="w-4 h-4 text-secondary shrink-0" />
      <span className="text-xs text-secondary font-medium">Automatisch vertaald naar NL · FR · EN</span>
    </div>
    {/* Send button */}
    <div className="bg-primary rounded-xl py-2.5 text-center text-sm text-white font-semibold">
      Verstuur briefings naar 12 vrijwilligers
    </div>
  </div>
);

const SceneLiveDashboard = () => (
  <div className="bg-white rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.18)] p-6 w-72 border border-black/5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="font-heading font-semibold text-foreground text-sm">Live Dashboard</p>
        <p className="text-xs text-muted-foreground">Za 22 mrt · 14:30</p>
      </div>
      <div className="flex items-center gap-1.5 bg-accent/10 text-accent px-2.5 py-1 rounded-full">
        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <span className="text-[10px] font-semibold">Live</span>
      </div>
    </div>
    {/* Check-in progress */}
    <div className="bg-muted/50 rounded-2xl p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Ingecheckt</span>
        <span className="font-heading font-bold text-foreground text-sm">18 / 22</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          whileInView={{ width: '82%' }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <p className="text-[9px] text-muted-foreground mt-1.5">4 vrijwilligers onderweg</p>
    </div>
    {/* Volunteer status */}
    <div className="space-y-2">
      {[
        { name: 'Jan Pieters',    zone: 'Poort 4', status: 'in' },
        { name: 'Marie Claes',   zone: 'Bar',     status: 'in' },
        { name: 'Pieter Maes',   zone: 'Poort 2', status: 'way' },
        { name: 'Sophie De Wolf',zone: 'Ticketing',status: 'in' },
      ].map((v) => (
        <div key={v.name} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${v.status === 'in' ? 'bg-accent' : 'bg-amber-400'}`} />
            <span className="text-xs text-foreground">{v.name}</span>
          </div>
          <span className={`text-[10px] font-medium ${v.status === 'in' ? 'text-accent' : 'text-amber-500'}`}>
            {v.status === 'in' ? v.zone : 'Onderweg'}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const SceneLiveAlerts = () => (
  <div className="space-y-3 w-72">
    {/* Send alert panel */}
    <div className="bg-white rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] p-4 border border-black/5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
          <Bell className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Live melding sturen</p>
          <p className="text-xs text-muted-foreground">Naar geselecteerde zones</p>
        </div>
      </div>
      <div className="bg-muted/50 rounded-xl p-2.5 mb-3">
        <p className="text-xs text-foreground">Incident Zone B — versterk aanwezig bij Tribune Oost rij 12.</p>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs text-primary font-medium">Tribune Oost · Rij 12 · Stoelen 34–40</span>
      </div>
      <div className="bg-amber-500 rounded-xl py-2 text-center text-sm text-white font-semibold">
        Verstuur naar 4 stewards
      </div>
    </div>
    {/* Confirmation */}
    <div className="bg-white rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] p-4 border border-accent/20">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-accent" />
        <p className="text-sm font-semibold text-foreground">Melding afgeleverd</p>
      </div>
      <p className="text-xs text-muted-foreground mt-1">4/4 vrijwilligers ontvangen · 73'</p>
    </div>
  </div>
);

const SceneSepaPayouts = () => (
  <div className="bg-white rounded-3xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.18)] p-6 w-72 border border-black/5">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-secondary/12 rounded-2xl flex items-center justify-center">
        <CreditCard className="w-5 h-5 text-secondary" />
      </div>
      <div>
        <p className="font-heading font-semibold text-foreground text-sm">SEPA Uitbetalingen</p>
        <p className="text-xs text-muted-foreground">Na de wedstrijd · Automatisch</p>
      </div>
    </div>
    {/* Payout summary */}
    <div className="bg-secondary/6 rounded-xl p-3 mb-4 border border-secondary/15">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Totaal uit te betalen</span>
        <span className="font-heading font-bold text-secondary text-lg">€ 440,00</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">Vrijwilligers</span>
        <span className="text-xs font-semibold text-foreground">22 personen</span>
      </div>
    </div>
    {/* Payment list */}
    <div className="space-y-2 mb-4">
      {[
        { name: 'Jan Pieters',    amount: '€25,00' },
        { name: 'Marie Claes',   amount: '€20,00' },
        { name: 'Pieter Maes',   amount: '€25,00' },
      ].map((p) => (
        <div key={p.name} className="flex items-center justify-between">
          <span className="text-xs text-foreground">{p.name}</span>
          <span className="text-xs font-semibold text-secondary">{p.amount}</span>
        </div>
      ))}
      <p className="text-[9px] text-muted-foreground">+ 19 anderen</p>
    </div>
    <div className="bg-secondary rounded-xl py-2.5 text-center text-sm text-white font-semibold">
      SEPA-bestand genereren
    </div>
  </div>
);

const SCENES = [SceneCreateEvent, SceneSendContracts, SceneBriefingBuilder, SceneLiveDashboard, SceneLiveAlerts, SceneSepaPayouts];

const MobileTimeline = ({ chapters }: { chapters: StoryChapter[] }) => (
  <div className="space-y-0">
    {chapters.map((ch, i) => {
      const Scene = SCENES[i];
      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="py-16 px-4"
          style={{ backgroundColor: CHAPTER_BG[i] }}
        >
          <div className="max-w-md mx-auto">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">{ch.num}</p>
            <h3 className="font-heading font-bold text-foreground text-3xl leading-tight mb-2">{ch.title}</h3>
            <p className="text-base font-semibold text-secondary mb-4">{ch.subtitle}</p>
            <p className="text-base text-muted-foreground leading-relaxed mb-8">{ch.desc}</p>
            <div className="flex justify-center"><Scene /></div>
          </div>
        </motion.div>
      );
    })}
  </div>
);

export const ClubStorySection = ({ sectionLabel, sectionTitle, chapters }: ClubStorySectionProps) => {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (val) => {
    const newIdx = Math.min(chapters.length - 1, Math.floor(val * chapters.length));
    if (newIdx !== activeIdx) setActiveIdx(newIdx);
  });

  if (isMobile) {
    return (
      <section>
        <div className="py-20 px-4 text-center bg-background">
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">{sectionLabel}</p>
          <h2 className="font-heading font-bold text-foreground text-4xl">{sectionTitle}</h2>
        </div>
        <MobileTimeline chapters={chapters} />
      </section>
    );
  }

  const ActiveScene = SCENES[activeIdx];

  return (
    <section ref={containerRef} style={{ height: `${chapters.length * 100}vh` }}>
      <div
        className="sticky top-0 h-screen overflow-hidden"
        style={{ backgroundColor: CHAPTER_BG[activeIdx], transition: 'background-color 0.7s cubic-bezier(0.4,0,0.2,1)' }}
      >
        <div className="h-full max-w-7xl mx-auto px-8 lg:px-16 flex items-center">
          <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 w-full">
            {/* Left: Text */}
            <div className="flex flex-col justify-center">
              <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-8">{sectionLabel}</p>
              <div className="flex items-center gap-2 mb-10">
                {chapters.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ width: i === activeIdx ? 32 : 8, opacity: i === activeIdx ? 1 : 0.3 }}
                    transition={{ duration: 0.4 }}
                    className="h-1.5 rounded-full bg-foreground"
                  />
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.45 }}
                >
                  <p className="text-sm font-bold text-secondary/70 mb-4">{chapters[activeIdx].num}</p>
                  <h2 className="font-heading font-bold text-foreground leading-tight mb-3"
                    style={{ fontSize: 'clamp(2rem, 3.5vw, 3.25rem)' }}>
                    {chapters[activeIdx].title}
                  </h2>
                  <p className="text-lg font-semibold text-secondary mb-5">{chapters[activeIdx].subtitle}</p>
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">{chapters[activeIdx].desc}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            {/* Right: Scene */}
            <div className="flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0, scale: 0.94, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -12 }}
                  transition={{ duration: 0.45 }}
                >
                  <ActiveScene />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
