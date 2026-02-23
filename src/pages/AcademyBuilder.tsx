import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus, Trash2, GripVertical, Sparkles, BookOpen, Video, FileText, Image as ImageIcon,
  ChevronDown, ChevronUp, Eye, EyeOff, Loader2, ArrowLeft, Award, Save, Users,
  HelpCircle, Copy, MoreVertical, Play
} from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Language } from '@/i18n/translations';

// ── Types ──
interface Training {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
}

interface ContentBlock {
  id: string;
  type: 'text' | 'video' | 'image';
  value: string;
}

interface TrainingModule {
  id: string;
  training_id: string;
  title: string;
  content_type: string;
  content_body: string | null;
  content_url: string | null;
  sort_order: number;
  // Parsed content blocks for mixed modules
  blocks: ContentBlock[];
  // Expanded state in editor
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
}

interface ModuleQuizData {
  quiz: Quiz | null;
  questions: QuizQuestion[];
  passingScore: number;
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
    title: 'Academy Builder',
    back: 'Terug',
    newTraining: 'Nieuwe training',
    trainingTitle: 'Titel',
    trainingDesc: 'Beschrijving',
    modules: 'Modules',
    addModule: 'Module toevoegen',
    text: 'Tekst',
    video: 'Video',
    image: 'Foto',
    moduleTitle: 'Module titel',
    content: 'Inhoud',
    videoUrl: 'Video URL (YouTube, Vimeo)',
    imageUrl: 'Afbeelding URL',
    addBlock: 'Blok toevoegen',
    quiz: 'Globale Quiz (Certificaat)',
    moduleQuiz: 'Module Quiz',
    addModuleQuiz: 'Mini-quiz toevoegen',
    removeModuleQuiz: 'Mini-quiz verwijderen',
    generateAI: 'Genereer met AI',
    generating: 'AI genereert...',
    passingScore: 'Minimumscore',
    addQuestion: 'Vraag toevoegen',
    question: 'Vraag',
    option: 'Optie',
    correctAnswer: 'Correct antwoord',
    save: 'Alles opslaan',
    saving: 'Opslaan...',
    publish: 'Publiceren',
    unpublish: 'Verbergen',
    published: 'Gepubliceerd',
    draft: 'Concept',
    delete: 'Verwijderen',
    deleteConfirm: 'Weet je zeker dat je deze training wilt verwijderen?',
    noTrainings: 'Nog geen trainingen. Maak je eerste training!',
    certificates: 'Certificaten',
    issueCert: 'Certificaat uitreiken',
    physicalTraining: 'Fysiek certificaat',
    selectVolunteer: 'Selecteer vrijwilliger',
    saved: 'Training opgeslagen!',
    deleted: 'Training verwijderd.',
    certIssued: 'Certificaat uitgereikt!',
    quizGenerated: 'Quiz vragen gegenereerd!',
    dragHint: 'Sleep modules om de volgorde te wijzigen',
    contentBlocks: 'Inhoud blokken',
    emptyModule: 'Voeg tekst, video of afbeeldingen toe aan deze module',
    moduleCount: 'modules',
    questionCount: 'vragen',
    collapse: 'Inklappen',
    expand: 'Uitklappen',
    duplicateModule: 'Dupliceer module',
  },
  fr: {
    title: 'Academy Builder',
    back: 'Retour',
    newTraining: 'Nouvelle formation',
    trainingTitle: 'Titre',
    trainingDesc: 'Description',
    modules: 'Modules',
    addModule: 'Ajouter un module',
    text: 'Texte',
    video: 'Vidéo',
    image: 'Photo',
    moduleTitle: 'Titre du module',
    content: 'Contenu',
    videoUrl: 'URL vidéo (YouTube, Vimeo)',
    imageUrl: 'URL image',
    addBlock: 'Ajouter un bloc',
    quiz: 'Quiz Global (Certificat)',
    moduleQuiz: 'Quiz Module',
    addModuleQuiz: 'Ajouter mini-quiz',
    removeModuleQuiz: 'Supprimer mini-quiz',
    generateAI: 'Générer avec IA',
    generating: 'IA génère...',
    passingScore: 'Score minimum',
    addQuestion: 'Ajouter une question',
    question: 'Question',
    option: 'Option',
    correctAnswer: 'Bonne réponse',
    save: 'Tout enregistrer',
    saving: 'Enregistrement...',
    publish: 'Publier',
    unpublish: 'Masquer',
    published: 'Publié',
    draft: 'Brouillon',
    delete: 'Supprimer',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cette formation ?',
    noTrainings: 'Aucune formation. Créez votre première formation !',
    certificates: 'Certificats',
    issueCert: 'Délivrer un certificat',
    physicalTraining: 'Certificat physique',
    selectVolunteer: 'Sélectionner un bénévole',
    saved: 'Formation enregistrée !',
    deleted: 'Formation supprimée.',
    certIssued: 'Certificat délivré !',
    quizGenerated: 'Questions générées !',
    dragHint: 'Glissez les modules pour réorganiser',
    contentBlocks: 'Blocs de contenu',
    emptyModule: 'Ajoutez du texte, des vidéos ou des images',
    moduleCount: 'modules',
    questionCount: 'questions',
    collapse: 'Réduire',
    expand: 'Développer',
    duplicateModule: 'Dupliquer le module',
  },
  en: {
    title: 'Academy Builder',
    back: 'Back',
    newTraining: 'New training',
    trainingTitle: 'Title',
    trainingDesc: 'Description',
    modules: 'Modules',
    addModule: 'Add module',
    text: 'Text',
    video: 'Video',
    image: 'Photo',
    moduleTitle: 'Module title',
    content: 'Content',
    videoUrl: 'Video URL (YouTube, Vimeo)',
    imageUrl: 'Image URL',
    addBlock: 'Add block',
    quiz: 'Global Quiz (Certificate)',
    moduleQuiz: 'Module Quiz',
    addModuleQuiz: 'Add mini-quiz',
    removeModuleQuiz: 'Remove mini-quiz',
    generateAI: 'Generate with AI',
    generating: 'AI generating...',
    passingScore: 'Passing score',
    addQuestion: 'Add question',
    question: 'Question',
    option: 'Option',
    correctAnswer: 'Correct answer',
    save: 'Save all',
    saving: 'Saving...',
    publish: 'Publish',
    unpublish: 'Unpublish',
    published: 'Published',
    draft: 'Draft',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this training?',
    noTrainings: 'No trainings yet. Create your first training!',
    certificates: 'Certificates',
    issueCert: 'Issue certificate',
    physicalTraining: 'Physical certificate',
    selectVolunteer: 'Select volunteer',
    saved: 'Training saved!',
    deleted: 'Training deleted.',
    certIssued: 'Certificate issued!',
    quizGenerated: 'Quiz questions generated!',
    dragHint: 'Drag modules to reorder',
    contentBlocks: 'Content blocks',
    emptyModule: 'Add text, video or images to this module',
    moduleCount: 'modules',
    questionCount: 'questions',
    collapse: 'Collapse',
    expand: 'Expand',
    duplicateModule: 'Duplicate module',
  },
};

