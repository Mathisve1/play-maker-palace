import { useState } from 'react';
import SEOHead from '@/components/SEOHead';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import {
  Search, Smartphone, CreditCard, Clock, Shield, CheckCircle,
  ArrowRight, Sparkles, Trophy, Globe, Bell,
  ChevronDown,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AppStoreButtons, InstallInstructionsDialog } from '@/components/PWAInstallButtons';
import { motion } from 'framer-motion';
import { VolunteerStorySection, type StoryChapter } from '@/components/landing/VolunteerStorySection';
import { LandingFAQ, type FAQItem } from '@/components/landing/LandingFAQ';

// ─────────────────────────────────────────────────────────────────
// Translations
// ─────────────────────────────────────────────────────────────────
const t = {
  nl: {
    badge: 'Voor vrijwilligers',
    heroTitle: 'Doe vrijwilligerswerk bij jouw favoriete voetbalclub',
    heroSubtitle: 'Alles op je smartphone: van contract tot briefing, van check-in tot automatische vergoeding.',
    heroCta: 'Zoek clubs in mijn buurt',
    heroCtaSecondary: 'Ontdek hoe het werkt',

    storyLabel: 'Het verhaal van Jan',
    storyTitle: 'Van inschrijving tot vergoeding',
    storyChapters: [
      {
        num: '01',
        title: 'Vind jouw club',
        subtitle: 'Dichter bij dan je denkt',
        desc: 'Jan ontdekt De 12e Man en zoekt clubs in zijn buurt. In enkele taps vindt hij zijn favoriete lokale voetbalclub en schrijft hij zich in als steward.',
      },
      {
        num: '02',
        title: 'Digitaal seizoenscontract',
        subtitle: 'Officieel in één minuut',
        desc: 'De club verstuurt automatisch een seizoenscontract. Jan ondertekent digitaal via e-handtekening — veilig, officieel en volledig papierloos.',
      },
      {
        num: '03',
        title: 'Jouw briefing, in jouw taal',
        subtitle: 'Op maat, tot in het detail',
        desc: 'Jan ontvangt een gepersonaliseerde briefing op zijn telefoon. Hij staat aan Poort 4, weet exact wat zijn taken zijn — en dat alles in het Nederlands, Frans of Engels. Zijn keuze.',
      },
      {
        num: '04',
        title: 'Op weg naar het stadion',
        subtitle: 'Route op zak',
        desc: 'De app toont Jan de snelste route. Bij aankomst weet hij meteen waar hij naartoe moet. Geen zoeken, geen stress, gewoon genieten.',
      },
      {
        num: '05',
        title: 'Check-in via QR-code',
        subtitle: 'Aanwezig in één scan',
        desc: 'Bij de ingang scant Jan zijn persoonlijke QR-code. De club ziet onmiddellijk dat hij aanwezig is. Geen papieren lijst, geen handtekening. Klaar om te gaan.',
      },
      {
        num: '06',
        title: 'Wedstrijd & vergoeding',
        subtitle: 'Live support, automatisch betaald',
        desc: 'Tijdens de match ontvangt Jan live meldingen met exacte locaties bij incidenten. Na de wedstrijd wordt zijn vergoeding automatisch via SEPA op zijn rekening gestort.',
      },
    ] as StoryChapter[],

    demoLabel: 'De app van de vrijwilliger',
    demoTitle: 'Eenvoudig. Duidelijk. Op elk toestel.',
    demoSubtitle: 'Ontdek hoe de app eruitziet en hoe makkelijk het is om als vrijwilliger aan de slag te gaan.',
    demoScreens: [
      { id: 'dashboard', tabLabel: 'Persoonlijk dashboard', tabIcon: null },
      { id: 'briefing',  tabLabel: 'Taakbriefing & locatie', tabIcon: null },
      { id: 'checkin',   tabLabel: 'QR check-in',            tabIcon: null },
      { id: 'payment',   tabLabel: 'Vergoedingsoverzicht',   tabIcon: null },
    ],

    featuresLabel: 'Wat je krijgt',
    featuresTitle: 'Alles wat je nodig hebt als vrijwilliger',
    features: [
      { title: 'Digitale briefing',         desc: 'Je briefing in je eigen taal, met checklists, routes en tijdschema — altijd op je telefoon.',       icon: Smartphone },
      { title: 'Automatische SEPA-betaling',desc: 'Je vergoeding wordt automatisch berekend en overgezet. Geen formulieren, geen wachten.',             icon: CreditCard  },
      { title: 'Meertalige interface',      desc: 'De volledige app werkt in het Nederlands, Frans en Engels. Jij kiest.',                              icon: Globe       },
      { title: 'Live meldingen',            desc: 'Ontvang real-time updates tijdens de wedstrijd, inclusief precieze locaties via geomelding.',         icon: Bell        },
      { title: 'Seizoensoverzicht',         desc: 'Volg al je taken, uren en vergoedingen in één duidelijk overzicht.',                                  icon: Clock       },
      { title: 'Papierloos & veilig',       desc: 'Contracten, check-ins, briefings — alles digitaal en GDPR-conform.',                                  icon: Shield      },
    ],

    faqLabel: 'Veelgestelde vragen',
    faqTitle: 'Alles op een rijtje',
    faqItems: [
      {
        question: 'Is De 12e Man gratis voor vrijwilligers?',
        answer: 'Ja, volledig gratis. Als vrijwilliger betaal je nooit iets. Het platform is gratis te gebruiken voor inschrijving, briefings, check-ins en het ontvangen van je vergoeding.',
      },
      {
        question: 'Hoe lang duurt het om me in te schrijven?',
        answer: 'Minder dan 5 minuten. Maak een account aan, zoek een club in jouw buurt, schrijf je in en onderteken je contract digitaal. Alles gaat automatisch.',
      },
      {
        question: 'Moet ik een smartphone hebben?',
        answer: 'De app werkt het best op een smartphone, maar alles is ook bereikbaar via je webbrowser op tablet of computer. De app is ook installeerbaar als PWA op je startscherm.',
      },
      {
        question: 'Wat als ik een taak moet annuleren?',
        answer: 'Je kan een taak annuleren via de app. We vragen je om dit minstens 48 uur op voorhand te doen zodat de club een vervanger kan zoeken. Er zijn geen boetes of gevolgen voor incidentele annuleringen.',
      },
      {
        question: 'Is mijn persoonlijke informatie veilig?',
        answer: 'Absoluut. De 12e Man is volledig GDPR-conform. Jouw gegevens worden nooit gedeeld met derden en je kan op elk moment je account en data verwijderen.',
      },
      {
        question: 'Welke clubs zijn er al actief op het platform?',
        answer: (
          <>
            Bekijk alle actieve clubs op de{' '}
            <Link to="/community" className="text-primary font-semibold underline underline-offset-2">
              community-pagina
            </Link>
            .
          </>
        ),
      },
    ] as FAQItem[],

    ctaTitle: 'Word vandaag nog vrijwilliger',
    ctaSubtitle: 'Maak je account aan en ontdek welke clubs jouw hulp nodig hebben.',
    ctaButton: 'Aan de slag',

    trustLabel: 'Gebouwd op vertrouwen',
    trust: ['GDPR-conform', 'Belgische wetgeving', 'Veilige SEPA-betalingen'],
  },

  fr: {
    badge: 'Pour bénévoles',
    heroTitle: 'Faites du bénévolat dans votre club de football préféré',
    heroSubtitle: 'Tout sur votre smartphone : du contrat au briefing, du check-in à l\'indemnité automatique.',
    heroCta: 'Trouver des clubs près de moi',
    heroCtaSecondary: 'Découvrir comment ça marche',

    storyLabel: 'L\'histoire de Jan',
    storyTitle: 'De l\'inscription à l\'indemnité',
    storyChapters: [
      { num: '01', title: 'Trouvez votre club', subtitle: 'Plus près que vous ne pensez', desc: 'Jan découvre De 12e Man et cherche des clubs dans sa région. En quelques taps, il trouve son club de football local préféré et s\'inscrit comme steward.' },
      { num: '02', title: 'Contrat saisonnier numérique', subtitle: 'Officiel en une minute', desc: 'Le club envoie automatiquement un contrat saisonnier. Jan signe numériquement via e-signature — en toute sécurité, officiellement et sans papier.' },
      { num: '03', title: 'Votre briefing, dans votre langue', subtitle: 'Sur mesure, dans le détail', desc: 'Jan reçoit un briefing personnalisé sur son téléphone. Il est à la Porte 4, sait exactement quelles sont ses tâches — tout en français, néerlandais ou anglais. Son choix.' },
      { num: '04', title: 'En route vers le stade', subtitle: 'L\'itinéraire en poche', desc: 'L\'app montre à Jan le chemin le plus rapide. À l\'arrivée, il sait exactement où aller. Pas de recherche, pas de stress.' },
      { num: '05', title: 'Check-in par QR-code', subtitle: 'Présent en un scan', desc: 'À l\'entrée, Jan scanne son QR-code personnel. Le club voit immédiatement qu\'il est là. Aucune liste papier, aucune signature. Prêt à partir.' },
      { num: '06', title: 'Match & indemnité', subtitle: 'Support en direct, payé automatiquement', desc: 'Pendant le match, Jan reçoit des notifications en direct avec des localisations exactes. Après le match, son indemnité est versée automatiquement par SEPA.' },
    ] as StoryChapter[],

    demoLabel: 'L\'app du bénévole',
    demoTitle: 'Simple. Clair. Sur chaque appareil.',
    demoSubtitle: 'Découvrez à quoi ressemble l\'app et à quel point il est facile de commencer à travailler comme bénévole.',
    demoScreens: [
      { id: 'dashboard', tabLabel: 'Tableau de bord', tabIcon: null },
      { id: 'briefing',  tabLabel: 'Briefing & localisation', tabIcon: null },
      { id: 'checkin',   tabLabel: 'Check-in QR', tabIcon: null },
      { id: 'payment',   tabLabel: 'Aperçu des indemnités', tabIcon: null },
    ],

    featuresLabel: 'Ce que vous obtenez',
    featuresTitle: 'Tout ce dont vous avez besoin comme bénévole',
    features: [
      { title: 'Briefing numérique',       desc: 'Votre briefing dans votre langue, avec checklists, itinéraires et horaires — toujours sur votre téléphone.', icon: Smartphone },
      { title: 'Paiement SEPA automatique',desc: 'Votre indemnité est calculée et versée automatiquement. Aucun formulaire, aucune attente.',                    icon: CreditCard  },
      { title: 'Interface multilingue',    desc: 'L\'application fonctionne entièrement en français, néerlandais et anglais. Vous choisissez.',                  icon: Globe       },
      { title: 'Notifications en direct',  desc: 'Recevez des mises à jour en temps réel pendant le match, avec des localisations précises.',                    icon: Bell        },
      { title: 'Aperçu saisonnier',        desc: 'Suivez toutes vos tâches, heures et indemnités en un seul aperçu clair.',                                      icon: Clock       },
      { title: 'Sans papier & sécurisé',   desc: 'Contrats, check-ins, briefings — tout est numérique et conforme au RGPD.',                                     icon: Shield      },
    ],

    faqLabel: 'Questions fréquentes',
    faqTitle: 'Tout en un coup d\'œil',
    faqItems: [
      { question: 'De 12e Man est-il gratuit pour les bénévoles ?', answer: 'Oui, entièrement gratuit. En tant que bénévole, vous ne payez jamais rien.' },
      { question: 'Combien de temps faut-il pour s\'inscrire ?', answer: 'Moins de 5 minutes. Créez un compte, trouvez un club et signez votre contrat numériquement.' },
      { question: 'Faut-il un smartphone ?', answer: 'L\'app fonctionne mieux sur smartphone, mais tout est accessible via navigateur sur tablette ou ordinateur.' },
      { question: 'Que faire si je dois annuler une tâche ?', answer: 'Vous pouvez annuler via l\'app. Nous vous demandons de le faire au moins 48h à l\'avance.' },
      { question: 'Mes données personnelles sont-elles en sécurité ?', answer: 'Absolument. De 12e Man est entièrement conforme au RGPD.' },
      { question: 'Quels clubs sont déjà actifs ?', answer: (<>Consultez la <Link to="/community" className="text-primary font-semibold underline underline-offset-2">page communauté</Link>.</>) },
    ] as FAQItem[],

    ctaTitle: 'Devenez bénévole aujourd\'hui',
    ctaSubtitle: 'Créez votre compte et découvrez quels clubs ont besoin de vous.',
    ctaButton: 'Commencer',
    trustLabel: 'Construit sur la confiance',
    trust: ['Conforme RGPD', 'Législation belge', 'Paiements SEPA sécurisés'],
  },

  en: {
    badge: 'For volunteers',
    heroTitle: 'Volunteer at your favourite football club',
    heroSubtitle: 'Everything on your phone: from contract to briefing, from check-in to automatic payment.',
    heroCta: 'Find clubs near me',
    heroCtaSecondary: 'Discover how it works',

    storyLabel: 'The story of Jan',
    storyTitle: 'From sign-up to payment',
    storyChapters: [
      { num: '01', title: 'Find your club', subtitle: 'Closer than you think', desc: 'Jan discovers De 12e Man and searches for clubs nearby. In a few taps, he finds his favourite local football club and signs up as a steward.' },
      { num: '02', title: 'Digital season contract', subtitle: 'Official in one minute', desc: 'The club automatically sends a season contract. Jan signs digitally via e-signature — secure, official and completely paperless.' },
      { num: '03', title: 'Your briefing, in your language', subtitle: 'Tailored, down to the detail', desc: 'Jan receives a personalised briefing on his phone. He\'s at Gate 4, knows exactly what his tasks are — all in Dutch, French or English. His choice.' },
      { num: '04', title: 'On the way to the stadium', subtitle: 'Route in your pocket', desc: 'The app shows Jan the fastest route. On arrival, he knows exactly where to go. No searching, no stress, just enjoy.' },
      { num: '05', title: 'Check-in via QR code', subtitle: 'Present in one scan', desc: 'At the entrance, Jan scans his personal QR code. The club immediately sees he\'s there. No paper list, no signature. Ready to go.' },
      { num: '06', title: 'Match & compensation', subtitle: 'Live support, automatically paid', desc: 'During the match, Jan receives live notifications with exact locations for incidents. After the match, his compensation is automatically transferred via SEPA.' },
    ] as StoryChapter[],

    demoLabel: 'The volunteer app',
    demoTitle: 'Simple. Clear. On every device.',
    demoSubtitle: 'See what the app looks like and how easy it is to get started as a volunteer.',
    demoScreens: [
      { id: 'dashboard', tabLabel: 'Personal dashboard',    tabIcon: null },
      { id: 'briefing',  tabLabel: 'Task briefing & location', tabIcon: null },
      { id: 'checkin',   tabLabel: 'QR check-in',           tabIcon: null },
      { id: 'payment',   tabLabel: 'Compensation overview', tabIcon: null },
    ],

    featuresLabel: 'What you get',
    featuresTitle: 'Everything you need as a volunteer',
    features: [
      { title: 'Digital briefing',          desc: 'Your briefing in your language, with checklists, routes and schedules — always on your phone.',  icon: Smartphone },
      { title: 'Automatic SEPA payment',    desc: 'Your compensation is automatically calculated and transferred. No forms, no waiting.',            icon: CreditCard  },
      { title: 'Multilingual interface',    desc: 'The full app works in Dutch, French and English. You choose.',                                   icon: Globe       },
      { title: 'Live notifications',        desc: 'Receive real-time updates during the match, with precise geo-located incident alerts.',          icon: Bell        },
      { title: 'Season overview',           desc: 'Track all your tasks, hours and payments in one clear overview.',                               icon: Clock       },
      { title: 'Paperless & secure',        desc: 'Contracts, check-ins, briefings — all digital and GDPR compliant.',                             icon: Shield      },
    ],

    faqLabel: 'Frequently asked questions',
    faqTitle: 'Everything in one place',
    faqItems: [
      { question: 'Is De 12e Man free for volunteers?', answer: 'Yes, completely free. As a volunteer you never pay anything.' },
      { question: 'How long does sign-up take?', answer: 'Less than 5 minutes. Create an account, find a club nearby and sign your contract digitally.' },
      { question: 'Do I need a smartphone?', answer: 'The app works best on a smartphone, but everything is accessible via browser on tablet or computer too.' },
      { question: 'What if I need to cancel a task?', answer: 'You can cancel via the app. We ask you to do this at least 48 hours in advance.' },
      { question: 'Is my personal information safe?', answer: 'Absolutely. De 12e Man is fully GDPR compliant. Your data is never shared with third parties.' },
      { question: 'Which clubs are already active?', answer: (<>Check all active clubs on the <Link to="/community" className="text-primary font-semibold underline underline-offset-2">community page</Link>.</>) },
    ] as FAQItem[],

    ctaTitle: 'Become a volunteer today',
    ctaSubtitle: 'Create your account and discover which clubs need your help.',
    ctaButton: 'Get started',
    trustLabel: 'Built on trust',
    trust: ['GDPR compliant', 'Belgian legislation', 'Secure SEPA payments'],
  },
};

