import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, Award, Video, FileText, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Logo from '@/components/Logo';

interface TrainingModule {
  id: string;
  title: string;
  content_type: string;
  content_body: string | null;
  content_url: string | null;
  sort_order: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
}

const labels = {
  nl: {
    back: 'Terug',
    module: 'Module',
    of: 'van',
    next: 'Volgende',
    prev: 'Vorige',
    startQuiz: 'Start Quiz',
    question: 'Vraag',
    submit: 'Antwoorden indienen',
    passed: 'Geslaagd! 🎉',
    failed: 'Helaas niet geslaagd',
    score: 'Score',
    retry: 'Opnieuw proberen',
    certEarned: 'Certificaat behaald!',
    congrats: 'Gefeliciteerd! Je hebt je certificaat behaald voor deze training.',
    backToDashboard: 'Terug naar dashboard',
    passRequired: 'Je hebt minstens nodig',
    outOf: 'van de',
  },
  fr: {
    back: 'Retour',
    module: 'Module',
    of: 'de',
    next: 'Suivant',
    prev: 'Précédent',
    startQuiz: 'Commencer le quiz',
    question: 'Question',
    submit: 'Soumettre les réponses',
    passed: 'Réussi ! 🎉',
    failed: 'Pas réussi',
    score: 'Score',
    retry: 'Réessayer',
    certEarned: 'Certificat obtenu !',
    congrats: 'Félicitations ! Vous avez obtenu votre certificat pour cette formation.',
    backToDashboard: 'Retour au tableau de bord',
    passRequired: 'Vous avez besoin d\'au moins',
    outOf: 'sur',
  },
  en: {
    back: 'Back',
    module: 'Module',
    of: 'of',
    next: 'Next',
    prev: 'Previous',
    startQuiz: 'Start Quiz',
    question: 'Question',
    submit: 'Submit answers',
    passed: 'Passed! 🎉',
    failed: 'Not passed',
    score: 'Score',
    retry: 'Try again',
    certEarned: 'Certificate earned!',
    congrats: 'Congratulations! You have earned your certificate for this training.',
    backToDashboard: 'Back to dashboard',
    passRequired: 'You need at least',
    outOf: 'out of',
  },
};

