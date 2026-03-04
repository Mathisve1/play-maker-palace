import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, ChevronRight, LifeBuoy, ClipboardList, CreditCard,
  UserCog, Smartphone, Shield, CalendarDays, FileSignature, Award,
  MessageCircle, Ticket, Gift, ArrowLeft, ExternalLink, BookOpen,
  CheckCircle, AlertTriangle, Info, Mail, Phone, HelpCircle,
  Download, Zap, Users, Building2, Eye, Lock, Bell,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Language } from '@/i18n/translations';

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */
interface FAQItem {
  q: string;
  a: string;
  tags?: string[];
}

interface FAQCategory {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
  items: FAQItem[];
}

interface GuideStep {
  title: string;
  description: string;
  icon: React.ElementType;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  steps: GuideStep[];
}

/* ──────────────────────────────────────────────
   i18n content
   ────────────────────────────────────────────── */
const content: Record<Language, {
  pageTitle: string;
  pageSubtitle: string;
  searchPlaceholder: string;
  faqTitle: string;
  guidesTitle: string;
  contactTitle: string;
  contactSubtitle: string;
  noResults: string;
  back: string;
  quickLinks: string;
  categories: FAQCategory[];
  guides: Guide[];
  contactEmail: string;
  contactWhatsApp: string;
  contactPhone: string;
  troubleshootTitle: string;
  stepByStep: string;
  popularTopics: string;
}> = {
  nl: {
    pageTitle: 'Hulpcentrum',
    pageSubtitle: 'Vind snel antwoorden op je vragen of neem contact op met je coördinator.',
    searchPlaceholder: 'Zoek in het hulpcentrum...',
    faqTitle: 'Veelgestelde vragen',
    guidesTitle: 'Stapsgewijze handleidingen',
    contactTitle: 'Nog hulp nodig?',
    contactSubtitle: 'Neem rechtstreeks contact op met je clubcoördinator.',
    noResults: 'Geen resultaten gevonden. Probeer een andere zoekterm.',
    back: 'Terug naar dashboard',
    quickLinks: 'Snelle links',
    contactEmail: 'E-mail sturen',
    contactWhatsApp: 'WhatsApp bericht',
    contactPhone: 'Bellen',
    troubleshootTitle: 'Problemen oplossen',
    stepByStep: 'Stap-voor-stap',
    popularTopics: 'Populaire onderwerpen',
    categories: [
      {
        id: 'tasks',
        icon: ClipboardList,
        label: 'Taken & Inschrijvingen',
        color: 'text-primary bg-primary/10',
        items: [
          { q: 'Hoe schrijf ik me in voor een taak?', a: 'Ga naar "Alle Taken" in je dashboard. Klik op een taak die je interesseert en druk op de knop "Inschrijven". Je ontvangt een bevestiging zodra je inschrijving is geaccepteerd.', tags: ['inschrijven', 'taak', 'aanmelden'] },
          { q: 'Kan ik me uitschrijven voor een taak?', a: 'Ja, ga naar "Mijn Taken" en zoek de betreffende taak. Klik op "Uitschrijven". Let op: als de taak binnen 48 uur plaatsvindt, neem dan contact op met je coördinator.', tags: ['uitschrijven', 'annuleren'] },
          { q: 'Wat betekenen de verschillende taakstatussen?', a: '"Pending" = je aanmelding wordt beoordeeld. "Approved" = je bent bevestigd. "Completed" = de taak is afgerond. "Cancelled" = de taak is geannuleerd.', tags: ['status', 'pending', 'approved'] },
          { q: 'Hoe vind ik taken bij mij in de buurt?', a: 'Gebruik de zoekfunctie bovenaan "Alle Taken". Je kunt filteren op locatie, datum en club. De kaartweergave toont taken in je directe omgeving.', tags: ['zoeken', 'locatie', 'filter'] },
          { q: 'Ik heb een training nodig voordat ik kan deelnemen. Wat nu?', a: 'Sommige taken vereisen een specifieke training. Ga naar het "Academy" tabblad om beschikbare trainingen te bekijken en af te ronden. Daarna kun je je inschrijven.', tags: ['training', 'vereiste', 'academy'] },
          { q: 'Hoe bevestig ik mijn gewerkte uren?', a: 'Na afloop van een taak ontvang je een melding om je uren te bevestigen. Ga naar "Mijn Taken", klik op de taak en vul je werkelijke uren in. Zowel jij als de club moeten de uren goedkeuren.', tags: ['uren', 'bevestigen', 'goedkeuren'] },
        ],
      },
      {
        id: 'payments',
        icon: CreditCard,
        label: 'Vergoedingen & Betalingen',
        color: 'text-accent bg-accent/10',
        items: [
          { q: 'Wanneer ontvang ik mijn vergoeding?', a: 'Vergoedingen worden verwerkt nadat zowel jij als de club de uren hebben goedgekeurd. De uitbetaling via SEPA duurt doorgaans 2-5 werkdagen.', tags: ['betaling', 'vergoeding', 'wanneer'] },
          { q: 'Hoe bekijk ik mijn betalingsgeschiedenis?', a: 'Ga naar het "Vergoedingen" tabblad in je dashboard. Hier zie je alle verwerkte, lopende en toekomstige betalingen met details per taak.', tags: ['geschiedenis', 'overzicht'] },
          { q: 'Ik heb mijn vergoeding niet ontvangen. Wat nu?', a: 'Controleer eerst of je uren zijn goedgekeurd door beide partijen. Als alles correct is en je na 5 werkdagen nog niets hebt ontvangen, neem dan contact op met je coördinator.', tags: ['niet ontvangen', 'probleem', 'contact'] },
          { q: 'Welke onkostenvergoedingen zijn mogelijk?', a: 'Volgens de Belgische vrijwilligerswet kun je een forfaitaire kostenvergoeding of een bewezen kostenvergoeding ontvangen. Het maximumbedrag wordt jaarlijks aangepast. Raadpleeg het "Compliance" tabblad voor actuele limieten.', tags: ['onkosten', 'wet', 'limiet'] },
          { q: 'Wordt mijn vergoeding belast?', a: 'Vrijwilligersvergoedingen zijn in principe belastingvrij, mits je onder de wettelijke grenzen blijft. Je kunt je limieten bijhouden in het maandelijks compliance overzicht.', tags: ['belasting', 'fiscaal', 'grens'] },
        ],
      },
      {
        id: 'account',
        icon: UserCog,
        label: 'Account & Profiel',
        color: 'text-secondary bg-secondary/10',
        items: [
          { q: 'Hoe wijzig ik mijn profielgegevens?', a: 'Klik op je avatar linksboven in het dashboard om je profiel te openen. Hier kun je je naam, e-mail, telefoonnummer en andere gegevens aanpassen.', tags: ['profiel', 'wijzigen', 'naam'] },
          { q: 'Hoe verander ik mijn wachtwoord?', a: 'Ga naar je profiel en klik op "Wachtwoord wijzigen". Je ontvangt een e-mail met een link om je wachtwoord opnieuw in te stellen.', tags: ['wachtwoord', 'wijzigen', 'reset'] },
          { q: 'Kan ik mijn taal wijzigen?', a: 'Ja! Je kunt kiezen uit Nederlands, Frans en Engels. Gebruik de taalschakelaar in de navigatie of in je profielinstellingen.', tags: ['taal', 'nederlands', 'frans', 'engels'] },
          { q: 'Hoe upload ik een profielfoto?', a: 'Open je profiel en klik op het camera-icoon op je avatar. Kies een foto van je apparaat. De maximale bestandsgrootte is 5 MB.', tags: ['foto', 'avatar', 'uploaden'] },
          { q: 'Hoe verwijder ik mijn account?', a: 'Neem contact op met je clubcoördinator om accountverwijdering aan te vragen. Al je persoonlijke gegevens worden dan definitief verwijderd.', tags: ['verwijderen', 'account', 'GDPR'] },
        ],
      },
      {
        id: 'app',
        icon: Smartphone,
        label: 'App & PWA installatie',
        color: 'text-blue-600 bg-blue-500/10',
        items: [
          { q: 'Hoe installeer ik de app op mijn telefoon?', a: 'Op iPhone: open de website in Safari, tik op het deelicoon (vierkant met pijl omhoog) en kies "Zet op beginscherm". Op Android: Chrome toont automatisch een installatiebanner, of gebruik het menu (drie puntjes) en kies "Installeren".', tags: ['installeren', 'iPhone', 'Android', 'PWA'] },
          { q: 'Waarom ontvang ik geen meldingen?', a: 'Controleer je apparaatinstellingen: ga naar Instellingen > Meldingen en zorg dat meldingen zijn ingeschakeld voor de app. Op iPhone moet je de app via Safari geïnstalleerd hebben.', tags: ['meldingen', 'notificaties', 'push'] },
          { q: 'De app werkt niet goed. Wat kan ik doen?', a: '1) Probeer de pagina te vernieuwen (trek het scherm naar beneden). 2) Sluit de app volledig en open opnieuw. 3) Wis de cache van je browser. 4) Als niets werkt, verwijder de app en installeer opnieuw.', tags: ['probleem', 'bug', 'cache', 'werkt niet'] },
          { q: 'Werkt de app offline?', a: 'Sommige functies werken offline, zoals het bekijken van eerder geladen taken. Voor acties zoals inschrijven of uren bevestigen heb je een internetverbinding nodig.', tags: ['offline', 'internet', 'verbinding'] },
          { q: 'Hoe update ik de app?', a: 'De app wordt automatisch bijgewerkt wanneer je verbonden bent met internet. Trek het scherm naar beneden om handmatig te controleren op updates.', tags: ['update', 'versie', 'bijwerken'] },
        ],
      },
      {
        id: 'safety',
        icon: Shield,
        label: 'Veiligheid & Evenementen',
        color: 'text-red-600 bg-red-500/10',
        items: [
          { q: 'Wat is de veiligheidscontrole?', a: 'Vóór elk evenement doorloop je een veiligheids-checklist voor je zone. Dit zorgt ervoor dat alle veiligheidsvoorzieningen op orde zijn voordat het evenement start.', tags: ['veiligheid', 'checklist', 'controle'] },
          { q: 'Hoe meld ik een incident?', a: 'Zodra een evenement "live" is, verschijnt de incident-meldknop in het veiligheidsdashboard. Beschrijf het incident, voeg een foto toe en het wordt direct doorgestuurd naar de coördinatoren.', tags: ['incident', 'melden', 'noodgeval'] },
          { q: 'Wat moet ik doen bij een lockdown?', a: 'Volg de instructies van je coördinator. Blijf op je toegewezen positie, begeleid bezoekers rustig en houd communicatie open via de chat. Het veiligheidsdashboard toont realtime updates.', tags: ['lockdown', 'nood', 'procedure'] },
          { q: 'Waar vind ik mijn zone-informatie?', a: 'In het "Veiligheidscontrole" tabblad kun je je toegewezen zone bekijken, inclusief kaart, checklist-items en contactpersonen.', tags: ['zone', 'kaart', 'informatie'] },
        ],
      },
      {
        id: 'monthly',
        icon: CalendarDays,
        label: 'Maandplanning',
        color: 'text-purple-600 bg-purple-500/10',
        items: [
          { q: 'Hoe werkt de maandplanning?', a: 'Clubs publiceren een maandelijks schema met beschikbare shifts. Je schrijft je in voor de hele maand en kiest welke dagen je beschikbaar bent. Na goedkeuring ontvang je een contract.', tags: ['maandplanning', 'schema', 'shifts'] },
          { q: 'Kan ik mijn beschikbaarheid wijzigen?', a: 'Ja, zolang de planning nog niet is gefinaliseerd. Open het "Maandplanning" tabblad en pas je dagen aan. Na finalisering moet je contact opnemen met je coördinator.', tags: ['beschikbaarheid', 'wijzigen', 'dagen'] },
          { q: 'Hoe teken ik mijn maandcontract?', a: 'Wanneer je maandplanning is goedgekeurd, ontvang je een digitaal contract. Teken het via de link in het "Contracten" tabblad. Dit is wettelijk vereist.', tags: ['contract', 'tekenen', 'digitaal'] },
          { q: 'Hoe werkt inchecken en uitchecken?', a: 'Op de dag van je shift toon je je QR-code aan de coördinator. Bij aankomst word je ingecheckt en bij vertrek uitgecheckt. Dit registreert je uren automatisch.', tags: ['inchecken', 'uitchecken', 'QR'] },
        ],
      },
      {
        id: 'contracts',
        icon: FileSignature,
        label: 'Contracten & Compliance',
        color: 'text-yellow-600 bg-yellow-500/10',
        items: [
          { q: 'Waarom moet ik een contract tekenen?', a: 'De Belgische vrijwilligerswet vereist een overeenkomst tussen de organisatie en de vrijwilliger. Het contract beschermt je rechten en bepaalt de voorwaarden.', tags: ['contract', 'waarom', 'wet'] },
          { q: 'Hoe teken ik een contract digitaal?', a: 'Ga naar het "Contracten" tabblad. Klik op het contract dat je wilt tekenen en volg de stappen op het scherm. Je tekent met je vinger of stylus.', tags: ['tekenen', 'digitaal', 'handtekening'] },
          { q: 'Wat is de maandelijkse compliance verklaring?', a: 'Elke maand bevestig je dat je niet over de wettelijke grenzen gaat qua uren en vergoedingen. Dit is verplicht om je vrijwilligersstatus te behouden.', tags: ['compliance', 'maandelijks', 'verklaring'] },
          { q: 'Waar vind ik mijn getekende contracten?', a: 'Alle getekende contracten zijn terug te vinden in het "Contracten" tabblad. Je kunt ze daar ook downloaden als PDF.', tags: ['downloaden', 'PDF', 'archief'] },
        ],
      },
      {
        id: 'other',
        icon: HelpCircle,
        label: 'Overig',
        color: 'text-muted-foreground bg-muted',
        items: [
          { q: 'Hoe werkt het loyaliteitsprogramma?', a: 'Door taken te voltooien verdien je punten. Deze punten kun je inwisselen voor beloningen die je club aanbiedt, zoals merchandise, tickets of ervaringen.', tags: ['loyaliteit', 'punten', 'beloningen'] },
          { q: 'Hoe gebruik ik de chat?', a: 'In het "Berichten" tabblad kun je per taak communiceren met je coördinator. Je kunt tekst, foto\'s en bestanden delen.', tags: ['chat', 'berichten', 'communicatie'] },
          { q: 'Wat is de Academy?', a: 'De Academy biedt trainingen en cursussen aan die je kunt volgen. Na succesvolle afronding ontvang je een certificaat dat je kunt downloaden.', tags: ['academy', 'training', 'certificaat'] },
          { q: 'Hoe word ik lid van meerdere clubs?', a: 'Ga naar "Club Zoeken" in het menu. Zoek een club en klik op "Volgen" of accepteer een uitnodiging. Je kunt bij meerdere clubs tegelijk vrijwilliger zijn.', tags: ['clubs', 'meerdere', 'lid worden'] },
          { q: 'Hoe download ik mijn ticket?', a: 'Ga naar het "Tickets" tabblad. Klik op een ticket om de QR-code te tonen. Je kunt het ticket ook downloaden als afbeelding of toevoegen aan je Apple Wallet.', tags: ['ticket', 'downloaden', 'QR'] },
        ],
      },
    ],
    guides: [
      {
        id: 'first-task',
        title: 'Je eerste taak voltooien',
        description: 'Van inschrijving tot urenbevestiging in 5 stappen.',
        icon: CheckCircle,
        steps: [
          { title: 'Zoek een taak', description: 'Ga naar "Alle Taken" en filter op je voorkeuren.', icon: Search },
          { title: 'Schrijf je in', description: 'Klik op de taak en druk op "Inschrijven".', icon: ClipboardList },
          { title: 'Ontvang bevestiging', description: 'Wacht op goedkeuring van de coördinator.', icon: Bell },
          { title: 'Voer de taak uit', description: 'Verschijn op de afgesproken locatie en tijd.', icon: CheckCircle },
          { title: 'Bevestig je uren', description: 'Na afloop bevestig je je gewerkte uren.', icon: CreditCard },
        ],
      },
      {
        id: 'install-pwa',
        title: 'De app installeren',
        description: 'Installeer de app op je telefoon in 3 stappen.',
        icon: Download,
        steps: [
          { title: 'Open in Safari/Chrome', description: 'Ga naar de website in je standaard browser.', icon: ExternalLink },
          { title: 'Deelmenu openen', description: 'iPhone: tik op het deelicoon. Android: tik op de drie puntjes.', icon: Smartphone },
          { title: 'Installeren', description: 'Kies "Zet op beginscherm" (iOS) of "Installeren" (Android).', icon: Download },
        ],
      },
      {
        id: 'monthly-planning',
        title: 'Maandplanning gebruiken',
        description: 'Meld je aan voor een maandschema en beheer je shifts.',
        icon: CalendarDays,
        steps: [
          { title: 'Open Maandplanning', description: 'Ga naar het "Maandplanning" tabblad.', icon: CalendarDays },
          { title: 'Kies je dagen', description: 'Selecteer de dagen waarop je beschikbaar bent.', icon: CheckCircle },
          { title: 'Teken je contract', description: 'Na goedkeuring ontvang je een digitaal contract.', icon: FileSignature },
          { title: 'Check in & uit', description: 'Toon je QR-code bij aankomst en vertrek.', icon: Zap },
        ],
      },
      {
        id: 'safety-check',
        title: 'Veiligheidscontrole uitvoeren',
        description: 'Doorloop de veiligheidschecklist vóór het evenement.',
        icon: Shield,
        steps: [
          { title: 'Open Veiligheidscontrole', description: 'Ga naar het tabblad in je dashboard.', icon: Shield },
          { title: 'Selecteer je zone', description: 'Kies de zone die aan jou is toegewezen.', icon: Eye },
          { title: 'Loop de checklist af', description: 'Bevestig elk item in de veiligheidschecklist.', icon: CheckCircle },
          { title: 'Rapporteer problemen', description: 'Meld eventuele problemen direct aan de coördinator.', icon: AlertTriangle },
        ],
      },
    ],
  },
  fr: {
    pageTitle: 'Centre d\'aide',
    pageSubtitle: 'Trouvez rapidement des réponses à vos questions ou contactez votre coordinateur.',
    searchPlaceholder: 'Rechercher dans le centre d\'aide...',
    faqTitle: 'Questions fréquentes',
    guidesTitle: 'Guides pas à pas',
    contactTitle: 'Besoin d\'aide supplémentaire?',
    contactSubtitle: 'Contactez directement votre coordinateur de club.',
    noResults: 'Aucun résultat trouvé. Essayez un autre terme.',
    back: 'Retour au tableau de bord',
    quickLinks: 'Liens rapides',
    contactEmail: 'Envoyer un e-mail',
    contactWhatsApp: 'Message WhatsApp',
    contactPhone: 'Appeler',
    troubleshootTitle: 'Résolution de problèmes',
    stepByStep: 'Pas à pas',
    popularTopics: 'Sujets populaires',
    categories: [
      {
        id: 'tasks', icon: ClipboardList, label: 'Tâches & Inscriptions', color: 'text-primary bg-primary/10',
        items: [
          { q: 'Comment m\'inscrire à une tâche?', a: 'Allez dans "Toutes les tâches", cliquez sur une tâche et appuyez sur "S\'inscrire".' },
          { q: 'Puis-je annuler mon inscription?', a: 'Oui, dans "Mes tâches", cliquez sur "Se désinscrire". Si la tâche est dans moins de 48h, contactez votre coordinateur.' },
          { q: 'Comment confirmer mes heures?', a: 'Après la tâche, allez dans "Mes tâches", ouvrez la tâche et renseignez vos heures réelles.' },
        ],
      },
      {
        id: 'payments', icon: CreditCard, label: 'Remboursements', color: 'text-accent bg-accent/10',
        items: [
          { q: 'Quand vais-je recevoir mon remboursement?', a: 'Les remboursements sont traités après validation des heures par les deux parties. Le virement SEPA prend 2-5 jours.' },
          { q: 'Je n\'ai pas reçu mon paiement', a: 'Vérifiez d\'abord que vos heures ont été approuvées. Sinon, contactez votre coordinateur.' },
        ],
      },
      {
        id: 'account', icon: UserCog, label: 'Compte & Profil', color: 'text-secondary bg-secondary/10',
        items: [
          { q: 'Comment modifier mon profil?', a: 'Cliquez sur votre avatar en haut à gauche pour ouvrir votre profil et modifier vos informations.' },
          { q: 'Comment changer la langue?', a: 'Utilisez le sélecteur de langue dans la navigation ou dans vos paramètres.' },
        ],
      },
      {
        id: 'app', icon: Smartphone, label: 'App & Installation', color: 'text-blue-600 bg-blue-500/10',
        items: [
          { q: 'Comment installer l\'app?', a: 'iPhone: ouvrez dans Safari, touchez le bouton de partage et choisissez "Sur l\'écran d\'accueil". Android: utilisez le menu Chrome et choisissez "Installer".' },
          { q: 'Je ne reçois pas de notifications', a: 'Vérifiez les paramètres de notifications de votre appareil et assurez-vous qu\'elles sont activées.' },
        ],
      },
    ],
    guides: [
      {
        id: 'first-task', title: 'Compléter votre première tâche', description: 'De l\'inscription à la confirmation en 5 étapes.', icon: CheckCircle,
        steps: [
          { title: 'Trouvez une tâche', description: 'Allez dans "Toutes les tâches".', icon: Search },
          { title: 'Inscrivez-vous', description: 'Cliquez et appuyez sur "S\'inscrire".', icon: ClipboardList },
          { title: 'Attendez la confirmation', description: 'Le coordinateur approuve votre inscription.', icon: Bell },
          { title: 'Effectuez la tâche', description: 'Présentez-vous au lieu et à l\'heure convenus.', icon: CheckCircle },
          { title: 'Confirmez vos heures', description: 'Renseignez vos heures travaillées.', icon: CreditCard },
        ],
      },
      {
        id: 'install-pwa', title: 'Installer l\'application', description: 'Installez l\'app en 3 étapes.', icon: Download,
        steps: [
          { title: 'Ouvrir dans Safari/Chrome', description: 'Accédez au site dans votre navigateur.', icon: ExternalLink },
          { title: 'Menu de partage', description: 'iPhone: bouton de partage. Android: trois points.', icon: Smartphone },
          { title: 'Installer', description: 'Choisissez "Sur l\'écran d\'accueil" ou "Installer".', icon: Download },
        ],
      },
    ],
  },
  en: {
    pageTitle: 'Help Center',
    pageSubtitle: 'Quickly find answers to your questions or contact your coordinator.',
    searchPlaceholder: 'Search the help center...',
    faqTitle: 'Frequently Asked Questions',
    guidesTitle: 'Step-by-Step Guides',
    contactTitle: 'Still need help?',
    contactSubtitle: 'Contact your club coordinator directly.',
    noResults: 'No results found. Try a different search term.',
    back: 'Back to dashboard',
    quickLinks: 'Quick links',
    contactEmail: 'Send email',
    contactWhatsApp: 'WhatsApp message',
    contactPhone: 'Call',
    troubleshootTitle: 'Troubleshooting',
    stepByStep: 'Step by step',
    popularTopics: 'Popular topics',
    categories: [
      {
        id: 'tasks', icon: ClipboardList, label: 'Tasks & Signups', color: 'text-primary bg-primary/10',
        items: [
          { q: 'How do I sign up for a task?', a: 'Go to "All Tasks" in your dashboard. Click on a task and press "Sign Up". You\'ll receive a confirmation once accepted.' },
          { q: 'Can I cancel my signup?', a: 'Yes, go to "My Tasks" and click "Unsubscribe". If the task is within 48 hours, contact your coordinator.' },
          { q: 'How do I confirm my hours?', a: 'After completing a task, go to "My Tasks", open the task and enter your actual hours worked.' },
        ],
      },
      {
        id: 'payments', icon: CreditCard, label: 'Payments & Reimbursements', color: 'text-accent bg-accent/10',
        items: [
          { q: 'When will I receive my payment?', a: 'Payments are processed after both you and the club approve the hours. SEPA transfers take 2-5 business days.' },
          { q: 'I haven\'t received my payment', a: 'First check if your hours have been approved by both parties. If everything looks correct, contact your coordinator.' },
        ],
      },
      {
        id: 'account', icon: UserCog, label: 'Account & Profile', color: 'text-secondary bg-secondary/10',
        items: [
          { q: 'How do I edit my profile?', a: 'Click your avatar in the top left of the dashboard to open your profile and update your information.' },
          { q: 'How do I change the language?', a: 'Use the language switcher in the navigation or in your profile settings.' },
        ],
      },
      {
        id: 'app', icon: Smartphone, label: 'App & PWA Installation', color: 'text-blue-600 bg-blue-500/10',
        items: [
          { q: 'How do I install the app?', a: 'iPhone: open in Safari, tap the share button and choose "Add to Home Screen". Android: Chrome shows an install banner, or use the menu and choose "Install".' },
          { q: 'I\'m not receiving notifications', a: 'Check your device settings: go to Settings > Notifications and make sure notifications are enabled for the app.' },
        ],
      },
    ],
    guides: [
      {
        id: 'first-task', title: 'Complete your first task', description: 'From signup to hour confirmation in 5 steps.', icon: CheckCircle,
        steps: [
          { title: 'Find a task', description: 'Go to "All Tasks" and filter by your preferences.', icon: Search },
          { title: 'Sign up', description: 'Click on the task and press "Sign Up".', icon: ClipboardList },
          { title: 'Get confirmed', description: 'Wait for coordinator approval.', icon: Bell },
          { title: 'Do the task', description: 'Show up at the agreed location and time.', icon: CheckCircle },
          { title: 'Confirm hours', description: 'After completion, confirm your hours worked.', icon: CreditCard },
        ],
      },
      {
        id: 'install-pwa', title: 'Install the app', description: 'Install the app on your phone in 3 steps.', icon: Download,
        steps: [
          { title: 'Open in Safari/Chrome', description: 'Navigate to the website in your default browser.', icon: ExternalLink },
          { title: 'Open share menu', description: 'iPhone: tap share icon. Android: tap three dots.', icon: Smartphone },
          { title: 'Install', description: 'Choose "Add to Home Screen" (iOS) or "Install" (Android).', icon: Download },
        ],
      },
    ],
  },
};

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

