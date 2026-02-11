
-- Add file_path column to store the storage path for PDF preview/download
ALTER TABLE public.contract_templates ADD COLUMN file_path TEXT;
