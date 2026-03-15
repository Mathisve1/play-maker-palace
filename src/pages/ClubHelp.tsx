import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, ChevronRight, LifeBuoy, ClipboardList, CreditCard,
  Shield, CalendarDays, FileSignature, Award, MessageCircle, ArrowLeft,
  BookOpen, CheckCircle, Info, Mail, HelpCircle, Zap, Users, Building2,
  MapPin, Eye, Lock, Bell, Megaphone, GraduationCap, AlertTriangle,
  Receipt, Scale, Briefcase, Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Language } from '@/i18n/translations';
import SEOHead from '@/components/SEOHead';

/* ── Types ── */
interface FAQItem { q: string; a: string; tags?: string[] }
interface FAQCategory { id: string; icon: React.ElementType; label: string; color: string; items: FAQItem[] }
interface GuideStep { title: string; description: string; icon: React.ElementType }
interface Guide { id: string; title: string; description: string; icon: React.ElementType; steps: GuideStep[] }

/* ── i18n ── */
const content: Record<Language, {
  pageTitle: string; pageSubtitle: string; searchPlaceholder: string;
  faqTitle: string; guidesTitle: string; contactTitle: string; contactSubtitle: string;
  noResults: string; back: string; popularTopics: string;
  categories: FAQCategory[]; guides: Guide[];
}> = {
  nl: {
    pageTitle: 'Hulpcentrum voor clubs',
    pageSubtitle: 'Vind snel antwoorden op al je vragen als clubbeheerder.',
    searchPlaceholder: 'Zoek in het hulpcentrum...',
    faqTitle: 'Veelgestelde vragen',
    guidesTitle: 'Stapsgewijze handleidingen',
    contactTitle: 'Nog hulp nodig?',
    contactSubtitle: 'Neem contact op met ons team of bekijk de community.',
    noResults: 'Geen resultaten gevonden. Probeer een andere zoekterm.',
    back: 'Terug naar dashboard',
    popularTopics: 'Populaire onderwerpen',
    categories: [
      {
        id: 'getting-started', icon: Building2, label: 'Aan de slag', color: 'bg-primary/10 text-primary',
        items: [
          { q: 'Hoe maak ik mijn eerste evenement aan?', a: 'Ga naar "Events" in het menu en klik op "+ Nieuw evenement". Vul de naam, datum en locatie in. Daarna kun je taken aanmaken voor het evenement.', tags: ['event', 'start'] },
          { q: 'Hoe nodig ik vrijwilligers uit?', a: 'Ga naar "Leden" onderaan de zijbalk en klik op "Uitnodigen". Stuur een uitnodigingslink via e-mail. De vrijwilliger kan zich registreren en direct taken zien.', tags: ['uitnodiging', 'invite', 'leden'] },
          { q: 'Hoe stuur ik een seizoenscontract?', a: 'Ga naar "Contracten" → "Seizoenscontracten" en kies een template. Selecteer de vrijwilliger(s) en klik op "Verstuur contract". Ze ontvangen een e-mail met ondertekeningslink.', tags: ['contract', 'seizoen'] },
          { q: 'Hoe stel ik mijn club in na registratie?', a: 'Klik op het tandwiel-icoon in de sidebar footer om je clubinstellingen te openen. Voeg je logo, beschrijving, sport en locatie toe.', tags: ['instellingen', 'setup'] },
        ],
      },
      {
        id: 'billing', icon: CreditCard, label: 'Facturatie & contracten', color: 'bg-accent/20 text-accent-foreground',
        items: [
          { q: 'Wanneer betaal ik als club?', a: 'De eerste 2 contracttypes zijn gratis, onbeperkt. Pas vanaf het 3e contracttype betaal je €15 per vrijwilliger per seizoen.', tags: ['prijs', 'kosten'] },
          { q: 'Wat zijn de 5 contracttypes?', a: 'De 5 types zijn: Steward, Bar & Catering, Terrein & Materiaal, Admin & Ticketing, en Event Support. Je kiest er 2 gratis.', tags: ['types', 'steward', 'bar', 'catering'] },
          { q: 'Hoe werken de 2 gratis contracttypes?', a: 'Bij de eerste 2 unieke types die je gebruikt, betaal je niets — ongeacht hoeveel vrijwilligers. Vanaf type 3 start facturatie per vrijwilliger.', tags: ['gratis', 'free', 'limit'] },
          { q: 'Waar zie ik mijn factuur?', a: 'Ga naar "Facturatie" in het beheer-menu. Je ziet daar je huidige gebruik, openstaande facturen en facturatiegeschiedenis.', tags: ['factuur', 'invoice'] },
          { q: 'Hoe worden SEPA-uitbetalingen verwerkt?', a: 'Ga naar "Vergoedingen" → "SEPA-batches". Selecteer de uit te betalen vrijwilligers en genereer een SEPA XML-bestand dat je kunt uploaden in je bank.', tags: ['sepa', 'uitbetaling', 'bank'] },
        ],
      },
      {
        id: 'compliance', icon: Scale, label: 'Compliance (Wet 3 juli 2005)', color: 'bg-destructive/10 text-destructive',
        items: [
          { q: 'Wat is de jaargrens voor vrijwilligers?', a: 'De Belgische wet voor het vrijwilligerswerk (3 juli 2005) stelt een jaarlijks plafond voor kostenvergoedingen. Het systeem houdt dit automatisch bij per vrijwilliger.', tags: ['wet', 'grens', 'limiet', 'belgisch'] },
          { q: 'Wat doet het systeem als iemand het limiet bereikt?', a: 'Het systeem markeert de vrijwilliger als "compliance geblokkeerd". Ze kunnen zich niet meer inschrijven voor taken totdat de beheerder dit opheft of het nieuwe jaar begint.', tags: ['blokkade', 'blocked'] },
          { q: 'Hoe stuur ik een waarschuwing naar een vrijwilliger?', a: 'Bij 80% van het limiet stuurt het systeem automatisch een notificatie. Je kunt ook handmatig een bericht sturen via het berichten-systeem.', tags: ['waarschuwing', 'notificatie'] },
          { q: 'Waar vind ik de compliance-rapporten?', a: 'Ga naar "Rapportage" → "Compliance" tab. Daar zie je een overzicht van alle vrijwilligers met hun status, vergoedingen en naleving.', tags: ['rapport', 'overzicht'] },
        ],
      },
      {
        id: 'events-planning', icon: CalendarDays, label: 'Evenementen & planning', color: 'bg-secondary/20 text-secondary-foreground',
        items: [
          { q: 'Hoe maak ik zones aan?', a: 'Open een taak vanuit de planningsweergave en klik op "Zones beheren". Voeg zones toe met naam, kleur en capaciteit. Sleep vervolgens vrijwilligers naar de zones.', tags: ['zones', 'drag', 'drop'] },
          { q: 'Hoe wijs ik vrijwilligers toe aan taken?', a: 'Ga naar de taak in het planningsoverzicht. Je ziet een lijst van ingeschreven vrijwilligers. Klik op "Toewijzen" naast de naam om hun status te wijzigen.', tags: ['toewijzen', 'assign'] },
          { q: 'Hoe gebruik ik de briefingbuilder?', a: 'Ga naar een taak → "Briefing" tab. Maak groepen aan (bv. per team), voeg blokken toe (tekst, checklist, route, contact) en stuur de briefing naar de vrijwilligers.', tags: ['briefing', 'builder'] },
          { q: 'Hoe plan ik taken over meerdere maanden?', a: 'Gebruik de maandplanning ("Maandoverzicht") om taken te spreiden over een seizoen. Vrijwilligers kunnen zich per dag beschikbaar stellen.', tags: ['maand', 'planning', 'seizoen'] },
        ],
      },
      {
        id: 'academy', icon: GraduationCap, label: 'Academy & certificaten', color: 'bg-primary/10 text-primary',
        items: [
          { q: 'Hoe maak ik een training aan?', a: 'Ga naar "Academie" → "+ Nieuwe training". Voeg modules toe met tekst, video of quiz. Publiceer de training wanneer je klaar bent.', tags: ['training', 'aanmaken'] },
          { q: 'Hoe stel ik verplichte trainingen in?', a: 'In je clubinstellingen kun je trainingen als "vereist" markeren. Vrijwilligers moeten deze afronden voordat ze zich kunnen inschrijven voor taken die dit vereisen.', tags: ['verplicht', 'required'] },
          { q: 'Hoe werken certificaten?', a: 'Na het voltooien van een training kan een certificaat worden gegenereerd. Je kunt het certificaatontwerp aanpassen met eigen tekst, kleuren en handtekening.', tags: ['certificaat', 'ontwerp'] },
        ],
      },
      {
        id: 'safety', icon: Shield, label: 'Veiligheid', color: 'bg-destructive/10 text-destructive',
        items: [
          { q: 'Hoe maak ik een veiligheidsplan aan?', a: 'Ga naar "Safety" → kies een evenement → "Safety hub". Doorloop de pre-event checklist, wijs veiligheidsteams toe en stel incidenttypes in.', tags: ['veiligheid', 'plan', 'safety'] },
          { q: 'Hoe registreer ik een incident?', a: 'In de live Control Room kun je het incidenttype selecteren en locatie aanduiden op de kaart. Het incident wordt automatisch gelogd met tijdstempel.', tags: ['incident', 'registreren'] },
          { q: 'Wie krijgt meldingen bij een incident?', a: 'Het veiligheidsteam (toegewezen leiders) krijgt automatisch een pushmelding. Bij urgente incidenten kun je een alarmmelding sturen naar ALLE vrijwilligers.', tags: ['melding', 'push', 'alarm'] },
          { q: 'Hoe gebruik ik de sluitingsprocedure?', a: 'Na afloop van een evenement start je de sluitingsprocedure via "Sluiting". Vrijwilligers checken hun taken af, met optionele foto\'s en notities.', tags: ['sluiting', 'closing'] },
        ],
      },
    ],
    guides: [
      {
        id: 'first-event', title: 'Je eerste evenement opzetten', description: 'Van aanmaken tot live gaan in 4 stappen.', icon: CalendarDays,
        steps: [
          { title: 'Evenement aanmaken', description: 'Ga naar Events → + Nieuw evenement. Vul naam, datum en locatie in.', icon: CalendarDays },
          { title: 'Taken toevoegen', description: 'Maak taken aan per rol (bv. steward, bar) met tijdsblokken en locatie.', icon: ClipboardList },
          { title: 'Vrijwilligers uitnodigen', description: 'Deel de uitnodigingslink of stuur via e-mail. Vrijwilligers schrijven zich in.', icon: Users },
          { title: 'Briefing versturen', description: 'Maak een briefing aan met de builder en stuur deze naar alle deelnemers.', icon: Megaphone },
        ],
      },
      {
        id: 'season-contract', title: 'Seizoenscontracten beheren', description: 'Contracten aanmaken, versturen en opvolgen.', icon: FileSignature,
        steps: [
          { title: 'Template kiezen', description: 'Ga naar Contracten → Seizoenscontracten en kies het contracttype.', icon: FileSignature },
          { title: 'Vrijwilligers selecteren', description: 'Selecteer individuele of meerdere vrijwilligers voor het contract.', icon: Users },
          { title: 'Contract versturen', description: 'Klik op "Verstuur". De vrijwilliger krijgt een e-mail met ondertekeningslink.', icon: Mail },
          { title: 'Status opvolgen', description: 'Volg de ondertekenstatus op via het contractoverzicht.', icon: Eye },
        ],
      },
      {
        id: 'safety-plan', title: 'Veiligheidsplan activeren', description: 'Safety hub configureren voor je evenement.', icon: Shield,
        steps: [
          { title: 'Safety hub openen', description: 'Ga naar Safety → kies je evenement → Safety hub.', icon: Shield },
          { title: 'Checklist doorlopen', description: 'Vul de pre-event checklist in en wijs veiligheidsteams toe.', icon: CheckCircle },
          { title: 'Go live', description: 'Klik op "Go Live" om de Control Room te activeren.', icon: Zap },
          { title: 'Incidenten monitoren', description: 'Monitor incidenten real-time en stuur meldingen indien nodig.', icon: AlertTriangle },
        ],
      },
    ],
  },
  fr: {
    pageTitle: 'Centre d\'aide pour clubs',
    pageSubtitle: 'Trouvez rapidement des réponses à vos questions en tant que gestionnaire de club.',
    searchPlaceholder: 'Rechercher dans le centre d\'aide...',
    faqTitle: 'Questions fréquentes',
    guidesTitle: 'Guides pas à pas',
    contactTitle: 'Besoin d\'aide ?',
    contactSubtitle: 'Contactez notre équipe ou consultez la communauté.',
    noResults: 'Aucun résultat trouvé. Essayez un autre terme.',
    back: 'Retour au tableau de bord',
    popularTopics: 'Sujets populaires',
    categories: [
      {
        id: 'getting-started', icon: Building2, label: 'Démarrer', color: 'bg-primary/10 text-primary',
        items: [
          { q: 'Comment créer mon premier événement ?', a: 'Allez dans "Événements" et cliquez sur "+ Nouvel événement". Remplissez le nom, la date et le lieu. Ensuite, créez des tâches pour l\'événement.', tags: ['événement', 'début'] },
          { q: 'Comment inviter des bénévoles ?', a: 'Allez dans "Membres" en bas de la barre latérale et cliquez sur "Inviter". Envoyez un lien d\'invitation par e-mail.', tags: ['invitation', 'membres'] },
          { q: 'Comment envoyer un contrat de saison ?', a: 'Allez dans "Contrats" → "Contrats de saison" et choisissez un modèle. Sélectionnez les bénévoles et cliquez sur "Envoyer".', tags: ['contrat', 'saison'] },
          { q: 'Comment configurer mon club après l\'inscription ?', a: 'Cliquez sur l\'icône d\'engrenage dans le pied de page de la barre latérale pour ouvrir les paramètres du club.', tags: ['paramètres', 'configuration'] },
        ],
      },
      {
        id: 'billing', icon: CreditCard, label: 'Facturation & contrats', color: 'bg-accent/20 text-accent-foreground',
        items: [
          { q: 'Quand dois-je payer en tant que club ?', a: 'Les 2 premiers types de contrat sont gratuits, sans limite. À partir du 3e type, vous payez 15€ par bénévole par saison.', tags: ['prix', 'coût'] },
          { q: 'Quels sont les 5 types de contrat ?', a: 'Les 5 types sont : Steward, Bar & Catering, Terrain & Matériel, Admin & Billetterie, et Support événementiel.', tags: ['types', 'steward'] },
          { q: 'Comment fonctionnent les 2 types gratuits ?', a: 'Pour les 2 premiers types uniques utilisés, aucun frais — quel que soit le nombre de bénévoles. La facturation démarre au 3e type.', tags: ['gratuit', 'limite'] },
          { q: 'Où voir ma facture ?', a: 'Allez dans "Facturation" dans le menu de gestion. Vous y trouvez votre utilisation actuelle et l\'historique des factures.', tags: ['facture'] },
          { q: 'Comment sont traités les paiements SEPA ?', a: 'Allez dans "Indemnités" → "Lots SEPA". Sélectionnez les bénévoles et générez un fichier SEPA XML pour votre banque.', tags: ['sepa', 'paiement'] },
        ],
      },
      {
        id: 'compliance', icon: Scale, label: 'Conformité (Loi 3 juil. 2005)', color: 'bg-destructive/10 text-destructive',
        items: [
          { q: 'Quel est le plafond annuel pour les bénévoles ?', a: 'La loi belge sur le volontariat (3 juillet 2005) fixe un plafond annuel pour les indemnités. Le système le suit automatiquement.', tags: ['loi', 'plafond'] },
          { q: 'Que fait le système quand la limite est atteinte ?', a: 'Le système marque le bénévole comme "bloqué conformité". Il ne peut plus s\'inscrire à des tâches jusqu\'à la levée du blocage.', tags: ['blocage'] },
          { q: 'Comment envoyer un avertissement ?', a: 'À 80% de la limite, le système envoie automatiquement une notification. Vous pouvez aussi envoyer un message manuellement.', tags: ['avertissement'] },
          { q: 'Où trouver les rapports de conformité ?', a: 'Allez dans "Rapports" → onglet "Conformité" pour un aperçu de tous les bénévoles.', tags: ['rapport'] },
        ],
      },
      {
        id: 'events-planning', icon: CalendarDays, label: 'Événements & planification', color: 'bg-secondary/20 text-secondary-foreground',
        items: [
          { q: 'Comment créer des zones ?', a: 'Ouvrez une tâche dans la vue de planification et cliquez sur "Gérer les zones". Ajoutez des zones avec nom, couleur et capacité.', tags: ['zones'] },
          { q: 'Comment affecter des bénévoles aux tâches ?', a: 'Allez dans la tâche dans l\'aperçu de planification. Cliquez sur "Affecter" à côté du nom du bénévole.', tags: ['affecter'] },
          { q: 'Comment utiliser le constructeur de briefing ?', a: 'Allez dans une tâche → onglet "Briefing". Créez des groupes, ajoutez des blocs et envoyez le briefing aux bénévoles.', tags: ['briefing'] },
          { q: 'Comment planifier sur plusieurs mois ?', a: 'Utilisez la planification mensuelle pour répartir les tâches sur une saison. Les bénévoles indiquent leur disponibilité.', tags: ['mensuel', 'planification'] },
        ],
      },
      {
        id: 'academy', icon: GraduationCap, label: 'Académie & certificats', color: 'bg-primary/10 text-primary',
        items: [
          { q: 'Comment créer une formation ?', a: 'Allez dans "Académie" → "+ Nouvelle formation". Ajoutez des modules avec texte, vidéo ou quiz.', tags: ['formation'] },
          { q: 'Comment définir des formations obligatoires ?', a: 'Dans les paramètres du club, marquez les formations comme "requises". Les bénévoles doivent les compléter avant de s\'inscrire.', tags: ['obligatoire'] },
          { q: 'Comment fonctionnent les certificats ?', a: 'Après avoir terminé une formation, un certificat peut être généré avec un design personnalisable.', tags: ['certificat'] },
        ],
      },
      {
        id: 'safety', icon: Shield, label: 'Sécurité', color: 'bg-destructive/10 text-destructive',
        items: [
          { q: 'Comment créer un plan de sécurité ?', a: 'Allez dans "Sécurité" → choisissez un événement → "Hub sécurité". Parcourez la checklist et affectez des équipes.', tags: ['sécurité', 'plan'] },
          { q: 'Comment enregistrer un incident ?', a: 'Dans la salle de contrôle en direct, sélectionnez le type d\'incident et marquez la position sur la carte.', tags: ['incident'] },
          { q: 'Qui reçoit les notifications ?', a: 'L\'équipe de sécurité reçoit automatiquement une notification push. Pour les incidents urgents, vous pouvez envoyer une alerte à TOUS les bénévoles.', tags: ['notification', 'alerte'] },
          { q: 'Comment utiliser la procédure de clôture ?', a: 'Après l\'événement, démarrez la procédure de clôture via "Clôture". Les bénévoles cochent leurs tâches avec photos et notes.', tags: ['clôture'] },
        ],
      },
    ],
    guides: [
      {
        id: 'first-event', title: 'Configurer votre premier événement', description: 'De la création au lancement en 4 étapes.', icon: CalendarDays,
        steps: [
          { title: 'Créer l\'événement', description: 'Événements → + Nouvel événement. Remplissez nom, date et lieu.', icon: CalendarDays },
          { title: 'Ajouter des tâches', description: 'Créez des tâches par rôle (steward, bar) avec horaires et lieu.', icon: ClipboardList },
          { title: 'Inviter des bénévoles', description: 'Partagez le lien d\'invitation ou envoyez par e-mail.', icon: Users },
          { title: 'Envoyer le briefing', description: 'Créez un briefing avec le constructeur et envoyez-le aux participants.', icon: Megaphone },
        ],
      },
      {
        id: 'season-contract', title: 'Gérer les contrats de saison', description: 'Créer, envoyer et suivre les contrats.', icon: FileSignature,
        steps: [
          { title: 'Choisir un modèle', description: 'Contrats → Contrats de saison et choisissez le type.', icon: FileSignature },
          { title: 'Sélectionner les bénévoles', description: 'Sélectionnez un ou plusieurs bénévoles pour le contrat.', icon: Users },
          { title: 'Envoyer le contrat', description: 'Cliquez sur "Envoyer". Le bénévole reçoit un e-mail avec un lien de signature.', icon: Mail },
          { title: 'Suivre le statut', description: 'Suivez le statut de signature dans l\'aperçu des contrats.', icon: Eye },
        ],
      },
      {
        id: 'safety-plan', title: 'Activer le plan de sécurité', description: 'Configurer le hub sécurité pour votre événement.', icon: Shield,
        steps: [
          { title: 'Ouvrir le hub sécurité', description: 'Sécurité → choisissez votre événement → Hub sécurité.', icon: Shield },
          { title: 'Parcourir la checklist', description: 'Remplissez la checklist pré-événement et affectez des équipes.', icon: CheckCircle },
          { title: 'Passer en direct', description: 'Cliquez sur "Go Live" pour activer la salle de contrôle.', icon: Zap },
          { title: 'Surveiller les incidents', description: 'Surveillez les incidents en temps réel et envoyez des alertes si nécessaire.', icon: AlertTriangle },
        ],
      },
    ],
  },
  en: {
    pageTitle: 'Help Center for Clubs',
    pageSubtitle: 'Quickly find answers to your questions as a club manager.',
    searchPlaceholder: 'Search the help center...',
    faqTitle: 'Frequently Asked Questions',
    guidesTitle: 'Step-by-step guides',
    contactTitle: 'Still need help?',
    contactSubtitle: 'Contact our team or visit the community.',
    noResults: 'No results found. Try a different search term.',
    back: 'Back to dashboard',
    popularTopics: 'Popular topics',
    categories: [
      {
        id: 'getting-started', icon: Building2, label: 'Getting started', color: 'bg-primary/10 text-primary',
        items: [
          { q: 'How do I create my first event?', a: 'Go to "Events" in the menu and click "+ New event". Fill in the name, date and location. Then create tasks for the event.', tags: ['event', 'start'] },
          { q: 'How do I invite volunteers?', a: 'Go to "Members" at the bottom of the sidebar and click "Invite". Send an invitation link via email.', tags: ['invite', 'members'] },
          { q: 'How do I send a season contract?', a: 'Go to "Contracts" → "Season contracts" and choose a template. Select the volunteers and click "Send contract".', tags: ['contract', 'season'] },
          { q: 'How do I set up my club after registration?', a: 'Click the gear icon in the sidebar footer to open your club settings. Add your logo, description, sport and location.', tags: ['settings', 'setup'] },
        ],
      },
      {
        id: 'billing', icon: CreditCard, label: 'Billing & contracts', color: 'bg-accent/20 text-accent-foreground',
        items: [
          { q: 'When do I pay as a club?', a: 'The first 2 contract types are free, unlimited. From the 3rd type, you pay €15 per volunteer per season.', tags: ['price', 'cost'] },
          { q: 'What are the 5 contract types?', a: 'The 5 types are: Steward, Bar & Catering, Terrain & Material, Admin & Ticketing, and Event Support. You choose 2 for free.', tags: ['types', 'steward'] },
          { q: 'How do the 2 free contract types work?', a: 'For the first 2 unique types you use, you pay nothing — regardless of how many volunteers. Billing starts from type 3.', tags: ['free', 'limit'] },
          { q: 'Where can I see my invoice?', a: 'Go to "Billing" in the management menu. You\'ll see your current usage, open invoices and billing history.', tags: ['invoice'] },
          { q: 'How are SEPA payouts processed?', a: 'Go to "Payments" → "SEPA batches". Select the volunteers and generate a SEPA XML file for your bank.', tags: ['sepa', 'payout'] },
        ],
      },
      {
        id: 'compliance', icon: Scale, label: 'Compliance (Law July 3, 2005)', color: 'bg-destructive/10 text-destructive',
        items: [
          { q: 'What is the annual limit for volunteers?', a: 'Belgian volunteer law (July 3, 2005) sets an annual ceiling for expense reimbursements. The system tracks this automatically per volunteer.', tags: ['law', 'limit'] },
          { q: 'What happens when someone reaches the limit?', a: 'The system marks the volunteer as "compliance blocked". They cannot sign up for tasks until the block is lifted or the new year begins.', tags: ['blocked'] },
          { q: 'How do I send a warning?', a: 'At 80% of the limit, the system sends an automatic notification. You can also manually send a message through the messaging system.', tags: ['warning', 'notification'] },
          { q: 'Where do I find compliance reports?', a: 'Go to "Reporting" → "Compliance" tab for an overview of all volunteers with their status and reimbursements.', tags: ['report'] },
        ],
      },
      {
        id: 'events-planning', icon: CalendarDays, label: 'Events & planning', color: 'bg-secondary/20 text-secondary-foreground',
        items: [
          { q: 'How do I create zones?', a: 'Open a task from the planning view and click "Manage zones". Add zones with name, color and capacity. Then drag volunteers into zones.', tags: ['zones', 'drag'] },
          { q: 'How do I assign volunteers to tasks?', a: 'Go to the task in the planning overview. You\'ll see a list of signed-up volunteers. Click "Assign" next to their name.', tags: ['assign'] },
          { q: 'How do I use the briefing builder?', a: 'Go to a task → "Briefing" tab. Create groups, add blocks (text, checklist, route, contact) and send the briefing.', tags: ['briefing', 'builder'] },
          { q: 'How do I plan across multiple months?', a: 'Use the monthly planning view to spread tasks over a season. Volunteers can mark their availability per day.', tags: ['monthly', 'planning'] },
        ],
      },
      {
        id: 'academy', icon: GraduationCap, label: 'Academy & certificates', color: 'bg-primary/10 text-primary',
        items: [
          { q: 'How do I create a training?', a: 'Go to "Academy" → "+ New training". Add modules with text, video or quiz. Publish when ready.', tags: ['training', 'create'] },
          { q: 'How do I set required trainings?', a: 'In your club settings, mark trainings as "required". Volunteers must complete them before signing up for tasks that require it.', tags: ['required'] },
          { q: 'How do certificates work?', a: 'After completing a training, a certificate can be generated. You can customize the certificate design with your own text, colors and signature.', tags: ['certificate', 'design'] },
        ],
      },
      {
        id: 'safety', icon: Shield, label: 'Safety', color: 'bg-destructive/10 text-destructive',
        items: [
          { q: 'How do I create a safety plan?', a: 'Go to "Safety" → choose an event → "Safety hub". Go through the pre-event checklist and assign safety teams.', tags: ['safety', 'plan'] },
          { q: 'How do I register an incident?', a: 'In the live Control Room, select the incident type and mark the location on the map. It\'s automatically logged with a timestamp.', tags: ['incident', 'register'] },
          { q: 'Who receives notifications?', a: 'The safety team leaders receive automatic push notifications. For urgent incidents, you can send an alarm to ALL volunteers.', tags: ['notification', 'alarm'] },
          { q: 'How do I use the closing procedure?', a: 'After the event, start the closing procedure via "Closing". Volunteers check off their tasks with optional photos and notes.', tags: ['closing'] },
        ],
      },
    ],
    guides: [
      {
        id: 'first-event', title: 'Set up your first event', description: 'From creation to go-live in 4 steps.', icon: CalendarDays,
        steps: [
          { title: 'Create event', description: 'Events → + New event. Fill in name, date and location.', icon: CalendarDays },
          { title: 'Add tasks', description: 'Create tasks per role (steward, bar) with time slots and location.', icon: ClipboardList },
          { title: 'Invite volunteers', description: 'Share the invitation link or send via email.', icon: Users },
          { title: 'Send briefing', description: 'Create a briefing with the builder and send it to all participants.', icon: Megaphone },
        ],
      },
      {
        id: 'season-contract', title: 'Manage season contracts', description: 'Create, send and track contracts.', icon: FileSignature,
        steps: [
          { title: 'Choose template', description: 'Contracts → Season contracts and choose the type.', icon: FileSignature },
          { title: 'Select volunteers', description: 'Select one or multiple volunteers for the contract.', icon: Users },
          { title: 'Send contract', description: 'Click "Send". The volunteer receives an email with a signing link.', icon: Mail },
          { title: 'Track status', description: 'Follow the signing status in the contract overview.', icon: Eye },
        ],
      },
      {
        id: 'safety-plan', title: 'Activate safety plan', description: 'Configure the safety hub for your event.', icon: Shield,
        steps: [
          { title: 'Open safety hub', description: 'Safety → choose your event → Safety hub.', icon: Shield },
          { title: 'Complete checklist', description: 'Fill in the pre-event checklist and assign safety teams.', icon: CheckCircle },
          { title: 'Go live', description: 'Click "Go Live" to activate the Control Room.', icon: Zap },
          { title: 'Monitor incidents', description: 'Monitor incidents in real-time and send alerts if needed.', icon: AlertTriangle },
        ],
      },
    ],
  },
};

