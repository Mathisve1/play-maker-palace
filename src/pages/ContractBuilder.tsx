import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ArrowLeft, Save, Type, AlignLeft, Image, Minus, Space, PenTool,
  Bold, Italic, Underline, AlignCenter, AlignRight, AlignJustify,
  Palette, GripVertical, Trash2, Plus, Scale, FileText, Loader2,
  ChevronDown, ChevronRight, BookOpen, Hash, Edit3, Sparkles,
  ShieldCheck, AlertTriangle, CheckCircle2, Gavel, X, CalendarDays
} from 'lucide-react';
import { belgianVolunteerArticles, essentialArticleIds, defaultTemplateArticleIds, LawArticle } from '@/data/belgianVolunteerLaw';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import ClubPageLayout from '@/components/ClubPageLayout';
// html2canvas and jsPDF are lazy-loaded when needed for PDF export

// ─── Block Types (shared) ────────────────────────────────
import { ContractBlock, BlockType } from '@/types/contract';

// ─── Palette Items ───────────────────────────────────────

const paletteBlocks = [
  { type: 'heading' as BlockType, label: 'Koptekst', icon: <Type className="w-4 h-4" />, description: 'Titel of sectiekop' },
  { type: 'text' as BlockType, label: 'Vrije tekst', icon: <AlignLeft className="w-4 h-4" />, description: 'Bewerkbaar tekstblok' },
  { type: 'logo' as BlockType, label: 'Logo', icon: <Image className="w-4 h-4" />, description: 'Upload een clublogo' },
  { type: 'divider' as BlockType, label: 'Scheidingslijn', icon: <Minus className="w-4 h-4" />, description: 'Horizontale lijn' },
  { type: 'spacer' as BlockType, label: 'Witruimte', icon: <Space className="w-4 h-4" />, description: 'Extra verticale ruimte' },
  { type: 'signature' as BlockType, label: 'Handtekening', icon: <PenTool className="w-4 h-4" />, description: 'Handtekeningveld' },
];

const mergeFields = [
  { name: 'Naam', label: 'Naam vrijwilliger', group: 'basic' },
  { name: 'E-mail', label: 'E-mailadres', group: 'basic' },
  { name: 'Telefoon', label: 'Telefoonnummer', group: 'basic' },
  { name: 'IBAN', label: 'IBAN rekeningnummer', group: 'basic' },
  { name: 'Rekeninghouder', label: 'Naam rekeninghouder', group: 'basic' },
  { name: 'Clubnaam', label: 'Naam organisatie', group: 'basic' },
  { name: 'Taak', label: 'Naam taak/opdracht', group: 'basic' },
  { name: 'Datum', label: 'Datum', group: 'basic' },
  { name: 'Locatie', label: 'Locatie', group: 'basic' },
  { name: 'Uren', label: 'Werkuren', group: 'basic' },
  { name: 'Onkostenvergoeding', label: 'Bedrag vergoeding', group: 'basic' },
  // Monthly-specific
  { name: 'Maandperiode', label: 'Maand + jaar', group: 'monthly' },
  { name: 'Startdatum', label: 'Startdatum maandcontract', group: 'monthly' },
  { name: 'Einddatum', label: 'Einddatum maandcontract', group: 'monthly' },
  { name: 'Compensatietype', label: 'Type vergoeding (dag/uur)', group: 'monthly' },
  { name: 'Dagvergoeding', label: 'Dagvergoeding bedrag', group: 'monthly' },
  { name: 'Uurvergoeding', label: 'Uurvergoeding bedrag', group: 'monthly' },
  { name: 'MaxDagPlafond', label: 'Max. dagvergoeding (wettelijk)', group: 'monthly' },
  { name: 'MaxJaarPlafond', label: 'Max. jaarvergoeding (wettelijk)', group: 'monthly' },
  // Identification
  { name: 'Geboortedatum', label: 'Geboortedatum', group: 'identity' },
  { name: 'Rijksregisternummer', label: 'Rijksregisternummer', group: 'identity' },
  { name: 'Adres', label: 'Adres vrijwilliger', group: 'identity' },
  { name: 'Ondernemingsnummer', label: 'Ondernemingsnummer organisatie', group: 'identity' },
  { name: 'VerzekeringPolis', label: 'Polisnummer BA-verzekering', group: 'identity' },
  { name: 'Verzekeraar', label: 'Naam verzekeringsmaatschappij', group: 'identity' },
];

// ─── Helpers ─────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10);

