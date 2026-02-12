
-- Add attachment columns to messages table
ALTER TABLE public.messages 
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_type TEXT,
ADD COLUMN attachment_name TEXT;

-- Create chat-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Storage policies for chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
