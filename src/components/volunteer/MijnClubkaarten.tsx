import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  CreditCard, QrCode, Camera, X, CheckCircle2,
  Loader2, Smartphone, Wallet, Tag,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ClubEntry {
  club_id: string;
  club_name: string;
  club_logo: string | null;
  card: { id: string; card_uid: string; is_digital: boolean } | null;
  rewards: { canteen_balance_eur: number; fanshop_discount_active: boolean } | null;
}

interface Props {
  userId: string;
  language: Language;
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const L: Record<Language, Record<string, string>> = {
  nl: {
    noCard: 'Geen pas gekoppeld',
    linkedPhysical: 'Fysieke pas gekoppeld',
    linkedDigital: 'Digitale kaart actief',
    scanCamera: 'Scan Barcode',
    generateDigital: 'Maak Digitale Kaart',
    scanTitle: 'Scan je pas',
    scanDesc: 'Richt de camera op de barcode of QR-code van je pas.',
    cancelScan: 'Annuleren',
    linked: 'Gekoppeld!',
    linkError: 'Koppelen mislukt. Probeer opnieuw.',
    generating: 'Aanmaken...',
    canteenBalance: 'Kantine Tegoed',
    discount: 'Fanshopkorting actief',
    yourQr: 'Jouw digitale clubkaart',
    showAtBar: 'Toon aan de kassa bij de club.',
    unlink: 'Andere pas koppelen',
    replacing: 'Vervangen...',
  },
  fr: {
    noCard: 'Aucune carte liée',
    linkedPhysical: 'Carte physique liée',
    linkedDigital: 'Carte numérique active',
    scanCamera: 'Scanner le code-barres',
    generateDigital: 'Créer une carte numérique',
    scanTitle: 'Scanner votre carte',
    scanDesc: 'Pointez la caméra vers le code-barres ou le QR code de votre carte.',
    cancelScan: 'Annuler',
    linked: 'Lié !',
    linkError: 'Échec de la liaison. Réessayez.',
    generating: 'Création...',
    canteenBalance: 'Crédit Cantine',
    discount: 'Réduction fanshop active',
    yourQr: 'Votre carte de club numérique',
    showAtBar: 'Montrez-la à la caisse du club.',
    unlink: 'Lier une autre carte',
    replacing: 'Remplacement...',
  },
  en: {
    noCard: 'No card linked',
    linkedPhysical: 'Physical card linked',
    linkedDigital: 'Digital card active',
    scanCamera: 'Scan Barcode',
    generateDigital: 'Create Digital Card',
    scanTitle: 'Scan your card',
    scanDesc: 'Point the camera at the barcode or QR code on your card.',
    cancelScan: 'Cancel',
    linked: 'Linked!',
    linkError: 'Link failed. Please try again.',
    generating: 'Creating...',
    canteenBalance: 'Canteen Credit',
    discount: 'Fanshop discount active',
    yourQr: 'Your digital club card',
    showAtBar: 'Show this at the club checkout.',
    unlink: 'Link different card',
    replacing: 'Replacing...',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const MijnClubkaarten = ({ userId, language }: Props) => {
  const l = L[language] ?? L.nl;

  const [clubs, setClubs]               = useState<ClubEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [scanningFor, setScanningFor]   = useState<string | null>(null); // club_id
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const scannerRef                      = useRef<Html5Qrcode | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);

    // Memberships
    const { data: memberships } = await supabase
      .from('club_memberships')
      .select('club_id, clubs(name, logo_url)')
      .eq('volunteer_id', userId)
      .eq('status', 'actief');

    if (!memberships || memberships.length === 0) { setLoading(false); return; }

    const clubIds = memberships.map(m => m.club_id);

    // Cards + rewards in parallel
    const [cardsRes, rewardsRes] = await Promise.all([
      supabase.from('volunteer_club_cards').select('club_id, id, card_uid, is_digital').eq('user_id', userId).in('club_id', clubIds),
      (supabase as any).from('volunteer_rewards').select('club_id, canteen_balance_eur, fanshop_discount_active').eq('user_id', userId).in('club_id', clubIds),
    ]);

    const cardMap = new Map((cardsRes.data || []).map(c => [c.club_id, c]));
    const rewardsMap = new Map((rewardsRes.data || []).map((r: any) => [r.club_id, r]));

    setClubs(memberships.map(m => ({
      club_id: m.club_id,
      club_name: (m.clubs as any)?.name || m.club_id,
      club_logo: (m.clubs as any)?.logo_url || null,
      card: cardMap.get(m.club_id) ? {
        id: cardMap.get(m.club_id)!.id,
        card_uid: cardMap.get(m.club_id)!.card_uid,
        is_digital: cardMap.get(m.club_id)!.is_digital,
      } : null,
      rewards: rewardsMap.get(m.club_id) ? {
        canteen_balance_eur: rewardsMap.get(m.club_id)!.canteen_balance_eur ?? 0,
        fanshop_discount_active: rewardsMap.get(m.club_id)!.fanshop_discount_active ?? false,
      } : null,
    })));

    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Camera scanner lifecycle ───────────────────────────────────────────────

  useEffect(() => {
    if (!scanningFor) return;

    const clubId = scanningFor; // capture for closure
    let scanner: Html5Qrcode | null = null;

    const start = async () => {
      try {
        scanner = new Html5Qrcode('mck-qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            await scanner!.stop().catch(() => {});
            setScanningFor(null);
            await handleLinkCard(clubId, decodedText.trim(), false);
          },
          () => {} // silent frame errors
        );
      } catch {
        setScanningFor(null);
        toast.error(language === 'nl' ? 'Camera niet beschikbaar.' : 'Camera unavailable.');
      }
    };

    start();

    return () => {
      scanner?.stop().catch(() => {});
    };
  }, [scanningFor]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Link helpers ──────────────────────────────────────────────────────────

  const handleLinkCard = async (clubId: string, cardUid: string, isDigital: boolean) => {
    const { error } = await supabase
      .from('volunteer_club_cards')
      .upsert(
        { user_id: userId, club_id: clubId, card_uid: cardUid, is_digital: isDigital },
        { onConflict: 'user_id,club_id' }
      );

    if (error) { toast.error(l.linkError); }
    else { toast.success(l.linked); await loadData(); }
  };

  const handleGenerateDigital = async (clubId: string) => {
    setGeneratingFor(clubId);
    const digitalId = crypto.randomUUID();
    await handleLinkCard(clubId, digitalId, true);
    setGeneratingFor(null);
  };

  const stopScanner = async () => {
    await scannerRef.current?.stop().catch(() => {});
    setScanningFor(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        {clubs.map((entry, i) => (
          <motion.div
            key={entry.club_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-muted/30 overflow-hidden"
          >
            {/* Club header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              {entry.club_logo ? (
                <img src={entry.club_logo} alt={entry.club_name} className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{entry.club_name[0]?.toUpperCase()}</span>
                </div>
              )}
              <p className="font-heading font-bold text-base text-foreground">{entry.club_name}</p>
            </div>

            {/* Rewards strip */}
            {entry.rewards && (entry.rewards.canteen_balance_eur > 0 || entry.rewards.fanshop_discount_active) && (
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                {entry.rewards.canteen_balance_eur > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold border border-emerald-200 dark:border-emerald-800/40">
                    <Wallet className="w-3.5 h-3.5" />
                    €{entry.rewards.canteen_balance_eur.toFixed(2)} {l.canteenBalance}
                  </span>
                )}
                {entry.rewards.fanshop_discount_active && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold border border-green-200 dark:border-green-800/40">
                    <Tag className="w-3.5 h-3.5" />
                    {l.discount}
                  </span>
                )}
              </div>
            )}

            <div className="px-4 pb-4">
              {/* ── No card: offer options ── */}
              {!entry.card && (
                <div className="space-y-2.5">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                    <CreditCard className="w-4 h-4" />
                    {l.noCard}
                  </p>
                  <button
                    onClick={() => setScanningFor(entry.club_id)}
                    className="w-full h-12 rounded-2xl border-2 border-border bg-card text-foreground font-semibold text-base flex items-center justify-center gap-2 hover:border-primary/40 hover:bg-muted/50 transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    {l.scanCamera}
                  </button>
                  <button
                    onClick={() => handleGenerateDigital(entry.club_id)}
                    disabled={generatingFor === entry.club_id}
                    className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {generatingFor === entry.club_id
                      ? <><Loader2 className="w-5 h-5 animate-spin" />{l.generating}</>
                      : <><Smartphone className="w-5 h-5" />{l.generateDigital}</>
                    }
                  </button>
                </div>
              )}

              {/* ── Physical card linked ── */}
              {entry.card && !entry.card.is_digital && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-base">{l.linkedPhysical}</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground bg-muted rounded-xl px-3 py-2 truncate">
                    {entry.card.card_uid}
                  </p>
                  <button
                    onClick={() => setScanningFor(entry.club_id)}
                    className="w-full h-11 rounded-2xl border border-border text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {l.unlink}
                  </button>
                </div>
              )}

              {/* ── Digital card: show QR ── */}
              {entry.card && entry.card.is_digital && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                    <QrCode className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-base">{l.linkedDigital}</span>
                  </div>

                  {/* Large QR code */}
                  <div className="flex flex-col items-center gap-2 bg-white rounded-2xl p-5 border border-border">
                    <QRCodeSVG
                      value={entry.card.card_uid}
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                    <p className="text-xs font-bold text-foreground mt-1">{l.yourQr}</p>
                    <p className="text-xs text-muted-foreground">{l.showAtBar}</p>
                  </div>

                  <button
                    onClick={() => setScanningFor(entry.club_id)}
                    className="w-full h-11 rounded-2xl border border-border text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 hover:bg-muted transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {l.unlink}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Camera scanner modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {scanningFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6 gap-5"
          >
            <div className="w-full max-w-sm bg-card rounded-3xl overflow-hidden shadow-2xl">
              {/* Scanner header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <p className="font-bold text-base text-foreground">{l.scanTitle}</p>
                  <p className="text-sm text-muted-foreground">{l.scanDesc}</p>
                </div>
                <button onClick={stopScanner}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Camera viewport — html5-qrcode attaches here */}
              <div id="mck-qr-reader" className="w-full" style={{ minHeight: 280 }} />
            </div>

            <button onClick={stopScanner}
              className="h-12 px-8 rounded-2xl bg-white/10 text-white font-semibold text-base border border-white/20 hover:bg-white/20 transition-colors">
              {l.cancelScan}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MijnClubkaarten;
