import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, Area, AreaChart,
} from 'recharts';
import {
  Loader2, TrendingUp, Eye, Target, Calendar, ShieldCheck,
  Megaphone, ArrowUpRight, Info,
} from 'lucide-react';

interface Campaign {
  id: string;
  club_id: string;
  campaign_type: 'dashboard_banner' | 'task_tag' | 'local_coupon';
  title: string;
  description: string | null;
  reward_value_cents: number | null;
  status: 'draft' | 'active' | 'ended';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  sponsors: {
    name: string;
    logo_url: string | null;
    brand_color: string;
  } | null;
}

interface MetricRow {
  date: string;
  impressions_count: number;
  claims_count: number;
}

// ── Custom tooltip ──────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur px-3 py-2.5 shadow-xl">
      <p className="text-[11px] text-white/50 mb-1.5 font-mono">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-[12px] font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ── Metric card ──────────────────────────────────────────────────────────────
const MetricCard = ({
  label, value, sub, color, icon: Icon, trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-white/8 bg-white/5 p-5 relative overflow-hidden"
  >
    {/* Subtle gradient glow */}
    <div
      className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-15"
      style={{ background: color }}
    />
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}22` }}
        >
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            <ArrowUpRight className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-sm text-white/50 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-white/30 mt-1">{sub}</p>}
    </div>
  </motion.div>
);

// ── Main page ────────────────────────────────────────────────────────────────
const SponsorResults = () => {
  const { campaign_id } = useParams<{ campaign_id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [metrics, setMetrics]   = useState<MetricRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    if (!campaign_id) { setError(true); setLoading(false); return; }

    const [campRes, metricsRes] = await Promise.all([
      supabase
        .from('sponsor_campaigns' as any)
        .select('*, sponsors(name, logo_url, brand_color)')
        .eq('id', campaign_id)
        .maybeSingle(),
      supabase
        .from('sponsor_metrics' as any)
        .select('date, impressions_count, claims_count')
        .eq('campaign_id', campaign_id)
        .order('date', { ascending: true }),
    ]);

    if (campRes.error || !campRes.data) { setError(true); setLoading(false); return; }

    setCampaign(campRes.data as unknown as Campaign);
    setMetrics((metricsRes.data as unknown as MetricRow[]) || []);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30s
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <p className="text-sm">Campaign not found.</p>
        </div>
      </div>
    );
  }

  const color           = campaign.sponsors?.brand_color || '#6366f1';
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions_count, 0);
  const totalClaims      = metrics.reduce((s, m) => s + m.claims_count, 0);
  const ctr              = totalImpressions > 0 ? (totalClaims / totalImpressions * 100) : 0;

  // 7-day trend
  const last7 = metrics.slice(-7);
  const prev7 = metrics.slice(-14, -7);
  const last7Imp = last7.reduce((s, m) => s + m.impressions_count, 0);
  const prev7Imp = prev7.reduce((s, m) => s + m.impressions_count, 0);
  const impTrend = prev7Imp > 0 ? ((last7Imp - prev7Imp) / prev7Imp * 100) : undefined;

  // Chart data — fill missing dates between start_date and today
  const chartData = metrics.map(m => ({
    date: new Date(m.date).toLocaleDateString('nl-BE', { month: 'short', day: 'numeric' }),
    Vertoningen: m.impressions_count,
    Claims: m.claims_count,
  }));

  const isActive = campaign.status === 'active';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="border-b border-white/8 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Brand dot */}
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-sm font-semibold text-white/90">
              {campaign.sponsors?.name || 'Sponsor'} — Analytics
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Live badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              {isActive ? 'LIVE' : campaign.status.toUpperCase()}
            </div>
            <span className="text-[11px] text-white/30 font-mono">
              Updated {lastUpdated.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Campaign header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1">
                {campaign.campaign_type.replace('_', ' ')}
              </p>
              <h1 className="text-3xl font-bold text-white">{campaign.title}</h1>
              {campaign.description && (
                <p className="mt-2 text-white/50 max-w-lg">{campaign.description}</p>
              )}
            </div>
            {campaign.sponsors?.logo_url && (
              <img
                src={campaign.sponsors.logo_url}
                alt={campaign.sponsors.name}
                className="w-16 h-16 rounded-2xl object-cover border border-white/10"
              />
            )}
          </div>
          {/* Meta pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {campaign.start_date && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/8 text-[11px] text-white/50">
                <Calendar className="w-3 h-3" />
                {new Date(campaign.start_date).toLocaleDateString('nl-BE')}
                {campaign.end_date && ` → ${new Date(campaign.end_date).toLocaleDateString('nl-BE')}`}
              </div>
            )}
            {campaign.reward_value_cents && (
              <div className="px-3 py-1 rounded-full bg-white/8 text-[11px] text-white/50">
                €{(campaign.reward_value_cents / 100).toFixed(2)} reward
              </div>
            )}
          </div>
        </motion.div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <MetricCard
            icon={Eye}
            label="Total Impressions"
            value={totalImpressions.toLocaleString()}
            sub="Volunteers who saw this ad"
            color="#6366f1"
            trend={impTrend}
          />
          <MetricCard
            icon={Target}
            label="Total Claims"
            value={totalClaims.toLocaleString()}
            sub="Coupons redeemed / clicked"
            color="#10b981"
          />
          <MetricCard
            icon={TrendingUp}
            label="Click-Through Rate"
            value={`${ctr.toFixed(2)}%`}
            sub="Claims ÷ Impressions"
            color={color}
          />
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/8 bg-white/5 p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Performance Over Time</h3>
                <p className="text-[11px] text-white/30 mt-0.5">Daily impressions & claims</p>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-white/40">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Impressions
                </span>
                <span className="flex items-center gap-1.5 text-white/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Claims
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gClaim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Vertoningen" stroke="#6366f1" strokeWidth={2} fill="url(#gImp)" />
                <Area type="monotone" dataKey="Claims" stroke="#10b981" strokeWidth={2} fill="url(#gClaim)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-white/8 bg-white/5 py-16 flex flex-col items-center gap-3 text-white/30 mb-8"
          >
            <Info className="w-8 h-8 opacity-50" />
            <p className="text-sm">No data yet. Check back once the campaign goes live.</p>
          </motion.div>
        )}

        {/* Daily breakdown table */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/8 bg-white/5 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/8">
              <h3 className="text-sm font-semibold text-white">Daily Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Date', 'Impressions', 'Claims', 'CTR'].map(h => (
                      <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...metrics].reverse().slice(0, 14).map((m, i) => {
                    const dayCtr = m.impressions_count > 0 ? (m.claims_count / m.impressions_count * 100).toFixed(1) : '—';
                    return (
                      <tr key={m.date} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-6 py-3 text-white/60 font-mono text-xs">{m.date}</td>
                        <td className="px-6 py-3 text-white font-semibold tabular-nums">{m.impressions_count.toLocaleString()}</td>
                        <td className="px-6 py-3 text-emerald-400 font-semibold tabular-nums">{m.claims_count.toLocaleString()}</td>
                        <td className="px-6 py-3 text-white/40 tabular-nums">{dayCtr}{dayCtr !== '—' ? '%' : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/8 mt-16 py-8 text-center text-white/25 text-xs">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Powered by <strong className="text-white/40">De12eMan</strong> — Volunteer Platform Belgium</span>
        </div>
        <p className="mt-2 text-white/15">Data refreshes automatically every 30 seconds.</p>
      </div>
    </div>
  );
};

export default SponsorResults;
