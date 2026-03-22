import { useState, useEffect, useCallback } from 'react';
import { useClubContext } from '@/contexts/ClubContext';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ClubPageLayout from '@/components/ClubPageLayout';
import { toast } from 'sonner';
import {
  Zap, Plus, BarChart2, Eye, Target, TrendingUp,
  Building2, Tag, Calendar, Megaphone, Gift,
  ToggleLeft, ToggleRight, Check, Loader2, DollarSign,
  QrCode, Smartphone, List, ChevronDown, ChevronUp,
  Link2, Clock, XCircle, CheckCircle2, ExternalLink, Mail,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import ImageUploader from '@/components/sponsor/ImageUploader';
import SponsorAdLivePreview, { type PreviewForm } from '@/components/sponsor/SponsorAdLivePreview';

// ── Types ────────────────────────────────────────────────────────────────────
interface Sponsor {
  id: string;
  club_id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string;
}

interface ClubTask {
  id: string;
  title: string;
  task_date: string | null;
  status: string;
}

interface Campaign {
  id: string;
  club_id: string;
  sponsor_id: string;
  campaign_type: 'dashboard_banner' | 'task_tag' | 'local_coupon';
  title: string;
  description: string | null;
  image_url: string | null;
  reward_value_cents: number | null;
  status: 'draft' | 'active' | 'ended' | 'pending_payment';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  reward_text: string | null;
  submitted_by_email: string | null;
  sponsor_name?: string;
  sponsor_brand_color?: string;
  total_impressions?: number;
  total_claims?: number;
  linked_task_ids?: string[];
  cover_image_url?: string | null;
  custom_cta?: string | null;
  rich_description?: string | null;
  portal_access_token?: string | null;
}

const CAMPAIGN_TYPE_LABELS: Record<string, {
  nl: string; fr: string; en: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  dashboard_banner: { nl: 'Dashboard Banner', fr: 'Bannière Dashboard', en: 'Dashboard Banner', icon: Megaphone },
  task_tag:         { nl: 'Taak-tag',          fr: 'Tag de Tâche',       en: 'Task Tag',         icon: Tag },
  local_coupon:     { nl: 'Lokale Coupon',      fr: 'Coupon Local',       en: 'Local Coupon',     icon: Gift },
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
  draft:           'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  active:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  ended:           'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
};

// ── ROI Calculator ────────────────────────────────────────────────────────────
const ROICalculator = ({ language }: { language: string }) => {
  const [volunteers, setVolunteers] = useState(80);
  const [durationWeeks, setDurationWeeks] = useState(8);

  const t = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  const estImpressions = Math.round(volunteers * 1.5 * durationWeeks);
  const suggestedLow   = Math.round((estImpressions / 1000) * 20 * 100) / 100;
  const suggestedHigh  = Math.round((estImpressions / 1000) * 28 * 100) / 100;

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
              'Generate a sponsor pitch based on CPM €20 per 1,000 impressions',
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

// ── Form default ──────────────────────────────────────────────────────────────
const emptyForm = () => ({
  sponsor_id: '',
  campaign_type: 'dashboard_banner' as Campaign['campaign_type'],
  title: '',
  description: '',
  image_url: '',
  cover_image_url: '',
  custom_cta: '',
  rich_description: '',
  reward_value_cents: '',
  start_date: '',
  end_date: '',
  status: 'draft' as Campaign['status'],
  linked_task_ids: [] as string[],
});

// ── Main Page ─────────────────────────────────────────────────────────────────
const SponsorHub = () => {
  const { clubId, loading: ctxLoading } = useClubContext();
  const { language } = useLanguage();

  const [sponsors, setSponsors]       = useState<Sponsor[]>([]);
  const [campaigns, setCampaigns]     = useState<Campaign[]>([]);
  const [tasks, setTasks]             = useState<ClubTask[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [sponsorSheet, setSponsorSheet] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState(emptyForm());
  const [newSponsor, setNewSponsor]   = useState({ name: '', brand_color: '#6366f1' });
  const [creatingSponsors, setCreatingSponsor] = useState(false);
  const [copiedId, setCopiedId]               = useState<string | null>(null);
  const [copiedSponsorLink, setCopiedSponsorLink] = useState(false);
  const [approvingId, setApprovingId]         = useState<string | null>(null);
  const [rejectingId, setRejectingId]         = useState<string | null>(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskListExpanded, setTaskListExpanded] = useState(false);

  const t = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);

    const [sponsorsRes, campaignsRes, tasksRes] = await Promise.all([
      supabase.from('sponsors' as any).select('*').eq('club_id', clubId).order('name'),
      supabase.from('sponsor_campaigns' as any)
        .select('*, sponsors(name, brand_color)')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false }),
      supabase.from('tasks').select('id, title, task_date, status')
        .eq('club_id', clubId)
        .neq('status', 'cancelled')
        .order('task_date', { ascending: false })
        .limit(200),
    ]);

    setSponsors(((sponsorsRes as any).data as unknown as Sponsor[]) || []);
    setTasks(((tasksRes as any).data as unknown as ClubTask[]) || []);

    const campaignList: Campaign[] = ((campaignsRes.data as any[]) || []).map((c: any) => ({
      ...c,
      sponsor_name:        c.sponsors?.name        || '',
      sponsor_brand_color: c.sponsors?.brand_color || '#6366f1',
      image_url:           c.image_url             || null,
      reward_text:         c.reward_text           || null,
      submitted_by_email:  c.submitted_by_email    || null,
      total_impressions:   0,
      total_claims:        0,
      linked_task_ids:     [],
    }));

    const campaignIds = campaignList.map(c => c.id);

    if (campaignIds.length > 0) {
      const [metricsRes, sctRes] = await Promise.all([
        supabase.from('sponsor_metrics' as any)
          .select('campaign_id, impressions_count, claims_count')
          .in('campaign_id', campaignIds),
        supabase.from('sponsor_campaign_tasks' as any)
          .select('campaign_id, task_id')
          .in('campaign_id', campaignIds),
      ]);

      // Aggregate metrics
      const metricMap: Record<string, { imp: number; claims: number }> = {};
      ((metricsRes.data as any[]) || []).forEach((m: any) => {
        if (!metricMap[m.campaign_id]) metricMap[m.campaign_id] = { imp: 0, claims: 0 };
        metricMap[m.campaign_id].imp    += m.impressions_count || 0;
        metricMap[m.campaign_id].claims += m.claims_count      || 0;
      });

      // Build linked task ID map
      const sctMap: Record<string, string[]> = {};
      ((sctRes.data as any[]) || []).forEach((r: any) => {
        if (!sctMap[r.campaign_id]) sctMap[r.campaign_id] = [];
        sctMap[r.campaign_id].push(r.task_id);
      });

      setCampaigns(campaignList.map(c => ({
        ...c,
        total_impressions: metricMap[c.id]?.imp    || 0,
        total_claims:      metricMap[c.id]?.claims || 0,
        linked_task_ids:   sctMap[c.id]            || [],
      })));
    } else {
      setCampaigns(campaignList);
    }

    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    if (!ctxLoading && clubId) fetchAll();
  }, [clubId, ctxLoading, fetchAll]);

  // ── Create sponsor ──────────────────────────────────────────────────────────
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

  // ── Save campaign (create or update + manage linked tasks) ─────────────────
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
      description:        form.description     || null,
      image_url:          form.image_url        || null,
      cover_image_url:    form.cover_image_url  || null,
      custom_cta:         form.custom_cta       || null,
      rich_description:   form.rich_description || null,
      reward_value_cents: form.reward_value_cents ? parseInt(String(form.reward_value_cents), 10) : null,
      status:             form.status,
      start_date:         form.start_date  || null,
      end_date:           form.end_date    || null,
    };

    let campaignId: string | null = editingCampaign?.id || null;

    if (editingCampaign) {
      const { error } = await supabase
        .from('sponsor_campaigns' as any)
        .update(payload)
        .eq('id', editingCampaign.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('Campagne bijgewerkt!', 'Campagne mise à jour !', 'Campaign updated!'));
    } else {
      const { data, error } = await supabase
        .from('sponsor_campaigns' as any)
        .insert(payload)
        .select('id')
        .maybeSingle();
      if (error || !data) { toast.error(error?.message || 'Insert failed'); setSaving(false); return; }
      campaignId = (data as any).id as string;
      toast.success(t('Campagne aangemaakt!', 'Campagne créée !', 'Campaign created!'));
    }

    // ── Sync linked tasks (only for local_coupon) ──────────────────────────
    if (campaignId && form.campaign_type === 'local_coupon') {
      // Delete all existing links for this campaign, then re-insert
      await supabase
        .from('sponsor_campaign_tasks' as any)
        .delete()
        .eq('campaign_id', campaignId);

      if (form.linked_task_ids.length > 0) {
        await supabase
          .from('sponsor_campaign_tasks' as any)
          .insert(form.linked_task_ids.map(tid => ({ campaign_id: campaignId, task_id: tid })));
      }
    }

    setSheetOpen(false);
    setEditingCampaign(null);
    setForm(emptyForm());
    setTaskSearchQuery('');
    fetchAll();
    setSaving(false);
  };

  // ── Toggle status ──────────────────────────────────────────────────────────
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
      : t('Campagne beëindigd.', 'Campagne terminée.', 'Campaign ended.'),
    );
  };

  // ── Approve pending submission ─────────────────────────────────────────────
  const handleApproveCampaign = async (id: string) => {
    setApprovingId(id);
    const { error } = await supabase
      .from('sponsor_campaigns' as any)
      .update({ status: 'active' })
      .eq('id', id);
    if (error) { toast.error(error.message); }
    else {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'active' } : c));
      toast.success(t('Campagne geactiveerd en live!', 'Campagne activée !', 'Campaign activated!'));
    }
    setApprovingId(null);
  };

  // ── Reject pending submission ──────────────────────────────────────────────
  const handleRejectCampaign = async (id: string) => {
    setRejectingId(id);
    const { error } = await supabase
      .from('sponsor_campaigns' as any)
      .update({ status: 'ended' })
      .eq('id', id);
    if (error) { toast.error(error.message); }
    else {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success(t('Aanvraag afgewezen.', 'Demande refusée.', 'Application rejected.'));
    }
    setRejectingId(null);
  };

  // ── Copy self-serve wizard link ────────────────────────────────────────────
  const copySponsorWizardLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/sponsor/${clubId}`);
    setCopiedSponsorLink(true);
    toast.success(t('Aanmeld-link gekopieerd!', 'Lien copié !', 'Sign-up link copied!'));
    setTimeout(() => setCopiedSponsorLink(false), 2500);
  };

  // ── Copy shareable link ────────────────────────────────────────────────────
  const copyLink = (type: 'preview' | 'results', campaignId: string) => {
    const url = `${window.location.origin}/sponsor/${type}/${campaignId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(`${type}-${campaignId}`);
    toast.success(t('Link gekopieerd!', 'Lien copié !', 'Link copied!'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Open edit sheet (load linked task IDs) ─────────────────────────────────
  const openEdit = async (c: Campaign) => {
    setEditingCampaign(c);

    // Fetch linked task IDs for this campaign
    const { data: sctData } = await supabase
      .from('sponsor_campaign_tasks' as any)
      .select('task_id')
      .eq('campaign_id', c.id);

    const linkedIds = ((sctData as any[]) || []).map((r: any) => r.task_id as string);

    setForm({
      sponsor_id:         c.sponsor_id,
      campaign_type:      c.campaign_type,
      title:              c.title,
      description:        c.description      || '',
      image_url:          c.image_url        || '',
      cover_image_url:    c.cover_image_url  || '',
      custom_cta:         c.custom_cta       || '',
      rich_description:   c.rich_description || '',
      reward_value_cents: c.reward_value_cents ? String(c.reward_value_cents) : '',
      start_date:         c.start_date       || '',
      end_date:           c.end_date         || '',
      status:             c.status,
      linked_task_ids:    linkedIds,
    });
    setTaskSearchQuery('');
    setSheetOpen(true);
  };

  if (ctxLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingCampaigns    = campaigns.filter(c => c.status === 'pending_payment');
  const activeCampaignCount = campaigns.filter(c => c.status === 'active').length;
  const totalImpressions    = campaigns.reduce((s, c) => s + (c.total_impressions || 0), 0);
  const totalClaims         = campaigns.reduce((s, c) => s + (c.total_claims      || 0), 0);

  const selectedSponsor = sponsors.find(s => s.id === form.sponsor_id) || null;
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(taskSearchQuery.toLowerCase()),
  );
  const visibleTasks = taskListExpanded ? filteredTasks : filteredTasks.slice(0, 6);

  return (
    <ClubPageLayout>
    <div className="bg-background">

      {/* ── Header ────────────────────────────────────────────────────────── */}
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
              onClick={copySponsorWizardLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              title={t('Kopieer aanmeld-link voor sponsors', 'Copier lien inscription sponsors', 'Copy sponsor sign-up link')}
            >
              {copiedSponsorLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5" />}
              {copiedSponsorLink
                ? t('Gekopieerd!', 'Copié !', 'Copied!')
                : t('Aanmeld-link', 'Lien annonce', 'Sign-up Link')}
            </button>
            <button
              onClick={() => setSponsorSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              {t('Sponsor', 'Sponsor', 'Sponsor')}
            </button>
            <button
              onClick={() => { setEditingCampaign(null); setForm(emptyForm()); setTaskSearchQuery(''); setSheetOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('Campagne', 'Campagne', 'Campaign')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── KPI strip ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: Clock,       label: t('Aanvragen', 'Demandes', 'Applications'),      value: pendingCampaigns.length,          color: 'text-amber-500',   highlight: pendingCampaigns.length > 0 },
            { icon: TrendingUp,  label: t('Actieve campagnes', 'Campagnes actives', 'Active Campaigns'), value: activeCampaignCount,    color: 'text-emerald-500', highlight: false },
            { icon: Eye,         label: t('Totale vertoningen', 'Impressions totales', 'Total Impressions'), value: totalImpressions.toLocaleString(), color: 'text-blue-500',    highlight: false },
            { icon: Target,      label: t('Totale claims', 'Claims totaux', 'Total Claims'), value: totalClaims.toLocaleString(),     color: 'text-purple-500',  highlight: false },
          ].map(({ icon: Icon, label, value, color, highlight }) => (
            <div
              key={label}
              className={cn(
                'rounded-2xl border p-5 transition-colors',
                highlight
                  ? 'border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800/40'
                  : 'border-border/40 bg-card',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-4 h-4', color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Pending Submissions ───────────────────────────────────────────── */}
        {pendingCampaigns.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('Nieuwe aanvragen', 'Nouvelles demandes', 'New Applications')}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 text-[11px] font-bold tabular-nums">
                {pendingCampaigns.length}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('— ingediend via het publieke aanmeld-portaal', '— soumises via le portail public', '— submitted via the public portal')}
              </span>
            </div>

            <div className="space-y-3">
              {pendingCampaigns.map((c) => {
                const TypeIcon = CAMPAIGN_TYPE_LABELS[c.campaign_type]?.icon || Megaphone;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-800/30 p-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Color dot */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${c.sponsor_brand_color || '#6366f1'}22` }}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ background: c.sponsor_brand_color || '#6366f1' }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {c.title}
                          </p>
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', STATUS_COLORS[c.status])}>
                            {t('Wacht op goedkeuring', 'En attente', 'Pending Approval')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {c.sponsor_name}
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TypeIcon className="w-3.5 h-3.5" />
                            {CAMPAIGN_TYPE_LABELS[c.campaign_type]?.[language as 'nl'|'fr'|'en'] || c.campaign_type}
                          </span>
                          {c.submitted_by_email && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="w-3.5 h-3.5" />
                              {c.submitted_by_email}
                            </span>
                          )}
                          {(c.linked_task_ids?.length || 0) > 0 && (
                            <span className="text-xs text-indigo-500">
                              {c.linked_task_ids!.length} {t('taken', 'tâches', 'tasks')}
                            </span>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEdit(c)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        >
                          {t('Bekijken', 'Voir', 'View')}
                        </button>
                        <button
                          onClick={() => handleRejectCampaign(c.id)}
                          disabled={rejectingId === c.id}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
                          title={t('Weigeren', 'Refuser', 'Reject')}
                        >
                          {rejectingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={async () => {
                            await handleApproveCampaign(c.id);
                            // After approval the campaign gets status 'active' — offer portal link
                            if (c.portal_access_token) {
                              const url = `${window.location.origin}/sponsor/portal/${c.id}/${c.portal_access_token}`;
                              navigator.clipboard.writeText(url).catch(() => {});
                              toast.success(t('Goedgekeurd! Portaal-link gekopieerd.', 'Approuvé ! Lien portail copié.', 'Approved! Portal link copied.'));
                            }
                          }}
                          disabled={approvingId === c.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          {approvingId === c.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle2 className="w-3.5 h-3.5" />}
                          {t('Goedkeuren + link', 'Approuver + lien', 'Approve + link')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ROI Calculator ────────────────────────────────────────────────── */}
        <ROICalculator language={language} />

        {/* ── Sponsors list ─────────────────────────────────────────────────── */}
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
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.brand_color }} />
                  <span className="font-medium text-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Campaign CRM table ────────────────────────────────────────────── */}
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
                    const ctr = c.total_impressions
                      ? ((c.total_claims || 0) / c.total_impressions * 100).toFixed(1)
                      : '—';
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
                              <p className="font-medium text-foreground truncate max-w-[160px]">{c.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{c.sponsor_name}</p>
                              {c.campaign_type === 'local_coupon' && (c.linked_task_ids?.length || 0) > 0 && (
                                <p className="text-[10px] text-indigo-500 mt-0.5">
                                  {c.linked_task_ids!.length} {t('taken', 'tâches', 'tasks')}
                                </p>
                              )}
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
                              title={t('Preview link', 'Lien aperçu', 'Preview link')}
                            >
                              {copiedId === `preview-${c.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Eye className="w-3 h-3" />}
                              Preview
                            </button>
                            <button
                              onClick={() => copyLink('results', c.id)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border border-border/40 hover:bg-muted/60 transition-colors text-muted-foreground"
                              title={t('Analytics link', 'Lien analytiques', 'Analytics link')}
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
                              className="px-2.5 py-1.5 rounded-md text-[11px] font-medium hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors border border-border/30"
                            >
                              {t('Bewerk', 'Modifier', 'Edit')}
                            </button>
                            {/* Portal link — only for active campaigns with a token */}
                            {c.status === 'active' && c.portal_access_token && (
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/sponsor/portal/${c.id}/${c.portal_access_token}`;
                                  navigator.clipboard.writeText(url);
                                  setCopiedId(`portal-${c.id}`);
                                  toast.success(t('Portaal-link gekopieerd!', 'Lien portail copié !', 'Portal link copied!'));
                                  setTimeout(() => setCopiedId(null), 2000);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border border-indigo-300/50 bg-indigo-50/60 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:border-indigo-700/40 dark:hover:bg-indigo-950/60 transition-colors text-indigo-600 dark:text-indigo-400"
                                title={t('Kopieer portaal-link voor sponsor', 'Copier lien portail', 'Copy portal link for sponsor')}
                              >
                                {copiedId === `portal-${c.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <ExternalLink className="w-3 h-3" />}
                                Portal
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleStatus(c)}
                              className={cn(
                                'p-1.5 rounded-md transition-colors',
                                c.status === 'active'
                                  ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  : 'text-muted-foreground hover:bg-muted/60',
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

      {/* ── Campaign Builder Sheet (2-col: form + live preview) ──────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0">
          <div className="flex h-full">
            {/* Left: form */}
            <div className="flex-1 overflow-y-auto px-6 py-6 border-r border-border/40">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-indigo-500" />
                  {editingCampaign
                    ? t('Campagne bewerken', 'Modifier la campagne', 'Edit Campaign')
                    : t('Nieuwe campagne', 'Nouvelle campagne', 'New Campaign')
                  }
                </SheetTitle>
                <SheetDescription>
                  {t(
                    'Stel de campagne in en publiceer naar de vrijwilligers-app.',
                    'Configurez la campagne et publiez dans l\'app.',
                    'Configure the campaign and publish to the volunteer app.',
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                {/* Sponsor */}
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
                              : 'border-border text-muted-foreground hover:border-indigo-300 hover:text-foreground',
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
                    placeholder={t('bv. €5 korting bij Slager Dirk', 'ex. €5 de réduction chez le Boucher', 'e.g. €5 off at Butcher Dirk')}
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
                    rows={2}
                    placeholder={t('Korte omschrijving van de actie...', 'Courte description de l\'action...', 'Short description of the offer...')}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                  />
                </div>

                {/* Logo upload */}
                <ImageUploader
                  value={form.image_url}
                  onChange={url => setForm(f => ({ ...f, image_url: url }))}
                  folder="uploads"
                  label={t('Logo / Advertentieafbeelding', 'Logo / Image publicitaire', 'Logo / Ad Image')}
                  variant="light"
                />

                {/* Cover image upload (banner only) */}
                {form.campaign_type === 'dashboard_banner' && (
                  <ImageUploader
                    value={form.cover_image_url}
                    onChange={url => setForm(f => ({ ...f, cover_image_url: url }))}
                    folder="uploads"
                    label={t('Achtergrondafbeelding banner', 'Image de fond bannière', 'Banner background image')}
                    variant="light"
                  />
                )}

                {/* Custom CTA (banner only) */}
                {form.campaign_type === 'dashboard_banner' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {t('CTA-knoptekst', 'Texte du bouton CTA', 'CTA button text')}
                    </label>
                    <input
                      type="text"
                      value={form.custom_cta}
                      onChange={e => setForm(f => ({ ...f, custom_cta: e.target.value }))}
                      placeholder={t('bv. Bekijk Ons Menu', 'ex. Voir Notre Menu', 'e.g. Visit Our Website')}
                      maxLength={30}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                )}

                {/* Rich description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('Uitgebreide beschrijving', 'Description détaillée', 'Detailed description')}
                  </label>
                  <textarea
                    value={form.rich_description}
                    onChange={e => setForm(f => ({ ...f, rich_description: e.target.value }))}
                    rows={3}
                    placeholder={t('Extra informatie over de aanbieding...', 'Informations supplémentaires...', 'Additional offer details...')}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                  />
                </div>

                {/* Reward value (coupons only) */}
                {form.campaign_type === 'local_coupon' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {t('Kortingsbedrag', 'Montant de la réduction', 'Discount amount')}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">€</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.reward_value_cents ? (parseInt(String(form.reward_value_cents), 10) / 100).toFixed(2) : ''}
                          onChange={e => setForm(f => ({
                            ...f,
                            reward_value_cents: e.target.value ? String(Math.round(parseFloat(e.target.value) * 100)) : '',
                          }))}
                          placeholder="5.00"
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                      </div>
                      {form.reward_value_cents && (
                        <span className="text-sm font-bold text-indigo-500">
                          = {form.reward_value_cents} centen
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Linked tasks (local_coupon only) ───────────────────────── */}
                {form.campaign_type === 'local_coupon' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                      <List className="w-3.5 h-3.5 text-muted-foreground" />
                      {t('Gekoppelde taken', 'Tâches liées', 'Linked tasks')}
                      <span className="ml-auto text-[11px] font-normal text-indigo-500">
                        {form.linked_task_ids.length} {t('geselecteerd', 'sélectionnées', 'selected')}
                      </span>
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t(
                        'Vrijwilligers ontvangen deze coupon nadat ze een van deze taken voltooien.',
                        'Les bénévoles reçoivent ce coupon après avoir complété l\'une de ces tâches.',
                        'Volunteers receive this coupon after completing one of these tasks.',
                      )}
                    </p>

                    {/* Search */}
                    <input
                      type="text"
                      value={taskSearchQuery}
                      onChange={e => setTaskSearchQuery(e.target.value)}
                      placeholder={t('Zoek taken...', 'Chercher des tâches...', 'Search tasks...')}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 mb-2"
                    />

                    {tasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        {t('Geen taken gevonden voor deze club.', 'Aucune tâche trouvée.', 'No tasks found for this club.')}
                      </p>
                    ) : (
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                          <AnimatePresence>
                            {visibleTasks.map(task => {
                              const isChecked = form.linked_task_ids.includes(task.id);
                              return (
                                <label
                                  key={task.id}
                                  className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/40',
                                    isChecked && 'bg-indigo-50/60 dark:bg-indigo-950/30',
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setForm(f => ({
                                        ...f,
                                        linked_task_ids: isChecked
                                          ? f.linked_task_ids.filter(id => id !== task.id)
                                          : [...f.linked_task_ids, task.id],
                                      }));
                                    }}
                                    className="w-4 h-4 rounded accent-indigo-500 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                                    {task.task_date && (
                                      <p className="text-[11px] text-muted-foreground">
                                        {new Date(task.task_date).toLocaleDateString(
                                          language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
                                          { day: 'numeric', month: 'short', year: 'numeric' },
                                        )}
                                      </p>
                                    )}
                                  </div>
                                  {isChecked && (
                                    <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  )}
                                </label>
                              );
                            })}
                          </AnimatePresence>
                        </div>

                        {filteredTasks.length > 6 && (
                          <button
                            onClick={() => setTaskListExpanded(e => !e)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border/40"
                          >
                            {taskListExpanded
                              ? <><ChevronUp className="w-3.5 h-3.5" /> {t('Minder tonen', 'Voir moins', 'Show less')}</>
                              : <><ChevronDown className="w-3.5 h-3.5" /> {filteredTasks.length - 6} {t('meer taken...', 'tâches de plus...', 'more tasks...')}</>
                            }
                          </button>
                        )}
                      </div>
                    )}
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
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('Status', 'Statut', 'Status')}
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as Campaign['status'] }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="draft">{t('Concept', 'Brouillon', 'Draft')}</option>
                    <option value="active">{t('Actief', 'Actif', 'Active')}</option>
                    <option value="ended">{t('Beëindigd', 'Terminé', 'Ended')}</option>
                  </select>
                </div>

                {/* Save */}
                <button
                  onClick={handleSaveCampaign}
                  disabled={saving || !form.sponsor_id || !form.title.trim()}
                  className="w-full h-11 rounded-xl font-semibold text-sm bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    editingCampaign
                      ? t('Wijzigingen opslaan', 'Enregistrer', 'Save changes')
                      : t('Campagne aanmaken', 'Créer la campagne', 'Create campaign')
                  )}
                </button>
              </div>
            </div>

            {/* Right: live preview (sticky) */}
            <div className="hidden sm:flex w-72 flex-col bg-muted/20 px-6 py-6 sticky top-0 h-full overflow-y-auto">
              <SponsorAdLivePreview
                form={{
                  businessName:     selectedSponsor?.name || '',
                  brandColor:       selectedSponsor?.brand_color || '#6366f1',
                  logoUrl:          form.image_url || '',
                  campaignType:     form.campaign_type === 'local_coupon' ? 'local_coupon' : 'dashboard_banner',
                  title:            form.title,
                  description:      form.description,
                  rewardText:       '',
                  rewardValueEuros: form.reward_value_cents ? (parseInt(String(form.reward_value_cents), 10) / 100).toFixed(2) : '',
                  imageUrl:         form.image_url || '',
                  coverImageUrl:    form.cover_image_url || '',
                  customCta:        form.custom_cta || '',
                  richDescription:  form.rich_description || '',
                  linkedTaskIds:    form.linked_task_ids,
                } satisfies PreviewForm}
              />

              {/* Stats summary box */}
              {editingCampaign && (
                <div className="mt-6 rounded-xl border border-border/40 bg-background p-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('Huidige prestaties', 'Performances actuelles', 'Current Performance')}
                  </p>
                  {[
                    { label: t('Vertoningen', 'Impressions', 'Impressions'), value: (editingCampaign.total_impressions || 0).toLocaleString() },
                    { label: t('Claims', 'Claims', 'Claims'), value: (editingCampaign.total_claims || 0).toLocaleString() },
                    { label: 'CTR', value: editingCampaign.total_impressions ? `${((editingCampaign.total_claims || 0) / editingCampaign.total_impressions * 100).toFixed(1)}%` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs font-bold text-foreground tabular-nums">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Type explanation */}
              <div className="mt-4 rounded-xl border border-border/40 bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t('Uitleg type', 'Explication type', 'Type explanation')}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {form.campaign_type === 'dashboard_banner' && t(
                    'Getoond als banner bovenaan het vrijwilligers-dashboard. Bereikt alle actieve vrijwilligers van jouw club.',
                    'Affiché comme bannière en haut du tableau de bord. Atteint tous les bénévoles actifs.',
                    'Shown as banner at the top of the volunteer dashboard. Reaches all active volunteers.',
                  )}
                  {form.campaign_type === 'task_tag' && t(
                    'Een badge op specifieke taken die aangeeft dat er een extra beloning is bij voltooiing.',
                    'Un badge sur des tâches spécifiques indiquant une récompense supplémentaire.',
                    'A badge on specific tasks indicating an extra reward upon completion.',
                  )}
                  {form.campaign_type === 'local_coupon' && t(
                    'Vrijwilligers ontvangen een scanbare QR-kortingsbon nadat ze een gekoppelde taak voltooien. Perfect voor lokale handelaars.',
                    'Les bénévoles reçoivent un bon de réduction QR après avoir complété une tâche liée.',
                    'Volunteers receive a scannable QR discount coupon after completing a linked task. Perfect for local businesses.',
                  )}
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Create Sponsor Sheet ──────────────────────────────────────────── */}
      <Sheet open={sponsorSheet} onOpenChange={setSponsorSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md">
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
                placeholder={t('bv. Slager Dirk', 'ex. Boucher Dirk', 'e.g. Butcher Dirk')}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('Merkkleur', 'Couleur de marque', 'Brand Color')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newSponsor.brand_color}
                  onChange={e => setNewSponsor(s => ({ ...s, brand_color: e.target.value }))}
                  className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <span className="text-sm font-mono text-muted-foreground">{newSponsor.brand_color}</span>
                <div
                  className="ml-auto w-10 h-10 rounded-xl border border-border shadow-sm"
                  style={{ background: newSponsor.brand_color }}
                />
              </div>
            </div>
            <button
              onClick={handleCreateSponsor}
              disabled={creatingSponsors || !newSponsor.name.trim()}
              className="w-full h-11 rounded-xl font-semibold text-sm bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {creatingSponsors ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Sponsor aanmaken', 'Créer le sponsor', 'Create sponsor')}
            </button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
    </ClubPageLayout>
  );
};

export default SponsorHub;
