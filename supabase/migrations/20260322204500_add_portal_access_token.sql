-- Add portal_access_token to sponsor_campaigns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sponsor_campaigns' AND column_name = 'portal_access_token'
    ) THEN
        ALTER TABLE public.sponsor_campaigns ADD COLUMN portal_access_token UUID DEFAULT gen_random_uuid();
    END IF;
END $$;