const createBlock = (type: BlockType, overrides?: Partial<ContractBlock>): ContractBlock => ({
  id: genId(),
  type,
  content: type === 'heading' ? 'Vrijwilligersovereenkomst' :
           type === 'text' ? 'Typ hier uw tekst...' :
           type === 'signature' ? 'Handtekening' : '',
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

// ─── Smart Default Template ──────────────────────────────

const getSmartDefaultBlocks = (): ContractBlock[] => {
  const essentialArticles = defaultTemplateArticleIds
    .map(id => belgianVolunteerArticles.find(a => a.id === id))
    .filter(Boolean) as LawArticle[];

  return [
    createBlock('heading', { content: 'Vrijwilligersovereenkomst' }),
    createBlock('text', { content: 'Conform de Wet van 3 juli 2005 betreffende de rechten van vrijwilligers', style: { fontSize: 11, color: '#6b7280', textAlign: 'center', bold: false, italic: true, underline: false } }),
    createBlock('divider'),
    createBlock('spacer'),
    createBlock('heading', { content: '1. Partijen', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    createBlock('text', { content: 'Tussen de ondergetekenden:' }),
    createFieldBlock('Clubnaam'),
    createBlock('text', { content: 'hierna genoemd "de organisatie", enerzijds,' }),
    createBlock('text', { content: 'en' }),
    createFieldBlock('Naam'),
    createFieldBlock('E-mail'),
    createBlock('text', { content: 'hierna genoemd "de vrijwilliger", anderzijds,' }),
    createBlock('divider'),
    createBlock('heading', { content: '2. Voorwerp', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    createFieldBlock('Taak'),
    createFieldBlock('Datum'),
    createFieldBlock('Locatie'),
    createFieldBlock('Uren'),
    createBlock('spacer'),
    createBlock('heading', { content: '3. Wettelijk kader', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...essentialArticles.map(a => createArticleBlock(a)),
    createBlock('spacer'),
    createBlock('heading', { content: '4. Onkostenvergoeding', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    createFieldBlock('Onkostenvergoeding'),
    createFieldBlock('IBAN'),
    createFieldBlock('Rekeninghouder'),
    createBlock('spacer'),
    createBlock('heading', { content: '5. Handtekeningen', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    createBlock('divider'),
    createBlock('signature'),
    createFieldBlock('Datum'),
  ];
};

// ─── Monthly Contract Smart Template ─────────────────────

const getMonthlyContractBlocks = (): ContractBlock[] => {
  const monthlyClausules = ['clausule_maand_duur', 'clausule_maand_rooster', 'clausule_maand_vergoeding', 'clausule_maand_afrekening', 'clausule_maand_cumul', 'clausule_maand_gdpr', 'clausule_maand_identificatie'];
  const essentialArticles = ['art3', 'art4', 'art6', 'art10', 'art8']
    .map(id => belgianVolunteerArticles.find(a => a.id === id))
    .filter(Boolean) as LawArticle[];
  const monthlyArticles = monthlyClausules
    .map(id => belgianVolunteerArticles.find(a => a.id === id))
    .filter(Boolean) as LawArticle[];

  return [
    createBlock('heading', { content: 'Maandelijkse Vrijwilligersovereenkomst' }),
    createBlock('text', { content: 'Conform de Wet van 3 juli 2005 betreffende de rechten van vrijwilligers', style: { fontSize: 11, color: '#6b7280', textAlign: 'center', bold: false, italic: true, underline: false } }),
    createBlock('divider'),
    createBlock('spacer'),

    // Section 1: Parties
    createBlock('heading', { content: '1. Partijen', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    createBlock('text', { content: 'Tussen de ondergetekenden:' }),
    createFieldBlock('Clubnaam'),
    createFieldBlock('Ondernemingsnummer'),
    createBlock('text', { content: 'hierna genoemd "de organisatie", enerzijds,' }),
    createBlock('text', { content: 'en' }),
    // Identification clausule
    ...monthlyArticles.filter(a => a.id === 'clausule_maand_identificatie').map(a => createArticleBlock(a)),
    createBlock('text', { content: 'hierna genoemd "de vrijwilliger", anderzijds,' }),
    createBlock('divider'),

    // Section 2: Duration
    createBlock('heading', { content: '2. Looptijd', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...monthlyArticles.filter(a => a.id === 'clausule_maand_duur').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // Section 3: Tasks & schedule
    createBlock('heading', { content: '3. Taken en rooster', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...monthlyArticles.filter(a => a.id === 'clausule_maand_rooster').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // Section 4: Legal framework
    createBlock('heading', { content: '4. Wettelijk kader', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...essentialArticles.map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // Section 5: Compensation
    createBlock('heading', { content: '5. Kostenvergoeding', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...monthlyArticles.filter(a => a.id === 'clausule_maand_vergoeding').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // Section 6: Monthly settlement
    createBlock('heading', { content: '6. Maandafrekening', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...monthlyArticles.filter(a => a.id === 'clausule_maand_afrekening').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // Section 7: Cumulation & fiscal
    createBlock('heading', { content: '7. Cumulatie en fiscale verplichtingen', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...monthlyArticles.filter(a => a.id === 'clausule_maand_cumul').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // Section 8: Privacy
    createBlock('heading', { content: '8. Gegevensbescherming (AVG/GDPR)', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...monthlyArticles.filter(a => a.id === 'clausule_maand_gdpr').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // Insurance
    createBlock('heading', { content: '9. Verzekering', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...belgianVolunteerArticles.filter(a => a.id === 'clausule_verzekering').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // Final provisions
    createBlock('heading', { content: '10. Slotbepalingen', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    ...belgianVolunteerArticles.filter(a => a.id === 'clausule_slotbepalingen').map(a => createArticleBlock(a)),
    createBlock('spacer'),

    // Signatures
    createBlock('heading', { content: '11. Handtekeningen', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
    createBlock('text', { content: 'Opgemaakt te ........................, op {{Datum}}' }),
    createBlock('divider'),
    createBlock('signature'),
    createFieldBlock('Datum'),
  ];
};

const getDefaultBlocks = (): ContractBlock[] => [
  createBlock('heading', { content: 'Vrijwilligersovereenkomst' }),
  createBlock('divider'),
  createBlock('text', { content: 'Tussen de ondergetekenden:' }),
  createFieldBlock('Clubnaam'),
  createBlock('text', { content: 'hierna genoemd "de organisatie", enerzijds,' }),
  createBlock('text', { content: 'en' }),
  createFieldBlock('Naam'),
  createFieldBlock('E-mail'),
  createBlock('text', { content: 'hierna genoemd "de vrijwilliger", anderzijds,' }),
  createBlock('divider'),
  createBlock('text', { content: 'wordt overeengekomen wat volgt:' }),
  createBlock('spacer'),
  createFieldBlock('Taak'),
  createFieldBlock('Datum'),
  createFieldBlock('Locatie'),
  createFieldBlock('Uren'),
  createBlock('spacer'),
  createBlock('heading', { content: 'Handtekeningen', style: { fontSize: 18, color: '#1a1a1a', textAlign: 'left', bold: true, italic: false, underline: false } }),
  createBlock('divider'),
  createBlock('signature'),
  createFieldBlock('Datum'),
];

// ─── Compliance Check ────────────────────────────────────

interface ComplianceResult {
  passed: boolean;
  warnings: string[];
}

const runComplianceCheck = (blocks: ContractBlock[]): ComplianceResult => {
  const warnings: string[] = [];
  const allContent = blocks.map(b => b.content + (b.note || '')).join(' ').toLowerCase();
  const articleIds = blocks.filter(b => b.type === 'article').map(b => b.articleId);
  const fieldNames = blocks.filter(b => b.type === 'field').map(b => b.fieldName);
  const isMonthly = articleIds.some(id => id?.startsWith('clausule_maand')) || allContent.includes('maandelijks');

  // Check if Art. 4 info is present
  const hasArt4 = articleIds.includes('art4');
  const hasOndernemingsnummer = allContent.includes('ondernemingsnummer') || allContent.includes('{{ondernemingsnummer}}') || fieldNames.includes('Ondernemingsnummer');
  const hasVerzekering = allContent.includes('verzekering') || allContent.includes('{{verzekering_polis}}') || fieldNames.includes('VerzekeringPolis');

  if (!hasArt4 && !hasOndernemingsnummer) {
    warnings.push('Wettelijke check: Vergeet niet de verplichte informatie uit Art. 4 toe te voegen om aan de informatieplicht te voldoen. Het ondernemingsnummer van de club ontbreekt.');
  }
  if (!hasArt4 && !hasVerzekering) {
    warnings.push('Wettelijke check: De verzekeringsgegevens (Art. 6) ontbreken. Een BA-verzekering is wettelijk verplicht.');
  }

  // Check for essential articles
  const missingEssentials = essentialArticleIds.filter(id => !articleIds.includes(id));
  if (missingEssentials.length > 0) {
    const missingNames = missingEssentials.map(id => {
      const a = belgianVolunteerArticles.find(art => art.id === id);
      return a ? `${a.articleNumber} (${a.title})` : id;
    });
    warnings.push(`Aanbevolen artikelen ontbreken: ${missingNames.join(', ')}. Deze worden sterk aanbevolen voor een volledig contract.`);
  }

  // Check for signature block
  if (!blocks.some(b => b.type === 'signature')) {
    warnings.push('Er is geen handtekeningblok toegevoegd.');
  }

  // Monthly-specific checks
  if (isMonthly) {
    if (!articleIds.includes('clausule_maand_vergoeding') && !allContent.includes('maandafrekening')) {
      warnings.push('Maandcontract: De clausule over maandelijkse kostenvergoeding (M3) ontbreekt. Dit is essentieel voor de afrekening.');
    }
    if (!articleIds.includes('clausule_maand_cumul') && !allContent.includes('cumulatie')) {
      warnings.push('Maandcontract: De clausule over cumulatie met uitkeringen en fiscale verplichtingen (M5) ontbreekt. Dit is wettelijk vereist (Art. 11 & 12).');
    }
    if (!articleIds.includes('clausule_maand_gdpr') && !allContent.includes('avg') && !allContent.includes('gdpr')) {
      warnings.push('Maandcontract: De GDPR/AVG-clausule (M6) ontbreekt. Gegevensbescherming is verplicht bij het verwerken van persoonsgegevens.');
    }
    if (!fieldNames.includes('Startdatum') && !fieldNames.includes('Einddatum') && !fieldNames.includes('Maandperiode')) {
      warnings.push('Maandcontract: De looptijd (startdatum/einddatum) is niet gespecificeerd. Voeg de velden Startdatum, Einddatum of Maandperiode toe.');
    }
    if (!fieldNames.includes('IBAN') && !fieldNames.includes('Rekeninghouder')) {
      warnings.push('Maandcontract: Bankgegevens (IBAN/rekeninghouder) ontbreken. Deze zijn nodig voor de maandelijkse uitbetaling.');
    }
  }

  return { passed: warnings.length === 0, warnings };
};

// ─── Component ───────────────────────────────────────────

const ContractBuilder = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('club_id') || '';
  const editTemplateId = searchParams.get('template_id') || '';
  const canvasRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [blocks, setBlocks] = useState<ContractBlock[]>(getDefaultBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'blokken' | 'artikelen'>('blokken');
  const [fieldsOpen, setFieldsOpen] = useState(true);
  const [blocksOpen, setBlocksOpen] = useState(true);
  const [lawArticlesOpen, setLawArticlesOpen] = useState(true);
  const [clausulesOpen, setClausulesOpen] = useState(true);
  const [contractColors, setContractColors] = useState({ primary: '#1a5632', accent: '#e8742e', bg: '#ffffff' });
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [clubData, setClubData] = useState<{ name: string; logo_url: string | null; owner_name: string | null } | null>(null);
  const [clubSignatureUrl, setClubSignatureUrl] = useState<string | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [existingTemplates, setExistingTemplates] = useState<{ id: string; name: string }[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(editTemplateId || null);

  // Auth check + fetch club data + signature
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/club-login');
    });

    if (!clubId) return;

    // Fetch club info + owner name
    supabase.from('clubs').select('name, logo_url, owner_id').eq('id', clubId).single().then(async ({ data }) => {
      if (data) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.owner_id).single();
        setClubData({ name: data.name, logo_url: data.logo_url, owner_name: profile?.full_name || null });
      }
    });

    // Fetch existing templates for this club
    supabase.from('contract_templates').select('id, name, template_data').eq('club_id', clubId).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) {
        setExistingTemplates(data.map(t => ({ id: t.id, name: t.name })));
        // If editing an existing template, load its data
        if (editTemplateId) {
          const tmpl = data.find(t => t.id === editTemplateId);
          if (tmpl && (tmpl as any).template_data) {
            setBlocks((tmpl as any).template_data as ContractBlock[]);
            setTemplateName(tmpl.name);
          }
        }
      }
    });

    // Check for existing club signature
    const sigPath = `${clubId}/signature.png`;
    const { data: sigData } = supabase.storage.from('club-signatures').getPublicUrl(sigPath);
    if (sigData?.publicUrl) {
      fetch(sigData.publicUrl, { method: 'HEAD' }).then(res => {
        if (res.ok) setClubSignatureUrl(sigData.publicUrl);
      }).catch(() => {});
    }
  }, [navigate, clubId, editTemplateId]);

  // Upload club signature (reusable for all contracts)
  const handleSignatureUpload = async (file: File) => {
    if (!clubId) return;
    setUploadingSignature(true);
    try {
      const sigPath = `${clubId}/signature.png`;
      await supabase.storage.from('club-signatures').remove([sigPath]);
      const { error } = await supabase.storage.from('club-signatures').upload(sigPath, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('club-signatures').getPublicUrl(sigPath);
      setClubSignatureUrl(`${data.publicUrl}?t=${Date.now()}`);
      toast.success(t3('Handtekening opgeslagen! Deze wordt hergebruikt voor alle contracten.', 'Signature enregistrée! Elle sera réutilisée pour tous les contrats.', 'Signature saved! It will be reused for all contracts.'));
    } catch (err: any) {
      toast.error(err.message || t3('Handtekening uploaden mislukt', 'Échec du téléchargement de la signature', 'Signature upload failed'));
    }
    setUploadingSignature(false);
  };

  const handleSignatureDelete = async () => {
    if (!clubId) return;
    const sigPath = `${clubId}/signature.png`;
    await supabase.storage.from('club-signatures').remove([sigPath]);
    setClubSignatureUrl(null);
    toast.success(t3('Handtekening verwijderd.', 'Signature supprimée.', 'Signature deleted.'));
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  const lawArticles = belgianVolunteerArticles.filter(a => a.category === 'wet');
  const clausules = belgianVolunteerArticles.filter(a => a.category === 'clausule' && !a.id.startsWith('clausule_maand'));
  const monthlyClausules = belgianVolunteerArticles.filter(a => a.category === 'clausule' && a.id.startsWith('clausule_maand'));

  // ─── Block Operations ──────────────────────────────────

  const addBlock = (type: BlockType) => {
    const block = createBlock(type);
    setBlocks(prev => [...prev, block]);
    setSelectedBlockId(block.id);
  };

  const addArticleBlock = (article: LawArticle) => {
    const block = createArticleBlock(article);
    setBlocks(prev => [...prev, block]);
    setSelectedBlockId(block.id);
  };

  const addFieldBlock = (fieldName: string) => {
    const block = createFieldBlock(fieldName);
    setBlocks(prev => [...prev, block]);
    setSelectedBlockId(block.id);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const updateBlock = (id: string, updates: Partial<ContractBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const updateBlockStyle = (id: string, styleUpdates: Partial<ContractBlock['style']>) => {
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, style: { ...b.style, ...styleUpdates } } : b
    ));
  };

  const handleGenerateSmartDefault = () => {
    if (blocks.length > 3) {
      if (!confirm(t3('Dit vervangt alle huidige blokken. Doorgaan?', 'Cela remplacera tous les blocs actuels. Continuer?', 'This will replace all current blocks. Continue?'))) return;
    }
    setBlocks(getSmartDefaultBlocks());
    setTemplateName(prev => prev || t3('Standaard Vrijwilligerscontract', 'Contrat bénévole standard', 'Standard Volunteer Contract'));
    toast.success(t3('Standaard vrijwilligerscontract gegenereerd met alle essentiële clausules.', 'Contrat bénévole standard généré avec toutes les clauses essentielles.', 'Standard volunteer contract generated with all essential clauses.'));
  };

  const handleGenerateMonthlyContract = () => {
    if (blocks.length > 3) {
      if (!confirm(t3('Dit vervangt alle huidige blokken met een maandcontract. Doorgaan?', 'Cela remplacera tous les blocs par un contrat mensuel. Continuer?', 'This will replace all blocks with a monthly contract. Continue?'))) return;
    }
    setBlocks(getMonthlyContractBlocks());
    setTemplateName(prev => prev || t3('Maandelijkse Vrijwilligersovereenkomst', 'Convention mensuelle de bénévolat', 'Monthly Volunteer Agreement'));
    toast.success(t3('Maandcontract gegenereerd met alle vereiste clausules (looptijd, rooster, afrekening, GDPR, cumulatie).', 'Contrat mensuel généré avec toutes les clauses requises.', 'Monthly contract generated with all required clauses.'));
  };

  const handleLoadTemplate = async (templateId: string) => {
    if (blocks.length > 3) {
      if (!confirm(t3('Dit vervangt alle huidige blokken. Doorgaan?', 'Cela remplacera tous les blocs actuels. Continuer?', 'This will replace all current blocks. Continue?'))) return;
    }
    const { data } = await supabase
      .from('contract_templates')
      .select('id, name, template_data')
      .eq('id', templateId)
      .single();
    if (data && (data as any).template_data) {
      setBlocks((data as any).template_data as ContractBlock[]);
      setTemplateName(data.name);
      setEditingTemplateId(data.id);
      setShowTemplateSelector(false);
      toast.success(t3(`Sjabloon "${data.name}" geladen.`, `Modèle "${data.name}" chargé.`, `Template "${data.name}" loaded.`));
    } else {
      toast.error(t3('Dit sjabloon heeft geen opgeslagen blokstructuur.', 'Ce modèle n\'a pas de structure de blocs enregistrée.', 'This template has no saved block structure.'));
    }
  };

  // ─── Drag & Drop ───────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, data: { type: string; payload?: string }) => {
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverIndex(index);
  };

  const handleCanvasDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      let newBlock: ContractBlock;

      if (data.type === 'article') {
        const article = belgianVolunteerArticles.find(a => a.id === data.payload);
        if (!article) return;
        newBlock = createArticleBlock(article);
      } else if (data.type === 'field') {
        newBlock = createFieldBlock(data.payload || 'Naam');
      } else {
        newBlock = createBlock(data.type as BlockType);
      }

      setBlocks(prev => {
        const updated = [...prev];
        updated.splice(index, 0, newBlock);
        return updated;
      });
      setSelectedBlockId(newBlock.id);
    } catch {}
  };

  const handleLogoUpload = async (blockId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(blockId, { logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  // ─── Save with Compliance Check ───────────────────────

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error(t3('Geef een naam op voor het sjabloon.', 'Veuillez donner un nom au modèle.', 'Please provide a template name.'));
      return;
    }
    if (!clubId) {
      toast.error(t3('Geen club gevonden.', 'Aucun club trouvé.', 'No club found.'));
      return;
    }

    // Run compliance check
    const result = runComplianceCheck(blocks);
    setComplianceResult(result);

    if (!result.passed) {
      const proceed = confirm(
        'Er zijn wettelijke waarschuwingen gevonden:\n\n' +
        result.warnings.join('\n\n') +
        '\n\nWil je toch doorgaan met opslaan?'
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const printEl = printRef.current;
      if (!printEl) throw new Error('Canvas niet gevonden');

      const canvas = await html2canvas(printEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: contractColors.bg,
        width: 794,
        windowWidth: 794,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = -(pdfHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `${templateName.trim()}.pdf`, { type: 'application/pdf' });

      const filePath = `${clubId}/${Date.now()}_${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contract-templates')
        .upload(filePath, pdfFile, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('contract-templates')
        .createSignedUrl(filePath, 300);

      if (!urlData?.signedUrl) throw new Error('Kan download-URL niet ophalen');

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=create-template-from-pdf`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          name: templateName.trim(),
          file_url: urlData.signedUrl,
          club_id: clubId,
          file_path: filePath,
          template_data: blocks,
          ...(editingTemplateId ? { template_id: editingTemplateId } : {}),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Template aanmaken mislukt');

      // If we were editing, also update template_data directly
      if (editingTemplateId) {
        await supabase.from('contract_templates').update({ template_data: blocks as any, name: templateName.trim() }).eq('id', editingTemplateId);
      }

      toast.success(t3('Contractsjabloon succesvol opgeslagen!', 'Modèle de contrat enregistré avec succès!', 'Contract template saved successfully!'));
      navigate('/club-dashboard');
    } catch (err: any) {
      toast.error(err.message || t3('Opslaan mislukt', 'Échec de l\'enregistrement', 'Save failed'));
    }
    setSaving(false);
  };

  // ─── Sidebar: Article Item ─────────────────────────────

  const ArticleItem = ({ article }: { article: LawArticle }) => {
    const isEssential = essentialArticleIds.includes(article.id);
    return (
      <div
        draggable
        onDragStart={e => handleDragStart(e, { type: 'article', payload: article.id })}
        onClick={() => addArticleBlock(article)}
        className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing hover:bg-muted/60 transition-colors border border-transparent hover:border-border group"
      >
        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors ${isEssential ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary/10 text-primary'}`}>
          {article.category === 'wet' ? <Scale className="w-3.5 h-3.5" /> : <Gavel className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">{article.articleNumber}</p>
            {isEssential && (
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 hover:bg-green-100">
                Aanbevolen
              </Badge>
            )}
          </div>
          <p className="text-[11px] font-medium text-foreground leading-tight">{article.title}</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{article.summary}</p>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <ClubPageLayout>
      {/* Action bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative">
          <button
            onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-input bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {editingTemplateId ? t3('Sjabloon laden', 'Charger un modèle', 'Load template') : t3('Bestaand sjabloon', 'Modèle existant', 'Existing template')}
          </button>
          {showTemplateSelector && existingTemplates.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="p-2 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground px-2">{t3('Opgeslagen sjablonen', 'Modèles enregistrés', 'Saved templates')}</p>
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {existingTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleLoadTemplate(t.id)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors ${editingTemplateId === t.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {showTemplateSelector && existingTemplates.length === 0 && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-lg z-50 p-4">
              <p className="text-xs text-muted-foreground text-center">{t3('Geen opgeslagen sjablonen.', 'Aucun modèle enregistré.', 'No saved templates.')}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleGenerateSmartDefault}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
           {t3('Standaard Contract', 'Contrat standard', 'Standard Contract')}
        </button>
        <button
          onClick={handleGenerateMonthlyContract}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          {t3('Maandcontract', 'Contrat mensuel', 'Monthly Contract')}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder={t3('Naam sjabloon...', 'Nom du modèle...', 'Template name...')}
            className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm w-48 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSave}
            disabled={saving || !templateName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? t3('Opslaan...', 'Enregistrement...', 'Saving...') : editingTemplateId ? t3('Bijwerken', 'Mettre à jour', 'Update') : t3('Opslaan', 'Enregistrer', 'Save')}
          </button>
        </div>
      </div>

      {/* Compliance warnings banner */}
      {complianceResult && !complianceResult.passed && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {complianceResult.warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-800 dark:text-yellow-300">{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar ─── */}
        <aside className="w-80 border-r border-border bg-card overflow-hidden shrink-0 hidden md:flex md:flex-col">
          {/* Smart default buttons */}
          <div className="p-3 border-b border-border space-y-1.5">
            <button
              onClick={handleGenerateSmartDefault}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t3('Standaard Contract', 'Contrat standard', 'Standard Contract')}
            </button>
            <button
              onClick={handleGenerateMonthlyContract}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {t3('Maandcontract (compleet)', 'Contrat mensuel (complet)', 'Monthly Contract (complete)')}
            </button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="blokken" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-3 mt-3 mb-0 grid grid-cols-2">
              <TabsTrigger value="blokken" className="text-xs">
                <FileText className="w-3.5 h-3.5 mr-1" />
                {t3('Bouwblokken', 'Blocs', 'Building Blocks')}
              </TabsTrigger>
              <TabsTrigger value="artikelen" className="text-xs">
                <BookOpen className="w-3.5 h-3.5 mr-1" />
                {t3('Wettelijke Artikelen', 'Articles juridiques', 'Legal Articles')}
              </TabsTrigger>
            </TabsList>

            {/* Tab: Bouwblokken */}
            <TabsContent value="blokken" className="flex-1 overflow-y-auto p-3 space-y-1 mt-0">
              {/* Content Blocks */}
              <button onClick={() => setBlocksOpen(!blocksOpen)} className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                {blocksOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t3('Inhoudblokken', 'Blocs de contenu', 'Content Blocks')}
              </button>
              <AnimatePresence>
                {blocksOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 overflow-hidden">
                    {paletteBlocks.map(item => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={e => handleDragStart(e, { type: item.type })}
                        onClick={() => addBlock(item.type)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing hover:bg-muted/60 transition-colors border border-transparent hover:border-border group"
                      >
                        <div className="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Merge Fields */}
              <button onClick={() => setFieldsOpen(!fieldsOpen)} className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mt-3">
                {fieldsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t3('Invulvelden', 'Champs de fusion', 'Merge Fields')}
              </button>
              <AnimatePresence>
                {fieldsOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-0.5 overflow-hidden">
                    {/* Basic fields */}
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">{t3('Basis', 'Base', 'Basic')}</p>
                    {mergeFields.filter(f => f.group === 'basic').map(field => (
                      <div
                        key={field.name}
                        draggable
                        onDragStart={e => handleDragStart(e, { type: 'field', payload: field.name })}
                        onClick={() => addFieldBlock(field.name)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing hover:bg-muted/60 transition-colors border border-transparent hover:border-border group"
                      >
                        <div className="p-1.5 rounded-lg bg-accent/10 text-accent-foreground group-hover:text-primary transition-colors">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{`{{${field.name}}}`}</p>
                        </div>
                      </div>
                    ))}
                    {/* Monthly fields */}
                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider px-3 pt-3 pb-1 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> {t3('Maandcontract', 'Contrat mensuel', 'Monthly Contract')}
                    </p>
                    {mergeFields.filter(f => f.group === 'monthly').map(field => (
                      <div
                        key={field.name}
                        draggable
                        onDragStart={e => handleDragStart(e, { type: 'field', payload: field.name })}
                        onClick={() => addFieldBlock(field.name)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 group"
                      >
                        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{`{{${field.name}}}`}</p>
                        </div>
                      </div>
                    ))}
                    {/* Identity fields */}
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1">{t3('Identificatie & juridisch', 'Identification & juridique', 'Identification & Legal')}</p>
                    {mergeFields.filter(f => f.group === 'identity').map(field => (
                      <div
                        key={field.name}
                        draggable
                        onDragStart={e => handleDragStart(e, { type: 'field', payload: field.name })}
                        onClick={() => addFieldBlock(field.name)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing hover:bg-muted/60 transition-colors border border-transparent hover:border-border group"
                      >
                        <div className="p-1.5 rounded-lg bg-accent/10 text-accent-foreground group-hover:text-primary transition-colors">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{`{{${field.name}}}`}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Tab: Wettelijke Artikelen */}
            <TabsContent value="artikelen" className="flex-1 overflow-y-auto p-3 space-y-1 mt-0">
              {/* Info banner */}
              <div className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-2">
                <p className="text-[10px] text-green-700 dark:text-green-400 leading-relaxed">
                  <ShieldCheck className="w-3 h-3 inline mr-1 -mt-0.5" />
                  {t3('Artikelen met een', 'Les articles avec un', 'Articles with a')} <strong>{t3('groen label', 'label vert', 'green label')}</strong> {t3('zijn essentieel volgens de Vrijwilligerswet en worden aanbevolen in elk contract.', 'sont essentiels selon la Loi sur le bénévolat et recommandés dans chaque contrat.', 'are essential under the Volunteer Act and recommended in every contract.')}
                </p>
              </div>

              {/* Wetsartikelen */}
              <button onClick={() => setLawArticlesOpen(!lawArticlesOpen)} className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                {lawArticlesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Scale className="w-3 h-3" />
                {t3('Wetsartikelen (Wet 3 juli 2005)', 'Articles de loi (Loi du 3 juillet 2005)', 'Law Articles (Act of July 3, 2005)')}
              </button>
              <AnimatePresence>
                {lawArticlesOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 overflow-hidden">
                    {lawArticles.map(article => (
                      <ArticleItem key={article.id} article={article} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Contractclausules */}
              <button onClick={() => setClausulesOpen(!clausulesOpen)} className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mt-3">
                {clausulesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Gavel className="w-3 h-3" />
                {t3('Contractclausules', 'Clauses contractuelles', 'Contract Clauses')}
              </button>
              <AnimatePresence>
                {clausulesOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 overflow-hidden">
                    {clausules.map(article => (
                      <ArticleItem key={article.id} article={article} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Maandcontract clausules */}
              {monthlyClausules.length > 0 && (
                <>
                  <div className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-3">
                    <CalendarDays className="w-3 h-3" />
                    {t3('Maandcontract clausules', 'Clauses contrat mensuel', 'Monthly Contract Clauses')}
                  </div>
                  <div className="space-y-1">
                    {monthlyClausules.map(article => (
                      <ArticleItem key={article.id} article={article} />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </aside>

        {/* ─── Center: Canvas ─── */}
        <div className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-8">
          {/* Format Toolbar */}
          {selectedBlock && (selectedBlock.type === 'heading' || selectedBlock.type === 'text') && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-1 flex-wrap bg-card rounded-xl border border-border p-2 shadow-sm"
            >
              <button onClick={() => updateBlockStyle(selectedBlock.id, { bold: !selectedBlock.style.bold })} className={`p-2 rounded-lg transition-colors ${selectedBlock.style.bold ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                <Bold className="w-4 h-4" />
              </button>
              <button onClick={() => updateBlockStyle(selectedBlock.id, { italic: !selectedBlock.style.italic })} className={`p-2 rounded-lg transition-colors ${selectedBlock.style.italic ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                <Italic className="w-4 h-4" />
              </button>
              <button onClick={() => updateBlockStyle(selectedBlock.id, { underline: !selectedBlock.style.underline })} className={`p-2 rounded-lg transition-colors ${selectedBlock.style.underline ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                <Underline className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              {(['left', 'center', 'right', 'justify'] as const).map(align => (
                <button key={align} onClick={() => updateBlockStyle(selectedBlock.id, { textAlign: align })} className={`p-2 rounded-lg transition-colors ${selectedBlock.style.textAlign === align ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  {align === 'left' && <AlignLeft className="w-4 h-4" />}
                  {align === 'center' && <AlignCenter className="w-4 h-4" />}
                  {align === 'right' && <AlignRight className="w-4 h-4" />}
                  {align === 'justify' && <AlignJustify className="w-4 h-4" />}
                </button>
              ))}
              <div className="w-px h-6 bg-border mx-1" />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Grootte:</span>
                <input type="number" value={selectedBlock.style.fontSize} onChange={e => updateBlockStyle(selectedBlock.id, { fontSize: parseInt(e.target.value) || 14 })} className="w-14 px-2 py-1 rounded-lg border border-input bg-background text-foreground text-xs" min={8} max={72} />
              </label>
              <div className="w-px h-6 bg-border mx-1" />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Palette className="w-3.5 h-3.5" />
                <input type="color" value={selectedBlock.style.color} onChange={e => updateBlockStyle(selectedBlock.id, { color: e.target.value })} className="w-6 h-6 rounded border border-input cursor-pointer" />
              </label>
            </motion.div>
          )}

          {/* Contract Colors */}
          <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
            <label className="flex items-center gap-1.5">
              Achtergrond:
              <input type="color" value={contractColors.bg} onChange={e => setContractColors(prev => ({ ...prev, bg: e.target.value }))} className="w-6 h-6 rounded border border-input cursor-pointer" />
            </label>
            <label className="flex items-center gap-1.5">
              Primair:
              <input type="color" value={contractColors.primary} onChange={e => setContractColors(prev => ({ ...prev, primary: e.target.value }))} className="w-6 h-6 rounded border border-input cursor-pointer" />
            </label>
            <label className="flex items-center gap-1.5">
              Accent:
              <input type="color" value={contractColors.accent} onChange={e => setContractColors(prev => ({ ...prev, accent: e.target.value }))} className="w-6 h-6 rounded border border-input cursor-pointer" />
            </label>
          </div>

          {/* A4 Canvas */}
          <div ref={canvasRef} className="mx-auto shadow-xl rounded-lg overflow-hidden" style={{ maxWidth: 794, backgroundColor: contractColors.bg }}>
            <div ref={printRef} style={{ padding: '48px 56px', minHeight: 1123, backgroundColor: contractColors.bg }}>
              <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-1">
                {blocks.map((block, index) => (
                  <Reorder.Item
                    key={block.id}
                    value={block}
                    className="relative"
                    onDragOver={e => handleCanvasDragOver(e, index)}
                    onDrop={e => handleCanvasDrop(e, index)}
                  >
                    {dragOverIndex === index && (
                      <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full z-10" />
                    )}

                    <div
                      className={`group relative rounded-lg transition-all ${
                        selectedBlockId === block.id ? 'ring-2 ring-primary/40 bg-primary/5' : 'hover:ring-1 hover:ring-border'
                      }`}
                      onClick={() => setSelectedBlockId(block.id)}
                    >
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-0.5">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      </div>
                      <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); removeBlock(block.id); }} className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Block Content */}
                      {block.type === 'heading' && (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => updateBlock(block.id, { content: e.currentTarget.textContent || '' })}
                          style={{
                            fontSize: block.style.fontSize, color: block.style.color || contractColors.primary,
                            textAlign: block.style.textAlign, fontWeight: block.style.bold ? 'bold' : 'normal',
                            fontStyle: block.style.italic ? 'italic' : 'normal',
                            textDecoration: block.style.underline ? 'underline' : 'none',
                            padding: '8px 4px', outline: 'none', lineHeight: 1.3, fontFamily: '"Space Grotesk", sans-serif',
                          }}
                        >
                          {block.content}
                        </div>
                      )}

                      {block.type === 'text' && (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => updateBlock(block.id, { content: e.currentTarget.innerHTML })}
                          dangerouslySetInnerHTML={{ __html: block.content }}
                          style={{
                            fontSize: block.style.fontSize, color: block.style.color,
                            textAlign: block.style.textAlign, fontWeight: block.style.bold ? 'bold' : 'normal',
                            fontStyle: block.style.italic ? 'italic' : 'normal',
                            textDecoration: block.style.underline ? 'underline' : 'none',
                            padding: '6px 4px', outline: 'none', lineHeight: 1.6, fontFamily: '"Plus Jakarta Sans", sans-serif',
                          }}
                        />
                      )}

                      {block.type === 'article' && (
                        <div className="p-3 rounded-lg" style={{ borderLeft: `3px solid ${contractColors.primary}`, backgroundColor: `${contractColors.primary}08` }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: contractColors.primary, marginBottom: 4, fontFamily: '"Space Grotesk", sans-serif' }}>
                            {block.articleTitle}
                          </p>
                          <p style={{ fontSize: block.style.fontSize, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                            {block.content}
                          </p>
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={e => updateBlock(block.id, { note: e.currentTarget.textContent || '' })}
                            data-placeholder="Voeg hier een eigen toelichting toe..."
                            className="mt-2 text-xs outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:italic"
                            style={{
                              color: contractColors.accent, fontStyle: 'italic',
                              borderTop: `1px dashed ${contractColors.primary}40`, paddingTop: 8, minHeight: 20,
                              fontFamily: '"Plus Jakarta Sans", sans-serif',
                            }}
                          >
                            {block.note}
                          </div>
                        </div>
                      )}

                      {block.type === 'field' && (
                        <div className="flex items-center gap-3 py-2 px-1" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                          <span style={{ fontSize: 13, color: '#6b7280', minWidth: 140 }}>
                            {mergeFields.find(f => f.name === block.fieldName)?.label || block.fieldName}:
                          </span>
                          <div className="flex-1 border-b-2 px-2 py-1" style={{ borderColor: `${contractColors.primary}40`, fontSize: 14, color: contractColors.primary, fontWeight: 500 }}>
                            {block.fieldName === 'Clubnaam' && clubData?.name
                              ? clubData.name
                              : block.fieldName === 'Datum'
                              ? <span className="text-muted-foreground italic text-xs">Wordt automatisch ingevuld</span>
                              : <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 12 }}>Wordt automatisch ingevuld</span>}
                          </div>
                        </div>
                      )}

                      {block.type === 'logo' && (
                        <div className="py-3 text-center">
                          {block.logoUrl ? (
                            <img src={block.logoUrl} alt="Logo" className="max-h-24 mx-auto object-contain" />
                          ) : clubData?.logo_url ? (
                            <img src={clubData.logo_url} alt="Club Logo" className="max-h-24 mx-auto object-contain" />
                          ) : (
                            <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
                              <Image className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Logo uploaden</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleLogoUpload(block.id, e.target.files[0]); }} />
                            </label>
                          )}
                        </div>
                      )}

                      {block.type === 'divider' && (
                        <div className="py-2">
                          <hr style={{ borderColor: `${contractColors.primary}30` }} />
                        </div>
                      )}

                      {block.type === 'spacer' && <div className="h-8" />}

                      {block.type === 'signature' && (
                        <div className="py-4 px-1">
                          <div className="flex gap-12">
                            <div className="flex-1">
                              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{clubData?.name || '{{Clubnaam}}'} — {clubData?.owner_name || 'Verantwoordelijke'}:</p>
                              {clubSignatureUrl ? (
                                <div className="mb-2">
                                  <img src={clubSignatureUrl} alt="Handtekening organisatie" className="max-h-16 object-contain" />
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border cursor-pointer hover:border-primary/40 transition-colors text-[10px] text-muted-foreground">
                                      <PenTool className="w-3 h-3" />
                                      Wijzigen
                                      <input type="file" accept="image/*" className="hidden" disabled={uploadingSignature} onChange={e => { if (e.target.files?.[0]) handleSignatureUpload(e.target.files[0]); }} />
                                    </label>
                                    <button
                                      onClick={handleSignatureDelete}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-[10px]"
                                    >
                                      <X className="w-3 h-3" />
                                      Verwijderen
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div style={{ marginBottom: 40 }} />
                                  <div style={{ borderBottom: `2px solid ${contractColors.primary}`, width: '80%' }} />
                                  <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                    {clubData?.name || 'Naam'} + datum
                                  </p>
                                  <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors text-[10px] text-muted-foreground">
                                    <PenTool className="w-3 h-3" />
                                    {uploadingSignature ? 'Uploaden...' : 'Handtekening uploaden (herbruikbaar)'}
                                    <input type="file" accept="image/*" className="hidden" disabled={uploadingSignature} onChange={e => { if (e.target.files?.[0]) handleSignatureUpload(e.target.files[0]); }} />
                                  </label>
                                </>
                              )}
                            </div>
                            <div className="flex-1">
                              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 40, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>De vrijwilliger:</p>
                              <div style={{ borderBottom: `2px solid ${contractColors.primary}`, width: '80%' }} />
                              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Naam + handtekening</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {/* Drop zone at bottom */}
              <div
                className={`mt-4 py-6 border-2 border-dashed rounded-xl text-center transition-colors ${
                  dragOverIndex === blocks.length ? 'border-primary bg-primary/5' : 'border-transparent'
                }`}
                onDragOver={e => handleCanvasDragOver(e, blocks.length)}
                onDrop={e => handleCanvasDrop(e, blocks.length)}
              >
                <p className="text-xs text-muted-foreground">Sleep een blok hierheen om toe te voegen</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClubPageLayout>
  );
};

export default ContractBuilder;
