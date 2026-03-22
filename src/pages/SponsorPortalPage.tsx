/**
 * SponsorPortalPage — /sponsor/portal/:campaignId/:token
 *
 * Magic-link portal for local businesses. No login required.
 * Two views:
 *   📷  Scanner  – html5-qrcode camera + backup manual code entry
 *   📊  Analytics – ROI dashboard with recharts timeline
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  QrCode, Keyboard, CheckCircle2, XCircle, AlertCircle,
  Eye, Download, ShoppingBag, TrendingUp, Euro,
  Clock, ChevronRight, Zap, BarChart2, Camera,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PortalCampaign {
  id: string;
  title: string;
  description: string | null;
  rich_description: string | null;
  campaign_type: string;
  reward_value_cents: number | null;
  reward_text: string | null;
  custom_cta: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  sponsor_name: string;
  brand_color: string;
  logo_url: string | null;
  cover_image_url: string | null;
}

interface PortalMetrics {
  total_impressions: number;
  total_claims: number;
  total_redemptions: number;
}

interface TimelineEntry { day: string; redemptions: number; }
interface TaskEntry    { task_title: string; task_date: string | null; redemptions: number; }

interface PortalData {
  campaign: PortalCampaign;
  metrics:  PortalMetrics;
  timeline: TimelineEntry[];
  tasks:    TaskEntry[];
}

interface ScanResult {
  success:            boolean;
  error?:             'invalid_portal_token' | 'invalid_qr' | 'already_redeemed' | 'expired' | 'campaign_inactive' | string;
  message:            string;
  redeemed_at?:       string;
  reward_value_cents?: number;
  reward_text?:       string;
  campaign_title?:    string;
}

interface RecentScan {
  code:    string;
  result:  ScanResult;
  ts:      Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const euro = (cents: number | null | undefined) =>
  cents != null ? `€${(cents / 100).toFixed(2)}` : '—';

/** Fill every day in the last 30 days; days with no scans get 0 */
const fillTimeline = (raw: TimelineEntry[]): TimelineEntry[] => {
  const map = Object.fromEntries(raw.map(r => [r.day, r.redemptions]));
  return Array.from({ length: 30 }, (_, i) => {
    const d   = subDays(new Date(), 29 - i);
    const key = format(d, 'yyyy-MM-dd');
    return { day: format(d, 'd MMM', { locale: nl }), redemptions: map[key] ?? 0 };
  });
};

// ── Scanner component ─────────────────────────────────────────────────────────

const SCANNER_DIV_ID = 'html5qr-sponsor';

interface ScannerViewProps {
  campaignId:   string;
  portalToken:  string;
  brandColor:   string;
  rewardCents:  number | null;
}