const FAQAccordionItem = ({ item, index }: { item: FAQItem; index: number }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 rounded-xl transition-colors"
      >
        <div className="mt-0.5 shrink-0">
          {open ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
        <span className={`text-sm font-medium ${open ? 'text-primary' : 'text-foreground'}`}>{item.q}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-11 pr-4 pb-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const GuideCard = ({ guide, stepLabel }: { guide: Guide; stepLabel: string }) => {
  const [open, setOpen] = useState(false);
  const Icon = guide.icon;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-5 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-sm">{guide.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{guide.description}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">{guide.steps.length} {stepLabel}</Badge>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <Separator className="mb-4" />
              <div className="space-y-3">
                {guide.steps.map((step, i) => {
                  const StepIcon = step.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        {i < guide.steps.length - 1 && (
                          <div className="w-px h-4 bg-border mt-1" />
                        )}
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Main Page
   ────────────────────────────────────────────── */
const VolunteerHelp = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const c = content[language];

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter FAQ items based on search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return c.categories;
    const term = search.toLowerCase();
    return c.categories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(
          item =>
            item.q.toLowerCase().includes(term) ||
            item.a.toLowerCase().includes(term) ||
            item.tags?.some(t => t.toLowerCase().includes(term))
        ),
      }))
      .filter(cat => cat.items.length > 0);
  }, [search, c.categories]);

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);

  // Popular topics (first 2 items from first 3 categories)
  const popularItems = useMemo(() => {
    return c.categories.slice(0, 3).flatMap(cat =>
      cat.items.slice(0, 2).map(item => ({ ...item, catLabel: cat.label, catColor: cat.color, catIcon: cat.icon }))
    );
  }, [c.categories]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border pt-safe-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <LifeBuoy className="w-5 h-5 text-primary shrink-0" />
            <h1 className="font-heading font-bold text-foreground text-lg truncate">{c.pageTitle}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-safe-bottom">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <LifeBuoy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">{c.pageTitle}</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">{c.pageSubtitle}</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="pl-12 h-12 rounded-2xl bg-card border-border text-base shadow-sm"
          />
          {search && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {totalResults} {language === 'nl' ? 'resultaten' : language === 'fr' ? 'résultats' : 'results'}
            </span>
          )}
        </motion.div>

        {/* Popular topics (only when not searching) */}
        {!search && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              {c.popularTopics}
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularItems.map((item, i) => {
                const Icon = item.catIcon;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSearch(item.q.split(' ').slice(0, 3).join(' '));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate max-w-[180px]">{item.q}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Category filters (only when not searching) */}
        {!search && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {c.categories.map(cat => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(isActive ? null : cat.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center ${
                      isActive
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-foreground leading-tight">{cat.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{cat.items.length}</Badge>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* FAQ Section */}
        <div>
          <h3 className="text-base font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {c.faqTitle}
          </h3>

          {filteredCategories.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{c.noResults}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCategories
                .filter(cat => !activeCategory || cat.id === activeCategory)
                .map(cat => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">{cat.label}</h4>
                        <Badge variant="outline" className="ml-auto text-[10px]">{cat.items.length}</Badge>
                      </div>
                      <div className="divide-y divide-border/50">
                        {cat.items.map((item, i) => (
                          <FAQAccordionItem key={i} item={item} index={i} />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Guides Section */}
        <div>
          <h3 className="text-base font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {c.guidesTitle}
          </h3>
          <div className="space-y-3">
            {c.guides.map(guide => (
              <GuideCard
                key={guide.id}
                guide={guide}
                stepLabel={language === 'nl' ? 'stappen' : language === 'fr' ? 'étapes' : 'steps'}
              />
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6 text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-6 h-6 text-secondary" />
          </div>
          <h3 className="font-heading font-bold text-foreground text-lg">{c.contactTitle}</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">{c.contactSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open('mailto:coordinator@example.com')}
            >
              <Mail className="w-4 h-4" />
              {c.contactEmail}
            </Button>
            <Button
              className="gap-2 bg-[hsl(145,55%,42%)] hover:bg-[hsl(145,55%,36%)] text-white"
              onClick={() => window.open('https://wa.me/32000000000', '_blank')}
            >
              <MessageCircle className="w-4 h-4" />
              {c.contactWhatsApp}
            </Button>
          </div>
        </motion.div>

        {/* Quick links to dashboard */}
        <div className="flex justify-center">
          <Button variant="ghost" className="text-muted-foreground gap-2" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
            {c.back}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default VolunteerHelp;