const VolunteerTraining = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = labels[language];

  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState<{ id: string; title: string; description: string | null; club_id: string; clubs?: { name: string } } | null>(null);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
  const [phase, setPhase] = useState<'modules' | 'quiz' | 'result' | 'certified'>('modules');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [passingScore, setPassingScore] = useState(7);
  const [score, setScore] = useState(0);
  const [alreadyCertified, setAlreadyCertified] = useState(false);

  useEffect(() => {
    if (trainingId) loadTraining(trainingId);
  }, [trainingId]);

  const loadTraining = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/login'); return; }

    const [tRes, mRes, qRes, certRes] = await Promise.all([
      supabase.from('academy_trainings').select('*, clubs(name)').eq('id', id).single(),
      supabase.from('training_modules').select('*').eq('training_id', id).order('sort_order'),
      supabase.from('training_quizzes').select('*').eq('training_id', id).maybeSingle(),
      supabase.from('volunteer_certificates').select('id').eq('training_id', id).eq('volunteer_id', session.user.id).limit(1),
    ]);

    setTraining(tRes.data as any);
    setModules((mRes.data as TrainingModule[]) || []);
    setAlreadyCertified((certRes.data || []).length > 0);

    if (qRes.data) {
      setPassingScore((qRes.data as any).passing_score);
      const { data: qs } = await supabase.from('quiz_questions').select('*').eq('quiz_id', (qRes.data as any).id).order('sort_order');
      setQuestions((qs || []).map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer_index: q.correct_answer_index,
      })));
    }

    setLoading(false);
  };

  const handleSubmitQuiz = async () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer_index) correct++;
    });
    setScore(correct);

    if (correct >= passingScore) {
      // Issue certificate
      const { data: { session } } = await supabase.auth.getSession();
      if (session && training) {
        await supabase.from('volunteer_certificates').insert({
          volunteer_id: session.user.id,
          training_id: training.id,
          club_id: training.club_id,
          score: correct,
          type: 'digital_quiz',
        });
      }

      // Confetti!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['hsl(24, 85%, 55%)', 'hsl(145, 55%, 42%)', 'hsl(35, 90%, 60%)', '#FFD700'],
      });
      setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } }), 300);

      setPhase('certified');
    } else {
      setPhase('result');
    }
  };

  const retry = () => {
    setAnswers({});
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

  const progressPercent = phase === 'modules'
    ? ((currentModuleIdx + 1) / (modules.length + (questions.length > 0 ? 1 : 0))) * 100
    : 100;

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
          {/* Module phase */}
          {phase === 'modules' && modules.length > 0 && (
            <motion.div
              key={`module-${currentModuleIdx}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                {modules[currentModuleIdx].content_type === 'video' ? <Video className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                {l.module} {currentModuleIdx + 1} {l.of} {modules.length}
              </div>

              <h2 className="text-xl font-heading font-bold text-foreground mb-4">{modules[currentModuleIdx].title}</h2>

              {modules[currentModuleIdx].content_type === 'text' && modules[currentModuleIdx].content_body && (
                <div className="prose prose-sm max-w-none bg-card rounded-2xl border border-border p-6 text-foreground whitespace-pre-wrap">
                  {modules[currentModuleIdx].content_body}
                </div>
              )}

              {modules[currentModuleIdx].content_type === 'video' && modules[currentModuleIdx].content_url && (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="aspect-video">
                    <iframe
                      src={modules[currentModuleIdx].content_url!.replace('watch?v=', 'embed/')}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-6 gap-3">
                <Button variant="outline" onClick={() => setCurrentModuleIdx(i => i - 1)} disabled={currentModuleIdx === 0} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> {l.prev}
                </Button>
                {currentModuleIdx < modules.length - 1 ? (
                  <Button onClick={() => setCurrentModuleIdx(i => i + 1)} className="gap-1.5">
                    {l.next} <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : questions.length > 0 ? (
                  <Button onClick={() => setPhase('quiz')} className="gap-1.5">
                    <Sparkles className="w-4 h-4" /> {l.startQuiz}
                  </Button>
                ) : null}
              </div>
            </motion.div>
          )}

          {/* Quiz phase */}
          {phase === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-heading font-bold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Quiz
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {l.passRequired} {passingScore} {l.outOf} {questions.length}
              </p>

              <div className="space-y-6">
                {questions.map((q, qIdx) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: qIdx * 0.05 }}
                    className="bg-card rounded-2xl border border-border p-5"
                  >
                    <p className="font-medium text-foreground mb-3">
                      <span className="text-primary font-bold">{qIdx + 1}.</span> {q.question_text}
                    </p>
                    <div className="grid gap-2">
                      {q.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: oIdx }))}
                          className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                            answers[q.id] === oIdx
                              ? 'border-primary bg-primary/10 text-foreground font-medium'
                              : 'border-border hover:border-primary/30 text-foreground'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(answers).length < questions.length}
                  className="w-full h-12 text-base gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> {l.submit}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Failed result */}
          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">😔</span>
              </div>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">{l.failed}</h2>
              <p className="text-muted-foreground mb-1">{l.score}: {score} / {questions.length}</p>
              <p className="text-sm text-muted-foreground mb-6">{l.passRequired} {passingScore} {l.outOf} {questions.length}</p>
              <Button onClick={retry} className="gap-1.5">
                {l.retry}
              </Button>
            </motion.div>
          )}

          {/* Certified! */}
          {phase === 'certified' && (
            <motion.div
              key="certified"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center py-12"
            >
              {/* Certificate visual */}
              <motion.div
                initial={{ rotateY: -90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative max-w-sm mx-auto mb-8"
              >
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
                      <span className="text-2xl font-bold text-accent">{score}/{questions.length}</span>
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
