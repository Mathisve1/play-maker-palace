import { useState, useEffect, useCallback } from 'react';
import { useClubContext } from '@/contexts/ClubContext';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Zap, Plus, Copy, BarChart2, Eye, Target, TrendingUp, ExternalLink,
  Building2, Tag, Calendar, Users, ChevronRight, Megaphone, Gift,
  ToggleLeft, ToggleRight, Palette, Check, X, Loader2, DollarSign,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Sponsor {
  id: string;
  club_id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  created_at: string;
}

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
  created_at: string;
  sponsor_name?: string;
  sponsor_brand_color?: string;
  total_impressions?: number;
  total_claims?: number;
}

const CAMPAIGN_TYPE_LABELS: Record<string, { nl: string; fr: string; en: string; icon: React.ComponentType<{ className?: string }> }> = {
  dashboard_banner: { nl: 'Dashboard Banner',  fr: 'Bannière Dashboard', en: 'Dashboard Banner', icon: Megaphone },
  task_tag:         { nl: 'Taak-tag',           fr: 'Tag de Tâche',       en: 'Task Tag',          icon: Tag },
  local_coupon:     { nl: 'Lokale Coupon',      fr: 'Coupon Local',       en: 'Local Coupon',      icon: Gift },
};

const STATUS_COLORS: Record<string, string> = {
  draft:  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  ended:  'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
};

