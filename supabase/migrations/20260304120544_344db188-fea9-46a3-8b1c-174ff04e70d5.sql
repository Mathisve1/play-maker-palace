-- Add language preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'nl';

-- Create content translations cache table
CREATE TABLE public.content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  source_field text NOT NULL,
  target_language text NOT NULL,
  translated_text text NOT NULL,
  source_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_table, source_id, source_field, target_language)
);

-- Enable RLS
ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read translations
CREATE POLICY "Anyone authenticated can read translations"
ON public.content_translations FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- System (via edge function) can insert/update translations
CREATE POLICY "Service role can manage translations"
ON public.content_translations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_content_translations_lookup 
ON public.content_translations(source_table, source_id, target_language);