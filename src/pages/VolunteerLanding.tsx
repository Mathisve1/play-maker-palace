import { useState, lazy, Suspense } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { Search, FileSignature, Smartphone, CreditCard, Shield, MapPin, Clock, CheckCircle, ArrowRight, Users, Star, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AppStoreButtons, InstallInstructionsDialog } from '@/components/PWAInstallButtons';
import { motion } from 'framer-motion';

const fadeUpClass = 'animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both';

const t3Map = {
  nl: {
    heroTitle: 'Doe vrijwilligerswerk bij jouw favoriete sportclub',
    heroSubtitle: 'Vind een club in je buurt, onderteken je contract digitaal en ontvang je vergoedingen automatisch.',
    heroCta: 'Zoek clubs in mijn buurt',
    heroCtaSecondary: 'Hoe werkt het?',
    howTitle: 'Hoe werkt het?',
    step1: 'Vind een club',
    step1Desc: 'Ontdek sportclubs in je buurt via de community pagina en volg je favorieten.',
    step2: 'Onderteken je seizoenscontract',
    step2Desc: 'Ontvang en onderteken je contract digitaal — veilig en snel via e-handtekening.',
    step3: 'Ontvang taken & vergoedingen',
    step3Desc: 'Krijg je taken, check in via je mobiel en ontvang je vergoeding automatisch via SEPA.',
    featuresTitle: 'Alles wat je nodig hebt als vrijwilliger',
    feat1: 'Digitale briefing',
    feat1Desc: 'Ontvang je briefing op je telefoon — met checklists, routes en tijdschema.',
    feat2: 'Mobiel inchecken',
    feat2Desc: 'Scan je QR-code bij aankomst. Geen papierwerk meer.',
    feat3: 'Automatische SEPA-vergoeding',
    feat3Desc: 'Je onkostenvergoeding wordt automatisch berekend en uitbetaald.',
    feat4: 'Seizoensoverzicht',
    feat4Desc: 'Volg je uren, vergoedingen en compliance-status in realtime.',
    socialTitle: 'Reeds actief bij top sportclubs',
    socialClubs: 'KAA Gent, Club Brugge en KV Kortrijk',
    socialSubtitle: 'Sluit je aan bij honderden vrijwilligers die al via het platform werken.',
    ctaTitle: 'Word vandaag nog vrijwilliger',
    ctaSubtitle: 'Maak je account aan en ontdek welke clubs jouw hulp nodig hebben.',
    ctaButton: 'Aan de slag',
  },
  fr: {
    heroTitle: 'Faites du bénévolat dans votre club sportif préféré',
    heroSubtitle: 'Trouvez un club près de chez vous, signez votre contrat en ligne et recevez vos indemnités automatiquement.',
    heroCta: 'Trouver des clubs près de moi',
    heroCtaSecondary: 'Comment ça marche ?',
    howTitle: 'Comment ça marche ?',
    step1: 'Trouvez un club',
    step1Desc: 'Découvrez les clubs sportifs de votre région via la page communautaire.',
    step2: 'Signez votre contrat saisonnier',
    step2Desc: 'Recevez et signez votre contrat numériquement — rapidement et en toute sécurité.',
    step3: 'Recevez vos tâches et indemnités',
    step3Desc: 'Recevez vos missions, pointez via mobile et soyez payé automatiquement par SEPA.',
    featuresTitle: 'Tout ce dont vous avez besoin en tant que bénévole',
    feat1: 'Briefing numérique',
    feat1Desc: 'Recevez votre briefing sur votre téléphone — avec checklists et itinéraires.',
    feat2: 'Pointage mobile',
    feat2Desc: 'Scannez votre QR-code à l\'arrivée. Fini la paperasse.',
    feat3: 'Indemnités SEPA automatiques',
    feat3Desc: 'Vos indemnités sont calculées et versées automatiquement.',
    feat4: 'Aperçu saisonnier',
    feat4Desc: 'Suivez vos heures, indemnités et statut de conformité en temps réel.',
    socialTitle: 'Déjà actif dans les meilleurs clubs',
    socialClubs: 'KAA Gent, Club Brugge et KV Kortrijk',
    socialSubtitle: 'Rejoignez des centaines de bénévoles qui utilisent déjà la plateforme.',
    ctaTitle: 'Devenez bénévole aujourd\'hui',
    ctaSubtitle: 'Créez votre compte et découvrez quels clubs ont besoin de vous.',
    ctaButton: 'Commencer',
  },
  en: {
    heroTitle: 'Volunteer at your favourite sports club',
    heroSubtitle: 'Find a club nearby, sign your contract digitally and receive your compensation automatically.',
    heroCta: 'Find clubs near me',
    heroCtaSecondary: 'How does it work?',
    howTitle: 'How does it work?',
    step1: 'Find a club',
    step1Desc: 'Discover sports clubs in your area through the community page and follow your favourites.',
    step2: 'Sign your season contract',
    step2Desc: 'Receive and sign your contract digitally — secure and fast via e-signature.',
    step3: 'Receive tasks & compensation',
    step3Desc: 'Get your tasks, check in via mobile and receive your compensation automatically via SEPA.',
    featuresTitle: 'Everything you need as a volunteer',
    feat1: 'Digital briefing',
    feat1Desc: 'Receive your briefing on your phone — with checklists, routes and schedules.',
    feat2: 'Mobile check-in',
    feat2Desc: 'Scan your QR code on arrival. No more paperwork.',
    feat3: 'Automatic SEPA compensation',
    feat3Desc: 'Your expenses are automatically calculated and paid out.',
    feat4: 'Season overview',
    feat4Desc: 'Track your hours, compensation and compliance status in real time.',
    socialTitle: 'Already active at top sports clubs',
    socialClubs: 'KAA Gent, Club Brugge and KV Kortrijk',
    socialSubtitle: 'Join hundreds of volunteers already working through the platform.',
    ctaTitle: 'Become a volunteer today',
    ctaSubtitle: 'Create your account and discover which clubs need your help.',
    ctaButton: 'Get started',
  },
};

