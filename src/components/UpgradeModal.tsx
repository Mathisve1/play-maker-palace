import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, Quote, ArrowRight, X, Calculator, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const upgradeT = {
  nl: {
    title: 'Zo werkt onze facturatie 💡',
    subtitle: 'Elke vrijwilliger mag 2 taken gratis voltooien per seizoen. Vanaf de 3e taak betaal je €15 voor die vrijwilliger voor het hele seizoen.',
    features: [
      'Eerste 2 voltooide taken per vrijwilliger: gratis',
      'Vanaf 3e taak: €15 per vrijwilliger per seizoen (eenmalig)',
      'Automatisch gefactureerd — geen blokkering',
      'Teller reset elk nieuw seizoen',
    ],
    price: '€15 per vrijwilliger / per seizoen',
    priceNote: 'Enkel voor vrijwilligers met 3+ voltooide taken',
    howItWorks: 'Hoe werkt het?',
    step1: 'Vrijwilliger voltooit taak 1 & 2: gratis ✓',
    step2: 'Bij taak 3: €15 wordt automatisch gefactureerd',
    step3: 'Alle volgende taken dat seizoen: geen extra kost',
    exampleTitle: 'Voorbeeldberekening',
    example1: '5 stewards met 3+ taken × €15 = €75',
    example2: '10 bar-vrijwilligers met 3+ taken × €15 = €150',
    example3: '8 vrijwilligers met max 2 taken: €0',
    exampleTotal: 'Totaal: 15 gefactureerd × €15 = €225 / seizoen',
    testimonial: 'KAA Gent bespaart 10+ uur administratie per wedstrijd',
    testimonialAuthor: 'Coördinator vrijwilligers, KAA Gent',
    confirm: 'Begrepen',
    later: 'Sluiten',
  },
  fr: {
    title: 'Notre modèle de facturation 💡',
    subtitle: 'Chaque bénévole peut effectuer 2 tâches gratuitement par saison. À partir de la 3e tâche, vous payez €15 pour ce bénévole pour toute la saison.',
    features: [
      '2 premières tâches par bénévole : gratuites',
      'À partir de la 3e tâche : €15 par bénévole par saison',
      'Facturation automatique — pas de blocage',
      'Compteur réinitialisé chaque saison',
    ],
    price: '€15 par bénévole / par saison',
    priceNote: 'Uniquement pour les bénévoles avec 3+ tâches',
    howItWorks: 'Comment ça marche ?',
    step1: 'Bénévole complète tâches 1 & 2 : gratuit ✓',
    step2: 'À la tâche 3 : €15 facturé automatiquement',
    step3: 'Toutes les tâches suivantes cette saison : sans frais',
    exampleTitle: 'Exemple de calcul',
    example1: '5 stewards avec 3+ tâches × €15 = €75',
    example2: '10 bénévoles bar avec 3+ tâches × €15 = €150',
    example3: '8 bénévoles avec max 2 tâches : €0',
    exampleTotal: 'Total : 15 facturés × €15 = €225 / saison',
    testimonial: 'KAA Gent économise plus de 10h d\'administration par match',
    testimonialAuthor: 'Coordinateur bénévoles, KAA Gent',
    confirm: 'Compris',
    later: 'Fermer',
  },
  en: {
    title: 'How our billing works 💡',
    subtitle: 'Each volunteer can complete 2 tasks for free per season. From the 3rd task, you pay €15 for that volunteer for the entire season.',
    features: [
      'First 2 completed tasks per volunteer: free',
      'From 3rd task: €15 per volunteer per season (one-time)',
      'Automatically invoiced — no blocking',
      'Counter resets each new season',
    ],
    price: '€15 per volunteer / per season',
    priceNote: 'Only for volunteers with 3+ completed tasks',
    howItWorks: 'How does it work?',
    step1: 'Volunteer completes tasks 1 & 2: free ✓',
    step2: 'At task 3: €15 is automatically invoiced',
    step3: 'All subsequent tasks that season: no extra cost',
    exampleTitle: 'Example calculation',
    example1: '5 stewards with 3+ tasks × €15 = €75',
    example2: '10 bar volunteers with 3+ tasks × €15 = €150',
    example3: '8 volunteers with max 2 tasks: €0',
    exampleTotal: 'Total: 15 billed × €15 = €225 / season',
    testimonial: 'KAA Gent saves 10+ hours of administration per match',
    testimonialAuthor: 'Volunteer coordinator, KAA Gent',
    confirm: 'Got it',
    later: 'Close',
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
          className="bg-card rounded-2xl shadow-elevated border border-border/50 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
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
          <div className="px-8 py-5 space-y-2.5">
            {t.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* Pricing explanation */}
          <div className="mx-8 rounded-xl bg-muted/50 border border-border p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{t.howItWorks}</h3>
            </div>
            <ul className="space-y-2 text-sm">
              {[t.step1, t.step2, t.step3].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Example calculation */}
          <div className="mx-8 mt-3 rounded-xl bg-primary/5 border border-primary/15 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{t.exampleTitle}</h3>
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p>{t.example1}</p>
              <p>{t.example2}</p>
              <p className="text-primary">{t.example3}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-primary/15">
              <p className="text-sm font-bold text-primary">{t.exampleTotal}</p>
            </div>
          </div>

          {/* Testimonial */}
          <div className="mx-8 mt-3 rounded-xl bg-muted/50 p-4 flex gap-3">
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
