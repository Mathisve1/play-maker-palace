
-- Add is_practice column to training_quizzes
-- When true: quiz is practice only and does NOT count for the certificate
-- When false (default): quiz counts towards certification
ALTER TABLE public.training_quizzes ADD COLUMN is_practice boolean NOT NULL DEFAULT false;
