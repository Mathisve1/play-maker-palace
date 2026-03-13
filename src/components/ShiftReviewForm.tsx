import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Star, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Language } from '@/i18n/translations';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface Props {
  taskId: string;
  clubId: string;
  userId: string;
  taskTitle: string;
  language: Language;
  onSubmitted?: () => void;
}

const ShiftReviewForm = ({ taskId, clubId, userId, taskTitle, language, onSubmitted }: Props) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSending(true);

    const { error } = await (supabase as any).from('volunteer_reviews').insert({
      task_id: taskId,
      volunteer_id: userId,
      club_id: clubId,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      if (error.code === '23505') {
        toast.info(t3(language, 'Je hebt deze shift al beoordeeld.', 'Vous avez déjà évalué ce shift.', 'You already reviewed this shift.'));
        setSubmitted(true);
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(t3(language, 'Bedankt voor je beoordeling!', 'Merci pour votre évaluation !', 'Thanks for your review!'));
      setSubmitted(true);
      onSubmitted?.();
    }
    setSending(false);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-4 border border-border text-center">
        <p className="text-sm text-muted-foreground">
          ✅ {t3(language, 'Beoordeling ingediend', 'Évaluation soumise', 'Review submitted')}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-4 border border-border space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t3(language, 'Hoe was je ervaring?', 'Comment était votre expérience ?', 'How was your experience?')}
        </p>
        <p className="text-xs text-muted-foreground">{taskTitle}</p>
      </div>

      {/* Star rating */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-7 h-7 ${
                star <= (hoverRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Comment */}
      {rating > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t3(language, 'Optioneel: laat een opmerking achter...', 'Optionnel : laissez un commentaire...', 'Optional: leave a comment...')}
            className="min-h-[60px] text-sm"
          />
        </motion.div>
      )}

      <Button size="sm" onClick={handleSubmit} disabled={sending || rating === 0}>
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {t3(language, 'Verstuur', 'Envoyer', 'Submit')}
      </Button>
    </motion.div>
  );
};

export default ShiftReviewForm;
