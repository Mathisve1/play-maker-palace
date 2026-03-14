import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Play, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface MicroLearning {
  id: string;
  title: string;
  description: string | null;
  type: string;
  content: any[];
  duration_minutes: number;
  skill_tag: string | null;
}

interface Props {
  userId: string;
  language: Language;
}

const MicroLearningsSection = ({ userId, language }: Props) => {
  const [learnings, setLearnings] = useState<MicroLearning[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeLearning, setActiveLearning] = useState<MicroLearning | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: items }, { data: completions }] = await Promise.all([
        supabase.from('micro_learnings').select('*').eq('is_published', true).limit(20),
        supabase.from('micro_learning_completions').select('learning_id').eq('user_id', userId),
      ]);
      if (items) setLearnings(items);
      if (completions) setCompletedIds(new Set(completions.map((c: any) => c.learning_id)));
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleStart = (learning: MicroLearning) => {
    setActiveLearning(learning);
    setCurrentQuestion(0);
    setAnswers([]);
  };

  const handleAnswer = (answerIdx: number) => {
    const newAnswers = [...answers, answerIdx];
    setAnswers(newAnswers);

    if (currentQuestion < (activeLearning?.content?.length || 0) - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 500);
    } else {
      // Calculate score
      const correct = newAnswers.filter((a, i) => {
        const q = activeLearning?.content?.[i];
        return q?.correct === a;
      }).length;
      const score = Math.round((correct / newAnswers.length) * 100);

      // Save completion
      supabase.from('micro_learning_completions').insert({
        learning_id: activeLearning!.id,
        user_id: userId,
        score,
      }).then(() => {
        setCompletedIds(prev => new Set(prev).add(activeLearning!.id));
        toast.success(`${t3(language, 'Afgerond', 'Terminé', 'Completed')}! Score: ${score}%`);
        setActiveLearning(null);
      });
    }
  };

  if (loading || learnings.length === 0) return null;

  const available = learnings.filter(l => !completedIds.has(l.id));
  const completed = learnings.filter(l => completedIds.has(l.id));

  // Active quiz view
  if (activeLearning) {
    const question = activeLearning.content?.[currentQuestion];
    if (!question) {
      setActiveLearning(null);
      return null;
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-5 border border-border space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {currentQuestion + 1}/{activeLearning.content.length}
          </p>
          <button onClick={() => setActiveLearning(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <p className="text-sm font-semibold text-foreground">{question.question}</p>

        <div className="space-y-2">
          {(question.options || []).map((opt: string, i: number) => {
            const answered = answers.length > currentQuestion;
            const isCorrect = question.correct === i;
            const isSelected = answers[currentQuestion] === i;

            return (
              <button
                key={i}
                onClick={() => !answered && handleAnswer(i)}
                disabled={answered}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                  answered
                    ? isCorrect
                      ? 'bg-green-500/10 border-green-500/30 text-green-700'
                      : isSelected
                      ? 'bg-destructive/10 border-destructive/30 text-destructive'
                      : 'border-border text-muted-foreground'
                    : 'border-border hover:border-primary/30 hover:bg-primary/5 text-foreground'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        {t3(language, 'Micro-learnings', 'Micro-apprentissages', 'Micro-learnings')}
      </h2>

      {available.length > 0 && (
        <div className="space-y-2">
          {available.slice(0, 3).map(learning => (
            <div key={learning.id} className="bg-card rounded-2xl p-3 border border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{learning.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {learning.duration_minutes} min · {learning.skill_tag || t3(language, 'Algemeen', 'Général', 'General')}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleStart(learning)}>
                <Play className="w-3.5 h-3.5" />
                {t3(language, 'Start', 'Démarrer', 'Start')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          {completed.length} {t3(language, 'voltooid', 'terminé', 'completed')}
        </div>
      )}
    </motion.div>
  );
};

export default MicroLearningsSection;
