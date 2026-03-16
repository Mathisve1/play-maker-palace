import { useState } from 'react';
import SEOHead from '@/components/SEOHead';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import {
  FileSignature, Users, CreditCard, ClipboardList, Shield, CheckCircle,
  ArrowRight, Sparkles, Quote, Smartphone, BarChart3, AlertTriangle, Lock,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AppStoreButtons, InstallInstructionsDialog } from '@/components/PWAInstallButtons';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const t3Map = {
  nl: {
    heroTitle: 'Beheer al je vrijwilligers op één platform',
    heroSubtitle: 'Seizoenscontracten, briefings, SEPA-vergoedingen en meer — alles geautomatiseerd.',
    heroCta: 'Start gratis',
    heroCtaSecondary: 'Bekijk features',
    pricingTitle: 'Simpele, eerlijke prijzen',
    pricingSubtitle: 'Start gratis. Betaal pas wanneer je groeit.',
    free: 'Gratis',
    freeDesc: 'Perfect om te testen',
    freePrice: '€0',
    freePeriod: 'voor altijd',
    freeFeatures: ['2 gratis taken per vrijwilliger per seizoen', 'Alle platformfeatures', 'Briefing builder', 'Community & badges'],
    paid: 'Groeiplan',
    paidDesc: 'Voor actieve clubs',
    paidPrice: '€15',
    paidPeriod: 'per vrijwilliger / seizoen',
    paidFeatures: ['Onbeperkte vrijwilligers & taken', 'SEPA-uitbetalingen', 'Automatische facturatie', 'Partnerzitjes (bulk)', 'Prioritaire support'],
    paidNote: 'Pas vanaf de 3e voltooide taak per vrijwilliger per seizoen',
    featuresTitle: 'Alles wat je club nodig heeft',
    feat1: 'Seizoenscontracten', feat1Desc: 'Digitale contracten met e-handtekening via DocuSeal. Automatisch verstuurd bij onboarding.',
    feat2: 'SEPA-uitbetalingen', feat2Desc: 'Genereer SEPA-bestanden en betaal alle vrijwilligers in één klik uit.',
    feat3: 'Briefing builder', feat3Desc: 'Bouw interactieve briefings met checklists, routes en tijdschema\'s.',
    feat4: 'Aanwezigheidsregistratie', feat4Desc: 'QR-code check-in met automatische urenregistratie.',
    feat5: 'Veiligheidsmodule', feat5Desc: 'Incident-logging, sluitingsprocedures en veiligheidsteams.',
    feat6: 'Rapportage & compliance', feat6Desc: 'Seizoensrapporten, financiële overzichten en compliance-tracking.',
    trustTitle: 'Gebouwd op vertrouwen',
    trust1: 'GDPR-conform',
    trust2: 'Belgische vrijwilligerswetgeving',
    trust3: 'DocuSeal e-handtekeningen',
    ctaTitle: 'Klaar om je club te digitaliseren?',
    ctaSubtitle: 'Maak je account aan en stuur je eerste contract vandaag nog.',
    ctaButton: 'Start gratis',
  },
  fr: {
    heroTitle: 'Gérez tous vos bénévoles sur une seule plateforme',
    heroSubtitle: 'Contrats saisonniers, briefings, paiements SEPA et plus — tout automatisé.',
    heroCta: 'Commencer gratuitement',
    heroCtaSecondary: 'Voir les fonctionnalités',
    pricingTitle: 'Tarifs simples et transparents',
    pricingSubtitle: 'Commencez gratuitement. Payez quand vous grandissez.',
    free: 'Gratuit',
    freeDesc: 'Parfait pour tester',
    freePrice: '€0',
    freePeriod: 'pour toujours',
    freeFeatures: ['2 tâches gratuites par bénévole par saison', 'Toutes les fonctionnalités', 'Briefing builder', 'Communauté & badges'],
    paid: 'Plan croissance',
    paidDesc: 'Pour les clubs actifs',
    paidPrice: '€15',
    paidPeriod: 'par bénévole / saison',
    paidFeatures: ['Bénévoles & tâches illimités', 'Paiements SEPA', 'Facturation automatique', 'Sièges partenaires', 'Support prioritaire'],
    paidNote: 'Uniquement à partir de la 3e tâche complétée par bénévole par saison',
    featuresTitle: 'Tout ce dont votre club a besoin',
    feat1: 'Contrats saisonniers', feat1Desc: 'Contrats numériques avec signature électronique via DocuSeal.',
    feat2: 'Paiements SEPA', feat2Desc: 'Générez des fichiers SEPA et payez tous les bénévoles en un clic.',
    feat3: 'Briefing builder', feat3Desc: 'Créez des briefings interactifs avec checklists et itinéraires.',
    feat4: 'Enregistrement de présence', feat4Desc: 'Check-in par QR-code avec enregistrement automatique des heures.',
    feat5: 'Module de sécurité', feat5Desc: 'Journal des incidents, procédures de clôture et équipes de sécurité.',
    feat6: 'Rapports & conformité', feat6Desc: 'Rapports saisonniers, aperçus financiers et suivi de conformité.',
    trustTitle: 'Construit sur la confiance',
    trust1: 'Conforme RGPD',
    trust2: 'Législation belge du bénévolat',
    trust3: 'Signatures DocuSeal',
    ctaTitle: 'Prêt à digitaliser votre club ?',
    ctaSubtitle: 'Créez votre compte et envoyez votre premier contrat aujourd\'hui.',
    ctaButton: 'Commencer gratuitement',
  },
  en: {
    heroTitle: 'Manage all your volunteers on one platform',
    heroSubtitle: 'Season contracts, briefings, SEPA payouts and more — fully automated.',
    heroCta: 'Start for free',
    heroCtaSecondary: 'View features',
    pricingTitle: 'Simple, fair pricing',
    pricingSubtitle: 'Start free. Pay only when you grow.',
    free: 'Free',
    freeDesc: 'Perfect to test',
    freePrice: '€0',
    freePeriod: 'forever',
    freeFeatures: ['2 free tasks per volunteer per season', 'All platform features', 'Briefing builder', 'Community & badges'],
    paid: 'Growth plan',
    paidDesc: 'For active clubs',
    paidPrice: '€15',
    paidPeriod: 'per volunteer / season',
    paidFeatures: ['Unlimited volunteers & tasks', 'SEPA payouts', 'Automated invoicing', 'Partner seats (bulk)', 'Priority support'],
    paidNote: 'Only from the 3rd completed task per volunteer per season',
    featuresTitle: 'Everything your club needs',
    feat1: 'Season contracts', feat1Desc: 'Digital contracts with e-signatures via DocuSeal. Automatically sent during onboarding.',
    feat2: 'SEPA payouts', feat2Desc: 'Generate SEPA files and pay all volunteers in one click.',
    feat3: 'Briefing builder', feat3Desc: 'Build interactive briefings with checklists, routes and schedules.',
    feat4: 'Attendance tracking', feat4Desc: 'QR code check-in with automatic hour registration.',
    feat5: 'Safety module', feat5Desc: 'Incident logging, closing procedures and safety teams.',
    feat6: 'Reporting & compliance', feat6Desc: 'Season reports, financial overviews and compliance tracking.',
    trustTitle: 'Built on trust',
    trust1: 'GDPR compliant',
    trust2: 'Belgian volunteer legislation',
    trust3: 'DocuSeal e-signatures',
    ctaTitle: 'Ready to digitalize your club?',
    ctaSubtitle: 'Create your account and send your first contract today.',
    ctaButton: 'Start for free',
  },
};

