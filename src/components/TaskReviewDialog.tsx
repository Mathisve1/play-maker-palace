import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';

const labels = {
  nl: {
    title: 'Beoordeling',
    rateClub: 'Hoe was je ervaring met deze club?',
    rateVolunteer: 'Hoe was de inzet van deze vrijwilliger?',
    comment: 'Optionele toelichting (max 300 tekens)',
    submit: 'Versturen',
    submitting: 'Bezig...',
    success: 'Beoordeling verstuurd!',
    error: 'Er ging iets mis.',
    stars: ['Slecht', 'Matig', 'Oké', 'Goed', 'Uitstekend'],
  },
  fr: {
    title: 'Évaluation',
    rateClub: 'Comment était votre expérience avec ce club ?',
    rateVolunteer: 'Comment était la prestation de ce bénévole ?',
    comment: 'Commentaire optionnel (max 300 caractères)',
    submit: 'Envoyer',
    submitting: 'En cours...',
    success: 'Évaluation envoyée !',
    error: 'Une erreur est survenue.',
    stars: ['Mauvais', 'Médiocre', 'Correct', 'Bon', 'Excellent'],
  },
  en: {
    title: 'Review',
    rateClub: 'How was your experience with this club?',
    rateVolunteer: 'How was this volunteer\'s contribution?',
    comment: 'Optional comment (max 300 characters)',
    submit: 'Submit',
    submitting: 'Submitting...',
    success: 'Review submitted!',
    error: 'Something went wrong.',
    stars: ['Poor', 'Fair', 'Okay', 'Good', 'Excellent'],
  },
};

interface TaskReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  taskSignupId: string;
  taskTitle: string;
  reviewerId: string;
  revieweeId: string;
  reviewerRole: 'club' | 'volunteer';
  onReviewed?: () => void;
}

const TaskReviewDialog = ({
  open, onOpenChange, language, taskSignupId, taskTitle,
  reviewerId, revieweeId, reviewerRole, onReviewed,
}: TaskReviewDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const l = labels[language];

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from('task_reviews' as any).insert({
      task_signup_id: taskSignupId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      reviewer_role: reviewerRole,
      rating,
      comment: comment.trim() || null,
    } as any);
    if (error) {
      toast.error(l.error);
    } else {
      toast.success(l.success);
      onReviewed?.();
      onOpenChange(false);
      setRating(0);
      setComment('');
    }
    setSubmitting(false);
  };

  const displayRating = hoveredStar || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{l.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">{taskTitle}</p>
            <p className="text-xs text-muted-foreground">
              {reviewerRole === 'volunteer' ? l.rateClub : l.rateVolunteer}
            </p>
          </div>

          {/* Star rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-1 focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= displayRating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </motion.button>
            ))}
          </div>

          {displayRating > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm font-medium text-foreground"
            >
              {l.stars[displayRating - 1]}
            </motion.p>
          )}

          <Textarea
            placeholder={l.comment}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 300))}
            rows={3}
            className="resize-none"
          />
          <p className="text-[10px] text-muted-foreground text-right">{comment.length}/300</p>

          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full"
          >
            {submitting ? l.submitting : l.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskReviewDialog;
