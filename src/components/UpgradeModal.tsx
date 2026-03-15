import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, Quote, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const upgradeT = {
  nl: {
    title: 'Jouw club groeit! 🎉',
    subtitle: 'Je hebt je 2 gratis contracten opgebruikt. Upgrade om onbeperkt door te gaan.',
    features: [
      'Interactieve briefings met checklists en routes',
      'SEPA-uitbetalingen en automatische facturatie',
      'Digitale contracten met e-handtekening',
      'Veiligheidsmodule met incident-logging',
    ],
    price: '€15 per vrijwilliger / per seizoen',
    priceNote: 'Betaal enkel voor actieve vrijwilligers',
    testimonial: 'KAA Gent bespaart 10+ uur administratie per wedstrijd',
    testimonialAuthor: 'Coördinator vrijwilligers, KAA Gent',
    confirm: 'Doorgaan voor €15',
    later: 'Later',
  },
  fr: {
    title: 'Votre club grandit ! 🎉',
    subtitle: 'Vous avez utilisé vos 2 contrats gratuits. Passez à la version payante pour continuer.',
    features: [
      'Briefings interactifs avec checklists et itinéraires',
      'Paiements SEPA et facturation automatique',
      'Contrats numériques avec signature électronique',
      'Module de sécurité avec journal des incidents',
    ],
    price: '€15 par bénévole / par saison',
    priceNote: 'Payez uniquement pour les bénévoles actifs',
    testimonial: 'KAA Gent économise plus de 10h d\'administration par match',
    testimonialAuthor: 'Coordinateur bénévoles, KAA Gent',
    confirm: 'Continuer pour €15',
    later: 'Plus tard',
  },
  en: {
    title: 'Your club is growing! 🎉',
    subtitle: 'You\'ve used your 2 free contracts. Upgrade to continue unlimited.',
    features: [
      'Interactive briefings with checklists and routes',
      'SEPA payouts and automated invoicing',
      'Digital contracts with e-signatures',
      'Safety module with incident logging',
    ],
    price: '€15 per volunteer / per season',
    priceNote: 'Only pay for active volunteers',
    testimonial: 'KAA Gent saves 10+ hours of administration per match',
    testimonialAuthor: 'Volunteer coordinator, KAA Gent',
    confirm: 'Continue for €15',
    later: 'Later',
  },
};

const UpgradeModal = ({ open, onClose, onConfirm }: Props) => {
  const { language } = useLanguage();
  const t = upgradeT[language as keyof typeof upgradeT] || upgradeT.nl;

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-card rounded-2xl shadow-elevated border border-border/50 w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 px-8 pt-8 pb-6">
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-foreground">{t.title}</h2>
            </div>
            <p className="text-muted-foreground text-sm">{t.subtitle}</p>
          </div>

          {/* Features */}
          <div className="px-8 py-6 space-y-3">
            {t.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="mx-8 rounded-xl bg-primary/5 border border-primary/15 p-5 text-center">
            <p className="text-3xl font-bold text-primary font-heading">{t.price}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.priceNote}</p>
          </div>

          {/* Testimonial */}
          <div className="mx-8 mt-4 rounded-xl bg-muted/50 p-4 flex gap-3">
            <Quote className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground italic">&ldquo;{t.testimonial}&rdquo;</p>
              <p className="text-[11px] text-muted-foreground mt-1">— {t.testimonialAuthor}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-6 flex flex-col gap-3">
            <Button onClick={onConfirm} className="w-full h-12 rounded-xl text-base gap-2 font-semibold">
              {t.confirm} <ArrowRight className="w-4 h-4" />
            </Button>
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground text-center transition-colors">
              {t.later}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpgradeModal;
