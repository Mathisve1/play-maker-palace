import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PrivacyPolicy = () => {
  const { language } = useLanguage();
  const nl = language === 'nl';
  const fr = language === 'fr';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-heading font-bold text-foreground mb-8">
          {nl ? 'Privacyverklaring' : fr ? 'Politique de confidentialité' : 'Privacy Policy'}
        </h1>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <p className="text-sm text-muted-foreground/60">
            {nl ? 'Laatst bijgewerkt: 15 maart 2026' : fr ? 'Dernière mise à jour : 15 mars 2026' : 'Last updated: March 15, 2026'}
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '1. Verwerkingsverantwoordelijke' : fr ? '1. Responsable du traitement' : '1. Data Controller'}
            </h2>
            <p>
              {nl
                ? 'Play Maker Palace (handelsnaam van De12eMan) is de verwerkingsverantwoordelijke voor de persoonsgegevens die via dit platform worden verwerkt. Voor vragen over uw gegevens kunt u contact opnemen via privacy@de12eman.be.'
                : fr
                ? 'Play Maker Palace (nom commercial de De12eMan) est le responsable du traitement des données personnelles traitées via cette plateforme. Pour toute question, contactez privacy@de12eman.be.'
                : 'Play Maker Palace (trade name of De12eMan) is the data controller for personal data processed through this platform. For questions, contact privacy@de12eman.be.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '2. Welke gegevens verwerken wij?' : fr ? '2. Quelles données traitons-nous ?' : '2. What data do we process?'}
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{nl ? 'Naam, e-mailadres, telefoonnummer' : fr ? 'Nom, adresse e-mail, numéro de téléphone' : 'Name, email address, phone number'}</li>
              <li>{nl ? 'Bankgegevens (IBAN) voor vergoedingen via SEPA' : fr ? 'Coordonnées bancaires (IBAN) pour les remboursements SEPA' : 'Bank details (IBAN) for SEPA reimbursements'}</li>
              <li>{nl ? 'Beschikbaarheid, taakvoorkeuren en ingeplande shifts' : fr ? 'Disponibilité, préférences de tâches et shifts planifiés' : 'Availability, task preferences and scheduled shifts'}</li>
              <li>{nl ? 'Digitale handtekeningen op contracten' : fr ? 'Signatures numériques sur les contrats' : 'Digital signatures on contracts'}</li>
              <li>{nl ? 'Inchecktijden en gewerkte uren' : fr ? 'Heures d\'arrivée et heures travaillées' : 'Check-in times and worked hours'}</li>
              <li>{nl ? 'Profielfoto (optioneel)' : fr ? 'Photo de profil (facultatif)' : 'Profile photo (optional)'}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '3. Rechtsgrond en doel' : fr ? '3. Base juridique et finalité' : '3. Legal basis and purpose'}
            </h2>
            <p>
              {nl
                ? 'Wij verwerken uw gegevens op basis van: (a) uitvoering van de overeenkomst (vrijwilligerscontract), (b) wettelijke verplichtingen (Belgische vrijwilligerswetgeving, fiscale rapportage), en (c) gerechtvaardigd belang (platformbeheer, veiligheid).'
                : fr
                ? 'Nous traitons vos données sur la base de : (a) l\'exécution du contrat (contrat de bénévolat), (b) obligations légales (législation belge sur le bénévolat, déclarations fiscales), et (c) intérêt légitime (gestion de la plateforme, sécurité).'
                : 'We process your data based on: (a) contract execution (volunteer agreement), (b) legal obligations (Belgian volunteering legislation, fiscal reporting), and (c) legitimate interest (platform management, safety).'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '4. Dataverwerkers' : fr ? '4. Sous-traitants' : '4. Data Processors'}
            </h2>
            <p>
              {nl
                ? 'Wij maken gebruik van de volgende verwerkers: Supabase Inc. (database en authenticatie, servers in EU), DocuSeal (elektronische handtekeningen), Resend (e-mailverzending), Stripe (betalingsverwerking).'
                : fr
                ? 'Nous faisons appel aux sous-traitants suivants : Supabase Inc. (base de données et authentification, serveurs dans l\'UE), DocuSeal (signatures électroniques), Resend (envoi d\'e-mails), Stripe (traitement des paiements).'
                : 'We use the following processors: Supabase Inc. (database and authentication, EU servers), DocuSeal (electronic signatures), Resend (email delivery), Stripe (payment processing).'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '5. Bewaartermijn' : fr ? '5. Durée de conservation' : '5. Retention period'}
            </h2>
            <p>
              {nl
                ? 'Persoonsgegevens worden bewaard zolang uw account actief is, plus maximaal 5 jaar na het laatste seizoen voor fiscale verplichtingen. Audit logs worden 7 jaar bewaard conform de Belgische boekhoudwetgeving.'
                : fr
                ? 'Les données personnelles sont conservées tant que votre compte est actif, plus un maximum de 5 ans après la dernière saison pour les obligations fiscales. Les journaux d\'audit sont conservés pendant 7 ans conformément à la législation comptable belge.'
                : 'Personal data is retained while your account is active, plus up to 5 years after the last season for fiscal obligations. Audit logs are kept for 7 years per Belgian accounting legislation.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '6. Uw rechten' : fr ? '6. Vos droits' : '6. Your rights'}
            </h2>
            <p>
              {nl
                ? 'Onder de AVG/GDPR heeft u recht op: inzage, rectificatie, wissing, beperking van verwerking, gegevensoverdraagbaarheid en bezwaar. Club-eigenaren kunnen een GDPR-export van uw gegevens genereren via uw profiel. U kunt ook een klacht indienen bij de Gegevensbeschermingsautoriteit (GBA).'
                : fr
                ? 'En vertu du RGPD, vous avez droit à : l\'accès, la rectification, l\'effacement, la limitation du traitement, la portabilité des données et l\'opposition. Les propriétaires de clubs peuvent générer une exportation RGPD de vos données via votre profil. Vous pouvez également déposer une plainte auprès de l\'Autorité de protection des données (APD).'
                : 'Under GDPR you have the right to: access, rectification, erasure, restriction of processing, data portability and objection. Club owners can generate a GDPR export of your data via your profile. You may also file a complaint with the Belgian Data Protection Authority.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '7. Beveiliging' : fr ? '7. Sécurité' : '7. Security'}
            </h2>
            <p>
              {nl
                ? 'Alle gegevens worden versleuteld opgeslagen en overgedragen via TLS. Toegang tot persoonsgegevens is beperkt via Row Level Security (RLS) policies. Alle wijzigingen aan gevoelige gegevens worden gelogd in een audit trail.'
                : fr
                ? 'Toutes les données sont stockées de manière chiffrée et transmises via TLS. L\'accès aux données personnelles est limité par des politiques de sécurité au niveau des lignes (RLS). Toutes les modifications de données sensibles sont enregistrées dans un journal d\'audit.'
                : 'All data is encrypted at rest and in transit via TLS. Access to personal data is restricted via Row Level Security (RLS) policies. All changes to sensitive data are logged in an audit trail.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '8. Contact' : fr ? '8. Contact' : '8. Contact'}
            </h2>
            <p>
              {nl
                ? 'Voor vragen over deze privacyverklaring of om uw rechten uit te oefenen, neem contact op via privacy@de12eman.be of gebruik het contactformulier op onze website.'
                : fr
                ? 'Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, contactez-nous à privacy@de12eman.be ou utilisez le formulaire de contact sur notre site web.'
                : 'For questions about this privacy policy or to exercise your rights, contact us at privacy@de12eman.be or use the contact form on our website.'}
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
