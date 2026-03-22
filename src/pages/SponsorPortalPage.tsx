/**
 * SponsorPortalPage — /sponsor/portal/:campaignId/:token
 *
 * Magic-link portal for local businesses. No login required.
 * Light / premium / orange theme — mobile-first.
 *
 * Two views:
 *   📷  Scanner    – QR camera + backup manual code entry
 *   📊  Analytics  – ROI dashboard with recharts timeline
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
  Eye, ShoppingBag, TrendingUp, Euro,
  Zap, BarChart2, Camera, ScanLine,
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
  success:             boolean;
  error?:              'invalid_portal_token' | 'invalid_qr' | 'already_redeemed' | 'expired' | 'campaign_inactive' | string;
  message:             string;
  redeemed_at?:        string;
  reward_value_cents?: number;
  reward_text?:        string;
  campaign_title?:     string;
}

interface RecentScan { code: string; result: ScanResult; ts: Date; }

// ── Helpers ───────────────────────────────────────────────────────────────────

const euro = (cents: number | null | undefined) =>
  cents != null ? `€${(cents / 100).toFixed(2)}` : '—';

const fillTimeline = (raw: TimelineEntry[]): TimelineEntry[] => {
  const map = Object.fromEntries(raw.map(r => [r.day, r.redemptions]));
  return Array.from({ length: 30 }, (_, i) => {
    const d   = subDays(new Date(), 29 - i);
    const key = format(d, 'yyyy-MM-dd');
    return { day: format(d, 'd MMM', { locale: nl }), redemptions: map[key] ?? 0 };
  });
};

// ── Scanner component ─────────────────────────────────────────────────────────

const SCANNER_DIV_ID = 'html5qr-sponsor-v2';

interface ScannerViewProps {
  campaignId:  string;
  portalToken: string;
  brandColor:  string;
  rewardCents: number | null;
}

const ScannerView = ({ campaignId, portalToken, brandColor, rewardCents }: ScannerViewProps) => {
  const qrRef        = useRef<Html5Qrcode | null>(null);
  const isRunning    = useRef(false);
  const isProcessing = useRef(false);

  const [cameraError,   setCameraError]   = useState(false);
  const [result,        setResult]        = useState<ScanResult | null>(null);
  const [manualCode,    setManualCode]    = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [recentScans,   setRecentScans]   = useState<RecentScan[]>([]);
  const [mode,          setMode]          = useState<'camera' | 'manual'>('camera');

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
        { fps: 12, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          if (isProcessing.current) return;
          isProcessing.current = true;
          try { await qr.pause(); } catch {}
          const r = await callRpc(decoded);
          setResult(r);
          pushRecent(decoded, r);
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
    try { await qrRef.current.stop(); qrRef.current.clear(); } catch {}
    isRunning.current = false;
  }, []);

  useEffect(() => {
    if (mode === 'camera') { startScanner(); }
    else { stopScanner(); }
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
    <div className="flex flex-col gap-5 pb-8 px-4">

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
        <button
          onClick={() => setMode('camera')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            mode === 'camera'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Camera className="w-4 h-4" /> Camera
        </button>
        <button
          onClick={() => setMode('manual')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
            mode === 'manual'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Keyboard className="w-4 h-4" /> Manueel
        </button>
      </div>

      {/* Camera viewfinder */}
      <div className={cn(mode !== 'camera' && 'hidden')}>
        <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl shadow-gray-900/20" style={{ minHeight: 320 }}>
          {/* html5-qrcode renders here */}
          <div id={SCANNER_DIV_ID} className="w-full" />

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/95 rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-white/80 text-sm text-center px-6 leading-relaxed">
                Camera niet beschikbaar.<br/>Gebruik de manuele code-invoer.
              </p>
            </div>
          )}

          {/* Corner bracket overlay */}
          {!cameraError && !result && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-52 h-52">
                {(['tl','tr','bl','br'] as const).map(pos => (
                  <span key={pos} className="absolute w-7 h-7 rounded-sm"
                    style={{
                      borderColor: '#f97316',
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
                {/* Scanning line animation */}
                <motion.div
                  className="absolute left-1 right-1 h-0.5 rounded-full opacity-70"
                  style={{ background: '#f97316' }}
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}

          {/* Result overlay */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 rounded-3xl',
                  result.success ? 'bg-emerald-950/97' : 'bg-red-950/97',
                )}
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {result.success
                    ? <CheckCircle2 className="w-20 h-20 text-emerald-400 drop-shadow-lg" />
                    : <XCircle      className="w-20 h-20 text-red-400" />}
                </motion.div>
                <div className="text-center">
                  <p className={cn('text-3xl font-black tracking-wide',
                    result.success ? 'text-emerald-300' : 'text-red-300'
                  )}>
                    {result.success ? '✓ GELDIG' : '✗ ONGELDIG'}
                  </p>
                  {result.success && result.reward_value_cents && (
                    <p className="text-5xl font-black text-white mt-2 tabular-nums">
                      {euro(result.reward_value_cents)}
                    </p>
                  )}
                  {result.success && result.reward_text && (
                    <p className="text-lg text-emerald-200/80 mt-1">{result.reward_text}</p>
                  )}
                  <p className="text-sm text-white/60 mt-3 leading-relaxed px-4">{result.message}</p>
                  {result.error === 'already_redeemed' && result.redeemed_at && (
                    <p className="text-xs text-red-300/70 mt-1.5">
                      Ingewisseld op {format(new Date(result.redeemed_at), 'dd MMM HH:mm', { locale: nl })}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-gray-400 mt-2.5">
          Richt de camera op de QR-code van de vrijwilliger
        </p>
      </div>

      {/* Manual entry */}
      {mode === 'manual' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-1">Backup-code invoeren</p>
          <p className="text-xs text-gray-400 mb-4">Voer de 6-tekens code in van de vrijwilliger</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
              maxLength={6}
              placeholder="A3F7B2"
              className="flex-1 h-13 px-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-xl font-mono tracking-[0.25em] focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-gray-300 uppercase"
              style={{ height: 52 }}
            />
            <button
              onClick={handleManualSubmit}
              disabled={manualCode.length < 4 || manualLoading}
              className="h-[52px] px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-40 transition-colors shadow-sm shadow-orange-200"
            >
              {manualLoading ? '…' : 'OK'}
            </button>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'mt-4 rounded-2xl p-4 flex items-start gap-3',
                  result.success
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-red-50 border border-red-200',
                )}
              >
                {result.success
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                  : <XCircle      className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />}
                <div>
                  <p className={cn('font-bold text-base', result.success ? 'text-emerald-700' : 'text-red-700')}>
                    {result.success
                      ? `✓ Geldig — ${result.reward_text || euro(result.reward_value_cents)}`
                      : '✗ Ongeldig'}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{result.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Recent scans */}
      {recentScans.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Recente scans</p>
          </div>
          <div className="divide-y divide-gray-50">
            {recentScans.slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                {s.result.success
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <XCircle      className="w-4 h-4 text-red-400 shrink-0" />}
                <p className={cn('flex-1 text-sm font-medium min-w-0 truncate',
                  s.result.success ? 'text-emerald-700' : 'text-red-600'
                )}>
                  {s.result.success
                    ? `${euro(s.result.reward_value_cents)} ingewisseld`
                    : s.result.message}
                </p>
                <span className="text-xs text-gray-400 shrink-0 tabular-nums">
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

interface AnalyticsViewProps { data: PortalData; brandColor: string; }

const AnalyticsView = ({ data, brandColor }: AnalyticsViewProps) => {
  const { metrics, timeline, tasks, campaign } = data;
  const filledTimeline = fillTimeline(timeline);
  const ORANGE = '#f97316';
  const accent = brandColor || ORANGE;

  const claimRate  = metrics.total_impressions > 0
    ? ((metrics.total_claims / metrics.total_impressions) * 100).toFixed(1) : '—';
  const redeemRate = metrics.total_claims > 0
    ? ((metrics.total_redemptions / metrics.total_claims) * 100).toFixed(1) : '—';
  const totalValue = (metrics.total_redemptions * (campaign.reward_value_cents ?? 0)) / 100;

  const kpis = [
    { icon: Eye,         label: 'Weergaven',   value: metrics.total_impressions.toLocaleString('nl-BE'), color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100'    },
    { icon: ShoppingBag, label: 'Verdiend',    value: metrics.total_claims.toLocaleString('nl-BE'),      color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-100'  },
    { icon: CheckCircle2, label: 'Ingewisseld', value: metrics.total_redemptions.toLocaleString('nl-BE'), color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  const funnelSteps = [
    { label: 'Weergaven',   value: metrics.total_impressions, pct: 100,                                                                               color: '#3b82f6' },
    { label: 'Verdiend',    value: metrics.total_claims,      pct: metrics.total_impressions > 0 ? (metrics.total_claims / metrics.total_impressions) * 100 : 0, color: accent  },
    { label: 'Ingewisseld', value: metrics.total_redemptions, pct: metrics.total_claims > 0     ? (metrics.total_redemptions / metrics.total_claims) * 100     : 0, color: '#10b981' },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 pb-10">

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(({ icon: Icon, label, value, color, bg, border }) => (
          <div key={label} className={cn('rounded-2xl border p-4 text-center bg-white shadow-sm', border)}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', bg)}>
              <Icon className={cn('w-4.5 h-4.5', color)} style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-xl font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Financial impact card */}
      {campaign.reward_value_cents && totalValue > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 shadow-md shadow-orange-200/50">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="w-4 h-4 text-white/80" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Totale waarde uitgedeeld</p>
          </div>
          <p className="text-4xl font-black text-white tabular-nums">
            €{totalValue.toFixed(2)}
          </p>
          <p className="text-xs text-white/70 mt-1">
            {metrics.total_redemptions} klanten × {euro(campaign.reward_value_cents)} per coupon
          </p>
        </div>
      )}

      {/* Timeline chart */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-sm font-semibold text-gray-800">Inwisselingen – laatste 30 dagen</p>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={filledTimeline} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="gradLight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={accent} stopOpacity={0.25} />
                <stop offset="95%" stopColor={accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 9 }} tickLine={false} axisLine={false} interval={6} />
            <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, color: '#111', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
              labelStyle={{ color: '#6b7280' }}
            />
            <Area type="monotone" dataKey="redemptions" name="Inwisselingen"
              stroke={accent} strokeWidth={2.5} fill="url(#gradLight)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion funnel */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-800">Conversie funnel</p>
        </div>
        <div className="space-y-4">
          {funnelSteps.map(({ label, value, pct, color }, i) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{value.toLocaleString('nl-BE')}</span>
                  {i > 0 && funnelSteps[i - 1].value > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {((value / funnelSteps[i - 1].value) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.12, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 py-3 text-center">
            <p className="text-[10px] text-gray-400 font-medium">Claim rate</p>
            <p className="text-base font-bold text-gray-800">{claimRate}{claimRate !== '—' ? '%' : ''}</p>
          </div>
          <div className="rounded-xl bg-gray-50 py-3 text-center">
            <p className="text-[10px] text-gray-400 font-medium">Redeem rate</p>
            <p className="text-base font-bold text-gray-800">{redeemRate}{redeemRate !== '—' ? '%' : ''}</p>
          </div>
        </div>
      </div>

      {/* Task attribution */}
      {tasks.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Welke taken brachten klanten?</p>
          </div>
          <div className="space-y-3">
            {tasks.map((task, i) => {
              const maxR = tasks[0].redemptions;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.task_title}</p>
                      {task.task_date && (
                        <p className="text-[11px] text-gray-400">
                          {format(new Date(task.task_date), 'd MMM yyyy', { locale: nl })}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                      {task.redemptions}×
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${maxR > 0 ? (task.redemptions / maxR) * 100 : 0}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className="h-full rounded-full bg-orange-400"
                    />
                  </div>
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

  const [data,    setData]    = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<'scanner' | 'analytics'>('scanner');

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

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Portaal laden…</p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────────

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Link ongeldig</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          {error || 'Deze link is verlopen of werd niet gevonden. Vraag een nieuwe link aan bij de sportclub.'}
        </p>
      </div>
    </div>
  );

  const { campaign, metrics } = data;
  const brandColor = campaign.brand_color || '#f97316';

  // ── Page ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">

      {/* Brand color accent strip */}
      <div className="h-1.5 w-full shrink-0" style={{ background: brandColor }} />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-start gap-4">
          {/* Sponsor logo */}
          {campaign.logo_url ? (
            <img
              src={campaign.logo_url}
              alt={campaign.sponsor_name}
              className="w-14 h-14 rounded-2xl object-contain border border-gray-100 shrink-0 bg-white shadow-sm"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-sm"
              style={{ background: brandColor }}
            >
              {campaign.sponsor_name[0]}
            </div>
          )}

          {/* Meta */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
              Sponsor Portaal
            </p>
            <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">
              {campaign.sponsor_name}
            </h1>
            <p className="text-sm text-gray-500 truncate">{campaign.title}</p>
          </div>

          {/* Quick scan-count badge */}
          <div className="shrink-0 text-center px-3 py-2 rounded-2xl bg-gray-50 border border-gray-100">
            <p className="text-lg font-black text-gray-900 tabular-nums leading-none">{metrics.total_redemptions}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">scans</p>
          </div>
        </div>

        {/* Reward pill */}
        {campaign.reward_value_cents && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-xs font-semibold text-orange-700">
              {euro(campaign.reward_value_cents)} korting per coupon
            </span>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === 'scanner' ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.16 }}
              className="pt-4"
            >
              {campaignId && token && (
                <ScannerView
                  campaignId={campaignId}
                  portalToken={token}
                  brandColor={brandColor}
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
              transition={{ duration: 0.16 }}
              className="pt-4"
            >
              <AnalyticsView data={data} brandColor={brandColor} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom tab bar */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 pb-safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex gap-2 py-2">
          {([
            { key: 'scanner'   as const, icon: ScanLine, label: 'Scannen'   },
            { key: 'analytics' as const, icon: BarChart2, label: 'Analytics' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all',
                tab === key
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{label}</span>
              {tab === key && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 w-1 h-1 rounded-full bg-orange-500"
                />
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default SponsorPortalPage;
