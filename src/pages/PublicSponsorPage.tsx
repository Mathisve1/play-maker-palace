import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Building2, Megaphone, Gift, ChevronRight, ChevronLeft,
  Check, Loader2, Tag, CheckCircle2, ArrowRight,
  Calendar, Mail, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUploader from '@/components/sponsor/ImageUploader';
import SponsorAdLivePreview, { type PreviewForm } from '@/components/sponsor/SponsorAdLivePreview';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClubInfo { id: string; name: string }

interface WizardForm {
  businessName:       string;
  contactName:        string;
  contactEmail:       string;
  brandColor:         string;
  logoUrl:            string;
  campaignType:       'dashboard_banner' | 'local_coupon';
  title:              string;
  description:        string;
  richDescription:    string;
  rewardText:         string;
  rewardValueEuros:   string;
  imageUrl:           string;
  coverImageUrl:      string;
  customCta:          string;
  linkedTaskIds:      string[];
}

const defaultForm = (): WizardForm => ({
  businessName:     '',
  contactName:      '',
  contactEmail:     '',
  brandColor:       '#6366f1',
  logoUrl:          '',
  campaignType:     'dashboard_banner',
  title:            '',
  description:      '',
  richDescription:  '',
  rewardText:       '',
  rewardValueEuros: '',
  imageUrl:         '',
  coverImageUrl:    '',
  customCta:        '',
  linkedTaskIds:    [],
});

// Map WizardForm → PreviewForm (the subset SponsorAdLivePreview needs)
const toPreview = (f: WizardForm): PreviewForm => ({
  businessName:     f.businessName,
  brandColor:       f.brandColor,
  logoUrl:          f.logoUrl,
  campaignType:     f.campaignType,
  title:            f.title,
  description:      f.description,
  rewardText:       f.rewardText,
  rewardValueEuros: f.rewardValueEuros,
  imageUrl:         f.imageUrl,
  coverImageUrl:    f.coverImageUrl,
  customCta:        f.customCta,
  richDescription:  f.richDescription,
  linkedTaskIds:    f.linkedTaskIds,
});

// ── Shared input / label styles (dark glassmorphism) ─────────────────────────
const inputCls = [
  'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30',
  'bg-white/[0.06] border border-white/[0.10]',
  'focus:outline-none focus:border-indigo-400/60 focus:ring-1 focus:ring-indigo-400/40',
  'transition-all',
].join(' ');

const labelCls = 'block text-sm font-medium text-white/70 mb-1.5';

// ── Step config ───────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Uw Bedrijf',   icon: Building2   },
  { label: 'Campagnetype', icon: Megaphone   },
  { label: 'Details',      icon: Tag         },
  { label: 'Voorbeeld',    icon: CheckCircle2 },
  { label: 'Indienen',     icon: Check       },
];

