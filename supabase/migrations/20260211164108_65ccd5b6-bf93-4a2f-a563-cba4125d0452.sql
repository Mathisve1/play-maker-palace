
-- Create storage bucket for club signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-signatures', 'club-signatures', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can view signatures (needed for PDF rendering)
CREATE POLICY "Public can view club signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-signatures');

-- RLS: club owners/leaders can upload signatures
CREATE POLICY "Club owners can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'club-signatures'
  AND auth.role() = 'authenticated'
);

-- RLS: club owners can update signatures
CREATE POLICY "Club owners can update signatures"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'club-signatures'
  AND auth.role() = 'authenticated'
);

-- RLS: club owners can delete signatures
CREATE POLICY "Club owners can delete signatures"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'club-signatures'
  AND auth.role() = 'authenticated'
);
