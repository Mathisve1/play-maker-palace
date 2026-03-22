import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Loader2, Smartphone, Megaphone, Gift, Tag, ExternalLink, ShieldCheck } from 'lucide-react';

interface Campaign {
  id: string;
  club_id: string;
  sponsor_id: string;
  campaign_type: 'dashboard_banner' | 'task_tag' | 'local_coupon';
  title: string;
  description: string | null;
  reward_value_cents: number | null;
  status: 'draft' | 'active' | 'ended';
  start_date: string | null;
  end_date: string | null;
  sponsors: {
    name: string;
    logo_url: string | null;
    brand_color: string;
  } | null;
}

// ── Phone Mockup ──────────────────────────────────────────────────────────────
const PhoneMockup = ({ children }: { children: React.ReactNode }) => (
  <div className="relative mx-auto" style={{ width: 320 }}>
    {/* Phone shell */}
    <div
      className="relative rounded-[44px] bg-gray-900 shadow-[0_40px_120px_rgba(0,0,0,0.4),inset_0_0_0_2px_rgba(255,255,255,0.08)]"
      style={{ paddingTop: 12, paddingBottom: 16, paddingLeft: 10, paddingRight: 10 }}
    >
      {/* Side buttons */}
      <div className="absolute -left-[3px] top-[88px] w-[3px] h-8 rounded-l-full bg-gray-700" />
      <div className="absolute -left-[3px] top-[132px] w-[3px] h-12 rounded-l-full bg-gray-700" />
      <div className="absolute -left-[3px] top-[188px] w-[3px] h-12 rounded-l-full bg-gray-700" />
      <div className="absolute -right-[3px] top-[120px] w-[3px] h-16 rounded-r-full bg-gray-700" />

      {/* Screen */}
      <div className="rounded-[36px] overflow-hidden bg-[#f0f2f5] dark:bg-gray-950" style={{ minHeight: 620 }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-white dark:bg-gray-900">
          <span className="text-[11px] font-semibold text-gray-900 dark:text-white tabular-nums">9:41</span>
          {/* Dynamic island */}
          <div className="w-20 h-6 bg-gray-900 dark:bg-black rounded-full mx-auto" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 12 }} />
          <div className="flex items-center gap-1">
            <div className="flex gap-[2px] items-end">
              {[3, 5, 7, 9].map((h, i) => (
                <div key={i} className="w-[3px] rounded-sm bg-gray-900 dark:bg-white" style={{ height: h }} />
              ))}
            </div>
            <svg viewBox="0 0 16 12" className="w-3.5 text-gray-900 dark:text-white fill-current"><path d="M8 2.4C10.3 2.4 12.3 3.4 13.6 5l1.5-1.5C13.4 1.3 10.9 0 8 0 5.1 0 2.6 1.3.9 3.5L2.4 5C3.7 3.4 5.7 2.4 8 2.4z"/><path d="M8 5.2c1.4 0 2.7.6 3.6 1.5l1.5-1.5C11.9 3.9 10.1 3 8 3S4.1 3.9 2.9 5.2l1.5 1.5C5.3 5.8 6.6 5.2 8 5.2z"/><circle cx="8" cy="9.5" r="1.5"/></svg>
            <div className="flex items-center">
              <div className="w-5 h-2.5 rounded-[2px] border border-gray-900 dark:border-white relative">
                <div className="absolute inset-y-[2px] left-[2px] w-2.5 bg-gray-900 dark:bg-white rounded-[1px]" />
              </div>
              <div className="w-[2px] h-1.5 bg-gray-900 dark:bg-white rounded-r-full ml-[1px]" />
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  </div>
);