// ── Main component ────────────────────────────────────────────────────────────
const PublicSponsorPage = () => {
  const { club_id } = useParams<{ club_id: string }>();

  const [clubInfo,    setClubInfo]    = useState<ClubInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [step,        setStep]        = useState(0);
  const [form,        setForm]        = useState(defaultForm());
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [direction,   setDirection]   = useState(1);

  // ── Load club info ─────────────────────────────────────────────────────────
  const loadClub = useCallback(async () => {
    if (!club_id) return;
    setInfoLoading(true);
    const infoRes = await supabase.rpc('get_public_club_info' as any, { p_club_id: club_id });
    if (infoRes.data) setClubInfo(infoRes.data as ClubInfo);
    setInfoLoading(false);
  }, [club_id]);

  useEffect(() => { loadClub(); }, [loadClub]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = <K extends keyof WizardForm>(key: K, val: WizardForm[K]) =>
    setForm(f => ({ ...f, [key]: val }));


  const canAdvance = (): boolean => {
    if (step === 0) return form.businessName.trim().length > 0 && form.contactEmail.trim().length > 0;
    if (step === 2) return form.title.trim().length > 0;
    return true;
  };

  const go = (delta: number) => {
    setDirection(delta);
    setStep(s => Math.max(0, Math.min(STEPS.length - 1, s + delta)));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!club_id) return;
    setSubmitting(true);

    const { data, error } = await (supabase.rpc as any)('submit_sponsor_application', {
      p_club_id:            club_id,
      p_sponsor_name:       form.businessName.trim(),
      p_brand_color:        form.brandColor,
      p_logo_url:           form.logoUrl.trim(),
      p_contact_name:       form.contactName.trim(),
      p_contact_email:      form.contactEmail.trim(),
      p_campaign_type:      form.campaignType,
      p_title:              form.title.trim(),
      p_description:        form.description.trim(),
      p_reward_text:        form.rewardText.trim(),
      p_reward_value_cents: form.rewardValueEuros
        ? Math.round(parseFloat(form.rewardValueEuros) * 100)
        : null,
      p_image_url:          form.imageUrl.trim(),
      p_task_ids:           form.linkedTaskIds,
      p_cover_image_url:    form.coverImageUrl.trim(),
      p_custom_cta:         form.customCta.trim(),
      p_rich_description:   form.richDescription.trim(),
    });

    if (error || !data?.success) {
      toast.error(error?.message || 'Er is iets misgegaan. Probeer opnieuw.');
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  // ── Step content ───────────────────────────────────────────────────────────
  const stepContent = [

    // ── Step 0: Uw Bedrijf ──────────────────────────────────────────────────
    <div className="space-y-5" key="s0">
      <div>
        <label className={labelCls}>Bedrijfsnaam *</label>
        <input className={inputCls} value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="bv. Slagerij Dirk" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Contactpersoon</label>
          <input className={inputCls} value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Voornaam Naam" />
        </div>
        <div>
          <label className={labelCls}>E-mailadres *</label>
          <input className={inputCls} type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="u@uw-zaak.be" />
        </div>
      </div>

      {/* Brand color */}
      <div>
        <label className={labelCls}>Merkkleur</label>
        <div className="flex items-center gap-3">
          <input type="color" value={form.brandColor} onChange={e => set('brandColor', e.target.value)}
            className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer bg-transparent p-1" />
          <div className="flex-1">
            <input className={inputCls} value={form.brandColor} onChange={e => set('brandColor', e.target.value)} placeholder="#6366f1" />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'].map(c => (
            <button key={c} type="button" onClick={() => set('brandColor', c)}
              className={cn('w-7 h-7 rounded-lg border-2 transition-all', form.brandColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105')}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      {/* Logo upload */}
      <ImageUploader
        value={form.logoUrl}
        onChange={url => set('logoUrl', url)}
        folder="pending"
        label="Logo"
        compact
        variant="dark"
      />
    </div>,

    // ── Step 1: Campagnetype ────────────────────────────────────────────────
    <div className="space-y-4" key="s1">
      <p className="text-sm text-white/50">Kies het type advertentie dat u wilt plaatsen.</p>
      <div className="grid gap-4">
        {([
          { type: 'dashboard_banner' as const, icon: Megaphone, title: 'Dashboard Banner', desc: 'Uw logo en boodschap verschijnt bovenaan het dashboard van elke vrijwilliger. Maximale zichtbaarheid.' },
          { type: 'local_coupon'    as const, icon: Gift,      title: 'Lokale Beloning',   desc: 'Vrijwilligers verdienen een digitale kortingsbon bij uw zaak na een shift.' },
        ]).map(({ type, icon: Icon, title, desc }) => (
          <button key={type} type="button" onClick={() => set('campaignType', type)}
            className={cn('w-full text-left p-5 rounded-2xl border transition-all',
              form.campaignType === type
                ? 'border-indigo-400/70 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20',
            )}>
            <div className="flex items-start gap-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                form.campaignType === type ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-white/40')}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  {form.campaignType === type && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>,

    // ── Step 2: Details ─────────────────────────────────────────────────────
    <div className="space-y-4" key="s2">

      <div>
        <label className={labelCls}>Advertentietitel *</label>
        <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)}
          placeholder={form.campaignType === 'local_coupon' ? 'bv. Gratis broodje bij elke shift' : 'bv. 10% korting bij Slagerij Dirk'} />
      </div>

      {form.campaignType === 'dashboard_banner' && (
        <div>
          <label className={labelCls}>
            CTA knoptekst
            <span className="ml-1.5 text-white/30 font-normal">— tekst op de actieknop</span>
          </label>
          <input className={inputCls} value={form.customCta} onChange={e => set('customCta', e.target.value)}
            placeholder='bv. "Bekijk Menu", "Kom Langs", "Scan Nu"' />
        </div>
      )}

      <div>
        <label className={labelCls}>Korte beschrijving</label>
        <textarea className={cn(inputCls, 'resize-none')} rows={2} value={form.description}
          onChange={e => set('description', e.target.value)} placeholder="Eén zin die uw aanbieding samenvat..." />
      </div>

      <div>
        <label className={labelCls}>Uitgebreide beschrijving <span className="text-white/30 font-normal">(optioneel)</span></label>
        <textarea className={cn(inputCls, 'resize-none')} rows={3} value={form.richDescription}
          onChange={e => set('richDescription', e.target.value)} placeholder="Extra info, voorwaarden, openingsuren..." />
      </div>

      {/* Media uploads */}
      <div className="grid grid-cols-2 gap-4">
        <ImageUploader
          value={form.imageUrl}
          onChange={url => set('imageUrl', url)}
          folder="pending"
          label="Logo / product foto"
          compact
          variant="dark"
        />
        <ImageUploader
          value={form.coverImageUrl}
          onChange={url => set('coverImageUrl', url)}
          folder="pending"
          label="Omslagfoto"
          variant="dark"
        />
      </div>

      {/* Coupon-specific fields */}
      {form.campaignType === 'local_coupon' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Beloningsbeschrijving</label>
              <input className={inputCls} value={form.rewardText} onChange={e => set('rewardText', e.target.value)} placeholder="bv. Gratis €5 broodje" />
            </div>
            <div>
              <label className={labelCls}>Kortingsbedrag (€)</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={form.rewardValueEuros}
                onChange={e => set('rewardValueEuros', e.target.value)} placeholder="5.00" />
            </div>
          </div>

        </>
      )}
    </div>,

    // ── Step 3: Voorbeeld (preview) ─────────────────────────────────────────
    <div className="flex flex-col items-center gap-5" key="s3">
      <p className="text-sm text-white/50 text-center">
        Zo ziet uw advertentie er precies uit in de app van de vrijwilligers.
      </p>

      <SponsorAdLivePreview form={toPreview(form)} />

      {/* Quick summary strip */}
      <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-sm">
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Samenvatting</p>
        {[
          { label: 'Bedrijf', value: form.businessName },
          { label: 'Type',    value: form.campaignType === 'local_coupon' ? 'Lokale Beloning' : 'Dashboard Banner' },
          { label: 'Titel',   value: form.title },
          ...(form.rewardText ? [{ label: 'Beloning', value: form.rewardText }] : []),
          { label: 'Contact', value: form.contactEmail },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-white/40 text-xs shrink-0">{label}</span>
            <span className="text-sm text-white text-right truncate">{value || '—'}</span>
          </div>
        ))}
      </div>
    </div>,

    // ── Step 4: Indienen ─────────────────────────────────────────────────────
    <div className="space-y-5" key="s4">
      <p className="text-sm text-white/60 leading-relaxed">
        Uw aanvraag wordt doorgestuurd naar het team van{' '}
        <span className="text-white font-medium">{clubInfo?.name || 'de club'}</span>.
        Na goedkeuring verschijnt uw advertentie onmiddellijk in de app.
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/[0.06]">
        {[
          { label: 'Bedrijf',  value: form.businessName,  icon: Building2 },
          { label: 'Contact',  value: form.contactEmail,  icon: Mail      },
          { label: 'Type',     value: form.campaignType === 'local_coupon' ? 'Lokale Beloning' : 'Dashboard Banner', icon: Megaphone },
          { label: 'Titel',    value: form.title,         icon: Tag       },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <Icon className="w-4 h-4 text-white/30 shrink-0" />
            <span className="text-xs text-white/40 w-16 shrink-0">{label}</span>
            <span className="text-sm text-white truncate">{value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/30 leading-relaxed">
        Door in te dienen gaat u akkoord met de algemene voorwaarden. U ontvangt een bevestiging op{' '}
        <span className="text-white/50">{form.contactEmail}</span>.
      </p>
    </div>,
  ];

  // ── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#060610] text-white flex items-center justify-center px-4">
        <Bg />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Aanvraag ontvangen!</h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Uw advertentieaanvraag is ingediend bij{' '}
              <span className="text-white">{clubInfo?.name}</span>.
              U ontvangt een bevestiging op{' '}
              <span className="text-indigo-300">{form.contactEmail}</span>.
            </p>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-sm font-medium">
            Terug naar de homepage <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Loading / not found ───────────────────────────────────────────────────
  if (infoLoading) return (
    <div className="min-h-screen bg-[#060610] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  if (!clubInfo) return (
    <div className="min-h-screen bg-[#060610] text-white flex items-center justify-center px-4">
      <p className="text-white/50">Club niet gevonden.</p>
    </div>
  );

  // ── Main wizard ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060610] text-white">
      <Bg />
      <div className="relative z-10 max-w-xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">
              Adverteer bij {clubInfo.name}
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-1">
            Bereik lokale{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">vrijwilligers</span>
          </h1>
          <p className="text-sm text-white/40">Maak uw advertentie in 5 minuten. Geen account vereist.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'flex items-center justify-center rounded-full transition-all duration-300',
                i < step  ? 'w-6 h-6 bg-indigo-500 text-white'
                : i === step ? 'w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                : 'w-6 h-6 bg-white/[0.06] text-white/20',
              )}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px w-5 transition-all duration-500', i < step ? 'bg-indigo-500' : 'bg-white/[0.08]')} />
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs font-semibold text-white/50 uppercase tracking-widest mb-6">
          Stap {step + 1} van {STEPS.length} — {STEPS[step].label}
        </p>

        {/* Content card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 mb-6 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step}
              initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}>
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => go(-1)} disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all disabled:opacity-0 disabled:pointer-events-none">
            <ChevronLeft className="w-4 h-4" />
            Terug
          </button>

          {step < STEPS.length - 1 ? (
            <button onClick={() => go(1)} disabled={!canAdvance()}
              className={cn('flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
                canAdvance()
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/20'
                  : 'bg-white/[0.06] text-white/30 cursor-not-allowed',
              )}>
              Volgende <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Bezig...</>
                : <><Check className="w-4 h-4" /> Aanvraag indienen</>
              }
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

// ── Background gradient orbs ──────────────────────────────────────────────────
const Bg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    <div className="absolute -top-60 -right-60 w-[480px] h-[480px] rounded-full bg-indigo-600/15 blur-3xl" />
    <div className="absolute -bottom-60 -left-60 w-[480px] h-[480px] rounded-full bg-purple-600/15 blur-3xl" />
  </div>
);

export default PublicSponsorPage;