const VolunteerLanding = () => {
  const { language } = useLanguage();
  const l = t3Map[language as keyof typeof t3Map] || t3Map.nl;
  const [installPlatform, setInstallPlatform] = useState<'ios' | 'android' | null>(null);

  const steps = [
    { icon: Search, title: l.step1, desc: l.step1Desc, num: '01' },
    { icon: FileSignature, title: l.step2, desc: l.step2Desc, num: '02' },
    { icon: CreditCard, title: l.step3, desc: l.step3Desc, num: '03' },
  ];

  const features = [
    { icon: Smartphone, title: l.feat1, desc: l.feat1Desc },
    { icon: MapPin, title: l.feat2, desc: l.feat2Desc },
    { icon: CreditCard, title: l.feat3, desc: l.feat3Desc },
    { icon: Clock, title: l.feat4, desc: l.feat4Desc },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-32 right-0 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/8 rounded-full blur-3xl" />
        <div className="container mx-auto relative">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              {language === 'nl' ? 'Voor vrijwilligers' : language === 'fr' ? 'Pour bénévoles' : 'For volunteers'}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-heading font-bold text-foreground leading-tight">
              {l.heroTitle}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              {l.heroSubtitle}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/community" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity shadow-card">
                <Search className="w-5 h-5" />
                {l.heroCta}
              </Link>
              <a href="#how" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
                {l.heroCtaSecondary}
              </a>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 flex justify-center">
              <AppStoreButtons
                variant="primary"
                onClickIOS={() => setInstallPlatform('ios')}
                onClickAndroid={() => setInstallPlatform('android')}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{l.howTitle}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center relative"
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/20 to-transparent" />
                )}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
                  <s.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-xs font-bold text-primary mb-2">{s.num}</div>
                <h3 className="font-heading font-semibold text-foreground text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">{l.featuresTitle}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-shadow flex gap-5 border border-border/50"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <h3 className="text-xl font-heading font-bold text-foreground mb-2">{l.socialTitle}</h3>
            <p className="text-primary font-semibold text-lg mb-3">{l.socialClubs}</p>
            <p className="text-muted-foreground">{l.socialSubtitle}</p>
            <div className="flex items-center justify-center gap-6 mt-8 text-muted-foreground text-sm">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> 500+ {language === 'nl' ? 'vrijwilligers' : language === 'fr' ? 'bénévoles' : 'volunteers'}</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-primary" /> 50+ {language === 'nl' ? 'clubs' : 'clubs'}</span>
            </div>
          </motion.div>
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
            <Link to="/signup" className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
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

export default VolunteerLanding;
