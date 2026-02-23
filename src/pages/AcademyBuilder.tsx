import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Trash2, GripVertical, Sparkles, BookOpen, Video, FileText, ChevronDown, ChevronUp, Eye, EyeOff, Loader2, ArrowLeft, Award, Save, Users } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Language } from '@/i18n/translations';

interface Training {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
}

interface TrainingModule {
  id: string;
  training_id: string;
  title: string;
  content_type: string;
  content_body: string | null;
  content_url: string | null;
  sort_order: number;
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
  passing_score: number;
  total_questions: number;
}

interface Certificate {
  id: string;
  volunteer_id: string;
  training_id: string;
  issue_date: string;
  score: number | null;
  type: string;
  profiles?: { full_name: string | null; email: string | null } | null;
}

const labels = {
  nl: {
    title: 'Academy',
    back: 'Terug',
    newTraining: 'Nieuwe training',
    trainingTitle: 'Titel',
    trainingDesc: 'Beschrijving',
    modules: 'Modules',
    addModule: 'Module toevoegen',
    text: 'Tekst',
    video: 'Video',
    file: 'Bestand',
    moduleTitle: 'Module titel',
    content: 'Inhoud',
    videoUrl: 'Video URL',
    fileUrl: 'Bestand URL',
    quiz: 'Quiz',
    generateAI: 'Genereer Quiz met AI',
    generating: 'AI genereert vragen...',
    passingScore: 'Minimumscore',
    addQuestion: 'Vraag toevoegen',
    question: 'Vraag',
    option: 'Optie',
    correctAnswer: 'Correct antwoord',
    save: 'Opslaan',
    saving: 'Opslaan...',
    publish: 'Publiceren',
    unpublish: 'Verbergen',
    published: 'Gepubliceerd',
    draft: 'Concept',
    delete: 'Verwijderen',
    deleteConfirm: 'Weet je zeker dat je deze training wilt verwijderen?',
    noTrainings: 'Nog geen trainingen aangemaakt.',
    certificates: 'Certificaten',
    issueCert: 'Certificaat uitreiken',
    physicalTraining: 'Fysiek trainingsmoment',
    selectVolunteer: 'Selecteer vrijwilliger',
    issued: 'Uitgereikt',
    saved: 'Training opgeslagen!',
    deleted: 'Training verwijderd.',
    certIssued: 'Certificaat uitgereikt!',
    quizGenerated: 'Quiz vragen gegenereerd!',
  },
  fr: {
    title: 'Académie',
    back: 'Retour',
    newTraining: 'Nouvelle formation',
    trainingTitle: 'Titre',
    trainingDesc: 'Description',
    modules: 'Modules',
    addModule: 'Ajouter un module',
    text: 'Texte',
    video: 'Vidéo',
    file: 'Fichier',
    moduleTitle: 'Titre du module',
    content: 'Contenu',
    videoUrl: 'URL vidéo',
    fileUrl: 'URL fichier',
    quiz: 'Quiz',
    generateAI: 'Générer Quiz avec IA',
    generating: "L'IA génère des questions...",
    passingScore: 'Score minimum',
    addQuestion: 'Ajouter une question',
    question: 'Question',
    option: 'Option',
    correctAnswer: 'Bonne réponse',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    publish: 'Publier',
    unpublish: 'Masquer',
    published: 'Publié',
    draft: 'Brouillon',
    delete: 'Supprimer',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cette formation ?',
    noTrainings: 'Aucune formation créée.',
    certificates: 'Certificats',
    issueCert: 'Délivrer un certificat',
    physicalTraining: 'Formation physique',
    selectVolunteer: 'Sélectionner un bénévole',
    issued: 'Délivré',
    saved: 'Formation enregistrée !',
    deleted: 'Formation supprimée.',
    certIssued: 'Certificat délivré !',
    quizGenerated: 'Questions de quiz générées !',
  },
  en: {
    title: 'Academy',
    back: 'Back',
    newTraining: 'New training',
    trainingTitle: 'Title',
    trainingDesc: 'Description',
    modules: 'Modules',
    addModule: 'Add module',
    text: 'Text',
    video: 'Video',
    file: 'File',
    moduleTitle: 'Module title',
    content: 'Content',
    videoUrl: 'Video URL',
    fileUrl: 'File URL',
    quiz: 'Quiz',
    generateAI: 'Generate Quiz with AI',
    generating: 'AI is generating questions...',
    passingScore: 'Passing score',
    addQuestion: 'Add question',
    question: 'Question',
    option: 'Option',
    correctAnswer: 'Correct answer',
    save: 'Save',
    saving: 'Saving...',
    publish: 'Publish',
    unpublish: 'Unpublish',
    published: 'Published',
    draft: 'Draft',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this training?',
    noTrainings: 'No trainings created yet.',
    certificates: 'Certificates',
    issueCert: 'Issue certificate',
    physicalTraining: 'Physical training',
    selectVolunteer: 'Select volunteer',
    issued: 'Issued',
    saved: 'Training saved!',
    deleted: 'Training deleted.',
    certIssued: 'Certificate issued!',
    quizGenerated: 'Quiz questions generated!',
  },
};

