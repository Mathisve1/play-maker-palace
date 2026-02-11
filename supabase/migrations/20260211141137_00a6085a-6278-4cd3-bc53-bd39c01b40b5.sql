-- Add new profile fields for volunteer management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS bank_iban text,
ADD COLUMN IF NOT EXISTS bank_holder_name text,
ADD COLUMN IF NOT EXISTS bank_consent_given boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_consent_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS bank_consent_text text;