// ── Helpers ──
const parseBlocks = (mod: any): ContentBlock[] => {
  if (mod.content_type === 'mixed' && mod.content_body) {
    try { return JSON.parse(mod.content_body); } catch { return []; }
  }
  // Legacy: convert single-type module to blocks
  if (mod.content_type === 'text' && mod.content_body) {
    return [{ id: crypto.randomUUID(), type: 'text', value: mod.content_body }];
  }
  if ((mod.content_type === 'video' || mod.content_type === 'file') && mod.content_url) {
    return [{ id: crypto.randomUUID(), type: 'video', value: mod.content_url }];
  }
  return [];
};

const blocksToStorage = (blocks: ContentBlock[]) => JSON.stringify(blocks);

const blockTypeIcon = (type: string) => {
  switch (type) {
    case 'text': return <FileText className="w-3.5 h-3.5" />;
    case 'video': return <Video className="w-3.5 h-3.5" />;
    case 'image': return <ImageIcon className="w-3.5 h-3.5" />;
    default: return <FileText className="w-3.5 h-3.5" />;
  }
};

// ── Quiz Editor Component ──
const QuizEditor = ({
  questions, setQuestions, passingScore, setPassingScore, onGenerateAI, generatingAI, l, compact = false
}: {
  questions: QuizQuestion[];
  setQuestions: (qs: QuizQuestion[]) => void;
  passingScore: number;
  setPassingScore: (s: number) => void;
  onGenerateAI?: () => void;
  generatingAI: boolean;
  l: any;
  compact?: boolean;
}) => {
  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      options: ['', '', '', ''],
      correct_answer_index: 0,
      sort_order: questions.length,
    }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(questions.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
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
          <motion.div
            key={qIdx}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-xl p-3 border border-border/50 ${compact ? 'bg-muted/20' : 'bg-muted/30'}`}
          >
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
                  <button
                    type="button"
                    onClick={() => updateQuestion(qIdx, 'correct_answer_index', oIdx)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors text-xs ${q.correct_answer_index === oIdx ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-transparent hover:border-primary/50'}`}
                  >
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