const AcademyBuilder = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = labels[language];

  const [clubId, setClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<string | null>(null);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showPhysicalCert, setShowPhysicalCert] = useState(false);
  const [volunteers, setVolunteers] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  // Editing state for selected training
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPassingScore, setEditPassingScore] = useState(7);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/club-login'); return; }

    // Find club
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
    const [modRes, quizRes, certRes] = await Promise.all([
      supabase.from('training_modules').select('*').eq('training_id', trainingId).order('sort_order'),
      supabase.from('training_quizzes').select('*').eq('training_id', trainingId).maybeSingle(),
      supabase.from('volunteer_certificates').select('*').eq('training_id', trainingId).eq('club_id', clubId!),
    ]);
    setModules((modRes.data as TrainingModule[]) || []);
    const q = quizRes.data as Quiz | null;
    setQuiz(q);
    setEditPassingScore(q?.passing_score || 7);

    if (q) {
      const { data: qData } = await supabase.from('quiz_questions').select('*').eq('quiz_id', q.id).order('sort_order');
      setQuestions((qData || []).map((qq: any) => ({
        id: qq.id,
        quiz_id: qq.quiz_id,
        question_text: qq.question_text,
        options: Array.isArray(qq.options) ? qq.options : [],
        correct_answer_index: qq.correct_answer_index,
        sort_order: qq.sort_order,
      })));
    } else {
      setQuestions([]);
    }
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
      // Update training
      await supabase.from('academy_trainings').update({ title: editTitle, description: editDesc || null }).eq('id', selectedTraining);

      // Upsert modules
      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        if (m.id.startsWith('new-')) {
          await supabase.from('training_modules').insert({
            training_id: selectedTraining,
            title: m.title,
            content_type: m.content_type,
            content_body: m.content_body,
            content_url: m.content_url,
            sort_order: i,
          });
        } else {
          await supabase.from('training_modules').update({
            title: m.title,
            content_type: m.content_type,
            content_body: m.content_body,
            content_url: m.content_url,
            sort_order: i,
          }).eq('id', m.id);
        }
      }

      // Upsert quiz
      let quizId = quiz?.id;
      if (questions.length > 0) {
        if (!quizId) {
          const { data: newQuiz } = await supabase.from('training_quizzes').insert({
            training_id: selectedTraining,
            passing_score: editPassingScore,
            total_questions: questions.length,
          }).select().single();
          quizId = (newQuiz as Quiz).id;
          setQuiz(newQuiz as Quiz);
        } else {
          await supabase.from('training_quizzes').update({
            passing_score: editPassingScore,
            total_questions: questions.length,
          }).eq('id', quizId);
        }

        // Delete old questions and re-insert
        await supabase.from('quiz_questions').delete().eq('quiz_id', quizId!);
        const qInserts = questions.map((q, i) => ({
          quiz_id: quizId!,
          question_text: q.question_text,
          options: q.options,
          correct_answer_index: q.correct_answer_index,
          sort_order: i,
        }));
        await supabase.from('quiz_questions').insert(qInserts);
      }

      toast.success(l.saved);
      // Refresh
      await loadTrainings(clubId);
      await loadTrainingDetail(selectedTraining);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
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

  const addModule = (type: string) => {
    setModules(prev => [...prev, {
      id: `new-${Date.now()}`,
      training_id: selectedTraining!,
      title: '',
      content_type: type,
      content_body: null,
      content_url: null,
      sort_order: prev.length,
    }]);
  };

  const removeModule = async (idx: number) => {
    const mod = modules[idx];
    if (!mod.id.startsWith('new-')) {
      await supabase.from('training_modules').delete().eq('id', mod.id);
    }
    setModules(prev => prev.filter((_, i) => i !== idx));
  };

  const updateModule = (idx: number, field: string, value: string) => {
    setModules(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleGenerateAI = async () => {
    if (!modules.length) { toast.error('Voeg eerst modules met inhoud toe.'); return; }
    setGeneratingAI(true);
    try {
      const content = modules.map(m => `${m.title}\n${m.content_body || ''}`).join('\n\n');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, num_questions: 10, language }),
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
      setQuestions(aiQuestions);
      toast.success(l.quizGenerated);
    } catch (err: any) {
      toast.error(err.message);
    }
    setGeneratingAI(false);
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      question_text: '',
      options: ['', '', '', ''],
      correct_answer_index: 0,
      sort_order: prev.length,
    }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[oIdx] = value;
      return { ...q, options: opts };
    }));
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
    // Get volunteers who signed up to tasks of this club
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
      <header className="border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 h-14 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => selectedTraining ? setSelectedTraining(null) : navigate('/club-dashboard')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> {l.back}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h1 className="font-heading font-semibold text-foreground">{l.title}</h1>
          </div>
          <Logo size="sm" linkTo="/club-dashboard" />
        </div>
      </header>

      <main className="px-4 py-6 pb-tab-bar max-w-5xl mx-auto">
        {!selectedTraining ? (
          // Training list
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
          // Training editor
          <div className="space-y-6">
            {/* Header */}
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

            {/* Modules */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> {l.modules}
                </h3>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => addModule('text')} className="gap-1 text-xs">
                    <FileText className="w-3.5 h-3.5" /> {l.text}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addModule('video')} className="gap-1 text-xs">
                    <Video className="w-3.5 h-3.5" /> {l.video}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {modules.map((mod, idx) => (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{mod.content_type}</span>
                      <Input value={mod.title} onChange={e => updateModule(idx, 'title', e.target.value)} placeholder={l.moduleTitle} className="flex-1 h-8 text-sm" />
                      <button onClick={() => removeModule(idx)} className="text-destructive hover:text-destructive/80 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {mod.content_type === 'text' && (
                      <Textarea value={mod.content_body || ''} onChange={e => updateModule(idx, 'content_body', e.target.value)} placeholder={l.content} rows={4} className="text-sm" />
                    )}
                    {mod.content_type === 'video' && (
                      <Input value={mod.content_url || ''} onChange={e => updateModule(idx, 'content_url', e.target.value)} placeholder={l.videoUrl} className="text-sm" />
                    )}
                    {mod.content_type === 'file' && (
                      <Input value={mod.content_url || ''} onChange={e => updateModule(idx, 'content_url', e.target.value)} placeholder={l.fileUrl} className="text-sm" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quiz section */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> {l.quiz}
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={generatingAI} className="gap-1.5">
                    {generatingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generatingAI ? l.generating : l.generateAI}
                  </Button>
                  <Button variant="outline" size="sm" onClick={addQuestion} className="gap-1">
                    <Plus className="w-4 h-4" /> {l.addQuestion}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm font-medium text-foreground">{l.passingScore}:</label>
                <Input type="number" min={1} max={questions.length || 10} value={editPassingScore} onChange={e => setEditPassingScore(Number(e.target.value))} className="w-20 h-8 text-sm" />
                <span className="text-sm text-muted-foreground">/ {questions.length}</span>
              </div>

              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <motion.div
                    key={qIdx}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-muted/30 rounded-xl p-4 border border-border/50"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-sm font-bold text-primary mt-1">{qIdx + 1}.</span>
                      <Textarea value={q.question_text} onChange={e => updateQuestion(qIdx, 'question_text', e.target.value)} placeholder={l.question} rows={2} className="flex-1 text-sm" />
                      <button onClick={() => removeQuestion(qIdx)} className="text-destructive hover:text-destructive/80 mt-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(qIdx, 'correct_answer_index', oIdx)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${q.correct_answer_index === oIdx ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-transparent hover:border-primary/50'}`}
                          >
                            ✓
                          </button>
                          <Input value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`${l.option} ${oIdx + 1}`} className="h-8 text-sm" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Physical certificate section */}
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

            {/* Save button */}
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
