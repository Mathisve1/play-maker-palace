import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const TermsOfUse = () => {
  const { language } = useLanguage();
  const nl = language === 'nl';
  const fr = language === 'fr';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-heading font-bold text-foreground mb-8">
          {nl ? 'Gebruiksvoorwaarden' : fr ? 'Conditions d\'utilisation' : 'Terms of Use'}
        </h1>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <p className="text-sm text-muted-foreground/60">
            {nl ? 'Laatst bijgewerkt: 15 maart 2026' : fr ? 'Dernière mise à jour : 15 mars 2026' : 'Last updated: March 15, 2026'}
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '1. Toepassingsgebied' : fr ? '1. Champ d\'application' : '1. Scope'}
            </h2>
            <p>
              {nl
                ? 'Deze voorwaarden zijn van toepassing op alle gebruikers van het Play Maker Palace platform, inclusief sportclubs ("clubs"), vrijwilligers en externe partners. Door het platform te gebruiken gaat u akkoord met deze voorwaarden.'
                : fr
                ? 'Ces conditions s\'appliquent à tous les utilisateurs de la plateforme Play Maker Palace, y compris les clubs sportifs (« clubs »), les bénévoles et les partenaires externes. En utilisant la plateforme, vous acceptez ces conditions.'
                : 'These terms apply to all users of the Play Maker Palace platform, including sports clubs ("clubs"), volunteers, and external partners. By using the platform you agree to these terms.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '2. Diensten' : fr ? '2. Services' : '2. Services'}
            </h2>
            <p>
              {nl
                ? 'Het platform biedt tools voor het beheer van vrijwilligers bij sportevenementen: seizoenscontracten, briefings, taakplanning, aanwezigheidsregistratie, SEPA-vergoedingen en veiligheidsbeheer.'
                : fr
                ? 'La plateforme offre des outils de gestion des bénévoles lors d\'événements sportifs : contrats saisonniers, briefings, planification des tâches, enregistrement de présence, remboursements SEPA et gestion de la sécurité.'
                : 'The platform provides tools for managing volunteers at sports events: season contracts, briefings, task planning, attendance registration, SEPA reimbursements, and safety management.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '3. Accounts en registratie' : fr ? '3. Comptes et inscription' : '3. Accounts and registration'}
            </h2>
            <p>
              {nl
                ? 'U bent verantwoordelijk voor het vertrouwelijk houden van uw inloggegevens. Clubs zijn verantwoordelijk voor het beheer van hun teamleden en het correct naleven van de Belgische vrijwilligerswetgeving.'
                : fr
                ? 'Vous êtes responsable de la confidentialité de vos identifiants de connexion. Les clubs sont responsables de la gestion de leurs membres et du respect de la législation belge sur le bénévolat.'
                : 'You are responsible for keeping your login credentials confidential. Clubs are responsible for managing their team members and correctly adhering to Belgian volunteering legislation.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '4. Prijzen en betaling' : fr ? '4. Prix et paiement' : '4. Pricing and payment'}
            </h2>
            <p>
              {nl
                ? 'Elke vrijwilliger mag 2 taken gratis voltooien per seizoen. Vanaf de 3e voltooide taak betaalt de club eenmalig €15 voor die vrijwilliger voor het hele seizoen. Alle volgende taken dat seizoen zijn zonder extra kost. De teller reset elk nieuw seizoen. Alle prijzen zijn exclusief BTW.'
                : fr
                ? 'Chaque bénévole peut effectuer 2 tâches gratuitement par saison. À partir de la 3e tâche complétée, le club paie une fois €15 pour ce bénévole pour toute la saison. Toutes les tâches suivantes cette saison sont sans frais supplémentaires. Le compteur est réinitialisé chaque nouvelle saison. Tous les prix s\'entendent hors TVA.'
                : 'Each volunteer can complete 2 tasks for free per season. From the 3rd completed task, the club pays a one-time fee of €15 for that volunteer for the entire season. All subsequent tasks that season are at no extra cost. The counter resets each new season. All prices are excluding VAT.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '5. Verplichtingen van de club' : fr ? '5. Obligations du club' : '5. Club obligations'}
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{nl ? 'Naleving van de Belgische wet van 3 juli 2005 betreffende de rechten van vrijwilligers' : fr ? 'Respect de la loi belge du 3 juillet 2005 relative aux droits des volontaires' : 'Compliance with the Belgian law of July 3, 2005 on the rights of volunteers'}</li>
              <li>{nl ? 'Correcte registratie van gewerkte uren en vergoedingen' : fr ? 'Enregistrement correct des heures travaillées et des indemnités' : 'Accurate registration of worked hours and reimbursements'}</li>
              <li>{nl ? 'Respecteren van de wettelijke vergoedingslimieten (dagelijks en jaarlijks)' : fr ? 'Respect des limites légales d\'indemnisation (journalière et annuelle)' : 'Respecting legal reimbursement limits (daily and annual)'}</li>
              <li>{nl ? 'Afsluiten van een verzekering voor vrijwilligers' : fr ? 'Souscription d\'une assurance pour les bénévoles' : 'Providing volunteer insurance coverage'}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '6. Verplichtingen van de vrijwilliger' : fr ? '6. Obligations du bénévole' : '6. Volunteer obligations'}
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>{nl ? 'Correcte en volledige persoonsgegevens verstrekken' : fr ? 'Fournir des données personnelles correctes et complètes' : 'Provide accurate and complete personal data'}</li>
              <li>{nl ? 'Tijdig afmelden bij verhindering' : fr ? 'Se désinscrire en temps utile en cas d\'empêchement' : 'Cancel in a timely manner if unable to attend'}</li>
              <li>{nl ? 'Naleven van de veiligheidsvoorschriften tijdens evenementen' : fr ? 'Respecter les consignes de sécurité lors des événements' : 'Follow safety regulations during events'}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '7. Aansprakelijkheid' : fr ? '7. Responsabilité' : '7. Liability'}
            </h2>
            <p>
              {nl
                ? 'Play Maker Palace is een facilitator en is niet aansprakelijk voor de arbeidsrelatie tussen clubs en vrijwilligers. De club blijft verantwoordelijk voor de naleving van alle wettelijke verplichtingen jegens haar vrijwilligers.'
                : fr
                ? 'Play Maker Palace est un facilitateur et n\'est pas responsable de la relation de travail entre les clubs et les bénévoles. Le club reste responsable du respect de toutes les obligations légales envers ses bénévoles.'
                : 'Play Maker Palace is a facilitator and is not liable for the employment relationship between clubs and volunteers. The club remains responsible for complying with all legal obligations towards its volunteers.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '8. Beëindiging' : fr ? '8. Résiliation' : '8. Termination'}
            </h2>
            <p>
              {nl
                ? 'Gebruikers kunnen hun account op elk moment deactiveren. Clubs behouden toegang tot historische gegevens (uren, contracten, betalingen) gedurende de wettelijke bewaartermijn.'
                : fr
                ? 'Les utilisateurs peuvent désactiver leur compte à tout moment. Les clubs conservent l\'accès aux données historiques (heures, contrats, paiements) pendant la durée de conservation légale.'
                : 'Users can deactivate their account at any time. Clubs retain access to historical data (hours, contracts, payments) for the legal retention period.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              {nl ? '9. Toepasselijk recht' : fr ? '9. Droit applicable' : '9. Governing law'}
            </h2>
            <p>
              {nl
                ? 'Deze voorwaarden worden beheerst door het Belgisch recht. Geschillen worden voorgelegd aan de bevoegde rechtbanken van Gent.'
                : fr
                ? 'Ces conditions sont régies par le droit belge. Les litiges seront soumis aux tribunaux compétents de Gand.'
                : 'These terms are governed by Belgian law. Disputes shall be submitted to the competent courts of Ghent.'}
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfUse;