// ── Content Block Editor ──
const ContentBlockEditor = ({
  blocks, setBlocks, l
}: {
  blocks: ContentBlock[];
  setBlocks: (blocks: ContentBlock[]) => void;
  l: any;
}) => {
  const addBlock = (type: 'text' | 'video' | 'image') => {
    setBlocks([...blocks, { id: crypto.randomUUID(), type, value: '' }]);
  };

  const updateBlock = (id: string, value: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, value } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-2">
      {/* Add block buttons */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs text-muted-foreground mr-1">{l.addBlock}:</span>
        <button onClick={() => addBlock('text')} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all">
          <FileText className="w-3 h-3" /> {l.text}
        </button>
        <button onClick={() => addBlock('video')} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all">
          <Video className="w-3 h-3" /> {l.video}
        </button>
        <button onClick={() => addBlock('image')} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all">
          <ImageIcon className="w-3 h-3" /> {l.image}
        </button>
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
          <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{l.emptyModule}</p>
        </div>
      )}

      {/* Block list */}
      <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-2">
        {blocks.map(block => (
          <Reorder.Item key={block.id} value={block} className="list-none">
            <div className="flex gap-2 items-start bg-background rounded-lg border border-border p-2 group">
              <div className="flex flex-col items-center gap-0.5 pt-1">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                  {blockTypeIcon(block.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {block.type === 'text' && (
                  <Textarea
                    value={block.value}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    placeholder={l.content}
                    rows={3}
                    className="text-sm resize-y"
                  />
                )}
                {block.type === 'video' && (
                  <div className="space-y-1.5">
                    <Input
                      value={block.value}
                      onChange={e => updateBlock(block.id, e.target.value)}
                      placeholder={l.videoUrl}
                      className="text-sm h-8"
                    />
                    {block.value && (
                      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <iframe
                          src={block.value.replace('watch?v=', 'embed/')}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                )}
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
              </div>
              <button onClick={() => removeBlock(block.id)} className="text-destructive/60 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 pt-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
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

  // Global quiz state
  const [globalQuiz, setGlobalQuiz] = useState<Quiz | null>(null);
  const [globalQuestions, setGlobalQuestions] = useState<QuizQuestion[]>([]);
  const [globalPassingScore, setGlobalPassingScore] = useState(7);

  // Per-module quiz state: moduleId -> quiz data
  const [moduleQuizzes, setModuleQuizzes] = useState<Record<string, ModuleQuizData>>({});

  // Training editing
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/club-login'); return; }
    const { data: ownClub } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id).maybeSingle();
    if (ownClub) {
      setClubId(ownClub.id);
      await loadTrainings(ownClub.id);
    } else {
      const { data: membership } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id).limit(1).maybeSingle();
      if (membership) {
        setClubId(membership.club_id);
        await loadTrainings(membership.club_id);
      } else {
        navigate('/club-dashboard');
        return;
      }
    }
    setLoading(false);
  };

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

    const loadedModules = (modRes.data || []).map((m: any) => ({
      ...m,
      blocks: parseBlocks(m),
      expanded: false,
    })) as TrainingModule[];
    setModules(loadedModules);

    // Parse quizzes: separate global vs per-module
    const allQuizzes = (quizzesRes.data || []) as Quiz[];
    const gQuiz = allQuizzes.find(q => !q.module_id) || null;
    setGlobalQuiz(gQuiz);
    setGlobalPassingScore(gQuiz?.passing_score || 7);

    // Load global quiz questions
    if (gQuiz) {
      const { data: qData } = await supabase.from('quiz_questions').select('*').eq('quiz_id', gQuiz.id).order('sort_order');
      setGlobalQuestions((qData || []).map((qq: any) => ({
        id: qq.id, quiz_id: qq.quiz_id, question_text: qq.question_text,
        options: Array.isArray(qq.options) ? qq.options : [],
        correct_answer_index: qq.correct_answer_index, sort_order: qq.sort_order,
      })));
    } else {
      setGlobalQuestions([]);
    }

    // Load per-module quizzes
    const mQuizzes: Record<string, ModuleQuizData> = {};
    const moduleQuizList = allQuizzes.filter(q => q.module_id);
    for (const mq of moduleQuizList) {
      const { data: mqData } = await supabase.from('quiz_questions').select('*').eq('quiz_id', mq.id).order('sort_order');
      mQuizzes[mq.module_id!] = {
        quiz: mq,
        questions: (mqData || []).map((qq: any) => ({
          id: qq.id, quiz_id: qq.quiz_id, question_text: qq.question_text,
          options: Array.isArray(qq.options) ? qq.options : [],
          correct_answer_index: qq.correct_answer_index, sort_order: qq.sort_order,
        })),
        passingScore: mq.passing_score,
      };
    }
    setModuleQuizzes(mQuizzes);

    setCertificates((certRes.data as Certificate[]) || []);
  };

  const selectTraining = (t: Training) => {
    setSelectedTraining(t.id);
    setEditTitle(t.title);
    setEditDesc(t.description || '');
    loadTrainingDetail(t.id);
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
      // Update training meta
      await supabase.from('academy_trainings').update({ title: editTitle, description: editDesc || null }).eq('id', selectedTraining);

      // Delete removed modules (compare with DB)
      const { data: existingMods } = await supabase.from('training_modules').select('id').eq('training_id', selectedTraining);
      const currentIds = new Set(modules.filter(m => !m.id.startsWith('new-')).map(m => m.id));
      const toDelete = (existingMods || []).filter((em: any) => !currentIds.has(em.id));
      for (const d of toDelete) {
        await supabase.from('training_modules').delete().eq('id', d.id);
      }

      // Upsert modules
      const savedModuleIds: Record<string, string> = {}; // old temp id -> real id
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        const payload = {
          training_id: selectedTraining,
          title: m.title,
          content_type: 'mixed',
          content_body: blocksToStorage(m.blocks),
          content_url: null,
          sort_order: i,
        };
        if (m.id.startsWith('new-')) {
          const { data: newMod } = await supabase.from('training_modules').insert(payload).select().single();
          if (newMod) savedModuleIds[m.id] = (newMod as any).id;
        } else {
          await supabase.from('training_modules').update(payload).eq('id', m.id);
          savedModuleIds[m.id] = m.id;
        }
      }

      // Save global quiz
      await saveQuiz(selectedTraining, null, globalQuiz, globalQuestions, globalPassingScore);

      // Save per-module quizzes
      for (const [oldModId, mqData] of Object.entries(moduleQuizzes)) {
        const realModId = savedModuleIds[oldModId] || oldModId;
        await saveQuiz(selectedTraining, realModId, mqData.quiz, mqData.questions, mqData.passingScore);
      }

      toast.success(l.saved);
      await loadTrainings(clubId);
      await loadTrainingDetail(selectedTraining);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const saveQuiz = async (trainingId: string, moduleId: string | null, quiz: Quiz | null, questions: QuizQuestion[], passingScore: number) => {
    if (questions.length === 0) {
      // Delete quiz if it exists
      if (quiz?.id) {
        await supabase.from('quiz_questions').delete().eq('quiz_id', quiz.id);
        await supabase.from('training_quizzes').delete().eq('id', quiz.id);
      }
      return;
    }

    let quizId = quiz?.id;
    const quizPayload: any = {
      training_id: trainingId,
      passing_score: passingScore,
      total_questions: questions.length,
    };
    if (moduleId) quizPayload.module_id = moduleId;

    if (!quizId) {
      const { data: newQuiz } = await supabase.from('training_quizzes').insert(quizPayload).select().single();
      quizId = (newQuiz as any)?.id;
    } else {
      await supabase.from('training_quizzes').update({ passing_score: passingScore, total_questions: questions.length }).eq('id', quizId);
    }

    if (quizId) {
      await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
      const qInserts = questions.map((q, i) => ({
        quiz_id: quizId!,
        question_text: q.question_text,
        options: q.options,
        correct_answer_index: q.correct_answer_index,
        sort_order: i,
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
    const newMod: TrainingModule = {
      id: `new-${Date.now()}`,
      training_id: selectedTraining!,
      title: '',
      content_type: 'mixed',
      content_body: null,
      content_url: null,
      sort_order: modules.length,
      blocks: [],
      expanded: true,
    };
    setModules(prev => [...prev, newMod]);
  };

  const duplicateModule = (idx: number) => {
    const src = modules[idx];
    const dup: TrainingModule = {
      ...src,
      id: `new-${Date.now()}`,
      title: `${src.title} (copy)`,
      blocks: src.blocks.map(b => ({ ...b, id: crypto.randomUUID() })),
      expanded: true,
    };
    setModules(prev => [...prev.slice(0, idx + 1), dup, ...prev.slice(idx + 1)]);
  };

  const removeModule = async (idx: number) => {
    const mod = modules[idx];
    if (!mod.id.startsWith('new-')) {
      await supabase.from('training_modules').delete().eq('id', mod.id);
    }
    // Remove module quiz if exists
    const newMQ = { ...moduleQuizzes };
    delete newMQ[mod.id];
    setModuleQuizzes(newMQ);
    setModules(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleModuleExpand = (idx: number) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, expanded: !m.expanded } : m));
  };

  const updateModuleBlocks = (idx: number, blocks: ContentBlock[]) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, blocks } : m));
  };

  // Module quiz management
  const addModuleQuiz = (moduleId: string) => {
    setModuleQuizzes(prev => ({
      ...prev,
      [moduleId]: { quiz: null, questions: [], passingScore: 3 },
    }));
  };

  const removeModuleQuiz = (moduleId: string) => {
    setModuleQuizzes(prev => {
      const next = { ...prev };
      delete next[moduleId];
      return next;
    });
  };

  const handleGenerateAI = async (target: 'global' | string) => {
    if (!modules.length) { toast.error('Voeg eerst modules met inhoud toe.'); return; }
    setGeneratingAI(true);
    try {
      const content = target === 'global'
        ? modules.map(m => `${m.title}\n${m.blocks.filter(b => b.type === 'text').map(b => b.value).join('\n')}`).join('\n\n')
        : (() => {
            const mod = modules.find(m => m.id === target);
            return mod ? `${mod.title}\n${mod.blocks.filter(b => b.type === 'text').map(b => b.value).join('\n')}` : '';
          })();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const numQ = target === 'global' ? 10 : 5;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, num_questions: numQ, language }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'AI error');
      }

      const result = await resp.json();
      const aiQuestions: QuizQuestion[] = (result.questions || []).map((q: any, i: number) => ({
        question_text: q.question_text,
        options: q.options,
        correct_answer_index: q.correct_answer_index,
        sort_order: i,
      }));

      if (target === 'global') {
        setGlobalQuestions(aiQuestions);
      } else {
        setModuleQuizzes(prev => ({
          ...prev,
          [target]: { ...prev[target], questions: aiQuestions },
        }));
      }
      toast.success(l.quizGenerated);
    } catch (err: any) {
      toast.error(err.message);
    }
    setGeneratingAI(false);
  };

  // Physical certificate
  const handleIssueCert = async () => {
    if (!selectedVolunteer || !selectedTraining || !clubId) return;
    const { error } = await supabase.from('volunteer_certificates').insert({
      volunteer_id: selectedVolunteer,
      training_id: selectedTraining,
      club_id: clubId,
      type: 'physical_event',
    });
    if (error) { toast.error(error.message); return; }
    toast.success(l.certIssued);
    setShowPhysicalCert(false);
    setSelectedVolunteer('');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentTraining = trainings.find(t => t.id === selectedTraining);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 h-14 flex items-center justify-between max-w-5xl mx-auto">
          <button onClick={() => selectedTraining ? setSelectedTraining(null) : navigate('/club-dashboard')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {l.back}
          </button>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h1 className="font-heading font-semibold text-foreground">{l.title}</h1>
          </div>
          <Logo size="sm" linkTo="/club-dashboard" />
        </div>
      </header>

      <main className="px-4 py-6 pb-tab-bar max-w-5xl mx-auto">
        {!selectedTraining ? (
          /* ─── Training List ─── */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-foreground">{l.title}</h2>
              <Button onClick={handleCreateTraining} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> {l.newTraining}
              </Button>
            </div>

            {trainings.length === 0 ? (
              <div className="text-center py-16">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{l.noTrainings}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trainings.map(t => (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => selectTraining(t)}
                    className="w-full text-left bg-card rounded-2xl border border-border hover:border-primary/30 p-5 transition-all shadow-card"
                  >
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
          <div className="space-y-5">
            {/* Title & actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-xl font-heading font-bold border-0 bg-transparent px-0 focus-visible:ring-0 text-foreground" placeholder={l.trainingTitle} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleTogglePublish}>
                  {currentTraining?.is_published ? <><EyeOff className="w-4 h-4 mr-1" />{l.unpublish}</> : <><Eye className="w-4 h-4 mr-1" />{l.publish}</>}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder={l.trainingDesc} rows={2} />

            {/* ─── Modules (Drag & Drop) ─── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> {l.modules}
                  <span className="text-xs text-muted-foreground font-normal">({modules.length} {l.moduleCount})</span>
                </h3>
                <Button variant="outline" size="sm" onClick={addModule} className="gap-1.5">
                  <Plus className="w-4 h-4" /> {l.addModule}
                </Button>
              </div>

              {modules.length > 1 && (
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <GripVertical className="w-3 h-3" /> {l.dragHint}
                </p>
              )}

              <Reorder.Group axis="y" values={modules} onReorder={setModules} className="space-y-3">
                {modules.map((mod, idx) => (
                  <Reorder.Item key={mod.id} value={mod} className="list-none">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card rounded-xl border border-border overflow-hidden shadow-card"
                    >
                      {/* Module header - always visible */}
                      <div className="flex items-center gap-2 p-3 cursor-grab active:cursor-grabbing" onClick={() => toggleModuleExpand(idx)}>
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <Input
                          value={mod.title}
                          onChange={e => setModules(prev => prev.map((m, i) => i === idx ? { ...m, title: e.target.value } : m))}
                          onClick={e => e.stopPropagation()}
                          placeholder={`${l.moduleTitle} ${idx + 1}`}
                          className="flex-1 h-8 text-sm font-medium border-0 bg-transparent px-1 focus-visible:ring-1"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          {mod.blocks.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {mod.blocks.length} blok{mod.blocks.length > 1 ? 'ken' : ''}
                            </span>
                          )}
                          {moduleQuizzes[mod.id] && (
                            <HelpCircle className="w-3.5 h-3.5 text-primary" />
                          )}
                          <button onClick={e => { e.stopPropagation(); duplicateModule(idx); }} className="p-1 hover:text-primary text-muted-foreground transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); removeModule(idx); }} className="p-1 hover:text-destructive text-muted-foreground transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {mod.expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Module body - expandable */}
                      <AnimatePresence>
                        {mod.expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                              {/* Content blocks */}
                              <ContentBlockEditor
                                blocks={mod.blocks}
                                setBlocks={(blocks) => updateModuleBlocks(idx, blocks)}
                                l={l}
                              />

                              {/* Per-module mini-quiz */}
                              <div className="border-t border-border/50 pt-3">
                                {!moduleQuizzes[mod.id] ? (
                                  <button
                                    onClick={() => addModuleQuiz(mod.id)}
                                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    {l.addModuleQuiz}
                                  </button>
                                ) : (
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                                        <HelpCircle className="w-3.5 h-3.5 text-primary" /> {l.moduleQuiz}
                                      </span>
                                      <button onClick={() => removeModuleQuiz(mod.id)} className="text-xs text-destructive hover:text-destructive/80">
                                        {l.removeModuleQuiz}
                                      </button>
                                    </div>
                                    <QuizEditor
                                      questions={moduleQuizzes[mod.id].questions}
                                      setQuestions={(qs) => setModuleQuizzes(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], questions: qs } }))}
                                      passingScore={moduleQuizzes[mod.id].passingScore}
                                      setPassingScore={(s) => setModuleQuizzes(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], passingScore: s } }))}
                                      onGenerateAI={() => handleGenerateAI(mod.id)}
                                      generatingAI={generatingAI}
                                      l={l}
                                      compact
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
              <QuizEditor
                questions={globalQuestions}
                setQuestions={setGlobalQuestions}
                passingScore={globalPassingScore}
                setPassingScore={setGlobalPassingScore}
                onGenerateAI={() => handleGenerateAI('global')}
                generatingAI={generatingAI}
                l={l}
              />
            </div>

            {/* ─── Certificates ─── */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" /> {l.certificates} ({certificates.length})
                </h3>
                <Button variant="outline" size="sm" onClick={() => { setShowPhysicalCert(true); loadVolunteers(); }} className="gap-1.5">
                  <Users className="w-4 h-4" /> {l.physicalTraining}
                </Button>
              </div>
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
        )}
      </main>

      {/* Physical certificate dialog */}
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
                {volunteers.map(v => (
                  <option key={v.id} value={v.id}>{v.full_name || v.email || v.id}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleIssueCert} disabled={!selectedVolunteer} className="w-full">
              <Award className="w-4 h-4 mr-2" /> {l.issueCert}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcademyBuilder;
