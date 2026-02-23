
-- Allow multiple quizzes per training (one per module + one global)
-- First drop the unique constraint on training_id
ALTER TABLE public.training_quizzes DROP CONSTRAINT IF EXISTS training_quizzes_training_id_key;

-- Add module_id column for per-module mini-quizzes (null = global quiz)
ALTER TABLE public.training_quizzes ADD COLUMN module_id uuid REFERENCES public.training_modules(id) ON DELETE CASCADE;

-- Add unique constraint: max one quiz per module, and max one global quiz per training
CREATE UNIQUE INDEX training_quizzes_module_unique ON public.training_quizzes (module_id) WHERE module_id IS NOT NULL;
CREATE UNIQUE INDEX training_quizzes_global_unique ON public.training_quizzes (training_id) WHERE module_id IS NULL;

-- Update training_modules: use content_body as JSON for mixed content blocks
-- content_type will become 'mixed' for new modules, content_body stores JSON array
-- No schema change needed since content_body is already text (we'll store JSON strings)
