import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Terminal, Eye, EyeOff, Copy, Check,
  RefreshCw, Loader2, Gift, ShoppingBag,
  Wallet, Save,
} from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Labels ──────────────────────────────────────────────────────────────────

const L: Record<Language, Record<string, string>> = {
  nl: {
    title: 'Kassa & Beloningen Beheer',
    back: 'Terug',
    posTitle: 'Kassa Systeem (POS) Integratie',
    posDesc: 'Verbind je kassasysteem met het platform via deze beveiligde API-sleutel.',
    generateKey: 'Genereer Kassa API Sleutel',
    regenerateKey: 'Nieuwe sleutel genereren',
    regenerateWarn: 'De huidige sleutel wordt onmiddellijk ongeldig.',
    copy: 'Kopieer', copied: 'Gekopieerd!', show: 'Toon', hide: 'Verberg',
    noKeyYet: 'Nog geen API-sleutel gegenereerd',
    noKeyDesc: 'Genereer een sleutel om je kassasysteem te koppelen.',
    rewardsTitle: 'Standaard Vrijwilligers Beloningen',
    rewardsDesc: 'Stel in wat vrijwilligers verdienen per shift.',
    canteenToggle: 'Kantine Tegoed (€)',
    canteenDesc: 'Vrijwilligers ontvangen automatisch euro-tegoed op hun kantineportemonnee na elke afgewerkte shift.',
    canteenAmount: 'Tegoed per shift (€)',
    fanshopToggle: 'Fanshop Tegoed',
    fanshopAmount: 'Tegoed per shift (€)',
    saveConfig: 'Configuratie Opslaan',
    saved: 'Beloningen opgeslagen!',
    saveError: 'Opslaan mislukt. Probeer opnieuw.',
  },
  fr: {
    title: 'Gestion Caisse & Récompenses',
    back: 'Retour',
    posTitle: 'Intégration Caisse (POS)',
    posDesc: 'Connectez votre caisse au platform via cette clé API sécurisée.',
    generateKey: 'Générer une clé API Caisse',
    regenerateKey: 'Générer une nouvelle clé',
    regenerateWarn: 'La clé actuelle sera immédiatement invalidée.',
    copy: 'Copier', copied: 'Copié !', show: 'Afficher', hide: 'Masquer',
    noKeyYet: 'Aucune clé API générée',
    noKeyDesc: 'Générez une clé pour connecter votre caisse.',
    rewardsTitle: 'Récompenses Bénévoles Standard',
    rewardsDesc: 'Configurez ce que les bénévoles gagnent par shift.',
    canteenToggle: 'Crédit Cantine (€)',
    canteenDesc: 'Les bénévoles reçoivent automatiquement un crédit en euros sur leur portefeuille cantine après chaque shift effectué.',
    canteenAmount: 'Crédit par shift (€)',
    fanshopToggle: 'Crédit Fanshop',
    fanshopAmount: 'Crédit par shift (€)',
    saveConfig: 'Enregistrer la configuration',
    saved: 'Récompenses enregistrées !',
    saveError: 'Échec. Réessayez.',
  },
  en: {
    title: 'POS & Rewards Management',
    back: 'Back',
    posTitle: 'POS System Integration',
    posDesc: 'Connect your cash register to the platform using this secure API key.',
    generateKey: 'Generate POS API Key',
    regenerateKey: 'Generate new key',
    regenerateWarn: 'The current key will be immediately invalidated.',
    copy: 'Copy', copied: 'Copied!', show: 'Show', hide: 'Hide',
    noKeyYet: 'No API key generated yet',
    noKeyDesc: 'Generate a key to connect your POS system.',
    rewardsTitle: 'Default Volunteer Rewards',
    rewardsDesc: 'Configure what volunteers earn per shift.',
    canteenToggle: 'Canteen Credit (€)',
    canteenDesc: 'Volunteers automatically receive Euro credit in their canteen wallet after each completed shift.',
    canteenAmount: 'Credit per shift (€)',
    fanshopToggle: 'Fanshop Credit',
    fanshopAmount: 'Credit per shift (€)',
    saveConfig: 'Save Configuration',
    saved: 'Rewards saved!',
    saveError: 'Save failed. Try again.',
  },
};

// ─── Page ────────────────────────────────────────────────────────────────────

