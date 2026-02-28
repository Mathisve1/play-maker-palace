
-- Create storage bucket for briefing media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('briefing-media', 'briefing-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload briefing media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'briefing-media');

-- Allow public read access
CREATE POLICY "Public can view briefing media"
ON storage.objects FOR SELECT
USING (bucket_id = 'briefing-media');

-- Allow owners to delete their uploads
CREATE POLICY "Users can delete own briefing media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'briefing-media' AND auth.uid()::text = (storage.foldername(name))[1]);
