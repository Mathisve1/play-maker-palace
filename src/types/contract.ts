export type BlockType = 'heading' | 'text' | 'article' | 'field' | 'logo' | 'divider' | 'spacer' | 'signature';

export interface ContractBlock {
  id: string;
  type: BlockType;
  content: string;
  articleId?: string;
  articleTitle?: string;
  note?: string;
  fieldName?: string;
  logoUrl?: string;
  style: {
    fontSize: number;
    color: string;
    textAlign: 'left' | 'center' | 'right' | 'justify';
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
}

export const mergeFieldLabels: Record<string, string> = {
  'Naam': 'Naam vrijwilliger',
  'E-mail': 'E-mailadres',
  'Telefoon': 'Telefoonnummer',
  'IBAN': 'IBAN rekeningnummer',
  'Rekeninghouder': 'Naam rekeninghouder',
  'Clubnaam': 'Naam organisatie',
  'Taak': 'Naam taak/opdracht',
  'Datum': 'Datum',
  'Locatie': 'Locatie',
  'Uren': 'Werkuren',
  'Onkostenvergoeding': 'Bedrag vergoeding',
  // Monthly-specific fields
  'Maandperiode': 'Maand + jaar (bv. Maart 2026)',
  'Startdatum': 'Startdatum maandcontract',
  'Einddatum': 'Einddatum maandcontract',
  'Compensatietype': 'Type vergoeding (dag/uur)',
  'Dagvergoeding': 'Dagvergoeding bedrag',
  'Uurvergoeding': 'Uurvergoeding bedrag',
  'MaxDagPlafond': 'Max. dagvergoeding (wettelijk)',
  'MaxJaarPlafond': 'Max. jaarvergoeding (wettelijk)',
  'Geboortedatum': 'Geboortedatum vrijwilliger',
  'Rijksregisternummer': 'Rijksregisternummer',
  'Adres': 'Adres vrijwilliger',
  'Ondernemingsnummer': 'Ondernemingsnummer organisatie',
  'VerzekeringPolis': 'Polisnummer BA-verzekering',
  'Verzekeraar': 'Naam verzekeringsmaatschappij',
};
