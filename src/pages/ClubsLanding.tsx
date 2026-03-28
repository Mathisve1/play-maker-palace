import { useState } from 'react';
import SEOHead from '@/components/SEOHead';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import {
  FileSignature, Users, CreditCard, ClipboardList, Shield, CheckCircle,
  ArrowRight, Sparkles, BarChart3, Globe, AlertTriangle,
  ChevronDown, Trophy, Lock,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ClubStorySection, type StoryChapter } from '@/components/landing/ClubStorySection';
import { LandingFAQ, type FAQItem } from '@/components/landing/LandingFAQ';

// ─────────────────────────────────────────────────────────────────
// Translations
// ─────────────────────────────────────────────────────────────────
const t = {
  nl: {
    badge: 'Voor sportclubs',
    heroTitle: 'Beheer al je vrijwilligers op één platform',
    heroSubtitle: 'Digitale seizoenscontracten, meertalige briefings, live veiligheidsmeldingen en automatische SEPA-betalingen — volledig papierloos.',
    heroCta: 'Start gratis met je club',
    heroCtaSecondary: 'Bekijk hoe het werkt',

    storyLabel: 'De workflow van een clubmanager',
    storyTitle: 'Van evenement tot uitbetaling',
    storyChapters: [
      {
        num: '01',
        title: 'Evenement aanmaken',
        subtitle: 'Alles start hier',
        desc: 'De clubmanager maakt een evenement aan op het platform: datum, locatie, aantal stewards, barmedewerkers en meer. Het systeem stuurt automatisch uitnodigingen naar de vrijwilligerspool.',
      },
      {
        num: '02',
        title: 'Seizoenscontracten versturen',
        subtitle: 'Officieel in één klik',
        desc: 'Met één druk op de knop verstuurt de club digitale seizoenscontracten aan alle vrijwilligers. Ze ondertekenen via e-handtekening — juridisch geldig, volledig papierloos, opgeslagen in de cloud.',
      },
      {
        num: '03',
        title: 'Meertalige briefings bouwen',
        subtitle: 'Op maat van elke vrijwilliger',
        desc: 'De briefing builder genereert automatisch gepersonaliseerde briefings per vrijwilliger — in hun voorkeurstaal (NL, FR of EN). Steward Marc staat aan Poort 4 en weet precies wat zijn taken zijn.',
      },
      {
        num: '04',
        title: 'Dag van de wedstrijd',
        subtitle: 'Volledig overzicht in real-time',
        desc: 'Op matchdag heeft de clubmanager een live dashboard: wie is er ingecheckt, welke zones zijn bemand, hoeveel vrijwilligers zijn er al aanwezig. Geen verrassingen, totale controle.',
      },
      {
        num: '05',
        title: 'Live geo-meldingen',
        subtitle: 'Snel handelen bij incidenten',
        desc: 'Bij een incident stuurt de manager een geo-gericht melding naar de vrijwilligers in de buurt. Ze ontvangen exact de locatie, een beschrijving en de vereiste actie. Veiligheidsbeheer in realtime.',
      },
      {
        num: '06',
        title: 'Automatische SEPA-betalingen',
        subtitle: 'Vergoedingen zonder papierwerk',
        desc: 'Na de wedstrijd berekent het platform automatisch alle vergoedingen. De clubmanager keurt één keer goed — en alle betalingen worden in bulk verwerkt via SEPA. Klaar.',
      },
    ] as StoryChapter[],

    featuresLabel: 'Alles inbegrepen',
    featuresTitle: 'Eén platform. Alles geregeld.',
    features: [
      { title: 'Digitale seizoenscontracten', desc: 'Verstuur en beheer contracten voor al je vrijwilligers in één klik. Juridisch geldig, veilig opgeslagen.', icon: FileSignature },
      { title: 'Meertalige briefings',        desc: 'Elke vrijwilliger krijgt zijn briefing in zijn eigen taal — NL, FR of EN — volledig op maat van zijn rol en locatie.', icon: Globe },
      { title: 'Live veiligheidsmeldingen',   desc: 'Stuur geo-gerichte meldingen bij incidenten. Vrijwilligers ontvangen exact locatie, beschrijving en gevraagde actie.', icon: AlertTriangle },
      { title: 'Automatische SEPA-betaling',  desc: 'Vergoedingen worden automatisch berekend en in bulk uitbetaald. Geen formulieren, geen handmatige overschrijvingen.', icon: CreditCard },
      { title: 'Compliance & rapportage',     desc: 'Volledig audit trail, compliance dashboards en seizoensrapporten. Klaar voor elke controle.', icon: BarChart3 },
      { title: 'Vrijwilligersbeheer',         desc: 'Beheer je volledige vrijwilligerspool: aanwezigheid, taken, loyaliteitspunten en history per persoon.', icon: Users },
    ],

    pricingLabel: 'Transparante prijzen',
    pricingTitle: 'Simpel en eerlijk',
    pricingSubtitle: 'Start gratis. Betaal pas wanneer je vrijwilligers écht actief zijn.',
    pricingFree: 'Gratis',
    pricingFreeDesc: 'Perfect om te starten',
    pricingFreePrice: '€0',
    pricingFreePeriod: 'voor altijd',
    pricingFreeFeatures: [
      '2 gratis voltooide taken per vrijwilliger per seizoen',
      'Alle platformfeatures inbegrepen',
      'Briefing builder & contracten',
      'Live dashboard & check-in QR',
      'GDPR-conforme dataprivacy',
    ],
    pricingGrowth: 'Groeiplan',
    pricingGrowthDesc: 'Voor actieve clubs',
    pricingGrowthPrice: '€15',
    pricingGrowthPeriod: 'per vrijwilliger / seizoen',
    pricingGrowthNote: 'Enkel verschuldigd vanaf de 3e voltooide taak per vrijwilliger — nooit vóóraf.',
    pricingGrowthFeatures: [
      'Alles van het gratis plan',
      'Onbeperkte taken & evenementen',
      'SEPA-uitbetalingen in bulk',
      'Automatische facturatie',
      'Geavanceerde rapportage',
    ],
    pricingComingSoon: 'Betalingsintegratie binnenkort beschikbaar',
    pricingComingSoonSub: 'Gebruik het platform nu volledig gratis. Online betaling volgt.',
    pricingPopular: 'Meest gekozen',

    faqLabel: 'Veelgestelde vragen',
    faqTitle: 'Alles voor clubs op een rijtje',
    faqItems: [
      {
        question: 'Hoeveel kost De 12e Man voor mijn club?',
        answer: 'De eerste 2 voltooide taken per vrijwilliger per seizoen zijn volledig gratis. Pas vanaf de 3e voltooide taak betaal je eenmalig €15 voor die vrijwilliger — voor de rest van het seizoen zijn er geen extra kosten. Je betaalt dus alleen voor actieve vrijwilligers, en nooit vooraf.',
      },
      {
        question: 'Hoe werken de digitale seizoenscontracten?',
        answer: 'Via de briefing builder selecteer je het contracttype (steward, bar & catering, terrein, ...), vul je de seizoensdetails in en stuur je het contract in één klik naar je vrijwilligers. Zij ondertekenen digitaal via e-handtekening. Alles is juridisch geldig en opgeslagen in je clubdossier.',
      },
      {
        question: 'Zijn de briefings echt meertalig?',
        answer: 'Ja. Elke vrijwilliger ontvangt zijn briefing in de taal die hij zelf koos bij registratie: Nederlands, Frans of Engels. De inhoud — taak, zone, tijdstip, checklists — is volledig identiek, enkel de taal verschilt.',
      },
      {
        question: 'Hoe verlopen de SEPA-uitbetalingen?',
        answer: 'Na elke wedstrijd of evenement berekent het platform automatisch de vergoedingen op basis van het aantal voltooide taken per vrijwilliger. De clubmanager keurt het overzicht goed en het systeem genereert een SEPA-betaalbestand dat ingediend kan worden bij de bank.',
      },
      {
        question: 'Zijn onze club- en vrijwilligersgegevens veilig?',
        answer: 'Absoluut. De 12e Man is volledig GDPR-conform. Alle data is opgeslagen op Europese servers. Vrijwilligersgegevens worden nooit gedeeld met derden. Je club heeft volledige controle over je data en kan alles exporteren of verwijderen.',
      },
      {
        question: 'Welke clubs zijn al actief op het platform?',
        answer: (
          <>
            Bekijk alle actieve clubs op de{' '}
            <Link to="/community" className="text-secondary font-semibold underline underline-offset-2">
              community-pagina
            </Link>
            .
          </>
        ),
      },
    ] as FAQItem[],

    ctaTitle: 'Klaar om je club te digitaliseren?',
    ctaSubtitle: 'Maak je clubaccount aan en ontdek hoe je vrijwilligersbeheer voorgoed verandert.',
    ctaButton: 'Start gratis',

    trustLabel: 'Gebouwd voor clubs',
    trust: ['GDPR-conform', 'Belgische wetgeving', 'Veilige SEPA-betalingen'],
  },

  fr: {
    badge: 'Pour les clubs sportifs',
    heroTitle: 'Gérez tous vos bénévoles sur une seule plateforme',
    heroSubtitle: 'Contrats saisonniers numériques, briefings multilingues, alertes de sécurité en direct et paiements SEPA automatiques — sans aucun papier.',
    heroCta: 'Commencer gratuitement',
    heroCtaSecondary: 'Découvrir comment ça marche',

    storyLabel: 'Le flux de travail d\'un responsable de club',
    storyTitle: 'De l\'événement au paiement',
    storyChapters: [
      { num: '01', title: 'Créer un événement', subtitle: 'Tout commence ici', desc: 'Le responsable crée un événement sur la plateforme : date, lieu, nombre de stewards, personnel de bar et plus. Le système envoie automatiquement des invitations au pool de bénévoles.' },
      { num: '02', title: 'Envoyer les contrats saisonniers', subtitle: 'Officiel en un clic', desc: 'En un seul clic, le club envoie des contrats saisonniers numériques à tous les bénévoles. Ils signent par e-signature — juridiquement valide, entièrement sans papier, stocké dans le cloud.' },
      { num: '03', title: 'Créer des briefings multilingues', subtitle: 'Sur mesure pour chaque bénévole', desc: 'Le générateur de briefings crée automatiquement des briefings personnalisés par bénévole — dans leur langue préférée (NL, FR ou EN). Le steward Marc est à la Porte 4 et sait exactement ce qu\'il doit faire.' },
      { num: '04', title: 'Jour du match', subtitle: 'Vue d\'ensemble complète en temps réel', desc: 'Le jour du match, le responsable dispose d\'un tableau de bord en direct : qui est arrivé, quelles zones sont couvertes, combien de bénévoles sont présents. Aucune surprise, contrôle total.' },
      { num: '05', title: 'Alertes géolocalisées en direct', subtitle: 'Réagir vite aux incidents', desc: 'En cas d\'incident, le responsable envoie une alerte géo-ciblée aux bénévoles à proximité. Ils reçoivent l\'emplacement exact, une description et l\'action requise. Gestion de la sécurité en temps réel.' },
      { num: '06', title: 'Paiements SEPA automatiques', subtitle: 'Indemnités sans paperasse', desc: 'Après le match, la plateforme calcule automatiquement toutes les indemnités. Le responsable approuve une fois — et tous les paiements sont traités en masse via SEPA. Terminé.' },
    ] as StoryChapter[],

    featuresLabel: 'Tout inclus',
    featuresTitle: 'Une plateforme. Tout réglé.',
    features: [
      { title: 'Contrats saisonniers numériques', desc: 'Envoyez et gérez les contrats pour tous vos bénévoles en un clic. Juridiquement valide, stocké en toute sécurité.', icon: FileSignature },
      { title: 'Briefings multilingues',          desc: 'Chaque bénévole reçoit son briefing dans sa langue — NL, FR ou EN — adapté à son rôle et à sa zone.', icon: Globe },
      { title: 'Alertes de sécurité en direct',   desc: 'Envoyez des alertes géo-ciblées lors d\'incidents. Les bénévoles reçoivent l\'emplacement exact et l\'action requise.', icon: AlertTriangle },
      { title: 'Paiement SEPA automatique',       desc: 'Les indemnités sont calculées et versées en masse automatiquement. Aucun formulaire, aucun virement manuel.', icon: CreditCard },
      { title: 'Conformité & rapports',           desc: 'Piste d\'audit complète, tableaux de bord de conformité et rapports saisonniers. Prêt pour tout contrôle.', icon: BarChart3 },
      { title: 'Gestion des bénévoles',           desc: 'Gérez votre pool complet de bénévoles : présences, tâches, points de fidélité et historique par personne.', icon: Users },
    ],

    pricingLabel: 'Prix transparents',
    pricingTitle: 'Simple et honnête',
    pricingSubtitle: 'Démarrez gratuitement. Payez seulement quand vos bénévoles sont vraiment actifs.',
    pricingFree: 'Gratuit',
    pricingFreeDesc: 'Parfait pour démarrer',
    pricingFreePrice: '€0',
    pricingFreePeriod: 'pour toujours',
    pricingFreeFeatures: [
      '2 tâches accomplies gratuites par bénévole par saison',
      'Toutes les fonctionnalités de la plateforme',
      'Générateur de briefing & contrats',
      'Tableau de bord en direct & QR check-in',
      'Confidentialité des données conforme RGPD',
    ],
    pricingGrowth: 'Plan Croissance',
    pricingGrowthDesc: 'Pour les clubs actifs',
    pricingGrowthPrice: '€15',
    pricingGrowthPeriod: 'par bénévole / saison',
    pricingGrowthNote: 'Uniquement dû à partir de la 3e tâche accomplie par bénévole — jamais à l\'avance.',
    pricingGrowthFeatures: [
      'Tout du plan gratuit',
      'Tâches & événements illimités',
      'Paiements SEPA en masse',
      'Facturation automatique',
      'Rapports avancés',
    ],
    pricingComingSoon: 'Intégration de paiement bientôt disponible',
    pricingComingSoonSub: 'Utilisez la plateforme entièrement gratuitement. Le paiement en ligne suit.',
    pricingPopular: 'Le plus populaire',

    faqLabel: 'Questions fréquentes',
    faqTitle: 'Tout pour les clubs en un coup d\'œil',
    faqItems: [
      { question: 'Combien coûte De 12e Man pour mon club ?', answer: 'Les 2 premières tâches accomplies par bénévole par saison sont entièrement gratuites. Ce n\'est qu\'à partir de la 3e tâche accomplie que vous payez une fois €15 pour ce bénévole — pour le reste de la saison, aucun frais supplémentaire. Vous payez donc uniquement pour les bénévoles actifs, et jamais à l\'avance.' },
      { question: 'Comment fonctionnent les contrats saisonniers numériques ?', answer: 'Via le générateur, vous sélectionnez le type de contrat, remplissez les détails de la saison et envoyez le contrat en un clic à vos bénévoles. Ils signent numériquement. Tout est juridiquement valide et stocké dans votre dossier de club.' },
      { question: 'Les briefings sont-ils vraiment multilingues ?', answer: 'Oui. Chaque bénévole reçoit son briefing dans la langue qu\'il a choisie lors de son inscription : néerlandais, français ou anglais. Le contenu — tâche, zone, horaire, checklists — est identique, seule la langue diffère.' },
      { question: 'Comment se déroulent les paiements SEPA ?', answer: 'Après chaque match ou événement, la plateforme calcule automatiquement les indemnités. Le responsable approuve l\'aperçu et le système génère un fichier de paiement SEPA à soumettre à la banque.' },
      { question: 'Les données de notre club et de nos bénévoles sont-elles sécurisées ?', answer: 'Absolument. De 12e Man est entièrement conforme au RGPD. Toutes les données sont stockées sur des serveurs européens. Les données des bénévoles ne sont jamais partagées avec des tiers.' },
      { question: 'Quels clubs sont déjà actifs ?', answer: (<>Consultez la <Link to="/community" className="text-secondary font-semibold underline underline-offset-2">page communauté</Link>.</>) },
    ] as FAQItem[],

    ctaTitle: 'Prêt à digitaliser votre club ?',
    ctaSubtitle: 'Créez votre compte de club et découvrez comment la gestion des bénévoles change pour toujours.',
    ctaButton: 'Commencer gratuitement',
    trustLabel: 'Construit pour les clubs',
    trust: ['Conforme RGPD', 'Législation belge', 'Paiements SEPA sécurisés'],
  },

  en: {
    badge: 'For sports clubs',
    heroTitle: 'Manage all your volunteers on one platform',
    heroSubtitle: 'Digital season contracts, multilingual briefings, live safety alerts and automatic SEPA payments — completely paperless.',
    heroCta: 'Start free with your club',
    heroCtaSecondary: 'See how it works',

    storyLabel: 'A club manager\'s workflow',
    storyTitle: 'From event to payment',
    storyChapters: [
      { num: '01', title: 'Create an event', subtitle: 'Everything starts here', desc: 'The club manager creates an event on the platform: date, location, number of stewards, bar staff and more. The system automatically sends invitations to the volunteer pool.' },
      { num: '02', title: 'Send season contracts', subtitle: 'Official in one click', desc: 'With one click, the club sends digital season contracts to all volunteers. They sign via e-signature — legally valid, completely paperless, stored in the cloud.' },
      { num: '03', title: 'Build multilingual briefings', subtitle: 'Tailored to every volunteer', desc: 'The briefing builder automatically generates personalised briefings per volunteer — in their preferred language (NL, FR or EN). Steward Marc is at Gate 4 and knows exactly what his tasks are.' },
      { num: '04', title: 'Match day', subtitle: 'Full real-time overview', desc: 'On match day, the club manager has a live dashboard: who has checked in, which zones are staffed, how many volunteers are present. No surprises, total control.' },
      { num: '05', title: 'Live geo-alerts', subtitle: 'Act fast on incidents', desc: 'When an incident occurs, the manager sends a geo-targeted alert to nearby volunteers. They receive the exact location, a description and the required action. Safety management in real time.' },
      { num: '06', title: 'Automatic SEPA payments', subtitle: 'Compensation without paperwork', desc: 'After the match, the platform automatically calculates all compensation. The club manager approves once — and all payments are processed in bulk via SEPA. Done.' },
    ] as StoryChapter[],

    featuresLabel: 'Everything included',
    featuresTitle: 'One platform. Everything handled.',
    features: [
      { title: 'Digital season contracts',  desc: 'Send and manage contracts for all your volunteers in one click. Legally valid, securely stored.', icon: FileSignature },
      { title: 'Multilingual briefings',    desc: 'Every volunteer gets their briefing in their own language — NL, FR or EN — tailored to their role and location.', icon: Globe },
      { title: 'Live safety alerts',        desc: 'Send geo-targeted alerts during incidents. Volunteers receive exact location, description and required action.', icon: AlertTriangle },
      { title: 'Automatic SEPA payment',    desc: 'Compensation is automatically calculated and paid out in bulk. No forms, no manual transfers.', icon: CreditCard },
      { title: 'Compliance & reporting',    desc: 'Full audit trail, compliance dashboards and season reports. Ready for any inspection.', icon: BarChart3 },
      { title: 'Volunteer management',      desc: 'Manage your full volunteer pool: attendance, tasks, loyalty points and history per person.', icon: Users },
    ],

    pricingLabel: 'Transparent pricing',
    pricingTitle: 'Simple and fair',
    pricingSubtitle: 'Start free. Pay only when your volunteers are truly active.',
    pricingFree: 'Free',
    pricingFreeDesc: 'Perfect to get started',
    pricingFreePrice: '€0',
    pricingFreePeriod: 'forever',
    pricingFreeFeatures: [
      '2 free completed tasks per volunteer per season',
      'All platform features included',
      'Briefing builder & contracts',
      'Live dashboard & QR check-in',
      'GDPR-compliant data privacy',
    ],
    pricingGrowth: 'Growth plan',
    pricingGrowthDesc: 'For active clubs',
    pricingGrowthPrice: '€15',
    pricingGrowthPeriod: 'per volunteer / season',
    pricingGrowthNote: 'Only due from the 3rd completed task per volunteer — never upfront.',
    pricingGrowthFeatures: [
      'Everything in the free plan',
      'Unlimited tasks & events',
      'Bulk SEPA payments',
      'Automatic invoicing',
      'Advanced reporting',
    ],
    pricingComingSoon: 'Payment integration coming soon',
    pricingComingSoonSub: 'Use the platform completely free now. Online payment follows.',
    pricingPopular: 'Most popular',

    faqLabel: 'Frequently asked questions',
    faqTitle: 'Everything for clubs in one place',
    faqItems: [
      { question: 'How much does De 12e Man cost for my club?', answer: 'The first 2 completed tasks per volunteer per season are completely free. Only from the 3rd completed task do you pay a one-time €15 for that volunteer — for the rest of the season there are no extra costs. You only pay for active volunteers, and never upfront.' },
      { question: 'How do the digital season contracts work?', answer: 'Through the briefing builder, you select the contract type, fill in the season details and send the contract in one click to your volunteers. They sign digitally. Everything is legally valid and stored in your club file.' },
      { question: 'Are the briefings really multilingual?', answer: 'Yes. Every volunteer receives their briefing in the language they chose at registration: Dutch, French or English. The content — task, zone, time, checklists — is identical, only the language differs.' },
      { question: 'How do SEPA payments work?', answer: 'After each match or event, the platform automatically calculates compensation. The club manager approves the overview and the system generates a SEPA payment file to submit to the bank.' },
      { question: 'Is our club and volunteer data safe?', answer: 'Absolutely. De 12e Man is fully GDPR compliant. All data is stored on European servers. Volunteer data is never shared with third parties.' },
      { question: 'Which clubs are already active?', answer: (<>Check all active clubs on the <Link to="/community" className="text-secondary font-semibold underline underline-offset-2">community page</Link>.</>) },
    ] as FAQItem[],

    ctaTitle: 'Ready to digitalise your club?',
    ctaSubtitle: 'Create your club account and discover how volunteer management changes forever.',
    ctaButton: 'Start free',
    trustLabel: 'Built for clubs',
    trust: ['GDPR compliant', 'Belgian legislation', 'Secure SEPA payments'],
  },
};

