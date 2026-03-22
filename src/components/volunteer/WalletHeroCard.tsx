import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Wallet, QrCode, X, TrendingUp } from 'lucide-react';

interface WalletHeroCardProps {
  volunteerName?: string;
  totalPaid: number;
  totalProcessing: number;
  userId?: string;
  language: string;
}

const WalletHeroCard = ({
  volunteerName,
  totalPaid,
  totalProcessing,
  userId,
  language,
}: WalletHeroCardProps) => {
  const [showQr, setShowQr] = useState(false);
  const tr = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  const qrValue = userId
    ? `https://play-maker-palace.lovable.app/volunteer/${userId}`
    : 'https://play-maker-palace.lovable.app';

  const intPart = Math.floor(totalPaid);
  const centsPart = Math.round((totalPaid - intPart) * 100)
    .toString()
    .padStart(2, '0');

  return (
    <div className="relative overflow-hidden rounded-3xl select-none">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, hsl(220 40% 10%) 0%, hsl(230 35% 16%) 50%, hsl(245 40% 18%) 100%)',
        }}
      />
      {/* Ambient light — top-right violet glow */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle, hsl(262 80% 60%) 0%, transparent 70%)',
        }}
      />
      {/* Ambient light — bottom-left blue glow */}
      <div
        className="pointer-events-none absolute bottom-0 -left-8 w-52 h-52 rounded-full opacity-25"
        style={{
          background:
            'radial-gradient(circle, hsl(210 80% 55%) 0%, transparent 70%)',
        }}
      />
      {/* Glass border */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />

      {/* Card content */}
      <div className="relative z-10 p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
              <Wallet className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold">
                {tr('Kantine Wallet', 'Portefeuille Kantine', 'Kantine Wallet')}
              </p>
              {volunteerName && (
                <p className="text-white/90 text-sm font-semibold leading-tight mt-0.5">
                  {volunteerName}
                </p>
              )}
            </div>
          </div>

          {/* QR trigger button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowQr(true)}
            className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/15 transition-colors"
            aria-label={tr('Toon QR-code', 'Afficher le QR-code', 'Show QR code')}
          >
            <QrCode className="w-[18px] h-[18px] text-white/80" />
          </motion.button>
        </div>

        {/* Balance */}
        <div className="mb-5">
          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">
            {tr('Totaal ontvangen', 'Total reçu', 'Total received')}
          </p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-white/60 text-xl font-medium leading-none">€</span>
            <span
              className="text-white font-bold tracking-tight leading-none"
              style={{
                fontSize: 'clamp(2.25rem, 10vw, 3.25rem)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {intPart}
            </span>
            <span className="text-white/50 text-xl font-medium leading-none">
              ,{centsPart}
            </span>
          </div>
        </div>

        {/* Pending badge */}
        {totalProcessing > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/25"
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-amber-200 text-xs font-medium">
              + €{totalProcessing.toFixed(2)}{' '}
              {tr('in behandeling', 'en cours', 'pending')}
            </span>
          </motion.div>
        )}
      </div>

      {/* QR overlay */}
      <AnimatePresence>
        {showQr && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 z-20 rounded-3xl bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: 0.06,
                type: 'spring',
                stiffness: 400,
                damping: 28,
              }}
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 0 40px rgba(139,92,246,0.45)' }}
            >
              <QRCodeSVG value={qrValue} size={160} level="H" />
            </motion.div>
            <p className="text-white/60 text-sm text-center">
              {tr(
                'Jouw vrijwilligerspas',
                'Votre carte bénévole',
                'Your volunteer pass',
              )}
            </p>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowQr(false)}
              className="w-11 h-11 rounded-full bg-white/20 border border-white/25 flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label={tr('Sluit QR-code', 'Fermer le QR-code', 'Close QR code')}
            >
              <X className="w-5 h-5 text-white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalletHeroCard;
