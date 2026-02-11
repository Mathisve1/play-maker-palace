// Wet van 3 juli 2005 betreffende de rechten van vrijwilligers
// Belgian Volunteer Law - Complete article library for contract templates

export interface LawArticle {
  id: string;
  articleNumber: string;
  title: string;
  content: string;
  summary: string;
  essential?: boolean; // Marked as "Aanbevolen" in the UI
  category: 'wet' | 'clausule';
}

// Essential articles: Art. 3, 4, 5, 6, 10
export const belgianVolunteerArticles: LawArticle[] = [
  // ─── ESSENTIEEL (Aanbevolen) ──────────────────────────
  {
    id: 'art3',
    articleNumber: 'Art. 3',
    title: 'Definitie vrijwilligerswerk',
    category: 'wet',
    essential: true,
    summary: 'Definieert wat vrijwilligerswerk is en wie als vrijwilliger wordt beschouwd.',
    content:
      'Voor de toepassing van deze wet wordt verstaan onder:\n' +
      '1° vrijwilligerswerk: elke activiteit die onbezoldigd en onverplicht wordt verricht, ten behoeve van één of meer personen, van een groep of organisatie of van de samenleving als geheel, die ingericht wordt door een organisatie anders dan het familiaal of privé-verband van degene die de activiteit verricht, en die niet door dezelfde persoon en voor dezelfde organisatie wordt verricht in het kader van een arbeidsovereenkomst, een dienstencontract of een statutaire aanstelling;\n' +
      '2° vrijwilliger: elke natuurlijke persoon die een in 1° bedoelde activiteit verricht;\n' +
      '3° organisatie: elke feitelijke vereniging of private of publieke rechtspersoon zonder winstoogmerk die werkt met vrijwilligers.',
  },
  {
    id: 'art4',
    articleNumber: 'Art. 4',
    title: 'Organisatienota / Informatieplicht',
    category: 'wet',
    essential: true,
    summary: 'Verplichte informatie die de organisatie aan de vrijwilliger moet meedelen.',
    content:
      'De organisatie {{club_vzw_naam}} die een beroep doet op vrijwilligers, brengt de vrijwilliger, voorafgaandelijk aan de uitoefening van het vrijwilligerswerk, ten minste op de hoogte van:\n' +
      '1° de sociale doelstelling en het juridisch statuut van de organisatie (ondernemingsnummer: {{ondernemingsnummer}});\n' +
      '2° het feit dat de organisatie een verzekeringscontract heeft afgesloten ter dekking van de burgerlijke aansprakelijkheid (polisnummer: {{verzekering_polis}});\n' +
      '3° de eventuele dekking via een verzekeringscontract van andere risico\'s verbonden aan het vrijwilligerswerk en, in voorkomend geval, welke deze risico\'s zijn;\n' +
      '4° de eventuele betaling van een kostenvergoeding en, in voorkomend geval, de aard van de vergoeding en de gevallen waarin zij wordt betaald;\n' +
      '5° de eventuele verplichting tot geheimhouding.',
  },
  {
    id: 'art5',
    articleNumber: 'Art. 5',
    title: 'Informatieplicht – Moment & Vorm',
    category: 'wet',
    essential: true,
    summary: 'De informatie moet vóór aanvang van het vrijwilligerswerk worden verstrekt.',
    content:
      'De in artikel 4 bedoelde informatie moet aan de vrijwilliger worden meegedeeld voordat hij zijn activiteit aanvangt. Zij kan mondeling of schriftelijk worden verstrekt. De organisatie moet de vrijwilliger ten minste informeren over het juridisch statuut van de organisatie, de verzekeringsdekking, de eventuele kostenvergoeding en de geheimhoudingsplicht.',
  },
  {
    id: 'art6',
    articleNumber: 'Art. 6',
    title: 'Verzekeringsverplichting',
    category: 'wet',
    essential: true,
    summary: 'De organisatie moet een BA-verzekering afsluiten.',
    content:
      '§ 1. De organisatie sluit een verzekeringsovereenkomst af (polisnummer: {{verzekering_polis}}) die de burgerlijke aansprakelijkheid dekt van de organisatie, met uitsluiting van de contractuele aansprakelijkheid. De verzekering dekt tevens de burgerlijke aansprakelijkheid van de vrijwilligers voor de schade die zij aan derden berokkenen bij de uitoefening van het vrijwilligerswerk.\n' +
      '§ 2. De organisatie kan bijkomend een verzekering afsluiten ter dekking van de lichamelijke schade die de vrijwilligers lijden bij de uitoefening van het vrijwilligerswerk of op de weg van en naar de activiteiten.\n' +
      '§ 3. De Koning bepaalt de minimale waarborgen waaraan de verzekeringsovereenkomst bedoeld in § 1 moet beantwoorden.',
  },
  {
    id: 'art10',
    articleNumber: 'Art. 10',
    title: 'Geheimhoudingsplicht',
    category: 'wet',
    essential: true,
    summary: 'Vrijwilligers zijn gebonden aan discretie over vertrouwelijke informatie.',
    content:
      'Vrijwilligers die uit hoofde van hun vrijwilligerswerk kennis dragen van vertrouwelijke gegevens, zijn gehouden tot de geheimhoudingsplicht overeenkomstig artikel 458 van het Strafwetboek. De organisatie informeert de vrijwilliger over deze verplichting en de gevolgen van de niet-naleving ervan.',
  },

  // ─── OVERIGE WETSARTIKELEN ────────────────────────────
  {
    id: 'art1',
    articleNumber: 'Art. 1',
    title: 'Toepassingsgebied',
    category: 'wet',
    summary: 'Bepaalt het toepassingsgebied van de wet.',
    content:
      'Deze wet regelt een aangelegenheid als bedoeld in artikel 78 van de Grondwet. Zij is van toepassing op het vrijwilligerswerk dat in België wordt verricht.',
  },
  {
    id: 'art2',
    articleNumber: 'Art. 2',
    title: 'Federale bevoegdheid',
    category: 'wet',
    summary: 'Bevestigt de federale bevoegdheid voor de regeling van vrijwilligerswerk.',
    content:
      'Deze wet is van toepassing onverminderd de bevoegdheden van de gemeenschappen en de gewesten. De federale overheid is bevoegd voor de aspecten die betrekking hebben op het arbeidsrecht, de sociale zekerheid en de fiscaliteit.',
  },
  {
    id: 'art7',
    articleNumber: 'Art. 7',
    title: 'Kostenvergoeding',
    category: 'wet',
    summary: 'Regeling omtrent de onkostenvergoeding voor vrijwilligers.',
    content:
      '§ 1. De kostenvergoeding aan vrijwilligers kan forfaitair zijn of de werkelijk gemaakte kosten dekken. Beide systemen kunnen niet gecombineerd worden, behalve voor het vervoer.\n' +
      '§ 2. De forfaitaire kostenvergoeding mag de door de Koning vastgestelde maximumbedragen niet overschrijden (huidig maximum: {{max_vergoeding_dag}} per dag, {{max_vergoeding_jaar}} per jaar).\n' +
      '§ 3. De werkelijke kostenvergoeding dekt enkel de kosten die de vrijwilliger daadwerkelijk heeft gemaakt in het kader van het vrijwilligerswerk. De vrijwilliger legt de bewijsstukken voor van de gemaakte kosten.\n' +
      '§ 4. De kostenvergoeding is niet onderworpen aan belastingen of sociale bijdragen voor zover de vastgestelde maximumbedragen niet worden overschreden.',
  },
  {
    id: 'art8',
    articleNumber: 'Art. 8',
    title: 'Aansprakelijkheid vrijwilliger',
    category: 'wet',
    summary: 'De vrijwilliger is niet aansprakelijk behalve bij opzet of grove fout.',
    content:
      'Behoudens in geval van bedrog, zware fout of gewoonlijk voorkomende lichte fout, is de vrijwilliger niet aansprakelijk voor de schade die hij bij de uitoefening van het vrijwilligerswerk berokkent aan de organisatie, aan de begunstigden of aan derden. De organisatie is aansprakelijk voor de schade die de vrijwilliger berokkent aan derden bij de uitoefening van het vrijwilligerswerk op dezelfde wijze als een aansteller aansprakelijk is voor de schade aangericht door zijn aangestelden.',
  },
  {
    id: 'art9',
    articleNumber: 'Art. 9',
    title: 'Uitsluiting aansprakelijkheid',
    category: 'wet',
    summary: 'Bepaalt wanneer de organisatie aansprakelijk blijft voor schade door vrijwilligers.',
    content:
      'De organisatie is burgerrechtelijk aansprakelijk voor de schade die de vrijwilliger aan derden berokkent bij het verrichten van vrijwilligerswerk, op dezelfde wijze als aanstellers aansprakelijk zijn voor hun aangestelden overeenkomstig artikel 1384, derde lid, van het Burgerlijk Wetboek.',
  },
  {
    id: 'art11',
    articleNumber: 'Art. 11',
    title: 'Statuut werkzoekende',
    category: 'wet',
    summary: 'Regels voor werkzoekenden die vrijwilligerswerk verrichten.',
    content:
      'Een uitkeringsgerechtigde volledig werkloze die vrijwilligerswerk wenst te verrichten, moet dit voorafgaandelijk en schriftelijk aangeven bij het werkloosheidsbureau van de Rijksdienst voor Arbeidsvoorziening (RVA/ONEM). De directeur van het werkloosheidsbureau kan het vrijwilligerswerk weigeren of aan voorwaarden onderwerpen indien het niet beantwoordt aan de voorwaarden van deze wet.',
  },
  {
    id: 'art12',
    articleNumber: 'Art. 12',
    title: 'Cumulatie met uitkeringen',
    category: 'wet',
    summary: 'Regels over het combineren van vrijwilligerswerk met sociale uitkeringen.',
    content:
      'Het verrichten van vrijwilligerswerk staat de vrijwilliger niet in de weg om sociale uitkeringen te genieten, op voorwaarde dat de vrijwilliger het bevoegde orgaan voorafgaandelijk op de hoogte brengt van het feit dat hij een activiteit als vrijwilliger zal uitoefenen. De bevoegde instelling kan de uitoefening van de vrijwilligersactiviteit weigeren indien zij dit onverenigbaar acht met de toestand van de uitkeringsgerechtigde.',
  },
  {
    id: 'art13',
    articleNumber: 'Art. 13',
    title: 'Arbeidsongevallen',
    category: 'wet',
    summary: 'Verhouding met de arbeidsongevallenwetgeving.',
    content:
      'De bepalingen van de wet van 10 april 1971 betreffende de arbeidsongevallen zijn niet van toepassing op de vrijwilligers. De organisatie kan evenwel een verzekering afsluiten ter dekking van ongevallen die de vrijwilliger overkomen bij of op de weg van en naar het vrijwilligerswerk.',
  },
  {
    id: 'art14',
    articleNumber: 'Art. 14',
    title: 'Inwerkingtreding',
    category: 'wet',
    summary: 'Datum van inwerkingtreding van de wet.',
    content:
      'Deze wet treedt in werking op 1 augustus 2006, met uitzondering van artikel 6, § 1, dat in werking treedt op een door de Koning te bepalen datum, en uiterlijk op 1 januari 2007.',
  },

  // ─── PRAKTISCHE CONTRACTCLAUSULES ─────────────────────
  {
    id: 'clausule_statuut',
    articleNumber: 'Clausule 1',
    title: 'Statuut van de organisatie',
    category: 'clausule',
    summary: 'Identificatie en juridisch statuut van de organisatie.',
    content:
      'De organisatie {{club_vzw_naam}}, met ondernemingsnummer {{ondernemingsnummer}}, ' +
      'gevestigd te {{club_adres}}, is een vereniging zonder winstoogmerk opgericht conform de wetgeving op de VZW\'s. ' +
      'De sociale doelstelling van de organisatie omvat: {{sociale_doelstelling}}.',
  },
  {
    id: 'clausule_duur',
    articleNumber: 'Clausule 2',
    title: 'Duur en beëindiging',
    category: 'clausule',
    summary: 'Bepaalt de looptijd van de overeenkomst en opzegmogelijkheden.',
    content:
      'Deze overeenkomst wordt aangegaan voor de duur van {{contract_duur}} en gaat in op {{startdatum}}. ' +
      'Beide partijen kunnen de overeenkomst te allen tijde beëindigen, mits een opzegtermijn van {{opzegtermijn}}. ' +
      'De beëindiging dient schriftelijk te worden meegedeeld.',
  },
  {
    id: 'clausule_taken',
    articleNumber: 'Clausule 3',
    title: 'Omschrijving van de taken',
    category: 'clausule',
    summary: 'Beschrijft de taken en verantwoordelijkheden van de vrijwilliger.',
    content:
      'De vrijwilliger verbindt zich ertoe de volgende taken uit te voeren:\n' +
      '• {{taak_omschrijving}}\n' +
      'De activiteiten vinden plaats te {{locatie}}, op de volgende dagen/uren: {{werkrooster}}.\n' +
      'De vrijwilliger ontvangt voorafgaand een briefing op {{briefing_locatie}} om {{briefing_tijd}}.',
  },
  {
    id: 'clausule_vergoeding',
    articleNumber: 'Clausule 4',
    title: 'Onkostenvergoeding',
    category: 'clausule',
    summary: 'Regeling van de kostenvergoeding conform Art. 7.',
    content:
      'Overeenkomstig artikel 7 van de Vrijwilligerswet ontvangt de vrijwilliger een {{vergoeding_type}} kostenvergoeding.\n' +
      'Forfaitaire vergoeding: maximaal {{max_vergoeding_dag}} per dag en {{max_vergoeding_jaar}} per jaar.\n' +
      'Werkelijke kosten: op basis van bewijsstukken, uit te betalen op rekeningnummer {{IBAN}} t.n.v. {{Rekeninghouder}}.\n' +
      'Vervoerskosten worden vergoed aan {{vervoerskost_km}} per kilometer.',
  },
  {
    id: 'clausule_verzekering',
    articleNumber: 'Clausule 5',
    title: 'Verzekeringsgegevens',
    category: 'clausule',
    summary: 'Concrete verzekeringsgegevens van de organisatie.',
    content:
      'De organisatie heeft conform artikel 6 van de Vrijwilligerswet een verzekering burgerlijke aansprakelijkheid afgesloten bij:\n' +
      'Verzekeringsmaatschappij: {{verzekeraar_naam}}\n' +
      'Polisnummer: {{verzekering_polis}}\n' +
      'Dekking: burgerlijke aansprakelijkheid van de organisatie en de vrijwilligers.\n' +
      'Bijkomende dekking lichamelijke schade: {{bijkomende_dekking}}.',
  },
  {
    id: 'clausule_geheimhouding',
    articleNumber: 'Clausule 6',
    title: 'Geheimhouding & Privacy',
    category: 'clausule',
    summary: 'Uitgebreide geheimhoudings- en privacyclausule.',
    content:
      'Overeenkomstig artikel 10 van de Vrijwilligerswet en de Algemene Verordening Gegevensbescherming (AVG/GDPR) verbindt de vrijwilliger zich ertoe:\n' +
      '• alle vertrouwelijke informatie strikt geheim te houden;\n' +
      '• persoonsgegevens van leden, deelnemers of derden niet te delen zonder toestemming;\n' +
      '• bij beëindiging van het vrijwilligerswerk alle documenten en gegevens terug te bezorgen.\n' +
      'Overtreding kan leiden tot strafrechtelijke vervolging (art. 458 Strafwetboek).',
  },
  {
    id: 'clausule_aansprakelijkheid',
    articleNumber: 'Clausule 7',
    title: 'Aansprakelijkheidsregeling',
    category: 'clausule',
    summary: 'Verduidelijking van de aansprakelijkheidsverdeling.',
    content:
      'Conform de artikelen 8 en 9 van de Vrijwilligerswet geldt:\n' +
      '• De vrijwilliger is niet persoonlijk aansprakelijk voor schade veroorzaakt tijdens het vrijwilligerswerk, tenzij bij bedrog, zware fout of herhaaldelijke lichte fout.\n' +
      '• De organisatie neemt de aansprakelijkheid op zich voor schade aan derden.\n' +
      '• Schade aan materiaal van de organisatie door de vrijwilliger wordt behandeld volgens de interne regeling van {{club_vzw_naam}}.',
  },
  {
    id: 'clausule_veiligheid',
    articleNumber: 'Clausule 8',
    title: 'Veiligheid en welzijn',
    category: 'clausule',
    summary: 'Bepalingen rond veiligheid, hygiëne en welzijn.',
    content:
      'De organisatie verbindt zich ertoe een veilige werkomgeving te garanderen. De vrijwilliger:\n' +
      '• volgt de veiligheidsinstructies en het huishoudelijk reglement op;\n' +
      '• meldt onmiddellijk elk ongeval of incident aan {{contactpersoon_veiligheid}};\n' +
      '• maakt gebruik van de ter beschikking gestelde beschermingsmiddelen.\n' +
      'Noodcontactnummer organisatie: {{noodcontact_telefoon}}.',
  },
  {
    id: 'clausule_gedragscode',
    articleNumber: 'Clausule 9',
    title: 'Gedragscode',
    category: 'clausule',
    summary: 'Gedragsregels en ethische richtlijnen voor vrijwilligers.',
    content:
      'De vrijwilliger onderschrijft de gedragscode van {{club_vzw_naam}} en verbindt zich ertoe:\n' +
      '• respectvol om te gaan met alle betrokkenen;\n' +
      '• geen discriminatie te plegen op basis van geslacht, afkomst, geloof of geaardheid;\n' +
      '• de integriteit van de organisatie en haar activiteiten te waarborgen;\n' +
      '• grensoverschrijdend gedrag te melden bij {{vertrouwenspersoon}}.',
  },
  {
    id: 'clausule_communicatie',
    articleNumber: 'Clausule 10',
    title: 'Communicatie en beschikbaarheid',
    category: 'clausule',
    summary: 'Afspraken rond communicatie, afwezigheid en bereikbaarheid.',
    content:
      'De vrijwilliger meldt elke verhindering of afwezigheid zo snel mogelijk aan {{contactpersoon_naam}} via {{contactpersoon_email}} of {{contactpersoon_telefoon}}.\n' +
      'De organisatie communiceert wijzigingen in het programma of de planning tijdig aan de vrijwilliger.',
  },
  {
    id: 'clausule_slotbepalingen',
    articleNumber: 'Clausule 11',
    title: 'Slotbepalingen',
    category: 'clausule',
    summary: 'Toepasselijk recht en geschillenbeslechting.',
    content:
      'Op deze overeenkomst is het Belgisch recht van toepassing, in het bijzonder de Wet van 3 juli 2005 betreffende de rechten van vrijwilligers.\n' +
      'Geschillen worden bij voorkeur minnelijk opgelost. Indien geen oplossing wordt bereikt, zijn de rechtbanken van {{bevoegde_rechtbank}} bevoegd.\n' +
      'Deze overeenkomst is opgemaakt in twee exemplaren, waarbij elke partij erkent een exemplaar te hebben ontvangen.',
  },
];

// Helper: get essential articles
export const essentialArticleIds = ['art3', 'art4', 'art5', 'art6', 'art10'];

// Helper: get articles for smart default template
export const defaultTemplateArticleIds = ['art3', 'art4', 'art6', 'art10', 'art8'];
