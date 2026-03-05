import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus, Trash2, GripVertical, Sparkles, BookOpen, Video, FileText, Image as ImageIcon,
  ChevronDown, ChevronUp, Eye, EyeOff, Loader2, ArrowLeft, Award, Save, Users,
  HelpCircle, Copy, Type, Heading1, Heading2, Minus, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Palette, Youtube, Upload, ToggleLeft, ToggleRight, CheckSquare, Square,
  Wand2, Bot, MessageSquare, CalendarDays, MapPin, UserCheck, QrCode, Send
} from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Language } from '@/i18n/translations';

// ── Types ──
interface Training {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
  certificate_design_id: string | null;
}

interface ContentBlockStyle {
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  color?: string;
  bgColor?: string;
}

interface ContentBlock {
  id: string;
  type: 'heading' | 'subheading' | 'text' | 'video' | 'image' | 'divider';
  value: string;
  style?: ContentBlockStyle;
}

interface TrainingModule {
  id: string;
  training_id: string;
  title: string;
  content_type: string;
  content_body: string | null;
  content_url: string | null;
  sort_order: number;
  blocks: ContentBlock[];
  expanded: boolean;
}

interface QuizQuestion {
  id?: string;
  quiz_id?: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  sort_order: number;
}

interface Quiz {
  id: string;
  training_id: string;
  module_id?: string | null;
  passing_score: number;
  total_questions: number;
  is_practice?: boolean;
}

interface ModuleQuizData {
  quiz: Quiz | null;
  questions: QuizQuestion[];
  passingScore: number;
  isPractice: boolean;
}

interface Certificate {
  id: string;
  volunteer_id: string;
  training_id: string;
  issue_date: string;
  score: number | null;
  type: string;
}

// ── Labels ──
const labels = {
  nl: {
    title: 'Academy Builder', back: 'Terug', newTraining: 'Nieuwe training',
    trainingTitle: 'Titel', trainingDesc: 'Beschrijving', modules: 'Modules',
    addModule: 'Module toevoegen', text: 'Tekst', video: 'Video', image: 'Foto',
    heading: 'Titel', subheading: 'Subtitel', divider: 'Scheidingslijn',
    moduleTitle: 'Module titel', content: 'Inhoud', videoUrl: 'YouTube of video URL',
    imageUrl: 'Afbeelding URL', addBlock: 'Sleep of klik om toe te voegen',
    quiz: 'Globale Quiz (Certificaat)', moduleQuiz: 'Module Quiz',
    addModuleQuiz: 'Mini-quiz toevoegen', removeModuleQuiz: 'Mini-quiz verwijderen',
    generateAI: 'Genereer met AI', generating: 'AI genereert...',
    passingScore: 'Minimumscore', addQuestion: 'Vraag toevoegen',
    question: 'Vraag', option: 'Optie', correctAnswer: 'Correct antwoord',
    save: 'Alles opslaan', saving: 'Opslaan...', publish: 'Publiceren',
    unpublish: 'Verbergen', published: 'Gepubliceerd', draft: 'Concept',
    delete: 'Verwijderen', deleteConfirm: 'Weet je zeker dat je deze training wilt verwijderen?',
    noTrainings: 'Nog geen trainingen. Maak je eerste training!',
    certificates: 'Certificaten', issueCert: 'Certificaat uitreiken',
    physicalTraining: 'Fysiek certificaat', selectVolunteer: 'Selecteer vrijwilliger',
    saved: 'Training opgeslagen!', deleted: 'Training verwijderd.',
    certIssued: 'Certificaat uitgereikt!', quizGenerated: 'Quiz vragen gegenereerd!',
    dragHint: 'Sleep modules om de volgorde te wijzigen', contentBlocks: 'Inhoud blokken',
    emptyModule: 'Sleep blokken hierheen om je module op te bouwen',
    moduleCount: 'modules', questionCount: 'vragen',
    collapse: 'Inklappen', expand: 'Uitklappen', duplicateModule: 'Dupliceer module',
    practiceOnly: 'Alleen oefening', countsForCert: 'Telt mee voor certificaat',
    quizType: 'Quiz type', blockPalette: 'Blokken',
    styling: 'Opmaak', fontSize: 'Tekstgrootte', alignment: 'Uitlijning',
    youtubeHint: 'Plak een YouTube link of video URL',
    dropHere: 'Sleep hier',
    aiAssistant: 'AI Assistent', aiTopic: 'Waar gaat de training over?',
    aiExtraInstructions: 'Extra instructies (optioneel)', aiNumModules: 'Aantal modules',
    aiGenerate: 'Training genereren', aiGenerating: 'AI genereert training...',
    aiDescription: 'Beschrijf het onderwerp en AI maakt een volledige training met modules, tekst en afbeeldingen.',
    aiSuccess: 'AI training gegenereerd! Modules zijn toegevoegd.',
    aiReplace: 'Bestaande modules vervangen', aiAppend: 'Toevoegen aan bestaande modules',
    // Training events
    trainingEvents: 'Fysieke trainingen', createEvent: 'Nieuw trainingsmoment',
    eventDate: 'Datum', eventLocation: 'Locatie', eventDesc: 'Beschrijving',
    signups: 'Inschrijvingen', checkedIn: 'Ingecheckt', awardCerts: 'Certificaten toekennen',
    awardConfirm: 'Certificaten toekennen aan alle ingecheckte vrijwilligers?',
    certsAwarded: 'Certificaten toegekend!', noEvents: 'Nog geen fysieke trainingsmomenten.',
    spots: 'Plaatsen', eventCreated: 'Trainingsmoment aangemaakt!',
    generateTickets: 'Tickets genereren', ticketsGenerated: 'Tickets gegenereerd!',
  },
  fr: {
    title: 'Academy Builder', back: 'Retour', newTraining: 'Nouvelle formation',
    trainingTitle: 'Titre', trainingDesc: 'Description', modules: 'Modules',
    addModule: 'Ajouter un module', text: 'Texte', video: 'Vidéo', image: 'Photo',
    heading: 'Titre', subheading: 'Sous-titre', divider: 'Séparateur',
    moduleTitle: 'Titre du module', content: 'Contenu', videoUrl: 'YouTube ou URL vidéo',
    imageUrl: 'URL image', addBlock: 'Glissez ou cliquez pour ajouter',
    quiz: 'Quiz Global (Certificat)', moduleQuiz: 'Quiz Module',
    addModuleQuiz: 'Ajouter mini-quiz', removeModuleQuiz: 'Supprimer mini-quiz',
    generateAI: 'Générer avec IA', generating: 'IA génère...',
    passingScore: 'Score minimum', addQuestion: 'Ajouter une question',
    question: 'Question', option: 'Option', correctAnswer: 'Bonne réponse',
    save: 'Tout enregistrer', saving: 'Enregistrement...', publish: 'Publier',
    unpublish: 'Masquer', published: 'Publié', draft: 'Brouillon',
    delete: 'Supprimer', deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cette formation ?',
    noTrainings: 'Aucune formation. Créez votre première formation !',
    certificates: 'Certificats', issueCert: 'Délivrer un certificat',
    physicalTraining: 'Certificat physique', selectVolunteer: 'Sélectionner un bénévole',
    saved: 'Formation enregistrée !', deleted: 'Formation supprimée.',
    certIssued: 'Certificat délivré !', quizGenerated: 'Questions générées !',
    dragHint: 'Glissez les modules pour réorganiser', contentBlocks: 'Blocs de contenu',
    emptyModule: 'Glissez des blocs ici pour construire votre module',
    moduleCount: 'modules', questionCount: 'questions',
    collapse: 'Réduire', expand: 'Développer', duplicateModule: 'Dupliquer le module',
    practiceOnly: 'Exercice uniquement', countsForCert: 'Compte pour le certificat',
    quizType: 'Type de quiz', blockPalette: 'Blocs',
    styling: 'Mise en forme', fontSize: 'Taille du texte', alignment: 'Alignement',
    youtubeHint: 'Collez un lien YouTube ou une URL vidéo',
    dropHere: 'Déposez ici',
    aiAssistant: 'Assistant IA', aiTopic: 'Quel est le sujet de la formation ?',
    aiExtraInstructions: 'Instructions supplémentaires (optionnel)', aiNumModules: 'Nombre de modules',
    aiGenerate: 'Générer la formation', aiGenerating: 'IA génère la formation...',
    aiDescription: 'Décrivez le sujet et l\'IA créera une formation complète avec modules, texte et images.',
    aiSuccess: 'Formation IA générée ! Les modules ont été ajoutés.',
    aiReplace: 'Remplacer les modules existants', aiAppend: 'Ajouter aux modules existants',
    trainingEvents: 'Formations physiques', createEvent: 'Nouveau moment de formation',
    eventDate: 'Date', eventLocation: 'Lieu', eventDesc: 'Description',
    signups: 'Inscriptions', checkedIn: 'Enregistré', awardCerts: 'Attribuer certificats',
    awardConfirm: 'Attribuer les certificats à tous les volontaires enregistrés ?',
    certsAwarded: 'Certificats attribués !', noEvents: 'Pas encore de formations physiques.',
    spots: 'Places', eventCreated: 'Moment de formation créé !',
    generateTickets: 'Générer les tickets', ticketsGenerated: 'Tickets générés !',
  },
  en: {
    title: 'Academy Builder', back: 'Back', newTraining: 'New training',
    trainingTitle: 'Title', trainingDesc: 'Description', modules: 'Modules',
    addModule: 'Add module', text: 'Text', video: 'Video', image: 'Photo',
    heading: 'Heading', subheading: 'Subheading', divider: 'Divider',
    moduleTitle: 'Module title', content: 'Content', videoUrl: 'YouTube or video URL',
    imageUrl: 'Image URL', addBlock: 'Drag or click to add',
    quiz: 'Global Quiz (Certificate)', moduleQuiz: 'Module Quiz',
    addModuleQuiz: 'Add mini-quiz', removeModuleQuiz: 'Remove mini-quiz',
    generateAI: 'Generate with AI', generating: 'AI generating...',
    passingScore: 'Passing score', addQuestion: 'Add question',
    question: 'Question', option: 'Option', correctAnswer: 'Correct answer',
    save: 'Save all', saving: 'Saving...', publish: 'Publish',
    unpublish: 'Unpublish', published: 'Published', draft: 'Draft',
    delete: 'Delete', deleteConfirm: 'Are you sure you want to delete this training?',
    noTrainings: 'No trainings yet. Create your first training!',
    certificates: 'Certificates', issueCert: 'Issue certificate',
    physicalTraining: 'Physical certificate', selectVolunteer: 'Select volunteer',
    saved: 'Training saved!', deleted: 'Training deleted.',
    certIssued: 'Certificate issued!', quizGenerated: 'Quiz questions generated!',
    dragHint: 'Drag modules to reorder', contentBlocks: 'Content blocks',
    emptyModule: 'Drag blocks here to build your module',
    moduleCount: 'modules', questionCount: 'questions',
    collapse: 'Collapse', expand: 'Expand', duplicateModule: 'Duplicate module',
    practiceOnly: 'Practice only', countsForCert: 'Counts for certificate',
    quizType: 'Quiz type', blockPalette: 'Blocks',
    styling: 'Styling', fontSize: 'Font size', alignment: 'Alignment',
    youtubeHint: 'Paste a YouTube link or video URL',
    dropHere: 'Drop here',
    aiAssistant: 'AI Assistant', aiTopic: 'What is the training about?',
    aiExtraInstructions: 'Extra instructions (optional)', aiNumModules: 'Number of modules',
    aiGenerate: 'Generate training', aiGenerating: 'AI is generating training...',
    aiDescription: 'Describe the topic and AI will create a complete training with modules, text and images.',
    aiSuccess: 'AI training generated! Modules have been added.',
    aiReplace: 'Replace existing modules', aiAppend: 'Add to existing modules',
    trainingEvents: 'Physical trainings', createEvent: 'New training session',
    eventDate: 'Date', eventLocation: 'Location', eventDesc: 'Description',
    signups: 'Sign-ups', checkedIn: 'Checked in', awardCerts: 'Award certificates',
    awardConfirm: 'Award certificates to all checked-in volunteers?',
    certsAwarded: 'Certificates awarded!', noEvents: 'No physical training sessions yet.',
    spots: 'Spots', eventCreated: 'Training session created!',
    generateTickets: 'Generate tickets', ticketsGenerated: 'Tickets generated!',
  },
};

