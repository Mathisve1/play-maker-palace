import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Key, RefreshCw, Copy, Check,
  CreditCard, UserCheck, Loader2, Eye, EyeOff, Unlink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface VolunteerOption { id: string; full_name: string; email: string }
interface LinkedCard { id: string; user_id: string; card_uid: string; is_digital: boolean; full_name: string }

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const L: Record<Language, Record<string, string>> = {
  nl: {
    title: 'Kassa & Pasjes Beheer', back: 'Terug',
    apiTitle: 'Kassa API Integratie',
    apiDesc: 'Gebruik deze sleutel om uw kassasysteem te verbinden met het platform.',
    generateKey: 'Genereer API Sleutel', regenerateKey: 'Nieuwe Sleutel Genereren',
    regenerateWarn: 'Let op: de huidige sleutel wordt onmiddellijk ongeldig.',
    copy: 'Kopieer', copied: 'Gekopieerd!', show: 'Toon', hide: 'Verberg',
    cardTitle: 'Fysieke Pasjes Koppelen (RFID / Barcode)',
    cardDesc: 'Selecteer een vrijwilliger en scan de pas via de USB-lezer. Het veld sla automatisch op bij Enter.',
    selectVol: 'Selecteer vrijwilliger...', scanPlaceholder: 'Scan pas hier en druk Enter',
    cardSaved: 'Pas succesvol gekoppeld!', cardError: 'Koppelen mislukt — is de kaart al in gebruik?',
    linkedTitle: 'Gekoppelde Pasjes', noCards: 'Nog geen pasjes gekoppeld.',
    digital: 'Digitaal', physical: 'Fysiek', unlink: 'Ontkoppelen', unlinked: 'Pas ontkoppeld.',
  },
  fr: {
    title: 'Gestion Caisse & Cartes', back: 'Retour',
    apiTitle: 'Intégration API Caisse',
    apiDesc: 'Utilisez cette clé pour connecter votre caisse enregistreuse à la plateforme.',
    generateKey: 'Générer une clé API', regenerateKey: 'Générer une nouvelle clé',
    regenerateWarn: 'Attention : la clé actuelle sera immédiatement invalidée.',
    copy: 'Copier', copied: 'Copié !', show: 'Afficher', hide: 'Masquer',
    cardTitle: 'Lier des Cartes Physiques (RFID / Code-barres)',
    cardDesc: 'Sélectionnez un bénévole et scannez la carte via le lecteur USB. La sauvegarde se fait automatiquement à Entrée.',
    selectVol: 'Sélectionner un bénévole...', scanPlaceholder: 'Scanner la carte ici puis appuyer sur Entrée',
    cardSaved: 'Carte liée avec succès !', cardError: 'Échec de la liaison — la carte est-elle déjà utilisée ?',
    linkedTitle: 'Cartes Liées', noCards: 'Aucune carte liée pour l\'instant.',
    digital: 'Numérique', physical: 'Physique', unlink: 'Délier', unlinked: 'Carte déliée.',
  },
  en: {
    title: 'POS & Card Management', back: 'Back',
    apiTitle: 'POS API Integration',
    apiDesc: 'Use this key to connect your cash register system to the platform.',
    generateKey: 'Generate API Key', regenerateKey: 'Generate New Key',
    regenerateWarn: 'Warning: the current key will be immediately invalidated.',
    copy: 'Copy', copied: 'Copied!', show: 'Show', hide: 'Hide',
    cardTitle: 'Link Physical Cards (RFID / Barcode)',
    cardDesc: 'Select a volunteer and scan the card via the USB reader. Saves automatically on Enter.',
    selectVol: 'Select volunteer...', scanPlaceholder: 'Scan card here and press Enter',
    cardSaved: 'Card linked successfully!', cardError: 'Link failed — is the card already in use?',
    linkedTitle: 'Linked Cards', noCards: 'No cards linked yet.',
    digital: 'Digital', physical: 'Physical', unlink: 'Unlink', unlinked: 'Card unlinked.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const KassaPasjesBeheer = () => {
  const navigate = useNavigate();
  const { clubId } = useClubContext();
  const { language } = useLanguage();
  const l = L[language as Language] ?? L.nl;

  const [posKey, setPosKey]         = useState<string | null>(null);
  const [showKey, setShowKey]       = useState(false);
  const [copied, setCopied]         = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  const [volunteers, setVolunteers] = useState<VolunteerOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [cardUid, setCardUid]       = useState('');
  const [saving, setSaving]         = useState(false);

  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);
  const [loading, setLoading]         = useState(true);

  // ── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);

    // POS key
    const { data: posRow } = await supabase
      .from('club_pos_settings')
      .select('pos_api_key')
      .eq('club_id', clubId)
      .maybeSingle();
    if (posRow) setPosKey(posRow.pos_api_key);

    // Volunteers in this club
    const { data: members } = await supabase
      .from('club_memberships')
      .select('volunteer_id')
      .eq('club_id', clubId)
      .eq('status', 'actief');

    if (members && members.length > 0) {
      const ids = members.map(m => m.volunteer_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids)
        .order('full_name');
      setVolunteers((profiles || []) as VolunteerOption[]);
    }

    // Linked cards for this club
    const { data: cards } = await supabase
      .from('volunteer_club_cards')
      .select('id, user_id, card_uid, is_digital, profiles!inner(full_name)')
      .eq('club_id', clubId)
      .order('linked_at', { ascending: false });

    setLinkedCards((cards || []).map((c: any) => ({
      id: c.id,
      user_id: c.user_id,
      card_uid: c.card_uid,
      is_digital: c.is_digital,
      full_name: c.profiles?.full_name || '—',
    })));

    setLoading(false);
  }, [clubId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── API key ───────────────────────────────────────────────────────────────

  const handleGenerateKey = async () => {
    if (!clubId) return;
    setGenLoading(true);
    const { data, error } = await supabase.rpc('regenerate_pos_api_key', { p_club_id: clubId });
    if (error) { toast.error(error.message); } else { setPosKey(data as string); setShowKey(true); }
    setGenLoading(false);
  };

  const handleCopy = async () => {
    if (!posKey) return;
    await navigator.clipboard.writeText(posKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Card scanning (USB RFID fires Enter) ─────────────────────────────────

  const handleCardScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !cardUid.trim() || !selectedId || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('volunteer_club_cards')
      .upsert(
        { user_id: selectedId, club_id: clubId, card_uid: cardUid.trim(), is_digital: false },
        { onConflict: 'user_id,club_id' }
      );
    if (error) { toast.error(l.cardError); }
    else { toast.success(l.cardSaved); setCardUid(''); setSelectedId(''); loadData(); }
    setSaving(false);
  };

  // ── Unlink ────────────────────────────────────────────────────────────────

  const handleUnlink = async (cardId: string) => {
    const { error } = await supabase.from('volunteer_club_cards').delete().eq('id', cardId);
    if (!error) { toast.success(l.unlinked); setLinkedCards(p => p.filter(c => c.id !== cardId)); }
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border px-4 flex items-center gap-3 min-h-[60px] pt-[env(safe-area-inset-top)]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-2 rounded-xl hover:bg-muted transition-colors font-semibold text-foreground">
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">{l.back}</span>
        </button>
        <h1 className="text-base font-heading font-bold text-foreground truncate">{l.title}</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

        {/* ── Section 1: API Key ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 p-5 border-b border-border/60 bg-violet-500/5">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center shrink-0">
              <Key className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-heading font-bold text-foreground">{l.apiTitle}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{l.apiDesc}</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {posKey ? (
              <>
                {/* Key display row */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-muted rounded-xl px-4 py-3 font-mono text-sm text-foreground truncate">
                    {showKey ? posKey : '•'.repeat(32)}
                  </div>
                  <button onClick={() => setShowKey(v => !v)}
                    className="shrink-0 w-11 h-11 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label={showKey ? l.hide : l.show}>
                    {showKey ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={handleCopy}
                    className="shrink-0 w-11 h-11 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label={l.copy}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>

                {/* Rotate key */}
                <button onClick={handleGenerateKey} disabled={genLoading}
                  className="w-full h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {l.regenerateKey}
                </button>
                <p className="text-xs text-muted-foreground text-center">{l.regenerateWarn}</p>
              </>
            ) : (
              <button onClick={handleGenerateKey} disabled={genLoading}
                className="w-full h-14 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {genLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                {l.generateKey}
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Section 2: Card Linking ────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
          className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 p-5 border-b border-border/60 bg-blue-500/5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-heading font-bold text-foreground">{l.cardTitle}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{l.cardDesc}</p>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="w-full h-12 rounded-xl border border-border bg-card text-foreground px-4 text-base focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">{l.selectVol}</option>
              {volunteers.map(v => (
                <option key={v.id} value={v.id}>{v.full_name} — {v.email}</option>
              ))}
            </select>

            <input
              type="text"
              value={cardUid}
              onChange={e => setCardUid(e.target.value)}
              onKeyDown={handleCardScan}
              disabled={!selectedId || saving}
              placeholder={l.scanPlaceholder}
              autoComplete="off"
              className="w-full h-12 rounded-xl border border-border bg-card text-foreground px-4 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40"
            />
            {saving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Opslaan...
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Section 3: Linked Cards Overview ─────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 p-5 border-b border-border/60">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-heading font-bold text-foreground">{l.linkedTitle}</h2>
          </div>

          <div className="p-5">
            {linkedCards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{l.noCards}</p>
            ) : (
              <div className="space-y-2">
                {linkedCards.map(card => (
                  <div key={card.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{card.full_name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{card.card_uid}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      card.is_digital
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {card.is_digital ? l.digital : l.physical}
                    </span>
                    <button onClick={() => handleUnlink(card.id)}
                      className="shrink-0 flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                      <Unlink className="w-3.5 h-3.5" />
                      {l.unlink}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default KassaPasjesBeheer;
