import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ArrowLeft, Save, Type, AlignLeft, Image, Minus, Space, PenTool,
  Bold, Italic, Underline, AlignCenter, AlignRight, AlignJustify,
  Palette, GripVertical, Trash2, Plus, Scale, FileText, Loader2,
  ChevronDown, ChevronRight, BookOpen, Hash, Edit3
} from 'lucide-react';
import { belgianVolunteerArticles, LawArticle } from '@/data/belgianVolunteerLaw';
import Logo from '@/components/Logo';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ─── Block Types ─────────────────────────────────────────

type BlockType = 'heading' | 'text' | 'article' | 'field' | 'logo' | 'divider' | 'spacer' | 'signature';

interface ContractBlock {
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

// ─── Palette Items ───────────────────────────────────────

interface PaletteItem {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const paletteBlocks: PaletteItem[] = [
  { type: 'heading', label: 'Koptekst', icon: <Type className="w-4 h-4" />, description: 'Titel of sectiekop' },
  { type: 'text', label: 'Vrije tekst', icon: <AlignLeft className="w-4 h-4" />, description: 'Bewerkbaar tekstblok' },
  { type: 'logo', label: 'Logo', icon: <Image className="w-4 h-4" />, description: 'Upload een clublogo' },
  { type: 'divider', label: 'Scheidingslijn', icon: <Minus className="w-4 h-4" />, description: 'Horizontale lijn' },
  { type: 'spacer', label: 'Witruimte', icon: <Space className="w-4 h-4" />, description: 'Extra verticale ruimte' },
  { type: 'signature', label: 'Handtekening', icon: <PenTool className="w-4 h-4" />, description: 'Handtekeningveld' },
];

const mergeFields = [
  { name: 'Naam', label: 'Naam vrijwilliger' },
  { name: 'E-mail', label: 'E-mailadres' },
  { name: 'Telefoon', label: 'Telefoonnummer' },
  { name: 'IBAN', label: 'IBAN rekeningnummer' },
  { name: 'Rekeninghouder', label: 'Naam rekeninghouder' },
  { name: 'Clubnaam', label: 'Naam organisatie' },
  { name: 'Taak', label: 'Naam taak/opdracht' },
  { name: 'Datum', label: 'Datum' },
  { name: 'Locatie', label: 'Locatie' },
  { name: 'Uren', label: 'Werkuren' },
  { name: 'Onkostenvergoeding', label: 'Bedrag vergoeding' },
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
  style: {
    fontSize: 12,
    color: '#1a1a1a',
    textAlign: 'left',
    bold: false,
    italic: false,
    underline: false,
  },
});

const createFieldBlock = (fieldName: string): ContractBlock => ({
  id: genId(),
  type: 'field',
  content: '',
  fieldName,
  style: {
    fontSize: 14,
    color: '#1a1a1a',
    textAlign: 'left',
    bold: false,
    italic: false,
    underline: false,
  },
});

// ─── Default Contract ────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────

const ContractBuilder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('club_id') || '';
  const canvasRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [blocks, setBlocks] = useState<ContractBlock[]>(getDefaultBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [articlesOpen, setArticlesOpen] = useState(true);
  const [fieldsOpen, setFieldsOpen] = useState(true);
  const [blocksOpen, setBlocksOpen] = useState(true);
  const [contractColors, setContractColors] = useState({ primary: '#1a5632', accent: '#e8742e', bg: '#ffffff' });

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/club-login');
    });
  }, [navigate]);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

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

  // ─── Logo Upload ───────────────────────────────────────

  const handleLogoUpload = async (blockId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(blockId, { logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  // ─── Save as PDF + DocuSeal Template ───────────────────

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Geef een naam op voor het sjabloon.');
      return;
    }
    if (!clubId) {
      toast.error('Geen club gevonden.');
      return;
    }

    setSaving(true);
    try {
      const printEl = printRef.current;
      if (!printEl) throw new Error('Canvas niet gevonden');

      // Render to canvas
      const canvas = await html2canvas(printEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: contractColors.bg,
        width: 794, // A4 at 96 DPI
        windowWidth: 794,
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Handle multi-page
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

      // Convert to blob
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `${templateName.trim()}.pdf`, { type: 'application/pdf' });

      // Upload to storage
      const filePath = `${clubId}/${Date.now()}_${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contract-templates')
        .upload(filePath, pdfFile, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('contract-templates')
        .createSignedUrl(filePath, 300);

      if (!urlData?.signedUrl) throw new Error('Kan download-URL niet ophalen');

      // Call DocuSeal edge function
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
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Template aanmaken mislukt');

      toast.success('Contractsjabloon succesvol opgeslagen!');
      navigate('/club-dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Opslaan mislukt');
    }
    setSaving(false);
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/club-dashboard')}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Logo size="sm" showText={false} />
            <div className="hidden sm:block">
              <p className="text-sm font-heading font-semibold text-foreground">Contract Builder</p>
              <p className="text-[11px] text-muted-foreground">Drag & drop contractbouwer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="Naam sjabloon..."
              className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm w-48 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSave}
              disabled={saving || !templateName.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar: Block Palette ─── */}
        <aside className="w-72 border-r border-border bg-card overflow-y-auto shrink-0 hidden md:block">
          <div className="p-3 space-y-1">

            {/* Content Blocks */}
            <button onClick={() => setBlocksOpen(!blocksOpen)} className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              {blocksOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Inhoudblokken
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
              Invulvelden
            </button>
            <AnimatePresence>
              {fieldsOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 overflow-hidden">
                  {mergeFields.map(field => (
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

            {/* Belgian Law Articles */}
            <button onClick={() => setArticlesOpen(!articlesOpen)} className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mt-3">
              {articlesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <BookOpen className="w-3 h-3" />
              Vrijwilligerswet
            </button>
            <AnimatePresence>
              {articlesOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1 overflow-hidden">
                  {belgianVolunteerArticles.map(article => (
                    <div
                      key={article.id}
                      draggable
                      onDragStart={e => handleDragStart(e, { type: 'article', payload: article.id })}
                      onClick={() => addArticleBlock(article)}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing hover:bg-muted/60 transition-colors border border-transparent hover:border-border group"
                    >
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                        <Scale className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{article.articleNumber}</p>
                        <p className="text-[11px] font-medium text-foreground">{article.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{article.summary}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
              <button
                onClick={() => updateBlockStyle(selectedBlock.id, { bold: !selectedBlock.style.bold })}
                className={`p-2 rounded-lg transition-colors ${selectedBlock.style.bold ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateBlockStyle(selectedBlock.id, { italic: !selectedBlock.style.italic })}
                className={`p-2 rounded-lg transition-colors ${selectedBlock.style.italic ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateBlockStyle(selectedBlock.id, { underline: !selectedBlock.style.underline })}
                className={`p-2 rounded-lg transition-colors ${selectedBlock.style.underline ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Underline className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              {(['left', 'center', 'right', 'justify'] as const).map(align => (
                <button
                  key={align}
                  onClick={() => updateBlockStyle(selectedBlock.id, { textAlign: align })}
                  className={`p-2 rounded-lg transition-colors ${selectedBlock.style.textAlign === align ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  {align === 'left' && <AlignLeft className="w-4 h-4" />}
                  {align === 'center' && <AlignCenter className="w-4 h-4" />}
                  {align === 'right' && <AlignRight className="w-4 h-4" />}
                  {align === 'justify' && <AlignJustify className="w-4 h-4" />}
                </button>
              ))}
              <div className="w-px h-6 bg-border mx-1" />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Grootte:</span>
                <input
                  type="number"
                  value={selectedBlock.style.fontSize}
                  onChange={e => updateBlockStyle(selectedBlock.id, { fontSize: parseInt(e.target.value) || 14 })}
                  className="w-14 px-2 py-1 rounded-lg border border-input bg-background text-foreground text-xs"
                  min={8}
                  max={72}
                />
              </label>
              <div className="w-px h-6 bg-border mx-1" />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Palette className="w-3.5 h-3.5" />
                <input
                  type="color"
                  value={selectedBlock.style.color}
                  onChange={e => updateBlockStyle(selectedBlock.id, { color: e.target.value })}
                  className="w-6 h-6 rounded border border-input cursor-pointer"
                />
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
          <div
            ref={canvasRef}
            className="mx-auto shadow-xl rounded-lg overflow-hidden"
            style={{ maxWidth: 794, backgroundColor: contractColors.bg }}
          >
            <div ref={printRef} style={{ padding: '48px 56px', minHeight: 1123, backgroundColor: contractColors.bg }}>
              <Reorder.Group
                axis="y"
                values={blocks}
                onReorder={setBlocks}
                className="space-y-1"
              >
                {blocks.map((block, index) => (
                  <Reorder.Item
                    key={block.id}
                    value={block}
                    className="relative"
                    onDragOver={e => handleCanvasDragOver(e, index)}
                    onDrop={e => handleCanvasDrop(e, index)}
                  >
                    {/* Drop indicator */}
                    {dragOverIndex === index && (
                      <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full z-10" />
                    )}

                    <div
                      className={`group relative rounded-lg transition-all ${
                        selectedBlockId === block.id
                          ? 'ring-2 ring-primary/40 bg-primary/5'
                          : 'hover:ring-1 hover:ring-border'
                      }`}
                      onClick={() => setSelectedBlockId(block.id)}
                    >
                      {/* Block controls */}
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-0.5">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      </div>
                      <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* ─── Block Content Rendering ─── */}
                      {block.type === 'heading' && (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => updateBlock(block.id, { content: e.currentTarget.textContent || '' })}
                          style={{
                            fontSize: block.style.fontSize,
                            color: block.style.color || contractColors.primary,
                            textAlign: block.style.textAlign,
                            fontWeight: block.style.bold ? 'bold' : 'normal',
                            fontStyle: block.style.italic ? 'italic' : 'normal',
                            textDecoration: block.style.underline ? 'underline' : 'none',
                            padding: '8px 4px',
                            outline: 'none',
                            lineHeight: 1.3,
                            fontFamily: '"Space Grotesk", sans-serif',
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
                            fontSize: block.style.fontSize,
                            color: block.style.color,
                            textAlign: block.style.textAlign,
                            fontWeight: block.style.bold ? 'bold' : 'normal',
                            fontStyle: block.style.italic ? 'italic' : 'normal',
                            textDecoration: block.style.underline ? 'underline' : 'none',
                            padding: '6px 4px',
                            outline: 'none',
                            lineHeight: 1.6,
                            fontFamily: '"Plus Jakarta Sans", sans-serif',
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
                          {/* Editable note */}
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={e => updateBlock(block.id, { note: e.currentTarget.textContent || '' })}
                            data-placeholder="Voeg hier een eigen toelichting toe..."
                            className="mt-2 text-xs outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:italic"
                            style={{
                              color: contractColors.accent,
                              fontStyle: 'italic',
                              borderTop: `1px dashed ${contractColors.primary}40`,
                              paddingTop: 8,
                              minHeight: 20,
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
                          <div
                            className="flex-1 border-b-2 px-2 py-1"
                            style={{ borderColor: `${contractColors.primary}40`, fontSize: 14, color: contractColors.primary, fontWeight: 500 }}
                          >
                            {`{{${block.fieldName}}}`}
                          </div>
                        </div>
                      )}

                      {block.type === 'logo' && (
                        <div className="py-3 text-center">
                          {block.logoUrl ? (
                            <img src={block.logoUrl} alt="Logo" className="max-h-24 mx-auto object-contain" />
                          ) : (
                            <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
                              <Image className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Logo uploaden</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  if (e.target.files?.[0]) handleLogoUpload(block.id, e.target.files[0]);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )}

                      {block.type === 'divider' && (
                        <div className="py-2">
                          <hr style={{ borderColor: `${contractColors.primary}30` }} />
                        </div>
                      )}

                      {block.type === 'spacer' && (
                        <div className="h-8" />
                      )}

                      {block.type === 'signature' && (
                        <div className="py-4 px-1">
                          <div className="flex gap-12">
                            <div className="flex-1">
                              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 40, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                De organisatie:
                              </p>
                              <div style={{ borderBottom: `2px solid ${contractColors.primary}`, width: '80%' }} />
                              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                Naam + datum
                              </p>
                            </div>
                            <div className="flex-1">
                              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 40, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                De vrijwilliger:
                              </p>
                              <div style={{ borderBottom: `2px solid ${contractColors.primary}`, width: '80%' }} />
                              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                                {`{{Handtekening}}`}
                              </p>
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
    </div>
  );
};

export default ContractBuilder;