// ── Helpers ──
const parseBlocks = (mod: any): ContentBlock[] => {
  if (mod.content_type === 'mixed' && mod.content_body) {
    try { return JSON.parse(mod.content_body); } catch { return []; }
  }
  if (mod.content_type === 'text' && mod.content_body) {
    return [{ id: crypto.randomUUID(), type: 'text', value: mod.content_body }];
  }
  if ((mod.content_type === 'video' || mod.content_type === 'file') && mod.content_url) {
    return [{ id: crypto.randomUUID(), type: 'video', value: mod.content_url }];
  }
  return [];
};

const blocksToStorage = (blocks: ContentBlock[]) => JSON.stringify(blocks);

const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  // youtube.com/watch?v=ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  // youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  // Already an embed or other video URL
  if (url.includes('embed') || url.includes('vimeo')) return url;
  return url;
};

const fontSizeClasses: Record<string, string> = {
  sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl',
};

const PALETTE_BLOCKS: { type: ContentBlock['type']; icon: any; labelKey: string }[] = [
  { type: 'heading', icon: Heading1, labelKey: 'heading' },
  { type: 'subheading', icon: Heading2, labelKey: 'subheading' },
  { type: 'text', icon: Type, labelKey: 'text' },
  { type: 'video', icon: Youtube, labelKey: 'video' },
  { type: 'image', icon: ImageIcon, labelKey: 'image' },
  { type: 'divider', icon: Minus, labelKey: 'divider' },
];