/* ── Sub-components (same pattern as VolunteerHelp) ── */
const FAQAccordionItem = ({ item, index }: { item: FAQItem; index: number }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-start gap-3 py-3.5 text-left group">
        <div className="mt-0.5 shrink-0">
          {open ? <ChevronDown className="w-4 h-4 text-primary transition-transform" /> : <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />}
        </div>
        <span className={`text-sm leading-snug ${open ? 'font-semibold text-foreground' : 'text-foreground/80 group-hover:text-foreground'} transition-colors`}>
          {item.q}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pl-7 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GuideCard = ({ guide, stepLabel }: { guide: Guide; stepLabel: string }) => {
  const [open, setOpen] = useState(false);
  const Icon = guide.icon;
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-4 text-left group">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{guide.title}</p>
          <p className="text-xs text-muted-foreground">{guide.description} · {guide.steps.length} {stepLabel}</p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              {guide.steps.map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-foreground">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Main Page ── */
const ClubHelp = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const c = content[language];

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return c.categories;
    const term = search.toLowerCase();
    return c.categories
      .map(cat => ({ ...cat, items: cat.items.filter(item => item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term) || item.tags?.some(t => t.toLowerCase().includes(term))) }))
      .filter(cat => cat.items.length > 0);
  }, [search, c.categories]);

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);

  const popularItems = useMemo(() => {
    return c.categories.slice(0, 3).flatMap(cat =>
      cat.items.slice(0, 2).map(item => ({ ...item, catLabel: cat.label, catColor: cat.color, catIcon: cat.icon }))
    );
  }, [c.categories]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={c.pageTitle + ' | De 12e Man'} description={c.pageSubtitle} canonical="/club-help" />
      <div className="bg-card/90 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }} />
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/club-dashboard')} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle className="w-5 h-5 text-primary shrink-0" />
            <h1 className="font-heading font-bold text-foreground text-lg truncate">{c.pageTitle}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-safe-bottom">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">{c.pageTitle}</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">{c.pageSubtitle}</p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={c.searchPlaceholder} className="pl-12 h-12 rounded-2xl bg-card border-border text-base shadow-sm" />
          {search && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {totalResults} {language === 'nl' ? 'resultaten' : language === 'fr' ? 'résultats' : 'results'}
            </span>
          )}
        </motion.div>

        {/* Popular topics */}
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
                  <button key={i} onClick={() => setSearch(item.q.split(' ').slice(0, 3).join(' '))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors">
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate max-w-[180px]">{item.q}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Category filters */}
        {!search && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {c.categories.map(cat => {
                const Icon = cat.icon;
                const isAct = activeCategory === cat.id;
                return (
                  <button key={cat.id} onClick={() => setActiveCategory(isAct ? null : cat.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all text-center ${isAct ? 'bg-primary/10 border-primary/30 shadow-sm' : 'bg-card border-border hover:bg-muted/50'}`}>
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

        {/* FAQ */}
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
              {filteredCategories.filter(cat => !activeCategory || cat.id === activeCategory).map(cat => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                    <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color}`}><Icon className="w-4 h-4" /></div>
                      <h4 className="text-sm font-semibold text-foreground">{cat.label}</h4>
                      <Badge variant="outline" className="ml-auto text-[10px]">{cat.items.length}</Badge>
                    </div>
                    <div className="divide-y divide-border/50">
                      {cat.items.map((item, i) => <FAQAccordionItem key={i} item={item} index={i} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Guides */}
        <div>
          <h3 className="text-base font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {c.guidesTitle}
          </h3>
          <div className="space-y-3">
            {c.guides.map(guide => (
              <GuideCard key={guide.id} guide={guide} stepLabel={language === 'nl' ? 'stappen' : language === 'fr' ? 'étapes' : 'steps'} />
            ))}
          </div>
        </div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-6 h-6 text-secondary" />
          </div>
          <h3 className="font-heading font-bold text-foreground text-lg">{c.contactTitle}</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">{c.contactSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" className="gap-2" onClick={() => window.open('mailto:privacy@de12eman.be')}>
              <Mail className="w-4 h-4" />
              privacy@de12eman.be
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/community')}>
              <Globe className="w-4 h-4" />
              Community
            </Button>
          </div>
        </motion.div>

        <div className="flex justify-center">
          <Button variant="ghost" className="text-muted-foreground gap-2" onClick={() => navigate('/club-dashboard')}>
            <ArrowLeft className="w-4 h-4" />
            {c.back}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ClubHelp;
