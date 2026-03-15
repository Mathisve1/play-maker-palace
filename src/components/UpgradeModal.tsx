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
    title: 'Jouw club groeit! 🎉',
    subtitle: 'Je hebt je 2 gratis contracttypes opgebruikt. Upgrade om onbeperkt door te gaan.',
    features: [
      'Interactieve briefings met checklists en routes',
      'SEPA-uitbetalingen en automatische facturatie',
      'Digitale contracten met e-handtekening',
      'Veiligheidsmodule met incident-logging',
    ],
    price: '€15 per vrijwilliger / per seizoen',
    priceNote: 'Betaal enkel voor actieve vrijwilligers',
    howItWorks: 'Hoe werkt de prijs?',
    step1: 'Eerste 2 contracttypes: volledig gratis',
    step2: 'Vanaf 3e contracttype: €15 per vrijwilliger per seizoen',
    step3: 'Betaal enkel voor actieve vrijwilligers met een contract',
    exampleTitle: 'Voorbeeldberekening',
    example1: '10 stewards × €15 = €150 / seizoen',
    example2: '25 bar & catering × €15 = €375 / seizoen',
    example3: '5 terreinmedewerkers × €15 = €75 / seizoen',
    exampleTotal: 'Totaal: 40 vrijwilligers = €600 / seizoen',
    testimonial: 'KAA Gent bespaart 10+ uur administratie per wedstrijd',
    testimonialAuthor: 'Coördinator vrijwilligers, KAA Gent',
    confirm: 'Doorgaan voor €15/vrijwilliger',
    later: 'Later',
  },
  fr: {
    title: 'Votre club grandit ! 🎉',
    subtitle: 'Vous avez utilisé vos 2 types de contrats gratuits. Passez à la version payante pour continuer.',
    features: [
      'Briefings interactifs avec checklists et itinéraires',
      'Paiements SEPA et facturation automatique',
      'Contrats numériques avec signature électronique',
      'Module de sécurité avec journal des incidents',
    ],
    price: '€15 par bénévole / par saison',
    priceNote: 'Payez uniquement pour les bénévoles actifs',
    howItWorks: 'Comment fonctionne le prix ?',
    step1: '2 premiers types de contrats : entièrement gratuits',
    step2: 'À partir du 3e type : €15 par bénévole par saison',
    step3: 'Ne payez que pour les bénévoles actifs avec un contrat',
    exampleTitle: 'Exemple de calcul',
    example1: '10 stewards × €15 = €150 / saison',
    example2: '25 bar & restauration × €15 = €375 / saison',
    example3: '5 agents terrain × €15 = €75 / saison',
    exampleTotal: 'Total : 40 bénévoles = €600 / saison',
    testimonial: 'KAA Gent économise plus de 10h d\'administration par match',
    testimonialAuthor: 'Coordinateur bénévoles, KAA Gent',
    confirm: 'Continuer pour €15/bénévole',
    later: 'Plus tard',
  },
  en: {
    title: 'Your club is growing! 🎉',
    subtitle: 'You\'ve used your 2 free contract types. Upgrade to continue unlimited.',
    features: [
      'Interactive briefings with checklists and routes',
      'SEPA payouts and automated invoicing',
      'Digital contracts with e-signatures',
      'Safety module with incident logging',
    ],
    price: '€15 per volunteer / per season',
    priceNote: 'Only pay for active volunteers',
    howItWorks: 'How does pricing work?',
    step1: 'First 2 contract types: completely free',
    step2: 'From 3rd contract type: €15 per volunteer per season',
    step3: 'Only pay for active volunteers with a contract',
    exampleTitle: 'Example calculation',
    example1: '10 stewards × €15 = €150 / season',
    example2: '25 bar & catering × €15 = €375 / season',
    example3: '5 grounds crew × €15 = €75 / season',
    exampleTotal: 'Total: 40 volunteers = €600 / season',
    testimonial: 'KAA Gent saves 10+ hours of administration per match',
    testimonialAuthor: 'Volunteer coordinator, KAA Gent',
    confirm: 'Continue for €15/volunteer',
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
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span className="text-foreground">{t.step1}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span className="text-foreground">{t.step2}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span className="text-foreground">{t.step3}</span>
              </li>
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
              <p>{t.example3}</p>
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
