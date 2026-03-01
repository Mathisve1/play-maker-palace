-- Add photo_url column to safety_incidents
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for incident photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-photos', 'incident-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload incident photos
CREATE POLICY "Authenticated users can upload incident photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'incident-photos' AND auth.uid() IS NOT NULL);

-- Allow anyone to view incident photos
CREATE POLICY "Anyone can view incident photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'incident-photos');

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete own incident photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'incident-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for safety_checklist_progress (safety_incidents already in publication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'safety_checklist_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_checklist_progress;
  END IF;
END $$;