// ── Dashboard Banner Preview ───────────────────────────────────────────────────
const DashboardBannerPreview = ({ campaign }: { campaign: Campaign }) => {
  const color = campaign.sponsors?.brand_color || '#6366f1';
  return (
    <div className="bg-white dark:bg-gray-900" style={{ minHeight: 580 }}>
      {/* App header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
            <span className="text-[8px] font-black text-white">PM</span>
          </div>
          <span className="text-[11px] font-bold text-gray-900 dark:text-white">Play Maker</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800" />
      </div>

      {/* Sponsor banner — this is what the volunteer sees */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mx-3 mt-3 rounded-2xl overflow-hidden shadow-sm"
        style={{ background: `linear-gradient(135deg, ${color}ee, ${color}aa)` }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {campaign.sponsors?.logo_url ? (
              <img src={campaign.sponsors.logo_url} alt="" className="w-8 h-8 rounded-full object-cover bg-white/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-[11px] font-bold text-white">{(campaign.sponsors?.name || 'S')[0]}</span>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-white/70 leading-tight uppercase tracking-wide">
                {campaign.sponsors?.name || 'Sponsor'}
              </p>
              <p className="text-[13px] font-bold text-white leading-tight">{campaign.title}</p>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-semibold text-white">
            Meer info →
          </div>
        </div>
        {campaign.description && (
          <div className="px-4 pb-3">
            <p className="text-[11px] text-white/80 leading-relaxed">{campaign.description}</p>
          </div>
        )}
      </motion.div>

      {/* Mock dashboard content below banner */}
      <div className="px-3 mt-3 space-y-2">
        {[
          { title: 'Steward Stadion', date: 'Za 25 mei', spots: 3, color: '#10b981' },
          { title: 'Bar Tornooi', date: 'Zo 26 mei', spots: 5, color: '#3b82f6' },
          { title: 'Materiaaldienst', date: 'Za 1 juni', spots: 2, color: '#f59e0b' },
        ].map(t => (
          <div key={t.title} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50">
            <div className="w-1 h-8 rounded-full shrink-0" style={{ background: t.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-gray-900 dark:text-white truncate">{t.title}</p>
              <p className="text-[10px] text-gray-400">{t.date} · {t.spots} plaatsen</p>
            </div>
            <div className="w-16 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Coupon Preview ─────────────────────────────────────────────────────────────
const CouponPreview = ({ campaign }: { campaign: Campaign }) => {
  const color = campaign.sponsors?.brand_color || '#6366f1';
  const rewardEur = campaign.reward_value_cents ? (campaign.reward_value_cents / 100).toFixed(2) : null;

  return (
    <div className="bg-white dark:bg-gray-900" style={{ minHeight: 580 }}>
      {/* App header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
            <span className="text-[8px] font-black text-white">PM</span>
          </div>
          <span className="text-[11px] font-bold text-gray-900 dark:text-white">Mijn Wallet</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800" />
      </div>

      {/* Section label */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Lokale Beloningen</p>
      </div>

      {/* Coupon card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="mx-3 rounded-2xl overflow-hidden shadow-md"
        style={{ background: `linear-gradient(135deg, ${color}f0, ${color}99)` }}
      >
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wide">
                {campaign.sponsors?.name || 'Sponsor'}
              </p>
              <p className="text-[16px] font-bold text-white mt-0.5 leading-tight">{campaign.title}</p>
              {campaign.description && (
                <p className="text-[11px] text-white/80 mt-1 leading-relaxed">{campaign.description}</p>
              )}
            </div>
            {rewardEur && (
              <div className="shrink-0 ml-3 bg-white/20 rounded-xl px-3 py-2 text-center">
                <p className="text-[20px] font-black text-white leading-tight">€{rewardEur}</p>
                <p className="text-[9px] text-white/70">korting</p>
              </div>
            )}
          </div>
        </div>

        {/* Dashed divider */}
        <div className="mx-4 border-t border-dashed border-white/30" />

        {/* QR placeholder */}
        <div className="px-4 py-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-white p-1.5 shadow-sm">
            <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
              <Gift className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-white/80">Toon dit aan de handelaar</p>
            <p className="text-[10px] text-white/60 mt-0.5">Éénmalig te gebruiken</p>
          </div>
        </div>
      </motion.div>

      {/* Mock wallet content */}
      <div className="px-3 mt-3 space-y-2">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
            <span className="text-[10px] font-bold text-indigo-600">€</span>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-gray-900 dark:text-white">Kantegoed</p>
            <p className="text-[10px] text-gray-400">€12,50 beschikbaar</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const SponsorPreview = () => {
  const { campaign_id } = useParams<{ campaign_id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    if (!campaign_id) { setError(true); setLoading(false); return; }
    supabase
      .from('sponsor_campaigns' as any)
      .select('*, sponsors(name, logo_url, brand_color)')
      .eq('id', campaign_id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) setError(true);
        else setCampaign(data as Campaign);
        setLoading(false);
      });
  }, [campaign_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white/40">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Campaign not found or expired.</p>
        </div>
      </div>
    );
  }

  const color = campaign.sponsors?.brand_color || '#6366f1';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center px-4 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 max-w-sm"
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 text-white"
          style={{ background: `${color}33`, border: `1px solid ${color}55` }}
        >
          <Smartphone className="w-3.5 h-3.5" style={{ color }} />
          <span style={{ color }}>Campaign Preview</span>
        </div>
        <h1 className="text-2xl font-bold text-white leading-tight">
          {campaign.title}
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          This is exactly how your campaign appears to{' '}
          <strong className="text-white">all active volunteers</strong>{' '}
          in the De12eMan app.
        </p>
      </motion.div>

      {/* Phone mockup */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <PhoneMockup>
          {campaign.campaign_type === 'local_coupon'
            ? <CouponPreview campaign={campaign} />
            : <DashboardBannerPreview campaign={campaign} />
          }
        </PhoneMockup>
      </motion.div>

      {/* Campaign details card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3"
      >
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Campaign Details
        </h3>
        {[
          { label: 'Sponsor',  value: campaign.sponsors?.name || '—' },
          { label: 'Type',     value: campaign.campaign_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) },
          { label: 'Status',   value: campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) },
          ...(campaign.start_date ? [{ label: 'Starts', value: campaign.start_date }] : []),
          ...(campaign.end_date   ? [{ label: 'Ends',   value: campaign.end_date   }] : []),
          ...(campaign.reward_value_cents ? [{ label: 'Reward', value: `€${(campaign.reward_value_cents / 100).toFixed(2)}` }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs text-white/40">{label}</span>
            <span className="text-xs font-medium text-white">{value}</span>
          </div>
        ))}
      </motion.div>

      {/* Trust badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex items-center gap-2 text-white/30 text-xs"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Powered by <strong className="text-white/50">De12eMan</strong> — Volunteer Platform Belgium</span>
      </motion.div>
    </div>
  );
};

export default SponsorPreview;
