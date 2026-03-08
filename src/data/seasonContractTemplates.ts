// Season contract template generators for the 5 default types
import { ContractBlock } from '@/types/contract';
import { belgianVolunteerArticles, LawArticle, roleClausuleMap } from '@/data/belgianVolunteerLaw';

const genId = () => Math.random().toString(36).slice(2, 10);

const createBlock = (type: ContractBlock['type'], overrides?: Partial<ContractBlock>): ContractBlock => ({
  id: genId(),
  type,
  content: type === 'heading' ? 'Titel' : type === 'text' ? '' : type === 'signature' ? 'Handtekening' : '',
  style: {
    fontSize: type === 'heading' ? 24 : 14,
    color: '#1a1a1a',
    textAlign: type === 'heading' ? 'center' : 'left',
    bold: type === 'heading',
    italic: false,
    underline: false,
  },
  ...overrides,
});

const createArticleBlock = (article: LawArticle): ContractBlock => ({
  id: genId(),
  type: 'article',
  content: article.content,
  articleId: article.id,
  articleTitle: `${article.articleNumber} – ${article.title}`,
  note: '',
  style: { fontSize: 12, color: '#1a1a1a', textAlign: 'left', bold: false, italic: false, underline: false },
});

const createFieldBlock = (fieldName: string): ContractBlock => ({
  id: genId(),
  type: 'field',
  content: '',
  fieldName,
  style: { fontSize: 14, color: '#1a1a1a', textAlign: 'left', bold: false, italic: false, underline: false },
});

const getArticle = (id: string) => belgianVolunteerArticles.find(a => a.id === id);

const sectionHeading = (num: number, title: string) =>
  createBlock('heading', { content: `${num}. ${title}`, style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } });

/**
 * Build a complete season contract template for a given role category.
 */
export const buildSeasonTemplate = (category: string, roleName: string): ContractBlock[] => {
  const essentialArticles = ['art3', 'art4', 'art6', 'art10', 'art8']
    .map(id => getArticle(id))
    .filter(Boolean) as LawArticle[];

  const seasonArticles = [
    'clausule_seizoen_duur', 'clausule_seizoen_rol', 'clausule_seizoen_vergoeding',
    'clausule_seizoen_checkin', 'clausule_seizoen_proef', 'clausule_seizoen_cumul',
    'clausule_seizoen_gdpr', 'clausule_seizoen_identificatie',
  ].map(id => getArticle(id)).filter(Boolean) as LawArticle[];

  const roleClausuleId = roleClausuleMap[category];
  const roleArticle = roleClausuleId ? getArticle(roleClausuleId) : null;

  return [
    // Title
    createBlock('heading', { content: `Seizoensovereenkomst – ${roleName}` }),
    createBlock('text', { content: 'Conform de Wet van 3 juli 2005 betreffende de rechten van vrijwilligers\nVerhoogd plafond sportvrijwilligers: €3.233,91/jaar', style: { fontSize: 11, color: '#6b7280', textAlign: 'center', bold: false, italic: true, underline: false } }),
    createBlock('divider'),
    createBlock('spacer'),

    // 1. Parties
    sectionHeading(1, 'Partijen'),
    createBlock('text', { content: 'Tussen de ondergetekenden:' }),
    createFieldBlock('Clubnaam'),
    createFieldBlock('Ondernemingsnummer'),
    createBlock('text', { content: 'hierna genoemd "de organisatie", enerzijds,' }),
    createBlock('text', { content: 'en' }),
    // Identification
    ...seasonArticles.filter(a => a.id === 'clausule_seizoen_identificatie').map(a => createArticleBlock(a)),
    createBlock('text', { content: 'hierna genoemd "de vrijwilliger", anderzijds,' }),
    createBlock('divider'),

    // 2. Season duration
    sectionHeading(2, 'Looptijd seizoen'),
    ...seasonArticles.filter(a => a.id === 'clausule_seizoen_duur').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // 3. Role & responsibilities
    sectionHeading(3, 'Rol en verantwoordelijkheden'),
    ...seasonArticles.filter(a => a.id === 'clausule_seizoen_rol').map(a => createArticleBlock(a)),
    ...(roleArticle ? [createArticleBlock(roleArticle)] : []),
    createBlock('spacer'),

    // 4. Legal framework
    sectionHeading(4, 'Wettelijk kader'),
    ...essentialArticles.map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // 5. Compensation
    sectionHeading(5, 'Kostenvergoeding'),
    ...seasonArticles.filter(a => a.id === 'clausule_seizoen_vergoeding').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // 6. Check-in
    sectionHeading(6, 'Aanwezigheidsregistratie'),
    ...seasonArticles.filter(a => a.id === 'clausule_seizoen_checkin').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // 7. Trial period
    sectionHeading(7, 'Proefperiode'),
    ...seasonArticles.filter(a => a.id === 'clausule_seizoen_proef').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // 8. Cumulation
    sectionHeading(8, 'Cumulatie en fiscale verplichtingen'),
    ...seasonArticles.filter(a => a.id === 'clausule_seizoen_cumul').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // 9. Insurance
    sectionHeading(9, 'Verzekering'),
    ...belgianVolunteerArticles.filter(a => a.id === 'clausule_verzekering').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // 10. GDPR
    sectionHeading(10, 'Gegevensbescherming (AVG/GDPR)'),
    ...seasonArticles.filter(a => a.id === 'clausule_seizoen_gdpr').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // 11. Final provisions
    sectionHeading(11, 'Slotbepalingen'),
    ...belgianVolunteerArticles.filter(a => a.id === 'clausule_slotbepalingen').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // 12. Signatures
    sectionHeading(12, 'Handtekeningen'),
    createBlock('text', { content: 'Opgemaakt te ........................, op {{Datum}}' }),
    createBlock('divider'),
    createBlock('signature'),
    createFieldBlock('Datum'),
  ];
};

// Pre-built templates for each category
export const seasonTemplateGenerators: Record<string, () => ContractBlock[]> = {
  steward: () => buildSeasonTemplate('steward', 'Steward / Veiligheidsmedewerker'),
  bar_catering: () => buildSeasonTemplate('bar_catering', 'Bar- en Cateringpersoneel'),
  terrain_material: () => buildSeasonTemplate('terrain_material', 'Terreinverzorger / Materiaalbeheerder'),
  admin_ticketing: () => buildSeasonTemplate('admin_ticketing', 'Administratief Medewerker / Ticketing'),
  event_support: () => buildSeasonTemplate('event_support', 'Event Support / Allround Helper'),
};

export const seasonTemplateNames: Record<string, string> = {
  steward: 'Steward / Veiligheidsmedewerker',
  bar_catering: 'Bar- en Cateringpersoneel',
  terrain_material: 'Terreinverzorger / Materiaalbeheerder',
  admin_ticketing: 'Administratief Medewerker / Ticketing',
  event_support: 'Event Support / Allround Helper',
};
