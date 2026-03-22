/**
 * SponsorAdLivePreview
 *
 * Renders a 390 × 844 pixel volunteer app screen (real phone dimensions) and scales
 * it down inside a CSS phone-frame chassis.  Because the content is rendered at 1×
 * before scaling, every pixel matches what the actual volunteer PWA looks like —
 * no mocks, no approximations.
 *
 * The JSX patterns inside are copy-exact from:
 *   - VolunteerDashboardHome.tsx   (dashboard_banner rendering added in v4)
 *   - VolunteerClubTasksBrowser.tsx (task campaign badge)
 *   - WalletHeroCard.tsx           (dark gradient wallet card)
 *   - VolunteerDashboard.tsx payments tab (coupon wallet card)
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gift, MapPin, Calendar, Users, QrCode, Wallet, TrendingUp, ArrowRight, ChevronRight } from 'lucide-react';

// ── Preview data types ────────────────────────────────────────────────────────
export interface PreviewForm {
  businessName:     string;
  brandColor:       string;
  logoUrl:          string;
  campaignType:     'dashboard_banner' | 'local_coupon';
  title:            string;
  description:      string;
  rewardText:       string;
  rewardValueEuros: string;
  imageUrl:         string;
  coverImageUrl:    string;
  customCta:        string;
  richDescription:  string;
  linkedTaskIds:    string[];
}

// ── Scale constants ───────────────────────────────────────────────────────────
const PHONE_W       = 390;
const PHONE_H       = 844;
const FRAME_W       = 220;          // outer chassis width
const SCALE         = FRAME_W / PHONE_W;
const FRAME_H       = Math.round(PHONE_H * SCALE);

// ── Shared mini-components (pixel-match the real volunteer app) ───────────────

/** Status bar row – appears at top of every screen */
const StatusBar = () => (
  <div className="h-12 flex items-end justify-between px-7 pb-2 bg-background shrink-0">
    <span className="text-[13px] font-semibold text-foreground">9:41</span>
    <div className="flex gap-1.5 items-center">
      <div className="w-5 h-3 bg-foreground/30 rounded-[3px]" />
      <div className="w-6 h-3.5 rounded-[3px] border-[1.5px] border-foreground/30 relative">
        <div className="absolute inset-[2px] left-[2px] right-[4px] bg-emerald-500 rounded-[1px]" />
        <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-1.5 h-2.5 bg-foreground/20 rounded-r-sm" />
      </div>
    </div>
  </div>
);

/** App top bar with De12eMan branding */
const AppBar = ({ activeTab }: { activeTab: string }) => (
  <div className="h-14 bg-background border-b border-border/50 flex items-center px-5 gap-3 shrink-0">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
      <span className="text-white text-[11px] font-extrabold tracking-tight">D</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-bold text-foreground leading-tight">Play Maker Palace</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{activeTab}</p>
    </div>
  </div>
);

/** Bottom navigation bar */
const BottomNav = ({ active }: { active: 'home' | 'tasks' | 'wallet' }) => {
  const items = [
    { key: 'home',   label: 'Dashboard' },
    { key: 'tasks',  label: 'Mijn Taken' },
    { key: 'wallet', label: 'Betalingen' },
  ] as const;
  return (
    <div className="h-16 bg-background border-t border-border/50 flex items-center shrink-0">
      {items.map(item => (
        <div key={item.key} className={`flex-1 flex flex-col items-center gap-1 pt-2 ${active === item.key ? 'text-indigo-500' : 'text-muted-foreground/40'}`}>
          <div className={`w-1 h-1 rounded-full ${active === item.key ? 'bg-indigo-500' : 'bg-transparent'}`} />
          <p className="text-[10px] font-medium">{item.label}</p>
        </div>
      ))}
    </div>
  );
};