// ── ROI Calculator ─────────────────────────────────────────────────────────────
const ROICalculator = ({ language }: { language: string }) => {
  const [volunteers, setVolunteers] = useState(80);
  const [durationWeeks, setDurationWeeks] = useState(8);

  const t = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  // CPM-based formula: €20 CPM, ~1.5 sessions/week/volunteer
  const estImpressions = Math.round(volunteers * 1.5 * durationWeeks);
  const suggestedLow  = Math.round((estImpressions / 1000) * 20 * 100) / 100;
  const suggestedHigh = Math.round((estImpressions / 1000) * 28 * 100) / 100;

  return (
    <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-indigo-500/5 via-background to-purple-500/5 p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-500" />
            {t('ROI Calculator', 'Calculateur ROI', 'ROI Calculator')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              'Genereer een sponsorvoorstel op basis van CPM €20 per 1.000 vertoningen',
              'Génération d\'une offre sponsor basée sur CPM €20 par 1 000 impressions',
              'Generate a sponsor pitch based on CPM €20 per 1,000 impressions'
            )}
          </p>
        </div>
        <div className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-center min-w-[140px]">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
            {t('Aanbevolen prijs', 'Prix suggéré', 'Suggested Price')}
          </p>
          <p className="text-xl font-bold">
            €{suggestedLow.toFixed(0)}–€{suggestedHigh.toFixed(0)}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-foreground">
              {t('Actieve vrijwilligers', 'Bénévoles actifs', 'Active Volunteers')}
            </label>
            <span className="text-sm font-bold text-indigo-500 tabular-nums">{volunteers}</span>
          </div>
          <Slider
            value={[volunteers]}
            onValueChange={([v]) => setVolunteers(v)}
            min={10} max={1500} step={10}
            className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>10</span><span>1500</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-foreground">
              {t('Looptijd (weken)', 'Durée (semaines)', 'Duration (weeks)')}
            </label>
            <span className="text-sm font-bold text-indigo-500 tabular-nums">{durationWeeks}w</span>
          </div>
          <Slider
            value={[durationWeeks]}
            onValueChange={([v]) => setDurationWeeks(v)}
            min={1} max={52} step={1}
            className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>1w</span><span>52w</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-3 gap-3 text-center">
        {[
          { label: t('Gesch. vertoningen', 'Impressions estimées', 'Est. Impressions'), value: estImpressions.toLocaleString() },
          { label: t('CPM tarief', 'Tarif CPM', 'CPM Rate'), value: '€20' },
          { label: t('ROI doelstelling', 'Objectif ROI', 'ROI Target'), value: '3–5×' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-background/60 border border-border/30 py-2.5">
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Campaign builder form ──────────────────────────────────────────────────────
const emptyForm = () => ({
  sponsor_id: '',
  campaign_type: 'dashboard_banner' as Campaign['campaign_type'],
  title: '',
  description: '',
  reward_value_cents: '',
  start_date: '',
  end_date: '',
  status: 'draft' as Campaign['status'],
});

// ── Main Page ──────────────────────────────────────────────────────────────────
const SponsorHub = () => {
  const { clubId, loading: ctxLoading } = useClubContext();
  const { language } = useLanguage();

  const [sponsors, setSponsors]     = useState<Sponsor[]>([]);
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [sponsorSheet, setSponsorSheet] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState(emptyForm());
  const [newSponsor, setNewSponsor] = useState({ name: '', brand_color: '#6366f1' });
  const [creatingSponsors, setCreatingSponsor] = useState(false);
  const [copiedId, setCopiedId]     = useState<string | null>(null);

  const t = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);

    const sponsorsRes = await supabase.from('sponsors' as any).select('*').eq('club_id', clubId).order('name');
    const campaignsRes = await supabase.from('sponsor_campaigns' as any)
      .select('*, sponsors(name, brand_color)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    const campaignIds = ((campaignsRes as any)?.data || []).map((c: any) => c.id);
    const metricsRes = await supabase.from('sponsor_metrics' as any)
      .select('campaign_id, impressions_count, claims_count')
      .in(
        'campaign_id',
        campaignIds.length ? campaignIds : ['00000000-0000-0000-0000-000000000000']
      );

    setSponsors(((sponsorsRes as any).data as unknown as Sponsor[]) || []);

    // Aggregate metrics by campaign
    const metricMap: Record<string, { imp: number; claims: number }> = {};
    ((metricsRes.data as any[]) || []).forEach((m: any) => {
      if (!metricMap[m.campaign_id]) metricMap[m.campaign_id] = { imp: 0, claims: 0 };
      metricMap[m.campaign_id].imp    += m.impressions_count || 0;
      metricMap[m.campaign_id].claims += m.claims_count || 0;
    });

    setCampaigns(
      ((campaignsRes.data as any[]) || []).map((c: any) => ({
        ...c,
        sponsor_name:        c.sponsors?.name        || '',
        sponsor_brand_color: c.sponsors?.brand_color || '#6366f1',
        total_impressions:   metricMap[c.id]?.imp    || 0,
        total_claims:        metricMap[c.id]?.claims || 0,
      }))
    );
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    if (!ctxLoading && clubId) fetchAll();
  }, [clubId, ctxLoading, fetchAll]);

  // Refetch metrics after campaign fetch (we need campaign IDs first)
  useEffect(() => {
    if (!clubId || campaigns.length === 0) return;
    const fetchMetrics = async () => {
      const ids = campaigns.map(c => c.id);
      const { data } = await supabase
        .from('sponsor_metrics' as any)
        .select('campaign_id, impressions_count, claims_count')
        .in('campaign_id', ids);
      if (!data) return;
      const metricMap: Record<string, { imp: number; claims: number }> = {};
      (data as any[]).forEach((m: any) => {
        if (!metricMap[m.campaign_id]) metricMap[m.campaign_id] = { imp: 0, claims: 0 };
        metricMap[m.campaign_id].imp    += m.impressions_count || 0;
        metricMap[m.campaign_id].claims += m.claims_count || 0;
      });
      setCampaigns(prev => prev.map(c => ({
        ...c,
        total_impressions: metricMap[c.id]?.imp    || 0,
        total_claims:      metricMap[c.id]?.claims || 0,
      })));
    };
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns.length, clubId]);

  // ── Sponsor create ─────────────────────────────────────────────────────────
  const handleCreateSponsor = async () => {
    if (!clubId || !newSponsor.name.trim()) return;
    setCreatingSponsor(true);
    const { data, error } = await supabase
      .from('sponsors' as any)
      .insert({ club_id: clubId, name: newSponsor.name.trim(), brand_color: newSponsor.brand_color })
      .select('*')
      .maybeSingle();
    if (error) { toast.error(error.message); }
    else {
      setSponsors(prev => [...prev, data as unknown as Sponsor]);
      setForm(f => ({ ...f, sponsor_id: (data as unknown as Sponsor).id }));
      setSponsorSheet(false);
      setNewSponsor({ name: '', brand_color: '#6366f1' });
      toast.success(t('Sponsor aangemaakt!', 'Sponsor créé !', 'Sponsor created!'));
    }
    setCreatingSponsor(false);
  };

  // ── Campaign save ─────────────────────────────────────────────────────────
  const handleSaveCampaign = async () => {
    if (!clubId || !form.sponsor_id || !form.title.trim()) {
      toast.error(t('Vul alle verplichte velden in.', 'Remplissez tous les champs.', 'Fill all required fields.'));
      return;
    }
    setSaving(true);
    const payload = {
      club_id:            clubId,
      sponsor_id:         form.sponsor_id,
      campaign_type:      form.campaign_type,
      title:              form.title.trim(),
      description:        form.description || null,
      reward_value_cents: form.reward_value_cents ? parseInt(String(form.reward_value_cents), 10) : null,
      status:             form.status,
      start_date:         form.start_date || null,
      end_date:           form.end_date   || null,
    };

    if (editingCampaign) {
      const { error } = await supabase.from('sponsor_campaigns' as any).update(payload).eq('id', editingCampaign.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('Campagne bijgewerkt!', 'Campagne mise à jour !', 'Campaign updated!'));
    } else {
      const { error } = await supabase.from('sponsor_campaigns' as any).insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('Campagne aangemaakt!', 'Campagne créée !', 'Campaign created!'));
    }

    setSheetOpen(false);
    setEditingCampaign(null);
    setForm(emptyForm());
    fetchAll();
    setSaving(false);
  };

  // ── Toggle campaign status ─────────────────────────────────────────────────
  const handleToggleStatus = async (campaign: Campaign) => {
    const next = campaign.status === 'active' ? 'ended' : 'active';
    const { error } = await supabase
      .from('sponsor_campaigns' as any)
      .update({ status: next })
      .eq('id', campaign.id);
    if (error) { toast.error(error.message); return; }
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: next } : c));
    toast.success(next === 'active'
      ? t('Campagne geactiveerd!', 'Campagne activée !', 'Campaign activated!')
      : t('Campagne beëindigd.', 'Campagne terminée.', 'Campaign ended.')
    );
  };

  // ── Copy shareable link ────────────────────────────────────────────────────
  const copyLink = (type: 'preview' | 'results', campaignId: string) => {
    const base = window.location.origin;
    const url  = `${base}/sponsor/${type}/${campaignId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(`${type}-${campaignId}`);
    toast.success(t('Link gekopieerd!', 'Lien copié !', 'Link copied!'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Open edit ─────────────────────────────────────────────────────────────
  const openEdit = (c: Campaign) => {
    setEditingCampaign(c);
    setForm({
      sponsor_id:         c.sponsor_id,
      campaign_type:      c.campaign_type,
      title:              c.title,
      description:        c.description || '',
      reward_value_cents: c.reward_value_cents ? String(c.reward_value_cents) : '',
      start_date:         c.start_date || '',
      end_date:           c.end_date   || '',
      status:             c.status,
    });
    setSheetOpen(true);
  };

  if (ctxLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalImpressions = campaigns.reduce((s, c) => s + (c.total_impressions || 0), 0);
  const totalClaims      = campaigns.reduce((s, c) => s + (c.total_claims      || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">Sponsor Hub</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {t('Lokale marketing & affiliate netwerk', 'Marketing local & réseau affilié', 'Local marketing & affiliate network')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSponsorSheet(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              {t('Sponsor', 'Sponsor', 'Sponsor')}
            </button>
            <button
              onClick={() => { setEditingCampaign(null); setForm(emptyForm()); setSheetOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('Campagne', 'Campagne', 'Campaign')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: TrendingUp, label: t('Actieve campagnes', 'Campagnes actives', 'Active Campaigns'), value: activeCampaigns, color: 'text-emerald-500' },
            { icon: Eye,        label: t('Totale vertoningen', 'Impressions totales', 'Total Impressions'), value: totalImpressions.toLocaleString(), color: 'text-blue-500' },
            { icon: Target,     label: t('Totale claims', 'Claims totaux', 'Total Claims'), value: totalClaims.toLocaleString(), color: 'text-purple-500' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border/40 bg-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-4 h-4', color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* ROI Calculator */}
        <ROICalculator language={language} />

        {/* Sponsors list */}
        {sponsors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {t('Sponsors', 'Sponsors', 'Sponsors')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {sponsors.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-card text-xs"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: s.brand_color }}
                  />
                  <span className="font-medium text-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign CRM table */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {t('Campagnes', 'Campagnes', 'Campaigns')}
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <Megaphone className="w-8 h-8 opacity-30" />
              <p className="text-sm">
                {t('Nog geen campagnes. Maak je eerste aan!', 'Pas encore de campagnes. Créez la première !', 'No campaigns yet. Create your first!')}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    {[
                      t('Campagne', 'Campagne', 'Campaign'),
                      t('Type', 'Type', 'Type'),
                      t('Status', 'Statut', 'Status'),
                      t('Vertoningen', 'Impressions', 'Impressions'),
                      t('Claims', 'Claims', 'Claims'),
                      'CTR',
                      t('Links', 'Liens', 'Links'),
                      '',
                    ].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => {
                    const TypeIcon = CAMPAIGN_TYPE_LABELS[c.campaign_type]?.icon || Megaphone;
                    const ctr = c.total_impressions ? ((c.total_claims || 0) / c.total_impressions * 100).toFixed(1) : '—';
                    return (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        {/* Campaign name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-2 h-8 rounded-full shrink-0"
                              style={{ background: c.sponsor_brand_color || '#6366f1' }}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[180px]">{c.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{c.sponsor_name}</p>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TypeIcon className="w-3.5 h-3.5" />
                            <span>{CAMPAIGN_TYPE_LABELS[c.campaign_type]?.[language as 'nl'|'fr'|'en'] || c.campaign_type}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', STATUS_COLORS[c.status])}>
                            {c.status}
                          </span>
                        </td>

                        {/* Metrics */}
                        <td className="px-4 py-3 tabular-nums font-medium text-foreground">
                          {(c.total_impressions || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium text-foreground">
                          {(c.total_claims || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {ctr}{ctr !== '—' ? '%' : ''}
                        </td>

                        {/* Shareable links */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyLink('preview', c.id)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border border-border/40 hover:bg-muted/60 transition-colors text-muted-foreground"
                              title={t('Preview link kopiëren', 'Copier lien aperçu', 'Copy preview link')}
                            >
                              {copiedId === `preview-${c.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Eye className="w-3 h-3" />}
                              Preview
                            </button>
                            <button
                              onClick={() => copyLink('results', c.id)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border border-border/40 hover:bg-muted/60 transition-colors text-muted-foreground"
                              title={t('Analytics link kopiëren', 'Copier lien analytiques', 'Copy analytics link')}
                            >
                              {copiedId === `results-${c.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <BarChart2 className="w-3 h-3" />}
                              Analytics
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                              title={t('Bewerken', 'Modifier', 'Edit')}
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(c)}
                              className={cn(
                                'p-1.5 rounded-md transition-colors',
                                c.status === 'active'
                                  ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  : 'text-muted-foreground hover:bg-muted/60'
                              )}
                              title={c.status === 'active' ? t('Beëindigen', 'Terminer', 'End') : t('Activeren', 'Activer', 'Activate')}
                            >
                              {c.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Campaign Builder Sheet ───────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-500" />
              {editingCampaign
                ? t('Campagne bewerken', 'Modifier la campagne', 'Edit Campaign')
                : t('Nieuwe campagne', 'Nouvelle campagne', 'New Campaign')
              }
            </SheetTitle>
            <SheetDescription>
              {t('Stel de campagne in en publiceer naar de vrijwilligers-app.', 'Configurez la campagne et publiez dans l\'app.', 'Configure the campaign and publish to the volunteer app.')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            {/* Sponsor select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('Sponsor', 'Sponsor', 'Sponsor')} *
              </label>
              <div className="flex gap-2">
                <select
                  value={form.sponsor_id}
                  onChange={e => setForm(f => ({ ...f, sponsor_id: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="">{t('Selecteer sponsor...', 'Sélectionner sponsor...', 'Select sponsor...')}</option>
                  {sponsors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSponsorSheet(true)}
                  className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Campaign type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('Type', 'Type', 'Type')} *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['dashboard_banner', 'task_tag', 'local_coupon'] as const).map(type => {
                  const { icon: Icon } = CAMPAIGN_TYPE_LABELS[type];
                  const label = CAMPAIGN_TYPE_LABELS[type][language as 'nl'|'fr'|'en'];
                  return (
                    <button
                      key={type}
                      onClick={() => setForm(f => ({ ...f, campaign_type: type }))}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                        form.campaign_type === type
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'border-border text-muted-foreground hover:border-indigo-300 hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('Titel', 'Titre', 'Title')} *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={t('bv. Gratis broodje bij Slager Dirk', 'ex. Sandwich gratuit chez le Boucher', 'e.g. Free sandwich at Butcher Dirk')}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('Beschrijving', 'Description', 'Description')}
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
              />
            </div>

            {/* Reward value (for coupons) */}
            {form.campaign_type === 'local_coupon' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('Kortingsbedrag (centen)', 'Montant de la réduction (centimes)', 'Discount amount (cents)')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={form.reward_value_cents}
                    onChange={e => setForm(f => ({ ...f, reward_value_cents: e.target.value }))}
                    placeholder="500"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {form.reward_value_cents ? `= €${(parseInt(String(form.reward_value_cents), 10) / 100).toFixed(2)}` : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('Startdatum', 'Date de début', 'Start Date')}
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('Einddatum', 'Date de fin', 'End Date')}
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <div className="flex gap-2">
                {(['draft', 'active', 'ended'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      form.status === s ? STATUS_COLORS[s] + ' border-transparent' : 'border-border text-muted-foreground hover:border-foreground/20'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSaveCampaign}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingCampaign ? t('Opslaan', 'Enregistrer', 'Save') : t('Campagne aanmaken', 'Créer la campagne', 'Create Campaign')}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sponsor Creator Sheet ─────────────────────────────────────────────── */}
      <Sheet open={sponsorSheet} onOpenChange={setSponsorSheet}>
        <SheetContent side="right" className="sm:max-w-sm">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              {t('Nieuwe sponsor', 'Nouveau sponsor', 'New Sponsor')}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('Naam', 'Nom', 'Name')} *
              </label>
              <input
                type="text"
                value={newSponsor.name}
                onChange={e => setNewSponsor(s => ({ ...s, name: e.target.value }))}
                placeholder={t('bv. Slager Dirk', 'ex. Boucherie Dirk', 'e.g. Butcher Dirk')}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Palette className="w-3.5 h-3.5 inline mr-1" />
                {t('Merkkleur', 'Couleur de marque', 'Brand Color')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newSponsor.brand_color}
                  onChange={e => setNewSponsor(s => ({ ...s, brand_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-background"
                />
                <input
                  type="text"
                  value={newSponsor.brand_color}
                  onChange={e => setNewSponsor(s => ({ ...s, brand_color: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>
            <button
              onClick={handleCreateSponsor}
              disabled={creatingSponsors || !newSponsor.name.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creatingSponsors ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t('Sponsor aanmaken', 'Créer le sponsor', 'Create Sponsor')}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SponsorHub;
