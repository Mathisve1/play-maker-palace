import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useOptionalClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, Award, Video, FileText, Sparkles, Image as ImageIcon, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Logo from '@/components/Logo';

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
  title: string;
  content_type: string;
  content_body: string | null;
  content_url: string | null;
  sort_order: number;
  blocks: ContentBlock[];
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
}

interface ModuleQuizData {
  quizId: string;
  questions: QuizQuestion[];
  passingScore: number;
  isPractice: boolean;
}

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

const labels = {
  nl: {
    back: 'Terug',
    module: 'Module',
    of: 'van',
    next: 'Volgende',
    prev: 'Vorige',
    startQuiz: 'Start Eindquiz',
    miniQuiz: 'Module Quiz',
    question: 'Vraag',
    submit: 'Antwoorden indienen',
    checkAnswers: 'Controleer',
    passed: 'Geslaagd! 🎉',
    failed: 'Helaas niet geslaagd',
    miniPassed: 'Goed gedaan! Ga verder naar de volgende module.',
    miniFailed: 'Probeer de vragen opnieuw.',
    score: 'Score',
    retry: 'Opnieuw proberen',
    certEarned: 'Certificaat behaald!',
    congrats: 'Gefeliciteerd! Je hebt je certificaat behaald voor deze training.',
    backToDashboard: 'Terug naar dashboard',
    passRequired: 'Je hebt minstens nodig',
    outOf: 'van de',
    continueToNext: 'Verder',
  },
  fr: {
    back: 'Retour',
    module: 'Module',
    of: 'de',
    next: 'Suivant',
    prev: 'Précédent',
    startQuiz: 'Commencer le quiz final',
    miniQuiz: 'Quiz du module',
    question: 'Question',
    submit: 'Soumettre',
    checkAnswers: 'Vérifier',
    passed: 'Réussi ! 🎉',
    failed: 'Pas réussi',
    miniPassed: 'Bien joué ! Continuez vers le module suivant.',
    miniFailed: 'Réessayez les questions.',
    score: 'Score',
    retry: 'Réessayer',
    certEarned: 'Certificat obtenu !',
    congrats: 'Félicitations ! Vous avez obtenu votre certificat.',
    backToDashboard: 'Retour au tableau de bord',
    passRequired: 'Vous avez besoin d\'au moins',
    outOf: 'sur',
    continueToNext: 'Continuer',
  },
  en: {
    back: 'Back',
    module: 'Module',
    of: 'of',
    next: 'Next',
    prev: 'Previous',
    startQuiz: 'Start Final Quiz',
    miniQuiz: 'Module Quiz',
    question: 'Question',
    submit: 'Submit answers',
    checkAnswers: 'Check',
    passed: 'Passed! 🎉',
    failed: 'Not passed',
    miniPassed: 'Well done! Continue to the next module.',
    miniFailed: 'Try the questions again.',
    score: 'Score',
    retry: 'Try again',
    certEarned: 'Certificate earned!',
    congrats: 'Congratulations! You have earned your certificate.',
    backToDashboard: 'Back to dashboard',
    passRequired: 'You need at least',
    outOf: 'out of',
    continueToNext: 'Continue',
  },
};