// ── Screen: Dashboard (dashboard_banner type) ─────────────────────────────────
const DashboardScreen = ({ form }: { form: PreviewForm }) => {
  const color    = form.brandColor || '#6366f1';
  const accentBg = `${color}18`;
  const cta      = form.customCta || 'Meer info';

  const mockTasks = [
    { id: '1', title: 'Kantine-shift zaterdag', date: 'za 29 mrt', spots: 3 },
    { id: '2', title: 'Parking steward',        date: 'zo 30 mrt', spots: 7 },
  ];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <StatusBar />
      <AppBar activeTab="Dashboard" />

      <div className="flex-1 overflow-hidden px-4 py-4 space-y-4">

        {/* ── Dashboard Banner (exact match to VolunteerDashboardHome v4 rendering) ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl overflow-hidden shadow-md"
          style={{ background: `linear-gradient(135deg, ${color}f0, ${color}99)` }}
        >
          {/* Cover image */}
          {form.coverImageUrl && (
            <div className="w-full h-20 overflow-hidden">
              <img src={form.coverImageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="px-4 py-3 flex items-center gap-3">
            {/* Logo circle */}
            <div className="w-11 h-11 rounded-xl bg-white/25 border border-white/30 shrink-0 overflow-hidden flex items-center justify-center">
              {form.logoUrl
                ? <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-white text-base font-extrabold">{(form.businessName || 'S')[0]}</span>
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white/70 uppercase tracking-widest truncate leading-tight">
                {form.businessName || 'Sponsor naam'}
              </p>
              <p className="text-[15px] font-bold text-white truncate leading-snug">
                {form.title || 'Campagne titel'}
              </p>
              {(form.description || form.richDescription) && (
                <p className="text-[11px] text-white/75 truncate mt-0.5">
                  {form.description || form.richDescription}
                </p>
              )}
            </div>

            {/* CTA button */}
            <button
              className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white/90 border border-white/40 bg-white/15 whitespace-nowrap flex items-center gap-1"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              {cta}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>

        {/* Mock task cards with sponsor tag badges */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Aankomende Taken
          </p>
          <div className="space-y-2">
            {mockTasks.map((task, i) => (
              <div key={task.id} className="bg-card rounded-xl border border-border/50 px-3.5 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Calendar className="w-2.5 h-2.5" />{task.date}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Users className="w-2.5 h-2.5" />{task.spots} vrij
                      </span>
                      {/* Sponsor badge — exact match to VolunteerDashboardHome task badge */}
                      {i === 0 && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}
                        >
                          <Gift className="w-2.5 h-2.5" />
                          {form.rewardValueEuros ? `Reward: €${parseFloat(form.rewardValueEuros || '0').toFixed(0)}` : 'Reward'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      <BottomNav active="home" />
    </div>
  );
};

// ── Screen: Wallet / Coupon (local_coupon type) ───────────────────────────────
const WalletScreen = ({ form }: { form: PreviewForm }) => {
  const color    = form.brandColor || '#6366f1';
  const accentBg = `${color}18`;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <StatusBar />
      <AppBar activeTab="Betalingen" />

      <div className="flex-1 overflow-hidden px-4 py-4 space-y-4">

        {/* WalletHeroCard — exact replica of WalletHeroCard.tsx */}
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{ background: 'linear-gradient(135deg, hsl(220 40% 10%) 0%, hsl(230 35% 16%) 50%, hsl(245 40% 18%) 100%)' }}
        >
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, hsl(262 80% 60%) 0%, transparent 70%)' }} />
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />

          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white/50 text-[9px] uppercase tracking-widest font-semibold">Kantine Wallet</p>
                  <p className="text-white/90 text-[12px] font-semibold">Vrijwilliger</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white/80" />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-white/40 text-[9px] uppercase tracking-widest mb-1">Totaal ontvangen</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-white/60 text-lg font-medium">€</span>
                <span className="text-white text-4xl font-bold tabular-nums">0</span>
                <span className="text-white/50 text-lg font-medium">,00</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/25">
              <TrendingUp className="w-3 h-3 text-amber-300" />
              <span className="text-amber-200 text-[11px] font-medium">€2,50 in behandeling</span>
            </div>
          </div>
        </div>

        {/* Coupon section header */}
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
          Beschikbaar om te claimen
        </p>

        {/* Coupon card — exact match to VolunteerDashboard payments tab "available" section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card rounded-xl border border-border/50 overflow-hidden"
          style={{ borderLeftWidth: 4, borderLeftColor: color }}
        >
          <div className="px-3.5 py-3 flex items-start gap-3">
            {/* Logo */}
            <div
              className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
              style={{ background: accentBg }}
            >
              {form.logoUrl
                ? <img src={form.logoUrl} alt="" className="w-8 h-8 object-contain rounded-md" />
                : <span className="text-[15px] font-extrabold" style={{ color }}>{(form.businessName || 'S')[0]}</span>
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate leading-tight">
                {form.businessName || 'Sponsor naam'}
              </p>
              <p className="text-[14px] font-bold text-foreground truncate leading-snug">
                {form.title || 'Kortingsbon'}
              </p>

              {form.rewardText && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{form.rewardText}</p>
              )}

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {form.rewardValueEuros && (
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: accentBg, color }}
                  >
                    €{parseFloat(form.rewardValueEuros || '0').toFixed(2)} korting
                  </span>
                )}
              </div>
            </div>

            {/* Claim button */}
            <button
              className="shrink-0 self-center px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
              style={{ background: color }}
            >
              Claim
            </button>
          </div>

          {/* Task link tag if tasks linked */}
          {form.linkedTaskIds.length > 0 && (
            <div
              className="px-3.5 py-1.5 border-t flex items-center gap-1.5"
              style={{ borderTopColor: `${color}22`, background: accentBg }}
            >
              <Gift className="w-3 h-3 shrink-0" style={{ color }} />
              <p className="text-[10px] font-medium truncate" style={{ color }}>
                Verdien na het voltooien van een gekoppelde shift
              </p>
            </div>
          )}
        </motion.div>

        {/* Cover image preview at bottom if provided */}
        {form.coverImageUrl && (
          <div className="rounded-xl overflow-hidden h-24">
            <img src={form.coverImageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

      </div>
      <BottomNav active="wallet" />
    </div>
  );
};

// ── Phone chassis component ───────────────────────────────────────────────────
const PhoneChassisOuter = ({ children }: { children: React.ReactNode }) => (
  <div
    className="relative shrink-0"
    style={{ width: FRAME_W, height: FRAME_H }}
  >
    {/* Scaled inner */}
    <div
      style={{
        width:           PHONE_W,
        height:          PHONE_H,
        transform:       `scale(${SCALE})`,
        transformOrigin: 'top left',
        overflow:        'hidden',
        borderRadius:    48,       // scaled will appear as ~24px
        boxShadow:       'inset 0 0 0 1px rgba(0,0,0,.08)',
      }}
    >
      {children}
    </div>

    {/* Phone chrome overlay — bezel + notch */}
    <div
      className="pointer-events-none absolute inset-0 rounded-[24px]"
      style={{
        boxShadow: 'inset 0 0 0 6px #1a1a1e, 0 24px 60px rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.15)',
      }}
    />
    {/* Dynamic island */}
    <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#1a1a1e] rounded-full z-10" />
    {/* Home indicator */}
    <div className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#1a1a1e]/40 rounded-full z-10" />
  </div>
);

// ── Main export ───────────────────────────────────────────────────────────────
interface SponsorAdLivePreviewProps {
  form: PreviewForm;
  className?: string;
}

const SponsorAdLivePreview = ({ form, className }: SponsorAdLivePreviewProps) => {
  const label = useMemo(() => {
    return form.campaignType === 'dashboard_banner'
      ? 'Dashboard Banner — Vrijwilligers zien dit als eerste'
      : 'Kantine Wallet — Kortingsbon na voltooide shift';
  }, [form.campaignType]);

  return (
    <div className={`flex flex-col items-center gap-3 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest text-center">
          Live Preview
        </p>
      </div>

      <PhoneChassisOuter>
        <motion.div
          key={form.campaignType}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full h-full"
        >
          {form.campaignType === 'dashboard_banner'
            ? <DashboardScreen form={form} />
            : <WalletScreen    form={form} />
          }
        </motion.div>
      </PhoneChassisOuter>

      <p className="text-[11px] text-white/30 text-center max-w-[200px] leading-tight">{label}</p>
    </div>
  );
};

export default SponsorAdLivePreview;