// ── Block Palette (draggable sidebar) ──
const BlockPalette = ({ l, onAdd }: { l: any; onAdd: (type: ContentBlock['type']) => void }) => {
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('block-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{l.blockPalette}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {PALETTE_BLOCKS.map(pb => {
          const Icon = pb.icon;
          return (
            <button
              key={pb.type}
              draggable
              onDragStart={(e) => handleDragStart(e, pb.type)}
              onClick={() => onAdd(pb.type)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all cursor-grab active:cursor-grabbing select-none"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{(l as any)[pb.labelKey]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Block Style Toolbar ──
const BlockStyleToolbar = ({ style, onChange }: { style: ContentBlockStyle; onChange: (s: ContentBlockStyle) => void }) => {
  const sizes = ['sm', 'base', 'lg', 'xl', '2xl', '3xl'] as const;
  const currentSizeIdx = sizes.indexOf((style.fontSize || 'base') as any);

  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {/* Alignment */}
      <button onClick={() => onChange({ ...style, align: 'left' })} className={`p-1 rounded transition-colors ${style.align === 'left' || !style.align ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
        <AlignLeft className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onChange({ ...style, align: 'center' })} className={`p-1 rounded transition-colors ${style.align === 'center' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
        <AlignCenter className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onChange({ ...style, align: 'right' })} className={`p-1 rounded transition-colors ${style.align === 'right' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
        <AlignRight className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      {/* Bold / Italic */}
      <button onClick={() => onChange({ ...style, bold: !style.bold })} className={`p-1 rounded transition-colors ${style.bold ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onChange({ ...style, italic: !style.italic })} className={`p-1 rounded transition-colors ${style.italic ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
        <Italic className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      {/* Font size */}
      <button onClick={() => { if (currentSizeIdx > 0) onChange({ ...style, fontSize: sizes[currentSizeIdx - 1] }); }} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" disabled={currentSizeIdx <= 0}>
        <span className="text-[10px] font-bold">A-</span>
      </button>
      <span className="text-[10px] text-muted-foreground w-6 text-center">{style.fontSize || 'base'}</span>
      <button onClick={() => { if (currentSizeIdx < sizes.length - 1) onChange({ ...style, fontSize: sizes[currentSizeIdx + 1] }); }} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" disabled={currentSizeIdx >= sizes.length - 1}>
        <span className="text-[10px] font-bold">A+</span>
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      {/* Color picker */}
      <div className="relative">
        <input
          type="color"
          value={style.color || '#000000'}
          onChange={e => onChange({ ...style, color: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border border-border"
          title="Text color"
        />
      </div>
      <div className="relative">
        <input
          type="color"
          value={style.bgColor || '#ffffff'}
          onChange={e => onChange({ ...style, bgColor: e.target.value === '#ffffff' ? undefined : e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border border-border"
          title="Background color"
        />
      </div>
    </div>
  );
};

// ── Content Block Editor (Enhanced) ──
const ContentBlockEditor = ({
  blocks, setBlocks, l
}: {
  blocks: ContentBlock[];
  setBlocks: (blocks: ContentBlock[]) => void;
  l: any;
}) => {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);

  const addBlock = (type: ContentBlock['type'], atIndex?: number) => {
    const defaultStyle: ContentBlockStyle = {};
    if (type === 'heading') {
      defaultStyle.fontSize = '2xl';
      defaultStyle.bold = true;
    } else if (type === 'subheading') {
      defaultStyle.fontSize = 'lg';
      defaultStyle.bold = true;
    }
    const newBlock: ContentBlock = { id: crypto.randomUUID(), type, value: '', style: defaultStyle };
    if (atIndex !== undefined) {
      const newBlocks = [...blocks];
      newBlocks.splice(atIndex, 0, newBlock);
      setBlocks(newBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }
  };

  const updateBlock = (id: string, value: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, value } : b));
  };

  const updateBlockStyle = (id: string, style: ContentBlockStyle) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, style } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (editingStyleId === id) setEditingStyleId(null);
  };

  const handleDropOnZone = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    const blockType = e.dataTransfer.getData('block-type') as ContentBlock['type'];
    if (blockType && PALETTE_BLOCKS.some(pb => pb.type === blockType)) {
      addBlock(blockType, index);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverIdx(index);
  };

  const handleDragLeave = () => setDragOverIdx(null);

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'heading': return <Heading1 className="w-3.5 h-3.5" />;
      case 'subheading': return <Heading2 className="w-3.5 h-3.5" />;
      case 'text': return <Type className="w-3.5 h-3.5" />;
      case 'video': return <Youtube className="w-3.5 h-3.5" />;
      case 'image': return <ImageIcon className="w-3.5 h-3.5" />;
      case 'divider': return <Minus className="w-3.5 h-3.5" />;
      default: return <Type className="w-3.5 h-3.5" />;
    }
  };

  const getStyleClasses = (style?: ContentBlockStyle) => {
    const classes: string[] = [];
    if (style?.align === 'center') classes.push('text-center');
    else if (style?.align === 'right') classes.push('text-right');
    if (style?.bold) classes.push('font-bold');
    if (style?.italic) classes.push('italic');
    if (style?.fontSize) classes.push(fontSizeClasses[style.fontSize] || '');
    return classes.join(' ');
  };

  // Drop zone component
  const DropZone = ({ index }: { index: number }) => (
    <div
      onDrop={e => handleDropOnZone(e, index)}
      onDragOver={e => handleDragOver(e, index)}
      onDragLeave={handleDragLeave}
      className={`transition-all duration-200 ${dragOverIdx === index
        ? 'h-12 border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg flex items-center justify-center'
        : 'h-1 hover:h-6 hover:border hover:border-dashed hover:border-border hover:rounded-lg'
      }`}
    >
      {dragOverIdx === index && (
        <span className="text-xs text-primary font-medium">{l.dropHere}</span>
      )}
    </div>
  );

  return (
    <div className="space-y-1">
      {/* Empty state */}
      {blocks.length === 0 && (
        <div
          onDrop={e => handleDropOnZone(e, 0)}
          onDragOver={e => handleDragOver(e, 0)}
          onDragLeave={handleDragLeave}
          className={`text-center py-8 border-2 border-dashed rounded-xl transition-all ${dragOverIdx === 0 ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
        >
          <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{l.emptyModule}</p>
        </div>
      )}

      {blocks.length > 0 && <DropZone index={0} />}

      {/* Block list with reorder */}
      <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-0">
        {blocks.map((block, idx) => (
          <Reorder.Item key={block.id} value={block} className="list-none">
            <div className="flex gap-2 items-start bg-background rounded-lg border border-border p-2 group hover:border-primary/20 transition-colors">
              <div className="flex flex-col items-center gap-0.5 pt-1">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary">
                  {getBlockIcon(block.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {/* Heading */}
                {block.type === 'heading' && (
                  <Input
                    value={block.value}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    placeholder={l.heading}
                    className={`border-0 bg-transparent px-0 focus-visible:ring-0 font-heading ${getStyleClasses(block.style)}`}
                    style={{ color: block.style?.color, backgroundColor: block.style?.bgColor }}
                  />
                )}
                {/* Subheading */}
                {block.type === 'subheading' && (
                  <Input
                    value={block.value}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    placeholder={l.subheading}
                    className={`border-0 bg-transparent px-0 focus-visible:ring-0 ${getStyleClasses(block.style)}`}
                    style={{ color: block.style?.color, backgroundColor: block.style?.bgColor }}
                  />
                )}
                {/* Text */}
                {block.type === 'text' && (
                  <Textarea
                    value={block.value}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    placeholder={l.content}
                    rows={3}
                    className={`resize-y ${getStyleClasses(block.style)}`}
                    style={{ color: block.style?.color, backgroundColor: block.style?.bgColor }}
                  />
                )}
                {/* Video */}
                {block.type === 'video' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                      <Input
                        value={block.value}
                        onChange={e => updateBlock(block.id, e.target.value)}
                        placeholder={l.youtubeHint}
                        className="text-sm h-8"
                      />
                    </div>
                    {block.value && getYouTubeEmbedUrl(block.value) && (
                      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <iframe
                          src={getYouTubeEmbedUrl(block.value)!}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    )}
                  </div>
                )}
                {/* Image */}
                {block.type === 'image' && (
                  <div className="space-y-1.5">
                    <Input
                      value={block.value}
                      onChange={e => updateBlock(block.id, e.target.value)}
                      placeholder={l.imageUrl}
                      className="text-sm h-8"
                    />
                    {block.value && (
                      <div className="rounded-lg overflow-hidden bg-muted max-h-48">
                        <img src={block.value} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                  </div>
                )}
                {/* Divider */}
                {block.type === 'divider' && (
                  <div className="py-2">
                    <hr className="border-border" />
                  </div>
                )}

                {/* Style toolbar toggle for text blocks */}
                {['heading', 'subheading', 'text'].includes(block.type) && (
                  <div className="mt-1">
                    <button
                      onClick={() => setEditingStyleId(editingStyleId === block.id ? null : block.id)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <Palette className="w-3 h-3" /> {l.styling}
                    </button>
                    <AnimatePresence>
                      {editingStyleId === block.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-1"
                        >
                          <BlockStyleToolbar
                            style={block.style || {}}
                            onChange={s => updateBlockStyle(block.id, s)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <button onClick={() => removeBlock(block.id)} className="text-destructive/60 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 pt-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <DropZone index={idx + 1} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
};

// ── Quiz Editor Component ──
const QuizEditor = ({
  questions, setQuestions, passingScore, setPassingScore, onGenerateAI, generatingAI, l,
  compact = false, isPractice, onTogglePractice
}: {
  questions: QuizQuestion[];
  setQuestions: (qs: QuizQuestion[]) => void;
  passingScore: number;
  setPassingScore: (s: number) => void;
  onGenerateAI?: () => void;
  generatingAI: boolean;
  l: any;
  compact?: boolean;
  isPractice?: boolean;
  onTogglePractice?: (v: boolean) => void;
}) => {
  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: '', options: ['', '', '', ''],
      correct_answer_index: 0, sort_order: questions.length,
    }]);
  };

  const removeQuestion = (idx: number) => setQuestions(questions.filter((_, i) => i !== idx));

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(questions.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options]; opts[oIdx] = value;
      return { ...q, options: opts };
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Practice toggle */}
        {onTogglePractice !== undefined && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
            <span className="text-xs text-muted-foreground">{l.quizType}:</span>
            <button
              onClick={() => onTogglePractice(!isPractice)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-all ${
                isPractice
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-accent/10 text-accent'
              }`}
            >
              {isPractice ? (
                <><Square className="w-3 h-3" /> {l.practiceOnly}</>
              ) : (
                <><CheckSquare className="w-3 h-3" /> {l.countsForCert}</>
              )}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-foreground">{l.passingScore}:</label>
          <Input type="number" min={1} max={questions.length || 10} value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} className="w-16 h-7 text-xs" />
          <span className="text-xs text-muted-foreground">/ {questions.length}</span>
        </div>
        <div className="flex gap-1.5 ml-auto">
          {onGenerateAI && (
            <Button variant="outline" size="sm" onClick={onGenerateAI} disabled={generatingAI} className="gap-1 text-xs h-7">
              {generatingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generatingAI ? l.generating : l.generateAI}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={addQuestion} className="gap-1 text-xs h-7">
            <Plus className="w-3.5 h-3.5" /> {l.addQuestion}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, qIdx) => (
          <motion.div key={qIdx} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className={`rounded-xl p-3 border border-border/50 ${compact ? 'bg-muted/20' : 'bg-muted/30'}`}>
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xs font-bold text-primary mt-1.5">{qIdx + 1}.</span>
              <Textarea value={q.question_text} onChange={e => updateQuestion(qIdx, 'question_text', e.target.value)} placeholder={l.question} rows={1} className="flex-1 text-sm min-h-[36px]" />
              <button onClick={() => removeQuestion(qIdx)} className="text-destructive hover:text-destructive/80 mt-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-5">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-1.5">
                  <button type="button" onClick={() => updateQuestion(qIdx, 'correct_answer_index', oIdx)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors text-xs ${q.correct_answer_index === oIdx ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-transparent hover:border-primary/50'}`}>
                    ✓
                  </button>
                  <Input value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`${l.option} ${oIdx + 1}`} className="h-7 text-xs" />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ──
const AcademyBuilder = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = labels[language];

  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<string | null>(null);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showPhysicalCert, setShowPhysicalCert] = useState(false);
  const [volunteers, setVolunteers] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  // Training events state
  interface TrainingEvent {
    id: string;
    title: string;
    event_date: string | null;
    location: string | null;
    description: string | null;
    status: string;
    training_id: string;
    task?: { id: string; spots_available: number | null } | null;
    signupCount?: number;
    checkedInCount?: number;
    ticketCount?: number;
  }
  const [trainingEvents, setTrainingEvents] = useState<TrainingEvent[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventSpots, setNewEventSpots] = useState(30);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventSignups, setEventSignups] = useState<{ volunteer_id: string; full_name: string | null; status: string; ticket_status: string | null; checked_in: boolean }[]>([]);

  const [globalQuiz, setGlobalQuiz] = useState<Quiz | null>(null);
  const [globalQuestions, setGlobalQuestions] = useState<QuizQuestion[]>([]);
  const [globalPassingScore, setGlobalPassingScore] = useState(7);
  const [moduleQuizzes, setModuleQuizzes] = useState<Record<string, ModuleQuizData>>({});

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCertDesignId, setEditCertDesignId] = useState<string>('');
  const [certDesigns, setCertDesigns] = useState<{ id: string; name: string }[]>([]);
  // AI Assistant state
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiExtraInstructions, setAiExtraInstructions] = useState('');
  const [aiNumModules, setAiNumModules] = useState(4);
  const [generatingTraining, setGeneratingTraining] = useState(false);
  const [aiReplaceMode, setAiReplaceMode] = useState(true);

  const { clubId: contextClubId } = useClubContext();

  useEffect(() => {
    if (!contextClubId) return;
    const init = async () => {
      setClubId(contextClubId);
      const [trainingsRes, designsRes] = await Promise.all([
        supabase.from('academy_trainings').select('*').eq('club_id', contextClubId).order('created_at', { ascending: false }),
        (supabase as any).from('certificate_designs').select('id, name').eq('club_id', contextClubId),
      ]);
      setTrainings((trainingsRes.data as Training[]) || []);
      setCertDesigns((designsRes.data || []) as { id: string; name: string }[]);
      setLoading(false);
    };
    init();
  }, [contextClubId]);

  const loadTrainings = async (cid: string) => {
    const { data } = await supabase.from('academy_trainings').select('*').eq('club_id', cid).order('created_at', { ascending: false });
    setTrainings((data as Training[]) || []);
  };

  const loadTrainingDetail = async (trainingId: string) => {
    const [modRes, quizzesRes, certRes] = await Promise.all([
      supabase.from('training_modules').select('*').eq('training_id', trainingId).order('sort_order'),
      supabase.from('training_quizzes').select('*').eq('training_id', trainingId),
      supabase.from('volunteer_certificates').select('*').eq('training_id', trainingId).eq('club_id', clubId!),
    ]);

    const loadedModules = (modRes.data || []).map((m: any) => ({ ...m, blocks: parseBlocks(m), expanded: false })) as TrainingModule[];
    setModules(loadedModules);

    const allQuizzes = (quizzesRes.data || []) as any[];
    const gQuiz = allQuizzes.find((q: any) => !q.module_id) || null;
    setGlobalQuiz(gQuiz);
    setGlobalPassingScore(gQuiz?.passing_score || 7);

    if (gQuiz) {
      const { data: qData } = await supabase.from('quiz_questions').select('*').eq('quiz_id', gQuiz.id).order('sort_order');
      setGlobalQuestions((qData || []).map((qq: any) => ({
        id: qq.id, quiz_id: qq.quiz_id, question_text: qq.question_text,
        options: Array.isArray(qq.options) ? qq.options : [],
        correct_answer_index: qq.correct_answer_index, sort_order: qq.sort_order,
      })));
    } else { setGlobalQuestions([]); }

    const mQuizzes: Record<string, ModuleQuizData> = {};
    const moduleQuizList = allQuizzes.filter((q: any) => q.module_id);
    for (const mq of moduleQuizList) {
      const { data: mqData } = await supabase.from('quiz_questions').select('*').eq('quiz_id', mq.id).order('sort_order');
      mQuizzes[mq.module_id] = {
        quiz: mq, questions: (mqData || []).map((qq: any) => ({
          id: qq.id, quiz_id: qq.quiz_id, question_text: qq.question_text,
          options: Array.isArray(qq.options) ? qq.options : [],
          correct_answer_index: qq.correct_answer_index, sort_order: qq.sort_order,
        })),
        passingScore: mq.passing_score,
        isPractice: mq.is_practice || false,
      };
    }
    setModuleQuizzes(mQuizzes);
    setCertificates((certRes.data as Certificate[]) || []);
  };

  const selectTraining = (t: Training) => {
    setSelectedTraining(t.id); setEditTitle(t.title); setEditDesc(t.description || '');
    setEditCertDesignId(t.certificate_design_id || '');
    loadTrainingDetail(t.id);
    loadTrainingEvents(t.id);
  };

  const handleCreateTraining = async () => {
    if (!clubId) return;
    const { data, error } = await supabase.from('academy_trainings').insert({ club_id: clubId, title: l.newTraining }).select().single();
    if (error) { toast.error(error.message); return; }
    const t = data as Training;
    setTrainings(prev => [t, ...prev]);
    selectTraining(t);
  };

  const handleSave = async () => {
    if (!selectedTraining || !clubId) return;
    setSaving(true);
    try {
      await supabase.from('academy_trainings').update({ title: editTitle, description: editDesc || null, certificate_design_id: editCertDesignId || null }).eq('id', selectedTraining);
      const { data: existingMods } = await supabase.from('training_modules').select('id').eq('training_id', selectedTraining);
      const currentIds = new Set(modules.filter(m => !m.id.startsWith('new-')).map(m => m.id));
      const toDelete = (existingMods || []).filter((em: any) => !currentIds.has(em.id));
      for (const d of toDelete) await supabase.from('training_modules').delete().eq('id', d.id);

      const savedModuleIds: Record<string, string> = {};
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        const payload = { training_id: selectedTraining, title: m.title, content_type: 'mixed' as const, content_body: blocksToStorage(m.blocks), content_url: null, sort_order: i };
        if (m.id.startsWith('new-')) {
          const { data: newMod } = await supabase.from('training_modules').insert(payload).select().single();
          if (newMod) savedModuleIds[m.id] = (newMod as any).id;
        } else {
          await supabase.from('training_modules').update(payload).eq('id', m.id);
          savedModuleIds[m.id] = m.id;
        }
      }

      await saveQuiz(selectedTraining, null, globalQuiz, globalQuestions, globalPassingScore, false);
      for (const [oldModId, mqData] of Object.entries(moduleQuizzes)) {
        const realModId = savedModuleIds[oldModId] || oldModId;
        await saveQuiz(selectedTraining, realModId, mqData.quiz, mqData.questions, mqData.passingScore, mqData.isPractice);
      }

      toast.success(l.saved);
      await loadTrainings(clubId);
      await loadTrainingDetail(selectedTraining);
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const saveQuiz = async (trainingId: string, moduleId: string | null, quiz: Quiz | null, questions: QuizQuestion[], passingScore: number, isPractice: boolean) => {
    if (questions.length === 0) {
      if (quiz?.id) {
        await supabase.from('quiz_questions').delete().eq('quiz_id', quiz.id);
        await supabase.from('training_quizzes').delete().eq('id', quiz.id);
      }
      return;
    }
    let quizId = quiz?.id;
    const quizPayload: any = { training_id: trainingId, passing_score: passingScore, total_questions: questions.length, is_practice: isPractice };
    if (moduleId) quizPayload.module_id = moduleId;
    if (!quizId) {
      const { data: newQuiz } = await supabase.from('training_quizzes').insert(quizPayload).select().single();
      quizId = (newQuiz as any)?.id;
    } else {
      await supabase.from('training_quizzes').update({ passing_score: passingScore, total_questions: questions.length, is_practice: isPractice }).eq('id', quizId);
    }
    if (quizId) {
      await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
      const qInserts = questions.map((q, i) => ({
        quiz_id: quizId!, question_text: q.question_text, options: q.options,
        correct_answer_index: q.correct_answer_index, sort_order: i,
      }));
      await supabase.from('quiz_questions').insert(qInserts);
    }
  };

  const handleTogglePublish = async () => {
    if (!selectedTraining) return;
    const training = trainings.find(t => t.id === selectedTraining);
    if (!training) return;
    await supabase.from('academy_trainings').update({ is_published: !training.is_published }).eq('id', selectedTraining);
    setTrainings(prev => prev.map(t => t.id === selectedTraining ? { ...t, is_published: !t.is_published } : t));
    toast.success(!training.is_published ? l.published : l.draft);
  };

  const handleDelete = async () => {
    if (!selectedTraining || !clubId) return;
    if (!confirm(l.deleteConfirm)) return;
    await supabase.from('academy_trainings').delete().eq('id', selectedTraining);
    setSelectedTraining(null);
    toast.success(l.deleted);
    await loadTrainings(clubId);
  };

  const addModule = () => {
    setModules(prev => [...prev, {
      id: `new-${Date.now()}`, training_id: selectedTraining!, title: '',
      content_type: 'mixed', content_body: null, content_url: null,
      sort_order: modules.length, blocks: [], expanded: true,
    }]);
  };

  const duplicateModule = (idx: number) => {
    const src = modules[idx];
    setModules(prev => [...prev.slice(0, idx + 1), {
      ...src, id: `new-${Date.now()}`, title: `${src.title} (copy)`,
      blocks: src.blocks.map(b => ({ ...b, id: crypto.randomUUID() })), expanded: true,
    }, ...prev.slice(idx + 1)]);
  };

  const removeModule = async (idx: number) => {
    const mod = modules[idx];
    if (!mod.id.startsWith('new-')) await supabase.from('training_modules').delete().eq('id', mod.id);
    const newMQ = { ...moduleQuizzes }; delete newMQ[mod.id]; setModuleQuizzes(newMQ);
    setModules(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleModuleExpand = (idx: number) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, expanded: !m.expanded } : m));
  };

  const updateModuleBlocks = (idx: number, blocks: ContentBlock[]) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, blocks } : m));
  };

  const addModuleQuiz = (moduleId: string) => {
    setModuleQuizzes(prev => ({ ...prev, [moduleId]: { quiz: null, questions: [], passingScore: 3, isPractice: false } }));
  };

  const removeModuleQuiz = (moduleId: string) => {
    setModuleQuizzes(prev => { const next = { ...prev }; delete next[moduleId]; return next; });
  };

  const handleGenerateAI = async (target: 'global' | string) => {
    if (!modules.length) { toast.error(l.noTrainings.includes('Nog') ? 'Voeg eerst modules met inhoud toe.' : l.noTrainings.includes('Aucune') ? 'Ajoutez d\'abord des modules avec du contenu.' : 'Add modules with content first.'); return; }
    setGeneratingAI(true);
    try {
      const content = target === 'global'
        ? modules.map(m => `${m.title}\n${m.blocks.filter(b => ['text', 'heading', 'subheading'].includes(b.type)).map(b => b.value).join('\n')}`).join('\n\n')
        : (() => { const mod = modules.find(m => m.id === target); return mod ? `${mod.title}\n${mod.blocks.filter(b => ['text', 'heading', 'subheading'].includes(b.type)).map(b => b.value).join('\n')}` : ''; })();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const numQ = target === 'global' ? 10 : 5;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, num_questions: numQ, language }),
      });
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'AI error'); }
      const result = await resp.json();
      const aiQuestions: QuizQuestion[] = (result.questions || []).map((q: any, i: number) => ({
        question_text: q.question_text, options: q.options, correct_answer_index: q.correct_answer_index, sort_order: i,
      }));
      if (target === 'global') setGlobalQuestions(aiQuestions);
      else setModuleQuizzes(prev => ({ ...prev, [target]: { ...prev[target], questions: aiQuestions } }));
      toast.success(l.quizGenerated);
    } catch (err: any) { toast.error(err.message); }
    setGeneratingAI(false);
  };

  const handleGenerateTraining = async () => {
    if (!aiTopic.trim() || !selectedTraining) return;
    setGeneratingTraining(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-training-content`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, num_modules: aiNumModules, language, extra_instructions: aiExtraInstructions }),
      });
      if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'AI error'); }
      const result = await resp.json();

      // Update title and description if empty
      if (!editTitle || editTitle === l.newTraining) setEditTitle(result.title);
      if (!editDesc) setEditDesc(result.description);

      // Convert AI modules to TrainingModule format
      const aiModules: TrainingModule[] = (result.modules || []).map((m: any, i: number) => ({
        id: `new-${Date.now()}-${i}`,
        training_id: selectedTraining,
        title: m.title,
        content_type: 'mixed',
        content_body: null,
        content_url: null,
        sort_order: (aiReplaceMode ? 0 : modules.length) + i,
        blocks: (m.blocks || []).map((b: any) => ({
          id: b.id || crypto.randomUUID(),
          type: b.type,
          value: b.value,
          style: b.style || (b.type === 'heading' ? { fontSize: '2xl', bold: true } : b.type === 'subheading' ? { fontSize: 'lg', bold: true } : {}),
        })),
        expanded: i === 0,
      }));

      if (aiReplaceMode) {
        setModules(aiModules);
        setModuleQuizzes({});
      } else {
        setModules(prev => [...prev, ...aiModules]);
      }

      toast.success(l.aiSuccess);
      setShowAIAssistant(false);
      setAiTopic('');
      setAiExtraInstructions('');
    } catch (err: any) { toast.error(err.message); }
    setGeneratingTraining(false);
  };


  const handleIssueCert = async () => {
    if (!selectedVolunteer || !selectedTraining || !clubId) return;
    const { error } = await supabase.from('volunteer_certificates').insert({
      volunteer_id: selectedVolunteer, training_id: selectedTraining, club_id: clubId, type: 'physical_event',
    });
    if (error) { toast.error(error.message); return; }
    toast.success(l.certIssued);
    setShowPhysicalCert(false); setSelectedVolunteer('');
    await loadTrainingDetail(selectedTraining);
  };

  const loadVolunteers = async () => {
    if (!clubId) return;
    const { data: signups } = await supabase.from('task_signups').select('volunteer_id, tasks!inner(club_id)').eq('tasks.club_id', clubId);
    const volIds = [...new Set((signups || []).map((s: any) => s.volunteer_id))];
    if (volIds.length === 0) { setVolunteers([]); return; }
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', volIds);
    setVolunteers((profiles || []) as any);
  };

  // ── Training Events ──
  const loadTrainingEvents = async (trainingId: string) => {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('training_id', trainingId)
      .eq('club_id', clubId!)
      .order('event_date', { ascending: false });

    if (!events || events.length === 0) { setTrainingEvents([]); return; }

    // For each event, load task + signup/ticket counts
    const enriched: TrainingEvent[] = [];
    for (const ev of events) {
      const { data: tasks } = await supabase.from('tasks').select('id, spots_available').eq('event_id', ev.id).limit(1);
      const task = tasks?.[0] || null;
      let signupCount = 0, checkedInCount = 0, ticketCount = 0;
      if (task) {
        const { count: sc } = await supabase.from('task_signups').select('id', { count: 'exact', head: true }).eq('task_id', task.id);
        signupCount = sc || 0;
        const { data: tickets } = await supabase.from('volunteer_tickets').select('status').eq('event_id', ev.id).eq('club_id', clubId!);
        ticketCount = (tickets || []).length;
        checkedInCount = (tickets || []).filter((t: any) => t.status === 'checked_in').length;
      }
      enriched.push({ ...ev, training_id: ev.training_id!, task: task ? { id: task.id, spots_available: task.spots_available } : null, signupCount, checkedInCount, ticketCount });
    }
    setTrainingEvents(enriched);
  };

  const handleCreateTrainingEvent = async () => {
    if (!selectedTraining || !clubId || !newEventTitle.trim()) return;
    // Create event linked to training
    const { data: ev, error: evErr } = await supabase.from('events').insert({
      club_id: clubId, title: newEventTitle, event_date: newEventDate || null,
      location: newEventLocation || null, description: newEventDesc || null,
      training_id: selectedTraining, status: 'open',
    }).select().single();
    if (evErr || !ev) { toast.error(evErr?.message || 'Error'); return; }

    // Auto-create task under this event for signups
    await supabase.from('tasks').insert({
      club_id: clubId, title: newEventTitle, event_id: (ev as any).id,
      task_date: newEventDate || null, location: newEventLocation || null,
      spots_available: newEventSpots, status: 'open', compensation_type: 'none',
      required_training_id: null,
    });

    toast.success((l as any).eventCreated);
    setShowCreateEvent(false);
    setNewEventTitle(''); setNewEventDate(''); setNewEventLocation(''); setNewEventDesc('');
    await loadTrainingEvents(selectedTraining);
  };

  const loadEventSignups = async (eventId: string) => {
    const ev = trainingEvents.find(e => e.id === eventId);
    if (!ev?.task) { setEventSignups([]); return; }

    const { data: signups } = await supabase.from('task_signups').select('volunteer_id, status').eq('task_id', ev.task.id);
    if (!signups || signups.length === 0) { setEventSignups([]); return; }

    const volIds = signups.map((s: any) => s.volunteer_id);
    const [profilesRes, ticketsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', volIds),
      supabase.from('volunteer_tickets').select('volunteer_id, status').eq('event_id', eventId).eq('club_id', clubId!),
    ]);

    const profiles = (profilesRes.data || []) as any[];
    const tickets = (ticketsRes.data || []) as any[];

    setEventSignups(signups.map((s: any) => {
      const prof = profiles.find(p => p.id === s.volunteer_id);
      const ticket = tickets.find(t => t.volunteer_id === s.volunteer_id);
      return {
        volunteer_id: s.volunteer_id,
        full_name: prof?.full_name || s.volunteer_id.slice(0, 8),
        status: s.status,
        ticket_status: ticket?.status || null,
        checked_in: ticket?.status === 'checked_in',
      };
    }));
  };

  const handleGenerateTickets = async (eventId: string) => {
    const ev = trainingEvents.find(e => e.id === eventId);
    if (!ev?.task || !clubId) return;

    const { data: signups } = await supabase.from('task_signups').select('volunteer_id').eq('task_id', ev.task.id).eq('status', 'approved');
    if (!signups || signups.length === 0) { toast.error(language === 'fr' ? 'Aucune inscription approuvée' : language === 'en' ? 'No approved signups' : 'Geen goedgekeurde inschrijvingen'); return; }

    // Check existing tickets
    const { data: existing } = await supabase.from('volunteer_tickets').select('volunteer_id').eq('event_id', eventId).eq('club_id', clubId);
    const existingIds = new Set((existing || []).map((t: any) => t.volunteer_id));

    const newTickets = signups
      .filter((s: any) => !existingIds.has(s.volunteer_id))
      .map((s: any) => ({
        club_id: clubId,
        event_id: eventId,
        task_id: ev.task!.id,
        volunteer_id: s.volunteer_id,
        barcode: `VT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        status: 'sent' as const,
      }));

    if (newTickets.length > 0) {
      await supabase.from('volunteer_tickets').insert(newTickets);
    }
    toast.success(`${newTickets.length} ${(l as any).ticketsGenerated}`);
    await loadTrainingEvents(selectedTraining!);
    await loadEventSignups(eventId);
  };

  const handleAwardCertsToCheckedIn = async (eventId: string) => {
    if (!confirm((l as any).awardConfirm)) return;
    if (!selectedTraining || !clubId) return;

    const { data: tickets } = await supabase.from('volunteer_tickets')
      .select('volunteer_id')
      .eq('event_id', eventId)
      .eq('club_id', clubId)
      .eq('status', 'checked_in');

    if (!tickets || tickets.length === 0) { toast.error(language === 'fr' ? 'Aucun bénévole enregistré' : language === 'en' ? 'No checked-in volunteers' : 'Geen ingecheckte vrijwilligers'); return; }

    // Check existing certs
    const { data: existingCerts } = await supabase.from('volunteer_certificates')
      .select('volunteer_id')
      .eq('training_id', selectedTraining)
      .eq('club_id', clubId);
    const existingCertIds = new Set((existingCerts || []).map((c: any) => c.volunteer_id));

    const newCerts = tickets
      .filter((t: any) => !existingCertIds.has(t.volunteer_id))
      .map((t: any) => ({
        volunteer_id: t.volunteer_id,
        training_id: selectedTraining!,
        club_id: clubId!,
        type: 'physical_event',
      }));

    if (newCerts.length > 0) {
      await supabase.from('volunteer_certificates').insert(newCerts);
    }
    toast.success(`${newCerts.length} ${(l as any).certsAwarded}`);
    await loadTrainingDetail(selectedTraining!);
    await loadTrainingEvents(selectedTraining!);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentTraining = trainings.find(t => t.id === selectedTraining);

  return (
    <ClubPageLayout>
      <div className="max-w-6xl mx-auto">
        {!selectedTraining ? (
          /* ─── Training List ─── */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-foreground">{l.title}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/academy/certificate-builder')} className="gap-1.5">
                  <Award className="w-4 h-4" /> {language === 'nl' ? 'Certificaat sjablonen' : language === 'fr' ? 'Modèles certificats' : 'Certificate templates'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/academy/physical-trainings')} className="gap-1.5">
                  <CalendarDays className="w-4 h-4" /> {(l as any).trainingEvents}
                </Button>
                <Button onClick={handleCreateTraining} size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> {l.newTraining}</Button>
              </div>
            </div>
            {trainings.length === 0 ? (
              <div className="text-center py-16"><Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">{l.noTrainings}</p></div>
            ) : (
              <div className="space-y-3">
                {trainings.map(t => (
                  <motion.button key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => selectTraining(t)}
                    className="w-full text-left bg-card rounded-2xl border border-border hover:border-primary/30 p-5 transition-all shadow-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-semibold text-foreground">{t.title}</h3>
                        {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.is_published ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                        {t.is_published ? l.published : l.draft}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ─── Training Editor ─── */
          <div className="flex gap-6">
            {/* Sidebar: Block Palette */}
            <div className="hidden md:block w-48 shrink-0 sticky top-20 self-start">
              <BlockPalette l={l} onAdd={(type) => {
                // Add to last expanded module, or first module
                const targetIdx = modules.findIndex(m => m.expanded);
                if (targetIdx >= 0) {
                  const defaultStyle: ContentBlockStyle = {};
                  if (type === 'heading') { defaultStyle.fontSize = '2xl'; defaultStyle.bold = true; }
                  else if (type === 'subheading') { defaultStyle.fontSize = 'lg'; defaultStyle.bold = true; }
                  updateModuleBlocks(targetIdx, [...modules[targetIdx].blocks, { id: crypto.randomUUID(), type, value: '', style: defaultStyle }]);
                } else {
                  toast.error(language === 'fr' ? 'Ouvrez d\'abord un module' : language === 'en' ? 'Open a module first' : 'Open eerst een module');
                }
              }} />
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* Title & actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-xl font-heading font-bold border-0 bg-transparent px-0 focus-visible:ring-0 text-foreground" placeholder={l.trainingTitle} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAIAssistant(true)} className="gap-1.5">
                    <Wand2 className="w-4 h-4" /> {l.aiAssistant}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleTogglePublish}>
                    {currentTraining?.is_published ? <><EyeOff className="w-4 h-4 mr-1" />{l.unpublish}</> : <><Eye className="w-4 h-4 mr-1" />{l.publish}</>}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>

              <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder={l.trainingDesc} rows={2} />

              {/* ─── Modules ─── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> {l.modules}
                    <span className="text-xs text-muted-foreground font-normal">({modules.length} {l.moduleCount})</span>
                  </h3>
                  <Button variant="outline" size="sm" onClick={addModule} className="gap-1.5"><Plus className="w-4 h-4" /> {l.addModule}</Button>
                </div>

                {modules.length > 1 && (
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><GripVertical className="w-3 h-3" /> {l.dragHint}</p>
                )}

                {/* Mobile block palette */}
                <div className="md:hidden mb-3">
                  <BlockPalette l={l} onAdd={(type) => {
                    const targetIdx = modules.findIndex(m => m.expanded);
                    if (targetIdx >= 0) {
                      const defaultStyle: ContentBlockStyle = {};
                      if (type === 'heading') { defaultStyle.fontSize = '2xl'; defaultStyle.bold = true; }
                      else if (type === 'subheading') { defaultStyle.fontSize = 'lg'; defaultStyle.bold = true; }
                      updateModuleBlocks(targetIdx, [...modules[targetIdx].blocks, { id: crypto.randomUUID(), type, value: '', style: defaultStyle }]);
                    } else { toast.error(language === 'fr' ? 'Ouvrez d\'abord un module' : language === 'en' ? 'Open a module first' : 'Open eerst een module'); }
                  }} />
                </div>

                <Reorder.Group axis="y" values={modules} onReorder={setModules} className="space-y-3">
                  {modules.map((mod, idx) => (
                    <Reorder.Item key={mod.id} value={mod} className="list-none">
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
                        {/* Module header */}
                        <div className="flex items-center gap-2 p-3 cursor-grab active:cursor-grabbing" onClick={() => toggleModuleExpand(idx)}>
                          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{idx + 1}</div>
                          <Input value={mod.title} onChange={e => setModules(prev => prev.map((m, i) => i === idx ? { ...m, title: e.target.value } : m))}
                            onClick={e => e.stopPropagation()} placeholder={`${l.moduleTitle} ${idx + 1}`}
                            className="flex-1 h-8 text-sm font-medium border-0 bg-transparent px-1 focus-visible:ring-1" />
                          <div className="flex items-center gap-1 shrink-0">
                            {mod.blocks.length > 0 && <span className="text-xs text-muted-foreground">{mod.blocks.length} blok{mod.blocks.length > 1 ? 'ken' : ''}</span>}
                            {moduleQuizzes[mod.id] && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${moduleQuizzes[mod.id].isPractice ? 'bg-muted text-muted-foreground' : 'bg-accent/10 text-accent'}`}>
                                {moduleQuizzes[mod.id].isPractice ? '🎯' : '📝'}
                              </span>
                            )}
                            <button onClick={e => { e.stopPropagation(); duplicateModule(idx); }} className="p-1 hover:text-primary text-muted-foreground transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                            <button onClick={e => { e.stopPropagation(); removeModule(idx); }} className="p-1 hover:text-destructive text-muted-foreground transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            {mod.expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </div>

                        {/* Module body */}
                        <AnimatePresence>
                          {mod.expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                                <ContentBlockEditor blocks={mod.blocks} setBlocks={(blocks) => updateModuleBlocks(idx, blocks)} l={l} />

                                {/* Per-module mini-quiz */}
                                <div className="border-t border-border/50 pt-3">
                                  {!moduleQuizzes[mod.id] ? (
                                    <button onClick={() => addModuleQuiz(mod.id)} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                                      <HelpCircle className="w-3.5 h-3.5" /> {l.addModuleQuiz}
                                    </button>
                                  ) : (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                                          <HelpCircle className="w-3.5 h-3.5 text-primary" /> {l.moduleQuiz}
                                        </span>
                                        <button onClick={() => removeModuleQuiz(mod.id)} className="text-xs text-destructive hover:text-destructive/80">{l.removeModuleQuiz}</button>
                                      </div>
                                      <QuizEditor
                                        questions={moduleQuizzes[mod.id].questions}
                                        setQuestions={(qs) => setModuleQuizzes(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], questions: qs } }))}
                                        passingScore={moduleQuizzes[mod.id].passingScore}
                                        setPassingScore={(s) => setModuleQuizzes(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], passingScore: s } }))}
                                        onGenerateAI={() => handleGenerateAI(mod.id)}
                                        generatingAI={generatingAI} l={l} compact
                                        isPractice={moduleQuizzes[mod.id].isPractice}
                                        onTogglePractice={(v) => setModuleQuizzes(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], isPractice: v } }))}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              {/* ─── Global Quiz ─── */}
              <div className="bg-card rounded-2xl border-2 border-primary/20 p-5">
                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" /> {l.quiz}
                  <span className="text-xs text-muted-foreground font-normal">({globalQuestions.length} {l.questionCount})</span>
                </h3>
                <QuizEditor questions={globalQuestions} setQuestions={setGlobalQuestions}
                  passingScore={globalPassingScore} setPassingScore={setGlobalPassingScore}
                  onGenerateAI={() => handleGenerateAI('global')} generatingAI={generatingAI} l={l} />
              </div>

              {/* ─── Certificate Template Selector ─── */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-accent" /> {language === 'nl' ? 'Certificaat sjabloon' : language === 'fr' ? 'Modèle de certificat' : 'Certificate template'}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {language === 'nl' ? 'Selecteer een certificaat sjabloon dat automatisch wordt toegekend wanneer een vrijwilliger slaagt voor de quiz.' : language === 'fr' ? 'Sélectionnez un modèle de certificat attribué automatiquement lorsqu\'un volontaire réussit le quiz.' : 'Select a certificate template automatically awarded when a volunteer passes the quiz.'}
                </p>
                <div className="flex items-center gap-3">
                  <select value={editCertDesignId} onChange={e => setEditCertDesignId(e.target.value)}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option value="">{language === 'nl' ? 'Geen sjabloon (geen certificaat)' : language === 'fr' ? 'Aucun modèle' : 'No template (no certificate)'}</option>
                    {certDesigns.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <Button variant="outline" size="sm" onClick={() => navigate('/academy/certificate-builder')} className="gap-1.5 shrink-0">
                    <Plus className="w-3.5 h-3.5" /> {language === 'nl' ? 'Nieuw sjabloon' : language === 'fr' ? 'Nouveau' : 'New template'}
                  </Button>
                </div>
              </div>

              {/* ─── Certificates ─── */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-primary" /> {l.certificates} ({certificates.length})
                </h3>
                {certificates.length > 0 && (
                  <div className="space-y-1">
                    {certificates.map(cert => (
                      <div key={cert.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-muted/30">
                        <span className="text-foreground">{cert.volunteer_id.slice(0, 8)}...</span>
                        <span className="text-xs text-muted-foreground">{cert.type === 'digital_quiz' ? '🎓 Quiz' : '📋 Fysiek'} — {new Date(cert.issue_date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── Save Button ─── */}
              <div className="sticky bottom-20 z-30">
                <Button onClick={handleSave} disabled={saving} className="w-full gap-2 h-12 text-base shadow-elevated">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? l.saving : l.save}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create training event dialog moved to /academy/physical-trainings */}

      {/* Physical certificate dialog (manual) */}
      <Dialog open={showPhysicalCert} onOpenChange={setShowPhysicalCert}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{l.physicalTraining}</DialogTitle>
            <DialogDescription>{l.issueCert}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">{l.selectVolunteer}</label>
              <select value={selectedVolunteer} onChange={e => setSelectedVolunteer(e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">--</option>
                {volunteers.map(v => (<option key={v.id} value={v.id}>{v.full_name || v.email || v.id}</option>))}
              </select>
            </div>
            <Button onClick={handleIssueCert} disabled={!selectedVolunteer} className="w-full">
              <Award className="w-4 h-4 mr-2" /> {l.issueCert}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assistant dialog */}
      <Dialog open={showAIAssistant} onOpenChange={setShowAIAssistant}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-primary" />
              </div>
              {l.aiAssistant}
            </DialogTitle>
            <DialogDescription>{l.aiDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">{l.aiTopic}</label>
              <Textarea
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder={language === 'nl' ? 'bv. Steward opleiding voor voetbalwedstrijden, EHBO basistraining, Evenement veiligheid...' : language === 'fr' ? 'ex. Formation steward pour matchs de football, Formation premiers secours...' : 'e.g. Steward training for football matches, First aid basics...'}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{l.aiExtraInstructions}</label>
              <Textarea
                value={aiExtraInstructions}
                onChange={e => setAiExtraInstructions(e.target.value)}
                placeholder={language === 'nl' ? 'bv. Focus op Belgische wetgeving, voeg een module over communicatie toe...' : language === 'fr' ? 'ex. Focalisez sur la législation belge...' : 'e.g. Focus on Belgian legislation, add a module about communication...'}
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">{l.aiNumModules}</label>
                <Input type="number" min={2} max={8} value={aiNumModules} onChange={e => setAiNumModules(Number(e.target.value))} className="w-20 mt-1" />
              </div>
              {modules.length > 0 && (
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground block mb-1">Modus</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAiReplaceMode(true)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${aiReplaceMode ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      {l.aiReplace}
                    </button>
                    <button
                      onClick={() => setAiReplaceMode(false)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${!aiReplaceMode ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      {l.aiAppend}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button onClick={handleGenerateTraining} disabled={generatingTraining || !aiTopic.trim()} className="w-full gap-2">
              {generatingTraining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generatingTraining ? l.aiGenerating : l.aiGenerate}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </ClubPageLayout>
  );
};

export default AcademyBuilder;
