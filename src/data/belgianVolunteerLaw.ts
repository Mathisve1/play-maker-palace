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

  // ─── MAANDCONTRACT-SPECIFIEKE CLAUSULES ───────────────
  {
    id: 'clausule_maand_duur',
    articleNumber: 'Clausule M1',
    title: 'Looptijd maandovereenkomst',
    category: 'clausule',
    summary: 'Specifieke duur en geldigheid van het maandcontract.',
    content:
      'Deze overeenkomst wordt aangegaan voor de periode van {{Startdatum}} tot en met {{Einddatum}} ({{Maandperiode}}).\n' +
      'De vrijwilliger kan zich aanmelden voor dagelijks ingeplande taken binnen deze periode via het digitale platform van de organisatie.\n' +
      'De overeenkomst eindigt van rechtswege op de einddatum. Vroegtijdige beëindiging door beide partijen is mogelijk mits schriftelijke kennisgeving.',
  },
  {
    id: 'clausule_maand_rooster',
    articleNumber: 'Clausule M2',
    title: 'Dagelijks rooster en aanmelding',
    category: 'clausule',
    summary: 'Regeling rond het dagelijks aanmeldingssysteem.',
    content:
      'De organisatie plant dagelijkse taken in via een maandrooster. De vrijwilliger kan zich per dag aanmelden voor beschikbare taken.\n' +
      'Aanmelding geldt als bevestiging van beschikbaarheid. De vrijwilliger meldt zich aan op de afgesproken locatie ({{Locatie}}) en tijdstip.\n' +
      'Check-in en check-out worden digitaal geregistreerd. De geregistreerde uren vormen de basis voor de berekening van de kostenvergoeding.\n' +
      'Bij verhindering verwittigt de vrijwilliger de organisatie zo snel mogelijk, bij voorkeur 24 uur op voorhand.',
  },
  {
    id: 'clausule_maand_vergoeding',
    articleNumber: 'Clausule M3',
    title: 'Maandelijkse kostenvergoeding',
    category: 'clausule',
    summary: 'Berekening en uitbetaling van de maandelijkse vergoeding.',
    content:
      'De vrijwilliger ontvangt een kostenvergoeding op basis van {{Compensatietype}}:\n' +
      '• Dagvergoeding: {{Dagvergoeding}} per gewerkte dag\n' +
      '• Uurvergoeding: {{Uurvergoeding}} per gepresteerd uur\n\n' +
      'De vergoeding wordt maandelijks afgerekend na bevestiging van de gepresteerde uren door beide partijen.\n' +
      'Uitbetaling geschiedt via overschrijving op rekeningnummer {{IBAN}} t.n.v. {{Rekeninghouder}}.\n\n' +
      'Conform artikel 10 van het KB van 21 december 2018 mag de forfaitaire kostenvergoeding de wettelijke maxima niet overschrijden:\n' +
      '• Dagplafond: {{MaxDagPlafond}}\n' +
      '• Jaarplafond: {{MaxJaarPlafond}}\n' +
      'Bij overschrijding van deze bedragen worden de vergoedingen als beroepsinkomsten beschouwd en zijn ze onderworpen aan belastingen en sociale bijdragen.',
  },
  {
    id: 'clausule_maand_afrekening',
    articleNumber: 'Clausule M4',
    title: 'Maandafrekening en urenbevestiging',
    category: 'clausule',
    summary: 'Procedure voor de maandelijkse afrekening van uren en vergoedingen.',
    content:
      'Aan het einde van de maandperiode stelt de organisatie een maandafrekening op.\n' +
      'Deze afrekening bevat per vrijwilliger:\n' +
      '• het totaal aantal gewerkte dagen;\n' +
      '• het totaal aantal gepresteerde uren;\n' +
      '• het verschuldigde vergoedingsbedrag.\n\n' +
      'De vrijwilliger bevestigt de gepresteerde uren via het digitale platform. De organisatie controleert en keurt de uren goed.\n' +
      'Na wederzijdse goedkeuring wordt de vergoeding overgemaakt binnen 30 kalenderdagen.',
  },
  {
    id: 'clausule_maand_cumul',
    articleNumber: 'Clausule M5',
    title: 'Cumulatie en fiscale verplichtingen',
    category: 'clausule',
    summary: 'Informatie over cumulatie met uitkeringen en fiscale gevolgen.',
    content:
      'De vrijwilliger verklaart op de hoogte te zijn van de volgende verplichtingen:\n\n' +
      '1. Werkzoekenden (Art. 11): Het vrijwilligerswerk moet vooraf schriftelijk worden aangegeven bij de RVA/ONEM.\n' +
      '2. Uitkeringsgerechtigden (Art. 12): De vrijwilliger informeert het bevoegde uitkeringsorgaan vóór aanvang van het vrijwilligerswerk.\n' +
      '3. Overschrijding vergoedingsplafond: Bij overschrijding van de wettelijke maxima ({{MaxJaarPlafond}}/jaar) worden alle vergoedingen in dat kalenderjaar als belastbaar inkomen beschouwd.\n\n' +
      'De organisatie houdt een register bij van alle uitbetaalde vergoedingen per vrijwilliger per kalenderjaar en stelt dit ter beschikking bij controle.',
  },
  {
    id: 'clausule_maand_gdpr',
    articleNumber: 'Clausule M6',
    title: 'Gegevensbescherming (AVG/GDPR)',
    category: 'clausule',
    summary: 'Privacyverklaring en gegevensverwerking conform GDPR.',
    content:
      'De organisatie verwerkt persoonsgegevens van de vrijwilliger (naam, contactgegevens, rijksregisternummer, bankgegevens, werkuren) uitsluitend voor:\n' +
      '• de administratie van het vrijwilligerswerk;\n' +
      '• de berekening en uitbetaling van kostenvergoedingen;\n' +
      '• het naleven van wettelijke verplichtingen (fiscaal, sociaal).\n\n' +
      'Rechtsgrond: uitvoering van deze overeenkomst (art. 6.1.b AVG) en wettelijke verplichting (art. 6.1.c AVG).\n' +
      'Bewaartermijn: 7 jaar na het einde van het kalenderjaar (boekhoudkundige verplichting).\n\n' +
      'De vrijwilliger heeft recht op inzage, rectificatie, wissing en overdraagbaarheid van zijn/haar gegevens. Verzoeken kunnen worden gericht aan {{contactpersoon_email}}.\n' +
      'Verwerkingsverantwoordelijke: {{club_vzw_naam}}, {{club_adres}}.',
  },
  {
    id: 'clausule_maand_identificatie',
    articleNumber: 'Clausule M7',
    title: 'Identificatie vrijwilliger',
    category: 'clausule',
    summary: 'Persoonsgegevens van de vrijwilliger voor de maandovereenkomst.',
    content:
      'De vrijwilliger identificeert zich als volgt:\n' +
      'Naam: {{Naam}}\n' +
      'Geboortedatum: {{Geboortedatum}}\n' +
      'Rijksregisternummer: {{Rijksregisternummer}}\n' +
      'Adres: {{Adres}}\n' +
      'E-mail: {{E-mail}}\n' +
      'Telefoon: {{Telefoon}}\n' +
      'IBAN: {{IBAN}}\n' +
      'Rekeninghouder: {{Rekeninghouder}}\n\n' +
      'De vrijwilliger bevestigt dat bovenstaande gegevens correct en actueel zijn en verbindt zich ertoe wijzigingen onmiddellijk door te geven aan de organisatie.',
  },

  // ─── SEIZOENSCONTRACT-SPECIFIEKE CLAUSULES ─────────────
  {
    id: 'clausule_seizoen_duur',
    articleNumber: 'Clausule S1',
    title: 'Looptijd seizoensovereenkomst',
    category: 'clausule',
    summary: 'Specifieke duur en geldigheid van het seizoenscontract (juli-juni).',
    content:
      'Deze overeenkomst wordt aangegaan voor het sportseizoen van {{SeizoenStart}} tot en met {{SeizoenEinde}} ({{SeizoenNaam}}).\n' +
      'De vrijwilliger verbindt zich ertoe beschikbaar te zijn voor taken binnen dit seizoen, volgens de afspraken met de organisatie.\n' +
      'De overeenkomst eindigt van rechtswege op de einddatum van het seizoen. Vroegtijdige beëindiging door beide partijen is mogelijk mits schriftelijke kennisgeving met een opzegtermijn van 14 dagen.',
  },
  {
    id: 'clausule_seizoen_rol',
    articleNumber: 'Clausule S2',
    title: 'Rol en verantwoordelijkheden',
    category: 'clausule',
    summary: 'Specifieke taken en verantwoordelijkheden per rol.',
    content:
      'De vrijwilliger wordt ingezet als {{Rol}} en neemt de volgende verantwoordelijkheden op:\n' +
      '{{RolOmschrijving}}\n\n' +
      'De organisatie voorziet een briefing en eventuele opleiding voorafgaand aan de inzet.\n' +
      'De exacte inzetmomenten worden per evenement/wedstrijd gecommuniceerd via het digitale platform van de organisatie.',
  },
  {
    id: 'clausule_seizoen_vergoeding',
    articleNumber: 'Clausule S3',
    title: 'Seizoensvergoeding',
    category: 'clausule',
    summary: 'Kostenvergoeding over het hele seizoen conform sportvrijwilligersregeling.',
    content:
      'De vrijwilliger ontvangt een forfaitaire kostenvergoeding voor de geleverde prestaties.\n\n' +
      'Conform het KB van 21 december 2018 en de specifieke regeling voor sportvrijwilligers gelden de volgende maxima:\n' +
      '• Dagvergoeding: maximaal {{MaxDagPlafond}} per dag\n' +
      '• Jaarvergoeding: maximaal {{MaxJaarPlafond}} per jaar (verhoogd plafond sportvrijwilligers: €3.233,91)\n\n' +
      'De vergoeding wordt uitbetaald via overschrijving op rekeningnummer {{IBAN}} t.n.v. {{Rekeninghouder}}.\n' +
      'Bij overschrijding van deze bedragen worden de vergoedingen als beroepsinkomsten beschouwd en zijn ze onderworpen aan belastingen en sociale bijdragen.',
  },
  {
    id: 'clausule_seizoen_checkin',
    articleNumber: 'Clausule S4',
    title: 'Aanwezigheidsregistratie',
    category: 'clausule',
    summary: 'Digitale check-in en check-out procedure.',
    content:
      'De vrijwilliger registreert zijn/haar aanwezigheid via het digitale platform van de organisatie (QR-code of handmatige registratie).\n' +
      'Check-in vindt plaats bij aankomst, check-out bij vertrek. De geregistreerde aanwezigheden vormen de basis voor:\n' +
      '• de berekening van de kostenvergoeding;\n' +
      '• de activering van het contract na de proefperiode;\n' +
      '• de rapportering aan de bevoegde overheden.\n\n' +
      'Bij verhindering verwittigt de vrijwilliger de organisatie zo snel mogelijk, bij voorkeur 24 uur op voorhand.',
  },
  {
    id: 'clausule_seizoen_proef',
    articleNumber: 'Clausule S5',
    title: 'Proefperiode (4-keer-regel)',
    category: 'clausule',
    summary: 'Gratis proefperiode van 3 keer, activering vanaf de 4de keer.',
    content:
      'De eerste drie (3) aanwezigheden van de vrijwilliger gelden als een vrijblijvende proefperiode.\n' +
      'Tijdens deze proefperiode:\n' +
      '• leert de vrijwilliger de organisatie en de taken kennen;\n' +
      '• is er geen verplichting tot verdere samenwerking;\n' +
      '• worden er geen kostenvergoedingen uitgekeerd.\n\n' +
      'Vanaf de vierde (4de) aanwezigheid wordt het seizoenscontract als "actief" beschouwd en gelden alle bepalingen van deze overeenkomst, inclusief de kostenvergoedingsregeling.\n\n' +
      'Opmerking: Tijdens de huidige testfase worden er nog geen kosten in rekening gebracht.',
  },
  {
    id: 'clausule_seizoen_cumul',
    articleNumber: 'Clausule S6',
    title: 'Cumulatie en fiscale verplichtingen (seizoen)',
    category: 'clausule',
    summary: 'Cumulatieregels voor het volledige seizoen.',
    content:
      'De vrijwilliger verklaart op de hoogte te zijn van de volgende verplichtingen:\n\n' +
      '1. Werkzoekenden (Art. 11): Het vrijwilligerswerk moet vooraf schriftelijk worden aangegeven bij de RVA/ONEM.\n' +
      '2. Uitkeringsgerechtigden (Art. 12): De vrijwilliger informeert het bevoegde uitkeringsorgaan vóór aanvang.\n' +
      '3. Sportvrijwilligers: Het verhoogde jaarplafond (€3.233,91) geldt voor activiteiten bij sportverenigingen.\n' +
      '4. Overschrijding: Bij overschrijding van het jaarplafond worden alle vergoedingen in dat kalenderjaar als belastbaar inkomen beschouwd.\n\n' +
      'De organisatie houdt een register bij van alle uitbetaalde vergoedingen per seizoen en per kalenderjaar.',
  },
  {
    id: 'clausule_seizoen_gdpr',
    articleNumber: 'Clausule S7',
    title: 'Gegevensbescherming seizoenscontract',
    category: 'clausule',
    summary: 'Privacyverklaring specifiek voor seizoensregistratie.',
    content:
      'De organisatie verwerkt persoonsgegevens (naam, contactgegevens, rijksregisternummer, bankgegevens, aanwezigheidsdata) voor:\n' +
      '• de administratie van het vrijwilligerswerk gedurende het seizoen;\n' +
      '• aanwezigheidsregistratie en -rapportering;\n' +
      '• de berekening en uitbetaling van kostenvergoedingen;\n' +
      '• het naleven van wettelijke verplichtingen.\n\n' +
      'Rechtsgrond: uitvoering van deze overeenkomst (art. 6.1.b AVG) en wettelijke verplichting (art. 6.1.c AVG).\n' +
      'Bewaartermijn: 7 jaar na het einde van het kalenderjaar.\n' +
      'De vrijwilliger heeft recht op inzage, rectificatie en wissing van zijn/haar gegevens.',
  },
  {
    id: 'clausule_seizoen_identificatie',
    articleNumber: 'Clausule S8',
    title: 'Identificatie vrijwilliger (seizoen)',
    category: 'clausule',
    summary: 'Persoonsgegevens voor het seizoenscontract.',
    content:
      'De vrijwilliger identificeert zich als volgt:\n' +
      'Naam: {{Naam}}\n' +
      'Geboortedatum: {{Geboortedatum}}\n' +
      'Rijksregisternummer: {{Rijksregisternummer}}\n' +
      'Adres: {{Adres}}\n' +
      'E-mail: {{E-mail}}\n' +
      'Telefoon: {{Telefoon}}\n' +
      'IBAN: {{IBAN}}\n' +
      'Rekeninghouder: {{Rekeninghouder}}\n\n' +
      'De vrijwilliger bevestigt dat bovenstaande gegevens correct en actueel zijn.',
  },

  // ─── ROLSPECIFIEKE CLAUSULES ───────────────────────────
  {
    id: 'clausule_rol_steward',
    articleNumber: 'Clausule R1',
    title: 'Steward / Veiligheidsmedewerker – Specifieke bepalingen',
    category: 'clausule',
    summary: 'Rolspecifieke clausules voor stewards en veiligheidsmedewerkers.',
    content:
      'De vrijwilliger wordt ingezet als Steward / Veiligheidsmedewerker en verbindt zich tot:\n' +
      '• het naleven van het veiligheidsplan en de evacuatieprocedures van de organisatie;\n' +
      '• het dragen van de verplichte herkenningstekens (hesje, badge, armband);\n' +
      '• het opvolgen van instructies van de veiligheidscoördinator;\n' +
      '• het melden van elk incident aan de verantwoordelijke;\n' +
      '• het bewaken van toegangen, parkings en/of zones zoals aangeduid.\n\n' +
      'De organisatie voorziet een verplichte veiligheidsbriefing vóór elk evenement.\n' +
      'De vrijwilliger onthoudt zich van het gebruik van alcohol of verdovende middelen tijdens de inzet.',
  },
  {
    id: 'clausule_rol_bar',
    articleNumber: 'Clausule R2',
    title: 'Bar- en Cateringpersoneel – Specifieke bepalingen',
    category: 'clausule',
    summary: 'Rolspecifieke clausules voor barpersoneel en catering.',
    content:
      'De vrijwilliger wordt ingezet als Bar-/Cateringmedewerker en verbindt zich tot:\n' +
      '• het naleven van de FAVV-hygiënevoorschriften (Federaal Agentschap voor de Veiligheid van de Voedselketen);\n' +
      '• het dragen van aangepaste kledij en beschermingsmiddelen (handschoenen, haarnetje indien van toepassing);\n' +
      '• de correcte behandeling van voedingswaren en dranken;\n' +
      '• het verantwoord schenken van alcoholische dranken (geen verkoop aan minderjarigen);\n' +
      '• het melden van elk hygiëne-incident aan de verantwoordelijke.\n\n' +
      'De organisatie voorziet de nodige materialen en een werkomgeving die voldoet aan de hygiënenormen.',
  },
  {
    id: 'clausule_rol_terrein',
    articleNumber: 'Clausule R3',
    title: 'Terreinverzorger / Materiaalbeheerder – Specifieke bepalingen',
    category: 'clausule',
    summary: 'Rolspecifieke clausules voor terreinverzorging en materiaalbeheer.',
    content:
      'De vrijwilliger wordt ingezet als Terreinverzorger / Materiaalbeheerder en verbindt zich tot:\n' +
      '• het correct en veilig gebruik van materialen en gereedschappen;\n' +
      '• het opvolgen van veiligheidsinstructies bij opbouw en afbraak;\n' +
      '• het dragen van persoonlijke beschermingsmiddelen (veiligheidsschoenen, handschoenen, helmen indien vereist);\n' +
      '• het melden van defecten of schade aan materialen;\n' +
      '• het respecteren van de terreinnormen van de sportfederatie.\n\n' +
      'De organisatie stelt alle benodigde materialen en beschermingsmiddelen ter beschikking.\n' +
      'Zware fysieke taken worden enkel uitgevoerd na instructie en met adequate begeleiding.',
  },
  {
    id: 'clausule_rol_admin',
    articleNumber: 'Clausule R4',
    title: 'Administratief Medewerker / Ticketing – Specifieke bepalingen',
    category: 'clausule',
    summary: 'Rolspecifieke clausules voor administratie en ticketing.',
    content:
      'De vrijwilliger wordt ingezet als Administratief Medewerker / Ticketing en verbindt zich tot:\n' +
      '• de correcte verwerking van persoonsgegevens conform de AVG/GDPR;\n' +
      '• het vertrouwelijk behandelen van financiële transacties en kassagegevens;\n' +
      '• het nauwkeurig bijhouden van aanwezigheidslijsten en/of ticketverkoop;\n' +
      '• het correct afhandelen van klachten en vragen van bezoekers;\n' +
      '• het afsluiten en overdragen van de kassa aan het einde van de shift.\n\n' +
      'De organisatie voorziet de nodige apparatuur (laptop, scanner, kassa) en een korte opleiding.\n' +
      'Kasoverschotten of -tekorten worden gemeld aan de verantwoordelijke.',
  },
  {
    id: 'clausule_rol_event',
    articleNumber: 'Clausule R5',
    title: 'Event Support / Allround Helper – Specifieke bepalingen',
    category: 'clausule',
    summary: 'Rolspecifieke clausules voor event support en allround helpers.',
    content:
      'De vrijwilliger wordt ingezet als Event Support / Allround Helper en kan diverse taken uitvoeren:\n' +
      '• logistieke ondersteuning bij opbouw, afbraak en inrichting;\n' +
      '• begeleiding van bezoekers, deelnemers of jeugdleden;\n' +
      '• promotie, onthaal en informatieverstrekking;\n' +
      '• runners-taken en andere ad-hoc opdrachten.\n\n' +
      'De exacte taken worden vooraf gecommuniceerd via de briefing. De vrijwilliger meldt zich bij de coördinator voor specifieke instructies.\n' +
      'De organisatie garandeert dat geen taken worden opgelegd die buiten de competenties of het comfort van de vrijwilliger vallen.',
  },
];

// Helper: get essential articles
export const essentialArticleIds = ['art3', 'art4', 'art5', 'art6', 'art10'];

// Helper: get articles for smart default template
export const defaultTemplateArticleIds = ['art3', 'art4', 'art6', 'art10', 'art8'];

// Helper: get season clausule IDs
export const seasonClausuleIds = [
  'clausule_seizoen_duur', 'clausule_seizoen_rol', 'clausule_seizoen_vergoeding',
  'clausule_seizoen_checkin', 'clausule_seizoen_proef', 'clausule_seizoen_cumul',
  'clausule_seizoen_gdpr', 'clausule_seizoen_identificatie',
];

// Helper: role-specific clausule map
export const roleClausuleMap: Record<string, string> = {
  steward: 'clausule_rol_steward',
  bar_catering: 'clausule_rol_bar',
  terrain_material: 'clausule_rol_terrein',
  admin_ticketing: 'clausule_rol_admin',
  event_support: 'clausule_rol_event',
};