// ─────────────────────────────────────────────────────────────────
type Lang = keyof typeof t;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: 'easeOut' },
  }),
};

// ─────────────────────────────────────────────────────────────────
const ClubsLanding = () => {
  const { language } = useLanguage();
  const l = t[language as Lang] || t.nl;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Beheer je vrijwilligers digitaal | De 12e Man voor clubs"
        description="De 12e Man geeft sportclubs een volledig platform voor vrijwilligersbeheer: digitale contracten, meertalige briefings, live veiligheidsmeldingen en automatische SEPA-betalingen."
        canonical="/voor-clubs"
      />
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-32 px-4">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/6 via-background to-accent/5" />
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-secondary/8 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-accent/8 blur-3xl" />
          {/* Stadium silhouette (teal tint) */}
          <svg
            className="absolute bottom-0 left-0 right-0 w-full opacity-[0.04]"
            viewBox="0 0 1440 200" preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 200 L0 120 Q200 40 400 65 Q600 90 720 55 Q840 20 1040 65 Q1240 90 1440 120 L1440 200 Z" fill="hsl(180,45%,30%)" />
            {/* Floodlight left */}
            <rect x="100" y="65" width="14" height="135" fill="hsl(180,45%,30%)" />
            <path d="M90 65 L114 50 L126 65 Z" fill="hsl(180,45%,30%)" />
            {/* Floodlight right */}
            <rect x="1326" y="65" width="14" height="135" fill="hsl(180,45%,30%)" />
            <path d="M1316 65 L1340 50 L1352 65 Z" fill="hsl(180,45%,30%)" />
            {/* Goal posts */}
            <rect x="620" y="130" width="6" height="70" fill="hsl(180,45%,30%)" />
            <rect x="814" y="130" width="6" height="70" fill="hsl(180,45%,30%)" />
            <rect x="620" y="130" width="200" height="6" fill="hsl(180,45%,30%)" />
          </svg>
        </div>

        <div className="container mx-auto relative">
          <div className="max-w-4xl mx-auto text-center">

            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 bg-secondary/10 text-secondary border border-secondary/20 px-5 py-2.5 rounded-full font-semibold text-base mb-10"
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
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                to="/club-signup"
                className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-secondary text-secondary-foreground font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_8px_32px_-8px_hsla(180,45%,30%,0.45)] cursor-pointer min-h-[56px]"
              >
                <Sparkles className="w-5 h-5" />
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
                <CheckCircle className="w-5 h-5 text-secondary shrink-0" />
                <span className="text-base font-semibold text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCROLL STORY ────────────────────────────────────────── */}
      <div id="story">
        <ClubStorySection
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
            <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-4">{l.featuresLabel}</p>
            <h2 className="font-heading font-bold text-foreground text-4xl md:text-5xl">{l.featuresTitle}</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {l.features.map((f, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i * 0.4}
                className="bg-card rounded-3xl p-7 border border-border/50 shadow-[0_2px_16px_-2px_hsla(220,25%,12%,0.07)] hover:shadow-[0_8px_32px_-8px_hsla(180,45%,30%,0.15)] hover:-translate-y-0.5 transition-all cursor-default"
              >
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-5">
                  <f.icon className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="font-heading font-bold text-foreground text-xl mb-2.5">{f.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────── */}
      <section className="py-28 px-4 bg-background">
        <div className="container mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} className="text-center mb-16"
          >
            <p className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-4">{l.pricingLabel}</p>
            <h2 className="font-heading font-bold text-foreground text-4xl md:text-5xl mb-4">{l.pricingTitle}</h2>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">{l.pricingSubtitle}</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Free tier */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="bg-card rounded-3xl p-8 border border-border/60 shadow-[0_2px_16px_-2px_hsla(220,25%,12%,0.07)]"
            >
              <div className="mb-6">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">{l.pricingFree}</p>
                <p className="text-base text-muted-foreground mb-5">{l.pricingFreeDesc}</p>
                <div className="flex items-end gap-2">
                  <span className="font-heading font-bold text-foreground text-5xl">{l.pricingFreePrice}</span>
                  <span className="text-muted-foreground text-base mb-2">{l.pricingFreePeriod}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {l.pricingFreeFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-base text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/club-signup"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-secondary text-secondary font-bold text-base hover:bg-secondary/5 active:scale-[0.98] transition-all cursor-pointer min-h-[52px]"
              >
                {language === 'fr' ? 'Commencer gratuitement' : language === 'en' ? 'Get started free' : 'Gratis starten'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Growth tier — coming soon overlay */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="relative bg-card rounded-3xl p-8 border-2 border-secondary/40 shadow-[0_8px_40px_-8px_hsla(180,45%,30%,0.2)] overflow-hidden"
            >
              {/* Popular badge */}
              <div className="absolute top-5 right-5 bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full">
                {l.pricingPopular}
              </div>

              <div className="mb-6">
                <p className="text-sm font-bold text-secondary uppercase tracking-widest mb-2">{l.pricingGrowth}</p>
                <p className="text-base text-muted-foreground mb-5">{l.pricingGrowthDesc}</p>
                <div className="flex items-end gap-2">
                  <span className="font-heading font-bold text-foreground text-5xl">{l.pricingGrowthPrice}</span>
                  <span className="text-muted-foreground text-base mb-2">{l.pricingGrowthPeriod}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-l-2 border-secondary/40 pl-3">{l.pricingGrowthNote}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {l.pricingGrowthFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-base text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {/* Coming soon button (disabled look) */}
              <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-muted text-muted-foreground font-semibold text-base cursor-not-allowed min-h-[52px]">
                <Lock className="w-4 h-4" />
                {language === 'fr' ? 'Bientôt disponible' : language === 'en' ? 'Coming soon' : 'Binnenkort beschikbaar'}
              </div>

              {/* Frosted coming-soon overlay on the card action area */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card/95 to-transparent pointer-events-none rounded-b-3xl" />
              <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-1 px-4">
                <p className="text-sm font-bold text-secondary text-center">{l.pricingComingSoon}</p>
                <p className="text-xs text-muted-foreground text-center leading-relaxed">{l.pricingComingSoonSub}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <LandingFAQ
        sectionLabel={l.faqLabel}
        sectionTitle={l.faqTitle}
        items={l.faqItems}
        ctaText={
          language === 'nl' ? 'Bekijk alle clubs in de community' :
          language === 'fr' ? 'Voir tous les clubs' :
          'See all clubs'
        }
        ctaLink="/community"
      />

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="py-28 px-4 bg-muted/25">
        <div className="container mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp}
            className="max-w-3xl mx-auto text-center relative overflow-hidden rounded-3xl px-8 py-24"
            style={{ background: 'linear-gradient(135deg, hsl(180,45%,26%) 0%, hsl(185,50%,32%) 50%, hsl(175,42%,26%) 100%)' }}
          >
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-white/8 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <Trophy className="w-14 h-14 mx-auto mb-6 text-white/90" />
              <h2
                className="font-heading font-bold text-white leading-tight mb-5"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
              >
                {l.ctaTitle}
              </h2>
              <p className="text-xl text-white/85 leading-relaxed max-w-lg mx-auto mb-10">{l.ctaSubtitle}</p>
              <Link
                to="/club-signup"
                className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-white text-secondary font-bold text-lg hover:bg-white/92 active:scale-[0.98] transition-all cursor-pointer min-h-[56px] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]"
              >
                {l.ctaButton}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ClubsLanding;