const VolunteerTraining = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = labels[language];
  const { userId: contextUserId } = useOptionalClubContext() || { userId: null };

  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState<{ id: string; title: string; description: string | null; club_id: string; clubs?: { name: string } } | null>(null);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
  const [phase, setPhase] = useState<'modules' | 'module_quiz' | 'quiz' | 'result' | 'certified'>('modules');

  // Global quiz
  const [globalQuestions, setGlobalQuestions] = useState<QuizQuestion[]>([]);
  const [globalPassingScore, setGlobalPassingScore] = useState(7);
  const [globalAnswers, setGlobalAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);

  // Per-module quizzes
  const [moduleQuizzes, setModuleQuizzes] = useState<Record<string, ModuleQuizData>>({});
  const [moduleQuizAnswers, setModuleQuizAnswers] = useState<Record<string, number>>({});
  const [moduleQuizResult, setModuleQuizResult] = useState<'pending' | 'passed' | 'failed'>('pending');

  const [alreadyCertified, setAlreadyCertified] = useState(false);

  useEffect(() => { if (trainingId) loadTraining(trainingId); }, [trainingId]);

  const loadTraining = async (id: string) => {
    const uid = contextUserId;
    if (!uid) { navigate('/login'); return; }

    const [tRes, mRes, qRes, certRes] = await Promise.all([
      supabase.from('academy_trainings').select('*, clubs(name)').eq('id', id).single(),
      supabase.from('training_modules').select('*').eq('training_id', id).order('sort_order'),
      supabase.from('training_quizzes').select('*').eq('training_id', id),
      supabase.from('volunteer_certificates').select('id').eq('training_id', id).eq('volunteer_id', uid).limit(1),
    ]);

    setTraining(tRes.data as any);
    const loadedModules = (mRes.data || []).map((m: any) => ({ ...m, blocks: parseBlocks(m) })) as TrainingModule[];
    setModules(loadedModules);
    setAlreadyCertified((certRes.data || []).length > 0);

    const allQuizzes = (qRes.data || []) as any[];

    // Global quiz
    const gQuiz = allQuizzes.find((q: any) => !q.module_id);
    if (gQuiz) {
      setGlobalPassingScore(gQuiz.passing_score);
      const { data: qs } = await supabase.from('quiz_questions').select('*').eq('quiz_id', gQuiz.id).order('sort_order');
      setGlobalQuestions((qs || []).map((q: any) => ({
        id: q.id, question_text: q.question_text,
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer_index: q.correct_answer_index,
      })));
    }

    // Per-module quizzes
    const mQuizzes: Record<string, ModuleQuizData> = {};
    const moduleQuizList = allQuizzes.filter((q: any) => q.module_id);
    for (const mq of moduleQuizList) {
      const { data: mqData } = await supabase.from('quiz_questions').select('*').eq('quiz_id', mq.id).order('sort_order');
      mQuizzes[mq.module_id] = {
        quizId: mq.id,
        questions: (mqData || []).map((q: any) => ({
          id: q.id, question_text: q.question_text,
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer_index: q.correct_answer_index,
        })),
        passingScore: mq.passing_score,
        isPractice: mq.is_practice || false,
      };
    }
    setModuleQuizzes(mQuizzes);

    setLoading(false);
  };

  const currentModule = modules[currentModuleIdx];
  const currentModuleQuiz = currentModule ? moduleQuizzes[currentModule.id] : null;

  const handleNextModule = () => {
    // Check if current module has a non-practice quiz that hasn't been passed
    if (currentModuleQuiz && currentModuleQuiz.questions.length > 0 && !currentModuleQuiz.isPractice && moduleQuizResult !== 'passed') {
      setPhase('module_quiz');
      setModuleQuizAnswers({});
      setModuleQuizResult('pending');
      return;
    }
    // Practice quizzes are optional - offer but don't block
    if (currentModuleQuiz && currentModuleQuiz.questions.length > 0 && currentModuleQuiz.isPractice && moduleQuizResult !== 'passed') {
      setPhase('module_quiz');
      setModuleQuizAnswers({});
      setModuleQuizResult('pending');
      return;
    }
    goToNextModule();
  };

  const goToNextModule = () => {
    setModuleQuizResult('pending');
    setModuleQuizAnswers({});
    if (currentModuleIdx < modules.length - 1) {
      setCurrentModuleIdx(i => i + 1);
      setPhase('modules');
    } else if (globalQuestions.length > 0) {
      setPhase('quiz');
    }
  };

  const handleSubmitModuleQuiz = () => {
    if (!currentModuleQuiz) return;
    let correct = 0;
    currentModuleQuiz.questions.forEach(q => {
      if (moduleQuizAnswers[q.id] === q.correct_answer_index) correct++;
    });
    if (correct >= currentModuleQuiz.passingScore) {
      setModuleQuizResult('passed');
    } else {
      setModuleQuizResult('failed');
    }
  };

  const handleRetryModuleQuiz = () => {
    setModuleQuizAnswers({});
    setModuleQuizResult('pending');
  };

  const handleSubmitGlobalQuiz = async () => {
    let correct = 0;
    globalQuestions.forEach(q => {
      if (globalAnswers[q.id] === q.correct_answer_index) correct++;
    });
    setScore(correct);

    if (correct >= globalPassingScore) {
      if (contextUserId && training) {
        await supabase.from('volunteer_certificates').insert({
          volunteer_id: contextUserId,
          training_id: training.id,
          club_id: training.club_id,
          score: correct,
          type: 'digital_quiz',
          certificate_design_id: (training as any).certificate_design_id || null,
        });
      }
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['hsl(24, 85%, 55%)', 'hsl(145, 55%, 42%)', 'hsl(35, 90%, 60%)', '#FFD700'] });
      setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } }), 300);
      trackEvent('academy_training_completed', { training_id: training?.id, score: correct });
      setPhase('certified');
    } else {
      setPhase('result');
    }
  };

  const retryGlobal = () => {
    setGlobalAnswers({});
    setScore(0);
    setPhase('quiz');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!training) return null;

  const totalSteps = modules.length + (globalQuestions.length > 0 ? 1 : 0);
  const currentStep = phase === 'modules' || phase === 'module_quiz' ? currentModuleIdx + 1 : totalSteps;
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 h-14 flex items-center justify-between max-w-3xl mx-auto">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {l.back}
          </button>
          <span className="font-heading font-semibold text-foreground text-sm truncate max-w-[200px]">{training.title}</span>
          <Logo size="sm" linkTo="/dashboard" />
        </div>
        <div className="px-4 max-w-3xl mx-auto pb-2">
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </header>

      <main className="px-4 py-6 pb-tab-bar max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {/* ─── Module Content Phase ─── */}
          {phase === 'modules' && currentModule && (
            <motion.div key={`module-${currentModuleIdx}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4 text-primary" />
                {l.module} {currentModuleIdx + 1} {l.of} {modules.length}
              </div>

              <h2 className="text-xl font-heading font-bold text-foreground mb-4">{currentModule.title}</h2>

              {/* Render mixed content blocks */}
              <div className="space-y-4">
                {currentModule.blocks.map(block => {
                  const s = block.style || {};
                  const alignClass = s.align === 'center' ? 'text-center' : s.align === 'right' ? 'text-right' : '';
                  const fontClass = s.fontSize ? { sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl', '3xl': 'text-3xl' }[s.fontSize] || '' : '';
                  const weightClass = s.bold ? 'font-bold' : '';
                  const italicClass = s.italic ? 'italic' : '';
                  const inlineStyle: React.CSSProperties = {};
                  if (s.color) inlineStyle.color = s.color;
                  if (s.bgColor) inlineStyle.backgroundColor = s.bgColor;

                  return (
                    <motion.div key={block.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      {block.type === 'heading' && (
                        <h2 className={`text-2xl font-heading font-bold text-foreground ${alignClass} ${fontClass} ${weightClass} ${italicClass}`} style={inlineStyle}>{block.value}</h2>
                      )}
                      {block.type === 'subheading' && (
                        <h3 className={`text-lg font-semibold text-foreground ${alignClass} ${fontClass} ${weightClass} ${italicClass}`} style={inlineStyle}>{block.value}</h3>
                      )}
                      {block.type === 'text' && (
                        <div className={`prose prose-sm max-w-none bg-card rounded-2xl border border-border p-6 text-foreground whitespace-pre-wrap ${alignClass} ${fontClass} ${weightClass} ${italicClass}`} style={inlineStyle}>
                          {block.value}
                        </div>
                      )}
                      {block.type === 'video' && block.value && (
                        <div className="bg-card rounded-2xl border border-border overflow-hidden">
                          <div className="aspect-video">
                            <iframe
                              src={block.value.replace('watch?v=', 'embed/').replace(/youtu\.be\//, 'www.youtube.com/embed/')}
                              className="w-full h-full" allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                          </div>
                        </div>
                      )}
                      {block.type === 'image' && block.value && (
                        <div className="bg-card rounded-2xl border border-border overflow-hidden">
                          <img src={block.value} alt="" className="w-full max-h-96 object-contain" />
                        </div>
                      )}
                      {block.type === 'divider' && (
                        <hr className="border-border my-4" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 gap-3">
                <Button variant="outline" onClick={() => setCurrentModuleIdx(i => i - 1)} disabled={currentModuleIdx === 0} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> {l.prev}
                </Button>
                {currentModuleIdx < modules.length - 1 ? (
                  <Button onClick={handleNextModule} className="gap-1.5">
                    {l.next} <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : globalQuestions.length > 0 ? (
                  <Button onClick={handleNextModule} className="gap-1.5">
                    <Sparkles className="w-4 h-4" /> {l.startQuiz}
                  </Button>
                ) : null}
              </div>
            </motion.div>
          )}

          {/* ─── Per-Module Mini Quiz ─── */}
          {phase === 'module_quiz' && currentModuleQuiz && (
            <motion.div key="module-quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-lg font-heading font-bold text-foreground mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" /> {l.miniQuiz} — {currentModule?.title}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {l.passRequired} {currentModuleQuiz.passingScore} {l.outOf} {currentModuleQuiz.questions.length}
              </p>

              {moduleQuizResult === 'passed' ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 bg-accent/5 rounded-2xl border border-accent/20">
                  <CheckCircle className="w-10 h-10 text-accent mx-auto mb-2" />
                  <p className="text-foreground font-medium mb-4">{l.miniPassed}</p>
                  <Button onClick={goToNextModule} className="gap-1.5">
                    {l.continueToNext} <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : moduleQuizResult === 'failed' ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 bg-destructive/5 rounded-2xl border border-destructive/20">
                  <span className="text-3xl mb-2 block">😔</span>
                  <p className="text-foreground font-medium mb-4">{l.miniFailed}</p>
                  <Button onClick={handleRetryModuleQuiz} className="gap-1.5">{l.retry}</Button>
                </motion.div>
              ) : (
                <>
                  <div className="space-y-4">
                    {currentModuleQuiz.questions.map((q, qIdx) => (
                      <motion.div key={q.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qIdx * 0.05 }} className="bg-card rounded-2xl border border-border p-4">
                        <p className="font-medium text-foreground mb-3">
                          <span className="text-primary font-bold">{qIdx + 1}.</span> {q.question_text}
                        </p>
                        <div className="grid gap-2">
                          {q.options.map((opt, oIdx) => (
                            <button key={oIdx} onClick={() => setModuleQuizAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                              className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${moduleQuizAnswers[q.id] === oIdx ? 'border-primary bg-primary/10 text-foreground font-medium' : 'border-border hover:border-primary/30 text-foreground'}`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Button onClick={handleSubmitModuleQuiz} disabled={Object.keys(moduleQuizAnswers).length < currentModuleQuiz.questions.length} className="w-full h-12 text-base gap-2">
                      <CheckCircle className="w-5 h-5" /> {l.checkAnswers}
                    </Button>
                  </div>
                </>
              )}

              {/* Back to module content + skip for practice */}
              <div className="mt-4 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPhase('modules')} className="gap-1 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" /> {l.back}
                </Button>
                {currentModuleQuiz?.isPractice && moduleQuizResult !== 'passed' && (
                  <Button variant="outline" size="sm" onClick={goToNextModule} className="gap-1 ml-auto">
                    {l.continueToNext} <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── Global Quiz ─── */}
          {phase === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Quiz
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {l.passRequired} {globalPassingScore} {l.outOf} {globalQuestions.length}
              </p>

              <div className="space-y-6">
                {globalQuestions.map((q, qIdx) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qIdx * 0.05 }} className="bg-card rounded-2xl border border-border p-5">
                    <p className="font-medium text-foreground mb-3">
                      <span className="text-primary font-bold">{qIdx + 1}.</span> {q.question_text}
                    </p>
                    <div className="grid gap-2">
                      {q.options.map((opt, oIdx) => (
                        <button key={oIdx} onClick={() => setGlobalAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                          className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${globalAnswers[q.id] === oIdx ? 'border-primary bg-primary/10 text-foreground font-medium' : 'border-border hover:border-primary/30 text-foreground'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6">
                <Button onClick={handleSubmitGlobalQuiz} disabled={Object.keys(globalAnswers).length < globalQuestions.length} className="w-full h-12 text-base gap-2">
                  <CheckCircle className="w-5 h-5" /> {l.submit}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── Failed ─── */}
          {phase === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">😔</span>
              </div>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">{l.failed}</h2>
              <p className="text-muted-foreground mb-1">{l.score}: {score} / {globalQuestions.length}</p>
              <p className="text-sm text-muted-foreground mb-6">{l.passRequired} {globalPassingScore} {l.outOf} {globalQuestions.length}</p>
              <Button onClick={retryGlobal} className="gap-1.5">{l.retry}</Button>
            </motion.div>
          )}

          {/* ─── Certified ─── */}
          {phase === 'certified' && (
            <motion.div key="certified" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 15 }} className="text-center py-12">
              <motion.div initial={{ rotateY: -90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative max-w-sm mx-auto mb-8">
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl border-4 border-yellow-400/50 p-8 shadow-elevated">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium uppercase tracking-wider mb-2">{l.certEarned}</p>
                    <h3 className="font-heading text-lg font-bold text-foreground">{training.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{(training as any).clubs?.name}</p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="text-2xl font-bold text-accent">{score}/{globalQuestions.length}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-yellow-300/30">
                      <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <h2 className="text-xl font-heading font-bold text-foreground mb-2">{l.passed}</h2>
              <p className="text-muted-foreground mb-6">{l.congrats}</p>
              <Button onClick={() => navigate('/dashboard')} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> {l.backToDashboard}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default VolunteerTraining;