const ClubsLanding = () => {
  const { language } = useLanguage();
  const l = t3Map[language as keyof typeof t3Map] || t3Map.nl;
  const [installPlatform, setInstallPlatform] = useState<'ios' | 'android' | null>(null);

  const features = [
    { icon: FileSignature, title: l.feat1, desc: l.feat1Desc },
    { icon: CreditCard, title: l.feat2, desc: l.feat2Desc },
    { icon: ClipboardList, title: l.feat3, desc: l.feat3Desc },
    { icon: Smartphone, title: l.feat4, desc: l.feat4Desc },
    { icon: Shield, title: l.feat5, desc: l.feat5Desc },
    { icon: BarChart3, title: l.feat6, desc: l.feat6Desc },
  ];

  const trustBadges = [
    { icon: Lock, label: l.trust1 },
    { icon: Shield, label: l.trust2 },
    { icon: FileSignature, label: l.trust3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Beheer vrijwilligers professioneel | De 12e Man"
        description="Digitaal vrijwilligersbeheer voor sportclubs. Seizoenscontracten, compliance, planning en meer — alles in één platform."
        canonical="/clubs"
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-accent/5" />
        <div className="absolute top-32 left-0 w-96 h-96 bg-secondary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
        <div className="container mx-auto relative">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-secondary/10 text-secondary-foreground px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {language === 'nl' ? 'Voor clubs' : language === 'fr' ? 'Pour clubs' : 'For clubs'}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-heading font-bold text-foreground leading-tight">
              {l.heroTitle}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              {l.heroSubtitle}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/club-signup" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity shadow-card">
                {l.heroCta} <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#features" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
                {l.heroCtaSecondary}
              </a>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 flex justify-center">
              <AppStoreButtons
                variant="secondary"
                onClickIOS={() => setInstallPlatform('ios')}
                onClickAndroid={() => setInstallPlatform('android')}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{l.pricingTitle}</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">{l.pricingSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-card rounded-2xl border border-border/50 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted" />
              <p className="text-sm font-medium text-muted-foreground">{l.freeDesc}</p>
              <h3 className="text-xl font-heading font-bold text-foreground mt-1">{l.free}</h3>
              <p className="text-4xl font-bold text-foreground mt-4">{l.freePrice}</p>
              <p className="text-xs text-muted-foreground">{l.freePeriod}</p>
              <ul className="mt-6 space-y-3">
                {l.freeFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/club-signup" className="mt-8 block text-center px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
                {l.heroCta}
              </Link>
            </motion.div>

            {/* Paid */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-primary/30 p-8 relative overflow-hidden shadow-card">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                  {language === 'nl' ? 'Populair' : language === 'fr' ? 'Populaire' : 'Popular'}
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{l.paidDesc}</p>
              <h3 className="text-xl font-heading font-bold text-foreground mt-1">{l.paid}</h3>
              <p className="text-4xl font-bold text-primary mt-4">{l.paidPrice}</p>
              <p className="text-xs text-muted-foreground">{l.paidPeriod}</p>
              <ul className="mt-6 space-y-3">
                {l.paidFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/club-signup" className="mt-8 block text-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
                {l.heroCta}
              </Link>
              <p className="text-[11px] text-muted-foreground text-center mt-3">{l.paidNote}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{l.featuresTitle}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow border border-border/50"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Trust badges */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-xl font-heading font-bold text-foreground">{l.trustTitle}</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {trustBadges.map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 bg-card rounded-xl border border-border/50 px-6 py-4 shadow-card"
              >
                <badge.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{badge.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 rounded-3xl border border-primary/15 p-12"
          >
            <h2 className="text-3xl font-heading font-bold text-foreground">{l.ctaTitle}</h2>
            <p className="mt-3 text-muted-foreground">{l.ctaSubtitle}</p>
            <Link to="/club-signup" className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
              {l.ctaButton} <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />

      <InstallInstructionsDialog
        open={installPlatform !== null}
        onClose={() => setInstallPlatform(null)}
        platform={installPlatform || 'ios'}
      />
    </div>
  );
};

export default ClubsLanding;
