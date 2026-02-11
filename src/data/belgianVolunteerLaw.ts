// Wet van 3 juli 2005 betreffende de rechten van vrijwilligers
// Belgian Volunteer Law - Key articles for contract templates

export interface LawArticle {
  id: string;
  articleNumber: string;
  title: string;
  content: string;
  summary: string;
}

export const belgianVolunteerArticles: LawArticle[] = [
  {
    id: 'art3',
    articleNumber: 'Art. 3',
    title: 'Definitie vrijwilligerswerk',
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
    title: 'Organisatienota',
    summary: 'Verplichtingen van de organisatie bij het inzetten van vrijwilligers.',
    content:
      'De organisatie die een beroep doet op vrijwilligers, brengt de vrijwilliger, voorafgaandelijk aan de uitoefening van het vrijwilligerswerk, ten minste op de hoogte van:\n' +
      '1° de sociale doelstelling en het juridisch statuut van de organisatie;\n' +
      '2° het feit dat de organisatie een verzekeringscontract heeft afgesloten ter dekking van de burgerlijke aansprakelijkheid van de organisatie;\n' +
      '3° de eventuele dekking via een verzekeringscontract van andere risico\'s verbonden aan het vrijwilligerswerk en, in voorkomend geval, welke deze risico\'s zijn;\n' +
      '4° de eventuele betaling van een kostenvergoeding en, in voorkomend geval, de aard van de vergoeding en de gevallen waarin zij wordt betaald;\n' +
      '5° de eventuele verplichting tot geheimhouding.',
  },
  {
    id: 'art5',
    articleNumber: 'Art. 5',
    title: 'Informatieplicht',
    summary: 'De organisatie moet de vrijwilliger informeren over de verzekering en vergoedingen.',
    content:
      'De in artikel 4 bedoelde informatie moet aan de vrijwilliger worden meegedeeld voordat hij zijn activiteit aanvangt. Zij kan mondeling of schriftelijk worden verstrekt. De organisatie moet de vrijwilliger ten minste informeren over het juridisch statuut van de organisatie, de verzekeringsdekking, de eventuele kostenvergoeding en de geheimhoudingsplicht.',
  },
  {
    id: 'art6',
    articleNumber: 'Art. 6',
    title: 'Verzekeringsverplichting',
    summary: 'De organisatie moet een verzekering afsluiten voor burgerlijke aansprakelijkheid.',
    content:
      '§ 1. De organisatie sluit een verzekeringsovereenkomst af die de burgerlijke aansprakelijkheid dekt van de organisatie, met uitsluiting van de contractuele aansprakelijkheid. De verzekering dekt tevens de burgerlijke aansprakelijkheid van de vrijwilligers voor de schade die zij aan derden berokkenen bij de uitoefening van het vrijwilligerswerk.\n' +
      '§ 2. De organisatie kan bijkomend een verzekering afsluiten ter dekking van de lichamelijke schade die de vrijwilligers lijden bij de uitoefening van het vrijwilligerswerk of op de weg van en naar de activiteiten.\n' +
      '§ 3. De Koning bepaalt de minimale waarborgen waaraan de verzekeringsovereenkomst bedoeld in § 1 moet beantwoorden.',
  },
  {
    id: 'art7',
    articleNumber: 'Art. 7',
    title: 'Kostenvergoeding',
    summary: 'Regeling omtrent de onkostenvergoeding voor vrijwilligers.',
    content:
      '§ 1. De kostenvergoeding aan vrijwilligers kan forfaitair zijn of de werkelijk gemaakte kosten dekken. Beide systemen kunnen niet gecombineerd worden, behalve voor het vervoer.\n' +
      '§ 2. De forfaitaire kostenvergoeding mag de door de Koning vastgestelde maximumbedragen niet overschrijden.\n' +
      '§ 3. De werkelijke kostenvergoeding dekt enkel de kosten die de vrijwilliger daadwerkelijk heeft gemaakt in het kader van het vrijwilligerswerk. De vrijwilliger legt de bewijsstukken voor van de gemaakte kosten.\n' +
      '§ 4. De kostenvergoeding is niet onderworpen aan belastingen of sociale bijdragen voor zover de vastgestelde maximumbedragen niet worden overschreden.',
  },
  {
    id: 'art8',
    articleNumber: 'Art. 8',
    title: 'Aansprakelijkheid vrijwilliger',
    summary: 'De vrijwilliger is niet aansprakelijk voor schade, behalve bij opzet of grove fout.',
    content:
      'Behoudens in geval van bedrog, zware fout of gewoonlijk voorkomende lichte fout, is de vrijwilliger niet aansprakelijk voor de schade die hij bij de uitoefening van het vrijwilligerswerk berokkent aan de organisatie, aan de begunstigden of aan derden. De organisatie is aansprakelijk voor de schade die de vrijwilliger berokkent aan derden bij de uitoefening van het vrijwilligerswerk op dezelfde wijze als een aansteller aansprakelijk is voor de schade aangericht door zijn aangestelden.',
  },
  {
    id: 'art10',
    articleNumber: 'Art. 10',
    title: 'Geheimhoudingsplicht',
    summary: 'Vrijwilligers zijn gebonden aan discretie over vertrouwelijke informatie.',
    content:
      'Vrijwilligers die uit hoofde van hun vrijwilligerswerk kennis dragen van vertrouwelijke gegevens, zijn gehouden tot de geheimhoudingsplicht overeenkomstig artikel 458 van het Strafwetboek. De organisatie informeert de vrijwilliger over deze verplichting en de gevolgen van de niet-naleving ervan.',
  },
  {
    id: 'art12',
    articleNumber: 'Art. 12',
    title: 'Cumulatie met uitkeringen',
    summary: 'Regels over het combineren van vrijwilligerswerk met sociale uitkeringen.',
    content:
      'Het verrichten van vrijwilligerswerk staat de vrijwilliger niet in de weg om sociale uitkeringen te genieten, op voorwaarde dat de vrijwilliger het bevoegde orgaan voorafgaandelijk op de hoogte brengt van het feit dat hij een activiteit als vrijwilliger zal uitoefenen. De bevoegde instelling kan de uitoefening van de vrijwilligersactiviteit weigeren indien zij dit onverenigbaar acht met de toestand van de uitkeringsgerechtigde.',
  },
];