const ScannerView = ({ campaignId, portalToken, brandColor, rewardCents }: ScannerViewProps) => {
  const qrRef         = useRef<Html5Qrcode | null>(null);
  const isRunning     = useRef(false);
  const isProcessing  = useRef(false);

  const [cameraError, setCameraError]   = useState(false);
  const [result, setResult]             = useState<ScanResult | null>(null);
  const [manualCode, setManualCode]     = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [recentScans, setRecentScans]   = useState<RecentScan[]>([]);
  const [mode, setMode]                 = useState<'camera' | 'manual'>('camera');

  const pushRecent = useCallback((code: string, r: ScanResult) => {
    setRecentScans(prev => [{ code, result: r, ts: new Date() }, ...prev.slice(0, 9)]);
  }, []);

  const callRpc = useCallback(async (code: string): Promise<ScanResult> => {
    const { data, error } = await supabase.rpc('validate_and_redeem_coupon' as any, {
      p_code:         code.trim(),
      p_portal_token: portalToken,
    });
    if (error) return { success: false, error: 'invalid_qr', message: error.message };
    return data as ScanResult;
  }, [portalToken]);

  const startScanner = useCallback(async () => {
    if (isRunning.current) return;
    try {
      const qr = new Html5Qrcode(SCANNER_DIV_ID);
      qrRef.current = qr;
      await qr.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 260, height: 260 } },
        async (decoded) => {
          if (isProcessing.current) return;
          isProcessing.current = true;
          // pause
          try { await qr.pause(); } catch {}
          const r = await callRpc(decoded);
          setResult(r);
          pushRecent(decoded, r);
          // auto-resume after 3 s
          setTimeout(async () => {
            setResult(null);
            isProcessing.current = false;
            try { await qr.resume(); } catch {}
          }, 3500);
        },
        () => {},
      );
      isRunning.current = true;
    } catch {
      setCameraError(true);
      setMode('manual');
    }
  }, [callRpc, pushRecent]);

  const stopScanner = useCallback(async () => {
    if (!isRunning.current || !qrRef.current) return;
    try {
      await qrRef.current.stop();
      qrRef.current.clear();
    } catch {}
    isRunning.current = false;
  }, []);

  // Start camera when camera mode is active
  useEffect(() => {
    if (mode === 'camera') {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [mode]); // eslint-disable-line

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return;
    setManualLoading(true);
    const r = await callRpc(manualCode);
    setResult(r);
    pushRecent(manualCode, r);
    setManualCode('');
    setManualLoading(false);
    setTimeout(() => setResult(null), 4000);
  };

  return (
    <div className="flex flex-col gap-4 pb-6">

      {/* Mode toggle */}
      <div className="flex gap-2 px-4">
        <button
          onClick={() => setMode('camera')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            mode === 'camera'
              ? 'text-white shadow-md'
              : 'bg-white/5 text-white/50 border border-white/10',
          )}
          style={mode === 'camera' ? { background: brandColor } : {}}
        >
          <Camera className="w-4 h-4" /> Camera
        </button>
        <button
          onClick={() => setMode('manual')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            mode === 'manual'
              ? 'text-white shadow-md'
              : 'bg-white/5 text-white/50 border border-white/10',
          )}
          style={mode === 'manual' ? { background: brandColor } : {}}
        >
          <Keyboard className="w-4 h-4" /> Manueel
        </button>
      </div>

      {/* Camera container — MUST stay in DOM so html5-qrcode can find it */}
      <div
        className={cn(
          'relative mx-4 rounded-2xl overflow-hidden bg-black',
          mode !== 'camera' && 'hidden',
        )}
        style={{ minHeight: 320 }}
      >
        {/* html5-qrcode renders inside this div */}
        <div id={SCANNER_DIV_ID} className="w-full" />

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90">
            <AlertCircle className="w-10 h-10 text-amber-400" />
            <p className="text-white/80 text-sm text-center px-6">
              Camera niet beschikbaar. Gebruik manuele invoer.
            </p>
          </div>
        )}

        {/* Scan overlay (corner brackets) */}
        {!cameraError && !result && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-48 h-48">
              {(['tl','tr','bl','br'] as const).map(pos => (
                <span
                  key={pos}
                  className="absolute w-6 h-6 border-[3px] rounded-sm"
                  style={{
                    borderColor: brandColor,
                    top:    pos.startsWith('t') ? 0 : undefined,
                    bottom: pos.startsWith('b') ? 0 : undefined,
                    left:   pos.endsWith('l')   ? 0 : undefined,
                    right:  pos.endsWith('r')   ? 0 : undefined,
                    borderTopWidth:    pos.startsWith('t') ? 3 : 0,
                    borderBottomWidth: pos.startsWith('b') ? 3 : 0,
                    borderLeftWidth:   pos.endsWith('l')   ? 3 : 0,
                    borderRightWidth:  pos.endsWith('r')   ? 3 : 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Result overlay */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-4 p-6',
                result.success ? 'bg-emerald-950/95' : 'bg-red-950/95',
              )}
            >
              {result.success ? (
                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
              ) : (
                <XCircle className="w-16 h-16 text-red-400" />
              )}
              <div className="text-center">
                <p className={cn('text-2xl font-bold', result.success ? 'text-emerald-300' : 'text-red-300')}>
                  {result.success ? 'GELDIG' : 'ONGELDIG'}
                </p>
                {result.success && result.reward_value_cents && (
                  <p className="text-4xl font-black text-white mt-1">
                    {euro(result.reward_value_cents)} Korting
                  </p>
                )}
                <p className="text-sm text-white/70 mt-2 leading-relaxed">{result.message}</p>
                {result.error === 'already_redeemed' && result.redeemed_at && (
                  <p className="text-xs text-red-400 mt-1">
                    Ingewisseld op {format(new Date(result.redeemed_at), 'dd MMM HH:mm', { locale: nl })}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual entry */}
      {mode === 'manual' && (
        <div className="mx-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-semibold text-white/80 mb-3">
            Voer de 6-cijferige backup-code in:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
              maxLength={6}
              placeholder="A3F7B2"
              className="flex-1 h-12 px-4 rounded-xl bg-white/[0.06] border border-white/15 text-white text-lg font-mono tracking-widest focus:outline-none focus:border-white/30 placeholder:text-white/20 uppercase"
            />
            <button
              onClick={handleManualSubmit}
              disabled={manualCode.length < 4 || manualLoading}
              className="h-12 px-5 rounded-xl text-white font-semibold text-sm disabled:opacity-40 transition-colors"
              style={{ background: brandColor }}
            >
              {manualLoading ? '…' : 'OK'}
            </button>
          </div>

          {/* Manual result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'mt-4 rounded-xl p-4 flex items-start gap-3',
                  result.success ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-red-500/15 border border-red-500/30',
                )}
              >
                {result.success
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
                <div>
                  <p className={cn('font-semibold', result.success ? 'text-emerald-300' : 'text-red-300')}>
                    {result.success ? `GELDIG — ${euro(result.reward_value_cents)} Korting` : 'ONGELDIG'}
                  </p>
                  <p className="text-xs text-white/60 mt-0.5">{result.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Recent scans */}
      {recentScans.length > 0 && (
        <div className="mx-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2 px-1">
            Recente scans
          </p>
          <div className="space-y-2">
            {recentScans.slice(0, 5).map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]"
              >
                {s.result.success
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', s.result.success ? 'text-emerald-300' : 'text-red-300')}>
                    {s.result.success ? `${euro(s.result.reward_value_cents)} ingewisseld` : s.result.message}
                  </p>
                </div>
                <span className="text-[11px] text-white/30 shrink-0">
                  {format(s.ts, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Analytics component ───────────────────────────────────────────────────────

interface AnalyticsViewProps {
  data:       PortalData;
  brandColor: string;
}

const AnalyticsView = ({ data, brandColor }: AnalyticsViewProps) => {
  const { metrics, timeline, tasks, campaign } = data;
  const filledTimeline = fillTimeline(timeline);

  const claimRate      = metrics.total_impressions > 0
    ? ((metrics.total_claims / metrics.total_impressions) * 100).toFixed(1)
    : '—';
  const redeemRate     = metrics.total_claims > 0
    ? ((metrics.total_redemptions / metrics.total_claims) * 100).toFixed(1)
    : '—';
  const totalValue     = (metrics.total_redemptions * (campaign.reward_value_cents ?? 0)) / 100;

  const kpis = [
    { icon: Eye,       label: 'Weergaven',   value: metrics.total_impressions.toLocaleString('nl-BE'), color: 'text-blue-400' },
    { icon: Download,  label: 'Verdiend',    value: metrics.total_claims.toLocaleString('nl-BE'),      color: 'text-indigo-400' },
    { icon: ShoppingBag, label: 'Ingewisseld', value: metrics.total_redemptions.toLocaleString('nl-BE'), color: 'text-emerald-400' },
  ];

  const funnelSteps = [
    { label: 'Weergaven',    value: metrics.total_impressions, pct: 100 },
    { label: 'Verdiend',     value: metrics.total_claims,      pct: metrics.total_impressions > 0 ? (metrics.total_claims / metrics.total_impressions) * 100 : 0 },
    { label: 'Ingewisseld',  value: metrics.total_redemptions, pct: metrics.total_claims > 0     ? (metrics.total_redemptions / metrics.total_claims) * 100 : 0 },
  ];

  return (
    <div className="flex flex-col gap-5 px-4 pb-8">

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-center"
          >
            <Icon className={cn('w-5 h-5 mx-auto mb-2', color)} />
            <p className="text-xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Financial impact */}
      {campaign.reward_value_cents && (
        <div
          className="rounded-2xl p-5"
          style={{ background: `linear-gradient(135deg, ${brandColor}30, ${brandColor}10)`, border: `1px solid ${brandColor}30` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Euro className="w-4 h-4 text-white/60" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Totale waarde uitgedeeld</p>
          </div>
          <p className="text-3xl font-black text-white">
            €{totalValue.toFixed(2)}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {metrics.total_redemptions} klanten × {euro(campaign.reward_value_cents)} per coupon
          </p>
        </div>
      )}

      {/* Timeline chart */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-white/50" />
          <p className="text-sm font-semibold text-white/80">Inwisselingen – laatste 30 dagen</p>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={filledTimeline} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={brandColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={brandColor} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={6}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#0f0f1a', border: `1px solid ${brandColor}40`, borderRadius: 8, color: '#fff', fontSize: 12 }}
              labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
            />
            <Area
              type="monotone"
              dataKey="redemptions"
              name="Inwisselingen"
              stroke={brandColor}
              strokeWidth={2}
              fill="url(#grad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion funnel */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-white/50" />
          <p className="text-sm font-semibold text-white/80">Conversie funnel</p>
        </div>
        <div className="space-y-3">
          {funnelSteps.map(({ label, value, pct }, i) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-white/60">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white tabular-nums">{value.toLocaleString('nl-BE')}</span>
                  {i > 0 && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${brandColor}25`, color: brandColor }}
                    >
                      {funnelSteps[i - 1].value > 0
                        ? `${((value / funnelSteps[i - 1].value) * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: brandColor, opacity: 1 - i * 0.2 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-white/[0.04] py-2.5">
            <p className="text-[10px] text-white/40">Claim rate</p>
            <p className="text-sm font-bold text-white">{claimRate}{claimRate !== '—' ? '%' : ''}</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] py-2.5">
            <p className="text-[10px] text-white/40">Redeem rate</p>
            <p className="text-sm font-bold text-white">{redeemRate}{redeemRate !== '—' ? '%' : ''}</p>
          </div>
        </div>
      </div>

      {/* Task attribution */}
      {tasks.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-white/50" />
            <p className="text-sm font-semibold text-white/80">Welke taken brachten klanten?</p>
          </div>
          <div className="space-y-2.5">
            {tasks.map((task, i) => {
              const maxR = tasks[0].redemptions;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{task.task_title}</p>
                    {task.task_date && (
                      <p className="text-[11px] text-white/30">
                        {format(new Date(task.task_date), 'd MMM yyyy', { locale: nl })}
                      </p>
                    )}
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${maxR > 0 ? (task.redemptions / maxR) * 100 : 0}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: brandColor }}
                      />
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${brandColor}25`, color: brandColor }}
                  >
                    {task.redemptions}×
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const SponsorPortalPage = () => {
  const { campaignId, token } = useParams<{ campaignId: string; token: string }>();

  const [data, setData]     = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [tab, setTab]       = useState<'scanner' | 'analytics'>('scanner');

  useEffect(() => {
    if (!campaignId || !token) { setError('Ongeldige link.'); setLoading(false); return; }

    (async () => {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_sponsor_portal_data' as any,
        { p_campaign_id: campaignId, p_portal_token: token },
      );
      if (rpcError || !rpcData) {
        setError('Link verlopen of ongeldig. Neem contact op met de sportclub.');
      } else {
        setData(rpcData as PortalData);
      }
      setLoading(false);
    })();
  }, [campaignId, token]);

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060610] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-white/40 text-sm">Portaal laden…</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#060610] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link ongeldig</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            {error || 'Deze link is verlopen of werd niet gevonden. Vraag een nieuwe link aan bij de sportclub.'}
          </p>
        </div>
      </div>
    );
  }

  const { campaign, metrics } = data;
  const color = campaign.brand_color || '#6366f1';

  return (
    <div className="min-h-screen bg-[#060610] flex flex-col max-w-md mx-auto">

      {/* Header */}
      <div
        className="relative px-5 pt-10 pb-5 shrink-0"
        style={{ background: `linear-gradient(160deg, ${color}30 0%, transparent 70%)` }}
      >
        {/* Orb */}
        <div
          className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: color }}
        />
        <div className="flex items-start gap-4 relative">
          {campaign.logo_url ? (
            <img
              src={campaign.logo_url}
              alt={campaign.sponsor_name}
              className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0"
              style={{ background: color }}
            >
              {campaign.sponsor_name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Sponsor Portaal
            </p>
            <h1 className="text-lg font-bold text-white leading-tight truncate">{campaign.sponsor_name}</h1>
            <p className="text-sm text-white/50 truncate">{campaign.title}</p>
          </div>
          {/* Quick stats badge */}
          <div
            className="shrink-0 px-2.5 py-1.5 rounded-xl text-center"
            style={{ background: `${color}20`, border: `1px solid ${color}30` }}
          >
            <p className="text-xs font-bold text-white tabular-nums">{metrics.total_redemptions}</p>
            <p className="text-[9px] text-white/40">scans</p>
          </div>
        </div>

        {/* Campaign reward pill */}
        {campaign.reward_value_cents && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-white/70">
              {euro(campaign.reward_value_cents)} korting per coupon
            </span>
          </div>
        )}
      </div>

      {/* Scrollable tab content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === 'scanner' ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
              className="pt-4"
            >
              {campaignId && token && (
                <ScannerView
                  campaignId={campaignId}
                  portalToken={token}
                  brandColor={color}
                  rewardCents={campaign.reward_value_cents}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="pt-4"
            >
              <AnalyticsView data={data} brandColor={color} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom tab bar */}
      <div className="shrink-0 border-t border-white/[0.06] bg-[#060610]/95 backdrop-blur-xl px-4 pb-safe-bottom">
        <div className="flex gap-2 py-2">
          {([
            { key: 'scanner' as const,   icon: QrCode,   label: 'Scannen' },
            { key: 'analytics' as const, icon: BarChart2, label: 'Analytics' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all',
                tab === key ? 'text-white' : 'text-white/30',
              )}
              style={tab === key ? { background: `${color}25` } : {}}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default SponsorPortalPage;
