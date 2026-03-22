/**
 * PublicSponsorPage — /sponsor/:club_id
 *
 * Light, airy 4-step wizard for local businesses to submit a campaign.
 * Orange accent colour, no login required.
 * Task linking is done by club admins in SponsorHub after approval.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Building2, Megaphone, Gift, ChevronRight, ChevronLeft,
  Check, Loader2, Tag, CheckCircle2, ArrowRight,
  Mail, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUploader from '@/components/sponsor/ImageUploader';
import SponsorAdLivePreview, { type PreviewForm } from '@/components/sponsor/SponsorAdLivePreview';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClubInfo { id: string; name: string }

interface WizardForm {
  businessName:     string;
  contactName:      string;
  contactEmail:     string;
  brandColor:       string;
  logoUrl:          string;
  campaignType:     'dashboard_banner' | 'local_coupon';
  title:            string;
  description:      string;
  richDescription:  string;
  rewardText:       string;
  rewardValueEuros: string;
  imageUrl:         string;
  coverImageUrl:    string;
  customCta:        string;
}

const defaultForm = (): WizardForm => ({
  businessName:     '',
  contactName:      '',
  contactEmail:     '',
  brandColor:       '#f97316',
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
});

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
  linkedTaskIds:    [],
});

// ── Shared input / label styles (light) ──────────────────────────────────────
const inputCls = [
  'w-full px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400',
  'bg-white border border-gray-200',
  'focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100',
  'transition-all',
].join(' ');

const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

// ── Step config (4 steps) ─────────────────────────────────────────────────────
const STEPS = [
  { label: 'Uw Bedrijf',        icon: Building2    },
  { label: 'Campagnetype',      icon: Megaphone    },
  { label: 'Details',           icon: Tag          },
  { label: 'Bekijk & Verstuur', icon: CheckCircle2 },
];

// ── Colour swatches ───────────────────────────────────────────────────────────
const SWATCHES = ['#f97316', '#6366f1', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

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

  const loadClub = useCallback(async () => {
    if (!club_id) return;
    setInfoLoading(true);
    const { data } = await supabase.rpc('get_public_club_info' as any, { p_club_id: club_id });
    if (data) setClubInfo(data as ClubInfo);
    setInfoLoading(false);
  }, [club_id]);

  useEffect(() => { loadClub(); }, [loadClub]);

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
      p_task_ids:           [],
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

    // ── Step 0: Uw Bedrijf ─────────────────────────────────────────────────
    <div className="space-y-5" key="s0">
      <div>
        <label className={labelCls}>Bedrijfsnaam *</label>
        <input
          className={inputCls}
          value={form.businessName}
          onChange={e => set('businessName', e.target.value)}
          placeholder="bv. Slagerij Dirk"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Contactpersoon</label>
          <input
            className={inputCls}
            value={form.contactName}
            onChange={e => set('contactName', e.target.value)}
            placeholder="Voornaam Naam"
          />
        </div>
        <div>
          <label className={labelCls}>E-mailadres *</label>
          <input
            className={inputCls}
            type="email"
            value={form.contactEmail}
            onChange={e => set('contactEmail', e.target.value)}
            placeholder="u@uw-zaak.be"
          />
        </div>
      </div>

      {/* Brand colour */}
      <div>
        <label className={labelCls}>Merkkleur</label>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="color"
            value={form.brandColor}
            onChange={e => set('brandColor', e.target.value)}
            className="w-12 h-11 rounded-xl border border-gray-200 cursor-pointer bg-white p-1"
          />
          <input
            className={inputCls}
            value={form.brandColor}
            onChange={e => set('brandColor', e.target.value)}
            placeholder="#f97316"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {SWATCHES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('brandColor', c)}
              className={cn(
                'w-8 h-8 rounded-lg border-2 transition-all',
                form.brandColor === c
                  ? 'border-gray-900 scale-110 shadow-sm'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      {/* Logo upload */}
      <ImageUploader
        value={form.logoUrl}
        onChange={url => set('logoUrl', url)}
        folder="pending"
        label="Logo van uw zaak"
        compact
        variant="light"
      />
    </div>,

    // ── Step 1: Campagnetype ───────────────────────────────────────────────
    <div className="space-y-4" key="s1">
      <p className="text-sm text-gray-500">Kies het type advertentie dat het beste bij uw zaak past.</p>
      <div className="grid gap-4">
        {([
          {
            type:  'dashboard_banner' as const,
            icon:  Megaphone,
            title: 'Dashboard Banner',
            desc:  'Uw logo en boodschap verschijnt bovenaan het dashboard van elke vrijwilliger. Maximale zichtbaarheid.',
          },
          {
            type:  'local_coupon' as const,
            icon:  Gift,
            title: 'Lokale Beloning',
            desc:  'Vrijwilligers verdienen een digitale kortingsbon bij uw zaak na een shift. Ideaal om klanten te trekken.',
          },
        ]).map(({ type, icon: Icon, title, desc }) => (
          <button
            key={type}
            type="button"
            onClick={() => set('campaignType', type)}
            className={cn(
              'w-full text-left p-5 rounded-2xl border-2 transition-all',
              form.campaignType === type
                ? 'border-orange-400 bg-orange-50 shadow-md shadow-orange-100/60'
                : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30',
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                  form.campaignType === type
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-400',
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  {form.campaignType === type && (
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>,

    // ── Step 2: Details ────────────────────────────────────────────────────
    <div className="space-y-5" key="s2">

      <div>
        <label className={labelCls}>Advertentietitel *</label>
        <input
          className={inputCls}
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder={
            form.campaignType === 'local_coupon'
              ? 'bv. Gratis broodje bij elke shift'
              : 'bv. 10% korting bij Slagerij Dirk'
          }
        />
      </div>

      {form.campaignType === 'dashboard_banner' && (
        <div>
          <label className={labelCls}>
            CTA knoptekst
            <span className="ml-1.5 text-gray-400 font-normal text-xs">— tekst op de actieknop</span>
          </label>
          <input
            className={inputCls}
            value={form.customCta}
            onChange={e => set('customCta', e.target.value)}
            placeholder='bv. "Bekijk Menu", "Kom Langs"'
          />
        </div>
      )}

      <div>
        <label className={labelCls}>Korte beschrijving</label>
        <textarea
          className={cn(inputCls, 'resize-none')}
          rows={2}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Eén zin die uw aanbieding samenvat..."
        />
      </div>

      <div>
        <label className={labelCls}>
          Uitgebreide beschrijving{' '}
          <span className="text-gray-400 font-normal text-xs">(optioneel)</span>
        </label>
        <textarea
          className={cn(inputCls, 'resize-none')}
          rows={3}
          value={form.richDescription}
          onChange={e => set('richDescription', e.target.value)}
          placeholder="Extra info, voorwaarden, openingsuren..."
        />
      </div>

      {/* Media uploads */}
      <div className="grid grid-cols-2 gap-4">
        <ImageUploader
          value={form.imageUrl}
          onChange={url => set('imageUrl', url)}
          folder="pending"
          label="Logo / productfoto"
          compact
          variant="light"
        />
        <ImageUploader
          value={form.coverImageUrl}
          onChange={url => set('coverImageUrl', url)}
          folder="pending"
          label="Omslagfoto"
          variant="light"
        />
      </div>

      {/* Coupon-specific */}
      {form.campaignType === 'local_coupon' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Beloningsbeschrijving</label>
            <input
              className={inputCls}
              value={form.rewardText}
              onChange={e => set('rewardText', e.target.value)}
              placeholder="bv. Gratis €5 broodje"
            />
          </div>
          <div>
            <label className={labelCls}>Kortingsbedrag (€)</label>
            <input
              className={inputCls}
              type="number"
              min="0"
              step="0.01"
              value={form.rewardValueEuros}
              onChange={e => set('rewardValueEuros', e.target.value)}
              placeholder="5.00"
            />
          </div>
        </div>
      )}
    </div>,

    // ── Step 3: Preview + Submit ────────────────────────────────────────────
    <div className="space-y-6" key="s3">

      {/* Live preview */}
      <div>
        <p className="text-sm text-gray-500 text-center mb-4">
          Zo ziet uw advertentie eruit in de app van de vrijwilligers.
        </p>
        <div className="flex justify-center">
          <SponsorAdLivePreview form={toPreview(form)} />
        </div>
      </div>

      {/* Summary strip */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
        {[
          { label: 'Bedrijf',  value: form.businessName },
          { label: 'Contact',  value: form.contactEmail },
          { label: 'Type',     value: form.campaignType === 'local_coupon' ? 'Lokale Beloning' : 'Dashboard Banner' },
          { label: 'Titel',    value: form.title },
          ...(form.rewardText ? [{ label: 'Beloning', value: form.rewardText }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-xs text-gray-400 w-16 shrink-0">{label}</span>
            <span className="text-sm text-gray-900 truncate">{value || <span className="text-gray-300">—</span>}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        Door in te dienen gaat u akkoord met de algemene voorwaarden. U ontvangt een bevestiging op{' '}
        <span className="text-gray-600">{form.contactEmail || '…'}</span>.
      </p>

      {/* Submit button (inside the card for step 3) */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 disabled:opacity-60"
      >
        {submitting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Bezig…</>
          : <><Check className="w-4 h-4" /> Aanvraag indienen</>
        }
      </button>
    </div>,
  ];

  // ── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50/30 flex items-center justify-center px-4">
        <Bg />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Aanvraag ontvangen!</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Uw advertentieaanvraag is ingediend bij{' '}
              <span className="text-gray-900 font-medium">{clubInfo?.name}</span>.
              U ontvangt een bevestiging op{' '}
              <span className="text-orange-600">{form.contactEmail}</span>.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors text-sm font-semibold shadow-md shadow-orange-200"
          >
            Terug naar de homepage <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (infoLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
    </div>
  );

  if (!clubInfo) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <p className="text-gray-400">Club niet gevonden.</p>
    </div>
  );

  // ── Wizard ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50/20">
      <Bg />
      <div className="relative z-10 max-w-xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 mb-4">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-orange-800 uppercase tracking-widest">
              Adverteer bij {clubInfo.name}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Bereik lokale{' '}
            <span className="text-orange-500">vrijwilligers</span>
          </h1>
          <p className="text-sm text-gray-400">Maak uw advertentie in 5 minuten. Geen account vereist.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center justify-center rounded-full font-bold transition-all duration-300',
                  i < step
                    ? 'w-7 h-7 bg-orange-500 text-white'
                    : i === step
                    ? 'w-9 h-9 bg-orange-500 text-white ring-4 ring-orange-200 shadow-md'
                    : 'w-7 h-7 bg-gray-100 text-gray-400',
                )}
              >
                {i < step
                  ? <Check className="w-3.5 h-3.5" />
                  : <span className="text-[11px]">{i + 1}</span>}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-6 rounded transition-all duration-500',
                    i < step ? 'bg-orange-400' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
          Stap {step + 1} van {STEPS.length} — {STEPS[step].label}
        </p>

        {/* Content card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 mb-6 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -28 : 28 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation — hide bottom nav button on last step (submit is inside the card) */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => go(-1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" /> Terug
          </button>

          {step < STEPS.length - 1 && (
            <button
              onClick={() => go(1)}
              disabled={!canAdvance()}
              className={cn(
                'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
                canAdvance()
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-200'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed',
              )}
            >
              Volgende <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

// ── Subtle background orbs ────────────────────────────────────────────────────
const Bg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-orange-200/40 blur-3xl" />
    <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-amber-200/40 blur-3xl" />
  </div>
);

export default PublicSponsorPage;