const KassaPasjesBeheer = () => {
  const navigate = useNavigate();
  const { clubId } = useClubContext();
  const { language } = useLanguage();
  const l = L[language as Language] ?? L.nl;

  // POS key state
  const [posKey, setPosKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  // Rewards state — Kantine Tegoed (€)
  const [canteenEnabled, setCanteenEnabled] = useState(false);
  const [canteenAmount, setCanteenAmount] = useState('2.50');
  // Fanshop credit (unchanged)
  const [fanshopEnabled, setFanshopEnabled] = useState(false);
  const [fanshopAmount, setFanshopAmount] = useState('2.50');

  const [savingRewards, setSavingRewards] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load data ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);

    const [posRes, rewardsRes] = await Promise.all([
      supabase
        .from('club_pos_settings')
        .select('pos_api_key')
        .eq('club_id', clubId)
        .maybeSingle(),
      (supabase as any)
        .from('club_reward_settings')
        .select('canteen_enabled, canteen_reward_eur, fanshop_credit_enabled, fanshop_credit_per_shift')
        .eq('club_id', clubId)
        .maybeSingle(),
    ]);

    if (posRes.data) setPosKey(posRes.data.pos_api_key);

    if (rewardsRes.data) {
      const r = rewardsRes.data;
      setCanteenEnabled(r.canteen_enabled ?? false);
      setCanteenAmount(String(r.canteen_reward_eur ?? '2.50'));
      setFanshopEnabled(r.fanshop_credit_enabled ?? false);
      setFanshopAmount(String(r.fanshop_credit_per_shift ?? '2.50'));
    }

    setLoading(false);
  }, [clubId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── POS key handlers ─────────────────────────────────────────────────────

  const handleGenerateKey = async () => {
    if (!clubId) return;
    setGenLoading(true);
    const { data, error } = await supabase.rpc('regenerate_pos_api_key', { p_club_id: clubId });
    if (error) toast.error(error.message);
    else { setPosKey(data as string); setShowKey(true); toast.success('API key generated'); }
    setGenLoading(false);
  };

  const handleCopy = async () => {
    if (!posKey) return;
    await navigator.clipboard.writeText(posKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Save rewards ─────────────────────────────────────────────────────────

  const handleSaveRewards = async () => {
    if (!clubId) return;
    setSavingRewards(true);

    const payload = {
      club_id: clubId,
      canteen_enabled: canteenEnabled,
      canteen_reward_eur: parseFloat(canteenAmount) || 0,
      fanshop_credit_enabled: fanshopEnabled,
      fanshop_credit_per_shift: parseFloat(fanshopAmount) || 0,
    };

    const { error } = await (supabase as any)
      .from('club_reward_settings')
      .upsert(payload, { onConflict: 'club_id' });

    if (error) toast.error(l.saveError);
    else toast.success(l.saved);
    setSavingRewards(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const sectionAnim = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-muted/30" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 flex items-center gap-3 min-h-[60px] pt-[env(safe-area-inset-top)]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-2 rounded-xl hover:bg-muted transition-colors font-semibold text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">{l.back}</span>
        </button>
        <h1 className="text-lg font-heading font-bold text-foreground truncate">{l.title}</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-6 pb-8">

        {/* ─── SECTION 1: POS API Key ──────────────────────────────────── */}
        <motion.div {...sectionAnim} className="bg-card rounded-xl border border-border shadow-sm">
          {/* Section header */}
          <div className="flex items-center gap-4 p-5 sm:p-6 border-b border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground">{l.posTitle}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{l.posDesc}</p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {posKey ? (
              <div className="space-y-4">
                {/* Key display */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-muted rounded-lg px-4 py-3 font-mono text-sm text-foreground truncate select-all">
                    {showKey ? posKey : '•'.repeat(32)}
                  </div>
                  <button
                    onClick={() => setShowKey(v => !v)}
                    className="shrink-0 w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label={showKey ? l.hide : l.show}
                  >
                    {showKey ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 w-10 h-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label={l.copy}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
                {/* Regenerate */}
                <button
                  onClick={handleGenerateKey}
                  disabled={genLoading}
                  className="w-full h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {l.regenerateKey}
                </button>
                <p className="text-xs text-muted-foreground text-center">{l.regenerateWarn}</p>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                  <Terminal className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{l.noKeyYet}</p>
                  <p className="text-sm text-muted-foreground mt-1">{l.noKeyDesc}</p>
                </div>
                <button
                  onClick={handleGenerateKey}
                  disabled={genLoading}
                  className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-base transition-colors hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {genLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Terminal className="w-5 h-5" />}
                  {l.generateKey}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── SECTION 2: Reward Configuration ─────────────────────────── */}
        <motion.div {...sectionAnim} transition={{ delay: 0.08 }} className="bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-4 p-5 sm:p-6 border-b border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground">{l.rewardsTitle}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{l.rewardsDesc}</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-6">

            {/* ── Kantine Tegoed (€) ──────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  <Label htmlFor="canteen-toggle" className="text-base font-medium text-foreground cursor-pointer">
                    {l.canteenToggle}
                  </Label>
                </div>
                <Switch
                  id="canteen-toggle"
                  checked={canteenEnabled}
                  onCheckedChange={setCanteenEnabled}
                />
              </div>
              <p className="text-sm text-muted-foreground pl-8">{l.canteenDesc}</p>
              {canteenEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pl-8"
                >
                  <Label htmlFor="canteen-amount" className="text-sm text-muted-foreground mb-1.5 block">
                    {l.canteenAmount}
                  </Label>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-600">€</span>
                    <Input
                      id="canteen-amount"
                      type="number"
                      min={0}
                      step={0.25}
                      value={canteenAmount}
                      onChange={e => setCanteenAmount(e.target.value)}
                      className="pl-7 h-10"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* ── Fanshop credit ─────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <Label htmlFor="fanshop-toggle" className="text-base font-medium text-foreground cursor-pointer">
                    {l.fanshopToggle}
                  </Label>
                </div>
                <Switch
                  id="fanshop-toggle"
                  checked={fanshopEnabled}
                  onCheckedChange={setFanshopEnabled}
                />
              </div>
              {fanshopEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pl-8"
                >
                  <Label htmlFor="fanshop-amount" className="text-sm text-muted-foreground mb-1.5 block">
                    {l.fanshopAmount}
                  </Label>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                    <Input
                      id="fanshop-amount"
                      type="number"
                      min={0}
                      step={0.5}
                      value={fanshopAmount}
                      onChange={e => setFanshopAmount(e.target.value)}
                      className="pl-7 h-10"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="px-5 sm:px-6 pb-5 sm:pb-6">
            <button
              onClick={handleSaveRewards}
              disabled={savingRewards}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingRewards ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {l.saveConfig}
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default KassaPasjesBeheer;