// ─────────────────────────────────────────────────────────────────
type Lang = keyof typeof t;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.55, ease: 'easeOut' } }),
};

const VolunteerLanding = () => {
  const { language } = useLanguage();
  const l = t[language as Lang] || t.nl;
  const [installPlatform, setInstallPlatform] = useState<'ios' | 'android' | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Vind vrijwilligerswerk bij jouw voetbalclub | De 12e Man"
        description="De 12e Man koppelt vrijwilligers aan voetbalclubs in België. Contracten, briefings en vergoedingen — alles op je telefoon."
        canonical="/"
      />
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-32 px-4">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-background to-accent/5" />
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-accent/8 blur-3xl" />
          {/* Stadium silhouette */}
          <svg
            className="absolute bottom-0 left-0 right-0 w-full opacity-[0.035]"
            viewBox="0 0 1440 200" preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 200 L0 130 Q180 60 360 80 Q540 100 720 70 Q900 40 1080 80 Q1260 100 1440 130 L1440 200 Z" fill="hsl(24,85%,55%)" />
            <rect x="120" y="80" width="16" height="120" fill="hsl(24,85%,55%)" />
            <rect x="1304" y="80" width="16" height="120" fill="hsl(24,85%,55%)" />
            <path d="M110 80 L136 65 L148 80 Z" fill="hsl(24,85%,55%)" />
            <path d="M1294 80 L1320 65 L1332 80 Z" fill="hsl(24,85%,55%)" />
          </svg>
        </div>

        <div className="container mx-auto relative">
          <div className="max-w-4xl mx-auto text-center">

            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-5 py-2.5 rounded-full font-semibold text-base mb-10"
            >
              <Sparkles className="w-4 h-4" />
              {l.badge}
            </motion.div>

            <motion.h1
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
              className="font-heading font-bold text-foreground leading-[1.05] mb-7"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
            >
              {l.heroTitle}
            </motion.h1>

            <motion.p
              initial="hidden" animate="visible" variants={fadeUp} custom={2}
              className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10"
            >
              {l.heroSubtitle}
            </motion.p>

            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
            >
              <Link
                to="/community"
                className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_8px_32px_-8px_hsla(24,85%,55%,0.5)] cursor-pointer min-h-[56px]"
              >
                <Search className="w-5 h-5" />
                {l.heroCta}
              </Link>
              <a
                href="#story"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border-2 border-border text-foreground font-semibold text-lg hover:bg-muted active:scale-[0.98] transition-all cursor-pointer min-h-[56px]"
              >
                {l.heroCtaSecondary}
                <ChevronDown className="w-5 h-5" />
              </a>
            </motion.div>

            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} custom={4}
              className="flex justify-center"
            >
              <AppStoreButtons
                variant="primary"
                onClickIOS={() => setInstallPlatform('ios')}
                onClickAndroid={() => setInstallPlatform('android')}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-card py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
            {l.trust.map((item, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="flex items-center gap-2.5"
              >
                <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                <span className="text-base font-semibold text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCROLL STORY ────────────────────────────────────────── */}
      <div id="story">
        <VolunteerStorySection
          sectionLabel={l.storyLabel}
          sectionTitle={l.storyTitle}
          chapters={l.storyChapters}
        />
      </div>

      {/* ── FEATURES GRID ───────────────────────────────────────── */}
      <section className="py-28 px-4 bg-muted/25">
        <div className="container mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} className="text-center mb-16"
          >
            <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">{l.featuresLabel}</p>
            <h2 className="font-heading font-bold text-foreground text-4xl md:text-5xl">{l.featuresTitle}</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {l.features.map((f, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i * 0.4}
                className="bg-card rounded-3xl p-7 border border-border/50 shadow-[0_2px_16px_-2px_hsla(220,25%,12%,0.07)] hover:shadow-[0_8px_32px_-8px_hsla(220,25%,12%,0.12)] hover:-translate-y-0.5 transition-all cursor-default"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-foreground text-xl mb-2.5">{f.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <LandingFAQ
        sectionLabel={l.faqLabel}
        sectionTitle={l.faqTitle}
        items={l.faqItems}
        ctaText={language === 'nl' ? 'Bekijk alle clubs in de community' : language === 'fr' ? 'Voir tous les clubs' : 'See all clubs'}
        ctaLink="/community"
      />

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="py-28 px-4 bg-muted/25">
        <div className="container mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp}
            className="max-w-3xl mx-auto text-center relative overflow-hidden rounded-3xl px-8 py-24"
            style={{ background: 'linear-gradient(135deg, hsl(24,85%,50%) 0%, hsl(35,90%,56%) 50%, hsl(24,85%,47%) 100%)' }}
          >
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <Trophy className="w-14 h-14 mx-auto mb-6 text-white/90" />
              <h2 className="font-heading font-bold text-white leading-tight mb-5"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                {l.ctaTitle}
              </h2>
              <p className="text-xl text-white/85 leading-relaxed max-w-lg mx-auto mb-10">{l.ctaSubtitle}</p>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-white text-primary font-bold text-lg hover:bg-white/92 active:scale-[0.98] transition-all cursor-pointer min-h-[56px] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]"
              >
                {l.ctaButton}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
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
