-- Create a public storage bucket for club logos
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true);

-- Allow anyone to view club logos
CREATE POLICY "Club logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-logos');

-- Allow authenticated users to upload club logos
CREATE POLICY "Authenticated users can upload club logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own club logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'club-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own club logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'club-logos' AND auth.uid()::text = (storage.foldername(name))[1]);